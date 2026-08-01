#!/usr/bin/env bash
set -euo pipefail

TEMP_ROOT="${TMPDIR:-${PWD}/.tmp}"
mkdir -p "$TEMP_ROOT"
BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-ava-compiler.XXXXXX.mjs")"
REPORTS_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-ava-reports.XXXXXX.mjs")"
GAME_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-ava-game.XXXXXX.mjs")"
TERMINAL_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-ava-terminal.XXXXXX.mjs")"
RUNTIME_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-ava-runtime.XXXXXX.mjs")"
CONTEXT_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-ava-context.XXXXXX.mjs")"
INTERFACE_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-ava-interface.XXXXXX.mjs")"
CHAT_EXPORT_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-ava-chat-export.XXXXXX.mjs")"
INTRUSION_LIBRARY_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-intrusion-library.XXXXXX.mjs")"
trap 'rm -f "$BUNDLE" "$REPORTS_BUNDLE" "$GAME_BUNDLE" "$TERMINAL_BUNDLE" "$RUNTIME_BUNDLE" "$CONTEXT_BUNDLE" "$INTERFACE_BUNDLE" "$CHAT_EXPORT_BUNDLE" "$INTRUSION_LIBRARY_BUNDLE"' EXIT

node_modules/.bin/esbuild app/ava/compiler.ts --bundle --platform=node --format=esm --outfile="$BUNDLE" >/dev/null
node_modules/.bin/esbuild app/ava/reports.ts --bundle --platform=node --format=esm --outfile="$REPORTS_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/game.ts --bundle --platform=node --format=esm --outfile="$GAME_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/ava/terminal.ts --bundle --platform=node --format=esm --outfile="$TERMINAL_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/ava/runtime.ts --bundle --platform=node --format=esm --outfile="$RUNTIME_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/ava/game-context.ts --bundle --platform=node --format=esm --outfile="$CONTEXT_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/ava/interface-intent.ts --bundle --platform=node --format=esm --outfile="$INTERFACE_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/ava/chat-export.ts --bundle --platform=node --format=esm --outfile="$CHAT_EXPORT_BUNDLE" >/dev/null
node_modules/.bin/esbuild packages/intrusion-library/src/index.ts --bundle --platform=node --format=esm --outfile="$INTRUSION_LIBRARY_BUNDLE" >/dev/null
DELENDA_INTRUSION_LIBRARY_BUNDLE="file://$INTRUSION_LIBRARY_BUNDLE" node --test tests/intrusion-library.test.mjs
DELENDA_AVA_BUNDLE="file://$BUNDLE" node --test tests/ava-compiler.test.mjs
DELENDA_AVA_CHAT_EXPORT_BUNDLE="file://$CHAT_EXPORT_BUNDLE" node --test tests/ava-chat-export.test.mjs
DELENDA_INTERFACE_BUNDLE="file://$INTERFACE_BUNDLE" node --test tests/interface-switch.test.mjs
DELENDA_AVA_REPORTS_BUNDLE="file://$REPORTS_BUNDLE" DELENDA_AVA_GAME_BUNDLE="file://$GAME_BUNDLE" node --test tests/ava-reports.test.mjs
DELENDA_AVA_BUNDLE="file://$BUNDLE" \
DELENDA_AVA_TERMINAL_BUNDLE="file://$TERMINAL_BUNDLE" \
DELENDA_AVA_RUNTIME_BUNDLE="file://$RUNTIME_BUNDLE" \
DELENDA_AVA_CONTEXT_BUNDLE="file://$CONTEXT_BUNDLE" \
DELENDA_AVA_GAME_BUNDLE="file://$GAME_BUNDLE" \
node --test tests/ava-terminal.test.mjs
