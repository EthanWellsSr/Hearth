// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TodoList } from "./TodoList";
const actions = vi.hoisted(() => ({ editTodo: vi.fn(), reorderTodo: vi.fn(), toggleTodo: vi.fn(), deleteTodo: vi.fn() }));
vi.mock("@/app/actions", () => actions);
vi.mock("./MemberAvatar", () => ({ MemberAvatar: () => null }));
const items = [
  { id: "a", text: "Call plumber", done: false, assigneeId: null, dueDate: null },
  { id: "b", text: "Collect parcel", done: false, assigneeId: null, dueDate: null },
  { id: "c", text: "Water plants", done: true, assigneeId: null, dueDate: null },
];
afterEach(() => { cleanup(); vi.resetAllMocks(); });
describe("To-do controls", () => {
  it("preserves edited input on failure and permits retry", async () => {
    actions.editTodo.mockRejectedValueOnce(new Error("Could not save")).mockResolvedValue(undefined);
    render(<TodoList items={items} members={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Call plumber" }));
    const input = screen.getByLabelText("To-do text") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Call electrician" } });
    fireEvent.submit(input.form!);
    await screen.findByRole("alert");
    expect(input.value).toBe("Call electrician");
    expect(screen.getByRole("alert").textContent).toBe("Could not save");
    fireEvent.submit(input.form!);
    await waitFor(() => expect(screen.queryByLabelText("To-do text")).toBeNull());
    expect(actions.editTodo).toHaveBeenCalledTimes(2);
    expect(actions.editTodo.mock.calls[1][0].get("text")).toBe("Call electrician");
  });
  it("disables moves at completion boundaries and saves a relative move", async () => {
    actions.reorderTodo.mockResolvedValue(undefined);
    render(<TodoList items={items} members={[]} />);
    expect((screen.getByRole("button", { name: "Move Call plumber up" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Move Collect parcel down" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Move Water plants up" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Move Call plumber down" }));
    await waitFor(() => expect(actions.reorderTodo).toHaveBeenCalledOnce());
    const data = actions.reorderTodo.mock.calls[0][0] as FormData;
    expect(Object.fromEntries(data)).toEqual({ id: "a", target_id: "b", after: "true" });
  });
  it("cancels edits without writing", () => {
    render(<TodoList items={items} members={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Call plumber" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("To-do text")).toBeNull();
    expect(actions.editTodo).not.toHaveBeenCalled();
  });
});
