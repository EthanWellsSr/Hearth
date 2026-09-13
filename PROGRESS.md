# Hearth — status & handoff

Living doc so any new session can resume. Update it as work lands.

## Current state
- Foundation: `CONTEXT.md` (glossary), `ROADMAP.md` (planned releases),
  `docs/adr/0001–0007` (decisions), and `AGENTS.md` / `CLAUDE.md` (agent guides).
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
  **Self-serve onboarding** at `/onboarding`: a user with no household creates one
  (becomes owner) or joins via a household `invite_code` (member). Household join/
  create writes go through the admin client server-side after validation. Owners
  see the invite code on the hub. See ADR 0006.
- **Chores: DONE** (at `/chores`). Recurring tasks (every N days / weekly on a
  weekday); single-row model, `next_due` advances on completion (recurrence math
  in `lib/recurrence.ts`). Overdue highlighted. Optional assignee per chore
  (a Member; reassignable). Member display names live on `memberships`.
- **Tests: STARTED.** Vitest set up (`npm test`); `lib/recurrence.ts` covered.
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
- **Versioning:** semver git tags via `npm version` from `web/` using the planned
  patch/minor/major increment, then `git push Hearth master --follow-tags`; visible
  in the footer from `package.json`. First release tagged **v0.1.0**.
- **Current release:** **v0.2.0** adds self-serve Household onboarding, installable
  PWA support, and the approved meadow visual redesign.

## Run it
- `cd web && npm run dev` → http://localhost:3000
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
- `web/lib/auth.ts` — `requireHousehold()`: gate returning {supabase, user, householdId}.
- `web/middleware.ts` — refreshes the auth session cookie on every request.
- `web/app/login/` — email+password sign in / sign up / sign out.
- `web/app/onboarding/` — create-or-join-household step for users with no membership.
- `web/public/logo-meadow.png` — the current Hearth logo (PWA icon and header/login mark).
- `web/supabase/migrations/0001_auth_tenancy.sql` — the tenancy migration (record).
- DB: `todos`, `grocery_items` (now with `household_id`), `households`,
  `memberships`; RLS enforced on all via `is_member(household_id)`.

## Next
1. CI — run `npm test` on push (test runner already set up).

## Gotchas
- `.env.local` never committed; secret key (`SUPABASE_SECRET_KEY`) is server-only.
- Data is Household-scoped and RLS-enforced. Self-serve onboarding supports creating
  or joining a Household with an invite code. The Household timezone is still
  hard-coded to America/Chicago and needs to become a Household setting later.
- Since `Confirm email` is ON, a new signup must click the email link before signing in.
