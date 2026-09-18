// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventForm } from "./EventForm";

describe("Event form", () => {
  afterEach(cleanup);

  it("temporarily remembers timed values while all-day mode is selected", () => {
    const action = vi.fn(async () => ({ error: null }));
    render(
      <EventForm
        action={action}
        timeZone="America/Chicago"
        initialDate="2026-09-17"
      />
    );

    const switchButton = screen.getByRole("switch", { name: "Toggle all-day Event" });
    const startTime = screen.getByLabelText(/Start time/) as HTMLInputElement;
    fireEvent.change(startTime, { target: { value: "18:50" } });
    fireEvent.click(switchButton);
    expect(screen.queryByLabelText(/Start time/)).toBeNull();
    fireEvent.click(switchButton);
    expect((screen.getByLabelText(/Start time/) as HTMLInputElement).value).toBe("18:50");
  });
});

