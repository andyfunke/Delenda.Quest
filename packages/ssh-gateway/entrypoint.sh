#!/usr/bin/env bash
set -euo pipefail

API_BASE="${DELENDA_API_BASE:-https://delenda.quest}"
TOKEN="${DELENDA_SSH_GATEWAY_TOKEN:-}"
CONFIG_PATH="/etc/delenda-gateway/config.json"
HOST_KEY="/etc/ssh/ssh_host_ed25519_key"

if [[ ! "$API_BASE" =~ ^https:// ]]; then
  echo "DELENDA_API_BASE must use https://" >&2
  exit 1
fi
if [[ ${#TOKEN} -lt 32 ]]; then
  echo "DELENDA_SSH_GATEWAY_TOKEN must be at least 32 characters." >&2
  exit 1
fi

install -d -m 0750 -o root -g delenda /etc/delenda-gateway
API_BASE="$API_BASE" TOKEN="$TOKEN" node - <<'NODE' > "$CONFIG_PATH"
const apiBase=process.env.API_BASE;
const token=process.env.TOKEN;
process.stdout.write(JSON.stringify({apiBase,token}));
NODE
chown root:delenda "$CONFIG_PATH"
chmod 0640 "$CONFIG_PATH"

if [[ -n "${DELENDA_SSH_HOST_KEY_B64:-}" ]]; then
  printf '%s' "$DELENDA_SSH_HOST_KEY_B64" | base64 -d > "$HOST_KEY"
  chmod 0600 "$HOST_KEY"
elif [[ "${DELENDA_SSH_ALLOW_EPHEMERAL_HOST_KEY:-0}" == "1" ]]; then
  ssh-keygen -q -t ed25519 -N '' -f "$HOST_KEY"
  echo "WARNING: using an ephemeral SSH host key" >&2
else
  echo "DELENDA_SSH_HOST_KEY_B64 is required for a stable production host identity." >&2
  exit 1
fi

ssh-keygen -y -f "$HOST_KEY" >/dev/null
install -d -m 0755 /run/sshd
exec /usr/sbin/sshd -D -e -f /etc/ssh/sshd_config
