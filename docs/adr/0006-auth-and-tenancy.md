# 6. Authentication and tenancy: Supabase Auth, Membership join table, RLS

Date: 2026-09-10

## Status

Accepted

## Context

Data was a single shared pool reached through the secret key, which bypasses RLS —
so every user would see every household's data. We need real logins and
per-household isolation, built to transfer to a production app.

## Decision

- Users authenticate with **Supabase Auth**, email + password to start.
- A `households` table is the tenant; a `memberships` join table links Users to
  Households (many-to-many), even though each user has one membership for now.
- Every data table carries a `household_id`. **Postgres RLS** enforces access via
  an `is_member(household_id)` check keyed on `auth.uid()` — the database refuses
  cross-household rows even if an app query forgets to filter.
- Per-user requests use a **user-scoped client** (the user's JWT from cookies);
  the **secret key** is reserved for server-only admin/system work.
- Membership is **admin-managed** for now (no self-serve join); an invite flow is
  a later feature.

## Consequences

- Isolation is enforced by the database, not just app filters.
- Multi-household per user is nearly free later (add a membership row) but will
  need an "active household" switcher in the UI.
- The JWT must move between browser and the Next.js server via cookies
  (`@supabase/ssr`); the client switch is the **last** migration step, to avoid
  locking ourselves out (RLS on + no session = no rows).
