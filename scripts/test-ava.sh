#!/usr/bin/env bash
set -euo pipefail

BUNDLE="$(mktemp /tmp/delenda-ava-compiler.XXXXXX.mjs)"
REPORTS_BUNDLE="$(mktemp /tmp/delenda-ava-reports.XXXXXX.mjs)"
GAME_BUNDLE="$(mktemp /tmp/delenda-ava-game.XXXXXX.mjs)"
TERMINAL_BUNDLE="$(mktemp /tmp/delenda-ava-terminal.XXXXXX.mjs)"
RUNTIME_BUNDLE="$(mktemp /tmp/delenda-ava-runtime.XXXXXX.mjs)"
CONTEXT_BUNDLE="$(mktemp /tmp/delenda-ava-context.XXXXXX.mjs)"
trap 'rm -f "$BUNDLE" "$REPORTS_BUNDLE" "$GAME_BUNDLE" "$TERMINAL_BUNDLE" "$RUNTIME_BUNDLE" "$CONTEXT_BUNDLE"' EXIT

node_modules/.bin/esbuild app/ava/compiler.ts --bundle --platform=node --format=esm --outfile="$BUNDLE" >/dev/null
node_modules/.bin/esbuild app/ava/reports.ts --bundle --platform=node --format=esm --outfile="$REPORTS_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/game.ts --bundle --platform=node --format=esm --outfile="$GAME_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/ava/terminal.ts --bundle --platform=node --format=esm --outfile="$TERMINAL_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/ava/runtime.ts --bundle --platform=node --format=esm --outfile="$RUNTIME_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/ava/game-context.ts --bundle --platform=node --format=esm --outfile="$CONTEXT_BUNDLE" >/dev/null
DELENDA_AVA_BUNDLE="file://$BUNDLE" node --test tests/ava-compiler.test.mjs
DELENDA_AVA_REPORTS_BUNDLE="file://$REPORTS_BUNDLE" DELENDA_AVA_GAME_BUNDLE="file://$GAME_BUNDLE" node --test tests/ava-reports.test.mjs
DELENDA_AVA_BUNDLE="file://$BUNDLE" \
DELENDA_AVA_TERMINAL_BUNDLE="file://$TERMINAL_BUNDLE" \
DELENDA_AVA_RUNTIME_BUNDLE="file://$RUNTIME_BUNDLE" \
DELENDA_AVA_CONTEXT_BUNDLE="file://$CONTEXT_BUNDLE" \
DELENDA_AVA_GAME_BUNDLE="file://$GAME_BUNDLE" \
node --test tests/ava-terminal.test.mjs
