# NODE-06 / E6 — disclosed current projection

- Status: complete
- Output: `app/ava/contextual-language-projection.ts`
- Execution: derives from `projectAvaDisclosedState`, `situationForState`,
  `CONTENT_PACK_VERSION`, and `avaVisibleWorldRevision`
- Verification: state remains unchanged; hidden adversary fields do not enter
  the language payload
