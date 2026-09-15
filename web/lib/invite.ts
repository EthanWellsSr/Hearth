export const PENDING_INVITE_COOKIE = "hearth_pending_invite";
export const PENDING_INVITE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

export function normalizeInviteCode(value: unknown) {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return INVITE_CODE_PATTERN.test(code) ? code : null;
}

export function invitePath(value: string) {
  const code = normalizeInviteCode(value);
  return code ? `/invite/${code}` : null;
}

export function inviteUrl(code: string, origin: string) {
  const path = invitePath(code);
  if (!path) return null;
  return new URL(path, origin).toString();
}

export function inviteShareContent(
  householdName: string,
  code: string,
  origin: string
) {
  const url = inviteUrl(code, origin);
  if (!url) throw new Error("Invalid Invite Code");

  return {
    title: "Join my Household in Hearth",
    text: `You’re invited to join the ${householdName} Household on Hearth.`,
    url,
  };
}

export function loginPath({
  invite,
  error,
  message,
}: {
  invite?: string | null;
  error?: string | null;
  message?: string | null;
}) {
  const query = new URLSearchParams();
  const code = normalizeInviteCode(invite);
  if (code) query.set("invite", code);
  if (error) query.set("error", error);
  if (message) query.set("message", message);
  const suffix = query.toString();
  return suffix ? `/login?${suffix}` : "/login";
}
