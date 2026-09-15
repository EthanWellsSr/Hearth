import { cookies } from "next/headers";
import { normalizeInviteCode, PENDING_INVITE_COOKIE } from "./invite";

export async function pendingInviteCode() {
  const cookieStore = await cookies();
  return normalizeInviteCode(cookieStore.get(PENDING_INVITE_COOKIE)?.value);
}

export async function clearPendingInvite() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_INVITE_COOKIE);
}
