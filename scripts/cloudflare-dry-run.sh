#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd -- "${script_dir}/.." && pwd)"
generated_config="${project_root}/dist/server/wrangler.json"

if [[ ! -f "${project_root}/dist/server/index.js" || ! -f "${generated_config}" ]]; then
  echo "Cloudflare dry run requires a verified Vite build. Run npm run build first." >&2
  exit 1
fi

# Validate the Cloudflare Vite plugin's generated Worker. The source config
# contains Vinext virtual imports and must never be bundled directly by Wrangler.
exec "${script_dir}/cloudflare-env.sh" -- \
  npx wrangler deploy \
  --config "${generated_config}" \
  --dry-run \
  --strict \
  --outdir .wrangler/dry-run/production
