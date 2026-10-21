import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireHousehold: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireHousehold: mocks.requireHousehold }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
import { addTodo, editTodo, reorderTodo, toggleTodo, deleteTodo } from "./actions";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}
function database(result = { data: [{ id: "todo" }], error: null } as { data: unknown; error: unknown }) {
  const query = {
    update: vi.fn().mockReturnThis(), insert: vi.fn().mockResolvedValue(result),
    delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "member" } }),
    then: (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  const client = { from: vi.fn(() => query), rpc: vi.fn().mockResolvedValue({ error: null }) };
  mocks.requireHousehold.mockResolvedValue({ supabase: client, householdId: "household" });
  return { query, client };
}
beforeEach(() => vi.clearAllMocks());
describe("To-do server actions", () => {
  it("saves all editable fields atomically and scopes the write to the Household", async () => {
    const { query } = database();
    await editTodo(form({ id: "todo", text: "  Edited  ", due_date: "2028-02-29", assignee_id: "member" }));
    expect(query.update).toHaveBeenCalledWith({ text: "Edited", due_date: "2028-02-29", assignee_id: "member" });
    expect(query.eq).toHaveBeenCalledWith("household_id", "household");
    expect(query.eq).toHaveBeenCalledWith("id", "todo");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/todos");
  });
  it("clears optional fields", async () => {
    const { query } = database();
    await editTodo(form({ id: "todo", text: "Edited" }));
    expect(query.update).toHaveBeenCalledWith({ text: "Edited", due_date: null, assignee_id: null });
  });
  it("rejects invalid text or date before writing", async () => {
    const { query } = database();
    await expect(editTodo(form({ text: " " }))).rejects.toThrow();
    await expect(addTodo(form({ text: "Task", due_date: "2026-02-30" }))).rejects.toThrow();
    expect(query.update).not.toHaveBeenCalled();
    expect(query.insert).not.toHaveBeenCalled();
  });
  it("rejects an Assignee outside the Household without changing the To-do", async () => {
    const { query } = database();
    query.maybeSingle.mockResolvedValue({ data: null });
    await expect(editTodo(form({ id: "todo", text: "Edited", assignee_id: "outsider" }))).rejects.toThrow("Member");
    expect(query.update).not.toHaveBeenCalled();
  });
  it("sends a relative move rather than overwriting a stale list", async () => {
    const { client } = database();
    await reorderTodo(form({ id: "todo", target_id: "neighbor", after: "true" }));
    expect(client.rpc).toHaveBeenCalledWith("move_todo", { p_household_id: "household", p_id: "todo", p_target_id: "neighbor", p_after: true });
  });
  it("reports database failures without revalidating a failed write", async () => {
    database({ data: null, error: { message: "offline" } });
    await expect(editTodo(form({ id: "todo", text: "Edited" }))).rejects.toThrow("saved");
    await expect(addTodo(form({ text: "Task" }))).rejects.toThrow("added");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
  it("reports zero-row completion and deletion instead of pretending they succeeded", async () => {
    database({ data: [], error: null });
    await expect(toggleTodo(form({ id: "missing", done: "false" }))).rejects.toThrow("updated");
    await expect(deleteTodo(form({ id: "missing" }))).rejects.toThrow("deleted");
  });
});
