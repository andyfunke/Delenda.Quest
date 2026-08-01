# Verifiable LinkedIn campaign certificate

The credential must describe what Delenda Quest actually verifies: completion of a scored command simulation. It must never claim government licensure, military qualification, academic credit, professional accreditation, or identity verification.

## LinkedIn fields

- Name: `Delenda Quest Campaign Command Simulation: <outcome>`
- Issuing organization: `DELENDA.QUEST`
- Issue date: the immutable campaign completion month and year
- Expiration: none
- Credential ID: the existing `DQ-<public-slug>` identifier
- Credential URL: `https://delenda.quest/record/<public-slug>`

LinkedIn exposes a Licenses & Certifications profile section and supports an Add to Profile flow for certification providers that have a LinkedIn Page. The flow does not make Delenda Quest an accredited licensing authority. Create the DELENDA.QUEST LinkedIn Page, use the exact issuer name everywhere, and label the artifact as a simulation certificate.

Official references:

- LinkedIn Add to Profile provider guidance: https://www.linkedin.com/help/linkedin/topic/a161003
- LinkedIn profile sections: https://www.linkedin.com/help/linkedin/answer/a540837

## Verification record

The public record page should publish a versioned canonical payload containing:

- schema version
- credential ID and public slug
- campaign ID
- outcome and theater
- resolved-day count
- score and scoring-model version
- completion timestamp
- issuer name

Compute `SHA-256(canonical JSON payload)` and display it as the credential digest. The verification endpoint returns the exact payload and digest. The page must remain publicly readable, must not expose the player email, and must say that the hash proves record integrity rather than personal identity.

Implemented verification endpoint: `GET /api/campaign-records/<public-slug>/credential`. It returns `{ payload, digest }`, where `digest` is lower-case hexadecimal SHA-256 over the exact `JSON.stringify(payload)` byte sequence. The public certificate renders the same digest and its scoring-model version.

The certificate is issued only after the server has accepted the terminal campaign state and created its immutable campaign record. Revocation, if later required for abuse or data deletion, should leave a tombstone at the same URL with the credential ID, digest, revocation time, and reason class.

## Viral loop

The completion page offers:

1. Copy LinkedIn fields.
2. Open LinkedIn Add to Profile.
3. Copy a social post containing the campaign outcome, public credential URL, and browser, SSH, and CLI availability.
4. Verify the credential digest on the public record page.

Do not pre-check network sharing, post on the player’s behalf, or call it a license in Delenda-authored copy.
