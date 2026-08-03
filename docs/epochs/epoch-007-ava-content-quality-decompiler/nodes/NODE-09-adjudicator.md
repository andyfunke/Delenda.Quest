# NODE-09 — optional constrained adjudication

Status: parked; not part of deterministic activation

This node requires separate explicit authorization for provider/model,
retention, cost ceiling, and calibration policy. Passing NODE-08 does not
activate it.

## Allowed

- review only deterministic `REVIEW` candidates;
- strict binary checklist;
- delimited candidate data treated as untrusted text;
- hidden controls evaluated after parsing, not shown as prompt exemplars;
- fixed retry/call/cost ceilings;
- position-swapped A/B comparison for replacements.

## Forbidden

- runtime calls;
- generative rewriting;
- hard-gate override;
- hidden-state inference;
- command intent creation;
- promotion solely from model output.
