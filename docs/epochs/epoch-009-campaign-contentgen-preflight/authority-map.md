# Epoch 009 — governing authority map (frozen)

Source: `updated_epoch.md` Part 3, recorded at Epoch 009 for later preflight
re-verification. Permitted/forbidden extensions are binding for epochs
010–027 unless a later human-signed ratification receipt amends them.

| Concern | Authority | Permitted extension | Forbidden extension |
|---|---|---|---|
| Campaign state and outcomes | `app/game.ts`, circuits, canonical Nexus action route | typed metastratum state and declared mechanics | client-owned calculation or prose-owned outcome |
| Day-resolution authorization | `db/turns.ts`, persisted resolution grants, Nexus `resolve-day` | semantic resolution output persisted in the same transition | second resolver or post-hoc reroll |
| Campaign selection | shared gate calculus and persisted dockets | deterministic main-thread scheduler | client reroll or hidden catalog disclosure |
| Existing campaign prose | current authored libraries (see immutability manifest) | read-only import by stable ID | interpolation into or mutation of existing files |
| Ava intent | Ava compiler and Nexus | read-only projection of new semantic objects | learned intent, learned commands, or quality-driven execution |
| Chord grammar | versioned shared metagrammar plus medium projections | shared evidence and medium-specific constraints | treating one medium's style as another medium's semantics |
| Content quality | deterministic gates, authenticated labels, promoted policy | ranking, sampling, proposed rules | game law, hidden truth, or automatic publication |
| Human review workflow | admin-authenticated Contentgen service | append-only adjudication and reduction lineage | anonymous promotion or client-only mutation |
| Optional AI judge | constrained offline evidence adapter | priority and checklist evidence | hard-gate override, rewriting, or promotion |
| Runtime content | Git-versioned promoted manifests | verified lookup and deterministic composition | direct use of unreviewed D1 rows or model output |
| Presentation | Briefing, Ava, terminal, SSH adapters | render canonical semantic objects | duplicate mechanics or inferred hidden state |

## Day-turnover note (from NODE-03)

Authoritative path remains claim/redeem via `app/api/turn/route.ts` and
`db/turns.ts`. Automatic client-driven redemption uses that same path; no
second resolver exists.
