# SSH architecture

Target UX: `ssh play@ssh.delenda.quest`

SSH is a transport and terminal renderer over application services. It is not a
Linux account and not a remote shell.

## Packages

- `packages/terminal-core` — runtime-neutral parser + `SemanticResponse` renderer
- `packages/ssh-server` — authentication, session lifecycle, disabled features,
  rate limits, kill switches

Game law remains in `app/game.ts` and `app/substrate/services.ts`. The SSH
adapter may later deploy on a TCP-capable host while calling the same services.

## Auth

1. Primary: player-managed SSH public keys (`ssh_credentials` D1 table /
   `SshCredentialStore`)
2. Dev fallback: short-lived device/link codes completed via web account
3. Never accept the Delenda web password over SSH
4. Never print bearer tokens

## Disabled features

Port forwarding, agent forwarding, X11, SCP, SFTP, arbitrary subsystems, and
host shell execution are denied.

## Domain wiring

Custom domain and Workers TCP wiring remain documented but disabled until
infrastructure approval. Local integration uses `DelendaSshServer` in-process.
