#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd -- "${script_dir}/.." && pwd)"

if [[ "$#" -ne 2 || "$1" != "delenda-quest-shadow" ]]; then
  echo "usage: scripts/cloudflare-import-shadow.sh delenda-quest-shadow /absolute/path/import.sql" >&2
  exit 64
fi
if [[ "$2" != /* || ! -f "$2" ]]; then
  echo "The import SQL path must be absolute and must identify an existing file." >&2
  exit 64
fi

cd "${project_root}"
node --input-type=module <<'NODE'
import { readFile } from "node:fs/promises";
const config = JSON.parse(await readFile("cloudflare/wrangler.jsonc", "utf8"));
const binding = config.d1_databases?.find((entry) => entry.binding === "DB");
if (
  config.name !== "delenda-quest-shadow" ||
  binding?.database_name !== "delenda-quest-shadow"
) {
  throw new Error("Refusing import: Wrangler config does not target delenda-quest-shadow.");
}
NODE

exec "${script_dir}/cloudflare-env.sh" -- \
  npx wrangler d1 execute DB \
  --config cloudflare/wrangler.jsonc \
  --remote \
  --file "$2"
