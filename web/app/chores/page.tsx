import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { todayInChicago } from "@/lib/recurrence";
import { addChore, completeChore, deleteChore, reassignChore } from "./actions";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function describe(chore: {
  freq: string;
  weekday: number | null;
  interval_days: number | null;
}) {
  if (chore.freq === "weekly") return `weekly on ${WEEKDAYS[chore.weekday ?? 0]}`;
  return chore.interval_days === 1
    ? "every day"
    : `every ${chore.interval_days} days`;
}

type Member = { id: string; display_name: string | null };

function MemberOptions({ members }: { members: Member[] }) {
  return (
    <>
      <option value="">Unassigned</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.display_name ?? "Member"}
        </option>
      ))}
    </>
  );
}

export default async function ChoresPage() {
  const { supabase } = await requireHousehold();

  const { data: members } = await supabase
    .from("memberships")
    .select("id, display_name")
    .order("display_name");

  const { data: chores } = await supabase
    .from("chores")
    .select("*, assignee:assignee_id(display_name)")
    .order("next_due", { ascending: true });

  const today = todayInChicago();
  const memberList = (members ?? []) as Member[];

  return (
    <main>
      <p>
        <Link href="/" className="backlink">
          ← Home
        </Link>
      </p>

      <h1>Chores</h1>

      <form action={addChore} className="add-form">
        <input name="title" placeholder="Add a chore" />
        <select name="freq">
          <option value="every_n_days">Every N days</option>
          <option value="weekly">Weekly on…</option>
        </select>
        <input name="interval_days" type="number" min="1" defaultValue="1" />
        <select name="weekday" defaultValue="1">
          {WEEKDAYS.map((w, i) => (
            <option key={i} value={i}>
              {w}
            </option>
          ))}
        </select>
        <select name="assignee_id">
          <MemberOptions members={memberList} />
        </select>
        <button type="submit">Add</button>
      </form>

      <ul className="list">
        {chores?.map((c) => {
          const overdue = c.next_due < today;
          const assignee = c.assignee?.display_name ?? "Unassigned";
          return (
            <li key={c.id} className="row">
              <form action={completeChore} className="inline">
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="btn-primary">
                  Done
                </button>
              </form>

              <div className="chore-main">
                <span className="label">{c.title}</span>
                <div className="chore-meta">
                  <span>{describe(c)}</span>
                  <span>·</span>
                  <span className={overdue ? "overdue" : undefined}>
                    due {c.next_due}
                    {overdue && " (overdue)"}
                  </span>
                  <span>·</span>
                  <span>{assignee}</span>
                </div>
                <form action={reassignChore} className="reassign">
                  <input type="hidden" name="id" value={c.id} />
                  <select name="assignee_id" defaultValue={c.assignee_id ?? ""}>
                    <MemberOptions members={memberList} />
                  </select>
                  <button type="submit" className="btn-ghost">
                    Set
                  </button>
                </form>
              </div>

              <form action={deleteChore} className="inline">
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="icon-btn danger" aria-label="Delete">
                  ✕
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
