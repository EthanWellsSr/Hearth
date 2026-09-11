# Hearth — status & handoff

Living doc so any new session can resume. Update it as work lands.

## Current state
- Foundation: `CONTEXT.md` (glossary), `docs/adr/0001–0005` (decisions), `CLAUDE.md` (guide).
- App scaffolded in `web/` — Next.js + TypeScript, App Router, no Tailwind.
- **Home hub: DONE.** `/` is a link list to feature pages (only ones that exist).
- **To-dos: DONE** (at `/todos`). Add, toggle done, delete; completed to-dos
  auto-purge nightly at midnight America/Chicago via pg_cron (DST-correct).
- **Grocery List: DONE** (at `/groceries`). Add, check off (bought), delete one,
  clear bought; bought items sink to the bottom. Table `grocery_items`.
- **Auth + Households + RLS: DONE.** Email+password via Supabase
  Auth (email confirmation ON). `households` + `memberships` (join table) tables;
  `household_id` on every data table; RLS enforces access via `is_member()`.
  Pages/actions use the user-scoped client (RLS live); `/login` gates the app.
  Membership is admin-managed (no self-serve join yet). See ADR 0006.
- **Chores: DONE** (at `/chores`). Recurring tasks (every N days / weekly on a
  weekday); single-row model, `next_due` advances on completion (recurrence math
  in `lib/recurrence.ts`). Overdue highlighted. Optional assignee per chore
  (a Member; reassignable). Member display names live on `memberships`.
- **Tests: STARTED.** Vitest set up (`npm test`); `lib/recurrence.ts` covered.
- **Styling: DONE.** **Tailwind CSS v4** (ADR 0007) with an emerald/stone botanical
  theme, dark mode via `prefers-color-scheme`. Component classes (`.card`,
  `.btn-primary`, `.btn-ghost`, `.field`, `.icon-btn`) in `app/globals.css`; shared
  `components/AppHeader.tsx` + `components/PlantMark.tsx` (house-in-vines mark).
- Not deployed.

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
- `web/supabase/migrations/0001_auth_tenancy.sql` — the tenancy migration (record).
- DB: `todos`, `grocery_items` (now with `household_id`), `households`,
  `memberships`; RLS enforced on all via `is_member(household_id)`.

## Next (deploy is LAST — only once the MVP is functional and the UI is done)
1. Deploy to Vercel — connect GitHub repo, set env vars there.
2. CI — run `npm test` on push (test runner already set up).

## Gotchas
- `.env.local` never committed; secret key (`SUPABASE_SECRET_KEY`) is server-only.
- Data is household-scoped and RLS-enforced. Note `household_id` becomes a Household
  *setting* the day timezone/self-serve join land; for now membership is admin-only
  (add a second Member via SQL/dashboard until an invite flow exists).
- Since `Confirm email` is ON, a new signup must click the email link before signing in.
