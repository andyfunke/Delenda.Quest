#!/usr/bin/env bash
set -euo pipefail

TEMP_ROOT="${TMPDIR:-${PWD}/.tmp}"
mkdir -p "$TEMP_ROOT"
GATE_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-substrate-gates.XXXXXX.mjs")"
DOCKET_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-substrate-docket.XXXXXX.mjs")"
SERVICES_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-substrate-services.XXXXXX.mjs")"
PARSER_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-substrate-parser.XXXXXX.mjs")"
AVA_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-substrate-ava.XXXXXX.mjs")"
INDEX_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-substrate-index.XXXXXX.mjs")"
LLM_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-substrate-llm.XXXXXX.mjs")"
MCP_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-substrate-mcp.XXXXXX.mjs")"
TERMINAL_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-terminal-core.XXXXXX.mjs")"
SSH_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-ssh-server.XXXXXX.mjs")"
NEXUS_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-ava-nexus.XXXXXX.mjs")"
COMPILER_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-ava-compiler.XXXXXX.mjs")"
GAME_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-substrate-game.XXXXXX.mjs")"
COGNITIVE_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-ava-cognitive.XXXXXX.mjs")"
trap 'rm -f "$GATE_BUNDLE" "$DOCKET_BUNDLE" "$SERVICES_BUNDLE" "$PARSER_BUNDLE" "$AVA_BUNDLE" "$INDEX_BUNDLE" "$LLM_BUNDLE" "$MCP_BUNDLE" "$TERMINAL_BUNDLE" "$SSH_BUNDLE" "$NEXUS_BUNDLE" "$COMPILER_BUNDLE" "$GAME_BUNDLE" "$COGNITIVE_BUNDLE"' EXIT

node_modules/.bin/esbuild app/substrate/gates.ts --bundle --platform=node --format=esm --outfile="$GATE_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/substrate/docket.ts --bundle --platform=node --format=esm --outfile="$DOCKET_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/substrate/services.ts --bundle --platform=node --format=esm --outfile="$SERVICES_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/substrate/command-parser.ts --bundle --platform=node --format=esm --outfile="$PARSER_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/substrate/ava-classic.ts --bundle --platform=node --format=esm --outfile="$AVA_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/substrate/semantic-index.ts --bundle --platform=node --format=esm --outfile="$INDEX_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/substrate/llm-packets.ts --bundle --platform=node --format=esm --outfile="$LLM_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/substrate/mcp-seam.ts --bundle --platform=node --format=esm --outfile="$MCP_BUNDLE" >/dev/null
node_modules/.bin/esbuild packages/terminal-core/src/index.ts --bundle --platform=node --format=esm --outfile="$TERMINAL_BUNDLE" >/dev/null
node_modules/.bin/esbuild packages/ssh-server/src/index.ts --bundle --platform=node --format=esm --outfile="$SSH_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/ava/nexus.ts --bundle --platform=node --format=esm --outfile="$NEXUS_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/ava/compiler.ts --bundle --platform=node --format=esm --outfile="$COMPILER_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/game.ts --bundle --platform=node --format=esm --outfile="$GAME_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/ava/cognitive-runtime.ts --bundle --platform=node --format=esm --outfile="$COGNITIVE_BUNDLE" >/dev/null

DELENDA_SUBSTRATE_GATES_BUNDLE="file://$GATE_BUNDLE" \
DELENDA_SUBSTRATE_DOCKET_BUNDLE="file://$DOCKET_BUNDLE" \
DELENDA_SUBSTRATE_SERVICES_BUNDLE="file://$SERVICES_BUNDLE" \
DELENDA_SUBSTRATE_PARSER_BUNDLE="file://$PARSER_BUNDLE" \
DELENDA_SUBSTRATE_AVA_BUNDLE="file://$AVA_BUNDLE" \
DELENDA_SUBSTRATE_INDEX_BUNDLE="file://$INDEX_BUNDLE" \
DELENDA_SUBSTRATE_LLM_BUNDLE="file://$LLM_BUNDLE" \
DELENDA_SUBSTRATE_MCP_BUNDLE="file://$MCP_BUNDLE" \
DELENDA_TERMINAL_CORE_BUNDLE="file://$TERMINAL_BUNDLE" \
DELENDA_SSH_SERVER_BUNDLE="file://$SSH_BUNDLE" \
DELENDA_AVA_NEXUS_BUNDLE="file://$NEXUS_BUNDLE" \
DELENDA_AVA_COMPILER_BUNDLE="file://$COMPILER_BUNDLE" \
DELENDA_SUBSTRATE_GAME_BUNDLE="file://$GAME_BUNDLE" \
DELENDA_AVA_COGNITIVE_BUNDLE="file://$COGNITIVE_BUNDLE" \
node --test tests/substrate-gates.test.mjs tests/substrate-docket.test.mjs tests/substrate-parser.test.mjs tests/substrate-services.test.mjs tests/substrate-ava-classic.test.mjs tests/substrate-parity.test.mjs tests/substrate-ssh.test.mjs tests/substrate-llm.test.mjs tests/substrate-architecture.test.mjs tests/ava-nexus.test.mjs tests/ava-cognitive-base.test.mjs tests/ava-semantic-tree.test.mjs
