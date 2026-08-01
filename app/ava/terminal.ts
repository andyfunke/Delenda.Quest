import {
  FAMILIES,
  MANEUVERS,
  explainManeuverChance,
  fmt,
  maneuverForSituation,
  situationForState,
  type GameState,
} from "../game";
import { CONCEPTS, calculationFor } from "../concepts";
import { compileConvergence } from "../convergence";
import { buildAvaReport } from "./reports";
import {
  actionKey,
  avaStateRevision,
  buildAvaPlan,
  descriptorForAction,
  enumerateAvaActions,
  executeAvaAction,
  executeAvaConfirmation,
  executeAvaPlan,
  renderAvaAction,
  stageAvaConfirmation,
} from "./runtime";
import {
  AVA_COMMAND_HELP,
  type AvaActionDescriptor,
  type AvaActionRef,
  type AvaConfirmation,
  type AvaEntity,
  type AvaInstruction,
  type AvaModule,
  type AvaReportCard,
  type AvaReportTopic,
} from "./schema";
import { createAvaTextFrame, renderAvaTextFrame } from "./text-schema";
import { voiceAvaResponse, type AvaVoiceCue } from "./voice";
import {
  executeAvaShell,
  initialAvaShellSession,
  saveAvaReportSnapshot,
} from "./filesystem";
import { avaWorkbookFilename, buildAvaCsvBundle, buildAvaWorkbook } from "./workbook";
import { answerSemanticQuery } from "./advisory";
import {
  canonicalDailyBriefing,
  summarizedDailyBriefing,
} from "./campaign-narrative";
import { projectAvaEnvelope } from "./projection";
import { avaVisibleWorldRevision } from "./world-model";
import type { AvaDarkNetContext } from "./darknet";
import type { CanonicalProofGraph } from "./proof-graph";
import type {
  AvaCognitiveCausalGuidance,
  AvaCognitiveConstraintGuidance,
  AvaCognitiveDecisionGuidance,
  AvaCognitiveEpistemicGuidance,
  AvaCognitiveForecastGuidance,
  AvaCognitivePlanningGuidance,
} from "./cognitive-nexus";
import type {
  AvaAnswerPlan,
  AvaCompilerTrace,
  AvaDiscourseState,
  AvaSemanticQuery,
} from "./schema";
import { formatPublicRating, publicCognitiveRating } from "./public-rating";

export { completeAvaInput } from "./completion";
export { avaShellFileReferences } from "./filesystem";

export type AvaDetail = "glance" | "standard" | "deep";
export type AvaTerminalSession = {
  plan: AvaActionRef[];
  confirmation: AvaConfirmation | null;
  lastText: string;
  detail: AvaDetail;
  shell: ReturnType<typeof initialAvaShellSession>;
  discourse: AvaDiscourseState;
  voiceCursor: number;
};
export type AvaTerminalResult = {
  state: GameState;
  session: AvaTerminalSession;
  text: string;
  report?: AvaReportCard;
  navigate?: string;
  executed: boolean;
  rejection?: string;
  outputKind?: "ava" | "shell";
  clearScreen?: boolean;
  aphorismViewIds?: string[];
  download?: {
    virtualPath: string;
    filename: string;
    mime: string;
    bytes: Uint8Array;
    stateRevision: string;
  };
  chatExport?: {
    filename: string;
    mime: "text/markdown;charset=utf-8";
  };
  archiveRequest?: {
    operation: "search" | "maps" | "photos" | "open" | "cite" | "save" | "analog";
    query: string;
  };
  answerPlan?: AvaAnswerPlan;
  proofGraph?: CanonicalProofGraph;
  trace?: {
    compiler?: AvaCompilerTrace;
    semantic?: AvaSemanticQuery;
    retrievedFacts: string[];
    answerPlan?: AvaAnswerPlan;
    proofGraph?: CanonicalProofGraph;
    renderedResponse: string;
  };
};

export const initialAvaTerminalSession = (): AvaTerminalSession => ({
  plan: [],
  confirmation: null,
  lastText: "",
  detail: "standard",
  shell: initialAvaShellSession(),
  discourse: {
    lastEntities: [],
    lastScope: [],
    suppressedAdviceScopes: [],
    realizationHistory: [],
  },
  voiceCursor: 0,
});

export const resetAvaDiscourseForNewDay = (
  discourse: AvaDiscourseState,
): AvaDiscourseState => ({
  ...discourse,
  lastSubject: undefined,
  lastEntities: [],
  lastRecommended: undefined,
  lastScope: [],
  selectedObject: undefined,
  unresolvedAmbiguity: undefined,
  directiveContext: undefined,
});

const resetIssuedPlan = (
  session: AvaTerminalSession,
  newCampaignDay = false,
): AvaTerminalSession => ({
  ...initialAvaTerminalSession(),
  detail: session.detail,
  shell: session.shell,
  discourse: newCampaignDay
    ? resetAvaDiscourseForNewDay(session.discourse)
    : session.discourse,
  voiceCursor: session.voiceCursor,
});

const withHeader = (state: GameState, body: string) =>
  renderAvaTextFrame(createAvaTextFrame(state, avaStateRevision(state), body));
const finalize = (
  state: GameState,
  session: AvaTerminalSession,
  text: string,
  extra: Partial<Omit<AvaTerminalResult, "state" | "session" | "text">> = {},
): AvaTerminalResult => {
  return {
    state,
    session: { ...session, lastText: text },
    text,
    ...extra,
    executed: extra.executed ?? false,
  };
};
const listed = (actions: AvaActionDescriptor[]) =>
  actions
    .map(
      (item) =>
        `[${item.handle}] ${item.label} · ${item.available ? "AVAILABLE" : `LOCKED: ${item.rejection}`}`,
    )
    .join("\n");
const actionEntities = (
  instruction: Extract<AvaInstruction, { kind: "STAGE" | "UNSTAGE" | "ISSUE" }>,
) =>
  instruction.entities
    .map((entity) => entity.action)
    .filter((action): action is AvaActionRef => !!action);

const reportText = (
  report: AvaReportCard,
  detail: AvaDetail = "standard",
) => {
  const context = `SITUATION\n${report.title}`,
    answer = `ANSWER\n${report.direct}`,
    judgment = `JUDGMENT\n${report.recommendation}`,
    grammar = `GRAMMAR\n${report.commands.map((command) => `> ${command}`).join("\n")}`;
  if (detail === "glance")
    return [context, answer, judgment, grammar].join("\n\n");
  const standard = [
    context,
    answer,
    judgment,
  ];
  if (detail === "deep")
    standard.push(
      `CALCULATION\n${report.calculation.equation}\n${report.calculation.rows.map((row) => `${row.label}: ${row.value}`).join("\n")}`,
      `CUMULATIVE INTELLIGENCE\n${report.history.observations.join("\n")}`,
      `DEPENDENCIES\n${report.links.map((link) => link.label.toUpperCase()).join("\n") || "No further causal dependency is declared."}`,
      `LEDGER SCOPE\nRESOLVED DAYS: ${report.history.resolvedDays}\nREQUESTED DAYS: ${report.history.requestedDays ?? "ALL AVAILABLE"}\nOBSERVED ENEMY ORDERS: ${report.history.observedOrders}`,
    );
  return [...standard, grammar].join("\n\n");
};

const scopeActions = (actions: AvaActionDescriptor[], scope?: string) => {
  if (!scope || scope === "missions")
    return actions.filter(
      (item) => item.domain || item.kind === "opportunity-response",
    );
  if (scope === "production")
    return actions.filter(
      (item) =>
        item.kind === "directive" && /Production/i.test(item.parentLabel),
    );
  if (scope === "military")
    return actions.filter(
      (item) => item.kind === "directive" && /Military/i.test(item.parentLabel),
    );
  if (scope === "diplomacy")
    return actions.filter(
      (item) =>
        item.kind === "directive" && /Diplomacy/i.test(item.parentLabel),
    );
  if (scope === "doctrine")
    return actions.filter((item) => item.kind === "doctrine-stage");
  if (scope === "campaign")
    return actions.filter((item) => item.kind === "maneuver");
  if (scope === "domestic" || scope === "network")
    return actions.filter((item) => item.domain === scope);
  if (scope === "opportunities")
    return actions.filter((item) => item.kind === "opportunity-response");
  if (scope === "directives")
    return actions.filter((item) => item.kind === "directive");
  return actions;
};

const missionText = (state: GameState, fraction: number) => {
  const packet = compileConvergence(state),
    actions = enumerateAvaActions(state, fraction),
    main = actions.filter((item) => item.domain === "main"),
    domestic = actions.filter((item) => item.domain === "domestic"),
    network = actions.filter((item) => item.domain === "network"),
    opportunity = actions.filter(
      (item) => item.kind === "opportunity-response",
    );
  const sections = [
    "MISSIONS [SEALED D+0]",
    `MAIN CAMPAIGN / ${packet.operational.sector}\n${packet.operational.question}\n${listed(main)}`,
    packet.activeDomains.includes("domestic")
      ? `DOMESTIC FRONT / ${packet.domestic.title}\nPRESSURE: ${packet.domestic.pressureBand.toUpperCase()}\n${packet.domestic.question}\nWHY TODAY: ${packet.domestic.convergence.map((edge) => edge.summary).join(" ")}\n${listed(domestic)}`
      : null,
    packet.activeDomains.includes("network")
      ? `COMMAND NETWORK / ${packet.network.title}\nPRESSURE: ${packet.network.pressureBand.toUpperCase()}\n${packet.network.question}\nWHY TODAY: ${packet.network.convergence.map((edge) => edge.summary).join(" ")}\n${listed(network)}`
      : null,
    opportunity.length
      ? `TARGET OF OPPORTUNITY\n${listed(opportunity)}`
      : "TARGET OF OPPORTUNITY: NONE ACTIVE",
    `COMMANDS\n> stage M2${packet.activeDomains.includes("domestic") ? " D1" : ""}${packet.activeDomains.includes("network") ? " N3" : ""}\n> forecast M2\n> production\n> compare M2 production 1\n> issue plan`,
  ];
  return sections.filter((section):section is string=>!!section).join("\n\n");
};

const planText = (
  state: GameState,
  session: AvaTerminalSession,
  fraction: number,
  cognitivePlanning?: AvaCognitivePlanningGuidance,
) => {
  if (!session.plan.length)
    return "PLAN: EMPTY\nUse MISSIONS, then STAGE one or more handles.";
  const plan = buildAvaPlan(state, session.plan, fraction),
    descriptors = plan.actions
      .map((action) => descriptorForAction(state, action, fraction))
      .filter((item): item is AvaActionDescriptor => !!item);
  return [
    `PLAN: ${plan.id} · SEALED TO CURRENT COMMAND LEDGER`,
    `COST: ${plan.orderCost} ORDERS · ${plan.insightCost} INSIGHT`,
    ...(cognitivePlanning
      ? [
          `COGNITIVE PLAN VALIDATION: ${cognitivePlanning.planning.status} · PLAN ONLY / NO MUTATION${
            cognitivePlanning.planning.blockers.length
              ? `\nBLOCKERS\n${cognitivePlanning.planning.blockers.join("\n")}`
              : ""
          }`,
        ]
      : []),
    ...descriptors.map(renderAvaAction),
    "COMMANDS\n> forecast plan\n> issue plan\n> clear plan",
  ].join("\n\n");
};

const constraintText = (
  guidance: AvaCognitiveConstraintGuidance,
) => {
  const result = guidance.feasibility;
  const viable = guidance.artifact.available && result.outcome === "FEASIBLE";
  const constraintLines = result.constraints.map(
    (constraint) =>
      `${constraint.status}: ${constraint.constraintId}${
        constraint.missingBindings.length
          ? ` · MISSING ${constraint.missingBindings.join(", ")}`
          : ""
      }`,
  );
  return [
    "COMPILED PRECONDITION CHECK",
    `TARGET: ${guidance.artifact.targetId}`,
    `VIABLE: ${viable ? "YES" : "NO"}`,
    `OUTCOME: ${result.outcome}`,
    `DOCKET: ${
      guidance.artifact.available
        ? "AVAILABLE"
        : `UNAVAILABLE${
            guidance.artifact.rejection
              ? ` · ${guidance.artifact.rejection}`
              : ""
          }`
    }`,
    `CONSTRAINTS\n${constraintLines.join("\n") || "No compiled constraint result was returned."}`,
    result.prerequisites.length
      ? `PREREQUISITES\n${result.prerequisites.join("\n")}`
      : null,
    result.smallestRepair
      ? `SMALLEST REPAIR\n${result.smallestRepair.id}`
      : null,
    "AUTHORITY\nREAD ONLY · NO STAGE · NO PREPARE · NO MUTATION",
  ]
    .filter((section): section is string => !!section)
    .join("\n\n");
};

const cognitiveVariableLabel = (variableId: string) =>
  variableId
    .replace(/^state\./, "")
    .replaceAll(/[-_.]+/g, " ")
    .toUpperCase();

const causalDiagnosisText = (guidance: AvaCognitiveCausalGuidance) => {
  const result = guidance.causal;
  const candidates = result.candidateVariableIds.map(cognitiveVariableLabel);
  return [
    "CAUSAL DIAGNOSIS / OBSERVATIONAL ONLY",
    `TARGET: ${cognitiveVariableLabel(guidance.artifact.variableId)}`,
    `RESULT: ${result.status.replaceAll("_", " ")}`,
    `CANDIDATES: ${candidates.join(", ") || "NONE IN THE COMPILED STRUCTURAL MODEL"}`,
    "IDENTIFICATION: NOT ESTABLISHED",
    "The visible observations can nominate compiled causal ancestors, but no intervention was supplied. Ava is not claiming that an observational candidate caused the current value.",
    `EVIDENCE SCOPE: ${guidance.artifact.observationFactIds.length} AVA-VISIBLE RECORDS`,
    "AUTHORITY\nREAD ONLY · NO STAGE · NO PREPARE · NO MUTATION",
  ].join("\n\n");
};

const evidenceBoundText = (guidance: AvaCognitiveEpistemicGuidance) => {
  const result = guidance.epistemic;
  if (typeof result.value !== "number" || !result.interval)
    throw new Error("cognitive evidence bound omitted its numeric result");
  return [
    "EVIDENCE BOUND / SINGLE AUTHORITATIVE RECORD",
    `TARGET: ${cognitiveVariableLabel(guidance.artifact.variableId)}`,
    `ESTIMATE: ${result.value.toFixed(1)}`,
    `BOUND: ${result.interval.low.toFixed(1)} TO ${result.interval.high.toFixed(1)}`,
    `SOURCE RELIABILITY WEIGHT: ${((result.confidence ?? 0) * 100).toFixed(1)}%`,
    "INTERPRETATION: This is a one-record evidence bound from the current authoritative campaign ledger. It is not corroboration and does not establish independent agreement.",
    "AUTHORITY\nREAD ONLY · NO STAGE · NO PREPARE · NO MUTATION",
  ].join("\n\n");
};

const cognitiveComparisonText = (
  state: GameState,
  descriptors: readonly [AvaActionDescriptor, AvaActionDescriptor],
  guidance: AvaCognitiveDecisionGuidance,
) => {
  const decision = guidance.decision;
  const descriptorIds = descriptors.map((descriptor) => descriptor.id).sort();
  const rankingIds = [...decision.ranking].sort();
  if (
    decision.kind !== "COMPARE" ||
    decision.worldRevision !== avaVisibleWorldRevision(state) ||
    descriptorIds.join("\u0000") !== rankingIds.join("\u0000") ||
    !decision.winnerId ||
    decision.ranking[0] !== decision.winnerId
  )
    throw new Error(
      "cognitive comparison does not cover the rendered action pair",
    );
  const labels = new Map(
    descriptors.map((descriptor) => [descriptor.id, descriptor]),
  );
  const ranked = decision.ranking.map((id, index) => {
    const descriptor = labels.get(id);
    const candidate = decision.candidates.find(
      (item) => item.candidateId === id,
    );
    if (!descriptor || !candidate)
      throw new Error("cognitive comparison omitted a ranked candidate");
    const metrics = candidate.metrics
      .map((metric) => {
        const value =
          metric.raw.low === metric.raw.high
            ? metric.raw.low.toFixed(1)
            : `${metric.raw.low.toFixed(1)} TO ${metric.raw.high.toFixed(1)}`;
        return `${metric.metricId.toUpperCase()} ${value}`;
      })
      .join(" · ");
    const rating = publicCognitiveRating(
      candidate.utility.low,
      candidate.utility.high,
    );
    return `${index + 1}. [${descriptor.handle}] ${descriptor.label} · ${formatPublicRating(rating)} · ${metrics}`;
  });
  const winner = labels.get(decision.winnerId)!;
  return [
    "COMPARISON / COGNITIVE NEXUS",
    `MODEL: ${decision.modelId.toUpperCase()}`,
    `RANKING\n${ranked.join("\n")}`,
    `JUDGMENT\n[${winner.handle}] ${winner.label} ranks first under the compiled robust decision model.`,
    `TRADEOFFS\n${decision.tradeoffs.join("\n") || "No compiled tradeoff was returned."}`,
    "AUTHORITY\nREAD ONLY · NO ORDER WAS STAGED, PREPARED, OR ISSUED",
  ].join("\n\n");
};

const scalarSnapshot = (state: GameState) => ({
  actions: state.actions,
  front: state.front,
  armed: state.armed,
  deployable: state.deployable,
  readiness: state.readiness,
  equipment: state.equipment,
  materiel: state.materiel,
  treasury: state.treasury,
  legitimacy: state.legitimacy,
  resistance: state.resistance,
  dependency: state.dependency,
  intelligence: state.intelligence,
  doctrine: state.doctrine,
});
const diffText = (before: GameState, after: GameState) =>
  Object.entries(scalarSnapshot(before))
    .flatMap(([key, value]) => {
      const next =
          scalarSnapshot(after)[key as keyof ReturnType<typeof scalarSnapshot>],
        delta = next - value;
      return delta
        ? [
            `${key.toUpperCase()}: ${value.toFixed(1)} → ${next.toFixed(1)} · CHANGE: ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`,
          ]
        : [];
    })
    .join("\n") ||
  "No immediate ledger total changes. The order changes posture, timing, access, or an active policy instead.";

const cognitiveChangeText = (
  guidance: AvaCognitiveForecastGuidance,
) =>
  guidance.artifact.changes.length
    ? guidance.artifact.changes
        .map(({ metric, before, after }) => {
          const delta = after - before;
          return `${metric.toUpperCase()}: ${before.toFixed(1)} → ${after.toFixed(1)} · CHANGE: ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`;
        })
        .join("\n")
    : "No immediate ledger total changes. The order changes posture, timing, access, or an active policy instead.";

const cognitiveProjectionLines = (
  guidance: AvaCognitiveForecastGuidance,
) => {
  const projection = guidance.artifact.projection;
  if (!projection)
    throw new Error("cognitive forecast omitted its disclosed projection");
  return [
    `Projected friendly loss: ${fmt(projection.friendlyLoss, true)} (${fmt(projection.friendlyLossLow, true)}–${fmt(projection.friendlyLossHigh, true)})`,
    `Projected Net Flight: ${fmt(projection.netDesertion, true)}`,
    `Projected ground movement: ${projection.groundMovement >= 0 ? "+" : ""}${projection.groundMovement.toFixed(1)} km (${projection.groundLow.toFixed(1)} to ${projection.groundHigh.toFixed(1)})`,
    `Industrial shortages: ${projection.shortages}`,
    `Domestic collapse risk: ${(projection.collapseRisk * 100).toFixed(1)}%`,
    `Disclosure: ${projection.disclosure}`,
  ];
};

const cognitiveForecastText = (
  state: GameState,
  action: AvaActionRef | undefined,
  fraction: number,
  guidance: AvaCognitiveForecastGuidance,
) => {
  const expectedTarget = action ? actionKey(action) : "standing";
  if (guidance.artifact.targetId !== expectedTarget)
    throw new Error("cognitive forecast target does not match the realized request");
  const descriptor = action
    ? descriptorForAction(state, action, fraction)
    : undefined;
  if (guidance.artifact.status === "UNAVAILABLE")
    return `${descriptor ? `${renderAvaAction(descriptor)}\n\n` : ""}PROJECTION UNAVAILABLE: ${guidance.artifact.reason ?? "No disclosed projection is available."}`;
  if (guidance.artifact.status === "SEALED")
    return `${descriptor ? `${renderAvaAction(descriptor)}\n\n` : ""}SEALED BOUNDARY\n${guidance.artifact.reason ?? "The unresolved branch remains sealed."}`;
  if (!action) {
    const projection = guidance.artifact.projection;
    if (!projection)
      throw new Error("standing cognitive forecast omitted its projection");
    return `STANDING PROJECTION [PROJECTED CURRENT DAY]\nFriendly loss ${fmt(projection.friendlyLoss, true)} · Net Flight ${fmt(projection.netDesertion, true)} · ground ${projection.groundMovement >= 0 ? "+" : ""}${projection.groundMovement.toFixed(1)} km.`;
  }
  if (!descriptor)
    throw new Error("cognitive forecast descriptor left the current docket");
  if (action.kind === "maneuver") {
    const confidence = guidance.artifact.confidence;
    if (!confidence)
      throw new Error("maneuver forecast omitted its confidence calculation");
    return [
      "FIELD NOTE / PROJECTION\nA projection is the battlefield confessing under controlled pressure. It tells the truth only about the orders already on the table.",
      renderAvaAction(descriptor),
      `PROJECTED DAY CONSEQUENCE\n${cognitiveProjectionLines(guidance).join("\n")}`,
      `CALCULATION\nExecution confidence = base chance + readiness + equipment + intelligence + doctrine + operational fit − enemy adaptation\n${confidence.terms
        .map(
          (term) =>
            `${term.label}: ${term.points >= 0 ? "+" : ""}${term.points.toFixed(1)} points`,
        )
        .join("\n")}\nResult: ${(confidence.result * 100).toFixed(1)}%`,
      "PRINCIPAL UNCERTAINTY\nThe confidence estimate does not disclose or pre-resolve the sealed day outcome.",
      `DECLARED CHANGE [PROJECTED]\n${cognitiveChangeText(guidance)}`,
    ].join("\n\n");
  }
  return `${renderAvaAction(descriptor)}\n\nDECLARED CHANGE [PROJECTED]\n${cognitiveChangeText(guidance)}`;
};

const actionProjection = (
  state: GameState,
  action: AvaActionRef,
  fraction: number,
) => {
  const preview = executeAvaAction(state, action, fraction);
  if (!preview.executed) return { preview };
  return {
    preview,
    projection: projectAvaEnvelope(preview.state),
  };
};

const projectionLines = (
  state: GameState,
  action: AvaActionRef,
  fraction: number,
) => {
  const projection = actionProjection(state, action, fraction);
  if (!projection.preview.executed)
    return [`ORDER REJECTED: ${projection.preview.rejection}`];
  const disclosed = projection.projection;
  if (!disclosed)
    return ["No disclosed projection is available."];
  return [
    `Projected friendly loss: ${fmt(disclosed.friendlyLoss, true)} (${fmt(disclosed.friendlyLossLow, true)}–${fmt(disclosed.friendlyLossHigh, true)})`,
    `Projected Net Flight: ${fmt(disclosed.personnel.netDesertion, true)}`,
    `Projected ground movement: ${disclosed.groundMovement >= 0 ? "+" : ""}${disclosed.groundMovement.toFixed(1)} km (${disclosed.groundLow.toFixed(1)} to ${disclosed.groundHigh.toFixed(1)})`,
    `Industrial shortages: ${disclosed.production.shortages}`,
    `Domestic collapse risk: ${(disclosed.domestic.collapseRisk * 100).toFixed(1)}%`,
    `Disclosure: ${disclosed.disclosure}`,
  ];
};

const forecastText = (
  state: GameState,
  action: AvaActionRef | undefined,
  fraction: number,
  cognitiveForecast?: AvaCognitiveForecastGuidance,
) => {
  if (cognitiveForecast)
    return cognitiveForecastText(state, action, fraction, cognitiveForecast);
  if (!action) {
    const projection = projectAvaEnvelope(state);
    return `STANDING PROJECTION [PROJECTED D+0]\nFriendly loss ${fmt(projection.friendlyLoss, true)} · Net Flight ${fmt(projection.personnel.netDesertion, true)} · ground ${projection.groundMovement >= 0 ? "+" : ""}${projection.groundMovement.toFixed(1)} km.`;
  }
  const descriptor = descriptorForAction(state, action, fraction);
  if (!descriptor)
    return "The referenced order is no longer in the current docket.";
  if (action.kind === "resolve-day")
    return "The day has not resolved. Use PROJECTION for the disclosed estimate; Ava will not execute the day merely to reveal its outcome.";
  if (action.kind === "opportunity-response")
    return `${renderAvaAction(descriptor)}\n\nThe response resolves immediately. Forecasting does not reveal which contingent branch will occur.`;
  if (action.kind === "maneuver") {
    const maneuver = MANEUVERS.find((item) => item.id === action.maneuverId);
    const preview = actionProjection(state, action, fraction);
    if (maneuver && preview.preview.executed) {
      const chance = explainManeuverChance(state, maneuver);
      return [
        "FIELD NOTE / PROJECTION\nA projection is the battlefield confessing under controlled pressure. It tells the truth only about the orders already on the table.",
        renderAvaAction(descriptor),
        `PROJECTED DAY CONSEQUENCE\n${projectionLines(state, action, fraction).join("\n")}`,
        `CALCULATION\nExecution confidence = base chance + readiness + equipment + intelligence + doctrine + operational fit − enemy adaptation\n${chance.terms
          .map(
            (term) =>
              `${term.label}: ${term.points >= 0 ? "+" : ""}${term.points.toFixed(1)} points`,
          )
          .join("\n")}\nResult: ${(chance.result * 100).toFixed(1)}%`,
        "PRINCIPAL UNCERTAINTY\nThe confidence estimate does not disclose or pre-resolve the sealed day outcome.",
        `DECLARED CHANGE [PROJECTED]\n${diffText(
          state,
          preview.preview.state,
        )}`,
      ].join("\n\n");
    }
  }
  const preview = executeAvaAction(state, action, fraction);
  return preview.executed
    ? `${renderAvaAction(descriptor)}\n\nDECLARED CHANGE [PROJECTED]\n${diffText(state, preview.state)}`
    : `${renderAvaAction(descriptor)}\n\nREJECTION: ${preview.rejection}`;
};

const forecastPlanText = (
  state: GameState,
  session: AvaTerminalSession,
  fraction: number,
  cognitiveForecast?: AvaCognitiveForecastGuidance,
) => {
  if (cognitiveForecast) {
    const targetId = `plan:${session.plan.map(actionKey).join("|") || "empty"}`;
    if (cognitiveForecast.artifact.targetId !== targetId)
      throw new Error("cognitive plan forecast target is stale");
    const descriptors = session.plan
      .map((action) => descriptorForAction(state, action, fraction))
      .filter((item): item is AvaActionDescriptor => !!item);
    const contract = [
      `PLAN FORECAST: ${session.plan.length} ACTIONS · ${descriptors.reduce((sum, item) => sum + item.orderCost, 0)} ORDERS`,
      ...descriptors.map(renderAvaAction),
    ].join("\n\n");
    if (cognitiveForecast.artifact.status !== "PROJECTED")
      return `${contract}\n\n${cognitiveForecast.artifact.status === "SEALED" ? "SEALED BOUNDARY" : "PLAN FORECAST REJECTED"}\n${cognitiveForecast.artifact.reason ?? "No disclosed projection is available."}`;
    return `${contract}\n\nDECLARED PACKET CHANGE [PROJECTED]\n${cognitiveChangeText(cognitiveForecast)}`;
  }
  if (!session.plan.length)
    return "PLAN FORECAST REJECTED: no actions are staged.";
  const descriptors = session.plan
    .map((action) => descriptorForAction(state, action, fraction))
    .filter((item): item is AvaActionDescriptor => !!item);
  const sealed = session.plan.some(
    (action) =>
      action.kind === "resolve-day" || action.kind === "opportunity-response",
  );
  const contract = [
    `PLAN FORECAST: ${session.plan.length} ACTIONS · ${descriptors.reduce((sum, item) => sum + item.orderCost, 0)} ORDERS`,
    ...descriptors.map(renderAvaAction),
  ].join("\n\n");
  if (sealed)
    return `${contract}\n\nSEALED BOUNDARY\nThe packet contains a day resolution or timed opportunity. Ava discloses its contract but will not execute the sealed branch during forecast.`;
  const plan = buildAvaPlan(state, session.plan, fraction),
    preview = executeAvaPlan(state, plan, fraction);
  return preview.executed
    ? `${contract}\n\nDECLARED PACKET CHANGE [PROJECTED]\n${diffText(state, preview.state)}`
    : `${contract}\n\nORDER REJECTED: ${preview.rejection}`;
};

const confirmationText = (
  state: GameState,
  confirmation: AvaConfirmation,
  fraction: number,
) => {
  const descriptors = confirmation.plan.actions
    .map((action) => descriptorForAction(state, action, fraction))
    .filter((item): item is AvaActionDescriptor => !!item);
  return [
    `ORDER AWAITING CONFIRMATION / ${confirmation.id} · PURPOSE: ${confirmation.purpose.toUpperCase()}`,
    "LEDGER SEAL: THIS ORDER EXPIRES IF THE POSITION CHANGES",
    `COST: ${confirmation.plan.orderCost} ORDERS · ${confirmation.plan.insightCost} INSIGHT`,
    ...descriptors.map(renderAvaAction),
    `GRAMMAR\n> confirm ${confirmation.id}\n> cancel`,
  ].join("\n\n");
};

const metricValue = (state: GameState, id: string) =>
  ({
    population: state.population,
    armed: state.armed,
    enlistment: state.voluntary + state.forced,
    training: state.training,
    readiness: state.readiness,
    equipment: state.equipment,
    materiel: state.materiel,
    treasury: state.treasury,
    legitimacy: state.legitimacy,
    resistance: state.resistance,
    front: state.front,
    desertion: projectAvaEnvelope(state).personnel.netDesertion,
    doctrine: state.doctrine,
    intelligence: state.intelligence,
    "execution-confidence": (() => {
      const situation = situationForState(state),
        maneuver = MANEUVERS.find((item) =>
          situation.maneuvers.includes(item.id),
        );
      return maneuver ? explainManeuverChance(state, maneuver).result * 100 : 0;
    })(),
    supply:
      state.production.munitions.stock /
      Math.max(1, state.production.munitions.use),
    network: state.networkPosture,
  })[id as string];

const conceptIdForEntity = (id: string) =>
  ({
    armed: "deployable-force",
    training: "training-queue",
    equipment: "equipment-coverage",
    supply: "munitions",
    network: "command-network",
    front: "pressure",
  })[id] ?? id;

const familyLabel = (familyId?: string) =>
  familyId
    ? (FAMILIES.find((family) => family.id === familyId)?.label ??
      "RELATED COMMAND FAMILY")
    : undefined;

const explainText = (
  state: GameState,
  entity: AvaEntity,
  facet: "meaning" | "effects" | "levers" | "calculus",
) => {
  const conceptId = conceptIdForEntity(entity.id),
    concept = CONCEPTS[conceptId],
    value = metricValue(state, entity.id),
    situation = situationForState(state),
    canonicalManeuver =
      MANEUVERS.find((item) => item.id === state.maneuver) ??
      MANEUVERS.find((item) => situation.maneuvers.includes(item.id)),
    maneuver=canonicalManeuver?maneuverForSituation(canonicalManeuver,situation):undefined;
  const calculation =
    conceptId === "execution-confidence" && maneuver
      ? (() => {
          const chance = explainManeuverChance(state, maneuver);
          return {
            title: `${maneuver.label} execution confidence`,
            equation:
              "base chance + readiness + equipment + intelligence + doctrine + operational fit − enemy adaptation = execution confidence",
            basis: `CURRENT ${situation.sector.toUpperCase()} ORDER ESTIMATE`,
            rows: chance.terms.map((term) => ({
              label: term.label.toUpperCase(),
              value: `${term.points >= 0 ? "+" : ""}${term.points.toFixed(1)} POINTS`,
              tone:
                term.points > 0
                  ? ("gain" as const)
                  : term.points < 0
                    ? ("loss" as const)
                    : ("neutral" as const),
            })),
            result: `${Math.round(chance.result * 100)}% EXECUTION CONFIDENCE`,
          };
        })()
      : calculationFor(entity.id, state);
  const answer = !concept
    ? `${entity.label} is present in today's command ledger, but its doctrine note has not yet been indexed.`
    : facet === "effects"
      ? concept.consequence
      : facet === "levers"
        ? concept.control
          ? `${concept.control.label} is the direct control. Open ${concept.control.module.toUpperCase()}${concept.control.family ? ` / ${familyLabel(concept.control.family)?.toUpperCase()}` : ""}.`
          : "No direct control is indexed. Change one of the named dependencies instead."
        : facet === "calculus"
          ? `${calculation.equation}. ${calculation.result}.`
          : `${concept.definition}${concept.normal ? ` Normal command band: ${concept.normal}.` : ""}`;
  const calculationBlock = [
    `CALCULATION\n${calculation.title}\n${calculation.equation}`,
    ...calculation.rows.map(
      (row) =>
        `${row.tone === "gain" ? "[GAIN] " : row.tone === "loss" ? "[LOSS] " : ""}${row.label}: ${row.value}`,
    ),
    `RESULT: ${calculation.result}`,
  ].join("\n");
  const control = concept?.control
    ? `${concept.control.label}: ${concept.control.module.toUpperCase()}${concept.control.family ? ` / ${familyLabel(concept.control.family)?.toUpperCase()}` : ""}`
    : "NO DIRECT CONTROL: USE A DEPENDENCY BELOW";
  const dependencies = concept?.related.length
    ? concept.related
        .map((id) => CONCEPTS[id]?.label ?? "Related field condition")
        .join("\n")
    : "No indexed dependencies.";
  const commandScope = concept?.control?.module;
  return [
    `FIELD CONTEXT\n${entity.label}${value === undefined ? "" : `: ${typeof value === "number" ? value.toFixed(1) : String(value)}`}`,
    `ANSWER\n${answer}`,
    facet === "calculus" ? calculationBlock : null,
    `CONTROL\n${control}`,
    `DEPENDENCIES\n${dependencies}`,
    `GRAMMAR\n> ${concept?.control ? `open ${concept.control.module}` : `explain ${CONCEPTS[concept?.related[0] ?? ""]?.label ?? entity.label}`}${commandScope && commandScope !== "campaign" ? `\n> list ${commandScope === "national" ? "production" : commandScope}` : "\n> missions"}\n> explain ${entity.label} calculus`,
  ]
    .filter(Boolean)
    .join("\n\n");
};

function executeAvaInstruction(
  state: GameState,
  session: AvaTerminalSession,
  instruction: AvaInstruction,
  opportunityFraction = 0,
  darkNetContext: AvaDarkNetContext = {},
  cognitiveGuidance?: AvaCognitiveDecisionGuidance,
  cognitiveForecast?: AvaCognitiveForecastGuidance,
  cognitivePlanning?: AvaCognitivePlanningGuidance,
  cognitiveConstraint?: AvaCognitiveConstraintGuidance,
  cognitiveCausal?: AvaCognitiveCausalGuidance,
  cognitiveEpistemic?: AvaCognitiveEpistemicGuidance,
  interaction: AvaCompilerTrace["interaction"] = "explicit",
): AvaTerminalResult {
  if (instruction.kind === "SHELL") {
    const shellResult = executeAvaShell(
      state,
      session.shell,
      instruction.shell,
      opportunityFraction,
      darkNetContext,
    );
    const next = { ...session, shell: shellResult.shell };
    const download = shellResult.download
      ? {
          virtualPath: shellResult.download.path,
          filename: shellResult.download.path.split("/").at(-1) ??
            avaWorkbookFilename(
              state,
              shellResult.download.topic ?? "command-dashboard",
            ),
          mime: shellResult.download.mime ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          bytes: shellResult.download.workbookBytes
            ? Uint8Array.from(shellResult.download.workbookBytes)
            : shellResult.download.mime === "application/zip"
              ? buildAvaCsvBundle(
                  state,
                  shellResult.download.topic ?? "command-dashboard",
                  opportunityFraction,
                )
              : buildAvaWorkbook(
                  state,
                  shellResult.download.topic ?? "command-dashboard",
                  opportunityFraction,
                ),
          stateRevision: shellResult.download.stateRevision,
        }
      : undefined;
    return finalize(state, next, shellResult.text, {
      outputKind: "shell",
      clearScreen: shellResult.clearScreen,
      aphorismViewIds: shellResult.aphorismViewIds,
      download,
      archiveRequest: shellResult.archiveRequest,
    });
  }
  if (instruction.kind === "SEMANTIC") {
    if (cognitiveCausal)
      return finalize(
        state,
        session,
        withHeader(state, causalDiagnosisText(cognitiveCausal)),
        {
          trace: {
            semantic: instruction.query,
            retrievedFacts: [...cognitiveCausal.causal.responsibleFactIds],
            renderedResponse: "",
          },
        },
      );
    if (cognitiveEpistemic)
      return finalize(
        state,
        session,
        withHeader(state, evidenceBoundText(cognitiveEpistemic)),
        {
          trace: {
            semantic: instruction.query,
            retrievedFacts: [cognitiveEpistemic.artifact.factId],
            renderedResponse: "",
          },
        },
      );
    if (cognitiveConstraint)
      return finalize(
        state,
        session,
        withHeader(state, constraintText(cognitiveConstraint)),
        {
          trace: {
            semantic: instruction.query,
            retrievedFacts: [
              ...cognitiveConstraint.feasibility.responsibleFactIds,
            ],
            renderedResponse: "",
          },
        },
      );
    const answer = answerSemanticQuery(
      state,
      instruction.query,
      session.discourse,
      opportunityFraction,
      cognitiveGuidance,
      interaction,
    );
    const next = { ...session, discourse: answer.discourse };
    return finalize(state, next, withHeader(state, answer.text), {
      answerPlan: answer.answerPlan,
      proofGraph: answer.proofGraph,
      trace: {
        semantic: instruction.query,
        retrievedFacts: answer.retrievedFacts,
        answerPlan: answer.answerPlan,
        proofGraph: answer.proofGraph,
        renderedResponse: answer.text,
      },
    });
  }
  if (instruction.kind === "GREETING")
    return finalize(
      state,
      session,
      withHeader(
        state,
        `FIELD CONTEXT\n${situationForState(state).headline}\n\nANSWER\nCommand channel open. I can orient you, read the current position, recommend the next move, or prepare an order for confirmation.\n\nTRY\nwhat should I do\nhow to play\nwhat did I do\nmissions`,
      ),
    );
  if (instruction.kind === "IDENTITY")
    return finalize(
      state,
      session,
      withHeader(
        state,
        "FIELD CONTEXT\nPATTERN ANALYSIS DIRECTORATE\n\nANSWER\nI am Ava. I read the command ledger, calculate the position, compare available sacrifices, prepare orders, and enter them only after your confirmation. I do not invent reports or disclose sealed outcomes.",
      ),
    );
  if (instruction.kind === "GRATITUDE")
    return finalize(
      state,
      session,
      withHeader(
        state,
        "Acknowledged. The position has not improved merely because it is legible. Ask WHAT SHOULD I DO or MISSIONS when ready.",
      ),
    );
  if (instruction.kind === "FRUSTRATION")
    return finalize(
      state,
      session,
      withHeader(
        state,
        "Then the report has failed. I can reduce the position to one decision or expose the full arithmetic.\n\nCOMMANDS\nwhat should I do\nmissions\nprojection\nhelp",
      ),
    );
  if (instruction.kind === "REPEAT")
    return finalize(
      state,
      session,
      session.lastText ||
        withHeader(state, "Nothing has yet been said in this command session."),
    );
  if (instruction.kind === "MORE") {
    const next = { ...session, detail: "deep" as const };
    return finalize(
      state,
      next,
      withHeader(
        state,
        "Detail set to DEEP. Reports will preserve equations, provenance, dependencies, and unknowns.",
      ),
    );
  }
  if (instruction.kind === "LESS") {
    const next = { ...session, detail: "glance" as const };
    return finalize(
      state,
      next,
      withHeader(
        state,
        "Detail set to GLANCE. Direct answer, critical warning, and executable grammar remain.",
      ),
    );
  }
  if (instruction.kind === "STORYTELLER")
    return finalize(
      state,
      session,
      withHeader(
        state,
        "STORYTELLER MODE\nEnabled. I will preserve the exact command answer, then unfold its theater, continuity, and consequence from the visible campaign record.",
      ),
    );
  if (instruction.kind === "CONCISE")
    return finalize(
      state,
      session,
      withHeader(
        state,
        "CONCISE MODE\nEnabled. I will return to the standard command realization without changing disclosure depth.",
      ),
    );
  if (instruction.kind === "EXPORT_CHAT")
    return finalize(
      state,
      session,
      withHeader(
        state,
        "CHAT LOG EXPORT\nPrepared from the Ava conversation visible in this client. The transcript remains local and is not added to telemetry.",
      ),
      {
        chatExport: {
          filename: `delenda-quest-ava-chat-day-${String(state.day).padStart(3, "0")}.md`,
          mime: "text/markdown;charset=utf-8",
        },
      },
    );
  if (instruction.kind === "HELP") {
    const rows = AVA_COMMAND_HELP.filter(
      (item) =>
        !instruction.subject ||
        item.command
          .toLowerCase()
          .includes(instruction.subject.toLowerCase()) ||
        item.purpose.toLowerCase().includes(instruction.subject.toLowerCase()),
    );
    return finalize(
      state,
      session,
      withHeader(
        state,
        `COMMAND GRAMMAR${instruction.subject ? ` / ${instruction.subject.toUpperCase()}` : ""}\n\n${(rows.length ? rows : AVA_COMMAND_HELP).map((item) => `${item.command}\n${item.purpose}\nTRY: ${item.examples.map((example) => `> ${example}`).join(" · ")}`).join("\n\n")}`,
      ),
    );
  }
  if (instruction.kind === "ORDERS")
    return finalize(
      state,
      session,
      withHeader(
        state,
        `ORDERS REMAIN: ${state.actions} · ACTIONS STAGED: ${session.plan.length}\n\n${missionText(state, opportunityFraction)}`,
      ),
    );
  if (instruction.kind === "LIST") {
    if (!instruction.scope || instruction.scope === "missions")
      return finalize(
        state,
        session,
        withHeader(state, missionText(state, opportunityFraction)),
      );
    const actions = scopeActions(
      enumerateAvaActions(state, opportunityFraction),
      instruction.scope,
    );
    const currentScreen =
      instruction.scope === "production"
        ? "national"
        : instruction.scope === "military" ||
            instruction.scope === "diplomacy" ||
            instruction.scope === "doctrine" ||
            instruction.scope === "campaign"
          ? instruction.scope
          : session.discourse.currentScreen;
    return finalize(
      state,
      {
        ...session,
        discourse: {
          ...session.discourse,
          currentScreen,
          lastSubject: "CAMPAIGN_CHOICE",
          lastEntities: actions.map((action) => action.id),
          lastScope: [],
          directiveContext: undefined,
        },
      },
      withHeader(
        state,
        `${instruction.scope.toUpperCase()}: ${actions.length} CURRENT ACTIONS\n\n${listed(actions) || "No action in this scope is present in the current docket."}\n\nGRAMMAR\n> forecast <handle>\n> stage <handle>\n> explain <handle>`,
      ),
    );
  }
  if (instruction.kind === "STATUS") {
    const report = buildAvaReport(
      { kind: "REPORT", topic: "overview", scope: "campaign" },
      state,
    );
    return finalize(
      state,
      session,
      withHeader(state, reportText(report, session.detail)),
      {
      report,
      },
    );
  }
  if (instruction.kind === "ADVISE") {
    const openEndedCampaignQuestion = interaction === "open-ended";
    const answer = answerSemanticQuery(
      state,
      {
        operation: "ADVISE",
        subject: { type: "CAMPAIGN_CHOICE", entityIds: [] },
        scope: {
          group: openEndedCampaignQuestion ? "MAIN" : "ALL",
          domains: openEndedCampaignQuestion
            ? ["MAIN"]
            : ["MAIN", "DOMESTIC", "NETWORK"],
          excludedDomains: [],
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
      },
      session.discourse,
      opportunityFraction,
      cognitiveGuidance,
      interaction,
    );
    return finalize(
      state,
      { ...session, discourse: answer.discourse },
      withHeader(state, answer.text),
      {
        answerPlan: answer.answerPlan,
        proofGraph: answer.proofGraph,
        trace: {
          retrievedFacts: answer.retrievedFacts,
          answerPlan: answer.answerPlan,
          proofGraph: answer.proofGraph,
          renderedResponse: answer.text,
        },
      },
    );
  }
  if (instruction.kind === "REPORT") {
    const report = buildAvaReport(instruction, state);
    if (instruction.topic === "daily-brief")
      return finalize(
        state,
        session,
        withHeader(
          state,
          instruction.canonical
            ? canonicalDailyBriefing(state)
            : summarizedDailyBriefing(state, session.voiceCursor),
        ),
        { report },
      );
    const saved = saveAvaReportSnapshot(
      session.shell,
      state,
      report,
      opportunityFraction,
    );
    if (saved.error)
      return finalize(
        state,
        session,
        withHeader(
          state,
          `${reportText(report, session.detail)}\n\n${saved.error}`,
        ),
        { report },
      );
    const next = { ...session, shell: saved.shell };
    const path = saved.workbookPath!;
    return finalize(
      state,
      next,
      withHeader(
        state,
        `${reportText(report, session.detail)}\n\nFILE\n${path}\nUse: download ${path}`,
      ),
      { report },
    );
  }
  if (instruction.kind === "OPEN")
    return finalize(
      state,
      session,
      withHeader(
        state,
        `ANSWER\nOpening the ${instruction.module.toUpperCase()} command desk. No order was issued.`,
      ),
      { navigate: instruction.module },
    );
  if (instruction.kind === "EXPLAIN") {
    if (cognitiveCausal)
      return finalize(
        state,
        session,
        withHeader(state, causalDiagnosisText(cognitiveCausal)),
        {
          trace: {
            retrievedFacts: [...cognitiveCausal.causal.responsibleFactIds],
            renderedResponse: "",
          },
        },
      );
    if (cognitiveEpistemic)
      return finalize(
        state,
        session,
        withHeader(state, evidenceBoundText(cognitiveEpistemic)),
        {
          trace: {
            retrievedFacts: [cognitiveEpistemic.artifact.factId],
            renderedResponse: "",
          },
        },
      );
    if (instruction.entity.action) {
      const descriptor = descriptorForAction(
        state,
        instruction.entity.action,
        opportunityFraction,
      );
      return finalize(
        state,
        session,
        withHeader(
          state,
          descriptor
            ? renderAvaAction(descriptor)
            : "The referenced action is stale.",
        ),
      );
    }
    return finalize(
      state,
      session,
      withHeader(
        state,
        explainText(state, instruction.entity, instruction.facet),
      ),
    );
  }
  if (instruction.kind === "SELECT" || instruction.kind === "STAGE") {
    const actions =
      instruction.kind === "SELECT"
        ? instruction.entity.action
          ? [instruction.entity.action]
          : []
        : actionEntities(instruction);
    if (!actions.length)
      return finalize(
        state,
        session,
        withHeader(state, "No executable action was resolved."),
        { rejection: "missing-action" },
      );
    const merged = [...session.plan, ...actions].filter(
        (action, index, all) =>
          all.findIndex((other) => actionKey(other) === actionKey(action)) ===
          index,
      ),
      descriptors = merged.map((action) =>
        descriptorForAction(state, action, opportunityFraction),
      );
    const invalid = descriptors.find((item) => !item?.available);
    if (invalid)
      return finalize(
        state,
        session,
        withHeader(
          state,
          `STAGE REJECTED: ${invalid.label}\n${invalid.rejection}`,
        ),
        { rejection: invalid.rejection },
      );
    const next = { ...session, plan: merged, confirmation: null };
    return finalize(
      state,
      next,
      withHeader(
        state,
        `STAGED: ${actions.map((action) => descriptorForAction(state, action, opportunityFraction)?.label ?? actionKey(action)).join("; ")}\n\n${planText(state, next, opportunityFraction)}`,
      ),
    );
  }
  if (instruction.kind === "UNSTAGE") {
    const removals = new Set(actionEntities(instruction).map(actionKey)),
      plan = session.plan.filter((action) => !removals.has(actionKey(action))),
      next: AvaTerminalSession = { ...session, plan, confirmation: null };
    return finalize(
      state,
      next,
      withHeader(
        state,
        `UNSTAGED: ${instruction.entities.map((entity) => entity.handle ?? entity.label).join("; ")}\n\n${planText(state, next, opportunityFraction)}`,
      ),
    );
  }
  if (instruction.kind === "CLEAR" || instruction.kind === "CLEAR_PLAN") {
    const next = { ...session, plan: [], confirmation: null };
    return finalize(
      state,
      next,
      withHeader(state, "PLAN CLEARED: no campaign state changed."),
    );
  }
  if (instruction.kind === "SHOW_PLAN")
    return finalize(
      state,
      session,
      withHeader(
        state,
        planText(state, session, opportunityFraction, cognitivePlanning),
      ),
    );
  if (instruction.kind === "FORECAST")
    return finalize(
      state,
      session,
      withHeader(
        state,
        instruction.plan
          ? forecastPlanText(
              state,
              session,
              opportunityFraction,
              cognitiveForecast,
            )
          : forecastText(
              state,
              instruction.entity?.action ?? session.plan[0],
              opportunityFraction,
              cognitiveForecast,
            ),
      ),
    );
  if (instruction.kind === "COMPARE") {
    const descriptors = instruction.entities.map((entity) =>
      entity.action
        ? descriptorForAction(state, entity.action, opportunityFraction)
        : undefined,
    );
    if (!descriptors[0] || !descriptors[1])
      return finalize(
        state,
        session,
        withHeader(
          state,
          "COMPARE REJECTED: one or both references are stale.",
        ),
        { rejection: "stale-reference" },
      );
    if (cognitiveGuidance)
      return finalize(
        state,
        session,
        withHeader(
          state,
          cognitiveComparisonText(
            state,
            [descriptors[0], descriptors[1]],
            cognitiveGuidance,
          ),
        ),
      );
    const actions = instruction.entities.map((entity) => entity.action);
    const leftAction = actions[0],
      rightAction = actions[1];
    if (
      leftAction?.kind === "maneuver" &&
      rightAction?.kind === "maneuver"
    ) {
      const left = actionProjection(state, leftAction, opportunityFraction);
      const right = actionProjection(state, rightAction, opportunityFraction);
      if (
        left.preview.executed &&
        right.preview.executed &&
        left.projection &&
        right.projection
      ) {
        const lossDelta =
          left.projection.friendlyLoss - right.projection.friendlyLoss;
        const groundDelta =
          left.projection.groundMovement - right.projection.groundMovement;
        const shortageDelta =
          left.projection.production.shortages -
          right.projection.production.shortages;
        const dominates =
          lossDelta <= 0 &&
          groundDelta >= 0 &&
          shortageDelta <= 0 &&
          (lossDelta < 0 || groundDelta > 0 || shortageDelta < 0);
        return finalize(
          state,
          session,
          withHeader(
            state,
            [
              "COMPARISON / DISCLOSED PROJECTION",
              `[${descriptors[0].handle}] ${descriptors[0].label}\n${projectionLines(state, leftAction, opportunityFraction).join("\n")}`,
              "VERSUS",
              `[${descriptors[1].handle}] ${descriptors[1].label}\n${projectionLines(state, rightAction, opportunityFraction).join("\n")}`,
              `DELTA\nFriendly loss: ${lossDelta >= 0 ? "+" : ""}${fmt(lossDelta, true)} · Ground: ${groundDelta >= 0 ? "+" : ""}${groundDelta.toFixed(1)} km · Industrial shortages: ${shortageDelta >= 0 ? "+" : ""}${shortageDelta}`,
              `JUDGMENT\n${
                dominates
                  ? `${descriptors[0].label} dominates on disclosed loss, ground, and shortage consequences.`
                  : lossDelta >= 0 && groundDelta <= 0 && shortageDelta >= 0
                    ? `${descriptors[1].label} dominates on disclosed loss, ground, and shortage consequences.`
                    : "Neither order dominates. One buys ground or continuity by accepting a different loss."
              } No order was issued.`,
            ].join("\n\n"),
          ),
        );
      }
    }
    return finalize(
      state,
      session,
      withHeader(
        state,
        `COMPARISON\n\n${renderAvaAction(descriptors[0])}\n\nVERSUS\n\n${renderAvaAction(descriptors[1])}\n\nNo order was issued.`,
      ),
    );
  }
  if (
    instruction.kind === "ISSUE" ||
    instruction.kind === "ISSUE_PLAN" ||
    instruction.kind === "COMMIT"
  ) {
    if (instruction.kind === "COMMIT" && session.confirmation) {
      const result = executeAvaConfirmation(
        state,
        session.confirmation,
        opportunityFraction,
      );
      if (!result.executed)
        return finalize(
          state,
          session,
          withHeader(state, `CONFIRM REJECTED: ${result.rejection}`),
          { rejection: result.rejection },
        );
      const confirmation = session.confirmation,
        next = resetIssuedPlan(session);
      return finalize(
        result.state,
        next,
        withHeader(
          result.state,
          `ORDER ENTERED: ${confirmation.id}\n${result.receipt.join("\n")}`,
        ),
        { executed: true },
      );
    }
    const actions =
      instruction.kind === "ISSUE"
        ? actionEntities(instruction)
        : instruction.kind === "COMMIT" && instruction.entity?.action
          ? [instruction.entity.action]
          : session.plan;
    if (!actions.length)
      return finalize(
        state,
        session,
        withHeader(state, "ISSUE REJECTED: no action is staged or named."),
        { rejection: "empty-plan" },
      );
    const plan = buildAvaPlan(state, actions, opportunityFraction),
      preflight = executeAvaPlan(state, plan, opportunityFraction);
    if (!preflight.executed)
      return finalize(
        state,
        session,
        withHeader(state, `ORDER REJECTED: ${preflight.rejection}`),
        { rejection: preflight.rejection },
      );
    const purpose: AvaConfirmation["purpose"] = actions.some(
        (action) => action.kind === "opportunity-response",
      )
        ? "opportunity"
        : actions.some((action) => action.kind === "doctrine-stage")
          ? "doctrine"
          : "issue-plan",
      confirmation = stageAvaConfirmation(state, plan, purpose),
      next = { ...session, plan: actions, confirmation };
    return finalize(
      state,
      next,
      withHeader(
        state,
        confirmationText(state, confirmation, opportunityFraction),
      ),
    );
  }
  if (instruction.kind === "RESOLVE_DAY") {
    const resolutionAction: AvaActionRef = { kind: "resolve-day" };
    const plan = buildAvaPlan(state, [resolutionAction], opportunityFraction),
      preflight = executeAvaPlan(state, plan, opportunityFraction);
    if (!preflight.executed)
      return finalize(
        state,
        session,
        withHeader(state, `RESOLUTION REJECTED: ${preflight.rejection}`),
        { rejection: preflight.rejection },
      );
    const confirmation = stageAvaConfirmation(state, plan, "resolve-day"),
      next: AvaTerminalSession = {
        ...session,
        plan: [resolutionAction],
        confirmation,
      };
    return finalize(
      state,
      next,
      withHeader(
        state,
        confirmationText(state, confirmation, opportunityFraction),
      ),
    );
  }
  if (instruction.kind === "CANCEL") {
    const next = { ...session, confirmation: null };
    return finalize(
      state,
      next,
      withHeader(
        state,
        "PENDING ORDER CANCELLED: no campaign state changed.",
      ),
    );
  }
  if (instruction.kind === "CONFIRM") {
    const confirmation = session.confirmation;
    if (!confirmation)
      return finalize(
        state,
        session,
        withHeader(
          state,
          "CONFIRM REJECTED: no order is awaiting confirmation.",
        ),
        { rejection: "no-confirmation" },
      );
    if (
      instruction.token &&
      instruction.token !== confirmation.id.toUpperCase()
    )
      return finalize(
        state,
        session,
        withHeader(state, `CONFIRM REJECTED: expected ${confirmation.id}.`),
        { rejection: "token-mismatch" },
      );
    const result = executeAvaConfirmation(
      state,
      confirmation,
      opportunityFraction,
    );
    if (!result.executed)
      return finalize(
        state,
        session,
        withHeader(state, `CONFIRM REJECTED: ${result.rejection}`),
        { rejection: result.rejection },
      );
    const next = resetIssuedPlan(
      session,
      confirmation.purpose === "resolve-day",
    );
    return finalize(
      result.state,
      next,
      withHeader(
        result.state,
        `ORDER ENTERED: ${confirmation.id}\n${result.receipt.join("\n")}`,
      ),
      { executed: true },
    );
  }
  return finalize(
    state,
    session,
    withHeader(
      state,
      "The instruction is understood but has no command-desk procedure.",
    ),
    { rejection: "unsupported" },
  );
}

const topicForModule = (module: AvaModule): AvaReportTopic =>
  ({
    campaign: "operations",
    national: "production",
    military: "personnel",
    diplomacy: "diplomacy",
    doctrine: "doctrine",
    account: "service-record",
    wiki: "overview",
  } satisfies Record<AvaModule, AvaReportTopic>)[module];

const topicForScope = (scope?: string): AvaReportTopic => {
  if (scope === "production") return "production";
  if (scope === "military") return "personnel";
  if (scope === "diplomacy") return "diplomacy";
  if (scope === "doctrine") return "doctrine";
  if (scope === "opportunities") return "opportunities";
  return "operations";
};

const topicForEntity = (entity: AvaEntity): AvaReportTopic => {
  if (entity.action?.kind === "doctrine-stage" || entity.kind === "doctrine-vector")
    return "doctrine";
  if (entity.action?.kind === "opportunity-response" || entity.kind === "opportunity")
    return "opportunities";
  if (entity.action?.kind === "sub-mission")
    return entity.action.domain === "network" ? "network" : "domestic";
  if (entity.kind === "foreign-actor") return "diplomacy";
  if (/loss|casual|desert/i.test(entity.id)) return "losses";
  if (/production|munition|materiel|treasury|resource|supply/i.test(entity.id))
    return "production";
  if (/network|signal|relay|authentication|custody/i.test(entity.id))
    return "network";
  if (/intelligence|enemy-order/i.test(entity.id)) return "intelligence";
  if (/legitimacy|resistance|domestic|workforce/i.test(entity.id))
    return "domestic";
  if (/doctrine|insight/i.test(entity.id)) return "doctrine";
  if (/diplom|foreign|treaty|actor/i.test(entity.id)) return "diplomacy";
  if (/personnel|armed|training|equipment|deployable|readiness/i.test(entity.id))
    return "personnel";
  return "operations";
};

const voiceCueForInstruction = (
  instruction: AvaInstruction,
  result: AvaTerminalResult,
  previous: AvaTerminalSession,
): AvaVoiceCue => {
  if (result.rejection) return { mode: "rejection" };
  if (result.executed) return { mode: "receipt" };
  if (result.session.confirmation && result.session.confirmation !== previous.confirmation)
    return { mode: "confirmation" };

  switch (instruction.kind) {
    case "GREETING":
      return { mode: "orientation" };
    case "IDENTITY":
      return { mode: "identity" };
    case "HELP":
      return { mode: "grammar" };
    case "GRATITUDE":
      return { mode: "acknowledgment" };
    case "FRUSTRATION":
      return { mode: "correction" };
    case "MORE":
    case "LESS":
    case "STORYTELLER":
    case "CONCISE":
      return { mode: "detail" };
    case "EXPORT_CHAT":
      return { mode: "acknowledgment", label: "CHAT EXPORT" };
    case "REPORT":
      return { topic: instruction.topic };
    case "STATUS":
      return { topic: "overview", label: "STATUS" };
    case "ADVISE":
      return { topic: "operations", label: "JUDGMENT" };
    case "ORDERS":
      return { topic: "operations", label: "ORDERS" };
    case "LIST":
      return { topic: topicForScope(instruction.scope), label: instruction.scope?.toUpperCase() ?? "MISSIONS" };
    case "OPEN":
      return { topic: topicForModule(instruction.module) };
    case "EXPLAIN":
      return { topic: topicForEntity(instruction.entity) };
    case "FORECAST":
      return { topic: "projection" };
    case "COMPARE":
      return { topic: "projection", label: "COMPARISON" };
    case "SELECT":
    case "STAGE":
    case "UNSTAGE":
    case "SHOW_PLAN":
    case "CLEAR":
    case "CLEAR_PLAN":
      return { mode: "plan" };
    case "CANCEL":
      return { mode: "acknowledgment", label: "ORDER WITHHELD" };
    case "REPEAT":
      return { topic: "overview" };
    case "ISSUE":
    case "ISSUE_PLAN":
    case "COMMIT":
    case "CONFIRM":
    case "RESOLVE_DAY":
      return { topic: "operations" };
    default:
      return { topic: "overview" };
  }
};

export function runAvaInstruction(
  state: GameState,
  session: AvaTerminalSession,
  instruction: AvaInstruction,
  opportunityFraction = 0,
  semantic?: AvaSemanticQuery,
  compilerTrace?: AvaCompilerTrace,
  darkNetContext: AvaDarkNetContext = {},
  cognitiveGuidance?: AvaCognitiveDecisionGuidance,
  cognitiveForecast?: AvaCognitiveForecastGuidance,
  cognitivePlanning?: AvaCognitivePlanningGuidance,
  cognitiveConstraint?: AvaCognitiveConstraintGuidance,
  cognitiveCausal?: AvaCognitiveCausalGuidance,
  cognitiveEpistemic?: AvaCognitiveEpistemicGuidance,
): AvaTerminalResult {
  const result = executeAvaInstruction(
      state,
      session,
      instruction,
      opportunityFraction,
      darkNetContext,
      cognitiveGuidance,
      cognitiveForecast,
      cognitivePlanning,
      cognitiveConstraint,
      cognitiveCausal,
      cognitiveEpistemic,
      compilerTrace?.interaction,
    );
  if (result.outputKind === "shell")
    return {
      ...result,
      trace: {
        compiler: compilerTrace,
        semantic,
        retrievedFacts: [],
        renderedResponse: result.text,
      },
    };
  const query =
    instruction.kind === "SEMANTIC" ? instruction.query : semantic;
  const discourse = query
    ? {
        ...result.session.discourse,
        lastSubject:
          result.session.discourse.lastSubject ?? query.subject.type,
        lastMetric: query.metric ?? result.session.discourse.lastMetric,
        lastScope:
          query.scope.domains.length
            ? query.scope.domains
            : result.session.discourse.lastScope,
        lastTimeframe: query.timeframe,
        currentScreen: result.session.discourse.currentScreen,
      }
    : result.session.discourse;
  const voiced = voiceAvaResponse(
      result.state,
      result.text,
      {
        ...voiceCueForInstruction(instruction, result, session),
        variant: session.voiceCursor,
      },
    );
  return {
    ...result,
    text: voiced,
    session: {
      ...result.session,
      discourse,
      voiceCursor: result.session.voiceCursor + 1,
      lastText: voiced,
    },
    trace: {
      compiler: compilerTrace,
      semantic: query,
      retrievedFacts: result.trace?.retrievedFacts ?? [],
      answerPlan: result.answerPlan,
      proofGraph: result.proofGraph,
      renderedResponse: voiced,
    },
  };
}
