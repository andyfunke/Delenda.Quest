#!/usr/bin/env bash
set -euo pipefail

IMAGE="${1:-delenda-ssh-gateway:test}"
TMP="$(mktemp -d /tmp/delenda-native-ssh.XXXXXX)"
CONTAINER="delenda-ssh-test-$RANDOM"
API_PID=""
cleanup(){
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  if [[ -n "$API_PID" ]]; then kill "$API_PID" >/dev/null 2>&1 || true; fi
  rm -rf "$TMP"
}
trap cleanup EXIT

ssh-keygen -q -t ed25519 -N '' -f "$TMP/client"
ssh-keygen -q -t ed25519 -N '' -f "$TMP/host"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
  -keyout "$TMP/tls.key" -out "$TMP/tls.crt" \
  -subj '/CN=host.docker.internal' \
  -addext 'subjectAltName=DNS:host.docker.internal' >/dev/null 2>&1

TOKEN="$(printf 'a%.0s' {1..64})"
PUBLIC_KEY="$(cat "$TMP/client.pub")"
GATEWAY_TOKEN="$TOKEN" PUBLIC_KEY="$PUBLIC_KEY" TLS_KEY="$TMP/tls.key" TLS_CERT="$TMP/tls.crt" PORT=9443 \
  node tests/fixtures/ssh-gateway-api.mjs >"$TMP/api.log" 2>&1 &
API_PID=$!

for _ in {1..50}; do
  grep -q '^READY ' "$TMP/api.log" && break
  sleep .1
done
grep -q '^READY ' "$TMP/api.log"

HOST_KEY_B64="$(base64 -w0 < "$TMP/host")"
docker run -d --rm --name "$CONTAINER" \
  --add-host host.docker.internal:host-gateway \
  -p 127.0.0.1:2222:2222 \
  -e DELENDA_API_BASE=https://host.docker.internal:9443 \
  -e DELENDA_SSH_GATEWAY_TOKEN="$TOKEN" \
  -e DELENDA_SSH_HOST_KEY_B64="$HOST_KEY_B64" \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  "$IMAGE" >/dev/null

ready=0
for _ in {1..80}; do
  if (echo >/dev/tcp/127.0.0.1/2222) >/dev/null 2>&1; then ready=1; break; fi
  if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then break; fi
  sleep .25
done
if [[ "$ready" != "1" ]]; then
  echo 'SSH gateway did not open port 2222.' >&2
  docker logs "$CONTAINER" >&2 || true
  cat "$TMP/api.log" >&2 || true
  exit 1
fi

set +e
RESULT="$(ssh -vvv -p 2222 \
  -i "$TMP/client" \
  -o IdentitiesOnly=yes \
  -o PreferredAuthentications=publickey \
  -o PasswordAuthentication=no \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  -o ConnectTimeout=8 \
  play@127.0.0.1 brief 2>"$TMP/ssh.log")"
SSH_STATUS=$?
set -e
if [[ "$SSH_STATUS" != "0" ]]; then
  echo "Native SSH command failed with status $SSH_STATUS." >&2
  cat "$TMP/ssh.log" >&2 || true
  docker logs "$CONTAINER" >&2 || true
  cat "$TMP/api.log" >&2 || true
  exit "$SSH_STATUS"
fi

printf '%s\n' "$RESULT"
grep -q 'AVA REMOTE COMMAND' <<<"$RESULT"
grep -Eq 'FIELD NOTE|DAILY BRIEF|DAY [0-9]+' <<<"$RESULT"
