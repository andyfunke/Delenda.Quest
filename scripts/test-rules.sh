#!/usr/bin/env bash
set -euo pipefail

TEMP_ROOT="${TMPDIR:-${PWD}/.tmp}"
mkdir -p "$TEMP_ROOT"
BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-game-rules.XXXXXX.mjs")"
CONVERGENCE_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-convergence.XXXXXX.mjs")"
APHORISM_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-aphorisms.XXXXXX.mjs")"
WAR_FEED_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-war-feed.XXXXXX.mjs")"
ACCOUNT_TIME_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-account-time.XXXXXX.mjs")"
CAMPAIGN_PERSISTENCE_BUNDLE="$(mktemp "${TEMP_ROOT}/delenda-campaign-persistence.XXXXXX.mjs")"
trap 'rm -f "$BUNDLE" "$CONVERGENCE_BUNDLE" "$APHORISM_BUNDLE" "$WAR_FEED_BUNDLE" "$ACCOUNT_TIME_BUNDLE" "$CAMPAIGN_PERSISTENCE_BUNDLE"' EXIT

node_modules/.bin/esbuild app/game.ts --bundle --platform=node --format=esm --outfile="$BUNDLE" >/dev/null
node_modules/.bin/esbuild app/convergence.ts --bundle --platform=node --format=esm --outfile="$CONVERGENCE_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/aphorisms.ts --bundle --platform=node --format=esm --outfile="$APHORISM_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/war-feed.ts --bundle --platform=node --format=esm --outfile="$WAR_FEED_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/account-time.ts --bundle --platform=node --format=esm --outfile="$ACCOUNT_TIME_BUNDLE" >/dev/null
node_modules/.bin/esbuild app/campaign-persistence.ts --bundle --platform=node --format=esm --outfile="$CAMPAIGN_PERSISTENCE_BUNDLE" >/dev/null
DELENDA_GAME_BUNDLE="file://$BUNDLE" node --test tests/campaign-substrate.test.mjs
DELENDA_CONVERGENCE_BUNDLE="file://$CONVERGENCE_BUNDLE" node --test tests/convergence.test.mjs
DELENDA_APHORISM_BUNDLE="file://$APHORISM_BUNDLE" node --test tests/aphorism-rotation.test.mjs
DELENDA_WAR_FEED_BUNDLE="file://$WAR_FEED_BUNDLE" node --test tests/war-feed.test.mjs
DELENDA_ACCOUNT_TIME_BUNDLE="file://$ACCOUNT_TIME_BUNDLE" node --test tests/account-time.test.mjs
DELENDA_CAMPAIGN_PERSISTENCE_BUNDLE="file://$CAMPAIGN_PERSISTENCE_BUNDLE" node --test tests/campaign-persistence.test.mjs
