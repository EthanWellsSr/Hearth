import "server-only";
import { supabase as admin } from "./supabase";
import { DEFAULT_AVATAR_URL } from "./profile";

export async function signedAvatarUrl(path: string | null | undefined) {
  if (!path) return DEFAULT_AVATAR_URL;
  const { data, error } = await admin.storage
    .from("avatars")
    .createSignedUrl(path, 60 * 60);
  return error || !data?.signedUrl ? DEFAULT_AVATAR_URL : data.signedUrl;
}

export async function signedAvatarUrls(paths: Array<string | null>) {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (uniquePaths.length === 0) return new Map<string, string>();

  const { data } = await admin.storage.from("avatars").createSignedUrls(uniquePaths, 60 * 60);
  return new Map(
    (data ?? [])
      .filter((item) => item.signedUrl)
      .map((item) => [item.path, item.signedUrl as string])
  );
}
