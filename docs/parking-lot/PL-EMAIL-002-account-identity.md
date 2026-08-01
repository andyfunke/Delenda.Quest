# PL-EMAIL-002 — Account email identity and Google sign-in

- Captured: 2026-08-01
- State: `PARKED`
- Depends on: `PL-EMAIL-001`

## Objective

Let a guest commander bind the existing campaign and Service Record to a
durable private account through verified email, with Google sign-in available
as an identity adapter rather than a new source of campaign authority.

## Preserved decisions and unresolved choice

- The Account experience is intended to include an email address, account
  access controls, Google-backed sign-in, friends, and invitations.
- The current architecture specifies 15-minute, one-use email magic links with
  neutral responses that do not reveal whether an account exists.
- An earlier product requirement also named a password field. That requirement
  is not silently discarded: activation must either implement a properly
  reviewed password credential path or append an explicit decision that magic
  link plus Google supersedes passwords. No placeholder password storage is
  permitted.
- Public records, telemetry, administration, and friend lists never expose the
  account email.
- Guest campaigns must migrate without loss, duplication, or a change in their
  canonical state.
- Google identity proves control of a Google account; it does not own or
  reimplement the Delenda Quest account, campaign, or session model.

## Current foundation

- Production uses opaque private browser sessions and guest identities.
- `app/email/nexus.ts` defines sign-in request, redemption, and email-change
  operations.
- The account UI displays the current private address but has no provider-backed
  email authentication or Google OIDC flow.

## Internal implementation plan

1. Introduce an internal account ID independent of email address and provider.
2. Add `account_email_identities` and `email_auth_challenges` with hashed tokens,
   expiry, use state, attempts, idempotency, and allowlisted redirects.
3. Implement neutral sign-in request responses, rate limits by remote-risk hash
   and address hash, one-use transactional redemption, and session rotation.
4. Migrate the guest identity, active campaign, records, friendships, SSH keys,
   and settings to the durable account in one replay-safe operation.
5. Add Google OIDC as a verified identity link to the same internal account.
6. Define account-link and collision behavior when email magic link and Google
   report the same address, including reauthentication before merges.
7. Implement email change with confirmation at the old and new addresses when
   the old address remains deliverable.
8. Resolve the password requirement before schema or UI work for passwords.

## External configuration required

- Working authenticated outbound mail from `PL-EMAIL-001`.
- If Google sign-in is activated: a Google Cloud project, OAuth consent-screen
  configuration, OAuth client, exact production and non-production redirect
  URIs, authorized origins, and production secrets.
- Public privacy and account-deletion disclosures appropriate to the chosen
  identity scopes.

## Security boundaries

- Store only token digests; raw magic-link tokens appear only in HTTPS links.
- Never log tokens, OAuth authorization codes, ID tokens, or account addresses.
- Use state, nonce, PKCE where applicable, exact redirects, and issuer/audience
  validation for Google OIDC.
- Never auto-link accounts solely from an unverified address claim.
- Account recovery cannot mutate campaign state or spend an order.

## Acceptance gates

- Enumeration, replay, expiry, open-redirect, fixation, CSRF, and rate-limit
  tests pass.
- Guest-to-account migration preserves the exact campaign revision and every
  durable account attachment.
- Repeating a callback or redemption is harmless.
- Google and magic-link entry converge on one internal account when explicitly
  linked and cannot be forced to merge by an attacker.
- Email-change failure leaves the old identity usable.
- Account deletion/revocation behavior is documented and tested.

## Activation and rollback

Activate magic-link auth on a non-production hostname first. Google is a
separate sub-activation because it requires its own external consent and
credentials. Rollback disables new entry points while preserving existing
opaque sessions and account ownership; it never converts durable accounts back
to anonymous state.

## Done when

A guest can deliberately bind, leave, and recover the same account and campaign
through the approved identity methods, with live delivery and security tests
passing. The password requirement must be implemented or explicitly superseded
by an appended product decision.

## History

- 2026-08-01: Magic-link and Google identity plan consolidated; earlier password
  requirement retained as an explicit unresolved decision.
