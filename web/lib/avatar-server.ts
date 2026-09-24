import "server-only";
import { unstable_cache } from "next/cache";
import { supabase as admin } from "./supabase";
import { DEFAULT_AVATAR_URL } from "./profile";

const AVATAR_URL_TTL_SECONDS = 50 * 60;

const cachedSignedAvatarUrl = unstable_cache(
  async (path: string) => {
    const { data, error } = await admin.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) {
      throw error ?? new Error("Avatar signing returned no URL.");
    }
    return data.signedUrl;
  },
  ["signed-avatar-url"],
  { revalidate: AVATAR_URL_TTL_SECONDS, tags: ["avatar-urls"] }
);

export async function signedAvatarUrl(path: string | null | undefined) {
  if (!path) return DEFAULT_AVATAR_URL;
  try {
    return await cachedSignedAvatarUrl(path);
  } catch {
    return DEFAULT_AVATAR_URL;
  }
}

export async function signedAvatarUrls(paths: Array<string | null>) {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (uniquePaths.length === 0) return new Map<string, string>();

  const signedUrls = await Promise.all(
    uniquePaths.map(async (path) => [path, await signedAvatarUrl(path)] as const)
  );
  return new Map(signedUrls);
}
