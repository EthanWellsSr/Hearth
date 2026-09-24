// @vitest-environment jsdom

import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormSubmitButton } from "./FormSubmitButton";

describe("FormSubmitButton", () => {
  afterEach(cleanup);

  it("shows its pending state and blocks repeat submission until the action settles", async () => {
    let finish!: () => void;
    const action = () => new Promise<void>((resolve) => (finish = resolve));

    render(
      <form action={action}>
        <FormSubmitButton pendingChildren="Saving…">Save</FormSubmitButton>
      </form>
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const pendingButton = await screen.findByRole("button", { name: "Saving…" });
    expect((pendingButton as HTMLButtonElement).disabled).toBe(true);
    expect(pendingButton.getAttribute("aria-busy")).toBe("true");

    await act(async () => finish());
    await waitFor(() => expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(false));
  });
});
