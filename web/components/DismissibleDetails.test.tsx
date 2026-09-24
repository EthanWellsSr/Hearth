// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DismissibleDetails } from "./DismissibleDetails";

function setup() {
  render(
    <>
      <DismissibleDetails>
        <summary>Menu</summary>
        <button type="button">Inside</button>
      </DismissibleDetails>
      <button type="button">Outside</button>
    </>
  );
  const details = document.querySelector("details")!;
  details.open = true;
  return details;
}

describe("DismissibleDetails", () => {
  afterEach(cleanup);

  it("stays open when interacting inside the menu", () => {
    const details = setup();
    fireEvent.pointerDown(screen.getByText("Inside"));
    expect(details.open).toBe(true);
  });

  it("closes on a pointer press outside the menu", () => {
    const details = setup();
    fireEvent.pointerDown(screen.getByText("Outside"));
    expect(details.open).toBe(false);
  });

  it("closes on Escape and returns focus to the summary", () => {
    const details = setup();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(screen.getByText("Menu"));
  });
});
