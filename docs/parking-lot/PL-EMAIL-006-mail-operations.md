# PL-EMAIL-006 — Deliverability, consent, and mail operations

- Captured: 2026-08-01
- State: `PARKED`
- Depends on: begins with `PL-EMAIL-001`; gates every production send

## Objective

Make every Delenda Quest mail flow observable, consent-aware, suppressible,
private, and safely reversible before volume or functionality expands.

## Preserved decisions

- Bounces and complaints enter a suppression table before retry.
- Authentication/security mail, requested transactional mail, invitations,
  gameplay subscriptions, and campaign marketing are distinct classes with
  distinct consent and disable behavior.
- Daily briefs, resolution dispatches, and certificate notices are opt-in and
  offer a one-click disable path.
- Email addresses, message content, raw tokens, and provider secrets are not
  campaign telemetry.
- No arbitrary third-party `From` spoofing. Use an authenticated Delenda Quest
  sender and standards-compliant `Reply-To` where needed.

## Internal implementation plan

1. Extend `email_delivery_ledger` with message class, template version,
   idempotency key, provider ID, bounded status history, attempts, and redacted
   failure class.
2. Implement `email_suppressions` with scope, source, created time, reversible
   preference entries, and non-reversible hard-bounce/complaint controls where
   appropriate.
3. Verify signed delivery events and make every webhook replay-safe.
4. Add separate account preferences for invitations, daily briefs, resolution
   dispatches, and campaign-record notices; essential account-security mail is
   explained separately.
5. Add rate limits and abuse controls by account, address hash, campaign,
   template, and remote-risk class.
6. Add an internal `email doctor`/health view exposing aggregate queue and
   deliverability state without raw addresses or message bodies.
7. Define retention and deletion behavior for inbound raw messages, normalized
   commands, delivery events, and audit receipts.
8. Add provider kill switch, per-message-class kill switches, queue pause, and
   safe replay tooling.

## External configuration required

- SPF, DKIM, DMARC, bounce, complaint, and inbound webhook configuration for the
  chosen provider and subdomains.
- Operational provider access for delivery investigation without copying
  secrets or raw user data into the repository.
- Public privacy, consent, unsubscribe, abuse, and contact disclosures.
- A named monitored destination for abuse and delivery reports.

## Acceptance gates

- Hard bounce and complaint suppress non-essential future delivery before
  another attempt.
- Unsubscribe is authenticated or opaque, one-click, idempotent, and scoped to
  the intended message class.
- Security mail cannot be disabled by a marketing unsubscribe, and marketing or
  gameplay consent cannot be inferred from account creation.
- Webhook forgery and replay tests pass.
- Logs, telemetry, admin views, and error reports contain no raw token or message
  body and minimize address exposure.
- Kill switches stop transport without affecting game state.
- Queue depth, latency, bounce, complaint, suppression, and provider-error rates
  are visible as aggregates.

## Activation and rollback

The minimum suppression, consent, webhook, and kill-switch subset must activate
with `PL-EMAIL-001`, before the first non-sandbox message. Additional controls
expand before invitations, proactive subscriptions, or email play. Rollback
pauses transport and inbound processing while preserving replay-safe ledger
state for diagnosis.

## Done when

Every active email class has explicit consent semantics, verified delivery
events, suppression enforcement, privacy-safe observability, and a tested kill
switch.

## History

- 2026-08-01: Cross-cutting mail operations captured as an independent gating
  epoch; no provider or DNS configuration changed.
