import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mcp = await import(process.env.DELENDA_SUBSTRATE_MCP_BUNDLE);

test("future MCP tools map to exactly one application service name", () => {
  const missing = mcp.assertMcpSeam();
  assert.deepEqual(missing, []);
  for (const tool of Object.keys(mcp.FUTURE_MCP_TOOLS)) {
    assert.equal(typeof mcp.mcpToolServiceName(tool), "string");
  }
});

test("mcp seam module does not import web or ssh adapters", () => {
  const source = readFileSync(
    resolve("app/substrate/mcp-seam.ts"),
    "utf8",
  );
  assert.equal(/\bfrom\s+["'][^"']*GameClient/.test(source), false);
  assert.equal(/\bfrom\s+["'][^"']*BriefingInterface/.test(source), false);
  assert.equal(/\bfrom\s+["'][^"']*ssh-server/.test(source), false);
  assert.equal(/\bimport\s+["'][^"']*GameClient/.test(source), false);
});

test("ssh server does not import GameClient or BriefingInterface", () => {
  const source = readFileSync(
    resolve("packages/ssh-server/src/server.ts"),
    "utf8",
  );
  assert.equal(source.includes("GameClient"), false);
  assert.equal(source.includes("BriefingInterface"), false);
});

test("doctrine and docs exist", () => {
  for (const path of [
    "SUBSTRATE_DOCTRINE.md",
    "docs/substrate/architecture.md",
    "docs/substrate/directive-migration.md",
    "docs/substrate/grammar.md",
    "docs/substrate/implementation-map.md",
    "docs/ssh/architecture.md",
    "docs/ssh/local-development.md",
    "docs/ssh/security.md",
    "docs/ssh/user-commands.md",
  ]) {
    assert.ok(readFileSync(resolve(path), "utf8").length > 20, path);
  }
  const agents = readFileSync(resolve("AGENTS.md"), "utf8");
  assert.match(agents, /SUBSTRATE_DOCTRINE\.md/);
});
