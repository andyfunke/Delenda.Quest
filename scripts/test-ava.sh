#!/usr/bin/env bash
set -euo pipefail

BUNDLE="$(mktemp /tmp/delenda-ava-compiler.XXXXXX.mjs)"
trap 'rm -f "$BUNDLE"' EXIT

node_modules/.bin/esbuild app/ava/compiler.ts --bundle --platform=node --format=esm --outfile="$BUNDLE" >/dev/null
DELENDA_AVA_BUNDLE="file://$BUNDLE" node --test tests/ava-compiler.test.mjs
