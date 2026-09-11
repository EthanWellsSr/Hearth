# Hearth — status & handoff

Living doc so any new session can resume. Update it as work lands.

## Current state
- Foundation: `CONTEXT.md` (glossary), `docs/adr/0001–0005` (decisions), `CLAUDE.md` (guide).
- App scaffolded in `web/` — Next.js + TypeScript, App Router, no Tailwind.
- **Home hub: DONE.** `/` is a link list to feature pages (only ones that exist).
- **To-dos: DONE** (at `/todos`). Add + toggle done, persisted via server actions.
- **Grocery List: DONE** (at `/groceries`). Add, check off (bought), delete one,
  clear bought; bought items sink to the bottom. Table `grocery_items`.
- **Auth + Households + RLS: DONE.** Email+password via Supabase
  Auth (email confirmation ON). `households` + `memberships` (join table) tables;
  `household_id` on every data table; RLS enforces access via `is_member()`.
  Pages/actions use the user-scoped client (RLS live); `/login` gates the app.
  Membership is admin-managed (no self-serve join yet). See ADR 0006.
- Not deployed. No styling, no tests yet.

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
1. **To-dos revisit** (designed 2026-08-27, not yet built) — add individual delete
   + a nightly auto-purge of completed to-dos via Supabase `pg_cron`, firing at
   midnight **America/Chicago** (Household TZ; hardcoded until auth, then a setting).
   Also extract the shared "checkable list" pattern shared by to-dos and groceries
   (deliberately duplicated for now — extract once two real examples exist).
2. Chores + recurrence — next feature through the loop.
3. Styling — nail down the UI.
4. Deploy to Vercel — connect GitHub repo, set env vars there.
5. Tests/CI.

## Gotchas
- `.env.local` never committed; secret key (`SUPABASE_SECRET_KEY`) is server-only.
- Data is household-scoped and RLS-enforced. Note `household_id` becomes a Household
  *setting* the day timezone/self-serve join land; for now membership is admin-only
  (add a second Member via SQL/dashboard until an invite flow exists).
- Since `Confirm email` is ON, a new signup must click the email link before signing in.
