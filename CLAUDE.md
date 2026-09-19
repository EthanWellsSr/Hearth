# Household Command Center — guide for AI sessions

Shared web app for one household (Ethan + wife): calendar, chores, to-dos,
groceries, meal planning, notes, messaging, expenses.

- **Status** — current progress and what's next in
  [STATUS.md](docs/STATUS.md).
- **Roadmap** — planned releases and future features in
  [ROADMAP.md](docs/ROADMAP.md).
- **Vocabulary** — use the exact terms in
  [CONTEXT.md](CONTEXT.md).
- **Decisions** — recorded in [docs/adr/](docs/adr/).

**Keep [STATUS.md](docs/STATUS.md) current.** Update it when active work, next
actions, or blockers change. It is the handoff between sessions.

## Release documentation

Before every release:

- Move completed `CHANGELOG.md` entries from `Unreleased` into a dated version.
- Remove the shipped release from `docs/ROADMAP.md` and verify the remaining
  release order, dependencies, and scope.
- Update `docs/STATUS.md` with the released version, current work, next actions,
  and blockers.
- Review `CONTEXT.md`; change it only when Hearth's domain language changed.
- From `web/`, run `npm run notices` and include the regenerated
  `public/legal/THIRD_PARTY_NOTICES.txt`.

## Feature design gate

Before code for `v0.4.0` or any later feature release, invoke `grill-with-docs`
and record the agreed goal, user flows, data model, boundaries, and acceptance
criteria in `docs/design/`. Implementation begins only after Ethan confirms that
the design tree is fully resolved. Update `CONTEXT.md` inline when domain language
changes and add an ADR only for a hard-to-reverse decision with a real trade-off.

**Commits use a single-line message** that summarizes the contents. No multi-line
bodies or bulleted commit descriptions.

**Only commit and push when Ethan says to.** Do the work and leave it uncommitted;
never run `git commit`/`git push` until he explicitly asks. He batches related
changes into commits on his own cadence.

## Working with Ethan

This is a **learning project**: the deliverable is Ethan's understanding of how
apps and databases are built — the app itself is the vehicle. He defends the work
in an interview by understanding the *system*, not by having hand-written the code.

Ethan is a Computer Engineering student with real automation/CI-CD experience
(Boeing). He knows programming fundamentals and treats AI as an abstraction layer
above the code — he directs in plain English and reviews the result, rather than
reading every line. He is **not a beginner**. He has never built an app or a
database; that is the gap to close.

- **Teach the system, not the syntax.** Per feature, explain the data model
  (tables, columns, and *why* they're shaped that way), the request flow
  (screen → server → database → refresh), and the seams. Call out **where AI
  could make an architectural mistake** so he learns where to aim his attention.
- **Databases get the depth.** Schema, keys, relationships, migrations,
  concurrency — the stated gap, and the riskiest thing to hand an AI blindly.
- **Don't walk code line-by-line** unless he asks, and don't define every term as
  if he were new to programming.
- **Build at normal speed.** Teaching shouldn't slow delivery; he reviews at the
  architecture level.
- **Build for scale, not just for two users.** Hearth is personal, but the point
  is skills that transfer to real production apps — so choose patterns (data
  modeling, auth/tenancy, indexing, migrations) as if they must scale, and say
  when a shortcut is a deliberate stepping-stone vs a production-grade choice.
  Apply process (grilling, ADRs, design) sized to the decision's real stakes —
  not skipped, not performed as ritual.
- **Default to short.** Lead with the decision or question. Keep answers to a few
  sentences or a tight list. Teach a concept only when asked, in the smallest
  useful chunk — never a multi-section lecture. If something needs depth, say so
  in one line and let Ethan pull it, rather than dumping it. This applies to
  design work too: present the 2-3 decisions that need his input, not a full
  write-up.
- **Ask inline.** Put questions in the reply; never use the AskUserQuestion pop-up.
