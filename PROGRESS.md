# Hearth — status & handoff

Living doc so any new session can resume. Update it as work lands.

## Current state
- Foundation: `CONTEXT.md` (glossary), `docs/adr/0001–0005` (decisions), `CLAUDE.md` (guide).
- App scaffolded in `web/` — Next.js + TypeScript, App Router, no Tailwind.
- **MVP slice — To-dos: DONE.** Add + toggle done, persisted to Supabase via server actions.
- Not deployed. No auth/households, no styling, no tests yet.

## Run it
- `cd web && npm run dev` → http://localhost:3000
- Requires `web/.env.local` (gitignored) with `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
  Stays on this Mac; the same values go into Vercel's settings at deploy. Only a fresh
  clone on another machine needs to re-add them. Restart dev server after editing env.

## Key files
- `web/app/page.tsx` — server component; reads todos, renders list + add form.
- `web/app/actions.ts` — server actions: `addTodo`, `toggleTodo`.
- `web/lib/supabase.ts` — server Supabase client (secret key, bypasses RLS).
- DB: Supabase `todos` table (`id`, `text`, `done`, `created_at`), RLS on.

## Next (deploy is LAST — only once the MVP is functional and the UI is done)
1. Grocery list — via the full Pocock feature loop; adds routing + a shared list pattern.
2. Auth + Households — login + `household_id` scoping (makes data private/multi-user).
3. Chores + recurrence — next feature through the loop.
4. Styling — nail down the UI.
5. Deploy to Vercel — connect GitHub repo, set env vars there.
6. Tests/CI.

## Gotchas
- `.env.local` never committed; secret key is server-only.
- Data is not household-scoped yet (single shared table) — revisit when auth lands.
