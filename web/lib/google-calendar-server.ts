import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { requireHousehold } from "./auth";
import { openGoogleSecret, sealGoogleSecret } from "./google-calendar-crypto";
import {
  calendarColor,
  normalizeGoogleEvent,
  type GoogleEvent,
  type ImportedGoogleEvent,
} from "./google-calendar";

import {
  readGoogleChanges,
  type GoogleChangePage,
} from "./google-calendar-sync";

const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events.freebusy",
];
const STATE_COOKIE = "hearth-google-calendar-oauth";
type Tokens = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
};
type OAuthState = {
  state: string;
  verifier: string;
  user: string;
  household: string;
  expires: number;
};
export type GoogleConnection = {
  id: string;
  household_id: string;
  membership_id: string;
  user_id: string;
  email: string;
  google_subject: string;
  needs_reconnect: boolean;
  selection_confirmed: boolean;
};
export type ManagedSource = {
  cached_range_start: string | null;
  cached_range_end: string | null;
  sync_token: string | null;
  sync_metadata: string | null;
  id: string;
  household_id: string;
  connection_id: string;
  google_calendar_id: string;
  name: string;
  color: string;
  status: string;
  last_synced_at: string | null;
  last_error: string | null;
  range_start: string;
  range_end: string;
  requested_at: string;
  lock_token: string | null;
  watch_id: string | null;
  watch_token: string | null;
  watch_resource_id: string | null;
  watch_expires_at: string | null;
};
export type ListedCalendar = {
  id: string;
  summary: string;
  summaryOverride?: string;
  backgroundColor?: string;
  primary?: boolean;
  accessRole: string;
  timeZone?: string;
};

function setting(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      "Google Calendar is not configured. Contact the Household administrator.",
    );
  return value;
}
export function googleCalendarConfigured(): boolean {
  return [
    "GOOGLE_CALENDAR_CLIENT_ID",
    "GOOGLE_CALENDAR_CLIENT_SECRET",
    "GOOGLE_CALENDAR_ENCRYPTION_KEY",
    "GOOGLE_CALENDAR_APP_ORIGIN",
    "SUPABASE_SECRET_KEY",
  ].every((name) => Boolean(process.env[name]));
}
export function googleAppOrigin(): string {
  const url = new URL(setting("GOOGLE_CALENDAR_APP_ORIGIN"));
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Invalid Google Calendar application origin.");
  return url.origin;
}
function adminClient() {
  return createClient(
    process.env.SUPABASE_URL || setting("NEXT_PUBLIC_SUPABASE_URL"),
    setting("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
function check(error: { message: string } | null) {
  if (error)
    throw new Error("Could not save Google Calendar changes. Try again.");
}
export async function beginGoogleConnection(): Promise<string> {
  const context = await requireHousehold();
  const state = randomBytes(32).toString("base64url"),
    verifier = randomBytes(32).toString("base64url");
  const stored: OAuthState = {
    state,
    verifier,
    user: context.user.id,
    household: context.householdId,
    expires: Date.now() + 600000,
  };
  (await cookies()).set(STATE_COOKIE, sealGoogleSecret(stored, "oauth-state"), {
    httpOnly: true,
    secure: googleAppOrigin().startsWith("https:"),
    sameSite: "lax",
    path: "/api/google-calendar",
    maxAge: 600,
  });
  const params = new URLSearchParams({
    client_id: setting("GOOGLE_CALENDAR_CLIENT_ID"),
    redirect_uri: googleAppOrigin() + "/api/google-calendar/callback",
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent select_account",
    state,
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  });
  return "https://accounts.google.com/o/oauth2/v2/auth?" + params;
}
export async function finishGoogleConnection(url: URL): Promise<string> {
  const { supabase, user, householdId, membershipId } =
    await requireHousehold();
  const jar = await cookies(),
    cookie = jar.get(STATE_COOKIE)?.value;
  jar.set(STATE_COOKIE, "", {
    httpOnly: true,
    secure: googleAppOrigin().startsWith("https:"),
    sameSite: "lax",
    path: "/api/google-calendar",
    maxAge: 0,
  });
  if (!cookie) throw new Error("Connection expired. Start again.");
  const state = openGoogleSecret<OAuthState>(cookie, "oauth-state");
  if (
    state.expires < Date.now() ||
    state.state !== url.searchParams.get("state") ||
    state.user !== user.id ||
    state.household !== householdId
  )
    throw new Error("Connection expired. Start again.");
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.has("error"))
    throw new Error("Google connection was not completed.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: setting("GOOGLE_CALENDAR_CLIENT_ID"),
      client_secret: setting("GOOGLE_CALENDAR_CLIENT_SECRET"),
      code,
      code_verifier: state.verifier,
      redirect_uri: googleAppOrigin() + "/api/google-calendar/callback",
      grant_type: "authorization_code",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error("Google could not complete the connection. Try again.");
  const token = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };
  if (
    !token.access_token ||
    !SCOPES.slice(2).every((scope) => token.scope?.split(" ").includes(scope))
  )
    throw new Error(
      "Allow the requested read-only calendar permissions to connect.",
    );
  const identityResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!identityResponse.ok)
    throw new Error("Google account identity could not be verified.");
  const identity = (await identityResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
  };
  if (!identity.sub || !identity.email || !identity.email_verified)
    throw new Error("Google account identity could not be verified.");
  const { data: existing, error: lookupError } = await supabase
    .from("google_connections")
    .select("id")
    .eq("household_id", householdId)
    .eq("membership_id", membershipId)
    .eq("google_subject", identity.sub)
    .maybeSingle();
  check(lookupError);
  const id = existing?.id || randomUUID();
  const admin = adminClient();
  // Revalidate Membership at the privileged boundary; auth could change while Google is responding.
  const { data: member } = await supabase
    .from("memberships")
    .select("id")
    .eq("household_id", householdId)
    .eq("id", membershipId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member)
    throw new Error("Your Household membership changed. Start again.");
  const { data: previous } = await admin
    .from("google_calendar_credentials")
    .select("encrypted_tokens")
    .eq("connection_id", id)
    .maybeSingle();
  const old = previous
    ? openGoogleSecret<Tokens>(previous.encrypted_tokens, id)
    : null;
  if (!token.refresh_token && !old?.refresh_token)
    throw new Error("Reconnect and allow offline calendar access.");
  const { error } = await admin.from("google_connections").upsert(
    {
      id,
      household_id: householdId,
      membership_id: membershipId,
      user_id: user.id,
      google_subject: identity.sub,
      email: identity.email,
      needs_reconnect: false,
    },
    { onConflict: "id" },
  );
  check(error);
  const { error: secretError } = await admin
    .from("google_calendar_credentials")
    .upsert({
      connection_id: id,
      encrypted_tokens: sealGoogleSecret(
        {
          access_token: token.access_token,
          refresh_token: token.refresh_token || old?.refresh_token,
          expires_at: Date.now() + token.expires_in * 1000,
        },
        id,
      ),
    });
  check(secretError);
  return id;
}
export class GoogleApiError extends Error {
  constructor(
    public status: number,
    public reason: string,
  ) {
    super("Google Calendar request failed.");
  }
}
async function accessToken(
  connection: GoogleConnection,
  force = false,
): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("google_calendar_credentials")
    .select("encrypted_tokens")
    .eq("connection_id", connection.id)
    .single();
  check(error);
  const stored = openGoogleSecret<Tokens>(
    data!.encrypted_tokens,
    connection.id,
  );
  if (!force && stored.expires_at > Date.now() + 60000)
    return stored.access_token;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: setting("GOOGLE_CALENDAR_CLIENT_ID"),
      client_secret: setting("GOOGLE_CALENDAR_CLIENT_SECRET"),
      refresh_token: stored.refresh_token || "",
      grant_type: "refresh_token",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      await admin
        .from("google_connections")
        .update({ needs_reconnect: true })
        .eq("household_id", connection.household_id)
        .eq("id", connection.id);
    }
    throw new GoogleApiError(
      response.status,
      response.status === 400 || response.status === 401
        ? "reconnect"
        : "temporary",
    );
  }
  const fresh = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
  if (!fresh.access_token) throw new GoogleApiError(502, "token");
  const { error: updateError } = await admin
    .from("google_calendar_credentials")
    .update({
      encrypted_tokens: sealGoogleSecret(
        {
          access_token: fresh.access_token,
          refresh_token: fresh.refresh_token || stored.refresh_token,
          expires_at: Date.now() + fresh.expires_in * 1000,
        },
        connection.id,
      ),
    })
    .eq("connection_id", connection.id);
  check(updateError);
  return fresh.access_token;
}
async function googleRequest<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/" + path,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new GoogleApiError(
      response.status,
      payload.error?.errors?.[0]?.reason || "unknown",
    );
  }
  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}
function googleSession(connection: GoogleConnection) {
  let token: string | undefined;
  return async function request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    token ??= await accessToken(connection);
    try {
      return await googleRequest<T>(token, path, init);
    } catch (error) {
      if (!(error instanceof GoogleApiError) || error.status !== 401)
        throw error;
      token = await accessToken(connection, true);
      try {
        return await googleRequest<T>(token, path, init);
      } catch (retryError) {
        if (retryError instanceof GoogleApiError && retryError.status === 401) {
          await adminClient()
            .from("google_connections")
            .update({ needs_reconnect: true })
            .eq("household_id", connection.household_id)
            .eq("id", connection.id);
          throw new GoogleApiError(401, "reconnect");
        }
        throw retryError;
      }
    }
  };
}
export async function ownedGoogleConnection(id: string) {
  const context = await requireHousehold();
  const { data, error } = await context.supabase
    .from("google_connections")
    .select("*")
    .eq("household_id", context.householdId)
    .eq("user_id", context.user.id)
    .eq("id", id)
    .single();
  check(error);
  if (!data) throw new Error("Google connection not found.");
  return { ...context, connection: data as GoogleConnection };
}
export async function listAvailableGoogleCalendars(
  id: string,
): Promise<ListedCalendar[]> {
  const { connection } = await ownedGoogleConnection(id);
  const request = googleSession(connection);
  const items: ListedCalendar[] = [];
  let page: string | undefined;
  do {
    const query = new URLSearchParams({
      maxResults: "250",
      showHidden: "true",
    });
    if (page) query.set("pageToken", page);
    const data = await request<{
      items?: ListedCalendar[];
      nextPageToken?: string;
    }>("users/me/calendarList?" + query);
    items.push(...(data.items || []));
    page = data.nextPageToken;
  } while (page);
  return items.filter((item) => item.id && item.accessRole !== "none");
}
export async function selectGoogleCalendars(id: string, selected: string[]) {
  const { connection, supabase, householdId } = await ownedGoogleConnection(id);
  const available = await listAvailableGoogleCalendars(id);
  const wanted = available.filter((c) => selected.includes(c.id));
  if (wanted.length !== new Set(selected).size)
    throw new Error(
      "A selected calendar is no longer available. Refresh the list.",
    );
  const { data: existing, error } = await supabase
    .from("google_calendar_sources")
    .select("id,google_calendar_id")
    .eq("household_id", householdId)
    .eq("connection_id", id);
  check(error);
  for (const source of existing || [])
    if (!selected.includes(source.google_calendar_id)) {
      const removed = await supabase
        .from("google_calendar_sources")
        .delete()
        .eq("household_id", householdId)
        .eq("id", source.id);
      check(removed.error);
    }
  const start = new Date();
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  const end = new Date();
  end.setUTCFullYear(end.getUTCFullYear() + 2);
  const admin = adminClient();
  const confirmation = await admin
    .from("google_connections")
    .update({ selection_confirmed: true })
    .eq("household_id", householdId)
    .eq("user_id", connection.user_id)
    .eq("id", id);
  check(confirmation.error);
  for (const calendar of wanted) {
    if (existing?.some((s) => s.google_calendar_id === calendar.id)) continue;
    // Ownership was validated above; FK ties new sources to the still-existing connection.
    const result = await admin.from("google_calendar_sources").insert({
      household_id: householdId,
      connection_id: connection.id,
      google_calendar_id: calendar.id,
      name: calendar.summaryOverride || calendar.summary,
      color: calendarColor(calendar.backgroundColor),
      range_start: start.toISOString().slice(0, 10),
      range_end: end.toISOString().slice(0, 10),
    });
    check(result.error);
  }
}

export async function syncGoogleSource(
  source: ManagedSource,
  jobDeadline = Date.now() + 240000,
): Promise<boolean> {
  const admin = adminClient(),
    lease = randomUUID(),
    now = new Date().toISOString();
  const { data: locked, error: lockError } = await admin
    .from("google_calendar_sources")
    .update({
      lock_token: lease,
      requested_at: now,
      lock_until: new Date(Date.now() + 240000).toISOString(),
    })
    .eq("household_id", source.household_id)
    .eq("id", source.id)
    .or(`lock_until.is.null,lock_until.lt.${now}`)
    .select("id")
    .maybeSingle();
  check(lockError);
  if (!locked) return false;
  const deadline = Math.min(Date.now() + 180000, jobDeadline - 60000);
  try {
    const { data: connection, error } = await admin
      .from("google_connections")
      .select("*")
      .eq("household_id", source.household_id)
      .eq("id", source.connection_id)
      .single();
    check(error);
    const request = googleSession(connection as GoogleConnection);
    const calendarPath =
      "calendars/" + encodeURIComponent(source.google_calendar_id);
    const meta = await request<ListedCalendar>(
      "users/me/calendarList/" + encodeURIComponent(source.google_calendar_id),
    );
    const metadata = JSON.stringify([meta.accessRole, meta.timeZone]);
    const changes =
      meta.accessRole === "freeBusyReader"
        ? { changed: true, token: null }
        : await readGoogleChanges(
            (query) =>
              request<GoogleChangePage>(calendarPath + "/events?" + query),
            source.sync_token,
            deadline,
          );
    const needsSnapshot =
      source.status !== "ready" ||
      changes.changed ||
      source.cached_range_start !== source.range_start ||
      source.cached_range_end !== source.range_end ||
      source.sync_metadata !== metadata;
    const events: ImportedGoogleEvent[] = [];
    let page: string | undefined;
    // A complete bounded snapshot handles moved/cancelled instances without mixing
    // Google's mutually exclusive syncToken and timeMin/timeMax parameters.
    if (meta.accessRole === "freeBusyReader") {
      const busy = await request<{
        calendars?: Record<
          string,
          { busy?: { start: string; end: string }[]; errors?: unknown[] }
        >;
      }>("freeBusy", {
        method: "POST",
        body: JSON.stringify({
          timeMin: new Date(
            Date.parse(source.range_start + "T00:00:00Z") - 86400000,
          ).toISOString(),
          timeMax: new Date(
            Date.parse(source.range_end + "T00:00:00Z") + 172800000,
          ).toISOString(),
          items: [{ id: source.google_calendar_id }],
        }),
      });
      const calendar = busy.calendars?.[source.google_calendar_id];
      if (!calendar || calendar.errors?.length)
        throw new Error("Google did not provide free/busy information.");
      for (const interval of calendar.busy || []) {
        const normalized = normalizeGoogleEvent({
          id: `busy:${interval.start}:${interval.end}`,
          start: { dateTime: interval.start },
          end: { dateTime: interval.end },
        });
        if (normalized) events.push(normalized);
      }
    } else if (needsSnapshot)
      do {
        const query = new URLSearchParams({
          singleEvents: "true",
          showDeleted: "false",
          maxResults: "2500",
          timeMin: new Date(
            Date.parse(source.range_start + "T00:00:00Z") - 86400000,
          ).toISOString(),
          timeMax: new Date(
            Date.parse(source.range_end + "T00:00:00Z") + 172800000,
          ).toISOString(),
        });
        if (page) query.set("pageToken", page);
        const data = await request<{
          items?: GoogleEvent[];
          nextPageToken?: string;
        }>(calendarPath + "/events?" + query);
        for (const item of data.items || []) {
          const normalized = normalizeGoogleEvent(item, meta.timeZone);
          if (normalized) events.push(normalized);
        }
        page = data.nextPageToken;
        if (
          Date.now() > deadline ||
          events.length > 25000 ||
          JSON.stringify(events).length > 3000000
        )
          throw new Error(
            "Calendar import exceeds the supported snapshot size.",
          );
      } while (page);
    const { data: committed, error: commitError } = await admin.rpc(
      needsSnapshot
        ? "commit_google_calendar_sync"
        : "checkpoint_google_calendar_sync",
      {
        target_source: source.id,
        target_household: source.household_id,
        lease,
        expected_start: source.range_start,
        expected_end: source.range_end,
        next_token: changes.token,
        ...(needsSnapshot ? { metadata, snapshot: events } : {}),
      },
    );
    check(commitError);
    if (!committed) return false;
    await admin
      .from("google_calendar_sources")
      .update({
        name: meta.summaryOverride || meta.summary,
        color: calendarColor(meta.backgroundColor),
      })
      .eq("household_id", source.household_id)
      .eq("id", source.id)
      .eq("lock_token", lease);
    if (
      meta.accessRole !== "freeBusyReader" &&
      (!source.watch_expires_at ||
        Date.parse(source.watch_expires_at) < Date.now() + 86400000)
    ) {
      const watchId = randomUUID(),
        watchToken = randomBytes(32).toString("hex");
      // Persist before requesting: Google may send its initial sync notification first.
      const preparing = await admin
        .from("google_calendar_sources")
        .update({ watch_id: watchId, watch_token: watchToken })
        .eq("household_id", source.household_id)
        .eq("id", source.id)
        .eq("lock_token", lease)
        .select("id")
        .maybeSingle();
      check(preparing.error);
      if (!preparing.data) return false;
      const watch = await request<{
        resourceId: string;
        expiration: string;
      }>(calendarPath + "/events/watch", {
        method: "POST",
        body: JSON.stringify({
          id: watchId,
          type: "web_hook",
          address: googleAppOrigin() + "/api/google-calendar/notifications",
          token: watchToken,
          params: { ttl: "604800" },
        }),
      });
      const registered = await admin
        .from("google_calendar_sources")
        .update({
          watch_resource_id: watch.resourceId,
          watch_expires_at: new Date(Number(watch.expiration)).toISOString(),
        })
        .eq("household_id", source.household_id)
        .eq("id", source.id)
        .eq("watch_id", watchId)
        .eq("lock_token", lease)
        .select("id")
        .maybeSingle();
      check(registered.error);
      if (!registered.data) {
        await request("channels/stop", {
          method: "POST",
          body: JSON.stringify({ id: watchId, resourceId: watch.resourceId }),
        }).catch(() => {});
        return false;
      }
      if (source.watch_id && source.watch_resource_id)
        await request("channels/stop", {
          method: "POST",
          body: JSON.stringify({
            id: source.watch_id,
            resourceId: source.watch_resource_id,
          }),
        }).catch(() => {});
    }
    return true;
  } catch (cause) {
    const lost =
      cause instanceof GoogleApiError &&
      (cause.status === 404 ||
        (cause.status === 403 && cause.reason === "forbidden"));
    await admin.rpc("fail_google_calendar_sync", {
      target_source: source.id,
      target_household: source.household_id,
      lease,
      access_lost: lost,
      message: lost
        ? "Google no longer permits access to this calendar."
        : cause instanceof GoogleApiError && cause.reason === "reconnect"
          ? "Reconnect this Google account in Household settings."
          : "Synchronization failed. Cached Events may be out of date. Try again.",
    });
    console.error("Google Calendar sync failed", {
      sourceId: source.id,
      status: cause instanceof GoogleApiError ? cause.status : "internal",
    });
    return false;
  } finally {
    await admin
      .from("google_calendar_sources")
      .update({ lock_token: null, lock_until: null })
      .eq("household_id", source.household_id)
      .eq("id", source.id)
      .eq("lock_token", lease);
  }
}
export async function runGoogleSync() {
  const admin = adminClient();
  // tenant-scope: scheduled system work enumerates sources, then scopes each operation.
  const { data, error } = await admin
    .from("google_calendar_sources")
    .select("*")
    .order("requested_at", { ascending: true })
    .limit(25);
  check(error);
  const deadline = Date.now() + 240000;
  for (const source of (data || []) as ManagedSource[]) {
    if (Date.now() + 75000 > deadline) break;
    await syncGoogleSource(source, deadline);
  }
}
export async function receiveGoogleNotification(
  headers: Headers,
): Promise<void> {
  const id = headers.get("x-goog-channel-id"),
    token = headers.get("x-goog-channel-token");
  if (!id || !token || token.length !== 64) return;
  const admin = adminClient();
  // tenant-scope: opaque channel identity locates the source before its Household is known.
  const { data } = await admin
    .from("google_calendar_sources")
    .select("*")
    .eq("watch_id", id)
    .eq("watch_token", token)
    .maybeSingle();
  if (
    !data ||
    (data.watch_resource_id &&
      data.watch_resource_id !== headers.get("x-goog-resource-id"))
  )
    return;
  await syncGoogleSource(data as ManagedSource);
}
export async function requestHouseholdGoogleSync(
  sourceId: string,
  range?: { start: string; end: string },
) {
  const { supabase, householdId } = await requireHousehold();
  const { data: authorized, error } = await supabase
    .from("google_calendar_sources")
    .select("id")
    .eq("household_id", householdId)
    .eq("id", sourceId)
    .single();
  check(error);
  if (!authorized) throw new Error("Calendar not found.");
  const { data, error: sourceError } = await adminClient()
    .from("google_calendar_sources")
    .select("*")
    .eq("household_id", householdId)
    .eq("id", sourceId)
    .single();
  check(sourceError);
  if (!data) throw new Error("Calendar not found.");
  const source = data as ManagedSource;
  if (range) {
    const admin = adminClient();
    const update = await admin.rpc("expand_google_calendar_range", {
      target_source: source.id,
      target_household: householdId,
      requested_start: range.start,
      requested_end: range.end,
    });
    check(update.error);
    const refreshed = await admin
      .from("google_calendar_sources")
      .select("*")
      .eq("household_id", householdId)
      .eq("id", source.id)
      .single();
    check(refreshed.error);
    Object.assign(source, refreshed.data);
  }
  const synchronized = await syncGoogleSource(source);
  if (range && !synchronized)
    throw new Error(
      "Calendar is busy or could not synchronize. Use Load Events to retry.",
    );
}

// Called only with a Household/source pair validated by an authenticated action.
export async function syncAuthorizedGoogleSource(
  householdId: string,
  sourceId: string,
) {
  const { data, error } = await adminClient()
    .from("google_calendar_sources")
    .select("*")
    .eq("household_id", householdId)
    .eq("id", sourceId)
    .maybeSingle();
  check(error);
  if (data) await syncGoogleSource(data as ManagedSource);
}
