# PL-EMAIL-005 — Campaign certificate and LinkedIn delivery

- Captured: 2026-08-01
- State: `PARKED`
- Depends on: `PL-EMAIL-001`, `PL-EMAIL-006`; durable account identity from
  `PL-EMAIL-002` for direct delivery

## Objective

Deliver a completed campaign's verifiable simulation certificate and make its
LinkedIn profile workflow frictionless without misrepresenting Delenda Quest as
a licensing, academic, military, or identity authority.

## Preserved decisions

- Credential name: `Delenda Quest Campaign Command Simulation: <outcome>`.
- Issuer: `DELENDA.QUEST`.
- Credential ID: existing `DQ-<public-slug>`.
- Public URL: `https://delenda.quest/record/<public-slug>`.
- The public record publishes a versioned canonical payload and SHA-256 digest;
  the hash proves record integrity, not player identity.
- The product must call it a campaign-command simulation certificate, not a
  license, accreditation, military qualification, professional certification,
  or academic credit.
- Sharing is user-initiated. Delenda Quest does not pre-check sharing or post to
  LinkedIn on the player's behalf.

## Current foundation

- Public campaign records, credential payload, digest endpoint, and certificate
  rendering are implemented.
- The completion flow can expose copyable LinkedIn fields and social text.
- No certificate-notice email or LinkedIn issuer configuration is activated by
  this epoch.

## Internal implementation plan

1. Add a versioned campaign-record email template containing the result,
   credential ID, public verification URL, digest summary, disclosure language,
   and direct return to the completion page.
2. Trigger one idempotent delivery intent only after the immutable terminal
   campaign record exists.
3. Add account-level opt-in/disable controls and a resend action that cannot
   mint a second credential.
4. Keep recipient address out of the public record and credential payload.
5. Build copy actions for exact LinkedIn fields and social post; any Add to
   Profile integration must preserve the same issuer name and disclosures.
6. Add revocation/tombstone notice behavior if a record is later revoked or
   deleted under an approved policy.

## External configuration required

- Authenticated outbound provider from `PL-EMAIL-001`.
- Creation and verification of the official `DELENDA.QUEST` LinkedIn Page.
- Revalidation of LinkedIn's current Add to Profile/provider mechanism and any
  issuer enrollment requirements before implementation.
- Approval of exact issuer naming, logo, and certificate disclosure copy.

## Acceptance gates

- Email payload, public page, API payload, credential ID, and digest all refer
  to the same immutable campaign record.
- Repeated close events or provider retries send at most one initial notice.
- No private email, internal account ID, private seed, or hidden state appears
  in public or LinkedIn-facing material.
- All authored surfaces avoid licensure/accreditation claims.
- A revoked credential retains a stable, non-deceptive tombstone at the same
  URL.
- Disabling certificate mail does not suppress authentication or essential
  security mail.

## Activation and rollback

Certificate email can activate independently after outbound foundation and
suppression controls pass. LinkedIn issuer setup is a separate external
activation. Rollback disables notices and profile affordances without removing
or changing immutable public campaign records.

## Done when

Completed campaigns produce one consistent verifiable record, opted-in players
receive it, and the LinkedIn workflow uses accurate issuer and simulation
language verified against the live platform.

## History

- 2026-08-01: Existing credential foundation and deferred delivery/LinkedIn
  activation consolidated; no LinkedIn or mail account changed.
