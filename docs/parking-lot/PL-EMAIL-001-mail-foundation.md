# PL-EMAIL-001 — Mail foundation and provider activation

- Captured: 2026-08-01
- State: `PARKED`
- Depends on: none
- Gates: every other email epoch

## Objective

Create one authenticated, observable transport foundation for Delenda Quest
authentication, invitations, game correspondence, and campaign-record notices
without coupling Email Nexus to one vendor.

## Preserved decisions

- `app/email/nexus.ts` is the sole product authority for email operations.
- A provider adapter transports typed Email Nexus decisions. It may not invent
  identity, campaign state, commands, confirmations, or delivery policy.
- Initial provider decision captured on 2026-08-01: evaluate Resend Free first
  for the zero-dollar launch; retain Cloudflare Email Service as the likely
  consolidation target once Workers Paid is already justified; Amazon SES is a
  later scale option, not the simple launch option.
- Use a standards-compliant verified `From` address. A player's address may be
  used as `Reply-To` when appropriate, never spoofed as `From`.
- Authenticate dedicated mail subdomains. The existing plan reserves
  `auth.delenda.quest` for account mail and `play.delenda.quest` for game mail.
- Provider pricing, features, and limits are historical planning inputs and
  must be rechecked from official sources at activation.

## Current foundation

- Email Nexus contract and validation tests exist.
- No provider adapter, provider account, DNS record, production secret,
  delivery mutation endpoint, or outbound send has been authorized by this
  epoch.
- The Account experience currently uses `mailto:` for friend invitations.

## Internal implementation plan

1. Define a provider-neutral adapter interface for send, inbound-event
   verification, delivery events, and stable provider message IDs.
2. Add an outbox backed by `email_delivery_ledger`; business transactions write
   intent, and a retryable worker performs transport.
3. Add idempotency, bounded retry with jitter, terminal failure classification,
   template versioning, and correlation IDs.
4. Create separate typed templates for authentication, invitation, command
   response, confirmation, daily brief, and campaign record.
5. Add a fake provider for deterministic tests and a sandbox adapter for the
   chosen vendor.
6. Ensure logs redact addresses, tokens, message bodies, and provider secrets.

## External configuration required

- Create or select the mail-provider account.
- Verify ownership of the sending domain/subdomains.
- Publish the provider-required SPF and DKIM records and an intentional DMARC
  policy; resolve conflicts with existing records before any change.
- Create provider API/webhook credentials in the production secret store.
- Register signed delivery-event webhooks and, where supported, inbound routes.
- Approve the visible sender names and reply mailboxes.

These are activation actions, not instructions granted by this parked plan.

## Acceptance gates

- Official provider capabilities, limits, and pricing revalidated.
- DNS authentication passes from at least two independent inspectors.
- Sandbox sends pass to controlled addresses without exposing secrets.
- Duplicate send requests produce one provider delivery attempt.
- Bounce and complaint events suppress future non-essential mail.
- Provider outage leaves durable queued intent and does not block gameplay.
- Removing provider credentials disables transport without damaging accounts or
  campaign state.

## Activation and rollback

Activate first in provider sandbox and a non-production hostname. Production
activation must be a separate explicit approval after sandbox evidence.
Rollback disables the adapter and webhook routes, preserves the delivery
ledger, and returns the UI to safe non-email behavior such as the existing
manual invitation handoff where appropriate.

## Done when

The provider-neutral foundation is production-active, DNS-authenticated,
observable, suppressible, and proven by live controlled delivery. Completion
does not imply that account auth, invitations, email play, or certificates are
enabled.

## History

- 2026-08-01: Initial plan captured; no external configuration performed.
