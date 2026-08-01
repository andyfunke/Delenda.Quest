# Delenda Quest Parking Lot

The Parking Lot is the permanent, repository-backed registry for future Delenda
Quest plans. A parked epoch records enough product, architecture, dependency,
security, test, activation, and rollback detail for a later agent to retrieve
the plan without reconstructing it from chat.

This file is the master index. The epoch files below are the authoritative plan
records. `docs/email/architecture.md` remains the Email Nexus technical
overview; the Parking Lot records how and when the deferred work may proceed.

## Retrieval contract

Before proposing or executing deferred work, agents must:

1. Read this index.
2. Read every epoch whose dependency or scope overlaps the request.
3. Inspect current code and production state; a parked plan may have become
   stale or partially implemented.
4. State the exact epoch being activated and its current boundary before making
   changes.
5. Append a dated amendment instead of silently rewriting a prior decision.

Chat memory is a pointer to this registry, not a substitute for it.

## Safety and authority

- `PARKED` means documented, not authorized.
- No parked epoch authorizes creating an external account, accepting provider
  terms, changing DNS, creating OAuth applications, adding production secrets,
  sending mail, importing contacts, or deploying code.
- External configuration begins only after an explicit activation request for
  the named epoch.
- Secrets never enter Git or epoch documents.
- Every modality remains a thin adapter over the canonical account, campaign,
  Ava Nexus, and order authority. Email may not become a second game engine.
- Provider facts and pricing must be revalidated from primary sources when an
  epoch is activated.

## Lifecycle

| State | Meaning |
|---|---|
| `PARKED` | Durable plan only; external and production actions prohibited. |
| `READY` | Dependencies and current architecture have been revalidated. |
| `AUTHORIZED` | The user explicitly approved the named activation scope. |
| `IMPLEMENTING` | Internal code/configuration work is in progress. |
| `SANDBOXED` | Provider sandbox and non-production acceptance passed. |
| `ACTIVE` | Production activation and live acceptance passed. |
| `SUPERSEDED` | A later appended epoch or amendment replaces the plan. |

State changes are appended to the epoch's history. Existing history is never
deleted.

## Parked epochs

| ID | Plan | State | External dependency |
|---|---|---|---|
| `PL-EMAIL-001` | [Mail foundation and provider activation](./PL-EMAIL-001-mail-foundation.md) | `PARKED` | Mail-provider account, domain verification, DNS, webhook secrets |
| `PL-EMAIL-002` | [Account email identity and Google sign-in](./PL-EMAIL-002-account-identity.md) | `PARKED` | Outbound auth mail; Google OAuth/OIDC application if enabled |
| `PL-EMAIL-003` | [Reciprocal friend invitation delivery](./PL-EMAIL-003-friend-invitations.md) | `PARKED` | Outbound provider, authenticated sending domain |
| `PL-EMAIL-004` | [Play Delenda Quest by email](./PL-EMAIL-004-play-by-email.md) | `PARKED` | Inbound routing, signed webhooks, outbound reply service |
| `PL-EMAIL-005` | [Campaign certificate and LinkedIn delivery](./PL-EMAIL-005-certification-delivery.md) | `PARKED` | Outbound provider; DELENDA.QUEST LinkedIn Page/provider setup |
| `PL-EMAIL-006` | [Deliverability, consent, and mail operations](./PL-EMAIL-006-mail-operations.md) | `PARKED` | Bounce/complaint webhooks, DNS policy, provider operational access |

## Dependency order

```text
PL-EMAIL-001 mail foundation
  -> PL-EMAIL-002 account identity
  -> PL-EMAIL-003 friend invitations
  -> PL-EMAIL-005 certificate delivery
  -> PL-EMAIL-004 play by email

PL-EMAIL-006 mail operations begins with PL-EMAIL-001 and gates every send.
```

Account identity precedes consequential email play because inbound commands
must bind to a verified account address. Friend invitations and certificate
notices can follow outbound foundation sooner, but neither may bypass the
delivery ledger, suppression rules, or consent controls.

## New epoch template

Every future parked plan uses a new file and adds one index row. It must contain:

- immutable epoch ID, capture date, state, and dependencies;
- objective and user value;
- preserved decisions and explicit non-goals;
- current implementation evidence;
- internal implementation plan;
- external configuration required;
- authority and security boundaries;
- acceptance tests, activation sequence, rollback, and completion condition;
- append-only history.

Do not recycle an ID. Do not mark an epoch `ACTIVE` based only on source tests.

## History

- 2026-08-01: Parking Lot established. All known email work requiring external
  account integration or configuration was separated into `PL-EMAIL-001`
  through `PL-EMAIL-006`. No external or production action was authorized.
