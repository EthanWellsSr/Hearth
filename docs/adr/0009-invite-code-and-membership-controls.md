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

## Consequences

- Every Member may view, copy, and share the current Invite Code.
- Only an owner may rotate the code or remove another non-owner Member.
- Removing a Member also rotates the Invite Code in the same transaction.
- Voluntary leaving and ownership transfer remain deferred to v0.4.0.
