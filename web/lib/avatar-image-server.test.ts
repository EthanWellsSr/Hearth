import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { AVATAR_UPLOAD_MAX_BYTES } from "./profile";
import { normalizeAvatarUpload } from "./avatar-image-server";

describe("Avatar server normalization", () => {
  it("normalizes fallback PNG bytes mislabeled as WebP", async () => {
    const png = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 4,
        background: { r: 90, g: 130, b: 95, alpha: 1 },
      },
    }).png().toBuffer();
    const iphoneUpload = new File([png], "avatar.webp", { type: "image/webp" });

    const normalized = await normalizeAvatarUpload(iphoneUpload);
    const metadata = await sharp(normalized).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(512);
    expect(normalized.byteLength).toBeLessThanOrEqual(AVATAR_UPLOAD_MAX_BYTES);
  });

  it("rejects data that is not an image", async () => {
    const invalid = new File(["not an image"], "avatar.jpg", { type: "image/jpeg" });
    await expect(normalizeAvatarUpload(invalid)).rejects.toThrow("valid image");
  });
});
