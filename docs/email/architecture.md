# Email Nexus

All authentication, notification, certificate, and play-by-email traffic enters `app/email/nexus.ts`. Provider adapters may transport a typed decision, but may not invent identity, campaign, or order authority.

## Parking-lot status

External email activation is parked. The durable execution plans, dependencies,
security gates, and activation boundaries live in
[`docs/parking-lot/README.md`](../parking-lot/README.md), beginning with
`PL-EMAIL-001` through `PL-EMAIL-006`. This architecture document describes the
target system; it does not authorize provider accounts, DNS changes, OAuth
configuration, secrets, sends, inbound routes, or production activation.

The parked epochs additionally preserve Google-backed account sign-in,
reciprocal friend-invitation delivery, certificate delivery, and the unresolved
earlier password requirement. Provider facts below were captured on 2026-08-01
and must be revalidated from official sources when an epoch is activated.

## Provider decision

Start with Resend Free for outbound and inbound mail. It currently includes 3,000 messages per month, a 100-message daily ceiling, one domain, and receiving. This is the simplest zero-dollar launch topology. Keep the provider behind one adapter so it can be replaced without changing Email Nexus contracts.

Cloudflare Email Service becomes the preferred consolidation target when the account is already on Workers Paid. It keeps delivery and Email Routing next to the Worker, includes 3,000 outbound messages per month, then charges $0.35 per 1,000, and provides unlimited inbound routing. Arbitrary outbound recipients are unavailable on Workers Free. Verified-destination test sends remain free.

Amazon SES is cheapest by raw unit price at $0.10 per 1,000 outbound messages, but account setup, sandbox exit, IAM, reputation, inbound processing, and AWS operational surface make it a poor first provider. It is a scale option, not the simple option.

Official references:

- Cloudflare Email Service pricing: https://developers.cloudflare.com/email-service/platform/pricing/
- Cloudflare sending setup: https://developers.cloudflare.com/email-service/get-started/send-emails/
- Cloudflare deliverability: https://developers.cloudflare.com/email-service/concepts/deliverability/
- Resend pricing: https://resend.com/pricing
- Amazon SES pricing: https://aws.amazon.com/ses/pricing/

Before sending, configure SPF, DKIM, and DMARC for a dedicated mail subdomain. Use `auth.delenda.quest` for authentication mail and `play.delenda.quest` for game correspondence. Keep the visible From domain aligned with the signing domain. Process bounces and complaints into a suppression table before retrying.

## Passwordless account authentication

1. The player enters an email address. The browser receives the same neutral response whether the account exists or not.
2. Email Nexus normalizes the address, applies IP and address-hash rate limits, and creates 32 bytes of random token material.
3. D1 stores only a SHA-256 token digest, purpose, expiry, requested allowlisted redirect, attempt count, and an idempotency key. The raw token appears only in the HTTPS link.
4. The provider sends a 15-minute, one-use sign-in link. An optional six-digit display code may reference the same server record but never replaces the high-entropy token.
5. Redemption runs in a D1 transaction: compare the digest in constant time, reject expired or consumed records, mark it consumed, bind or create the account, migrate the guest campaign ownership, and rotate the signed session cookie.
6. Email change requires a fresh authenticated session plus confirmation at both old and new addresses when the old address is deliverable.

Never store raw magic-link tokens, log them, accept arbitrary redirect URLs, or disclose whether an address already owns an account.

Planned D1 tables:

- `account_email_identities`
- `email_auth_challenges`
- `email_delivery_ledger`
- `email_suppressions`
- `email_play_channels`
- `email_inbound_messages`
- `email_order_confirmations`

## Play by email

Each enabled campaign receives an opaque reply alias such as `play+q7N...@play.delenda.quest`. The alias is a routing capability, not an account identifier.

1. Email Routing or the provider webhook verifies the signed provider event and hands the raw message to the Email Nexus adapter.
2. The adapter accepts only the authenticated envelope sender already verified on the account, enforces the opaque alias, strips quoted history and signatures, prefers `text/plain`, and extracts exactly one bounded Ava command.
3. `Message-ID` plus campaign identity is the idempotency key. Duplicate delivery replays the prior receipt.
4. Read-only commands execute immediately through the canonical Ava Nexus and return a plain-text and Markdown response.
5. Consequential commands may prepare an order but never issue it from the original email. Ava replies with the exact proposed effect, expiry, and a one-use confirmation link or explicit confirmation code.
6. Confirmation redeems through Email Nexus, then invokes the same canonical order service used by web and SSH. Stale state, a changed day, a mismatched sender, or an expired token fails closed.
7. Resolution dispatches, daily briefs, and certificate notices are opt-in subscriptions with one-click disable controls.

Attachments are ignored on inbound command mail. Exported workbooks and campaign records may be linked from outbound mail rather than attached until deliverability and size limits are proven.

## Rollout gates

1. Provider sandbox, DNS authentication, bounce webhook, and suppression enforcement.
2. Magic-link auth on a non-production hostname with account enumeration and replay tests.
3. Guest-to-email account migration with campaign ownership preservation.
4. Read-only email play.
5. Prepared orders with explicit second-channel confirmation.
6. Opt-in daily brief and campaign-record delivery.
