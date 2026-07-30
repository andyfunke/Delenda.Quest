#!/bin/sh
set -eu
port="${PORT:-2222}"
case "$port" in *[!0-9]*|'') echo "Invalid PORT" >&2; exit 78;; esac
mkdir -p /run/delenda /run/sshd
host_key=/run/delenda/ssh_host_ed25519_key
authority_url_file=/run/delenda/authority_url
authority_secret_file=/run/delenda/authority_secret
remote_risk_salt_file=/run/delenda/remote_risk_salt
printf '%s' "${SSH_AUTHORITY_URL:-}" > "$authority_url_file"
printf '%s' "${SSH_AUTHORITY_SECRET:-}" > "$authority_secret_file"
printf '%s' "${SSH_REMOTE_RISK_SALT:-}" > "$remote_risk_salt_file"
chown root:play "$authority_url_file" "$authority_secret_file" "$remote_risk_salt_file"
chmod 0640 "$authority_url_file" "$authority_secret_file" "$remote_risk_salt_file"
if [ -n "${SSH_HOST_KEY_BASE64:-}" ]; then
  printf '%s' "$SSH_HOST_KEY_BASE64" | base64 -d > "$host_key"
  chmod 600 "$host_key"
  ssh-keygen -y -f "$host_key" >/dev/null
elif [ "${REQUIRE_STABLE_HOST_KEY:-0}" = "1" ]; then
  echo "SSH_HOST_KEY_BASE64 is required in production." >&2
  exit 78
else
  ssh-keygen -q -t ed25519 -N '' -f "$host_key"
fi
sed "s/__PORT__/$port/g" /app/ssh/sshd_config > /run/delenda/sshd_config
exec /usr/bin/tini -- /usr/sbin/sshd -D -e -f /run/delenda/sshd_config
