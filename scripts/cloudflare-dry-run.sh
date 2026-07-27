#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd -- "${script_dir}/.." && pwd)"

if [[ ! -f "${project_root}/dist/server/index.js" ]]; then
  echo "Cloudflare dry run requires a verified build. Run npm run build first." >&2
  exit 1
fi

exec "${script_dir}/cloudflare-env.sh" -- \
  npx wrangler deploy \
  --config wrangler.jsonc \
  --dry-run \
  --strict \
  --outdir .wrangler/deploy/production
