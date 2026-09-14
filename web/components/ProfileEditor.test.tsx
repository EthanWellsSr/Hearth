// @vitest-environment jsdom

import React, { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "./ProfileEditor";

const { saveProfileMock } = vi.hoisted(() => ({
  saveProfileMock: vi.fn(async () => ({ error: null })),
}));

vi.mock("@/app/profile/actions", () => ({ saveProfile: saveProfileMock }));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // Rendering semantics matter here; Next.js image optimization does not.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={String(props.src)} alt={props.alt ?? ""} />
  ),
}));

vi.mock("react-easy-crop", () => ({
  default: function FakeCropper({ onCropComplete }: { onCropComplete: (area: object, pixels: object) => void }) {
    useEffect(() => {
      onCropComplete({}, { x: 0, y: 0, width: 10, height: 10 });
    }, [onCropComplete]);
    return <div data-testid="cropper" />;
  },
}));

class ReadyImage {
  naturalWidth = 10;
  naturalHeight = 10;
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

describe("ProfileEditor upload submission", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    saveProfileMock.mockClear();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("Image", ReadyImage);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:avatar"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob(["avatar"], { type: "image/webp" }));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("dispatches the server action inside a transition after cropping", async () => {
    render(<ProfileEditor initialName="Ethan" setup />);

    fireEvent.change(screen.getByLabelText("Choose photo"), {
      target: { files: [new File(["photo"], "photo.jpg", { type: "image/jpeg" })] },
    });
    await screen.findByTestId("cropper");
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));

    await waitFor(() => expect(saveProfileMock).toHaveBeenCalledOnce());
    expect(
      consoleError.mock.calls.some((call: unknown[]) =>
        String(call[0]).includes("useActionState was called outside of a transition")
      )
    ).toBe(false);
  });
});
