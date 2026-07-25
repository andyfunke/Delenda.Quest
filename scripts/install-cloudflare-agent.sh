#!/usr/bin/env bash
set -euo pipefail

if ! command -v codex >/dev/null 2>&1; then
  echo "Codex CLI is required to install the global Cloudflare MCP configuration." >&2
  exit 1
fi

npx -y skills add cloudflare/skills --skill '*' --yes --global

ensure_server() {
  local name="$1"
  local url="$2"
  if codex mcp get "${name}" >/dev/null 2>&1; then
    return
  fi
  codex mcp add "${name}" --url "${url}"
}

ensure_server cloudflare https://mcp.cloudflare.com/mcp
ensure_server cloudflare-docs https://docs.mcp.cloudflare.com/mcp
ensure_server cloudflare-bindings https://bindings.mcp.cloudflare.com/mcp
ensure_server cloudflare-builds https://builds.mcp.cloudflare.com/mcp
ensure_server cloudflare-observability https://observability.mcp.cloudflare.com/mcp

codex mcp login cloudflare

echo "Cloudflare skills and MCP servers are installed. Restart the agent to load them."
