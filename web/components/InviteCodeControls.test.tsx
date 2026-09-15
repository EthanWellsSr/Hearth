// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InviteCodeControls } from "./InviteCodeControls";

vi.mock("@/app/people/actions", () => ({ rotateInviteCode: vi.fn() }));

describe("Invite Code controls", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, "clipboard");
    Reflect.deleteProperty(navigator, "share");
    Reflect.deleteProperty(document, "execCommand");
  });

  it("copies the complete invitation link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<InviteCodeControls code="HEARTH42" householdName="Wells" owner={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy invitation link" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "http://localhost:3000/invite/HEARTH42"
      )
    );
  });

  it("keeps the readable Invite Code copyable as a backup", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<InviteCodeControls code="HEARTH42" householdName="Wells" owner={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy code only" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("HEARTH42"));
  });

  it("passes the clickable URL to the native share sheet", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });

    render(<InviteCodeControls code="HEARTH42" householdName="Wells" owner={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Share invitation" }));

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: "Join my Household in Hearth",
        text: "You’re invited to join the Wells Household on Hearth.",
        url: "http://localhost:3000/invite/HEARTH42",
      })
    );
  });

  it("reveals a manually copyable link when clipboard access is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: undefined,
    });

    render(<InviteCodeControls code="HEARTH42" householdName="Wells" owner={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy invitation link" }));

    expect((await screen.findByLabelText("Invitation link") as HTMLInputElement).value).toBe(
      "http://localhost:3000/invite/HEARTH42"
    );
    expect(screen.getByText(/press and hold/i)).toBeTruthy();
  });

  it("reveals the same fallback when the native share sheet is unavailable", async () => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: undefined,
    });

    render(<InviteCodeControls code="HEARTH42" householdName="Wells" owner={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Share invitation" }));

    expect((await screen.findByLabelText("Invitation link") as HTMLInputElement).value).toBe(
      "http://localhost:3000/invite/HEARTH42"
    );
    expect(screen.getByRole("link", { name: "Send by text" }).getAttribute("href")).toMatch(/^sms:/);
    expect(screen.getByRole("link", { name: "Send by email" }).getAttribute("href")).toMatch(/^mailto:/);
  });
});
