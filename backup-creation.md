# Hearth production backup — implementation handoff

## Purpose and current state

Ethan requested this handoff so a different instance can implement the backup.
Continue Hearth work on `dev`; follow `AGENTS.md`. Read `docs/STATUS.md`,
`docs/ROADMAP.md`, and `docs/design/v0.4.4-production-backup.md` alongside this
file. Preserve existing working-tree changes. This file records the discussion
and implementation request, not evidence of an operational backup.

- Hearth uses Supabase-hosted PostgreSQL, Auth, and private Avatar Storage.
- v0.4.3 Production Foundations is released. Its migration baseline, later
  migrations, fictional seed, staging environment, and CI rebuild checks make
  the database structure reproducible. They do not preserve production records.
- Hearth's public repository is `EthanWellsSr/Hearth`. Never store production
  exports, database passwords, or private encryption keys in it.
- Ethan authorized creation of a separate private repository named
  `EthanWellsSr/Hearth-Backup` if available and setup of its GitHub Actions.
- The previous instance attempted repository creation with `gh repo create`.
  GitHub returned `Resource not accessible by integration (createRepository)`.
  The repository was not created by that attempt; availability was not proven.
- No production export, key generation, secret setup, or restore was performed.
  No backup workflow was published or enabled.

## Agreed approach

1. A scheduled GitHub Actions job in the separate private backup repository
   connects to production and exports the database with a PostgreSQL dump tool.
2. Encrypt the export with `age` using a public recipient key.
3. Store only the encrypted file as a private GitHub Actions artifact. Do not
   commit backup files into Git history. Artifacts have expiration and storage
   limits; repository privacy alone is not a retention policy.
4. Keep the private decryption key outside GitHub and outside agent access.
5. Prove recovery by restoring an export into an isolated non-production target.

A nightly export is the proposed initial frequency, not continuous recovery.
At that frequency, roughly a day of changes could be lost after a successful
run; delays or failures can increase that window. Encryption protects the copy
from disclosure and is separate from how frequently copies are made.

## Private key boundary — explicit user requirement

Ethan asked whether the agent can handle the private key without viewing it;
if not, set up the repository and Actions and stop. Do not ask him to paste the
private key into chat, upload it, or place it in this workspace.

- Use a long-lived `age` public/private key pair. The encryption tool uses fresh
  randomness for each export even though the recipient key remains the same.
- GitHub needs only the public recipient, normally beginning with `age1`.
- Ethan intends to keep the private key in a file on his own trusted computer,
  outside directories agents can access. An actual sandbox restriction matters;
  a path outside the project alone does not guarantee isolation.
- Recommend full-disk encryption, owner-only file permissions, and a second
  protected recovery copy, such as an encrypted USB stored safely.
- Key generation should be performed by Ethan outside the agent session. An
  agent may provide commands, but must not generate or inspect the real private
  key in its own accessible environment. A separate instance must preserve this
  boundary even if its tools technically permit reading that file.
- Keep old private keys for retained backups when rotating recipients.

Example commands for Ethan to run himself after installing `age` on a trusted
Mac/Linux computer (replace the path with his protected location):

```bash
umask 077
age-keygen -o /protected/location/hearth-backup.key
age-keygen -y /protected/location/hearth-backup.key
```

The second command prints only the public recipient. Share only that public
recipient for workflow configuration. Do not overwrite an existing key file.
Windows requires equivalent filesystem ACL protection and a suitable local path.

## Setup instructions for the implementing instance

1. Check repository availability and current GitHub permissions. Create
   `EthanWellsSr/Hearth-Backup` explicitly as **private**, or use it only after
   confirming ownership, purpose, and visibility. Verify privacy before adding
   production connection credentials. Do not change Hearth's visibility.
2. Add a backup workflow, export/encryption script, `.gitignore`, and README
   describing setup, coverage, failure handling, and restore instructions.
   Publish only these implementation files to the private backup repository.
3. Configure repository variable `AGE_RECIPIENT` with Ethan's public key only.
4. Configure the database connection through Actions secrets, not source:
   `PGHOST`, `PGPORT`, `PGUSER`, and `PGPASSWORD`; database name is `postgres`.
   Use production's Supabase Connect panel to identify the connection. Prefer
   the IPv4-capable session pooler on port 5432 for hosted runners; do not use
   transaction pooling for the dump. Never print credentials or connection URLs.
5. Verify current Supabase backup/restore guidance and the actual server version.
   The recorded project version is PostgreSQL 17; this is not a fresh live check.
   Choose a compatible dump client. Pin reviewed action versions and container
   image digests. Use encrypted database transport.
6. Assess whether a dedicated backup role can read all required app and Auth
   records. Do not silently fall back to a privileged production password;
   explain and resolve that choice with Ethan if necessary. Keep secret entry
   outside chat where possible.
7. Keep execution disabled until configuration is complete. A repository variable
   such as `BACKUP_ENABLED=true` can gate execution. Support manual dispatch as
   well as a daily schedule; publish the UTC schedule in the README.
8. Use least GitHub token permissions (`contents: read` for the export job), a
   timeout, and concurrency protection. Avoid shell tracing. Stream the export
   directly into encryption and fail the job if either part fails. Upload only
   nonempty ciphertext after success; remove partial files and runner copies.
   Never upload diagnostic files that might contain credentials or private data.
9. Measure encrypted export size and available artifact storage. The old design
   targets 30 days if affordable; the local draft uses 7 days provisionally.
   Neither value is a measured or finalized retention decision. Account for
   manual runs as well as scheduled runs and document expiry behavior.
10. Configure visible failure notifications and a way to notice missed successful
    backups. GitHub scheduled jobs can be delayed or missed. A failed-run alert
    alone does not detect a job that never started. Resolve alert destination and
    restore-test cadence with Ethan.
11. Respect the private-key boundary: if subsequent work needs the real private
    key in agent-accessible space, stop and give Ethan the local steps instead.
    Do not claim backups are operational until an export and restore are proven.

## Coverage and limitations to resolve

The local draft uses one consistent custom-format `pg_dump` covering `public`,
`auth`, and `supabase_migrations`, with owner and privilege restoration omitted.
Treat this as a draft approach to review, not a proven Supabase recovery recipe.
Confirm that it includes all necessary records and does not omit future custom
schemas. Do not run separate unrelated table exports that can capture conflicting
points in time.

The dump does not automatically preserve the whole Supabase project:

- Avatar image contents live in Storage and require a separate decision.
- Storage metadata, bucket policies, Cron jobs, database roles/grants, extensions,
  and project configuration require an explicit recovery inventory. Some are
  represented by Hearth's migrations; verify rather than assume completeness.
- External secrets and deployment settings must be recoverable separately.
- If Vault or other project-key-encrypted data is used, investigate recovery of
  its encryption dependencies separately. A dump does not itself supply those
  keys. Do not confuse them with the `age` backup decryption key.

Do not expand into application features, Auth changes, schema refactoring, or
production deployment as collateral work.

## Restore acceptance

Use an isolated disposable target, never production. Do not casually copy real
Household records into shared staging or a Preview-accessible database.

Ethan can download the encrypted artifact and decrypt it locally using the private
key. Inspect the resulting archive with `pg_restore --list`. Before restoring,
review Supabase-managed Auth schema ownership, existing platform objects,
privileges, and required migration/bootstrap steps; do not blindly overwrite a
live project's managed schemas with a generic restore command.

Record and verify:

- Expected Auth Users, User Profiles, Households, Memberships, and app records.
- Relationships, constraints, indexes, functions, RLS policies, and privileges.
- A working application sign-in and Household-scoped read/write flow against the
  isolated target, with no cross-Household access.
- Any excluded Storage content or operational configuration and its recovery path.
- The exact successful restore procedure, elapsed recovery time, backup size,
  retention, failure/missed-run monitoring, and the next restore-drill date.

## Existing local draft and validation

The previous instance left optional starter files at `/workspace/Hearth-Backup/`:
`.github/workflows/backup.yml`, `scripts/backup.sh`, `.gitignore`, and `README.md`.
Those files may not exist in another instance. They are not committed or published
and this handoff does not depend on them being available.

The draft schedules 08:23 UTC daily, gates runs with `BACKUP_ENABLED`, uses a
PostgreSQL 17 container and `age`, and uploads encrypted artifacts with provisional
7-day retention. Shell syntax was checked, and the missing-configuration check
was exercised. No database connection, encryption round trip, actual Actions run,
or restore was tested. The container image still needs digest pinning and the
workflow needs validation before publication.

At handoff, five earlier documentation edits remain uncommitted on Hearth's `dev`:
`CHANGELOG.md`, `docs/ROADMAP.md`, `docs/STATUS.md`,
`docs/design/public-showcase.md`, and `docs/design/v0.4.4-production-backup.md`.
Preserve them. Creating this handoff does not authorize committing or pushing
changes to Hearth; follow Ethan's explicit Git instructions.
