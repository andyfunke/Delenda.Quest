# PL-EMAIL-003 — Reciprocal friend invitation delivery

- Captured: 2026-08-01
- State: `PARKED`
- Depends on: `PL-EMAIL-001`; verified account identity from `PL-EMAIL-002` is
  preferred before production activation

## Objective

Replace the current `mailto:` handoff with reliable invitation delivery while
preserving private, reciprocal friendships and the existing social multiplier
rules.

## Preserved decisions

- Friendships are two-way. Accepting an invitation creates one reciprocal
  relationship rather than two unrelated follows.
- Email addresses are used only to resolve and deliver the invitation. Players
  see aliases, not one another's addresses.
- `ALLOW FRIENDS` controls whether invitations can be accepted and social
  features can operate.
- The existing friend graph and `friend_invites` data are foundation, not
  permission for bulk or unsolicited mail.

## Current foundation

- The account UI accepts an invitee address.
- The server creates invitation data and returns subject/body content.
- The browser currently opens the commander's mail client with `mailto:`.
- Pending registrations and reciprocal friend behavior already have product
  representation.

## Internal implementation plan

1. Route invitation intent through Email Nexus and the common delivery outbox.
2. Mint a random, one-use invitation capability stored only as a digest with
   inviter, normalized invitee address hash, expiry, and idempotency key.
3. Send a concise invitation naming the inviter's player alias, the product,
   expiry, privacy behavior, and a safe HTTPS acceptance URL.
4. For existing accounts, require authenticated acceptance and verify the
   invitee identity. For new players, preserve the invitation through account
   creation without exposing the address to the inviter.
5. Create the reciprocal edge transactionally and make repeated acceptance
   return the existing result.
6. Add resend cooldowns, per-account/day limits, abuse reporting, cancellation,
   and pending-invite expiry.
7. Retain `mailto:` as a recoverable fallback until automated delivery is
   proven, without double-creating invitations.

## External configuration required

- Authenticated outbound provider and sending domain from `PL-EMAIL-001`.
- Approved invitation sender and reply behavior.
- Provider delivery-event webhook feeding the suppression ledger.

## Acceptance gates

- No address appears in another player's UI, public output, telemetry, or admin
  campaign views.
- Duplicate submissions and provider retries deliver at most one live invite
  per idempotency key.
- Wrong-account, expired, cancelled, and already-used links fail safely.
- `ALLOW FRIENDS` is honored at send and acceptance time.
- Removing either friend removes the reciprocal relationship for both.
- Bounces suppress repeated invitations to an undeliverable address.

## Activation and rollback

Activate for controlled accounts, then a limited cohort. Rollback disables
automated send and returns to the existing `mailto:` handoff; already-created
friendships and pending invitation records remain valid under their original
rules.

## Done when

A verified commander can send, the intended recipient can accept, and exactly
one private reciprocal friendship results, with delivery, abuse, expiry, and
suppression behavior proven live.

## History

- 2026-08-01: Existing manual invitation path and automated delivery plan
  consolidated; no message sent.
