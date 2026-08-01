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
fly ips allocate-v4 --app delenda-quest-ssh
fly secrets set --app delenda-quest-ssh \
  DELENDA_SSH_GATEWAY_TOKEN='<same gateway token>' \
  DELENDA_SSH_HOST_KEY_B64='<base64 host private key>'
fly deploy --config packages/ssh-gateway/fly.toml
```

Raw SSH is a non-HTTP, non-TLS TCP protocol. Fly therefore requires a dedicated IPv4 address for IPv4 clients. Public IPv6 remains available as well. The dedicated IPv4 currently costs $2 per month.

The checked-in Machine is `shared-cpu-1x` with 512 MB in Seattle. At the current Seattle price that is approximately $3.32 per full month, plus the $2 dedicated IPv4, before egress. A 256 MB Machine is approximately $2.02 per full month if the gateway proves stable within that memory ceiling.

The current production-safe configuration keeps one 512 MB Machine running. The cheaper Fly experiment is:

```toml
auto_stop_machines = "stop"
auto_start_machines = true
min_machines_running = 0

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"
```

Fly Proxy can start a stopped Machine from an incoming service connection, but cold-start SSH handshake behavior must pass live tests before this replaces the always-on setting. Raw non-TLS SSH cannot use Fly shared IPv4 routing, so the $2 dedicated IPv4 remains required for normal IPv4 clients.

Official references:

- Fly pricing: https://fly.io/docs/about/pricing/
- Fly public network services: https://fly.io/docs/networking/services/
- Fly autostop and autostart: https://fly.io/docs/launch/autostop-autostart/

## Cheaper and home-hosted alternatives

An IPv6-only Fly endpoint removes the dedicated IPv4 charge but excludes clients without working IPv6. It is not an acceptable default public endpoint.

Home hosting can be zero incremental compute cost when the site has a public IPv4 or usable IPv6, stable power, and router control. Run the same gateway container on an isolated host, forward only TCP 22, publish DNS-only A and AAAA records, update DNS after address changes, retain the host key outside the container, and deny all forwarding and host-shell access exactly as the Fly image does. Add automatic security updates, a UPS if practical, health monitoring, and a recovery path for ISP outages.

Carrier-grade NAT blocks unsolicited IPv4 port forwarding. Cloudflare Tunnel can carry SSH when clients install `cloudflared` or configure a ProxyCommand, but that breaks the ordinary `ssh play@ssh.delenda.quest` promise. Cloudflare Spectrum can proxy one SSH application on Pro or Business, but it is not available on Free and adds a paid-plan dependency. For a normal one-line SSH command, Fly with a dedicated IPv4 remains the cheapest low-operations public topology; home hosting is cheaper only when the network conditions and operational burden are acceptable.

For GitHub deployment, create the protected `ssh-production` environment and
add a least-privilege `FLY_API_TOKEN` secret. A relevant push to `main` runs the
containerized native-handshake contract, deploys the Fly gateway, and verifies
the live SSH listener. The same workflow remains manually dispatchable for an
operator-controlled redeploy.

The Fly service maps public TCP port 22 directly to OpenSSH on internal port 2222. No HTTP or TLS handler is placed in front of SSH.

## 4. Configure DNS

Create DNS-only records for `ssh.delenda.quest`. Do not orange-cloud a standard DNS record for this endpoint. Ordinary Cloudflare proxying is HTTP-oriented and cannot carry native SSH without Spectrum.

The least ambiguous configuration uses the addresses reported by:

```bash
fly ips list --app delenda-quest-ssh
```

Create a DNS-only A record for the dedicated IPv4 and a DNS-only AAAA record for the dedicated IPv6. A DNS-only CNAME to `delenda-quest-ssh.fly.dev` is also acceptable after both addresses resolve correctly.

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
