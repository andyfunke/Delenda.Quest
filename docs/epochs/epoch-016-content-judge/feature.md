# Epoch 016 — Constrained AI pre-score and `#curious` prioritization

Status: **COMPLETE**

**Depends on:** Epoch 015; frozen calibration/held-out corpora; provider
authorization is an **external gate** for `judgeId != NONE`.

**Objective:** Provider-neutral ContentJudge contracts, offline batch runner,
strict schemas, frozen checklist prompts, queue law (§4.9), and deterministic
`NONE` mode. Lab remains usable without AI; no UI AI provenance when
`judgeId=NONE`.

**Owned files:**

- `packages/contentgen-judge/**`
- `content-quality/judge/**`
- `scripts/contentgen-judge.mjs`
- `tests/contentgen-judge.test.mjs`
- Lab queue projection wiring (tags / queueRank only)

**Operational declaration:** This epoch ships contracts and `NONE` mode.
`judgeId != NONE` remains non-operational until provider/retention/cost auth.
