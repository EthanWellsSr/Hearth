# Hearth — repository instructions for Codex

Hearth is a shared household web app for calendar coordination, Chores, To-dos,
the Grocery List, meal planning, Notes, Messages, and Expenses.

## Sources of truth

- `CONTEXT.md` defines the exact product vocabulary. Use those terms.
- `ROADMAP.md` organizes future work by planned release.
- `PROGRESS.md` records the current implemented state, immediate next work, and
  operational notes. Keep it synchronized with changes as they land.
- `docs/adr/` records architectural decisions and their reasoning.

## Workflow

- Work on `dev` unless Ethan explicitly directs otherwise.
- Never commit or push unless Ethan explicitly requests it.
- Commits use a single-line message summarizing their contents. Do not use
  multi-line bodies or bulleted commit descriptions.
- Preserve unrelated working-tree changes. Inspect the current diff before
  editing and before reporting completion.
- Run commands from `web/` unless a command is repository-wide.

## Required verification

- Run `npm run lint` after code changes.
- Run `npm test` after behavior or recurrence changes.
- Run `npm run build` before handing off a completed feature when practical.
- Verify user-facing UI changes in a browser at desktop and phone widths.
- Report checks that were not run or could not complete.

## Architecture guardrails

- Hearth is a responsive PWA built with Next.js, TypeScript, Tailwind CSS, and
  Supabase.
- A Household is the tenancy boundary. Every data row belongs to one Household.
- Per-user application requests use the user-scoped Supabase client so RLS remains
  active. The secret-key client is server-only and reserved for validated admin or
  system work.
- Schema changes are recorded as ordered SQL migrations under
  `web/supabase/migrations/`.
- Do not change authentication, tenancy, recurrence behavior, or database shape as
  collateral work for a visual task.

## Working with Ethan

This is a learning project. The deliverable includes Ethan's understanding of how
applications and databases are built; the app is the vehicle.

- Teach the system, not syntax. For a feature, explain its data model, request flow
  (screen → server → database → refresh), and important seams.
- Give databases extra depth: schema, keys, relationships, migrations, concurrency,
  and places where an AI-generated architectural mistake would be costly.
- Do not walk through code line by line unless asked.
- Build at normal speed while explaining decisions at the architecture level.
- Prefer scalable patterns. Identify deliberate stepping-stones instead of silently
  treating them as production-grade designs.
- Default to concise responses. Lead with the decision or question and expand only
  when requested.
- Ask necessary questions inline rather than using a pop-up.
