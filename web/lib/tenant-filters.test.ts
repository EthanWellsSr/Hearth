import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Every query on a Household-scoped table names its Household explicitly. RLS
// stays the security guarantee; the explicit filter lets Postgres use the
// household_id indexes (the v0.4.3 scale test found RLS-only list reads took
// ~7.5 s under load). A deliberate exception carries a `tenant-scope:` comment
// on one of the three lines above the query.
const SCOPED_TABLES = [
  "todos",
  "grocery_items",
  "chores",
  "events",
  "event_occurrence_exceptions",
  "event_reminders",
  "event_reminder_deliveries",
  "memberships",
  "households",
];

const root = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

// The query chain runs from `.from("table")` to the end of the statement, the
// next query, or the next Promise.all entry.
export function unfilteredQueries(source: string, file = "source"): string[] {
  const problems: string[] = [];
  const pattern = new RegExp(`\\.from\\("(${SCOPED_TABLES.join("|")})"\\)`, "g");
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0;
    const rest = source.slice(start + match[0].length);
    const end = rest.search(/;|\bsupabase\b|\badmin\b|\.from\(|\.rpc\(/);
    const chain = rest.slice(0, end === -1 ? undefined : end);
    const table = match[1];
    const filtered =
      /household_id/.test(chain) || (table === "households" && /\.eq\("id", householdId\)/.test(chain));
    const lineStart = source.lastIndexOf("\n", start);
    const above = source.slice(0, lineStart).split("\n").slice(-3).join("\n");
    if (!filtered && !above.includes("tenant-scope:")) {
      const line = source.slice(0, start).split("\n").length;
      problems.push(`${file}:${line} ${table}`);
    }
  }
  return problems;
}

describe("Household tenant filters", () => {
  it("filters every Household-scoped query by household_id", () => {
    const problems = ["app", "lib", "components"].flatMap((dir) =>
      sourceFiles(join(root, dir)).flatMap((path) =>
        unfilteredQueries(readFileSync(path, "utf8"), relative(root, path))
      )
    );
    expect(problems).toEqual([]);
  });

  it("flags a query that relies on RLS alone", () => {
    const source = `const { data } = await supabase.from("todos").select("id").order("created_at");`;
    expect(unfilteredQueries(source)).toEqual(["source:1 todos"]);
  });

  it("accepts filters, inserts with household_id, and marked exceptions", () => {
    const source = [
      `await supabase.from("todos").select("id").eq("household_id", householdId);`,
      `await supabase.from("grocery_items").insert({ name, household_id: householdId });`,
      `await supabase.from("households").select("name").eq("id", householdId);`,
      `// tenant-scope: the caller's own Membership.`,
      `await supabase.from("memberships").select("id").eq("user_id", user.id);`,
    ].join("\n");
    expect(unfilteredQueries(source)).toEqual([]);
  });

  it("does not borrow a filter from the next query in Promise.all", () => {
    const source = `await Promise.all([
      supabase.from("chores").select("*"),
      supabase.from("memberships").select("id").eq("household_id", householdId),
    ]);`;
    expect(unfilteredQueries(source)).toEqual(["source:2 chores"]);
  });
});
