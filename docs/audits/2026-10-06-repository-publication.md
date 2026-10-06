# Repository publication review — 2026-10-06

## Scope and result

- Reviewed the tracked tree and local Git objects reachable from `dev`,
  `master`, and the local remote-tracking refs. The history scan searched for
  common private-key, token, connection-string, and secret-assignment patterns;
  it is a heuristic review, not proof that every historical blob is harmless.
- No production credential was identified. The CI workflow contains a loopback
  Postgres URL for its local test database. The seed contains a fixed password
  for fictional local and CI Users.
- Both remote staging Users' passwords were rotated on 2026-10-06. The fixed
  seed password no longer authenticates them. Rotate again after any staging
  reset or reseed. The replacement credential is stored in an ignored local
  environment file and is not part of the publication set.
- Production and staging Auth sign-up were disabled. The sign-up action and UI
  were removed in the current `dev` working tree; production UI deployment is
  still pending. Existing production Members retain sign-in.
- Git history includes the commit author address
  `ethanwells9798@gmail.com` and an older `CLAUDE.md` with Ethan's personal
  background. Editing the current file does not erase historical commits.
  Publication should proceed only if Ethan accepts that exposure or explicitly
  authorizes a history rewrite and force update of affected branches.
- No `LICENSE` is present. Public visibility permits reading the repository but
  does not grant a general reuse license. This is appropriate for inspection;
  Ethan can add a license later if he wants reuse.

## Publication set

The intended changes are the sign-up lock, current README and guide, release
plan updates, this audit, and fictional screenshots. Local production schema
snapshots, reminder scaffolding, scale-test drafts, and `.claude/` are excluded.

## Before changing visibility

Review the exact publication diff, complete application checks, get Ethan's explicit
Git action authorization, and update the GitHub repository visibility only after
Ethan accepts the historical exposure above. The repository was private when
this review was written.
