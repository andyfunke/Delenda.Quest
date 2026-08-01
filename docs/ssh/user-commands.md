# SSH user commands

Interactive prompt:

```text
DELENDA>
```

## Read

- `help`
- `brief` (Ava's paraphrase)
- `daily brief` (authored report)
- `status`
- `production` / `military` / `diplomacy [actor]`
- `show <choice-id>`
- `advise` / `rank` / `compare`
- `whoami`
- `service record`
- `recent dispatches`

## Sealed shell

Use `man <command>` or `help <command>` for the implemented subset. These are virtual adapters over player-visible campaign data, not host binaries.

- Files: `pwd`, `cd`, `ls`, `cat`, `open`, `find`, `tree`, `stat`, `file`, `download`
- Filters: `grep`, `head`, `tail`, `sort`, `uniq`, `wc`, `cut`, `column`, `less`, `nl`, `tr`, `sed`, `awk`, `sha256sum`
- Data tools: `csvlook`, `csvcut`, `csvstat`, `diff`
- Session: `history`, `clear`, `which`, `whoami`, `hostname`, `uptime`, `date`, `id`, `uname`, `env`, `df`, `du`, `top`, `ss`
- Campaign administration: `ps`, `systemctl status <unit>`, `crontab -l`, `ava doctor`
- Audit metaphors: `git status|log|show|diff`, `sqlite3 campaign.db SELECT ...`, `explain --trace last`, `prove last`
- Bounded applications: `brew`, `vim`, `nano`, `jq`, `bat`, `bc`, `units`, `cal`, `archive`, `nmap relay-grid`, `hack`
- Read-only pipelines: `status | grep -i readiness`, `history | tail -n 10`
- Easter eggs: `fortune`, `generate social post`, `sudo`, `make victory`, `rm -rf /`

Pipelines accept one read-only producer followed by implemented filters. `&&`, `;`, redirects, substitutions, arbitrary binaries, and mutations inside a pipeline remain unavailable.

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
