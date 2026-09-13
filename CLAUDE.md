# Household Command Center — guide for AI sessions

Shared web app for one household (Ethan + wife): calendar, chores, to-dos,
groceries, meal planning, notes, messaging, expenses.

- **Status** — current progress and what's next in [PROGRESS.md](PROGRESS.md).
- **Roadmap** — planned releases and future features in [ROADMAP.md](ROADMAP.md).
- **Vocabulary** — use the exact terms in [CONTEXT.md](CONTEXT.md).
- **Decisions** — recorded in [docs/adr/](docs/adr/).

**Keep [PROGRESS.md](PROGRESS.md) current at every step.** Update it as work lands
_and_ the moment a new task is added to the plan — never let it drift from reality.
It is the handoff doc between sessions; a stale one misleads the next instance.

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
