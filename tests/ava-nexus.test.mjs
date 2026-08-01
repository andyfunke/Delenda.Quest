import assert from "node:assert/strict";
import test from "node:test";

const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);
const nexus = await import(process.env.DELENDA_AVA_NEXUS_BUNDLE);
const compiler = await import(process.env.DELENDA_AVA_COMPILER_BUNDLE);
const services = await import(process.env.DELENDA_SUBSTRATE_SERVICES_BUNDLE);
const ssh = await import(process.env.DELENDA_SSH_SERVER_BUNDLE);

const newState = (seed = 991) => game.initialState({ seed });
const ctxFor = (
  state,
  authority = "command",
  surface = "web",
) => ({
  playerId: "nexus-player",
  campaignId: state.campaignId,
  campaignRevision: nexus.avaNexusStateRevision(state),
  surface,
  authority,
  nowMs: 1_700_010_000_000,
});
const run = (line, state, session = nexus.createAvaNexusSession()) =>
  nexus.runAvaNexusLine(line, ctxFor(state), state, session);

const semanticQuery = (
  operation,
  subjectType,
  input = {},
) => ({
  operation,
  subject: {
    type: subjectType,
    entityIds: [],
    ...(input.subject ?? {}),
  },
  scope: {
    domains: [],
    excludedDomains: [],
    ...(input.scope ?? {}),
  },
  timeframe: "CURRENT_DOCKET",
  criteria: ["OVERALL_VALUE"],
  polarity: "AFFIRMATIVE",
  requestedDetail: "JUDGMENT",
  perspective: "PLAYER",
  outputForm: "TERMINAL",
  overlays: [],
  confidence: 1,
  sourceSpans: {},
  ...input,
  subject: {
    type: subjectType,
    entityIds: [],
    ...(input.subject ?? {}),
  },
  scope: {
    domains: [],
    excludedDomains: [],
    ...(input.scope ?? {}),
  },
});

const typedSemanticRequest = (state, query, rawInput = "typed") => ({
  kind: "instruction",
  origin: "browser-ui",
  rawInput,
  instruction: { kind: "SEMANTIC", query },
  semantic: query,
  expectedStateSeal: nexus.avaNexusStateRevision(state),
});

test("storyteller mode is Ava-controlled, persistent, factual, and reversible", () => {
  const state = newState(1729);
  const enabled = run("storyteller mode", state);
  assert.equal(enabled.session.realizationMode, "storyteller");
  assert.match(enabled.text, /STORYTELLER MODE[\s\S]*Enabled/i);

  const told = run("what to do", state, enabled.session);
  assert.equal(told.session.realizationMode, "storyteller");
  assert.match(told.text, /THEATER[\s\S]*CONTINUITY[\s\S]*COMMANDER'S VIEW/);
  assert.match(told.text, new RegExp(state.currentSituation.sector, "i"));
  assert.match(told.text, /orders remain/i);
  assert.doesNotMatch(told.text, /hidden order|sealed adversary choice/i);

  const concise = run("concise mode", state, told.session);
  assert.equal(concise.session.realizationMode, "concise");
  const brief = run("what to do", state, concise.session);
  assert.doesNotMatch(brief.text, /\n\nTHEATER\n/);
});

test("chat export crosses the Nexus as a local read-only presentation request", () => {
  const state = newState(1730);
  const exported = run("export ava chat log", state);
  assert.equal(exported.response.status, "OK", exported.text);
  assert.equal(exported.envelope.instructionKind, "EXPORT_CHAT");
  assert.deepEqual(exported.state, state);
  assert.deepEqual(exported.envelope.presentation.chatExport, {
    filename: "delenda-quest-ava-chat-day-001.txt",
    mime: "text/plain;charset=utf-8",
  });
  assert.match(exported.text, /CHAT LOG EXPORT[\s\S]*remains local/i);
});

test("godmode force-opportunity returns one canonical visible result", () => {
  let state;
  for(let seed=1;seed<1000;seed+=1){
    const candidate=newState(seed);
    if(!game.opportunityForState(candidate)){
      state=candidate;
      break;
    }
  }
  assert.ok(state);
  const request={
    kind:"internal",
    origin:"internal",
    operation:"force-opportunity",
    expectedStateSeal:nexus.avaNexusStateRevision(state),
  };
  const forced=nexus.runAvaNexusRequest(
    request,
    ctxFor(state,"command","internal"),
    state,
    nexus.createAvaNexusSession(),
  );
  assert.equal(forced.response.status,"OK",forced.text);
  assert.equal(forced.response.fact.operation,"force-opportunity");
  assert.equal(forced.response.fact.status,"opened");
  assert.ok(forced.response.fact.packetId);
  assert.ok(forced.response.fact.packetHeadline);
  assert.match(forced.text,/^RANDOM EVENT FORCED\n\S[\s\S]*window is open/i);
  assert.equal(
    game.opportunityStatusForFraction(forced.state,.5).packet?.id,
    forced.response.fact.packetId,
  );

  const repeated=nexus.runAvaNexusRequest(
    {...request,expectedStateSeal:nexus.avaNexusStateRevision(forced.state)},
    ctxFor(forced.state,"command","internal"),
    forced.state,
    forced.session,
  );
  assert.equal(repeated.response.status,"OK",repeated.text);
  assert.equal(repeated.response.fact.status,"unchanged");
  assert.match(repeated.text,/^RANDOM EVENT ALREADY OPEN[\s\S]*advance the day/i);
  assert.deepEqual(repeated.state.forcedOpportunityDays,[state.day]);
});

test("strategic posture reaches the evaluator instead of collapsing to default", () => {
  const state = newState();
  const posture = {
    objective: "build_long_term_capacity",
    horizon: "long",
    priorities: {
      long_term_capacity: "critical",
      treasury_preservation: "high",
    },
    tolerances: {
      short_term_exposure: "low",
      treasury_expenditure: "low",
    },
    unresolvedConflicts: [],
    confirmation: "confirmed_by_player",
  };
  const evaluated = services.evaluateChoices(
    ctxFor(state),
    state,
    [],
    posture,
  );
  assert.deepEqual(evaluated.fact.posture, posture);
});

test("text and typed directive advice share channel, actor, posture, and ranking", () => {
  const state = newState(222);
  const text = run(
    "what should I do about production",
    state,
    nexus.createAvaNexusSession(true, "campaign"),
  );
  assert.equal(text.response.status, "OK", text.text);
  assert.equal(text.envelope.semantic?.subject.type, "DIRECTIVE");
  assert.equal(text.envelope.semantic?.directive?.channel, "production");
  assert.deepEqual(text.cognitiveActivation?.operatorFamilies, [
    "DECISION",
    "REALIZATION",
  ]);
  assert.match(text.text, /compiled directive-strategic-posture model/i);

  const query = text.envelope.semantic;
  const typed = nexus.runAvaNexusRequest(
    typedSemanticRequest(state, query),
    ctxFor(state),
    state,
    nexus.createAvaNexusSession(true, "campaign"),
  );
  assert.equal(typed.response.status, "OK", typed.text);
  assert.deepEqual(
    typed.response.fact.ranked.map((row) => row.choiceId),
    text.response.fact.ranked.map((row) => row.choiceId),
  );
  assert.deepEqual(typed.response.fact.posture, text.response.fact.posture);
  assert.deepEqual(typed.cognitiveActivation, text.cognitiveActivation);
  assert.ok(
    typed.proofGraph.nodes.some(
      (node) =>
        node.claim ===
        `Cognitive decision selected ${typed.response.fact.ranked[0].choiceId}`,
    ),
  );
});

test("core read commands publish executable semantic cells", () => {
  for (const command of [
    "what should I do",
    "advise",
    "recommend",
    "next move",
    "missions",
    "production",
    "status",
    "report production",
  ]) {
    const state = newState(223);
    const result = run(command, state);
    assert.equal(result.response.status, "OK", `${command}: ${result.text}`);
    assert.ok(
      nexus.AVA_CAPABILITY_REGISTRY.resolve(
        result.envelope.semantic.operation,
        result.envelope.semantic.subject.type,
      ),
      command,
    );
  }
});

test("typed semantic reads lower to the same concrete handler as text", () => {
  for (const command of [
    "forecast M1",
    "report production",
    "status",
    "open production",
    "missions",
  ]) {
    const state = newState(224);
    const text = run(command, state);
    assert.equal(text.response.status, "OK", `${command}: ${text.text}`);
    const typed = nexus.runAvaNexusRequest(
      typedSemanticRequest(state, text.envelope.semantic, command),
      ctxFor(state),
      state,
      nexus.createAvaNexusSession(),
    );
    assert.equal(typed.response.status, text.response.status, command);
    assert.equal(typed.text, text.text, command);
  }
});

test("every official compiler semantic signature is closed by exactly one capability cell", () => {
  const emitted = [
    ...compiler.AVA_COMPILED_AGENCY_BUNDLE.recipes.map(
      (recipe) => recipe.expectedQuery,
    ),
  ];
  const context = { currentModule: "campaign", entities: [] };
  for (const expectation of compiler.AVA_CAMPAIGN_LANGUAGE_CORPUS) {
    const result = compiler.compileAvaCommand(expectation.utterance, context);
    if (result.semantic) emitted.push(result.semantic);
  }
  for (const help of compiler.AVA_COMMAND_HELP) {
    for (const example of help.examples) {
      const result = compiler.compileAvaCommand(example, context);
      if (result.status === "compiled") emitted.push(result.semantic);
    }
  }
  const signatures = new Set();
  for (const query of emitted) {
    const signature = `${query.operation}/${query.subject.type}`;
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    const matching = nexus.AVA_CAPABILITY_REGISTRY.cells.filter(
      (cell) =>
        cell.operation === query.operation &&
        cell.subject === query.subject.type,
    );
    assert.equal(matching.length, 1, signature);
    assert.strictEqual(
      nexus.AVA_CAPABILITY_REGISTRY.resolve(
        query.operation,
        query.subject.type,
      ),
      matching[0],
      signature,
    );
  }
});

test("all affirmative aliases converge on one prepared directive confirmation", () => {
  for (const alias of [
    "yes",
    "yes do it",
    "yes issue it",
    "accept",
    "commit",
    "do it",
  ]) {
    const state = newState(300);
    const docket = run("production", state);
    const choiceId = docket.response.fact.choiceIds[0];
    const prepared = run(`choose ${choiceId}`, docket.state, docket.session);
    assert.equal(prepared.response.status, "PREPARED", `${alias}: ${prepared.text}`);
    const confirmed = run(alias, prepared.state, prepared.session);
    assert.equal(confirmed.response.status, "EXECUTED", `${alias}: ${confirmed.text}`);
    assert.ok(
      confirmed.state.decisions.some(
        (decision) => decision.choiceId === choiceId,
      ),
    );
  }
});

test("typed directive execute can only create one idempotent prepared order", () => {
  const state = newState(301);
  const docket = run("production", state);
  const choice = docket.response.fact.choices[0];
  const request = {
    kind: "action",
    origin: "browser-ui",
    action: {
      kind: "directive",
      familyId: choice.familyId,
      choiceId: choice.choiceId,
    },
    mode: "execute",
    idempotencyKey: "ui-directive-301",
    expectedStateSeal: nexus.avaNexusStateRevision(docket.state),
  };
  const prepared = nexus.runAvaNexusRequest(
    request,
    ctxFor(docket.state),
    docket.state,
    nexus.createAvaNexusSession(),
  );
  assert.equal(prepared.response.status, "PREPARED", prepared.text);
  assert.equal(prepared.state.decisions.length, docket.state.decisions.length);
  assert.equal(prepared.state.preparedOrders.length, 1);
  const replay = nexus.runAvaNexusRequest(
    {
      ...request,
      expectedStateSeal: nexus.avaNexusStateRevision(prepared.state),
    },
    ctxFor(prepared.state),
    prepared.state,
    prepared.session,
  );
  assert.equal(replay.response.status, "PREPARED", replay.text);
  assert.equal(replay.state.preparedOrders.length, 1);
  assert.equal(
    replay.response.fact.proposalToken,
    prepared.response.fact.proposalToken,
  );
});

test("COMMIT without a prepared effect cannot execute or stage a legacy effect", () => {
  const state = newState();
  const result = run("commit", state);
  assert.equal(result.response.status, "CONFIRMATION_REQUIRED");
  assert.deepEqual(result.state, state);
  assert.equal(result.session.terminal.confirmation, null);
});

test("observer and noninteractive sessions cannot execute or confirm", () => {
  const state = newState();
  const direct = {
    kind: "action",
    origin: "browser-ui",
    action: { kind: "resolve-day" },
    mode: "execute",
    expectedStateSeal: nexus.avaNexusStateRevision(state),
    resolutionGrant: {
      grantId: "grant-observer",
      campaignId: state.campaignId,
      campaignDay: state.day,
      accountDayKey: "2026-07-30",
    },
  };
  const observer = nexus.runAvaNexusRequest(
    direct,
    ctxFor(state, "observer"),
    state,
    nexus.createAvaNexusSession(),
  );
  assert.equal(observer.response.status, "FORBIDDEN");
  assert.deepEqual(observer.state, state);

  const oneShot = nexus.runAvaNexusRequest(
    direct,
    ctxFor(state),
    state,
    nexus.createAvaNexusSession(false),
  );
  assert.equal(oneShot.response.status, "FORBIDDEN");
  assert.deepEqual(oneShot.state, state);
});

test("forged legacy directive confirmations are cleared and rejected", () => {
  const state = newState();
  const directive = {
    kind: "directive",
    familyId: "production",
    choiceId: "guns",
  };
  const seal = nexus.avaNexusStateRevision(state);
  const session = nexus.createAvaNexusSession();
  session.terminal.plan = [directive];
  session.terminal.confirmation = {
    id: "C-FORGED",
    stateRevision: seal,
    plan: {
      id: "P-FORGED",
      stateRevision: seal,
      actions: [directive],
      orderCost: 1,
      insightCost: 0,
    },
    purpose: "issue-plan",
  };
  const result = run("confirm C-FORGED", state, session);
  assert.equal(result.response.status, "REJECTED");
  assert.equal(
    result.response.recovery?.code,
    "LEGACY_DIRECTIVE_CONFIRMATION_BLOCKED",
  );
  assert.equal(result.session.terminal.confirmation, null);
  assert.deepEqual(result.session.terminal.plan, []);
  assert.deepEqual(result.state, state);
});

test("mixed and multi-directive plans fail closed before legacy execution", () => {
  const state = newState();
  const directiveA = {
    kind: "directive",
    familyId: "production",
    choiceId: "guns",
  };
  const directiveB = {
    kind: "directive",
    familyId: "production",
    choiceId: "steel",
  };
  for (const actions of [
    [directiveA, directiveB],
    [directiveA, { kind: "maneuver", maneuverId: "probe" }],
  ]) {
    const result = nexus.runAvaNexusRequest(
      {
        kind: "plan",
        origin: "browser-ui",
        actions,
        mode: "execute",
        expectedStateSeal: nexus.avaNexusStateRevision(state),
      },
      ctxFor(state),
      state,
      nexus.createAvaNexusSession(),
    );
    assert.equal(result.response.status, "REJECTED");
    assert.equal(
      result.response.recovery?.code,
      "MIXED_DIRECTIVE_PLAN_BLOCKED",
    );
    assert.deepEqual(result.state, state);
  }
});

test("every malformed typed instruction kind fails closed without throwing", () => {
  const state = newState();
  const malformedByKind = {
    GREETING: { kind: "GREETING", payload: true },
    ORDERS: { kind: "ORDERS", payload: true },
    HELP: { kind: "HELP", subject: 7 },
    STATUS: { kind: "STATUS", payload: true },
    ADVISE: { kind: "ADVISE", payload: true },
    SEMANTIC: { kind: "SEMANTIC", query: null },
    SHELL: { kind: "SHELL", shell: { command: "LS" } },
    LIST: { kind: "LIST", scope: 7 },
    REPORT: { kind: "REPORT", topic: false },
    EXPLAIN: { kind: "EXPLAIN", entity: null, facet: "meaning" },
    OPEN: { kind: "OPEN", module: "not-a-module" },
    SELECT: { kind: "SELECT", entity: null },
    STAGE: { kind: "STAGE", entities: [null] },
    UNSTAGE: { kind: "UNSTAGE", entities: [] },
    SHOW_PLAN: { kind: "SHOW_PLAN", payload: true },
    ISSUE_PLAN: { kind: "ISSUE_PLAN", payload: true },
    ISSUE: { kind: "ISSUE", entities: "bad" },
    FORECAST: { kind: "FORECAST", plan: "yes" },
    COMPARE: { kind: "COMPARE", entities: [] },
    CLEAR: { kind: "CLEAR", payload: true },
    CLEAR_PLAN: { kind: "CLEAR_PLAN", payload: true },
    CONFIRM: { kind: "CONFIRM", token: 7 },
    CANCEL: { kind: "CANCEL", payload: true },
    MORE: { kind: "MORE", payload: true },
    LESS: { kind: "LESS", payload: true },
    REPEAT: { kind: "REPEAT", payload: true },
    IDENTITY: { kind: "IDENTITY", payload: true },
    GRATITUDE: { kind: "GRATITUDE", payload: true },
    FRUSTRATION: { kind: "FRUSTRATION", payload: true },
    COMMIT: { kind: "COMMIT", entity: null },
    RESOLVE_DAY: { kind: "RESOLVE_DAY", payload: true },
  };
  const semantic = semanticQuery("INSPECT", "SYSTEM");
  for (const [kind, instruction] of Object.entries(malformedByKind)) {
    let result;
    assert.doesNotThrow(() => {
      result = nexus.runAvaNexusRequest(
        {
          kind: "instruction",
          origin: "browser-ui",
          rawInput: `malformed ${kind}`,
          instruction,
          semantic,
          expectedStateSeal: nexus.avaNexusStateRevision(state),
        },
        ctxFor(state),
        state,
        nexus.createAvaNexusSession(),
      );
    }, kind);
    assert.equal(result.response.status, "AMBIGUOUS", kind);
    assert.equal(result.response.recovery?.code, "MALFORMED_AVA_REQUEST", kind);
    assert.deepEqual(result.state, state, kind);
  }
});

test("semantic provenance must match and nested semantic fields fail closed", () => {
  const state = newState();
  const outer = semanticQuery("ADVISE", "CAMPAIGN_CHOICE");
  const inner = semanticQuery("RANK", "CAMPAIGN_CHOICE");
  for (const request of [
    {
      ...typedSemanticRequest(state, outer),
      instruction: { kind: "SEMANTIC", query: inner },
    },
    typedSemanticRequest(state, {
      ...outer,
      overlays: [null],
    }),
    typedSemanticRequest(state, {
      ...outer,
      quantity: { kind: "ORDINAL", value: "second" },
    }),
    typedSemanticRequest(state, {
      ...outer,
      reference: { type: "NOT_A_REFERENCE" },
    }),
    typedSemanticRequest(state, {
      ...outer,
      sourceSpans: { operation: { start: -1, end: 2, text: "ad" } },
    }),
  ]) {
    let result;
    assert.doesNotThrow(() => {
      result = nexus.runAvaNexusRequest(
        request,
        ctxFor(state),
        state,
        nexus.createAvaNexusSession(),
      );
    });
    assert.equal(result.response.status, "AMBIGUOUS");
    assert.equal(result.response.recovery?.code, "MALFORMED_AVA_REQUEST");
  }
});

test("unsupported and malformed semantic shapes clarify without widening", () => {
  const state = newState();
  const unsupported = semanticQuery("PREDICT", "DIRECTIVE", {
    directive: { channel: "production" },
  });
  const unsupportedResult = nexus.runAvaNexusRequest(
    typedSemanticRequest(state, unsupported),
    ctxFor(state),
    state,
    nexus.createAvaNexusSession(),
  );
  assert.equal(unsupportedResult.response.status, "AMBIGUOUS");
  assert.equal(
    unsupportedResult.response.recovery?.code,
    "UNSUPPORTED_SEMANTIC_CAPABILITY",
  );

  const malformed = semanticQuery("COMPARE", "CAMPAIGN_CHOICE");
  const malformedResult = nexus.runAvaNexusRequest(
    typedSemanticRequest(state, malformed),
    ctxFor(state),
    state,
    nexus.createAvaNexusSession(),
  );
  assert.equal(malformedResult.response.status, "AMBIGUOUS");
  assert.equal(
    malformedResult.response.recovery?.code,
    "MALFORMED_AVA_REQUEST",
  );
  assert.deepEqual(malformedResult.state, state);

  const fakeTargets = semanticQuery("COMPARE", "CAMPAIGN_CHOICE", {
    subject: { entityIds: ["FAKE-A", "FAKE-B"] },
    comparisonMode: "PAIR",
  });
  const fakeResult = nexus.runAvaNexusRequest(
    typedSemanticRequest(state, fakeTargets),
    ctxFor(state),
    state,
    nexus.createAvaNexusSession(),
  );
  assert.equal(fakeResult.response.status, "AMBIGUOUS");
  assert.equal(
    fakeResult.response.recovery?.code,
    "UNRESOLVED_SEMANTIC_TARGET",
  );
  assert.deepEqual(fakeResult.state, state);
});

test("unknown diplomacy actors clarify instead of defaulting to another actor", () => {
  const state = newState();
  const query = semanticQuery("ADVISE", "DIRECTIVE", {
    directive: { channel: "diplomacy", actorId: "not-an-actor" },
  });
  const result = nexus.runAvaNexusRequest(
    typedSemanticRequest(state, query),
    ctxFor(state),
    state,
    nexus.createAvaNexusSession(),
  );
  assert.equal(result.response.status, "AMBIGUOUS");
  assert.equal(
    result.response.recovery?.code,
    "DIPLOMACY_ACTOR_REQUIRED",
  );
});

test("typed action idempotency replays the original receipt and rejects key conflicts", () => {
  const state = newState(700);
  const maneuvers = state.currentSituation.maneuvers;
  const request = {
    kind: "action",
    origin: "browser-ui",
    action: { kind: "maneuver", maneuverId: maneuvers[0] },
    mode: "execute",
    idempotencyKey: "maneuver-700",
    expectedStateSeal: nexus.avaNexusStateRevision(state),
  };
  const executed = nexus.runAvaNexusRequest(
    request,
    ctxFor(state),
    state,
    nexus.createAvaNexusSession(),
  );
  assert.equal(executed.response.status, "EXECUTED", executed.text);
  assert.equal(executed.state.avaExecutions.length, 1);

  const replay = nexus.runAvaNexusRequest(
    request,
    ctxFor(executed.state),
    executed.state,
    executed.session,
  );
  assert.equal(replay.response.status, "ALREADY_EXECUTED", replay.text);
  assert.deepEqual(replay.response.fact.receipt, executed.response.fact.receipt);
  assert.strictEqual(replay.state, executed.state);

  const conflict = nexus.runAvaNexusRequest(
    {
      ...request,
      action: { kind: "maneuver", maneuverId: maneuvers[1] },
    },
    ctxFor(executed.state),
    executed.state,
    executed.session,
  );
  assert.equal(conflict.response.status, "REJECTED");
  assert.equal(conflict.response.recovery?.code, "IDEMPOTENCY_CONFLICT");
  assert.strictEqual(conflict.state, executed.state);
});

test("multi-action plans use the same durable idempotency ledger", () => {
  const state = { ...newState(701), doctrine: 500 };
  const request = {
    kind: "plan",
    origin: "browser-ui",
    actions: [
      {
        kind: "maneuver",
        maneuverId: state.currentSituation.maneuvers[0],
      },
      {
        kind: "doctrine-stage",
        vectorId: game.DOCTRINES[0].id,
        stageId: game.DOCTRINES[0].stages[1].id,
      },
    ],
    mode: "execute",
    idempotencyKey: "plan-701",
    expectedStateSeal: nexus.avaNexusStateRevision(state),
  };
  const executed = nexus.runAvaNexusRequest(
    request,
    ctxFor(state),
    state,
    nexus.createAvaNexusSession(),
  );
  assert.equal(executed.response.status, "EXECUTED", executed.text);
  assert.equal(executed.state.avaExecutions.length, 1);
  const replay = nexus.runAvaNexusRequest(
    request,
    ctxFor(executed.state),
    executed.state,
    executed.session,
  );
  assert.equal(replay.response.status, "ALREADY_EXECUTED");
  assert.deepEqual(replay.response.fact.receipt, executed.response.fact.receipt);
});

test("typed execution invalidates every stale legacy confirmation and plan", () => {
  const state = newState(702);
  const staged = run("resolve day", state);
  assert.ok(staged.session.terminal.confirmation);
  const executed = nexus.runAvaNexusRequest(
    {
      kind: "action",
      origin: "browser-ui",
      action: {
        kind: "maneuver",
        maneuverId: staged.state.currentSituation.maneuvers[0],
      },
      mode: "execute",
      idempotencyKey: "invalidate-stale-702",
      expectedStateSeal: nexus.avaNexusStateRevision(staged.state),
    },
    ctxFor(staged.state),
    staged.state,
    staged.session,
  );
  assert.equal(executed.response.status, "EXECUTED", executed.text);
  assert.equal(executed.session.terminal.confirmation, null);
  assert.deepEqual(executed.session.terminal.plan, []);
  const staleYes = run("yes", executed.state, executed.session);
  assert.notEqual(staleYes.response.status, "EXECUTED");
  assert.equal(staleYes.state.day, executed.state.day);
});

test("day resolution requires persisted server redemption and consumes its identity", () => {
  const state = newState();
  const request = {
    kind: "action",
    origin: "browser-ui",
    action: { kind: "resolve-day" },
    mode: "execute",
    idempotencyKey: "resolve-turn-claim-1",
    expectedStateSeal: nexus.avaNexusStateRevision(state),
  };
  const fabricatedGrant = {
    grantId: "turn-claim-1",
    campaignId: state.campaignId,
    campaignDay: state.day,
    accountDayKey: "2026-07-30",
  };
  const browserDenied = nexus.runAvaNexusRequest(
    { ...request, resolutionGrant: fabricatedGrant },
    ctxFor(state),
    state,
    nexus.createAvaNexusSession(),
  );
  assert.equal(browserDenied.response.status, "FORBIDDEN");
  assert.equal(
    browserDenied.response.recovery?.code,
    "SERVER_REDEMPTION_REQUIRED",
  );
  assert.equal(browserDenied.state.day, state.day);

  const denied = nexus.runAvaNexusRequest(
    request,
    ctxFor(state, "command", "internal"),
    state,
    nexus.createAvaNexusSession(),
    0,
    {},
    { resolutionAuthority: "persisted-redemption" },
  );
  assert.equal(denied.response.status, "FORBIDDEN");
  assert.equal(
    denied.response.recovery?.code,
    "DAY_RESOLUTION_GRANT_REQUIRED",
  );

  const grant = fabricatedGrant;
  const executed = nexus.runAvaNexusRequest(
    { ...request, resolutionGrant: grant },
    ctxFor(state, "command", "internal"),
    state,
    nexus.createAvaNexusSession(),
    0,
    {},
    { resolutionAuthority: "persisted-redemption" },
  );
  assert.equal(executed.response.status, "EXECUTED", executed.text);
  assert.equal(executed.state.day, state.day + 1);
  assert.deepEqual(executed.session.consumedResolutionGrantIds, [grant.grantId]);

  const idempotentReplay = nexus.runAvaNexusRequest(
    { ...request, resolutionGrant: grant },
    ctxFor(executed.state, "command", "internal"),
    executed.state,
    executed.session,
    0,
    {},
    { resolutionAuthority: "persisted-redemption" },
  );
  assert.equal(idempotentReplay.response.status, "ALREADY_EXECUTED");
  assert.deepEqual(
    idempotentReplay.response.fact.receipt,
    executed.response.fact.receipt,
  );
  assert.strictEqual(idempotentReplay.state, executed.state);

  const replay = nexus.runAvaNexusRequest(
    {
      ...request,
      expectedStateSeal: nexus.avaNexusStateRevision(executed.state),
      idempotencyKey: "resolve-turn-claim-2",
      resolutionGrant: {
        ...grant,
        campaignDay: executed.state.day,
      },
    },
    ctxFor(executed.state, "command", "internal"),
    executed.state,
    executed.session,
    0,
    {},
    { resolutionAuthority: "persisted-redemption" },
  );
  assert.equal(replay.response.status, "FORBIDDEN");
  assert.equal(
    replay.response.recovery?.code,
    "DAY_RESOLUTION_GRANT_CONSUMED",
  );
});

test("SSH mutation kill switch is Nexus authority, not a lexical alias list", () => {
  for (const alias of [
    "yes",
    "yes do it",
    "yes issue it",
    "accept",
    "commit",
    "do it",
    "issue it",
    "execute it",
  ]) {
    const openingState = newState(800);
    const choiceId = openingState.dailyDockets.find(
      (docket) => docket.channel === "production",
    ).selectedChoiceIds[0];
    const server = new ssh.DelendaSshServer({
      controls: { globalMutationsEnabled: true },
      loadCampaign: () => openingState,
      now: () => 1_700_010_000_000,
    });
    const opened = server.openSession({
      playerId: `nexus-ssh-${alias}@example.com`,
    });
    const prepared = server.handleLine(opened.sessionId, `select ${choiceId}`);
    assert.equal(prepared.status, "PREPARED", `${alias}: ${prepared.text}`);
    server.controls.controls.globalMutationsEnabled = false;
    const blocked = server.handleLine(opened.sessionId, alias);
    assert.notEqual(blocked.status, "EXECUTED", alias);
    assert.equal(server.getSession(opened.sessionId).state.decisions.length, 0);
  }

  const openingState = newState(801);
  const choiceId = openingState.dailyDockets.find(
    (docket) => docket.channel === "production",
  ).selectedChoiceIds[0];
  const server = new ssh.DelendaSshServer({
    controls: { globalMutationsEnabled: false },
    loadCampaign: () => openingState,
    now: () => 1_700_010_000_000,
  });
  const opened = server.openSession({ playerId: "nexus-ssh-off@example.com" });
  for (const command of [
    `select ${choiceId}`,
    `prepare ${choiceId}`,
    `issue ${choiceId}`,
    "learn",
    "exploit opportunity",
    "answer opportunity",
    "resolve day",
  ]) {
    const blocked = server.handleLine(opened.sessionId, command);
    assert.notEqual(blocked.status, "EXECUTED", command);
    assert.notEqual(blocked.status, "PREPARED", command);
  }
  const read = server.handleLine(opened.sessionId, "status");
  assert.equal(read.status, "OK");
});
