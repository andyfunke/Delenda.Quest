# Epoch 014 seal

```text
npm run test:contentgen-service   PASS 8/8
npx tsc --noEmit                  PASS
```

Illegal ops covered: anonymous, non-admin, duplicate idempotency, stale
revision, illegal hard-failure approval, premature close with unreviewed
revision child, parent mutation, private identity export redaction.
