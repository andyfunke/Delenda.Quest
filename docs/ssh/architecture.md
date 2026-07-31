# SSH architecture

Target UX: `ssh play@ssh.delenda.quest`

SSH is a transport over the same Ava Nexus and application services used by every other client. It is not a Linux account and not a remote shell.

## Components

- `app/ava/nexus.ts` — authoritative language, discourse, capability, authority, and response runtime
- `app/ava/kernel.ts` — temporary compatibility re-export of the Nexus
- `app/api/ssh/credentials` — signed-in public-key registration and revocation
- `app/api/ssh/gateway/*` — bearer-authenticated key authorization, campaign persistence, and audit API
- `packages/ssh-gateway` — production OpenSSH image and forced Ava session
- `packages/terminal-core` — runtime-neutral compatibility adapter for semantic terminal clients
- `packages/ssh-server` — in-process security and parity fixture retained for tests

Game law remains in `app/game.ts` and `app/substrate/services.ts`. The TCP gateway never owns mechanics. It loads a campaign, invokes `runAvaNexusLine`, and persists the resulting authoritative state.

## Transport

Cloudflare Workers and Containers cannot receive public raw TCP from an ordinary SSH client. Production therefore uses a dedicated TCP origin. The checked-in deployment target is Fly.io with raw TCP passthrough from external port 22 to container port 2222.

Cloudflare remains the DNS and Worker/API platform. `ssh.delenda.quest` is DNS-only unless Spectrum is deliberately purchased and configured in front of the TCP origin.

## Authentication

1. The commander registers a public key at `/ssh`.
2. OpenSSH verifies possession of the private key.
3. `AuthorizedKeysCommand` sends only the public algorithm and public key blob to the authenticated gateway API.
4. D1 resolves the key to an active command identity and credential id.
5. OpenSSH applies a per-key forced command that starts Ava for that identity.

Delenda web passwords, browser cookies, private keys, and gateway bearer tokens never cross the SSH protocol.

## Persistence and audits

At session start, the gateway loads the account's active campaign from D1. State changes are persisted before Ava reports them as accepted. If persistence fails, the command fails closed and the prior campaign state remains active.

`ssh_session_audits` records connection opening and closing, credential identity, a bounded remote-risk hash, command count, and consequential-attempt count.

## Disabled features

Password authentication, root login, port forwarding, agent forwarding, X11, tunneling, user startup files, SCP, SFTP, arbitrary subsystems, and host shell execution are denied.

## Acceptance contract

CI must build the OpenSSH image and complete a real native SSH handshake with a generated client key. The connection must enter Ava and execute a one-shot `brief` command through the gateway API fixture. In-process adapter tests alone are insufficient.
