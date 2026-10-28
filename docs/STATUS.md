# Hearth status

Short handoff for the current release and immediate work. Update this file when
the active plan changes and as part of every release.

## Current completed version

- **v0.4.6 — Google Calendar Integration**, completed 2026-10-27 on `dev`
  ([design](design/v0.4.6-google-calendar-integration.md),
  [verification](audits/2026-10-23-google-calendar-verification.md)).
- Database: three Calendar migrations applied to staging and production with
  matching versions; production data counts and permissions verified.
- Application: PR #7 merged to `master` on 2026-10-27 as `517b3bb`; the
  production deployment succeeded and serves v0.4.6. The daily cron job
  (`/api/google-calendar/sync`, 09:00 UTC) is registered; unauthenticated calls
  return 401. A manual run was triggered, but Vercel logs did not show its result,
  so `CRON_SECRET` authentication is unconfirmed until a logged run or real sync.
- Live staging verification: OAuth, notification delivery, cancellation,
  recurring exception, recovery, phone layout. **Not yet verified live:** second
  Google account/shared-calendar deduplication, permission loss/reconnect,
  Gmail-created Events, calendar rename, range expansion, production Cron run and
  production Google connection.

## Previous release — v0.4.5

- **v0.4.5 — To-do Editing & Ordering**, completed 2026-10-21; PR #5 merged
  2026-10-22 as `ce0d6b8`. See the [design](design/v0.4.5-todo-editing-ordering.md).

## To-do checkbox follow-up — 2026-10-22

- Ethan requested square completion boxes after checking the deployed To-do feature.
- Changed the To-do completion button from a circle to a square, leaving unfinished
  boxes empty and retaining the checkmark for completed To-dos.
- Source review confirms the change only affects the completion control's shape
  and unfinished glyph. Existing submission, labels, disabled state, and sizes remain.
- Local lint, build, notices generation, and browser checks could not run because
  the execution environment's network proxy was unavailable. GitHub CI checks
  and migration jobs passed for checkbox commit `2925e6d`; live browser verification
  of the square-box follow-up remains unperformed.
- No database, dependency, or version changes.

## Verification and limitations

- 94 tests, lint, TypeScript, and production build passed. Build uses placeholder
  Supabase configuration because this checkout has no application credentials.
- An isolated PostgreSQL (PGlite) harness verified the migration and ordering,
  completion boundaries, new-item placement, and RLS/anonymous rejection using
  representative tenancy fixtures. This is not a full Supabase rebuild or a
  multi-session concurrency test.
- Desktop (1280 px) and phone (390 px) browser checks passed against actual
  components with simulated server responses: editing, failed-save retry,
  cancellation, completion, addition, arrow moves, pointer drag, and emulated
  touch drag. No horizontal overflow or browser errors.
- Staging migration `20261021222858_todo_editing_ordering` applied on
  2026-10-21 to `hearth-staging` (`lrksljvljdgkbgtklila`). Local filename matches
  the version recorded by the Supabase migration tool.
- All 99,446 existing To-dos retained identical original-field fingerprints;
  no missing positions, original creation order preserved, due dates unset.
- The reusable [staging SQL checks](../web/supabase/tests/todo_editing_ordering.sql)
  passed under the authenticated role as two fictional Members: field edits,
  clearing optional fields, shared order, before/after moves, completed-last,
  reopen position, new-item placement, and cross-Household read/write/move/
  Assignee rejection. Invalid dates and anonymous RPC access were rejected.
  All fictional Users, Memberships, Households, and To-dos were rolled back;
  the existing data fingerprint still matches after testing.
- Security advisors are unchanged from the pre-migration baseline; no new
  findings for this migration. Existing notices cover intentional
  [authenticated SECURITY DEFINER functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
  [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
  on `invite_join_attempts`, and
  [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

- Production migration applied on 2026-10-22 to `Hearth`
  (`gclfsxkmtjdxmawwlhba`) with Ethan's explicit authorization. All five existing
  To-dos retained identical original-field fingerprints and creation order;
  no missing positions, due dates unset, ordering index present, and RLS active.
  Reordering uses caller permissions; authenticated execution is allowed and
  anonymous execution denied. With Ethan’s separate approval, production
  migration history was aligned from tool-generated version `20261022001237`
  to repository/staging version `20261021222858`; the recorded entry was verified
  and the original data fingerprint still matches. No production test data was
  created.

- `AGENTS.md` now defines Ethan's end-to-end release workflow: design with
  `grill-with-docs`, record decisions, implement on `dev`, verify affected flows,
  apply agreed staging/production database updates, sweep repository docs, then
  commit, push, and create/update the PR without separate step approvals.

## Roadmap documentation update — 2026-10-22

- Recorded the confirmed Google Calendar scope as planned v0.4.6 and shifted
  subsequent 0.4.x releases by one. Swept all repository Markdown documents;
  updated README, vocabulary, changelog, roadmap, status, and affected designs.
- Checked changed relative links and release references; no broken targets found.
- Documentation only; application/package version remains v0.4.5.

## To-do retry test follow-up — 2026-10-22

- CI on the roadmap commit exposed a timing race in the edit-retry test: an
  error can render while the transition still disables form fields, so synthetic
  submission at that point omits the edited text from FormData.
- The test now waits until Save is enabled and clicks it before checking the
  retry payload. The existing edited-text assertion remains unchanged.
- Application behavior is unchanged. Local execution remains blocked by the
  unavailable network proxy; verification is delegated to GitHub CI.

## Local skills — 2026-10-22

- Vendored all 38 Matt Pocock skills and their support files from
  `mattpocock/skills` at `5beb35b040e3de97e54fa9e386d7e42d15c295c2`, preserving upstream categories.
  See the [catalog and source record](../skills/README.md) and
  [MIT license](../skills/LICENSE).
- Root agent instructions now point to the local release-design skills and retain
  `CONTEXT.md` as Hearth's glossary. The Google Calendar design links to the
  local skill; the interview was subsequently completed on 2026-10-23.
- This imports files only; no plugin, hooks, tracker labels, or scripts were
  installed or executed. Upstream setup has not been run.
- Verified imported-file coverage and exact source content; application and
  package versions are unchanged.

## v0.4.6 implementation draft — 2026-10-23

- Confirmed design implemented as a draft on `dev`: multiple Google connections,
  shared read-only imports and details, source names/colors, Member visibility,
  Hearth Events/Chores toggle, sync/status controls, and provider routes.
- 104 tests, TypeScript, lint, placeholder production build, and notices checks
  passed. Desktop/phone component checks used fictional data. An isolated
  PostgreSQL harness passed tenancy/permissions, stable-ID, lease, range, and
  cleanup checks. These do not establish live Google integration.
- Migrations `20261023002210`, `20261023002823`, and `20261023003744` are applied to staging only.
  Hosted grants/RLS and unchanged native row counts were verified. Hosted
  authenticated fixture execution failed with an expired request-state error.
- Google OAuth application needs creation; Vercel denies team configuration
  access (403, `hearth13`). No real Google connections, scheduler, or production
  migration were configured. Package version stays v0.4.5.
- Bounded snapshots currently cap at 25,000 Events/3 MB or 180 seconds. Larger
  sources need further scalability work; incremental change detection is drafted. See
  [full verification](audits/2026-10-23-google-calendar-verification.md) and
  [setup](setup/google-calendar.md) for the remaining release gates.

## OAuth setup continuation — 2026-10-23

- Consent configuration, five minimal read-only/identity scopes, and separate
  staging/production OAuth clients are configured. Vercel Secret variables and
  separate origins are saved; a new deployment must load them.
- Real Google authorization completed against hosted staging. Imported only a
  fictional test calendar; initial snapshot committed. Local HTTP watch setup
  failed as expected, leaving cached Events and an error. HTTPS notification
  and recovery verification, remaining provider cases, and fixture cleanup are
  pending. Production schema and app are unchanged.

## Next

1. Connect a real Google account in production and confirm the next daily Cron
   run updates its last-sync time.
2. Run the remaining live provider cases listed above.
3. **v0.4.7 — Event Reminders & Browser Push**; Event Organization (v0.4.8) and
   Event Collaboration (v0.4.9) follow, then v0.5.0 and later.

## Blockers

- The [publication review](audits/2026-10-06-repository-publication.md) remains
  a historical record of commit-email exposure and the licensing note; public
  visibility does not establish that a reuse license was granted.
- Public sign-up has no release assignment; Ethan's domain is not selected.
