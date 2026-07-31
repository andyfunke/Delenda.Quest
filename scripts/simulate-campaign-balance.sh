#!/usr/bin/env bash
set -euo pipefail

TEMP_ROOT="${TMPDIR:-${PWD}/.tmp}"
mkdir -p "$TEMP_ROOT"
BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-balance-game.XXXXXX.mjs")"
trap 'rm -f "$BUNDLE"' EXIT

node_modules/.bin/esbuild app/game.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --outfile="$BUNDLE" >/dev/null

DELENDA_GAME_BUNDLE="file://$BUNDLE" \
  node scripts/simulate-campaign-balance.mjs "${1:-1000}"
