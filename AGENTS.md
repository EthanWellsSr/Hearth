# Hearth — how to work with Ethan

Hearth is a responsive Household web app built with Next.js, TypeScript,
Tailwind CSS, and Supabase. Follow Ethan's agreed product decisions and carry
work through verification, documentation, push, and a pull request.

## Working with Ethan

- Be concise and direct. Lead with results, decisions, and necessary questions.
- Ask design questions explicitly and inline. Explain trade-offs when Ethan
  needs to choose; do not turn implementation into a lesson unless he asks.
- Treat Ethan's confirmed decisions as the implementation contract. Do not
  reopen settled questions or expand the scope without a concrete reason.
- Resolve routine implementation details independently within that contract.
- Continue authorized work without asking Ethan to approve each step. Report
  real blockers promptly, with what is needed to resolve them.
- Keep Ethan informed during sustained work. Distinguish verified results from
  assumptions, simulated checks, and unfinished work.

## Release workflow — follow in order

1. **Start with `grill-with-docs`.** Every new release begins with this design
   process before feature code. Resolve the goal, user flows, editable data,
   access rules, boundaries, edge cases, and acceptance criteria with Ethan.
   If the skill is unavailable, tell Ethan and resolve the missing process with
   him before coding; do not claim it ran.
2. **Document Ethan's decisions.** Record the confirmed design in `docs/design/`.
   Update status and roadmap as the plan changes. Begin implementation once
   Ethan confirms the design is resolved. Keep later agreed changes in the same
   design record. Add an ADR only for a hard-to-reverse architectural decision
   with a real trade-off.
3. **Implement as agreed on `dev`.** Inspect the existing code and working-tree
   diff first. Preserve unrelated work and follow the architecture guardrails.
4. **Verify the implementation.** Test every acceptance criterion and affected
   flow in the browser, staging database, or both, as appropriate. Run the
   relevant automated checks. Fix failures and recheck before proceeding.
5. **Apply agreed production database updates.** After staging verification,
   apply and verify the release's database changes in production using the
   database workflow below. Do not leave this work for Ethan to do manually.
6. **Sweep documentation across the entire repository.** Check all documents
   for changes needed by the final behavior and verification results, then
   complete the release checklist below. Do not wait for Ethan to request it.
7. **Commit, push, and open a PR.** Once verification and documentation are
   complete, commit the release changes, push `dev`, and create or update the
   PR from `dev` into `master`. These steps are part of the authorized workflow;
   do not ask for separate approval. Report the commit, PR, checks, and any
   remaining rollout steps. Do not merge the PR unless Ethan directs it.

## Branch and repository practices

- Everything happens on `dev`. Do not implement on `master` or another branch
  unless Ethan explicitly changes this instruction.
- Run application commands from `web/`; run repository-wide commands at the root.
- Preserve unrelated working-tree changes. Review the final diff before committing
  and include only the agreed work and its required documentation.
- Use single-line commit messages summarizing their contents.
- Keep changes reviewable. A PR describes the final problem, resulting behavior,
  verification evidence, database rollout state, and material limitations.

## Verification

- Run `npm run lint` after code changes, `npm test` after behavior changes, and
  `npm run build` before handing off a completed feature. Run TypeScript checks
  when relevant; generate Next.js route types first when needed.
- Verify user-facing changes in a real browser at desktop and phone widths.
  Exercise the complete affected flow, including error recovery and touch or
  keyboard interactions where applicable.
- Verify database behavior in staging with authenticated Member permissions,
  including data integrity, Household isolation, and relevant concurrency cases.
- Use fictional staging fixtures and clean them up or roll them back. Preserve
  existing staging data. Do not copy production Household data into staging.
- Simulated browser responses and isolated database harnesses are supplemental;
  identify them clearly and do not report them as live integration verification.
- Record evidence in `docs/STATUS.md` or a linked verification record. Never claim
  unrun checks passed. If a required check is blocked, report it explicitly rather
  than presenting the release as fully verified.

## Database workflow and standing authorization

- Ethan's confirmed design authorizes the agent to implement, apply, and verify
  the database changes it requires in both staging and production. Separate
  explicit approval for those production updates is not required.
- Inspect the actual target project, schema, and migration history before changes.
  Confirm staging versus production from the connected service; do not infer the
  target from a cached connection or an unqualified CLI default.
- Record schema changes as ordered migrations under `web/supabase/migrations/`.
  Apply and test in staging first, then apply the verified migration to production.
- Keep repository, staging, and production migration histories aligned. If the
  tool generates a different timestamp for the same applied migration, verify
  the entry and reconcile its version as part of the authorized rollout.
- Preserve existing data and verify counts, relevant constraints, ordering, and
  permissions after applying a migration. Keep test fixtures out of production.
- Coordinate migrations with application rollout. Changes applied before the PR
  merges must remain compatible with the currently deployed app. If a design
  requires a breaking transition, resolve the rollout sequence during design.
- The authorization covers the agreed design. Bring unexpected destructive work,
  unrelated changes, or material departures from that design back to Ethan.

## Documentation and release checklist

- Review documentation throughout the repository, including `README.md`,
  `CONTEXT.md`, `CHANGELOG.md`, `docs/STATUS.md`, `docs/ROADMAP.md`, feature designs,
  ADRs, setup instructions, and any affected operational notes.
- Use `CONTEXT.md` as the source of product vocabulary. Update it when domain
  language changes, and use the agreed terms consistently.
- Record completed work under a dated version in `CHANGELOG.md`; remove its
  completed release section from the roadmap and verify what comes next.
- Keep `web/package.json` and `web/package-lock.json` on the completed version.
- Keep status concise and current: completed version, verification evidence,
  database migration state, application deployment state, next work, and blockers.
  Completion, a pushed branch, a merged PR, and a production deployment are
  distinct facts; report each only when supported by evidence.
- Preserve historical records. Update current guidance and add completion notes
  without rewriting historical findings as if they occurred today.
- Update the Hearth entry in the `EthanWellsSr/EthanWellsSr` profile README when a
  release changes the project's public description; include that update in the
  release work rather than leaving an unpublished local draft.
- Run `npm run notices` and `npm run notices:check` from `web/`; include the
  regenerated `web/public/legal/THIRD_PARTY_NOTICES.txt`.
- Check changed documentation links and version consistency before pushing.

## Architecture guardrails

- A Household is the tenancy boundary. Every Household-owned row belongs to one
  Household; include explicit `household_id` filters in Household-scoped queries.
- Use the signed-in User's Supabase client for application requests so RLS stays
  active. Keep secret-key clients server-only and limited to validated admin or
  system work.
- Preserve access boundaries in schema changes, RPCs, and background operations.
- Do not change authentication, tenancy, recurrence, or database shape as
  collateral work outside the agreed design.
