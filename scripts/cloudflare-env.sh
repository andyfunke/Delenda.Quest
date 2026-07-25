#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd -- "${script_dir}/.." && pwd)"
runtime_root="${project_root}/.wrangler/cloudflare-runtime"

mkdir -p \
  "${runtime_root}/xdg-config" \
  "${runtime_root}/logs" \
  "${runtime_root}/npm-cache"

export XDG_CONFIG_HOME="${runtime_root}/xdg-config"
export WRANGLER_WRITE_LOGS=false
export WRANGLER_LOG_PATH="${runtime_root}/logs"
export MINIFLARE_REGISTRY_PATH="${runtime_root}/registry"
export NPM_CONFIG_CACHE="${runtime_root}/npm-cache"
export NPM_CONFIG_AUDIT=false
export NPM_CONFIG_FUND=false
export NPM_CONFIG_UPDATE_NOTIFIER=false

if [[ "${1:-}" != "--" || "$#" -lt 2 ]]; then
  echo "usage: scripts/cloudflare-env.sh -- command [args...]" >&2
  exit 64
fi
shift

cd "${project_root}"
exec "$@"
