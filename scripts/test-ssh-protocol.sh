#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work="$(mktemp -d /tmp/delenda-ssh-protocol.XXXXXX)"
container_name="delenda-ssh-test-$RANDOM"
authority_pid=""
cleanup(){
  if [[ -n "$authority_pid" ]]; then kill "$authority_pid" 2>/dev/null || true; fi
  docker rm -f "$container_name" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

for command in docker ssh ssh-keygen ssh-keyscan curl; do command -v "$command" >/dev/null || { echo "$command is required" >&2; exit 69; }; done
ssh-keygen -q -t ed25519 -N '' -f "$work/known"
ssh-keygen -q -t ed25519 -N '' -f "$work/unknown"
ssh-keygen -q -t ed25519 -N '' -f "$work/host"
known_fingerprint="$(ssh-keygen -lf "$work/known.pub" -E sha256 | awk '{print $2}')"
secret="protocol-test-secret-0123456789-abcdef"
SSH_AUTHORITY_SECRET="$secret" EXPECTED_FINGERPRINT="$known_fingerprint" PORT=39091 node "$root/tests/fixtures/mock-ssh-authority.mjs" >"$work/authority.log" 2>&1 &
authority_pid=$!
for _ in {1..40}; do curl -fsS http://127.0.0.1:39091/health >/dev/null && break; sleep .25; done
curl -fsS http://127.0.0.1:39091/health >/dev/null

docker build -f "$root/Dockerfile.ssh" -t delenda-ssh-protocol-test "$root" >/dev/null
docker run -d --name "$container_name" --network host \
  -e PORT=2222 \
  -e SSH_AUTHORITY_URL=http://127.0.0.1:39091 \
  -e SSH_AUTHORITY_SECRET="$secret" \
  -e SSH_HOST_KEY_BASE64="$(base64 -w0 "$work/host")" \
  -e REQUIRE_STABLE_HOST_KEY=1 \
  delenda-ssh-protocol-test >/dev/null
for _ in {1..60}; do ssh-keyscan -T 1 -p 2222 127.0.0.1 >"$work/scan1" 2>/dev/null && break; sleep .25; done
test -s "$work/scan1"
ssh_options=(-p 2222 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o BatchMode=yes -o ConnectTimeout=5)

pairing="$(ssh "${ssh_options[@]}" -i "$work/unknown" play@127.0.0.1 2>&1 || true)"
grep -q 'PAIRING CODE: PAIRTEST' <<<"$pairing"
grep -q 'ssh_pair=PAIRTEST' <<<"$pairing"

brief="$(ssh "${ssh_options[@]}" -i "$work/known" play@127.0.0.1 brief)"
grep -q 'MOCK COMMAND: brief' <<<"$brief"

shell_attempt="$(ssh "${ssh_options[@]}" -i "$work/known" play@127.0.0.1 'uname -a')"
grep -q 'MOCK COMMAND: uname -a' <<<"$shell_attempt"
! grep -qi 'linux' <<<"$shell_attempt"

if sftp -q -P 2222 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes -i "$work/known" play@127.0.0.1 </dev/null >"$work/sftp.out" 2>&1; then
  echo "SFTP unexpectedly succeeded" >&2; exit 1
fi
if ssh "${ssh_options[@]}" -o ExitOnForwardFailure=yes -L 39092:127.0.0.1:39091 -i "$work/known" play@127.0.0.1 brief >"$work/forward.out" 2>&1; then
  echo "TCP forwarding unexpectedly succeeded" >&2; exit 1
fi

docker rm -f "$container_name" >/dev/null
docker run -d --name "$container_name" --network host \
  -e PORT=2222 \
  -e SSH_AUTHORITY_URL=http://127.0.0.1:39091 \
  -e SSH_AUTHORITY_SECRET="$secret" \
  -e SSH_HOST_KEY_BASE64="$(base64 -w0 "$work/host")" \
  -e REQUIRE_STABLE_HOST_KEY=1 \
  delenda-ssh-protocol-test >/dev/null
for _ in {1..60}; do ssh-keyscan -T 1 -p 2222 127.0.0.1 >"$work/scan2" 2>/dev/null && break; sleep .25; done
cmp "$work/scan1" "$work/scan2"
echo "Native SSH protocol acceptance passed."
