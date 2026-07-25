#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd -- "${script_dir}/.." && pwd)"
shadow_name="delenda-quest-shadow"

if [[ "${1:-}" != "--confirm-create-shadow" || "${2:-}" != "${shadow_name}" ]]; then
  echo "usage: scripts/cloudflare-provision-shadow.sh --confirm-create-shadow ${shadow_name}" >&2
  exit 64
fi

required_secrets=(
  CF_ACCESS_TEAM_DOMAIN
  CF_ACCESS_AUD
  DELENDA_ADMIN_EMAILS
  DELENDA_REPLICATION_TOKEN
)
for key in "${required_secrets[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "${key} must be present in the process environment." >&2
    exit 1
  fi
done

cf() {
  "${script_dir}/cloudflare-env.sh" -- npx wrangler "$@"
}

cf whoami --json >/dev/null

database_list="$(mktemp /tmp/delenda-d1-list.XXXXXX)"
secrets_file="$(mktemp /tmp/delenda-worker-secrets.XXXXXX)"
chmod 600 "${secrets_file}"
cleanup() {
  rm -f -- "${database_list}" "${secrets_file}"
}
trap cleanup EXIT
cf d1 list --json >"${database_list}"
database_id="$(
  node --input-type=module - "${database_list}" "${shadow_name}" <<'NODE'
import { readFile } from "node:fs/promises";
const [path, name] = process.argv.slice(2);
const databases = JSON.parse(await readFile(path, "utf8"));
const match = databases.find((database) => database.name === name);
if (match) process.stdout.write(match.uuid);
NODE
)"

if [[ -z "${database_id}" ]]; then
  cf d1 create "${shadow_name}" --location wnam
  cf d1 list --json >"${database_list}"
  database_id="$(
    node --input-type=module - "${database_list}" "${shadow_name}" <<'NODE'
import { readFile } from "node:fs/promises";
const [path, name] = process.argv.slice(2);
const databases = JSON.parse(await readFile(path, "utf8"));
const match = databases.find((database) => database.name === name);
if (!match) throw new Error(`Cloudflare did not return ${name} after creation.`);
process.stdout.write(match.uuid);
NODE
  )"
fi

cd "${project_root}"
node scripts/cloudflare-bind-d1.mjs "${database_id}"
npm run cloudflare:types
cf d1 migrations apply DB --config cloudflare/wrangler.jsonc --remote

node --input-type=module - "${secrets_file}" <<'NODE'
import { writeFile } from "node:fs/promises";
const [path] = process.argv.slice(2);
const keys = [
  "CF_ACCESS_TEAM_DOMAIN",
  "CF_ACCESS_AUD",
  "DELENDA_ADMIN_EMAILS",
  "DELENDA_REPLICATION_TOKEN",
];
const secrets = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
await writeFile(path, JSON.stringify(secrets), { encoding: "utf8", mode: 0o600 });
NODE

npm run build
npm run cloudflare:dry-run
cf deploy --config cloudflare/wrangler.jsonc --strict \
  --secrets-file "${secrets_file}" \
  --message "Create isolated DELENDA.QUEST shadow"
