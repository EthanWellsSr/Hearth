# Hearth — status & handoff

Living doc so any new session can resume. Update it as work lands.

## Current state
- Foundation: `CONTEXT.md` (glossary), `CHANGELOG.md` (shipped releases),
  `ROADMAP.md` (planned releases), `docs/adr/0001–0009` (decisions), and
  `AGENTS.md` / `CLAUDE.md` (agent guides).
- App scaffolded in `web/` — Next.js + TypeScript, App Router, Tailwind CSS v4.
- **Home hub: DONE.** `/` is a link list to feature pages (only ones that exist).
- **To-dos: DONE** (at `/todos`). Add, toggle done, delete; completed to-dos
  auto-purge nightly at midnight America/Chicago via pg_cron (DST-correct).
- **Grocery List: DONE** (at `/groceries`). Add, check off (bought), delete one,
  clear bought; bought items sink to the bottom. Table `grocery_items`.
- **Auth + Households + RLS: DONE.** Email+password via Supabase
  Auth (email confirmation ON). `households` + `memberships` (join table) tables;
  `household_id` on every data table; RLS enforces access via `is_member()`.
  Pages/actions use the user-scoped client (RLS live); `/login` gates the app.
  **Self-serve onboarding** at `/onboarding`: after completing a User Profile, a
  User with no Household creates one (becomes owner) or joins with an Invite Code
  (Member). Narrow database functions make both operations atomic and rate-limit
  join attempts. See ADRs 0006 and 0009.
- **Chores: DONE** (at `/chores`). Recurring tasks (every N days / weekly on a
  weekday); single-row model, `next_due` advances on completion (recurrence math
  in `lib/recurrence.ts`). Overdue highlighted. Optional assignee per chore
  (a Member; reassignable and saved immediately) shown by Avatar and display name.
- **User Profiles + Household people: DONE.** Required
  global display names; optional private Avatars with the Hearth logo fallback;
  setup and editing with crop/pan/zoom/rotation; header profile menu; Member Avatar
  row on the hub; `/people` directory; readable Invite Codes; owner rotation and
  Member removal. Migration 0006 is applied to Supabase. See ADRs 0008 and 0009.
- **iPhone Avatar compatibility: RELEASED in v0.3.1.** The browser
  submits the image format it actually produced, then the server validates and
  normalizes it to the existing 512×512 WebP storage format. This avoids Safari's
  canvas WebP fallback without changing the database or Supabase bucket. Local
  network testing also allows the profile editor to hydrate on a physical iPhone.
- **Invitation Links: RELEASED in v0.3.2.** Every Member can share or
  copy a browser link that opens a public Household invitation, persists through
  sign-in and User Profile setup, and ends with an explicit join confirmation.
  Invalid, rotated, and already-joined states are handled without changing the
  existing Invite Code schema or database join function. On plain-HTTP local
  network testing, restricted share and clipboard APIs fall back to a selectable
  link plus text-message and email actions. See ADR 0009.
- **Tests: STARTED.** Vitest set up (`npm test`); recurrence, User Profile name
  rules, Avatar form-action dispatch, browser format fallback, and server-side
  Avatar normalization, Invitation Link construction, login preservation, and
  sharing controls and restricted-browser fallbacks are covered (28 tests total).
- **Styling: REDESIGNED (visually approved).** **Tailwind CSS v4**
  (ADR 0007). Light, high-end meadow direction: soft green and blue, restrained
  golden accents, modern typography, botanical details, larger touch targets, and
  clearer wording across every screen. New softened brand mark at
  `public/logo-meadow.png`; shared sprigs in `components/MeadowSprig.tsx` and a
  layered field with edge vines in `components/MeadowBackdrop.tsx`.
  Installable PWA (`app/manifest.ts`, meadow logo icon).
- **Deployed** to Vercel (Hobby): https://hearth-omega-umber.vercel.app — root
  dir `web`, production branch `master`, 4 env vars set, auto-redeploys on push.
  Supabase Site URL points at the Vercel domain.
- **Versioning:** semver package versions and annotated Git tags. Release changes
  land on `dev`, merge into `master`, and the tag points to the release merge
  commit. The package version is visible in the app footer.
- **Current release:** **v0.3.2 — Invitation Links** adds the complete browser
  invitation flow and restricted-browser sharing fallbacks. Production deployment
  confirmation is pending.
- **Next release:** **v0.4.0 — Calendar** is planned and requires Matt Pocock's
  `grill-with-docs` process with Ethan before code is written.

## Run it
- `cd web && npm run dev` → http://localhost:3000
- For phone testing on the same network, start with `--hostname 0.0.0.0` and open
  the Mac's LAN address on the phone. `next.config.ts` automatically permits the
  development machine's IPv4 interfaces.
- Requires `web/.env.local` (gitignored) with 4 keys: `SUPABASE_URL`,
  `SUPABASE_SECRET_KEY` (admin, server-only), `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable, user-scoped client). Same values
  go into Vercel at deploy. Restart dev server after editing env.

## Key files
- `web/app/page.tsx` — home **hub**: links to feature pages (only ones that exist).
- `web/app/todos/page.tsx` — To-dos feature at `/todos`; reads todos, list + add form.
- `web/app/actions.ts` — to-do server actions: `addTodo`, `toggleTodo` (revalidate `/todos`).
- `web/components/CheckableList.tsx` — shared list view (todos + groceries; normalize
  rows to {id,label,checked} + pass toggle/delete actions). Reuse for future lists.
- `web/app/chores/` — Chores feature; recurrence math in `web/lib/recurrence.ts`
  (pure, unit-tested in `recurrence.test.ts`). Chores do NOT use CheckableList
  (completing reschedules, not toggles). Table `chores` (migration 0003).
- `web/app/groceries/page.tsx` — Grocery List at `/groceries`; DB-sorted (bought last).
- `web/app/groceries/actions.ts` — grocery actions: add / toggle bought / delete / clear bought.
- `web/lib/supabase.ts` — admin client (secret key, bypasses RLS). Server/admin only.
- `web/lib/supabase-server.ts` — user-scoped client (JWT from cookies); RLS applies.
- `web/lib/auth.ts` — User, User Profile, and Household route/action gates.
- `web/app/profile/` — required User Profile setup and later profile editing.
- `web/components/ProfileEditor.tsx` — Avatar source validation and crop/pan/zoom/
  rotation editor; prepares a browser-compatible cropped image.
- `web/lib/avatar-image-server.ts` — validates Avatar contents and normalizes the
  stored image to 512×512 WebP.
- `web/next.config.ts` — permits profile editor hydration during LAN device testing.
- `web/app/people/` — Household people directory and owner membership controls.
- `web/lib/avatar-server.ts` — short-lived signed URLs for private Avatars.
- `web/middleware.ts` — refreshes the auth session cookie on every request.
- `web/app/login/` — email+password sign in / sign up / sign out.
- `web/app/onboarding/` — create-or-join-household step for users with no membership.
- `web/app/invite/[code]/` — public Invitation Link preview, confirmation, and
  join actions.
- `web/lib/invite.ts` — Invite Code validation and Invitation Link construction.
- `web/lib/pending-invite.ts` — reads and clears the short-lived pending
  invitation cookie used across authentication and profile setup.
- `web/public/logo-meadow.png` — the current Hearth logo (PWA icon and header/login mark).
- `web/supabase/migrations/0001_auth_tenancy.sql` — the tenancy migration (record).
- DB: `todos`, `grocery_items` (now with `household_id`), `households`,
  `memberships`, and after migration 0006 `user_profiles` and
  `invite_join_attempts`; RLS protects Household and User Profile data.

## Next
1. Confirm the Vercel production deployment for `v0.3.2`.
2. Complete Matt Pocock's `grill-with-docs` process with Ethan before beginning
   `v0.4.0 — Calendar`.
3. Add CI that runs `npm test` on every push (test runner already set up).

## Gotchas
- `.env.local` never committed; secret key (`SUPABASE_SECRET_KEY`) is server-only.
- Data is Household-scoped and RLS-enforced. Self-serve onboarding supports creating
  or joining a Household with an Invite Code. User Profiles are global; Memberships
  carry Household roles and remain the target of Chore assignments. The Household timezone is still
  hard-coded to America/Chicago and needs to become a Household setting later.
- Since `Confirm email` is ON, a new signup must click the email link before signing in.
- Invitation Links contain the reusable Invite Code. Treat the link as private;
  owner rotation invalidates it, and a seven-day HTTP-only cookie preserves it
  through sign-in and User Profile setup.
