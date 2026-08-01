# PL-EMAIL-004 — Play Delenda Quest by email

- Captured: 2026-08-01
- State: `PARKED`
- Depends on: `PL-EMAIL-001`, `PL-EMAIL-002`, `PL-EMAIL-006`

## Objective

Make email a thin Ava client: a verified commander can read briefs, inspect the
campaign, ask Ava questions, and prepare consequential orders without creating
a parallel simulation or allowing one ambiguous message to mutate state.

## Preserved decisions

- Each enabled campaign receives an opaque reply alias under
  `play.delenda.quest`. The alias is a routing capability, not an account ID.
- Only the verified account sender may use that campaign channel.
- Exactly one bounded Ava command is extracted from an inbound message.
- Read-only commands may execute immediately through the canonical Ava Nexus.
- Consequential mail may prepare an order but cannot issue it directly from the
  original message. Confirmation is a separate one-use, expiring action.
- Duplicate delivery replays the prior receipt using `Message-ID` plus campaign
  identity.
- Attachments are ignored for inbound commands. Large exports are linked rather
  than attached until limits and deliverability are proven.
- Email has no exclusive game advantage and cannot bypass daily order limits,
  sealed state, or the account's canonical campaign revision.

## Internal implementation plan

1. Add `email_play_channels`, `email_inbound_messages`, and
   `email_order_confirmations` with opaque identifiers and retention rules.
2. Build a provider adapter that verifies signed inbound events before passing
   normalized envelope and body data to Email Nexus.
3. Require exact recipient alias and verified envelope sender; reject forwarding
   ambiguity and provider-authentication failure.
4. Parse MIME safely, prefer `text/plain`, bound message size, strip signatures
   and quoted history conservatively, and reject zero or multiple commands.
5. Invoke the same Ava Nexus used by web and SSH with surface metadata `EMAIL`.
6. Return canonical plain-text plus Markdown-compatible output through the
   common outbox and delivery ledger.
7. For consequential intent, persist the exact prepared effect, campaign/day/
   revision seal, expiry, and one-use confirmation token. Confirmation invokes
   the canonical order service and fails closed on stale state.
8. Add opt-in daily brief, resolution dispatch, and campaign-record notices with
   independent subscription controls.

## External configuration required

- Inbound domain/routing and signed webhook from the selected provider or
  Cloudflare Email Routing.
- Authenticated outbound reply service.
- Provider secret material and route bindings in the production secret store.
- Operational addresses for abuse and delivery failures.

## Acceptance gates

- Forged sender, wrong alias, invalid webhook signature, oversized message,
  attachment-only message, multi-command body, and replay are rejected safely.
- Web, SSH, CLI, and email return the same canonical response and proof identity
  for the same sealed read-only command.
- Email cannot mutate state without a second explicit confirmation.
- Confirmation after day/revision change fails with a fresh explanatory brief.
- Provider retry produces one command receipt and at most one prepared order.
- Unsubscribe disables proactive mail without disabling account access.
- A provider outage cannot block web/SSH/CLI play.

## Activation and rollback

Roll out in four separately approved stages: controlled inbound echo; read-only
Ava commands; prepared consequential orders; proactive opt-in dispatches.
Rollback disables inbound ingestion and proactive subscriptions while retaining
the account, campaign, audit receipts, and other clients.

## Done when

The complete staged path is live, cross-surface parity is proven, and no email
can spend an order without canonical confirmation against current state.

## History

- 2026-08-01: Play-by-email plan captured from the Email Nexus architecture; no
  route, alias, webhook, or subscription activated.
