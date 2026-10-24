# Google Calendar setup for v0.4.6

The implementation is a draft until the real Google account flows and scheduled
recovery have been verified. No Gmail mailbox access or Google Calendar write
permissions are requested.

## Google Cloud application

Setup progress on 2026-10-23: project **Hearth Calendar**
(`charming-hearth-512602-h2`) exists and the Google Calendar API is enabled.
Billing was not enabled. OAuth consent configuration and separate staging and
production Web clients are created. The agreed five scopes are declared, and
Ethan’s account is allowlisted while the app remains in Testing. Continue in this
project rather than creating another. Testing-mode token lifetime and production
audience configuration remain release considerations.

1. Open [Google Cloud Console](https://console.cloud.google.com/), create or select
   a project for Hearth, and enable the
   [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com).
2. Configure the [Google Auth Platform](https://console.cloud.google.com/auth/overview)
   branding, audience, and consent screen. For initial testing, add Ethan's and
   his wife's Google accounts as test users. Check the current publishing and
   verification requirements for the chosen audience; Testing is not a promise
   of permanent offline access.
3. Create an OAuth client of type **Web application**. Register the exact callback
   for each environment, formed as its configured origin plus
   `/api/google-calendar/callback`. The production URL currently documented in
   Hearth's README gives:
   `https://hearth-omega-umber.vercel.app/api/google-calendar/callback`.
   Confirm that domain is still the intended production origin. Use a stable
   preview domain for staging, and `http://localhost:3000/api/google-calendar/callback`
   for local testing. Do not use wildcard redirect URIs.
4. Configure these read-only permissions, plus `openid` and `email`:
   - `https://www.googleapis.com/auth/calendar.events.readonly`
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
   - `https://www.googleapis.com/auth/calendar.events.freebusy`
   The last scope supports calendars for which Google exposes only Busy times.
5. Keep the client secret private. Install it directly in deployment settings or
   a private `.env.local`; do not paste it into chat, commit it, or upload it to
   the public repository.

## Deployment variables

Set variables separately for staging/preview and production. Preview must use
`hearth-staging`; production uses `Hearth`. Do not mix Google credentials,
encryption keys, databases, or callback origins across these environments.

| Variable | Value |
| --- | --- |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google Web application client ID |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Its private client secret |
| `GOOGLE_CALENDAR_APP_ORIGIN` | Exact HTTPS app origin, with no path; localhost HTTP is allowed for development |
| `GOOGLE_CALENDAR_ENCRYPTION_KEY` | Base64 encoding of 32 cryptographically random bytes |
| `GOOGLE_CALENDAR_SYNC_SECRET` | Separate strong random secret for the scheduled endpoint |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Correct environment's server-only Supabase settings |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Matching public Supabase settings already used by Hearth |

Generate the encryption key locally with
`node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"`.
Generate a separate random value for the sync secret. Store both securely. Changing
the encryption key without re-encrypting stored values makes existing Google
connections unreadable and requires reconnection.

The current Vercel connector lists Hearth but denies project/team configuration
with HTTP 403 for scope `hearth13`. That access must be granted before the agent
can install or verify environment variables. No authorization helper is exposed
by the active connector. Dashboard sign-in worked during the 2026-10-23
continuation. Separate app origins are saved as Config for production and the
`dev` preview branch. Client IDs, client secrets, encryption keys, and scheduler
secrets are saved as Secret variables, separately for production and `dev`.
Staging credentials also exist in private `.env.local`. New deployments are
required to load these settings. No credentials belong in the repository.

## Scheduled recovery and notifications

- `/api/google-calendar/notifications` receives Google watch notifications.
  It authenticates opaque channel tokens, then fetches the source changes.
- `/api/google-calendar/sync` accepts **POST** with
  `Authorization: Bearer <GOOGLE_CALENDAR_SYNC_SECRET>`.
- Store the matching sync URL and secret in the target Supabase project's Vault
  as `hearth_google_calendar_sync_url` and `hearth_google_calendar_sync_secret`.
  Never commit their values.
- After deploying the endpoint and configuring secrets, run
  [the scheduler installer](../../web/supabase/operations/install_google_calendar_sync.sql)
  against the matching project. It schedules recovery every 15 minutes through
  `pg_cron` and `pg_net`. Enable those extensions if the target lacks them.
- Google must be able to reach the notification URL. An authenticated Vercel
  preview may block Google; use a dedicated reachable staging endpoint or a
  narrowly configured protection exception. Verify reachability rather than
  disabling protection for the whole app by assumption.

No recovery schedule has been installed yet. Its successful invocation and
notification delivery are release acceptance checks, not inferred from code.

## Verification before release

Use actual Google test accounts and fictional Events in staging. Verify two
accounts, selected calendars, read-only details, Gmail-created Events, updates,
cancellations, recurring exceptions, permission loss, reconnect, shared-calendar
deduplication, range expansion, calendar renames, and timed/all-day behavior.
Check real desktop and phone flows, manual refresh, watch delivery, and a recovery
job run. Then complete production migrations and coordinated deployment using
root `AGENTS.md`. Keep v0.4.6 marked incomplete until these checks pass.

References: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server),
[Free/busy permissions](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query),
[Supabase scheduling](https://supabase.com/docs/guides/functions/schedule-functions).
