# NODE-05 — exact contextual matcher and route lowerer

## Output

- Contextual surfaces now match only the exact normalized input; substring,
  edit-distance, embedding, and LLM matching are not used.
- Missing visible destinations return a typed clarification path instead of
  silently falling through as if the phrase were unknown.
- Compiled contextual traces use stable `CONTEXTUAL_LANGUAGE:<entry-id>` rule
  identities, source provenance, exact-index evidence, and contextual IDs.

## Route lowering

The existing `ADVISE`, `REPORT`, and `EXPLAIN` instruction kinds remain the
only semantic destinations. `genericSemanticQuery` remains the query builder.

## Verification

- The packet corpus resolves through typed instructions.
- Normalization variants resolve to the same owner.
- Near phrases do not steal the contextual route.
- Missing entity destinations clarify with a bounded failure.
