# SSH security

## Hard rules

- No host shell, filesystem, SCP, SFTP, or forwarding
- Consequential commands require prepare/confirm with idempotency
- Non-interactive one-shot commands may prepare but never confirm
- Strip/reject OSC and control-sequence injection in renderer input paths
- Structured logs must omit secrets and raw proposal tokens
- Raw source IPs are not stored indefinitely; use `remoteRiskHash`

## Controls

| Control | Default |
|---|---|
| Idle timeout | 15 minutes |
| Absolute session | 4 hours |
| Concurrent sessions / account | 3 |
| Command burst | 60 / minute |
| Failed auth delay | progressive |
| Global SSH disable | configurable |
| Global mutation disable | configurable |

## Credentials

Multiple keys per account are allowed. Each key stores label, fingerprint,
created time, last-used time, and revoked time. Revoked keys fail closed.
