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

test("intrusion content is package-owned and Ava remains an adapter", () => {
  for (const path of [
    "packages/intrusion-library/src/schema.ts",
    "packages/intrusion-library/src/compiler.ts",
    "packages/intrusion-library/src/catalog/index.ts",
    "packages/intrusion-library/src/catalog/authentication-drift.ts",
  ]) {
    const source = readFileSync(resolve(path), "utf8");
    assert.doesNotMatch(source, /(?:from|import)\s+["'][^"']*(?:app\/|GameState|ava\/)/, path);
  }
  const adapter = readFileSync(resolve("app/ava/hacking.ts"), "utf8");
  assert.match(adapter, /compileIntrusionIncident/);
  assert.doesNotMatch(adapter, /const RELAY_NODES|authorizedKeysCsv\s*=|observedKeysCsv\s*=/);
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

test("the shared substrate is the named owner of gates, draw hash, and vocabulary", () => {
  const core = readFileSync(resolve("app/substrate/substrate-core.ts"), "utf8");
  assert.match(core, /SHARED_SUBSTRATE_VERSION/);
  assert.match(core, /from "\.\/gates"/);
  assert.match(core, /from "\.\/hash"/);
  assert.match(core, /export \* from "\.\/vocabulary"/);
  for (const path of [
    "app/campaign-substrate.ts",
    "app/game.ts",
    "app/submission-schema.ts",
  ]) {
    const source = readFileSync(resolve(path), "utf8");
    assert.match(source, /from "\.\/substrate\/substrate-core"/, path);
    assert.doesNotMatch(source, /2166136261/, `${path} forks the draw hash`);
  }
  const campaign = readFileSync(resolve("app/campaign-substrate.ts"), "utf8");
  assert.doesNotMatch(campaign, /from "\.\/substrate\/gates"/);
  assert.doesNotMatch(campaign, /from "\.\/substrate\/hash"/);
  for (const path of [
    "app/ava/contextual-language.ts",
    "app/ava/contextual-language-catalog.ts",
    "app/ava/contextual-language-priorities.ts",
  ]) {
    const source = readFileSync(resolve(path), "utf8");
    assert.doesNotMatch(source, /from "\.\.\/substrate\/gates"/, path);
  }
});

test("the promoted execution-scene manifest informs the live draw", () => {
  const source = readFileSync(resolve("app/game.ts"), "utf8");
  assert.match(source, /promotedExecutionRecipePool/);
  assert.match(source, /recipePool:EXECUTION_RECIPE_POOL/);
});

test("legacy control-plane artifacts are explicitly demoted", () => {
  const markers = [
    ["app/substrate/command-parser.ts", "COMMAND_PARSER_REFERENCE_ONLY"],
    ["app/substrate/services.ts", "SERVICES_DISPATCH_REFERENCE_ONLY"],
    ["app/substrate/semantic-index.ts", "SEMANTIC_INDEX_REFERENCE_ONLY"],
    ["app/substrate/llm-packets.ts", "LLM_PACKETS_FUTURE_SEAM_ONLY"],
    ["app/substrate/mcp-seam.ts", "MCP_SEAM_FUTURE_ONLY"],
  ];
  for (const [path, marker] of markers) {
    assert.match(readFileSync(resolve(path), "utf8"), new RegExp(marker), path);
  }
  const terminalIndex = readFileSync(
    resolve("packages/terminal-core/src/index.ts"),
    "utf8",
  );
  assert.doesNotMatch(terminalIndex, /\.\/parser/);
  for (const path of [
    "packages/terminal-core/src/index.ts",
    "packages/terminal-core/src/session.ts",
    "packages/terminal-core/src/renderer.ts",
  ]) {
    const source = readFileSync(resolve(path), "utf8");
    assert.doesNotMatch(source, /\bparseDelendaCommand\b/, path);
  }
  const nexus = readFileSync(resolve("app/ava/nexus.ts"), "utf8");
  assert.doesNotMatch(nexus, /Kernel/);
  assert.throws(() => readFileSync(resolve("app/ava/kernel.ts")));
});

test("adapters cannot consume demoted read services or the reference parser", () => {
  const forbidden = [
    "getDailyBrief",
    "getCampaignStatus",
    "rankVisibleChoices",
    "listDirectiveFamilyCatalog",
    "parseDelendaCommand",
  ];
  for (const path of [
    "app/GameClient.tsx",
    "app/substrate/mcp-seam.ts",
    "packages/ssh-server/src/server.ts",
    "packages/ssh-gateway/src/session.ts",
    "packages/terminal-core/src/session.ts",
  ]) {
    const source = readFileSync(resolve(path), "utf8");
    for (const identifier of forbidden)
      assert.doesNotMatch(
        source,
        new RegExp(`\\b${identifier}\\b`),
        `${path} references ${identifier}`,
      );
  }
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
