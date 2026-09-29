import { requireHousehold } from "@/lib/auth";
import { todayInTimeZone } from "@/lib/calendar";
import { AssigneePicker, type AssigneeOption } from "@/components/AssigneePicker";
import { MemberAvatar } from "@/components/MemberAvatar";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { TinyLeaf } from "@/components/MeadowSprig";
import { signedAvatarUrls } from "@/lib/avatar-server";
import { DEFAULT_AVATAR_URL } from "@/lib/profile";
import { addChore, completeChore, deleteChore } from "@/app/chores/actions";

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

type Membership = { id: string; user_id: string };
type UserProfile = { user_id: string; display_name: string; avatar_path: string | null };

export default async function ChoresPage() {
  const { supabase, householdId, householdTimeZone } = await requireHousehold();

  const [{ data: members }, { data: chores }] = await Promise.all([
    supabase.from("memberships").select("id, user_id").eq("household_id", householdId),
    supabase.from("chores").select("*").eq("household_id", householdId).order("next_due", { ascending: true }),
  ]);
  const today = todayInTimeZone(householdTimeZone);
  const memberships = (members ?? []) as Membership[];
  const { data: profileRows } = memberships.length
    ? await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_path")
        .in("user_id", memberships.map((member) => member.user_id))
    : { data: [] };
  const profiles = (profileRows ?? []) as UserProfile[];
  const profileByUser = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const avatarUrls = await signedAvatarUrls(profiles.map((profile) => profile.avatar_path));
  const memberList: AssigneeOption[] = memberships
    .map((membership) => {
      const profile = profileByUser.get(membership.user_id);
      if (!profile) return null;
      return {
        membershipId: membership.id,
        name: profile.display_name,
        avatarUrl: profile.avatar_path
          ? avatarUrls.get(profile.avatar_path) || DEFAULT_AVATAR_URL
          : DEFAULT_AVATAR_URL,
      };
    })
    .filter((member): member is AssigneeOption => Boolean(member))
    .sort((a, b) => a.name.localeCompare(b.name));
  const memberById = new Map(memberList.map((member) => [member.membershipId, member]));

  return (
    <>
      <header>
        <p className="page-kicker">The rhythm of home</p>
        <h1 className="page-title">Chores</h1>
        <p className="page-description">Create simple routines so caring for your space feels shared and steady.</p>
      </header>

      <form action={addChore} className="card botanical-card grid overflow-visible gap-4 p-4 sm:grid-cols-2 sm:p-6">
        <label className="sm:col-span-2">
          <span className="subtle-label">What needs tending?</span>
          <input name="title" placeholder="For example, water the plants" className="field w-full" />
        </label>

        <label>
          <span className="subtle-label">Repeat</span>
          <select name="freq" className="field w-full">
            <option value="every_n_days">Every few days</option>
            <option value="weekly">On the same day each week</option>
          </select>
        </label>

        <label>
          <span className="subtle-label">Number of days</span>
          <input name="interval_days" type="number" min="1" defaultValue="1" className="field w-full" />
        </label>

        <label>
          <span className="subtle-label">Day of the week</span>
          <select name="weekday" defaultValue="1" className="field w-full">
            {WEEKDAYS.map((w, i) => (
              <option key={i} value={i}>{w}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="subtle-label">Who is tending to it?</span>
          <AssigneePicker members={memberList} />
        </label>

        <div className="soft-divider sm:col-span-2" />
        <FormSubmitButton pendingChildren="Adding…" className="btn-primary sm:col-span-2 sm:justify-self-end">
          Add this chore
        </FormSubmitButton>
      </form>

      {chores && chores.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {chores.map((c) => {
            const overdue = c.next_due < today;
            const assignee = c.assignee_id ? memberById.get(c.assignee_id) : undefined;
            return (
              <li key={c.id} className="card group flex items-start gap-3 p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300/70 hover:shadow-md sm:p-4">
                <form action={completeChore} className="flex">
                  <input type="hidden" name="id" value={c.id} />
                  <FormSubmitButton pendingChildren="…" className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100" aria-label={`Complete ${c.title}`}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path d="m7 12.5 3.2 3.2L17.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </FormSubmitButton>
                </form>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="font-semibold text-stone-800">
                    {c.title}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 sm:text-sm">
                    <span className="rounded-full bg-[#e7f1f3] px-2.5 py-1 text-[#5d7e85]">{describe(c)}</span>
                    <span
                      className={
                        "rounded-full px-2.5 py-1 " +
                        (overdue ? "bg-red-50 font-semibold text-red-700" : "bg-[#f8ebc9] text-[#876523]")
                      }
                    >
                      {overdue ? "Overdue · " : "Due · "}{c.next_due}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-100/80 py-1 pl-1 pr-2.5 text-emerald-700">
                      {assignee ? (
                        <MemberAvatar src={assignee.avatarUrl} name={assignee.name} size={24} />
                      ) : (
                        <span className="h-6 w-6 rounded-full border border-dashed border-emerald-300 bg-white/60" />
                      )}
                      {assignee?.name || "Unassigned"}
                    </span>
                  </div>
                  <div className="max-w-64 pt-1">
                    <AssigneePicker
                      members={memberList}
                      initialValue={c.assignee_id ?? ""}
                      target={{ kind: "chore", id: c.id }}
                    />
                  </div>
                </div>

                <form action={deleteChore} className="flex">
                  <input type="hidden" name="id" value={c.id} />
                  <FormSubmitButton pendingChildren="…" aria-label="Delete" className="icon-btn">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path d="m8 8 8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </FormSubmitButton>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty-state">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100/70 text-emerald-600">
            <TinyLeaf className="h-6 w-6" />
          </span>
          <p>No chores yet. Add the first rhythm for your home above.</p>
        </div>
      )}
    </>
  );
}
