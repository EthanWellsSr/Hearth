import { requireHousehold } from "@/lib/auth";
import { addTodo } from "@/app/actions";
import { AssigneePicker, type AssigneeOption } from "@/components/AssigneePicker";
import { TodoList } from "@/components/TodoList";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { signedAvatarUrls } from "@/lib/avatar-server";
import { DEFAULT_AVATAR_URL } from "@/lib/profile";

export default async function TodosPage() {
  const { supabase, householdId } = await requireHousehold();
  const [{ data: todos }, { data: memberships }] = await Promise.all([
    supabase.from("todos").select("id, text, done, assignee_id").eq("household_id", householdId).order("created_at", { ascending: true }),
    supabase.from("memberships").select("id, user_id").eq("household_id", householdId),
  ]);
  const memberRows = (memberships ?? []) as Array<{ id: string; user_id: string }>;
  const { data: profiles } = memberRows.length
    ? await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_path")
        .in("user_id", memberRows.map((member) => member.user_id))
    : { data: [] };
  const profileByUser = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  const avatarUrls = await signedAvatarUrls((profiles ?? []).map((profile) => profile.avatar_path));
  const memberList: AssigneeOption[] = memberRows
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

  return (
    <>
      <header>
        <p className="page-kicker">A clearer mind</p>
        <h1 className="page-title">To-dos</h1>
        <p className="page-description">Set something down here, then enjoy the calm of knowing it has a place.</p>
      </header>

      <form action={addTodo} className="card botanical-card grid gap-4 overflow-visible p-4 sm:grid-cols-[1fr_16rem_auto] sm:items-end sm:p-5">
        <label>
          <span className="subtle-label">What needs doing?</span>
          <input name="text" placeholder="What needs doing?" aria-label="New To-do" className="field w-full" required />
        </label>
        <label>
          <span className="subtle-label">Assignee</span>
          <AssigneePicker members={memberList} />
        </label>
        <FormSubmitButton pendingChildren="Adding…" className="btn-primary sm:mb-0.5">
          Add to list
        </FormSubmitButton>
      </form>

      <TodoList
        items={(todos ?? []).map((todo) => ({
          id: todo.id,
          text: todo.text,
          done: todo.done,
          assigneeId: todo.assignee_id,
        }))}
        members={memberList}
      />
    </>
  );
}
