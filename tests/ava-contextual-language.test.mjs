import assert from "node:assert/strict";
import test from "node:test";

const language = await import(process.env.DELENDA_AVA_CONTEXTUAL_BUNDLE);
const projection = await import(process.env.DELENDA_AVA_CONTEXTUAL_PROJECTION_BUNDLE);
const compiler = await import(process.env.DELENDA_AVA_COMPILER_BUNDLE);
const requestIr = await import(process.env.DELENDA_AVA_REQUEST_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);
const nexus = await import(process.env.DELENDA_AVA_NEXUS_BUNDLE);
const terminal = await import(process.env.DELENDA_TERMINAL_CORE_BUNDLE);
const gameContext = await import(process.env.DELENDA_AVA_CONTEXT_BUNDLE);
const sshGateway = process.env.DELENDA_SSH_GATEWAY_BUNDLE
  ? await import(process.env.DELENDA_SSH_GATEWAY_BUNDLE)
  : null;

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

const surfaceVariants = (phrase) => [
  phrase,
  phrase.toUpperCase(),
  phrase.replaceAll(" ", "-"),
  phrase.replace(/\s+/g, "   "),
  phrase.includes(" ") ? phrase.replaceAll(" ", ", ") : `${phrase}!`,
];

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

test("declared priority lowering is bounded and deterministic", () => {
  const state = game.initialState({ seed: 1729 });
  const focus = compiler.compileDeclaredPriorityFocus(
    ["initiative", "territorial_control"],
    "advance",
  );
  assert.deepEqual(focus.axes, ["territorial_control", "initiative"]);
  assert.ok(focus.criteria.length > 0);
  assert.deepEqual(
    focus,
    compiler.compileDeclaredPriorityFocus(
      ["initiative", "territorial_control"],
      "advance",
    ),
  );
  assert.throws(() => compiler.validateDeclaredPriorityAxes([]));
  assert.throws(() => compiler.validateDeclaredPriorityAxes([
    "initiative",
    "initiative",
  ]));
  assert.throws(() => compiler.validateDeclaredPriorityAxes([
    "initiative",
    "territorial_control",
    "force_preservation",
    "supply_integrity",
    "production_integrity",
  ]));
  assert.doesNotThrow(() => projection.buildAvaContextualLanguage(
    state,
    entities,
  ));
});

test("objective projection is visible, non-actionable, and absent when no situation is persisted", () => {
  const state = game.initialState({ seed: 1729 });
  const visibleEntities = gameContext.avaEntitiesForState(state);
  const objective = visibleEntities.find((entity) => entity.id === "campaign-synopsis");
  assert.ok(objective);
  assert.equal(objective.action, undefined);
  assert.ok(objective.aliases.includes("goals"));

  const projected = projection.buildAvaContextualLanguage(state, visibleEntities);
  assert.ok(projected.entries.some((entry) => entry.id === "objective.current"));
  assert.equal(JSON.stringify(projected).includes("resolutionTicket"), false);
  assert.equal(JSON.stringify(projected).includes("hiddenOrders"), false);

  const withoutSituation = { ...state, currentSituation: null };
  const staticOnly = projection.buildAvaContextualLanguage(
    withoutSituation,
    visibleEntities,
  );
  assert.equal(staticOnly.entries.some((entry) => entry.source === "CURRENT_SITUATION"), false);
  assert.equal(staticOnly.entries.some((entry) => entry.source === "CURRENT_ACTION"), false);
  assert.equal(staticOnly.entries.some((entry) => entry.source === "AUTHORED_BRIEF"), false);
});

test("declared contextual aliases lower to existing typed instruction kinds", () => {
  const state = game.initialState({ seed: 1729 });
  const contextual = projection.buildAvaContextualLanguage(state, entities);
  const expected = new Map([
    ["gain territory", ["ADVISE", "PRIORITY_FOCUS"]],
    ["gain ground", ["ADVISE", "PRIORITY_FOCUS"]],
    ["advance", ["ADVISE", "PRIORITY_FOCUS"]],
    ["front", ["EXPLAIN", "METRIC_EXPLANATION"]],
    ["frontline", ["EXPLAIN", "METRIC_EXPLANATION"]],
    ["kilometers", ["EXPLAIN", "METRIC_EXPLANATION"]],
    ["KM", ["EXPLAIN", "METRIC_EXPLANATION"]],
    ["enemy position", ["REPORT", "REPORT"]],
    ["condition", ["REPORT", "REPORT"]],
    ["attrition", ["REPORT", "REPORT"]],
    ["strategy", ["ADVISE", "STRATEGIC_ADVICE"]],
    ["goals", ["EXPLAIN", "OBJECTIVE_EXPLANATION"]],
    ["readiness", ["EXPLAIN", "METRIC_EXPLANATION"]],
    ["what is the objective", ["EXPLAIN", "OBJECTIVE_EXPLANATION"]],
  ]);
  for (const [raw, [kind, route]] of expected) {
    const result = compiler.compileAvaCommand(raw, compilerContext(state, contextual));
    assert.equal(result.status, "compiled", raw);
    assert.equal(result.instruction.kind, kind, raw);
    assert.equal(result.instruction.contextual.route, route, raw);
    assert.match(result.trace.rule, /^CONTEXTUAL_LANGUAGE:/, raw);
    assert.equal(result.trace.exactIndexHit, true, raw);
    assert.notEqual(result.semantic.subject.type, "UNKNOWN", raw);
  }
  assert.notEqual(
    compiler.compileAvaCommand(
      "please gain territory",
      compilerContext(state, contextual),
    ).trace.rule,
    "CONTEXTUAL_LANGUAGE:priority.territory",
  );
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

test("the real Nexus routes the complete contextual corpus without mutation", () => {
  const expected = new Map([
    ["gain territory", ["ADVISE", "PRIORITY_FOCUS", undefined, undefined]],
    ["advance", ["ADVISE", "PRIORITY_FOCUS", undefined, undefined]],
    ["front", ["EXPLAIN", "METRIC_EXPLANATION", undefined, "front"]],
    ["kilometers", ["EXPLAIN", "METRIC_EXPLANATION", undefined, "front"]],
    ["KM", ["EXPLAIN", "METRIC_EXPLANATION", undefined, "front"]],
    ["enemy position", ["REPORT", "REPORT", "adversary", undefined]],
    ["condition", ["REPORT", "REPORT", "overview", undefined]],
    ["attrition", ["REPORT", "REPORT", "losses", undefined]],
    ["goals", ["EXPLAIN", "OBJECTIVE_EXPLANATION", undefined, "campaign-synopsis"]],
    ["strategy", ["ADVISE", "STRATEGIC_ADVICE", undefined, undefined]],
  ]);
  for (const [raw, [kind, route, topic, entityId]] of expected) {
    const state = game.initialState({ seed: 1729 });
    const beforeState = structuredClone(state);
    const session = nexus.createAvaNexusSession();
    const beforePlan = structuredClone(session.terminal.plan);
    const result = nexus.runAvaNexusLine(
      raw,
      contextFor(state, "web"),
      state,
      session,
    );
    assert.equal(result.compile?.status, "compiled", raw);
    assert.equal(result.compile.instruction.kind, kind, raw);
    assert.equal(result.compile.instruction.contextual.route, route, raw);
    assert.equal(result.compile.instruction.topic, topic, raw);
    assert.equal(result.compile.instruction.entity?.id, entityId, raw);
    assert.match(result.compile.trace.rule, /^CONTEXTUAL_LANGUAGE:/, raw);
    assert.deepEqual(result.state, beforeState, raw);
    assert.deepEqual(result.session.terminal.plan, beforePlan, raw);
    assert.equal(result.state.day, beforeState.day, raw);
    assert.equal(result.state.actions, beforeState.actions, raw);
    assert.deepEqual(result.state.decisions, beforeState.decisions, raw);
    assert.deepEqual(result.state.preparedOrders, beforeState.preparedOrders, raw);
  }
});

test("consequential and negated neighbors never become contextual advice", () => {
  for (const raw of [
    "stage advance",
    "prepare gain territory",
    "issue advance",
    "do not advance",
    "confirm advance",
    "resolve the front",
  ]) {
    const state = game.initialState({ seed: 1729 });
    const beforeState = structuredClone(state);
    const session = nexus.createAvaNexusSession();
    const beforePlan = structuredClone(session.terminal.plan);
    const result = nexus.runAvaNexusLine(
      raw,
      contextFor(state, "web"),
      state,
      session,
    );
    assert.notEqual(result.compile?.instruction?.kind, "ADVISE", raw);
    assert.deepEqual(result.state, beforeState, raw);
    assert.deepEqual(result.session.terminal.plan, beforePlan, raw);
  }
});

test("typed operational owners remain exact, disclosed, and non-actionable", () => {
  const state = game.initialState({ seed: 1729 });
  const before = structuredClone(state);
  const contextual = projection.buildAvaContextualLanguage(
    state,
    gameContext.avaEntitiesForState(state),
  );
  const expected = new Map([
    ["formation", "formation"],
    ["FORMATION", "formation"],
    ["formation-", "formation"],
    ["reserve", "reserve"],
    ["replacement reserve", "reserve"],
    ["route", "route"],
    ["supply-route", "route"],
    ["opening", "opening"],
    ["breakthrough opening", "opening"],
  ]);
  for (const [raw, entityId] of expected) {
    const result = compiler.compileAvaCommand(
      raw,
      compilerContext(state, contextual),
    );
    assert.equal(result.status, "compiled", raw);
    assert.equal(result.instruction.kind, "EXPLAIN", raw);
    assert.equal(result.instruction.contextual.entityId, entityId, raw);
    assert.equal(result.instruction.entity.id, entityId, raw);
    assert.equal(result.instruction.entity.action, undefined, raw);
    assert.match(result.trace.rule, /^CONTEXTUAL_LANGUAGE:/, raw);
  }
  assert.deepEqual(state, before);
  assert.doesNotMatch(JSON.stringify(contextual), /resolutionTicket|hiddenOrders|actionHandler/);
});

test("maneuver evidence is projected by stable identity with exact source order", () => {
  const state = game.initialState({ seed: 1729 });
  const before = structuredClone(state);
  const records = projection.projectAvaAuthoredManeuverEvidence(state);
  assert.ok(records.length > 0);
  assert.ok(records.every((record) => record.maneuverId && record.provenance.length));
  assert.ok(records.every((record) => record.labelEvidence?.phrase === record.label));
  assert.ok(records.every((record) => record.presentationEvidence?.section === "maneuver-presentation"));
  assert.ok(records.every((record) => record.rationaleEvidence?.section === "maneuver-rationale"));
  assert.doesNotMatch(JSON.stringify(records), /resolutionTicket|hiddenOrders|realizationId|successPressure/);

  const contextual = projection.buildAvaContextualLanguage(
    state,
    gameContext.avaEntitiesForState(state),
  );
  const same = projection.buildAvaContextualLanguage(
    structuredClone(state),
    gameContext.avaEntitiesForState(state),
  );
  assert.equal(contextual.digest, same.digest);
  const record = records[0];
  for (const kind of ["maneuver-label", "maneuver-rationale", "maneuver-presentation"]) {
    const candidate = contextual.entries.find(
      (entry) => entry.maneuverId === record.maneuverId && entry.evidenceKind === kind,
    );
    assert.ok(candidate, `${record.maneuverId}/${kind}`);
    assert.ok(candidate.evidence?.some((item) => item.section === kind));
    const result = compiler.compileAvaCommand(
      candidate.label,
      compilerContext(state, contextual),
    );
    assert.equal(result.status, "compiled", `${record.maneuverId}/${kind}`);
    assert.equal(result.instruction.kind, "EXPLAIN");
    assert.equal(result.instruction.contextual.route, "NARRATIVE_REFERENCE");
    assert.equal(result.instruction.contextual.maneuverId, record.maneuverId);
    assert.equal(result.trace.maneuverId, record.maneuverId);
    assert.ok(result.trace.authoredEvidence?.length);
    assert.equal(result.trace.exactIndexHit, true);
  }
  assert.deepEqual(state, before);
});

test("authored maneuver references preserve static precedence and structured availability", () => {
  const state = game.initialState({ seed: 1729 });
  const contextual = projection.buildAvaContextualLanguage(
    state,
    gameContext.avaEntitiesForState(state),
  );
  const staticWinner = compiler.compileAvaCommand(
    "advance",
    compilerContext(state, contextual),
  );
  assert.equal(staticWinner.status, "compiled");
  assert.equal(staticWinner.instruction.contextual.entryId, "priority.advance");

  const unavailable = compiler.compileAvaCommand(
    "future freedom",
    compilerContext(state, contextual),
  );
  assert.equal(unavailable.status, "clarify");
  assert.equal(unavailable.failure, "AUTHORED_REFERENCE_UNAVAILABLE");
  assert.equal(unavailable.trace.availability, "UNAVAILABLE");
  assert.equal(unavailable.trace.declarationId, "declared.authored.future-freedom");
  assert.equal(unavailable.trace.exactIndexHit, false);
  assert.match(unavailable.prompt, /not present in the current disclosed authored briefing/i);

  const altered = {
    ...state,
    currentSituation: {
      ...state.currentSituation,
      briefing: "Future freedom is an authored phrase in this visible briefing.",
    },
  };
  const present = projection.buildAvaContextualLanguage(
    altered,
    gameContext.avaEntitiesForState(altered),
  );
  const available = compiler.compileAvaCommand(
    "FUTURE-FREEDOM",
    compilerContext(altered, present),
  );
  assert.equal(available.status, "compiled");
  assert.equal(available.instruction.contextual.route, "NARRATIVE_REFERENCE");
  assert.equal(available.trace.availability, "AVAILABLE");
  assert.match(available.instruction.contextual.evidence[0].excerpt, /Future freedom/);
});

test("authored identity collisions are deterministic ambiguity, not action selection", () => {
  const state = game.initialState({ seed: 1729 });
  const ambiguousLanguage = language.sealAvaContextualLanguage({
    stateRevision: "test-state",
    contentRevision: "test-content",
    entries: [
      {
        id: "maneuver.a.reference",
        route: "NARRATIVE_REFERENCE",
        label: "Shared line",
        aliases: ["shared line"],
        source: "AUTHORED_BRIEF",
        entityId: "campaign-synopsis",
        maneuverId: "a",
        maneuverLabel: "Shared line",
        evidenceKind: "maneuver-label",
        provenance: ["test.a"],
        evidence: [{ section: "maneuver-label", phrase: "Shared line", excerpt: "Shared line" }],
      },
      {
        id: "maneuver.b.reference",
        route: "NARRATIVE_REFERENCE",
        label: "Shared line",
        aliases: ["shared line"],
        source: "AUTHORED_BRIEF",
        entityId: "campaign-synopsis",
        maneuverId: "b",
        maneuverLabel: "Shared line",
        evidenceKind: "maneuver-label",
        provenance: ["test.b"],
        evidence: [{ section: "maneuver-label", phrase: "Shared line", excerpt: "Shared line" }],
      },
    ],
  });
  const result = compiler.compileAvaCommand(
    "shared line",
    compilerContext(state, ambiguousLanguage),
  );
  assert.equal(result.status, "clarify");
  assert.equal(result.failure, "ambiguous-target");
  assert.equal(result.trace.exactIndexHit, true);
  assert.deepEqual(result.trace.contextualCandidates, [
    "maneuver.a.reference",
    "maneuver.b.reference",
  ]);
  assert.equal(result.trace.maneuverId, undefined);
});

test("maneuver references render exact evidence and preserve web-terminal-native-SSH parity", () => {
  assert.ok(sshGateway);
  const state = game.initialState({ seed: 1729 });
  const before = structuredClone(state);
  const entitiesForState = gameContext.avaEntitiesForState(state);
  const contextual = projection.buildAvaContextualLanguage(state, entitiesForState);
  const entry = contextual.entries.find(
    (candidate) => candidate.evidenceKind === "maneuver-presentation",
  );
  assert.ok(entry);

  const contextForSurface = (surface) => ({
    playerId: "epoch-003-parity",
    campaignId: state.campaignId,
    campaignRevision: nexus.avaNexusStateRevision(state),
    surface,
    authority: "observer",
    nowMs: 1_700_010_000_000,
  });
  const web = nexus.runAvaNexusLine(
    entry.label,
    contextForSurface("web"),
    state,
    nexus.createAvaNexusSession(),
  );
  const terminalResult = terminal.runTerminalLine(
    entry.label,
    contextForSurface("ssh"),
    state,
    terminal.createTerminalSession(),
  );
  const sshResult = sshGateway.executeNativeSshGatewayLine({
    raw: entry.label,
    state,
    session: nexus.createAvaNexusSession(),
    playerId: "epoch-003-parity",
    nowMs: 1_700_010_000_000,
  });
  assert.equal(web.compile.status, "compiled");
  assert.equal(web.compile.instruction.contextual.route, "NARRATIVE_REFERENCE");
  assert.match(web.text, /MANEUVER REFERENCE/);
  assert.match(web.text, new RegExp(entry.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(web.text, /AUTHORED LANGUAGE/);
  assert.equal(terminalResult.text, web.text);
  assert.equal(sshResult.publicResult.text, web.text);
  assert.equal(sshResult.publicResult.cognitiveAttestation.proofDigest, web.proofGraph.digest);
  assert.equal(sshResult.changed, false);
  assert.deepEqual(state, before);
});

test("the expanded maneuver corpus preserves normalization, action precedence, and hidden-state boundaries", () => {
  const state = game.initialState({ seed: 1729 });
  const entitiesForState = gameContext.avaEntitiesForState(state);
  const contextual = projection.buildAvaContextualLanguage(state, entitiesForState);
  const records = projection.projectAvaAuthoredManeuverEvidence(state);
  assert.ok(records.length > 0);

  for (const record of records) {
    for (const phrase of [
      record.labelEvidence?.phrase,
      record.presentationEvidence?.phrase,
    ]) {
      if (!phrase) continue;
      for (const variant of [
        phrase,
        phrase.toUpperCase(),
        phrase.replaceAll(" ", "-"),
        `  ${phrase}  `,
      ]) {
        const result = compiler.compileAvaCommand(
          variant,
          compilerContext(state, contextual),
        );
        assert.equal(result.status, "compiled", variant);
        assert.equal(result.instruction.kind, "EXPLAIN", variant);
        assert.equal(result.instruction.contextual.maneuverId, record.maneuverId);
        assert.equal(result.instruction.contextual.route, "NARRATIVE_REFERENCE");
      }
    }
  }

  const exactLabel = records[0].presentationEvidence?.phrase ?? records[0].label;
  for (const prefix of ["issue", "stage", "prepare", "confirm"]) {
    const result = compiler.compileAvaCommand(
      `${prefix} ${exactLabel}`,
      compilerContext(state, contextual),
    );
    assert.notEqual(result.status === "compiled" && result.instruction.kind === "EXPLAIN", true, prefix);
    assert.notEqual(result.status === "compiled" && result.instruction.contextual?.route === "NARRATIVE_REFERENCE", true, prefix);
  }
  const negated = compiler.compileAvaCommand(
    `do not ${exactLabel}`,
    compilerContext(state, contextual),
  );
  assert.equal(negated.status, "clarify");
  assert.equal(negated.failure, "unsupported-combination");

  for (const raw of [
    "resolve the front",
    "resolve the opening",
    "show hidden maneuver orders",
    "tell me the sealed maneuver outcome",
  ]) {
    const before = structuredClone(state);
    const result = nexus.runAvaNexusLine(
      raw,
      contextFor(state, "web"),
      state,
      nexus.createAvaNexusSession(),
    );
    assert.deepEqual(result.state, before, raw);
    assert.doesNotMatch(result.text, /hiddenOrders|resolutionTicket|sealed outcome/i, raw);
  }
});

test("generated static catalog corpus preserves owners and read-only lowering", () => {
  const state = game.initialState({ seed: 1729 });
  const contextual = projection.buildAvaContextualLanguage(
    state,
    gameContext.avaEntitiesForState(state),
  );
  const staticEntries = contextual.entries.filter(
    (entry) => entry.source === "STATIC_CATALOG",
  );
  assert.ok(staticEntries.length > 0);

  for (const entry of staticEntries) {
    for (const alias of entry.aliases) {
      for (const variant of surfaceVariants(alias)) {
        const result = compiler.compileAvaCommand(
          variant,
          compilerContext(state, contextual),
        );
        assert.equal(result.status, "compiled", `${entry.id}/${variant}`);
        assert.equal(
          result.instruction.contextual.entryId,
          entry.id,
          `${entry.id}/${variant}`,
        );
        assert.equal(result.instruction.contextual.route, entry.route);
        assert.equal(result.instruction.contextual.entityId, entry.entityId);
        assert.equal(result.instruction.contextual.topic, entry.topic);
        assert.notEqual(result.semantic.subject.type, "UNKNOWN");
        assert.equal(result.instruction.action, undefined);
      }
    }

    const before = structuredClone(state);
    const nexusResult = nexus.runAvaNexusLine(
      entry.aliases[0],
      contextFor(state, "web"),
      state,
      nexus.createAvaNexusSession(),
    );
    assert.equal(nexusResult.compile?.status, "compiled", entry.id);
    assert.equal(
      nexusResult.compile?.instruction.contextual.entryId,
      entry.id,
    );
    assert.deepEqual(nexusResult.state, before, entry.id);
  }
});

test("generated authored maneuver corpus preserves evidence identity and mutation safety", () => {
  const state = game.initialState({ seed: 1729 });
  const contextual = projection.buildAvaContextualLanguage(
    state,
    gameContext.avaEntitiesForState(state),
  );
  const records = projection.projectAvaAuthoredManeuverEvidence(state);
  const authoredEntries = contextual.entries.filter(
    (entry) => entry.source === "AUTHORED_BRIEF" && entry.maneuverId,
  );
  const authoredLanguageEntries = contextual.entries.filter(
    (entry) => entry.source === "AUTHORED_BRIEF",
  );
  assert.ok(records.length > 0);
  assert.ok(authoredEntries.length > 0);

  for (const record of records) {
    for (const [kind, sourceEvidence] of [
      ["maneuver-label", record.labelEvidence],
      ["maneuver-rationale", record.rationaleEvidence],
      ["maneuver-presentation", record.presentationEvidence],
    ]) {
      if (!sourceEvidence) continue;
      const matches = authoredEntries.filter(
        (entry) =>
          entry.maneuverId === record.maneuverId &&
          entry.evidenceKind === kind,
      );
      // Static vocabulary owns any exact collision. Otherwise every typed
      // label/presentation and every bounded rationale span is indexed. A
      // rationale may be longer than the eight-token free-span bound, so its
      // full source text is checked through the preserved projection record,
      // while its accepted bounded spans are checked below.
      if (kind !== "maneuver-rationale") {
        const exactTypedMatch = matches.some((entry) =>
          entry.aliases.some(
            (alias) =>
              language.normalizeAvaLanguageInput(alias) ===
              language.normalizeAvaLanguageInput(sourceEvidence.phrase),
          ),
        );
        const staticAlias = contextual.entries
          .filter((entry) => entry.source === "STATIC_CATALOG")
          .some((entry) =>
            entry.aliases.some(
              (alias) =>
                language.normalizeAvaLanguageInput(alias) ===
                language.normalizeAvaLanguageInput(sourceEvidence.phrase),
            ),
          );
        assert.equal(
          exactTypedMatch || staticAlias,
          true,
          `${record.maneuverId}/${kind}`,
        );
      }
      assert.ok(matches.length, `${record.maneuverId}/${kind}`);
      for (const entry of matches) {
        const evidence = entry.evidence?.find(
          (item) => item.section === kind,
        );
        assert.ok(evidence);
        assert.ok(evidence.excerpt.includes(evidence.phrase));
        assert.equal(entry.provenance?.length > 0, true);
        for (const variant of surfaceVariants(entry.label)) {
          const normalizedVariant = language.normalizeAvaLanguageInput(variant);
          const identityCandidates = new Set(
            authoredLanguageEntries
              .filter((candidate) =>
                candidate.aliases.some(
                  (alias) =>
                    language.normalizeAvaLanguageInput(alias) ===
                    normalizedVariant,
                ),
              )
              .map((candidate) => candidate.maneuverId),
          );
          const result = compiler.compileAvaCommand(
            variant,
            compilerContext(state, contextual),
          );
          if (identityCandidates.size > 1) {
            assert.equal(result.status, "clarify", `${entry.id}/${variant}`);
            assert.equal(result.failure, "ambiguous-target");
            assert.equal(result.trace.exactIndexHit, true);
          } else {
            assert.equal(result.status, "compiled", `${entry.id}/${variant}`);
            assert.equal(result.instruction.kind, "EXPLAIN");
            assert.equal(result.instruction.contextual.route, "NARRATIVE_REFERENCE");
            assert.equal(result.instruction.contextual.maneuverId, record.maneuverId);
            assert.ok(
              result.instruction.contextual.evidence?.some(
                (item) => item.section === kind,
              ),
            );
            assert.equal(result.trace.exactIndexHit, true);
            assert.equal(result.trace.maneuverId, record.maneuverId);
          }
        }

        const before = structuredClone(state);
        const identityCandidates = new Set(
          authoredLanguageEntries
            .filter((candidate) =>
              candidate.aliases.some(
                (alias) =>
                  language.normalizeAvaLanguageInput(alias) ===
                  language.normalizeAvaLanguageInput(entry.label),
              ),
            )
            .map((candidate) => candidate.maneuverId),
        );
        const nexusResult = nexus.runAvaNexusLine(
          entry.label,
          contextFor(state, "web"),
          state,
          nexus.createAvaNexusSession(),
        );
        if (identityCandidates.size > 1) {
          assert.equal(nexusResult.compile?.status, "clarify", entry.id);
          assert.equal(nexusResult.compile?.failure, "ambiguous-target");
        } else {
          assert.equal(nexusResult.compile?.status, "compiled", entry.id);
          assert.equal(
            nexusResult.compile?.instruction.contextual.maneuverId,
            record.maneuverId,
          );
          assert.ok(
            nexusResult.compile?.instruction.contextual.evidence?.some(
              (item) => item.section === kind,
            ),
          );
        }
        assert.deepEqual(nexusResult.state, before, entry.id);
      }
    }
  }

  assert.doesNotMatch(
    JSON.stringify(contextual),
    /hiddenOrders|resolutionTicket|privateCalculus|sealedOutcome|successPressure/,
  );
});
