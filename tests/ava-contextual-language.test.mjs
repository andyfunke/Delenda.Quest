import assert from "node:assert/strict";
import test from "node:test";

const language = await import(process.env.DELENDA_AVA_CONTEXTUAL_BUNDLE);
const projection = await import(process.env.DELENDA_AVA_CONTEXTUAL_PROJECTION_BUNDLE);
const compiler = await import(process.env.DELENDA_AVA_COMPILER_BUNDLE);
const requestIr = await import(process.env.DELENDA_AVA_REQUEST_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);
const nexus = await import(process.env.DELENDA_AVA_NEXUS_BUNDLE);
const terminal = await import(process.env.DELENDA_TERMINAL_CORE_BUNDLE);

const entities = [
  { id: "front", kind: "metric", label: "Campaign Front" },
  { id: "readiness", kind: "metric", label: "Readiness" },
  { id: "supply", kind: "metric", label: "Supply" },
  { id: "network", kind: "metric", label: "Network" },
  { id: "intelligence", kind: "metric", label: "Intelligence" },
  { id: "armed", kind: "metric", label: "Armed Forces" },
  { id: "reserve", kind: "metric", label: "Replacement Reserve" },
  { id: "formation", kind: "metric", label: "Formation" },
  { id: "position", kind: "metric", label: "Current Position" },
  { id: "route", kind: "metric", label: "Operational Route" },
  { id: "opening", kind: "metric", label: "Operational Opening" },
  { id: "pressure", kind: "metric", label: "Battlefield Pressure" },
  { id: "campaign-synopsis", kind: "mission", label: "Campaign Objective" },
];

const compilerContext = (state, contextual) => ({
  currentModule: "campaign",
  entities,
  language: contextual ?? projection.buildAvaContextualLanguage(state, entities),
});

const contextFor = (state, surface = "web") => ({
  playerId: "contextual-language-test",
  campaignId: state.campaignId,
  campaignRevision: nexus.avaNexusStateRevision(state),
  surface,
  authority: "observer",
  nowMs: 1_700_010_000_000,
});

test("the contextual contract is versioned, normalized, and content-addressed", () => {
  const state = game.initialState({ seed: 1729 });
  const before = structuredClone(state);
  const projected = projection.buildAvaContextualLanguage(state, entities);
  assert.equal(projected.version, "ava-contextual-language/v1");
  assert.equal(
    projected.digest,
    language.contextualLanguageDigest(projected),
  );
  assert.deepEqual(state, before);
  assert.ok(projected.entries.length > 20);
  assert.ok(projected.entries.every((entry) => entry.aliases.length));
  assert.ok(
    projected.entries.every((entry) =>
      (entry.evidence ?? []).every((item) => item.excerpt.length <= 280),
    ),
  );
});

test("contextual surface normalization and runtime validation fail closed", () => {
  assert.equal(language.normalizeAvaLanguageSurface("GAIN TERRITORY"), "gain territory");
  assert.equal(language.normalizeAvaLanguageSurface("Gain-Territory"), "gain territory");
  assert.equal(language.normalizeAvaLanguageSurface("gain, territory"), "gain territory");
  assert.equal(language.normalizeAvaLanguageSurface("  advance  "), "advance");
  assert.equal(language.normalizeAvaLanguageSurface("enemy-position"), "enemy position");
  assert.equal(language.normalizeAvaLanguageSurface("KM"), "km");
  assert.equal(language.normalizeAvaLanguageSurface("commander’s order"), "commander's order");

  assert.doesNotThrow(() => language.validateContextualLanguage(
    projection.buildAvaContextualLanguage(
      game.initialState({ seed: 1729 }),
      entities,
    ),
  ));
  assert.throws(() => language.validateLanguageEntries([
    {
      id: "bad.priority",
      route: "PRIORITY_FOCUS",
      label: "Bad priority",
      aliases: ["bad priority"],
      source: "STATIC_CATALOG",
      provenance: ["test"],
    },
  ]));
});

test("authored references are indexed only from visible current briefing text", () => {
  const state = game.initialState({ seed: 1729 });
  const absent = projection.buildAvaContextualLanguage(state, entities);
  assert.equal(
    absent.entries.some((entry) =>
      entry.aliases.some((alias) => alias === "future freedom"),
    ),
    false,
  );
  const altered = {
    ...state,
    currentSituation: {
      ...state.currentSituation,
      briefing: "Future freedom is an authored phrase in this visible briefing.",
    },
  };
  const present = projection.buildAvaContextualLanguage(altered, entities);
  const entry = present.entries.find((candidate) =>
    candidate.aliases.includes("future freedom"),
  );
  assert.ok(entry);
  assert.equal(entry.source, "AUTHORED_BRIEF");
  assert.equal(entry.route, "NARRATIVE_REFERENCE");
  assert.match(entry.evidence[0].excerpt, /Future freedom/);
});

test("the static catalog owns the packet's declared read-only vocabulary", () => {
  const state = game.initialState({ seed: 1729 });
  const projected = projection.buildAvaContextualLanguage(state, entities);
  const ownerBySurface = new Map();
  for (const entry of projected.entries.filter((candidate) => candidate.source === "STATIC_CATALOG")) {
    for (const alias of entry.aliases) {
      const normalized = language.normalizeAvaLanguageSurface(alias);
      assert.equal(ownerBySurface.has(normalized), false, normalized);
      ownerBySurface.set(normalized, entry.id);
    }
  }
  for (const [surface, expected] of new Map([
    ["gain ground", "priority.territory"],
    ["advance", "priority.advance"],
    ["front", "metric.front-movement"],
    ["frontline", "metric.front-movement"],
    ["km", "metric.front-movement"],
    ["enemy position", "report.adversary"],
    ["condition", "report.overview"],
    ["goals", "objective.current"],
    ["strategy", "advice.strategy"],
  ])) {
    assert.equal(ownerBySurface.get(surface), expected, surface);
  }
  const changed = projected.entries.map((entry) =>
    entry.id === "priority.territory"
      ? { ...entry, label: `${entry.label} changed` }
      : entry,
  );
  assert.notEqual(
    projected.digest,
    language.contextualLanguageDigest({
      version: projected.version,
      stateRevision: projected.stateRevision,
      contentRevision: projected.contentRevision,
      entries: changed,
    }),
  );
});

test("declared contextual aliases lower to existing typed instruction kinds", () => {
  const state = game.initialState({ seed: 1729 });
  const contextual = projection.buildAvaContextualLanguage(state, entities);
  const expected = new Map([
    ["gain territory", ["ADVISE", "PRIORITY_FOCUS"]],
    ["advance", ["ADVISE", "PRIORITY_FOCUS"]],
    ["enemy position", ["REPORT", "REPORT"]],
    ["readiness", ["EXPLAIN", "METRIC_EXPLANATION"]],
    ["what is the objective", ["EXPLAIN", "OBJECTIVE_EXPLANATION"]],
  ]);
  for (const [raw, [kind, route]] of expected) {
    const result = compiler.compileAvaCommand(raw, compilerContext(state, contextual));
    assert.equal(result.status, "compiled", raw);
    assert.equal(result.instruction.kind, kind, raw);
    assert.equal(result.instruction.contextual.route, route, raw);
  }
  const stage = compiler.compileAvaCommand(
    "stage advance",
    compilerContext(state, contextual),
  );
  assert.equal(stage.status, "clarify");
  assert.equal(stage.failure, "missing-target");
  const negated = compiler.compileAvaCommand(
    "do not advance",
    compilerContext(state, contextual),
  );
  assert.equal(negated.status, "clarify");
  assert.equal(negated.failure, "unsupported-combination");
});

test("runtime request validation accepts contextual bindings but rejects open shapes", () => {
  const state = game.initialState({ seed: 1729 });
  const result = compiler.compileAvaCommand(
    "gain territory",
    compilerContext(state),
  );
  assert.equal(result.status, "compiled");
  const request = {
    kind: "instruction",
    origin: "browser-text",
    rawInput: "gain territory",
    instruction: result.instruction,
    semantic: result.semantic,
    trace: result.trace,
    expectedStateSeal: nexus.avaNexusStateRevision(state),
  };
  assert.equal(requestIr.validateAvaRequestIR(request).ok, true);
  assert.equal(
    requestIr.validateAvaRequestIR({
      ...request,
      instruction: {
        ...result.instruction,
        contextual: { ...result.instruction.contextual, injected: true },
      },
    }).ok,
    false,
  );
});

test("web and native terminal surfaces preserve the same contextual read", () => {
  const state = game.initialState({ seed: 9191, theater: "lowland" });
  const web = nexus.runAvaNexusLine(
    "gain territory",
    contextFor(state, "web"),
    state,
    nexus.createAvaNexusSession(),
  );
  const ssh = terminal.runTerminalLine(
    "gain territory",
    contextFor(state, "ssh"),
    state,
    terminal.createTerminalSession(),
  );
  assert.equal(web.response.status, "OK");
  assert.equal(ssh.text, web.text);
  assert.equal(ssh.proofGraph.digest, web.proofGraph.digest);
  assert.deepEqual(ssh.state, state);
});
