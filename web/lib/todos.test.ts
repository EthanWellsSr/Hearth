import { describe, expect, it } from "vitest";
import { moveTodo, todoFields, type TodoItem } from "./todos";

const items: TodoItem[] = ["a", "b", "c", "d"].map((id) => ({ id, text: id, done: id === "d", assigneeId: null, dueDate: null }));

describe("To-do fields", () => {
  function fields(text: string, date = "") {
    const form = new FormData();
    form.set("text", text);
    form.set("due_date", date);
    return () => todoFields(form);
  }
  it("trims text and clears an optional date", () => {
    expect(fields("  call plumber  ")()).toEqual({ text: "call plumber", due_date: null });
    expect(fields("Leap day", "2028-02-29")().due_date).toBe("2028-02-29");
  });
  it.each(["2026-02-29", "2026-04-31", "2026-13-01", "tomorrow", "0000-01-01"])("rejects invalid date %s", (date) => {
    expect(fields("Task", date)).toThrow("valid due date");
  });
  it("rejects blank text", () => expect(fields(" \n ")).toThrow("Enter text"));
});

describe("To-do move preview", () => {
  it("moves before or after a neighbor without losing rows", () => {
    expect(moveTodo(items, "c", "a", false).map((item) => item.id)).toEqual(["c", "a", "b", "d"]);
    expect(moveTodo(items, "a", "c", true).map((item) => item.id)).toEqual(["b", "c", "a", "d"]);
    expect(items.map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
  });
  it("ignores moves across completion sections, missing rows, and self moves", () => {
    expect(moveTodo(items, "a", "d", false)).toBe(items);
    expect(moveTodo(items, "missing", "a", false)).toBe(items);
    expect(moveTodo(items, "a", "a", true)).toBe(items);
  });
});
