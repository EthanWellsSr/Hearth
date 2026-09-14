# User Profiles are global; Memberships remain Household-specific

Date: 2026-09-14

## Status

Accepted

## Context

Hearth needs one recognizable name and face for a User wherever that User appears,
without making identity depend on a particular Household.

## Decision

Hearth will store each User's required display name and optional Avatar in one
User Profile keyed to their authentication identity, rather than duplicating that
identity on every Membership. Memberships continue to hold Household-specific
roles and remain the target of Chore assignments. This adds a join when Hearth
renders an Assignee, but prevents conflicting names and photos when multi-Household
support arrives. Avatar files live in private Supabase Storage while the database
stores only their paths.

## Consequences

- Hearth displays its logo when no Avatar exists.
- Removing a Membership preserves the global User Profile and Avatar.
- Chore assignment continues to use a Membership foreign key, preserving the
  Household boundary and allowing removal to make Chores Unassigned.
