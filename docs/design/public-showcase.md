# Public project showcase

**Status:** Priority one, 2026-10-06. Implementation and publication are separate
steps; repository visibility has not changed. Production-data backup follows
publication.

## Goal

Let a potential employer or engineer see what Hearth does and how it is built,
without giving visitors an account or maintaining a public User base.

## Visitor flow

1. Open the public repository and read the current feature summary and
   architecture overview.
2. View screenshots of deployed features using fictional Household data. A
   short recorded walkthrough can be added after publication.
3. Follow setup instructions if they want to run the project themselves.

## Boundaries

- Production remains usable only by Ethan and his wife. New production and
  staging Auth sign-ups are disabled at Supabase, local Auth configuration also
  disables sign-up, and the app has no sign-up action or button.
- A public repository and walkthrough do not grant access to the deployed app.
- Screenshots and any later recording use fictional data, never production
  Household records, private URLs, credentials, or personal notifications.
- No live dummy guest account, public demo database, or visitor data reset is
  required for this scope. Revisit a live Demo if feedback justifies it.
- Repository publication requires a review of tracked files and Git history for
  secrets and personal data. The staging seed contains a fixed local test
  password; the remote staging Users' passwords were rotated on 2026-10-06.
  Rotate them again after any staging reseed. Commit author email is present in
  history; decide whether
  its public exposure is acceptable. A public repo without a license is a valid
  choice if the goal is inspection rather than reuse.

## Acceptance criteria

- The README accurately describes current features, architecture, local setup,
  and the distinction between a public project and the private deployment.
- Screenshots demonstrate currently deployed features with fictional data.
- A visitor cannot create a lasting account on the production Supabase project;
  existing Members can still sign in.
- The repository is reviewed before its visibility is changed.
