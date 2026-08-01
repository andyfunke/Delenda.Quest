import assert from "node:assert/strict";
import test from "node:test";

const cognition = await import(process.env.DELENDA_AVA_COGNITIVE_BUNDLE);
const cognitiveNexus = await import(
  process.env.DELENDA_AVA_COGNITIVE_NEXUS_BUNDLE
);
const avaRuntime = await import(process.env.DELENDA_AVA_RUNTIME_BUNDLE);
const avaProjection = await import(process.env.DELENDA_AVA_PROJECTION_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);
const nexus = await import(process.env.DELENDA_AVA_NEXUS_BUNDLE);

const RECEIPT_KEYS = [
  "authority",
  "digest",
  "domainDigest",
  "domainId",
  "domainVersion",
  "operatorFamilies",
  "runtime",
  "status",
  "version",
];

const stateFor = () =>
  game.initialState({ seed: 9_191, theater: "lowland" });

const seedThreeState = () => {
  const state = game.initialState({ seed: 3, theater: "lowland" });
  state.currentSituation = null;
  state.currentSubMissions = null;
  return state;
};

const runLine = (
  line,
  state,
  surface = "web",
  session = nexus.createAvaNexusSession(true, "campaign"),
  authority = "observer",
) =>
  nexus.runAvaNexusLine(
    line,
    {
      playerId: "activation-player",
      campaignId: state.campaignId,
      campaignRevision: nexus.avaNexusStateRevision(state),
      surface,
      authority,
      nowMs: 1_700_010_000_000,
    },
    state,
    session,
  );

const run = (state, surface = "web") =>
  runLine("what should I do", state, surface);

const runTyped = (
  request,
  state,
  session = nexus.createAvaNexusSession(true, "campaign"),
) =>
  nexus.runAvaNexusRequest(
    request,
    {
      playerId: "activation-player",
      campaignId: state.campaignId,
      campaignRevision: nexus.avaNexusStateRevision(state),
      surface: "web",
      authority: "command",
      nowMs: 1_700_010_000_000,
    },
    state,
    session,
  );

const activationFor = (result) => {
  assert.ok(
    result.cognitiveActivation,
    "the canonical Nexus returned without activating the cognitive runtime",
  );
  return result.cognitiveActivation;
};

const directCognitiveExecution = ({
  line,
  publicResult,
  state,
  session,
  visibleEntities: suppliedVisibleEntities,
}) => {
  assert.equal(publicResult.compile?.status, "compiled");
  const instruction = publicResult.compile.instruction;
  const visibleEntities =
    suppliedVisibleEntities ??
    [
      ...(instruction.entity ? [instruction.entity] : []),
      ...(instruction.entities ?? []),
    ];
  const execution = cognitiveNexus.runAvaCognitiveNexus({
    request: {
      kind: "instruction",
      origin: "browser-text",
      rawInput: line,
      instruction,
      semantic: publicResult.compile.semantic,
      trace: publicResult.compile.trace,
      expectedStateSeal: nexus.avaNexusStateRevision(state),
    },
    state,
    visibleEntities,
    discourse: session.terminal.discourse,
    opportunityFraction: 0,
    stagedActions: session.terminal.plan,
  });
  assert.equal(
    execution.status,
    "EXECUTED",
    execution.status === "REJECTED" ? execution.reason : undefined,
  );
  return execution;
};

test("OG Ava traverses the cognitive runtime and retains internal operator proof", () => {
  const state = stateFor();
  const before = structuredClone(state);
  const result = run(state);
  const activation = activationFor(result);

  assert.equal(activation.runtime, "AVA_COGNITIVE_NEXUS");
  assert.equal(activation.version, "1");
  assert.equal(activation.status, "COMPLETED");
  assert.equal(activation.authority, "READ_ONLY");
  assert.ok(activation.operatorFamilies.includes("DECISION"));
  assert.ok(activation.operatorFamilies.includes("REALIZATION"));
  assert.equal(new Set(activation.operatorFamilies).size, activation.operatorFamilies.length);
  assert.match(activation.domainDigest, /^[a-f0-9]{64}$/);
  assert.match(activation.digest, /^[a-f0-9]{64}$/);

  assert.strictEqual(
    activation,
    result.envelope.cognitiveActivation,
    "result and envelope must expose the same immutable activation receipt",
  );
  assert.strictEqual(result.proofGraph, result.envelope.proofGraph);
  assert.equal(result.proofGraph.status, "COMPLETE");
  assert.match(result.proofGraph.executionDigest ?? "", /^[a-f0-9]{64}$/);
  assert.ok(
    result.proofGraph.nodes.some((node) => node.kind === "OPERATOR"),
    "an advisory-only proof graph cannot prove cognitive execution",
  );
  assert.ok(
    result.proofGraph.nodes.some(
      (node) => node.kind === "OPERATOR" && node.operatorId === "EXPLAIN",
    ),
    "Ava's rendered decision was not bound by the realization operator",
  );
  const decisionClaim = result.proofGraph.nodes.find((node) =>
    node.claim.startsWith("Cognitive decision selected "),
  );
  assert.ok(decisionClaim, "the rendered answer is not bound to the decision output");
  assert.equal(
    result.response.fact.answerPlan.rankedOptions[0],
    decisionClaim.claim.slice("Cognitive decision selected ".length),
  );
  assert.deepEqual(cognition.validateCanonicalProofGraph(result.proofGraph), {
    ok: true,
  });
  assert.deepEqual(result.state, before);
  assert.deepEqual(state, before);
});

test("directive advice is ranked by the closed cognitive model, not the legacy service", () => {
  const state = stateFor();
  const before = structuredClone(state);
  const session = nexus.createAvaNexusSession(true, "campaign");
  const publicResult = runLine("advise production", state, "web", session);

  assert.equal(publicResult.response.status, "OK", publicResult.text);
  assert.deepEqual(activationFor(publicResult).operatorFamilies, [
    "DECISION",
    "REALIZATION",
  ]);
  assert.match(
    publicResult.text,
    /compiled directive-strategic-posture model owns this ranking/i,
  );
  const execution = directCognitiveExecution({
    line: "advise production",
    publicResult,
    state,
    session,
  });
  assert.equal(execution.route, "DIRECTIVE_DECISION");
  const guidance = cognitiveNexus.cognitiveDecisionGuidanceFor(execution);
  assert.ok(guidance?.directiveArtifact);
  assert.equal(guidance.decision.modelId, "directive-strategic-posture");
  assert.deepEqual(guidance.directiveArtifact.binding, {
    channel: "production",
  });
  assert.deepEqual(
    publicResult.response.fact.ranked.map((row) => row.choiceId),
    guidance.decision.ranking,
    "the rendered directive order escaped the cognitive decision result",
  );
  assert.deepEqual(
    publicResult.response.fact.posture,
    guidance.directiveArtifact.posture,
  );
  const expected = [...guidance.directiveArtifact.evaluations]
    .sort(
      (left, right) =>
        Number(right.legal) - Number(left.legal) ||
        right.score - left.score ||
        left.choiceId.localeCompare(right.choiceId),
    )
    .map((evaluation) => evaluation.choiceId);
  assert.deepEqual(
    guidance.decision.ranking,
    expected,
    "the normalized cognitive model changed the authored integer-vector order",
  );
  assert.ok(
    publicResult.proofGraph.nodes.some(
      (node) =>
        node.claim ===
        `Cognitive decision selected ${guidance.decision.winnerId}`,
    ),
  );
  assert.deepEqual(publicResult.state, before);
  assert.deepEqual(state, before);

  const tampered = structuredClone(execution);
  tampered.directiveDecisionArtifact.evaluations[0].components.objectiveFit += 1;
  assert.throws(
    () => cognitiveNexus.cognitiveDecisionGuidanceFor(tampered),
    /directive decision artifact digest is invalid/,
  );

  const rebound = structuredClone(execution);
  rebound.directiveDecisionArtifact.binding.channel = "military";
  const reboundBody = structuredClone(rebound.directiveDecisionArtifact);
  delete reboundBody.digest;
  rebound.directiveDecisionArtifact.digest = cognition.cognitiveDigest(reboundBody);
  assert.throws(
    () => cognitiveNexus.cognitiveDecisionGuidanceFor(rebound),
    /crossed its compiled scope/,
  );
});

test("directive decision legality is hard and cannot manufacture an executable recommendation", () => {
  const state = stateFor();
  state.actions = 0;
  const before = structuredClone(state);
  const result = runLine("advise production", state);

  assert.equal(result.response.status, "OK", result.text);
  assert.deepEqual(activationFor(result).operatorFamilies, [
    "DECISION",
    "REALIZATION",
  ]);
  assert.match(result.text, /No legal choice is visible in this channel/);
  assert.ok(result.response.fact.ranked.every((row) => row.legal === false));
  assert.equal(
    result.proofGraph.nodes.some((node) =>
      node.claim.startsWith("Cognitive decision selected "),
    ),
    false,
    "an unavailable directive was claimed as a selected recommendation",
  );
  assert.deepEqual(result.state, before);
  assert.deepEqual(state, before);
});

test("diplomacy directive decisions retain the exact visible actor scope", () => {
  const state = stateFor();
  const actor = state.actors[0];
  const line = `advise diplomacy ${actor.name}`;
  const session = nexus.createAvaNexusSession(true, "diplomacy");
  const result = runLine(line, state, "web", session);

  assert.equal(result.response.status, "OK", result.text);
  assert.equal(result.envelope.semantic.directive.actorId, actor.id);
  const execution = directCognitiveExecution({
    line,
    publicResult: result,
    state,
    session,
    visibleEntities: [
      {
        id: actor.id,
        kind: "foreign-actor",
        label: actor.name,
        aliases: [actor.role, actor.interest],
      },
    ],
  });
  const guidance = cognitiveNexus.cognitiveDecisionGuidanceFor(execution);
  assert.deepEqual(guidance.directiveArtifact.binding, {
    channel: "diplomacy",
    actorId: actor.id,
  });
  assert.deepEqual(
    guidance.decision.ranking,
    result.response.fact.ranked.map((row) => row.choiceId),
  );
  assert.ok(
    guidance.directiveArtifact.evaluations.every(
      (evaluation) =>
        guidance.decision.candidates.some(
          (candidate) => candidate.candidateId === evaluation.choiceId,
        ),
    ),
  );
});

test("the public activation receipt is closed and contains no state material", () => {
  const activation = activationFor(run(stateFor()));
  assert.deepEqual(Object.keys(activation).sort(), RECEIPT_KEYS);
  assert.deepEqual(
    [...activation.operatorFamilies],
    [...new Set(activation.operatorFamilies)].sort(),
    "operator families must be a canonical public summary",
  );

  const serialized = JSON.stringify(activation);
  for (const forbidden of [
    "worldRevision",
    "semanticDigest",
    "programId",
    "executionDigest",
    "proofIdentity",
    "proofGraph",
    "sourceIds",
    "campaignId",
    "playerId",
    "rawInput",
    "blocker",
    "fact:",
  ])
    assert.doesNotMatch(serialized, new RegExp(forbidden, "i"));
});

test("hidden state cannot become an activation-receipt equality oracle", () => {
  const state = stateFor();
  const baseline = run(state);
  const canary = "NEVER_EMIT_HIDDEN_ACTIVATION_CANARY";
  const stateWithHiddenCanary = { ...structuredClone(state), __hiddenCanary: canary };
  const altered = run(stateWithHiddenCanary);

  assert.deepEqual(
    activationFor(altered),
    activationFor(baseline),
    "public activation identity must not incorporate world or proof digests",
  );
  assert.doesNotMatch(JSON.stringify(altered.cognitiveActivation), new RegExp(canary));
  assert.deepEqual(altered.state, stateWithHiddenCanary);
  assert.equal(altered.proofGraph.digest, baseline.proofGraph.digest);

  const stateWithHiddenAdversary = structuredClone(state);
  stateWithHiddenAdversary.adversary.force += 777_777;
  stateWithHiddenAdversary.adversary.readiness = 1;
  const hiddenAdversary = run(stateWithHiddenAdversary);
  assert.deepEqual(activationFor(hiddenAdversary), activationFor(baseline));
  assert.equal(hiddenAdversary.proofGraph.worldRevision, baseline.proofGraph.worldRevision);
  assert.equal(hiddenAdversary.proofGraph.digest, baseline.proofGraph.digest);

  const stateWithHiddenSeed = structuredClone(state);
  stateWithHiddenSeed.campaignSeed += 2_000_000_003;
  const hiddenSeed = run(stateWithHiddenSeed);
  assert.deepEqual(activationFor(hiddenSeed), activationFor(baseline));
  assert.equal(hiddenSeed.text, baseline.text);
  assert.equal(hiddenSeed.proofGraph.worldRevision, baseline.proofGraph.worldRevision);
  assert.equal(hiddenSeed.proofGraph.digest, baseline.proofGraph.digest);
  assert.deepEqual(
    avaProjection.projectAvaEnvelope(stateWithHiddenSeed),
    avaProjection.projectAvaEnvelope(state),
    "Ava projection consumed the private campaign RNG seed",
  );

  const uncached = structuredClone(state);
  uncached.currentSituation = null;
  uncached.currentSubMissions = null;
  const uncachedBaseline = run(uncached);
  const hiddenPosture = structuredClone(uncached);
  hiddenPosture.adversary.posture = "Concentrated Assault";
  hiddenPosture.adversary.adaptation = { network: 8, interdict: 8 };
  const hiddenPostureResult = run(hiddenPosture);
  assert.equal(
    hiddenPostureResult.proofGraph.digest,
    uncachedBaseline.proofGraph.digest,
    "uncached docket regeneration consumed hidden adversary actuality",
  );
  assert.deepEqual(
    hiddenPostureResult.response.fact.answerPlan,
    uncachedBaseline.response.fact.answerPlan,
  );
});

test("seed-3 uncached hidden adversary actuality cannot change the public Nexus answer", () => {
  const state = seedThreeState();
  const baseline = run(state);
  const hidden = structuredClone(state);
  const hiddenCanary = "NEVER_DISCLOSE_SEED_3_ADVERSARY_LEDGER";
  const hiddenLedger = game.projectAdversary(hidden);

  hidden.adversary.force += 777_777;
  hidden.adversary.readiness = 100;
  hidden.adversary.posture = "Concentrated Assault";
  hidden.adversary.adaptation = { abandon: 8, interdict: 8, network: 8 };
  hidden.adversaryLedger = {
    ...hiddenLedger,
    actualForce: 1_337_777,
    posture: "Concentrated Assault",
    adaptation: { abandon: 8, interdict: 8, network: 8 },
    orders: [hiddenCanary],
    observedOrders: [],
    signals: [],
  };

  const altered = run(hidden);
  assert.equal(altered.text, baseline.text);
  assert.deepEqual(
    altered.response.fact.answerPlan,
    baseline.response.fact.answerPlan,
  );
  assert.equal(altered.proofGraph.digest, baseline.proofGraph.digest);
  assert.deepEqual(activationFor(altered), activationFor(baseline));
  assert.doesNotMatch(
    JSON.stringify({
      text: altered.text,
      answerPlan: altered.response.fact.answerPlan,
      proofGraph: altered.proofGraph,
      activation: altered.cognitiveActivation,
    }),
    new RegExp(hiddenCanary),
  );
});

test("only disclosed operational facts can change cognitive decision identity", () => {
  const state = seedThreeState();
  const fact = {
    id: "command_net_severed",
    sectorId: "ossuary-mile",
    createdDay: state.day,
    expiresDay: null,
    intensity: 1,
    source: "TEST DISCLOSURE CONTROL",
    visible: false,
  };
  const invisible = structuredClone(state);
  invisible.operationalFacts.push(fact);
  const visible = structuredClone(state);
  visible.operationalFacts.push({ ...fact, visible: true });

  const baseline = run(state);
  const hiddenResult = run(invisible);
  const visibleResult = run(visible);

  assert.equal(
    hiddenResult.proofGraph.worldRevision,
    baseline.proofGraph.worldRevision,
  );
  assert.equal(
    hiddenResult.proofGraph.executionDigest,
    baseline.proofGraph.executionDigest,
  );
  assert.equal(hiddenResult.proofGraph.digest, baseline.proofGraph.digest);
  assert.deepEqual(
    hiddenResult.response.fact.answerPlan,
    baseline.response.fact.answerPlan,
  );
  assert.notEqual(
    visibleResult.proofGraph.worldRevision,
    baseline.proofGraph.worldRevision,
  );
  assert.notEqual(
    visibleResult.proofGraph.executionDigest,
    baseline.proofGraph.executionDigest,
  );
  assert.notEqual(visibleResult.proofGraph.digest, baseline.proofGraph.digest);
});

test("visible projection inputs advance the cognitive world revision", () => {
  const state = stateFor();
  const baseline = run(state);
  const changedTempo = run({ ...structuredClone(state), tempo: "surge" });

  assert.notEqual(
    changedTempo.proofGraph.worldRevision,
    baseline.proofGraph.worldRevision,
    "tempo changes a disclosed projection but was absent from world identity",
  );
  assert.notEqual(
    changedTempo.proofGraph.executionDigest,
    baseline.proofGraph.executionDigest,
  );
});

test("world revision binds the director history that candidate projections consume", () => {
  const historyRecord = (eventId, day) => ({
    day,
    phase: "contact",
    event: eventId,
    eventId,
    calculusId: eventId,
    trigger: "projection dependency regression",
  });
  const formationFever = historyRecord("formation-fever", 3);
  const creditorCall = historyRecord("creditor-call", 2);
  const generalStoppage = historyRecord("general-stoppage", 1);
  const withHistory = (eventHistory) => {
    const state = seedThreeState();
    state.day = 4;
    state.readiness = 43;
    state.eventHistory = structuredClone(eventHistory);
    return state;
  };
  const projectReinforcement = (state) => {
    const descriptor = avaRuntime
      .enumerateAvaActions(state)
      .find(
        (candidate) =>
          candidate.kind === "maneuver" &&
          candidate.action.maneuverId === "reinforce",
      );
    assert.ok(descriptor, "seed-3 docket omitted the reinforcement maneuver");
    const preview = avaRuntime.projectAvaAction(state, descriptor.action);
    assert.equal(preview.executed, true, preview.rejection);
    assert.equal(preview.state.readiness, 41);
    return {
      state: preview.state,
      envelope: avaProjection.projectAvaEnvelope(preview.state),
    };
  };
  const eventCalculusFor = (state) => {
    const event = game.eventForState(state);
    return event.calculusId ?? event.id;
  };

  const lastFormation = withHistory([formationFever, creditorCall]);
  const lastCreditor = withHistory([creditorCall, formationFever]);
  const currentCalculus = eventCalculusFor(lastFormation);
  assert.equal(eventCalculusFor(lastCreditor), currentCalculus);
  assert.notEqual(
    cognition.avaVisibleWorldRevision(lastFormation),
    cognition.avaVisibleWorldRevision(lastCreditor),
    "the same current director concealed a different post-action trigger path",
  );
  const projectedLastFormation = projectReinforcement(lastFormation);
  const projectedLastCreditor = projectReinforcement(lastCreditor);
  assert.equal(
    eventCalculusFor(projectedLastFormation.state),
    currentCalculus,
  );
  assert.equal(
    eventCalculusFor(projectedLastCreditor.state),
    "formation-fever",
  );
  assert.notEqual(
    projectedLastFormation.envelope.friendlyLoss,
    projectedLastCreditor.envelope.friendlyLoss,
  );
  assert.notDeepEqual(
    projectedLastFormation.envelope.production.lines.map((line) => line.output),
    projectedLastCreditor.envelope.production.lines.map((line) => line.output),
  );

  const equivalentLeft = withHistory([
    generalStoppage,
    creditorCall,
    formationFever,
  ]);
  const equivalentRight = withHistory([
    generalStoppage,
    formationFever,
    creditorCall,
  ]);
  assert.equal(
    cognition.avaVisibleWorldRevision(equivalentLeft),
    cognition.avaVisibleWorldRevision(equivalentRight),
    "irrelevant tail ordering should canonicalize to one public revision",
  );
  assert.deepEqual(
    projectReinforcement(equivalentLeft).envelope,
    projectReinforcement(equivalentRight).envelope,
    "equal visible world revisions produced different projection envelopes",
  );
});

test("web and SSH Nexus contexts retain one cognitive proof identity", () => {
  const state = stateFor();
  const results = ["web", "ssh"].map((surface) => run(state, surface));
  const activations = results.map(activationFor);

  assert.equal(new Set(activations.map((activation) => activation.digest)).size, 1);
  assert.equal(new Set(results.map((result) => result.proofGraph.digest)).size, 1);
  assert.equal(
    new Set(results.map((result) => result.proofGraph.executionDigest)).size,
    1,
  );
  for (const result of results) {
    assert.equal(result.cognitiveActivation.status, "COMPLETED");
    assert.deepEqual(result.state, state);
    assert.doesNotMatch(result.text, /AVA_COGNITIVE_NEXUS|executionDigest|fact:/i);
  }
});

test("ordinary and temporal reads retain surface-neutral proof identity", () => {
  const state = stateFor();
  for (const line of ["status", "forecast M1", "help"]) {
    const results = ["web", "ssh"].map((surface) =>
      runLine(line, state, surface),
    );
    assert.equal(
      new Set(results.map((result) => result.proofGraph.digest)).size,
      1,
      `${line} proof identity changed with transport origin`,
    );
    assert.equal(
      new Set(results.map((result) => result.proofGraph.executionDigest)).size,
      1,
      `${line} cognitive execution changed with transport origin`,
    );
  }
});

test("Nexus routes forecasts and ordinary reads through their honest engine families", () => {
  const state = stateFor();
  const forecast = runLine("forecast M1", state);
  const status = runLine("status", state);

  assert.equal(forecast.response.status, "OK", forecast.text);
  assert.deepEqual(forecast.cognitiveActivation.operatorFamilies, [
    "REALIZATION",
    "TEMPORAL",
  ]);
  assert.ok(
    forecast.proofGraph.nodes.some(
      (node) => node.kind === "OPERATOR" && node.operatorId === "FORECAST",
    ),
  );
  assert.equal(status.response.status, "OK", status.text);
  assert.deepEqual(status.cognitiveActivation.operatorFamilies, ["RELATIONAL"]);
  assert.ok(
    status.proofGraph.nodes.some(
      (node) => node.kind === "OPERATOR" && node.operatorId === "IDENTITY",
    ),
  );
  assert.deepEqual(forecast.state, state);
  assert.deepEqual(status.state, state);
});

test("single-action viability executes a realized precondition check without authority or mutation", () => {
  const state = seedThreeState();
  const before = structuredClone(state);
  const session = nexus.createAvaNexusSession(true, "campaign");
  const viability = runLine("is M1 viable", state, "web", session);

  assert.equal(viability.response.status, "OK", viability.text);
  assert.deepEqual(activationFor(viability).operatorFamilies, [
    "CONSTRAINT",
    "REALIZATION",
  ]);
  assert.equal(viability.cognitiveActivation.authority, "READ_ONLY");
  assert.match(viability.text, /COMPILED PRECONDITION CHECK/);
  assert.match(viability.text, /VIABLE: YES/);
  assert.match(viability.text, /OUTCOME: FEASIBLE/);
  assert.match(
    viability.text,
    /READ ONLY · NO STAGE · NO PREPARE · NO MUTATION/,
  );
  assert.deepEqual(viability.state, before);
  assert.deepEqual(state, before);
  for (const operatorId of ["CHECK_PRECONDITION", "EXPLAIN"])
    assert.ok(
      viability.proofGraph.nodes.some(
        (node) =>
          node.kind === "OPERATOR" && node.operatorId === operatorId,
      ),
      `viability proof omitted ${operatorId}`,
    );

  const resolver = runLine("forecast M1", state);
  assert.equal(resolver.compile?.instruction.kind, "FORECAST");
  const targetEntity = resolver.compile.instruction.entity;
  assert.equal(
    targetEntity.id,
    viability.compile.semantic.subject.entityIds[0],
  );
  const execution = directCognitiveExecution({
    line: "is M1 viable",
    publicResult: viability,
    state,
    session,
    visibleEntities: [targetEntity],
  });
  const guidance = cognitiveNexus.cognitiveConstraintGuidanceFor(execution);
  assert.ok(guidance, "constraint execution omitted its sealed guidance");
  assert.equal(guidance.executionDigest, viability.proofGraph.executionDigest);
  assert.equal(guidance.artifact.targetId, targetEntity.id);
  assert.equal(guidance.artifact.actionId, "issue-order");
  assert.equal(guidance.artifact.bindings.actionId, targetEntity.id);
  assert.equal(guidance.feasibility.outcome, "FEASIBLE");
  assert.equal(execution.result.executions.at(-1).operator, "EXPLAIN");

  const tamperedArtifact = structuredClone(execution);
  tamperedArtifact.constraintArtifact.targetId = "maneuver:forged";
  assert.throws(
    () => cognitiveNexus.cognitiveConstraintGuidanceFor(tamperedArtifact),
    /constraint artifact digest is invalid/,
  );
  const tamperedResult = structuredClone(execution);
  tamperedResult.result.output.value.value.outcome = "FORBIDDEN";
  assert.throws(
    () => cognitiveNexus.cognitiveConstraintGuidanceFor(tamperedResult),
    /realization binding digest is invalid/,
  );

  const blockedState = seedThreeState();
  blockedState.actions = 0;
  const blockedBefore = structuredClone(blockedState);
  const blocked = runLine("is M1 feasible", blockedState);
  assert.deepEqual(activationFor(blocked).operatorFamilies, [
    "CONSTRAINT",
    "REALIZATION",
  ]);
  assert.match(blocked.text, /VIABLE: NO/);
  assert.match(blocked.text, /OUTCOME: RESOURCE_BOUND/);
  assert.deepEqual(blocked.state, blockedBefore);
  assert.deepEqual(blockedState, blockedBefore);

  const plural = runLine("are M1 and M2 viable", state);
  assert.ok(!plural.cognitiveActivation.operatorFamilies.includes("CONSTRAINT"));
});

test("explicit precondition wording compiles to the same constraint engine", () => {
  const state = seedThreeState();
  for (const line of [
    "is M1 feasible",
    "does M1 meet its preconditions",
    "what are M1 prerequisites",
  ]) {
    const result = runLine(line, state);
    assert.equal(result.response.status, "OK", `${line}: ${result.text}`);
    assert.deepEqual(result.cognitiveActivation.operatorFamilies, [
      "CONSTRAINT",
      "REALIZATION",
    ]);
  }
});

test("comparison, explanation, and challenge cross the typed realization boundary", () => {
  const state = stateFor();
  const session = nexus.createAvaNexusSession(true, "campaign");
  const comparison = runLine("compare M1 M2", state, "web", session);
  const explanation = runLine(
    "explain execution confidence calculus",
    state,
  );
  const challenge = runLine(
    "is production secondary to military readiness",
    state,
  );

  assert.deepEqual(comparison.cognitiveActivation.operatorFamilies, [
    "DECISION",
    "REALIZATION",
  ]);
  const comparisonExecution = directCognitiveExecution({
    line: "compare M1 M2",
    publicResult: comparison,
    state,
    session,
  });
  const comparisonGuidance =
    cognitiveNexus.cognitiveDecisionGuidanceFor(comparisonExecution);
  assert.ok(comparisonGuidance);
  assert.equal(comparisonGuidance.decision.kind, "COMPARE");
  assert.match(comparison.text, /COMPARISON \/ COGNITIVE NEXUS/);
  const comparedEntities = new Map(
    comparison.compile.instruction.entities.map((entity) => [entity.id, entity]),
  );
  comparisonGuidance.decision.ranking.forEach((id, index) => {
    const entity = comparedEntities.get(id);
    assert.ok(entity, `cognitive ranking returned unknown comparison id ${id}`);
    assert.match(
      comparison.text,
      new RegExp(`${index + 1}\\. \\[${entity.handle}\\] ${entity.label}`),
    );
  });
  const winner = comparedEntities.get(comparisonGuidance.decision.winnerId);
  assert.ok(winner);
  assert.match(
    comparison.text,
    new RegExp(`JUDGMENT[\\s\\S]*\\[${winner.handle}\\] ${winner.label} ranks first`),
  );
  assert.doesNotMatch(comparison.text, /Neither order dominates/);
  for (const result of [explanation, challenge]) {
    assert.equal(result.response.status, "OK", result.text);
    assert.ok(result.cognitiveActivation.operatorFamilies.includes("REALIZATION"));
    assert.ok(
      result.proofGraph.nodes.some(
        (node) => node.kind === "OPERATOR" && node.operatorId === "EXPLAIN",
      ),
      "semantic realization did not cross the realization engine",
    );
    assert.deepEqual(result.state, state);
  }
});

test("SHOW_PLAN validates staged IDs with planning authority and cannot mutate GameState", () => {
  const state = seedThreeState();
  const before = structuredClone(state);
  const session = nexus.createAvaNexusSession(true, "campaign");
  const staged = runLine("stage M1", state, "web", session, "command");
  const shown = runLine(
    "show plan",
    state,
    "web",
    staged.session,
    "command",
  );

  assert.equal(staged.response.status, "OK", staged.text);
  assert.equal(shown.response.status, "OK", shown.text);
  assert.deepEqual(activationFor(shown).operatorFamilies, [
    "PLANNING",
    "REALIZATION",
  ]);
  assert.equal(shown.cognitiveActivation.authority, "PLAN_ONLY");
  assert.match(
    shown.text,
    /COGNITIVE PLAN VALIDATION: PLANNED · PLAN ONLY \/ NO MUTATION/,
  );
  assert.deepEqual(staged.state, before);
  assert.deepEqual(shown.state, before);
  assert.deepEqual(state, before);

  const execution = directCognitiveExecution({
    line: "show plan",
    publicResult: shown,
    state,
    session: staged.session,
  });
  const guidance = cognitiveNexus.cognitivePlanningGuidanceFor(execution);
  assert.ok(guidance, "planning execution omitted its sealed guidance");
  const stagedIds = staged.compile.instruction.entities.map(
    (entity) => entity.id,
  );
  assert.deepEqual(guidance.actionIds, stagedIds);
  assert.deepEqual(
    guidance.planning.actions.map(
      (action) => action.bindings.actionId ?? action.bindings.subject,
    ),
    stagedIds,
  );
  assert.equal(guidance.planning.authority, "PLAN_ONLY_NO_MUTATION");
  assert.equal(guidance.executionDigest, shown.proofGraph.executionDigest);
  assert.equal(execution.result.executions.at(-1).operator, "EXPLAIN");
  assert.ok(
    shown.proofGraph.nodes.some(
      (node) => node.kind === "OPERATOR" && node.operatorId === "BUILD_PLAN",
    ),
  );
  assert.ok(
    shown.proofGraph.nodes.some(
      (node) => node.kind === "OPERATOR" && node.operatorId === "EXPLAIN",
    ),
  );
});

test("ISSUE PLAN must cross planning and realization before Nexus creates a confirmation", () => {
  const state = seedThreeState();
  const before = structuredClone(state);
  const session = nexus.createAvaNexusSession(true, "campaign");
  const staged = runLine("stage M1", state, "web", session, "command");
  const issued = runLine(
    "issue plan",
    staged.state,
    "web",
    staged.session,
    "command",
  );

  assert.equal(staged.response.status, "OK", staged.text);
  assert.equal(issued.response.status, "OK", issued.text);
  assert.deepEqual(activationFor(issued).operatorFamilies, [
    "PLANNING",
    "REALIZATION",
  ]);
  assert.equal(issued.cognitiveActivation.authority, "PLAN_ONLY");
  assert.ok(issued.session.terminal.confirmation, issued.text);
  assert.deepEqual(issued.state, before, "prepare cannot mutate GameState");
  assert.deepEqual(state, before);

  const execution = directCognitiveExecution({
    line: "issue plan",
    publicResult: issued,
    state: staged.state,
    session: staged.session,
  });
  const exactIds = staged.compile.instruction.entities.map(
    (entity) => entity.id,
  );
  const guidance = cognitiveNexus.cognitivePlanningGuidanceFor(execution, {
    actionIds: exactIds,
    worldRevision: execution.result.worldRevision,
  });
  assert.equal(guidance.planning.status, "PLANNED");
  assert.deepEqual(guidance.actionIds, exactIds);

  const confirmed = runLine(
    "confirm",
    issued.state,
    "web",
    issued.session,
    "command",
  );
  assert.equal(confirmed.response.status, "EXECUTED", confirmed.text);
  assert.equal(
    confirmed.cognitiveActivation,
    undefined,
    "confirmation must remain the Nexus mutation path",
  );
  assert.notDeepEqual(confirmed.state, before);
});

test("ISSUE validates its exact named entities before preparing them", () => {
  const state = seedThreeState();
  const issued = runLine(
    "issue M1",
    state,
    "web",
    nexus.createAvaNexusSession(true, "campaign"),
    "command",
  );

  assert.equal(issued.response.status, "OK", issued.text);
  assert.deepEqual(activationFor(issued).operatorFamilies, [
    "PLANNING",
    "REALIZATION",
  ]);
  assert.equal(issued.cognitiveActivation.authority, "PLAN_ONLY");
  assert.ok(issued.session.terminal.confirmation, issued.text);
  assert.deepEqual(issued.state, state);
});

test("directive preparation is wrapped by the same PLAN_ONLY cognitive gate", () => {
  const state = seedThreeState();
  const docket = runLine(
    "production",
    state,
    "web",
    nexus.createAvaNexusSession(true, "campaign"),
    "command",
  );
  const choiceId = docket.response.fact.choiceIds[0];
  const prepared = runLine(
    `choose ${choiceId}`,
    docket.state,
    "web",
    docket.session,
    "command",
  );

  assert.equal(prepared.response.status, "PREPARED", prepared.text);
  assert.deepEqual(activationFor(prepared).operatorFamilies, [
    "PLANNING",
    "REALIZATION",
  ]);
  assert.equal(prepared.cognitiveActivation.authority, "PLAN_ONLY");
  assert.equal(
    prepared.state.decisions.length,
    docket.state.decisions.length,
    "prepare cannot execute the directive",
  );
});

test("a cumulative BLOCKED cognitive plan cannot create a confirmation", () => {
  const state = seedThreeState();
  state.actions = 1;
  const before = structuredClone(state);
  const staged = runLine(
    "stage M1 M2",
    state,
    "web",
    nexus.createAvaNexusSession(true, "campaign"),
    "command",
  );
  assert.equal(staged.response.status, "OK", staged.text);
  assert.equal(staged.session.terminal.plan.length, 2, staged.text);

  const blocked = runLine(
    "issue plan",
    staged.state,
    "web",
    staged.session,
    "command",
  );
  assert.equal(blocked.response.status, "REJECTED", blocked.text);
  assert.equal(blocked.response.fact.code, "COGNITIVE_PLAN_BLOCKED");
  assert.deepEqual(activationFor(blocked).operatorFamilies, [
    "PLANNING",
    "REALIZATION",
  ]);
  assert.equal(blocked.cognitiveActivation.authority, "PLAN_ONLY");
  assert.equal(blocked.session.terminal.confirmation, null);
  assert.deepEqual(blocked.state, before);
  assert.ok(
    blocked.proofGraph.nodes.some(
      (node) => node.kind === "OPERATOR" && node.operatorId === "BUILD_PLAN",
    ),
  );
  assert.ok(
    blocked.proofGraph.nodes.some(
      (node) => node.kind === "OPERATOR" && node.operatorId === "EXPLAIN",
    ),
  );
});

test("CLEAR PLAN mutates only the session and never advertises cognitive activation", () => {
  const state = seedThreeState();
  const before = structuredClone(state);
  const staged = runLine(
    "stage M1",
    state,
    "web",
    nexus.createAvaNexusSession(true, "campaign"),
    "command",
  );
  const cleared = runLine(
    "clear plan",
    staged.state,
    "web",
    staged.session,
    "command",
  );

  assert.equal(cleared.response.status, "OK", cleared.text);
  assert.equal(cleared.cognitiveActivation, undefined);
  assert.equal(cleared.envelope.cognitiveActivation, undefined);
  assert.deepEqual(cleared.session.terminal.plan, []);
  assert.deepEqual(cleared.state, before);
});

test("planning guidance rejects tampered action identity and stale world binding", () => {
  const state = seedThreeState();
  const staged = runLine(
    "stage M1",
    state,
    "web",
    nexus.createAvaNexusSession(true, "campaign"),
    "command",
  );
  const issued = runLine(
    "issue plan",
    staged.state,
    "web",
    staged.session,
    "command",
  );
  const execution = directCognitiveExecution({
    line: "issue plan",
    publicResult: issued,
    state: staged.state,
    session: staged.session,
  });
  const exactIds = staged.compile.instruction.entities.map(
    (entity) => entity.id,
  );

  assert.throws(
    () =>
      cognitiveNexus.cognitivePlanningGuidanceFor(execution, {
        actionIds: ["maneuver:tampered"],
        worldRevision: execution.result.worldRevision,
      }),
    /stale or bound to different actions/i,
  );
  assert.throws(
    () =>
      cognitiveNexus.cognitivePlanningGuidanceFor(execution, {
        actionIds: exactIds,
        worldRevision: "stale-world-revision",
      }),
    /stale or bound to different actions/i,
  );
});

test("typed directive prepare crosses the exact PLAN_ONLY gate before proposal creation", () => {
  const initial = stateFor();
  const docket = runLine(
    "production",
    initial,
    "web",
    nexus.createAvaNexusSession(true, "campaign"),
    "command",
  );
  const state = docket.state;
  const before = structuredClone(state);
  const choiceId = docket.response.fact.choiceIds[0];
  const directive = avaRuntime
    .enumerateAvaActions(state)
    .find(
      (descriptor) =>
        descriptor.kind === "directive" &&
        descriptor.action.choiceId === choiceId,
    )
    ?.action;
  assert.ok(directive);
  const prepared = runTyped(
    {
      kind: "action",
      origin: "browser-ui",
      action: directive,
      mode: "prepare",
      idempotencyKey: "typed-directive-prepare",
      expectedStateSeal: nexus.avaNexusStateRevision(state),
    },
    state,
    docket.session,
  );

  assert.equal(prepared.response.status, "PREPARED", prepared.text);
  assert.deepEqual(activationFor(prepared).operatorFamilies, [
    "PLANNING",
    "REALIZATION",
  ]);
  assert.equal(prepared.cognitiveActivation.authority, "PLAN_ONLY");
  assert.ok(prepared.session.proposalToken);
  assert.equal(prepared.state.decisions.length, before.decisions.length);
  assert.equal(prepared.state.actions, before.actions);
});

test("typed directive and confirmation idempotency keys cannot cross payloads", () => {
  const initial = stateFor();
  const docket = runLine(
    "production",
    initial,
    "web",
    nexus.createAvaNexusSession(true, "campaign"),
    "command",
  );
  const choiceIds = docket.response.fact.choiceIds;
  assert.ok(choiceIds.length >= 2);
  const descriptors = avaRuntime.enumerateAvaActions(docket.state);
  const actions = choiceIds.slice(0, 2).map(
    (choiceId) =>
      descriptors.find(
        (descriptor) =>
          descriptor.kind === "directive" &&
          descriptor.action.choiceId === choiceId,
      )?.action,
  );
  assert.ok(actions[0] && actions[1]);
  const sharedPrepareKey = "typed-directive-shared-prepare";
  const first = runTyped(
    {
      kind: "action",
      origin: "browser-ui",
      action: actions[0],
      mode: "prepare",
      idempotencyKey: sharedPrepareKey,
      expectedStateSeal: nexus.avaNexusStateRevision(docket.state),
    },
    docket.state,
    docket.session,
  );
  assert.equal(first.response.status, "PREPARED", first.text);
  const conflictingPrepare = runTyped(
    {
      kind: "action",
      origin: "browser-ui",
      action: actions[1],
      mode: "prepare",
      idempotencyKey: sharedPrepareKey,
      expectedStateSeal: nexus.avaNexusStateRevision(first.state),
    },
    first.state,
    first.session,
  );
  assert.equal(conflictingPrepare.response.status, "REJECTED");
  assert.equal(
    conflictingPrepare.response.recovery?.code,
    "IDEMPOTENCY_CONFLICT",
  );
  assert.equal(conflictingPrepare.cognitiveActivation, undefined);
  assert.strictEqual(conflictingPrepare.state, first.state);

  const preparedSecond = runTyped(
    {
      kind: "action",
      origin: "browser-ui",
      action: actions[1],
      mode: "prepare",
      idempotencyKey: "typed-directive-second-prepare",
      expectedStateSeal: nexus.avaNexusStateRevision(first.state),
    },
    first.state,
    first.session,
  );
  assert.equal(preparedSecond.response.status, "PREPARED", preparedSecond.text);
  const sharedConfirmKey = "typed-directive-shared-confirm";
  const confirmed = runTyped(
    {
      kind: "confirmation",
      origin: "browser-ui",
      token: first.session.proposalToken,
      idempotencyKey: sharedConfirmKey,
      expectedStateSeal: nexus.avaNexusStateRevision(preparedSecond.state),
    },
    preparedSecond.state,
    preparedSecond.session,
  );
  assert.equal(confirmed.response.status, "EXECUTED", confirmed.text);
  const conflictingConfirm = runTyped(
    {
      kind: "confirmation",
      origin: "browser-ui",
      token: preparedSecond.session.proposalToken,
      idempotencyKey: sharedConfirmKey,
      expectedStateSeal: nexus.avaNexusStateRevision(confirmed.state),
    },
    confirmed.state,
    confirmed.session,
  );
  assert.equal(conflictingConfirm.response.status, "REJECTED");
  assert.equal(
    conflictingConfirm.response.recovery?.code,
    "IDEMPOTENCY_CONFLICT",
  );
  assert.strictEqual(conflictingConfirm.state, confirmed.state);

  const replayedPrepare = runTyped(
    {
      kind: "action",
      origin: "browser-ui",
      action: actions[0],
      mode: "prepare",
      idempotencyKey: sharedPrepareKey,
      expectedStateSeal: nexus.avaNexusStateRevision(confirmed.state),
    },
    confirmed.state,
    confirmed.session,
  );
  assert.equal(replayedPrepare.response.status, "ALREADY_EXECUTED");
  assert.equal(replayedPrepare.cognitiveActivation, undefined);
  assert.strictEqual(replayedPrepare.state, confirmed.state);
  assert.equal(
    replayedPrepare.state.preparedOrders.length,
    confirmed.state.preparedOrders.length,
  );
});

test("text day resolution is planned before confirmation and duplicate typed actions fail closed", () => {
  const state = stateFor();
  const before = structuredClone(state);
  const resolution = runLine(
    "resolve day",
    state,
    "web",
    nexus.createAvaNexusSession(true, "campaign"),
    "command",
  );
  assert.equal(resolution.response.status, "OK", resolution.text);
  assert.equal(resolution.cognitiveActivation.authority, "PLAN_ONLY");
  assert.deepEqual(resolution.cognitiveActivation.operatorFamilies, [
    "PLANNING",
    "REALIZATION",
  ]);
  assert.ok(resolution.session.terminal.confirmation);
  assert.deepEqual(resolution.state, before);

  const maneuver = avaRuntime
    .enumerateAvaActions(state)
    .find((descriptor) => descriptor.kind === "maneuver" && descriptor.available)
    ?.action;
  assert.ok(maneuver);
  const duplicate = runTyped(
    {
      kind: "plan",
      origin: "browser-ui",
      actions: [maneuver, maneuver],
      mode: "execute",
      idempotencyKey: "typed-duplicate-plan",
      expectedStateSeal: nexus.avaNexusStateRevision(state),
    },
    state,
  );
  assert.equal(duplicate.response.status, "REJECTED");
  assert.equal(duplicate.response.recovery?.code, "DUPLICATE_PLAN_ACTION");
  assert.equal(duplicate.cognitiveActivation, undefined);
  assert.deepEqual(duplicate.state, before);
});

test("typed action and plan execution cross planning before Nexus-only mutation", () => {
  const actionState = stateFor();
  const maneuver = avaRuntime
    .enumerateAvaActions(actionState)
    .find((descriptor) => descriptor.kind === "maneuver" && descriptor.available)
    ?.action;
  assert.ok(maneuver);
  const actionResult = runTyped(
    {
      kind: "action",
      origin: "browser-ui",
      action: maneuver,
      mode: "execute",
      idempotencyKey: "typed-cognitive-action",
      expectedStateSeal: nexus.avaNexusStateRevision(actionState),
    },
    actionState,
  );
  assert.equal(actionResult.response.status, "EXECUTED", actionResult.text);
  assert.deepEqual(activationFor(actionResult).operatorFamilies, [
    "PLANNING",
    "REALIZATION",
  ]);
  assert.equal(actionResult.cognitiveActivation.authority, "PLAN_ONLY");
  assert.equal(actionResult.state.actions, actionState.actions - 1);
  assert.match(
    actionResult.state.avaExecutions.at(-1).payloadHash,
    /^ava_[a-f0-9]{64}$/,
  );

  const planState = { ...stateFor(), doctrine: 500 };
  const descriptors = avaRuntime.enumerateAvaActions(planState);
  const planManeuver = descriptors.find(
    (descriptor) => descriptor.kind === "maneuver" && descriptor.available,
  )?.action;
  const doctrine = descriptors.find(
    (descriptor) =>
      descriptor.kind === "doctrine-stage" && descriptor.available,
  )?.action;
  assert.ok(planManeuver && doctrine);
  const planResult = runTyped(
    {
      kind: "plan",
      origin: "browser-ui",
      actions: [planManeuver, doctrine],
      mode: "execute",
      idempotencyKey: "typed-cognitive-plan",
      expectedStateSeal: nexus.avaNexusStateRevision(planState),
    },
    planState,
  );
  assert.equal(planResult.response.status, "EXECUTED", planResult.text);
  assert.deepEqual(activationFor(planResult).operatorFamilies, [
    "PLANNING",
    "REALIZATION",
  ]);
  assert.equal(planResult.cognitiveActivation.authority, "PLAN_ONLY");
  assert.equal(planResult.state.actions, planState.actions - 1);
  assert.notDeepEqual(planResult.state, planState);
});

test("typed plan prepare validates all actions without mutating GameState", () => {
  const state = { ...stateFor(), doctrine: 500 };
  const before = structuredClone(state);
  const descriptors = avaRuntime.enumerateAvaActions(state);
  const actions = [
    descriptors.find(
      (descriptor) => descriptor.kind === "maneuver" && descriptor.available,
    )?.action,
    descriptors.find(
      (descriptor) =>
        descriptor.kind === "doctrine-stage" && descriptor.available,
    )?.action,
  ].filter(Boolean);
  assert.equal(actions.length, 2);
  const request = {
    kind: "plan",
    origin: "browser-ui",
    actions,
    mode: "prepare",
    idempotencyKey: "typed-plan-prepare",
    expectedStateSeal: nexus.avaNexusStateRevision(state),
  };
  const prepared = runTyped(request, state);

  assert.equal(prepared.response.status, "OK", prepared.text);
  assert.deepEqual(activationFor(prepared).operatorFamilies, [
    "PLANNING",
    "REALIZATION",
  ]);
  assert.equal(prepared.cognitiveActivation.authority, "PLAN_ONLY");
  assert.ok(prepared.session.terminal.confirmation);
  assert.match(
    prepared.session.typedPreparations?.[0]?.payloadHash ?? "",
    /^ava_[a-f0-9]{64}$/,
  );
  assert.deepEqual(prepared.state, before);

  const replayed = runTyped(request, prepared.state, prepared.session);
  assert.equal(replayed.response.status, "OK", replayed.text);
  assert.equal(replayed.cognitiveActivation, undefined);
  assert.strictEqual(replayed.state, prepared.state);
  assert.strictEqual(
    replayed.session.terminal.confirmation,
    prepared.session.terminal.confirmation,
  );
  assert.deepEqual(
    replayed.session.typedPreparations,
    prepared.session.typedPreparations,
  );

  const conflicting = runTyped(
    { ...request, actions: [actions[0]] },
    prepared.state,
    prepared.session,
  );
  assert.equal(conflicting.response.status, "REJECTED");
  assert.equal(conflicting.response.recovery?.code, "IDEMPOTENCY_CONFLICT");
  assert.equal(conflicting.cognitiveActivation, undefined);
  assert.strictEqual(conflicting.state, prepared.state);
  assert.strictEqual(
    conflicting.session.terminal.confirmation,
    prepared.session.terminal.confirmation,
  );
  assert.deepEqual(
    conflicting.session.typedPreparations,
    prepared.session.typedPreparations,
  );
});

test("sub-mission ticket binding rejects stale planning and idempotency forgery without public leakage", () => {
  const state = stateFor();
  const before = structuredClone(state);
  const action = avaRuntime
    .enumerateAvaActions(state)
    .find(
      (descriptor) => descriptor.kind === "sub-mission" && descriptor.available,
    )?.action;
  assert.ok(action && action.kind === "sub-mission");
  const forgedTicket = `${action.resolutionTicket}:forged`;
  const forged = runTyped(
    {
      kind: "action",
      origin: "browser-ui",
      action: { ...action, resolutionTicket: forgedTicket },
      mode: "execute",
      idempotencyKey: "typed-ticket-stale",
      expectedStateSeal: nexus.avaNexusStateRevision(state),
    },
    state,
  );
  assert.equal(forged.response.status, "REJECTED", forged.text);
  assert.equal(forged.cognitiveActivation, undefined);
  assert.deepEqual(forged.state, before);
  assert.doesNotMatch(
    JSON.stringify({ response: forged.response, proof: forged.proofGraph }),
    new RegExp(action.resolutionTicket.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );

  const validRequest = {
    kind: "action",
    origin: "browser-ui",
    action,
    mode: "execute",
    idempotencyKey: "typed-ticket-binding",
    expectedStateSeal: nexus.avaNexusStateRevision(state),
  };
  const executed = runTyped(validRequest, state);
  assert.equal(executed.response.status, "EXECUTED", executed.text);
  assert.equal(executed.cognitiveActivation.authority, "PLAN_ONLY");
  assert.doesNotMatch(
    JSON.stringify({
      response: executed.response,
      receipt: executed.cognitiveActivation,
      proof: executed.proofGraph,
    }),
    /resolutionTicket|campaign-substrate-v\d+:/i,
  );
  const conflict = runTyped(
    {
      ...validRequest,
      action: { ...action, resolutionTicket: forgedTicket },
    },
    executed.state,
    executed.session,
  );
  assert.equal(conflict.response.status, "REJECTED", conflict.text);
  assert.equal(conflict.response.recovery?.code, "IDEMPOTENCY_CONFLICT");
  assert.strictEqual(conflict.state, executed.state);
});

test("typed replay is side-effect free while blocked typed plans retain PLAN_ONLY proof", () => {
  const state = stateFor();
  const maneuver = avaRuntime
    .enumerateAvaActions(state)
    .find((descriptor) => descriptor.kind === "maneuver" && descriptor.available)
    ?.action;
  assert.ok(maneuver);
  const request = {
    kind: "action",
    origin: "browser-ui",
    action: maneuver,
    mode: "execute",
    idempotencyKey: "typed-replay-cognitive",
    expectedStateSeal: nexus.avaNexusStateRevision(state),
  };
  const executed = runTyped(request, state);
  const replay = runTyped(request, executed.state, executed.session);
  assert.equal(replay.response.status, "ALREADY_EXECUTED", replay.text);
  assert.strictEqual(replay.state, executed.state);
  assert.equal(replay.cognitiveActivation, undefined);

  const blockedState = stateFor();
  blockedState.actions = 1;
  const blockedBefore = structuredClone(blockedState);
  const actions = avaRuntime
    .enumerateAvaActions(blockedState)
    .filter((descriptor) => descriptor.kind === "maneuver" && descriptor.available)
    .slice(0, 2)
    .map((descriptor) => descriptor.action);
  const blocked = runTyped(
    {
      kind: "plan",
      origin: "browser-ui",
      actions,
      mode: "execute",
      idempotencyKey: "typed-blocked-plan",
      expectedStateSeal: nexus.avaNexusStateRevision(blockedState),
    },
    blockedState,
  );
  assert.equal(blocked.response.status, "REJECTED", blocked.text);
  assert.equal(blocked.response.recovery?.code, "COGNITIVE_PLAN_BLOCKED");
  assert.equal(blocked.cognitiveActivation.authority, "PLAN_ONLY");
  assert.deepEqual(blocked.state, blockedBefore);
  assert.equal(blocked.state.avaExecutions.length, 0);
});

test("non-directive staging never claims validation of a prior plan", () => {
  const state = seedThreeState();
  const first = runLine(
    "stage M1",
    state,
    "web",
    nexus.createAvaNexusSession(true, "campaign"),
    "command",
  );
  const second = runLine(
    "stage M2",
    first.state,
    "web",
    first.session,
    "command",
  );
  assert.equal(first.response.status, "OK", first.text);
  assert.equal(second.response.status, "OK", second.text);
  assert.equal(first.cognitiveActivation, undefined);
  assert.equal(second.cognitiveActivation, undefined);
  assert.equal(second.session.terminal.plan.length, 2);

  const shown = runLine(
    "show plan",
    second.state,
    "web",
    second.session,
    "command",
  );
  assert.equal(shown.response.status, "OK", shown.text);
  assert.equal(shown.cognitiveActivation.authority, "PLAN_ONLY");
  assert.match(shown.text, /COGNITIVE PLAN VALIDATION: PLANNED/);
});

test("FORECAST prose is bound to the sealed temporal artifact and rejects tampering", () => {
  const state = seedThreeState();
  const session = nexus.createAvaNexusSession(true, "campaign");
  const forecast = runLine("forecast M1", state, "web", session);
  const execution = directCognitiveExecution({
    line: "forecast M1",
    publicResult: forecast,
    state,
    session,
  });
  const guidance = cognitiveNexus.cognitiveForecastGuidanceFor(execution);

  assert.equal(forecast.response.status, "OK", forecast.text);
  assert.deepEqual(activationFor(forecast).operatorFamilies, [
    "REALIZATION",
    "TEMPORAL",
  ]);
  assert.ok(guidance, "temporal execution omitted its sealed forecast guidance");
  assert.equal(guidance.executionDigest, forecast.proofGraph.executionDigest);
  assert.equal(guidance.temporal.status, "FORECAST_ENVELOPE");
  assert.equal(guidance.temporal.forecast.outcomeSemantics, "UNBOUND");
  assert.ok(
    guidance.temporal.forecast.assumptions.includes(
      `projection:${guidance.artifact.digest}`,
    ),
  );
  assert.equal(execution.result.executions.at(-1).operator, "EXPLAIN");

  const projection = guidance.artifact.projection;
  assert.ok(projection, "projected maneuver omitted disclosed numeric bounds");
  const full = (value) => Math.round(value).toLocaleString();
  assert.ok(
    forecast.text.includes(
      `Projected friendly loss: ${full(projection.friendlyLoss)} (${full(projection.friendlyLossLow)}–${full(projection.friendlyLossHigh)})`,
    ),
  );
  assert.ok(
    forecast.text.includes(`Projected Net Flight: ${full(projection.netDesertion)}`),
  );
  assert.ok(
    forecast.text.includes(
      `Projected ground movement: ${projection.groundMovement >= 0 ? "+" : ""}${projection.groundMovement.toFixed(1)} km (${projection.groundLow.toFixed(1)} to ${projection.groundHigh.toFixed(1)})`,
    ),
  );
  assert.ok(
    forecast.text.includes(`Industrial shortages: ${projection.shortages}`),
  );
  assert.ok(
    forecast.text.includes(
      `Domestic collapse risk: ${(projection.collapseRisk * 100).toFixed(1)}%`,
    ),
  );
  assert.ok(guidance.artifact.confidence);
  assert.ok(
    forecast.text.includes(
      `Result: ${(guidance.artifact.confidence.result * 100).toFixed(1)}%`,
    ),
  );

  const tampered = structuredClone(execution);
  tampered.forecastArtifact.projection.friendlyLoss += 1;
  assert.throws(
    () => cognitiveNexus.cognitiveForecastGuidanceFor(tampered),
    /forecast artifact digest is invalid/,
  );
});

test("observational causal diagnosis names candidates without claiming identification", () => {
  const state = seedThreeState();
  const before = structuredClone(state);
  const session = nexus.createAvaNexusSession(true, "campaign");
  const diagnosis = runLine("what caused readiness", state, "web", session);

  assert.equal(diagnosis.response.status, "OK", diagnosis.text);
  assert.deepEqual(activationFor(diagnosis).operatorFamilies, [
    "CAUSAL",
    "REALIZATION",
  ]);
  assert.match(diagnosis.text, /CAUSAL DIAGNOSIS \/ OBSERVATIONAL ONLY/);
  assert.match(diagnosis.text, /RESULT: CANDIDATES ONLY/);
  assert.match(diagnosis.text, /CANDIDATES: EQUIPMENT, MATERIEL/);
  assert.match(diagnosis.text, /IDENTIFICATION: NOT ESTABLISHED/);
  assert.match(diagnosis.text, /no intervention was supplied/i);
  assert.doesNotMatch(diagnosis.text, /identified by intervention/i);
  assert.deepEqual(diagnosis.state, before);
  assert.deepEqual(state, before);
  for (const operatorId of ["FIND_CAUSE", "EXPLAIN"])
    assert.ok(
      diagnosis.proofGraph.nodes.some(
        (node) => node.kind === "OPERATOR" && node.operatorId === operatorId,
      ),
      `causal proof omitted ${operatorId}`,
    );

  const execution = directCognitiveExecution({
    line: "what caused readiness",
    publicResult: diagnosis,
    state,
    session,
  });
  const guidance = cognitiveNexus.cognitiveCausalGuidanceFor(execution);
  assert.ok(guidance, "causal execution omitted sealed guidance");
  assert.equal(guidance.executionDigest, diagnosis.proofGraph.executionDigest);
  assert.equal(guidance.artifact.variableId, "state.readiness");
  assert.equal(
    guidance.artifact.identification,
    "OBSERVATION_ONLY_NO_INTERVENTION",
  );
  assert.equal(guidance.causal.status, "CANDIDATES_ONLY");
  assert.deepEqual(guidance.causal.causeVariableIds, []);
  assert.deepEqual(guidance.causal.changes, []);
  assert.deepEqual(guidance.causal.candidateVariableIds, [
    "state.equipment",
    "state.materiel",
  ]);
  assert.ok(guidance.causal.proofIds.includes("observation-is-not-identification"));

  const tamperedArtifact = structuredClone(execution);
  tamperedArtifact.causalArtifact.variableId = "state.front";
  assert.throws(
    () => cognitiveNexus.cognitiveCausalGuidanceFor(tamperedArtifact),
    /causal artifact digest is invalid/,
  );
  const tamperedResult = structuredClone(execution);
  tamperedResult.result.output.value.value.status = "IDENTIFIED_BY_INTERVENTION";
  assert.throws(
    () => cognitiveNexus.cognitiveCausalGuidanceFor(tamperedResult),
    /realization binding digest is invalid/,
  );

  const hidden = structuredClone(state);
  hidden.adversary.force += 999_999;
  hidden.adversary.readiness = 1;
  hidden.adversary.posture = "Hidden causal canary";
  const hiddenDiagnosis = runLine(
    "what caused readiness",
    hidden,
    "web",
    nexus.createAvaNexusSession(true, "campaign"),
  );
  assert.equal(hiddenDiagnosis.text, diagnosis.text);
  assert.equal(hiddenDiagnosis.proofGraph.digest, diagnosis.proofGraph.digest);
  assert.deepEqual(
    activationFor(hiddenDiagnosis),
    activationFor(diagnosis),
  );
});

test("one-record epistemic bounds are explicit estimates, never corroboration", () => {
  const state = seedThreeState();
  const before = structuredClone(state);
  const session = nexus.createAvaNexusSession(true, "campaign");
  const bounded = runLine(
    "how certain is intelligence",
    state,
    "web",
    session,
  );

  assert.equal(bounded.response.status, "OK", bounded.text);
  assert.deepEqual(activationFor(bounded).operatorFamilies, [
    "EPISTEMIC",
    "REALIZATION",
  ]);
  assert.match(bounded.text, /EVIDENCE BOUND \/ SINGLE AUTHORITATIVE RECORD/);
  assert.match(bounded.text, new RegExp(`ESTIMATE: ${state.intelligence.toFixed(1)}`));
  assert.match(
    bounded.text,
    new RegExp(
      `BOUND: ${state.intelligence.toFixed(1)} TO ${state.intelligence.toFixed(1)}`,
    ),
  );
  assert.match(bounded.text, /one-record evidence bound/i);
  assert.match(bounded.text, /It is not corroboration/i);
  assert.deepEqual(bounded.state, before);
  assert.deepEqual(state, before);
  for (const operatorId of ["BOUND", "EXPLAIN"])
    assert.ok(
      bounded.proofGraph.nodes.some(
        (node) => node.kind === "OPERATOR" && node.operatorId === operatorId,
      ),
      `epistemic proof omitted ${operatorId}`,
    );

  const execution = directCognitiveExecution({
    line: "how certain is intelligence",
    publicResult: bounded,
    state,
    session,
  });
  const guidance = cognitiveNexus.cognitiveEpistemicGuidanceFor(execution);
  assert.ok(guidance, "epistemic execution omitted sealed guidance");
  assert.equal(guidance.executionDigest, bounded.proofGraph.executionDigest);
  assert.equal(guidance.artifact.variableId, "state.intelligence");
  assert.equal(guidance.artifact.recordCount, 1);
  assert.equal(
    guidance.artifact.interpretation,
    "EVIDENCE_BOUND_NOT_CORROBORATION",
  );
  assert.equal(guidance.epistemic.kind, "BOUND");
  assert.equal(guidance.epistemic.status, "BOUNDED");
  assert.equal(guidance.epistemic.value, state.intelligence);
  assert.deepEqual(guidance.epistemic.interval, {
    low: state.intelligence,
    high: state.intelligence,
  });
  assert.ok(guidance.epistemic.proofIds.includes("estimate-replay"));
  assert.ok(guidance.epistemic.proofIds.includes("evidence-bound"));

  const tamperedArtifact = structuredClone(execution);
  tamperedArtifact.epistemicArtifact.factId = "fact:state.readiness";
  assert.throws(
    () => cognitiveNexus.cognitiveEpistemicGuidanceFor(tamperedArtifact),
    /epistemic artifact digest is invalid/,
  );
  const tamperedResult = structuredClone(execution);
  tamperedResult.result.output.value.value.interval.high += 1;
  assert.throws(
    () => cognitiveNexus.cognitiveEpistemicGuidanceFor(tamperedResult),
    /realization binding digest is invalid/,
  );

  for (const line of [
    "estimate intelligence",
    "bound intelligence",
    "confidence in intelligence",
  ]) {
    const explicit = runLine(line, state);
    assert.equal(explicit.response.status, "OK", `${line}: ${explicit.text}`);
    assert.deepEqual(activationFor(explicit).operatorFamilies, [
      "EPISTEMIC",
      "REALIZATION",
    ]);
    assert.match(explicit.text, /It is not corroboration/i);
    assert.deepEqual(explicit.state, before);
  }

  const hidden = structuredClone(state);
  hidden.adversary.force += 999_999;
  hidden.adversary.readiness = 1;
  hidden.adversary.posture = "Hidden epistemic canary";
  const hiddenBound = runLine(
    "how certain is intelligence",
    hidden,
    "web",
    nexus.createAvaNexusSession(true, "campaign"),
  );
  assert.equal(hiddenBound.text, bounded.text);
  assert.equal(hiddenBound.proofGraph.digest, bounded.proofGraph.digest);
  assert.deepEqual(activationFor(hiddenBound), activationFor(bounded));
});

test("cognitive decision authority survives discourse references", () => {
  const state = stateFor();
  const first = run(state);
  const firstWinner = first.response.fact.answerPlan.rankedOptions[0];
  const second = runLine(
    "what about the other one",
    first.state,
    "web",
    first.session,
  );
  const secondWinner = second.response.fact.answerPlan.rankedOptions[0];

  assert.equal(second.response.status, "OK", second.text);
  assert.deepEqual(second.cognitiveActivation.operatorFamilies, [
    "DECISION",
    "REALIZATION",
  ]);
  assert.notEqual(secondWinner, firstWinner);
  assert.ok(
    second.proofGraph.nodes.some(
      (node) => node.claim === `Cognitive decision selected ${secondWinner}`,
    ),
  );
});
