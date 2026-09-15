import sharp from "sharp";
import { AVATAR_UPLOAD_MAX_BYTES } from "./profile";

const AVATAR_SIZE = 512;
const AVATAR_MAX_INPUT_PIXELS = 16_777_216;

export async function normalizeAvatarUpload(file: File) {
  if (file.size === 0 || file.size > AVATAR_UPLOAD_MAX_BYTES) {
    throw new Error("Choose a valid image smaller than 2 MB.");
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const { data, info } = await sharp(input, {
      failOn: "error",
      limitInputPixels: AVATAR_MAX_INPUT_PIXELS,
    })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
      .webp({ quality: 86 })
      .toBuffer({ resolveWithObject: true });

    if (
      info.format !== "webp" ||
      info.width !== AVATAR_SIZE ||
      info.height !== AVATAR_SIZE ||
      data.byteLength > AVATAR_UPLOAD_MAX_BYTES
    ) {
      throw new Error("Avatar normalization failed.");
    }

    return data;
  } catch {
    throw new Error("Choose a valid image.");
  }
}
