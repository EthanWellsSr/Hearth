import { requireHousehold } from "@/lib/auth";
import { todayInChicago } from "@/lib/recurrence";
import { AppHeader } from "@/components/AppHeader";
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8">
      <AppHeader />

      <h1 className="text-2xl font-semibold tracking-tight text-stone-800 dark:text-stone-50">
        Chores
      </h1>

      <form action={addChore} className="card flex flex-wrap items-center gap-2 p-4">
        <input
          name="title"
          placeholder="Add a chore"
          className="field min-w-40 flex-1"
        />
        <select name="freq" className="field">
          <option value="every_n_days">Every N days</option>
          <option value="weekly">Weekly on…</option>
        </select>
        <input
          name="interval_days"
          type="number"
          min="1"
          defaultValue="1"
          className="field w-20"
        />
        <select name="weekday" defaultValue="1" className="field">
          {WEEKDAYS.map((w, i) => (
            <option key={i} value={i}>
              {w}
            </option>
          ))}
        </select>
        <select name="assignee_id" className="field">
          <MemberOptions members={memberList} />
        </select>
        <button type="submit" className="btn-primary">
          Add
        </button>
      </form>

      {chores && chores.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {chores.map((c) => {
            const overdue = c.next_due < today;
            const assignee = c.assignee?.display_name ?? "Unassigned";
            return (
              <li key={c.id} className="card flex items-start gap-3 px-4 py-3">
                <form action={completeChore} className="flex">
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="btn-primary px-3 py-1.5">
                    Done
                  </button>
                </form>

                <div className="flex flex-1 flex-col gap-1.5">
                  <span className="font-medium text-stone-800 dark:text-stone-100">
                    {c.title}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                    <span>{describe(c)}</span>
                    <span aria-hidden>·</span>
                    <span
                      className={
                        overdue ? "font-medium text-red-600 dark:text-red-400" : ""
                      }
                    >
                      due {c.next_due}
                      {overdue && " · overdue"}
                    </span>
                    <span
                      className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                    >
                      {assignee}
                    </span>
                  </div>
                  <form action={reassignChore} className="flex items-center gap-2 pt-0.5">
                    <input type="hidden" name="id" value={c.id} />
                    <select
                      name="assignee_id"
                      defaultValue={c.assignee_id ?? ""}
                      className="field px-2 py-1 text-xs"
                    >
                      <MemberOptions members={memberList} />
                    </select>
                    <button type="submit" className="btn-ghost px-2 py-1 text-xs">
                      Reassign
                    </button>
                  </form>
                </div>

                <form action={deleteChore} className="flex">
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" aria-label="Delete" className="icon-btn">
                    ✕
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-400 dark:border-stone-700">
          No chores yet — add a recurring task above.
        </p>
      )}
    </main>
  );
}
