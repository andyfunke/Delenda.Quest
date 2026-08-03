# NODE-03 — multi-projection normalization

Status: planned; depends on NODE-01

## Projections

```text
P0 = NFC + Unicode case-fold
P1 = P0 minus Unicode format/zero-width characters
P2 = confusable skeleton(P0)
P3 = collapse whitespace and punctuation(P0)
P4 = conservative leetspeak fold(P0), safety scan only
```

`P0` is semantic normalization. `P1–P4` are safety evidence projections.
No projection alters original text or command meaning. Ordinary chord matching
uses P0 only.

## Procedure

1. Preserve exact source text.
2. Generate projections in fixed order.
3. Record projection version and transformation evidence.
4. Scan every projection for forbidden and authority-risk patterns.
5. Add one adversarial fixture per transform and gate.

## Acceptance

- Homoglyph, zero-width, spacing, and limited-leetspeak fixtures are detected.
- Projection hits identify projection and original span where possible.
- Normalization is deterministic and versioned.
