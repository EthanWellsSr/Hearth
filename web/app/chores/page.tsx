import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { todayInChicago } from "@/lib/recurrence";
import { addChore, completeChore, deleteChore } from "./actions";

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

export default async function ChoresPage() {
  const { supabase } = await requireHousehold();
  const { data: chores } = await supabase
    .from("chores")
    .select()
    .order("next_due", { ascending: true }); // soonest / overdue first

  const today = todayInChicago();

  return (
    <main>
      <p>
        <Link href="/">← Home</Link>
      </p>

      <h1>Chores</h1>

      <form action={addChore}>
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
        <button type="submit">Add</button>
      </form>

      <ul>
        {chores?.map((c) => {
          const overdue = c.next_due < today;
          return (
            <li key={c.id}>
              <form action={completeChore}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit">Done</button>
              </form>
              {c.title} — {describe(c)} — due {c.next_due}
              {overdue && <span style={{ color: "crimson" }}> (overdue)</span>}
              <form action={deleteChore}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit">✕</button>
              </form>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
