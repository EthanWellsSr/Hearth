export const DISPLAY_NAME_MAX_LENGTH = 50;
export const AVATAR_INPUT_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
export const DEFAULT_AVATAR_URL = "/logo-meadow.png";

export function normalizeDisplayName(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export function displayNameError(name: string) {
  if (!name) return "Enter your name.";
  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    return `Keep your name to ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

export function defaultDisplayName(email?: string | null) {
  return email?.split("@")[0]?.slice(0, DISPLAY_NAME_MAX_LENGTH) || "";
}

export async function isWebp(file: File) {
  if (file.type !== "image/webp" || file.size > AVATAR_UPLOAD_MAX_BYTES) {
    return false;
  }
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return (
    bytes.length === 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}
