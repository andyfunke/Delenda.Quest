# DELENDA.QUEST telemetry specification

DELENDA.QUEST uses a first-party telemetry endpoint and its existing D1 database. It does not load PostHog, Google Analytics, a tracking pixel, an advertising SDK, or a third-party analytics script.

## Captured events

### Site telemetry

- Aggregate views by game module.
- Aggregate views by field-manual/wiki article, including applette views.
- Aggregate clicks by stable interface element and current module.

### Ava telemetry

- Canonical intent or uncompiled status.
- Executed, clarification, or rejected outcome.
- Failure class and parser rule.
- Current game module.
- Token-count and unresolved-token-count bands.
- No raw player prompt.

### Campaign outcome telemetry

- Victory or defeat.
- Day reached.
- Theater, opening archetype, and adversary system.
- Cumulative counts of issued directives and maneuvers, resolved targets of opportunity, and internalized doctrine.
- A one-way hash of the non-personal campaign identifier prevents duplicate terminal submissions.

This final record directly supports win/loss analysis against cumulative decisions without joining the campaign to an account, email address, friend graph, IP address, or cross-site identifier.

## Explicit exclusions

- No cookies or browser fingerprint.
- No persistent analytics session ID.
- No account identity in telemetry.
- No raw Ava transcript, form value, email address, campaign title, or imported campaign prose.
- No sale, advertising use, or cross-site sharing.

## Delivery and failure behavior

The browser batches small event packets and sends them to `/api/telemetry`. Hidden-page delivery may use `sendBeacon`; normal delivery uses first-party `fetch`. Telemetry failures are silent and never interrupt a command, a save, or campaign resolution. Server validation caps packet size, event count, string length, numeric range, and accepted event kinds.

The public Field Manual contains `Site Telemetry`, `Ava Telemetry`, and `Privacy` entries. This is an unobtrusive disclosure, not a consent banner. Legal requirements still depend on audience, jurisdiction, age targeting, and future changes to the data collected.
