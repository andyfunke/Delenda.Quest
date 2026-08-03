# Ava relevance graph proposal

## Product claim

Ava should answer the player's words as well as their command. The effect must
come from a deterministic content compiler, not from pretending that a menu is
a mind. Each non-shell utterance may therefore strike a small semantic chord
(`uncertainty + loss`, `urgency + question`, `trust + report`) before the
authoritative command result is rendered. The selected aside is unbidden,
brief, and subordinate to the result.

## Compiled shape

```text
player surface
  -> existing command/compiler result (authority)
  -> bounded relevance atoms (realization only)
  -> candidate quote edges
  -> taste gates
  -> deterministic tie-break + voice cursor
  -> FIELD NOTE opening + unchanged canonical answer
```

The v1 graph deliberately uses only surface-language atoms. It cannot create a
mechanic, interpret an order, read hidden state, or claim an outcome. The
existing compiler remains the only owner of intent. A miss abstains and uses
the existing topic-aware Ava opening.

## Quote :: relevance graph

Each authored realization has a stable ID, one dominant chord, positive phrase
edges, optional negative edges, and one aphoristic line. Candidate weight is
the sum of exact normalized phrase edges; multiword edges outrank loose token
edges. Equal scores are resolved by a stable hash of normalized input,
realization ID, and the existing voice cursor. The cursor provides variation
without random authority.

The first enumeration covers uncertainty, certainty, urgency, delay, loss,
resources, adversary attention, trust, choice, planning, gratitude,
frustration, identity, and question-shape. It is intentionally a narrow seed,
not a claim of conversational completeness.

## Missing grammars worth enumerating next

1. **Contrast chords:** `but`, `unless`, `even if`, and `instead` identify the
   player's real tradeoff rather than merely both nouns.
2. **Counterfactual chords:** `if we had`, `what if`, and `suppose` bind to the
   existing forecast/compare authorities without predicting an outcome.
3. **Commitment-temperature chords:** distinguish curiosity, preference,
   reluctance, resolve, and bravado while never lowering them into execution.
4. **Pronoun/reference chords:** connect `it`, `that`, `them`, and `again` only
   through the persisted disclosed discourse subject.
5. **Value/price chords:** detect the pairing of a declared strategic value
   with the cost the player accepts, enabling the characteristic “I see you”
   observation from visible decision history.
6. **Correction chords:** distinguish factual disagreement, misunderstood
   intent, disliked advice, and hostile affect so Ava's repair is specific.
7. **Silence/repetition chords:** react to repeated questions and repeated
   choices through persisted realization history rather than a canned rebuke.

## Taste convergence loop

Content promotion should require four sequential gates:

1. **Truth:** no hidden fact, outcome, mechanic, or psychological diagnosis.
2. **Relevance:** a reviewer can name the exact input edge that earned the line;
   generic noir copy fails.
3. **Ava voice:** compressed observation, adversarial tenderness, concrete
   consequence; no jokes, therapy voice, slogans, or imitation profundity.
4. **Exhaustion:** near-duplicate premise, cadence, metaphor, and punchline are
   rejected even when the wording differs.

Blind pairwise review should compare each candidate against the incumbent for
the same chord. A candidate ships only when it wins for relevance and voice,
does not lose for truth, and adds a new rhetorical shape. Corpus tests then
seal IDs, determinism, abstention, and forbidden claims.

## Test execution examples

| Player surface | Compiled chord | Ava aside |
|---|---|---|
| `Maybe we can afford the losses?` | loss | Calling a loss acceptable does not make it smaller. It identifies who was absent from the negotiation. |
| `We should wait until later.` | delay | Delay is still a choice. It merely delegates the terms to whatever keeps moving. |
| `Can we trust their report?` | trust | Trust is useful between people. Between reports, use corroboration. |
| `Which option is better?` | choice | A choice becomes strategic when its rejected alternatives continue to matter. |
| `This is urgent. What should we do?` | urgency | The clock is not an argument. It is merely the enemy's least imaginative accomplice. |
| `Who are you, really?` | identity | You want to know what I am. I am more interested in what your question permits me to infer. |

These lines become the field-note opening; Ava's canonical status, advice,
clarification, or rejection follows unchanged.
