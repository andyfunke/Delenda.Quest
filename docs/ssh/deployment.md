# Native SSH deployment

The production target is a normal OpenSSH connection:

```bash
ssh play@ssh.delenda.quest
```

Cloudflare Workers and Cloudflare Containers do not accept public raw TCP connections. The SSH gateway therefore runs as a small TCP service on Fly.io and calls the Delenda Worker over authenticated HTTPS for key authorization, campaign persistence, and audit records.

## 1. Generate independent secrets

Generate one gateway token shared by the Worker and the SSH gateway:

```bash
openssl rand -hex 32
```

Generate a stable Ed25519 host key:

```bash
ssh-keygen -q -t ed25519 -N '' -f delenda_ssh_host_key
base64 < delenda_ssh_host_key | tr -d '\n'
```

The private host key is never committed. Retain it so clients do not see a changed-host-key warning after redeployment.

## 2. Configure the Delenda Worker

Set the same gateway token as a Cloudflare Worker secret:

```bash
npx wrangler secret put DELENDA_SSH_GATEWAY_TOKEN
```

The gateway API is under `/api/ssh/gateway/*`. It rejects requests without this bearer token.

## 3. Create and configure the Fly application

```bash
fly apps create delenda-quest-ssh
fly secrets set \
  DELENDA_SSH_GATEWAY_TOKEN='<same gateway token>' \
  DELENDA_SSH_HOST_KEY_B64='<base64 host private key>'
fly deploy --config packages/ssh-gateway/fly.toml
```

For GitHub deployment, create the protected `ssh-production` environment and add a least-privilege `FLY_API_TOKEN` secret. Then run the `Deploy SSH gateway` workflow manually.

The Fly service maps public TCP port 22 directly to OpenSSH on internal port 2222. No HTTP or TLS handler is placed in front of SSH.

## 4. Configure DNS

Create a DNS-only record for `ssh.delenda.quest` pointing to the Fly application. Do not orange-cloud a standard DNS record for this endpoint. Ordinary Cloudflare proxying is HTTP-oriented and cannot carry native SSH without Spectrum.

A typical record is:

```text
Type: CNAME
Name: ssh
Target: delenda-quest-ssh.fly.dev
Proxy status: DNS only
```

Alternatively, use the dedicated IPv4 and IPv6 addresses reported by `fly ips list` and create DNS-only A and AAAA records.

## 5. Register a commander key

Open:

```text
https://delenda.quest/ssh
```

Paste the contents of an SSH public key such as `~/.ssh/id_ed25519.pub`. Private key material never enters Delenda.

## 6. Connect

```bash
ssh play@ssh.delenda.quest
```

A one-shot command is also valid:

```bash
ssh play@ssh.delenda.quest brief
ssh play@ssh.delenda.quest 'what should I do'
```

One-shot sessions may inspect and prepare orders. They cannot confirm consequential operations. Interactive confirmation remains mandatory.

## Security boundary

OpenSSH performs the protocol and public-key signature verification. `AuthorizedKeysCommand` asks the Delenda Worker whether the presented public key is active. An authorized key receives a forced Ava command; it never receives a host shell.

The gateway disables:

- Password and keyboard-interactive authentication
- Root login
- Agent forwarding
- TCP and Unix-socket forwarding
- X11 forwarding
- Tunnels
- User startup files
- SCP and SFTP access

Campaign state is loaded from D1 at session start and saved through the authenticated gateway API after state changes. Session opening, closing, command count, and consequential-attempt count are written to `ssh_session_audits`.
