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

test("production adapters cannot import alternate mutation authorities", () => {
  const forbidden = [
    "runAvaClassic",
    "dispatchCanonicalCommand",
    "prepareOrder",
    "confirmOrder",
    "cancelPreparedOrder",
    "executeAvaAction",
    "executeAvaPlan",
    "runAvaInstruction",
  ];
  for (const path of [
    "app/GameClient.tsx",
    "app/substrate/mcp-seam.ts",
    "packages/ssh-server/src/server.ts",
    "packages/ssh-gateway/src/session.ts",
  ]) {
    const source = readFileSync(resolve(path), "utf8");
    for (const identifier of forbidden)
      assert.doesNotMatch(
        source,
        new RegExp(`\\b${identifier}\\b`),
        `${path} imports ${identifier}`,
      );
  }
  const publicIndex = readFileSync(resolve("app/substrate/index.ts"), "utf8");
  assert.doesNotMatch(publicIndex, /export \* from ["']\.\/services["']/);
  assert.doesNotMatch(publicIndex, /export \* from ["']\.\/ava-classic["']/);
});

test("browser Ava and graphical campaign mutations enter the Nexus", () => {
  const source = readFileSync(resolve("app/GameClient.tsx"), "utf8");
  assert.match(source, /runAvaNexusLine/);
  assert.match(source, /runAvaNexusRequest/);
  assert.match(source, /executeAvaActionRequest/);
  assert.match(source, /executeAvaPlanRequest/);
  assert.match(source, /prepareAvaActionRequest/);
  assert.match(source, /operation:"reconcile-opportunity"/);
  assert.match(source, /operation:"force-opportunity"/);
  assert.match(
    source,
    /await persistCampaignSnapshotNow\(\)[\s\S]{0,900}expectedRevision:campaignRevisionRef\.current[\s\S]{0,220}expectedStateSeal:avaRequestStateSeal\(target\)/,
  );
  assert.match(
    source,
    /const redeemTurnGrant=[\s\S]{0,900}fetch\("\/api\/turn",\{[\s\S]{0,120}method:"PUT"/,
  );
  assert.match(source,/isAvaConfirmationInput\(raw\)/);
  const redemption=source.slice(
    source.indexOf("const redeemTurnGrant="),
    source.indexOf("const advance = useCallback"),
  );
  assert.match(redemption,/response\.status===409/);
  assert.match(redemption,/DAILY_RESOLUTION_STATE_CHANGED/);
  assert.match(redemption,/authoritative state is now loaded/);
  const advance=source.slice(
    source.indexOf("const advance = useCallback"),
    source.indexOf("useEffect(() => {",source.indexOf("const advance = useCallback")),
  );
  assert.match(advance,/await redeemTurnGrant\(claim\.resolutionGrant!\)/);
  assert.doesNotMatch(advance,/runBrowserNexusRequest/);
  const textConfirmation=source.slice(
    source.indexOf("const pendingConfirmation="),
    source.indexOf("let darkNetContext: AvaDarkNetContext"),
  );
  assert.match(
    textConfirmation,
    /pendingConfirmation\?\.stateRevision!==[\s\S]{0,80}avaRequestStateSeal\(liveStateRef\.current\)/,
  );
  assert.match(textConfirmation,/confirmation:null,[\s\S]{0,60}plan:\[\]/);
  assert.match(textConfirmation,/await redeemTurnGrant\(claim\.resolutionGrant!\)/);
  assert.doesNotMatch(textConfirmation,/runAvaNexusRequest/);
  assert.doesNotMatch(source, /\bcompileAvaCommand\b/);
  assert.doesNotMatch(source, /\brunAvaInstruction\b/);
  assert.doesNotMatch(source, /\bforceOpportunityForCurrentDay\b/);
  assert.doesNotMatch(source, /\brecordOpportunity(?:Opened|Expired)\b/);
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
