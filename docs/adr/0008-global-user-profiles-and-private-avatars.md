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
stores only their paths. The browser crops the selected image and sends a compact,
widely supported image format; the server validates the image contents and
normalizes the final file to a 512×512 WebP before storage. Final encoding does not
depend on browser-specific canvas WebP support.

## Consequences

- Hearth displays its logo when no Avatar exists.
- Removing a Membership preserves the global User Profile and Avatar.
- Chore assignment continues to use a Membership foreign key, preserving the
  Household boundary and allowing removal to make Chores Unassigned.
- Server-side normalization adds native image-processing work to the profile save
  action but keeps one stable Avatar format and storage path across browsers.
