# Invite Codes and membership changes use narrow database functions

Date: 2026-09-14

## Status

Accepted

## Context

Joining and removal cross the Household tenancy boundary. Authorization, attempt
limits, and related changes must not depend on a particular screen behaving correctly.

## Decision

Hearth will create Household Invite Codes from eight readable random characters,
excluding ambiguous characters. Joining is handled by one authenticated database
function that caps each User at five attempts per fifteen minutes. Invite Code
rotation and Member removal are separate owner-only database functions; removing a
Member and rotating the code occur in the same transaction. Direct Household updates
remain unavailable through the client API. This keeps authorization and multi-step
changes atomic at the tenancy boundary instead of relying on screen logic.

Members share an Invitation Link containing the current Invite Code. A public,
server-rendered invitation screen resolves only the matching Household name and ID
through the server-only client. Opening the link stores the code for seven days in
an HTTP-only, same-site cookie so the invitation survives sign-in and User Profile
setup. Joining remains an explicit action and still goes through the authenticated,
rate-limited database function.

## Consequences

- Every Member may copy and share an Invitation Link; the readable Invite Code
  remains visible as a backup.
- Rotating an Invite Code immediately invalidates Invitation Links containing the
  previous code.
- No invitation table or additional database migration is required for this flow.
- Only an owner may rotate the code or remove another non-owner Member.
- Removing a Member also rotates the Invite Code in the same transaction.
- v0.4.0 adds separate transactional functions for ownership transfer and
  voluntary leaving. Leaving rotates the Invite Code; transfer does not.
