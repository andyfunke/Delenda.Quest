# SSH user commands

Interactive prompt:

```text
DELENDA>
```

## Read

- `help`
- `brief`
- `status`
- `production` / `military` / `diplomacy [actor]`
- `show <choice-id>`
- `advise` / `rank` / `compare`
- `whoami`
- `service record`
- `recent dispatches`

## Mutate

```text
DELENDA> prepare prod-choice-id

ORDER PREPARED
...
Confirm with:
confirm prp_...

DELENDA> confirm prp_...
ORDER EXECUTED
Audit: ord_...
```

Bare `yes` / `do it` / `go` never execute unless the exact single-proposal
confirmation preconditions are met. Prefer `confirm <token>`.

## One-shot

```bash
ssh play@ssh.delenda.quest brief
```

One-shot consequential commands may prepare but cannot confirm.
