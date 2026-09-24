// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssigneePicker } from "./AssigneePicker";

const { reassignTodoMock } = vi.hoisted(() => ({
  reassignTodoMock: vi.fn(async (formData: FormData) => {
    void formData;
  }),
}));

vi.mock("@/app/actions", () => ({ reassignTodo: reassignTodoMock }));
vi.mock("@/app/chores/actions", () => ({ reassignChore: vi.fn() }));
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

const members = [
  { membershipId: "m-ethan", name: "Ethan", avatarUrl: "/a.png" },
  { membershipId: "m-kry", name: "Krystyna", avatarUrl: "/b.png" },
];

function choose(name: string) {
  document.querySelector("details")!.open = true;
  fireEvent.click(screen.getByRole("button", { name: new RegExp(name), hidden: true }));
}

function summaryText() {
  return document.querySelector("summary")?.textContent ?? "";
}

describe("AssigneePicker", () => {
  afterEach(() => {
    cleanup();
    reassignTodoMock.mockReset();
  });

  it("keeps the optimistic assignee when the save succeeds", async () => {
    reassignTodoMock.mockResolvedValue(undefined);
    render(<AssigneePicker members={members} initialValue="m-ethan" target={{ kind: "todo", id: "t1" }} />);

    choose("Krystyna");

    await waitFor(() => expect(reassignTodoMock).toHaveBeenCalledTimes(1));
    const formData = reassignTodoMock.mock.calls[0][0];
    expect(formData.get("id")).toBe("t1");
    expect(formData.get("assignee_id")).toBe("m-kry");
    await waitFor(() => expect(summaryText()).toContain("Krystyna"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("restores the previous assignee and reports the failure when the save fails", async () => {
    reassignTodoMock.mockRejectedValue(new Error("denied"));
    render(<AssigneePicker members={members} initialValue="m-ethan" target={{ kind: "todo", id: "t1" }} />);

    choose("Krystyna");

    expect((await screen.findByRole("alert")).textContent).toContain("Couldn’t save the assignee");
    expect(summaryText()).toContain("Ethan");
    expect(summaryText()).not.toContain("Krystyna");
  });
});
