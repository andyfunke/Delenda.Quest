import {
  FAMILIES,
  MANEUVERS,
  coverage,
  directorForState,
  estimateDay,
  explainManeuverChance,
  fmt,
  projectDomestic,
  projectForceGeneration,
  projectOperations,
  projectProduction,
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

export type AvaDetail = "glance" | "standard" | "deep";
export type AvaTerminalSession = {
  plan: AvaActionRef[];
  confirmation: AvaConfirmation | null;
  lastText: string;
  detail: AvaDetail;
};
export type AvaTerminalResult = {
  state: GameState;
  session: AvaTerminalSession;
  text: string;
  report?: AvaReportCard;
  navigate?: string;
  executed: boolean;
  rejection?: string;
};

export const initialAvaTerminalSession = (): AvaTerminalSession => ({
  plan: [],
  confirmation: null,
  lastText: "",
  detail: "standard",
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
    `CALCULATION\n${report.calculation.equation}\n${report.calculation.rows.map((row) => `${row.label}: ${row.value}`).join("\n")}`,
    `CUMULATIVE INTELLIGENCE\n${report.history.observations.join("\n")}`,
    judgment,
  ];
  if (detail === "deep")
    standard.push(
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
  return [
    "MISSIONS [SEALED D+0]",
    `MAIN CAMPAIGN / ${packet.operational.sector}\n${packet.operational.question}\n${listed(main)}`,
    `DOMESTIC FRONT / ${packet.domestic.title}\nPRESSURE: ${packet.domestic.pressureBand.toUpperCase()}\n${packet.domestic.question}\nWHY TODAY: ${packet.domestic.convergence.map((edge) => edge.summary).join(" ")}\n${listed(domestic)}`,
    `COMMAND NETWORK / ${packet.network.title}\nPRESSURE: ${packet.network.pressureBand.toUpperCase()}\n${packet.network.question}\nWHY TODAY: ${packet.network.convergence.map((edge) => edge.summary).join(" ")}\n${listed(network)}`,
    opportunity.length
      ? `TARGET OF OPPORTUNITY\n${listed(opportunity)}`
      : "TARGET OF OPPORTUNITY: NONE ACTIVE",
    "COMMANDS\n> stage M2 D1 N3\n> forecast M2\n> compare M2 M4\n> issue plan",
  ].join("\n\n");
};

const planText = (
  state: GameState,
  session: AvaTerminalSession,
  fraction: number,
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
    ...descriptors.map(renderAvaAction),
    "COMMANDS\n> forecast plan\n> issue plan\n> clear plan",
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

const forecastText = (
  state: GameState,
  action: AvaActionRef | undefined,
  fraction: number,
) => {
  if (!action) {
    const operation = projectOperations(state),
      personnel = estimateDay(state);
    return `STANDING PROJECTION [PROJECTED D+0]\nFriendly loss ${fmt(personnel.casualty, true)} · net flight ${fmt(personnel.netDesertion, true)} · ground ${operation.groundMovement >= 0 ? "+" : ""}${operation.groundMovement.toFixed(1)} km.`;
  }
  const descriptor = descriptorForAction(state, action, fraction);
  if (!descriptor)
    return "The referenced order is no longer in the current docket.";
  if (action.kind === "resolve-day")
    return "Day resolution is sealed. Use PROJECTION for disclosed circuit outputs; Ava will not execute resolution to reveal hidden results during a forecast.";
  if (action.kind === "opportunity-response")
    return `${renderAvaAction(descriptor)}\n\nThe response resolves immediately from a sealed ticket. Forecasting does not reveal which contingent branch will occur.`;
  const preview = executeAvaAction(state, action, fraction);
  return preview.executed
    ? `${renderAvaAction(descriptor)}\n\nDECLARED CHANGE [PROJECTED]\n${diffText(state, preview.state)}`
    : `${renderAvaAction(descriptor)}\n\nREJECTION: ${preview.rejection}`;
};

const forecastPlanText = (
  state: GameState,
  session: AvaTerminalSession,
  fraction: number,
) => {
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
    desertion: estimateDay(state).netDesertion,
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
    maneuver =
      MANEUVERS.find((item) => item.id === state.maneuver) ??
      MANEUVERS.find((item) => situation.maneuvers.includes(item.id));
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

const commandUtility = (state: GameState) => {
  const operations = projectOperations(state),
    domestic = projectDomestic(state),
    force = projectForceGeneration(state),
    production = projectProduction(state),
    personnel = estimateDay(state);
  return (
    operations.groundMovement * 18 +
    operations.forceRatio * 22 -
    personnel.casualty / 600 -
    personnel.netDesertion / 350 +
    force.effectiveGraduates / 450 -
    production.shortages * 10 +
    coverage(state, "munitions") * 1.5 +
    state.readiness * 0.18 +
    state.equipment * 0.15 +
    state.materiel * 0.1 +
    state.legitimacy * 0.22 -
    state.resistance * 0.24 -
    domestic.collapseRisk * 40 -
    domestic.strikeRisk * 18 +
    state.intelligence * 0.08 -
    state.dependency * 0.05
  );
};

const accumulatedIntel = (state: GameState) => {
  const records = state.resolutionHistory,
    orders = records.flatMap(
      (record) => record.adversaryObserved.observedOrders,
    ),
    counts = new Map<string, number>();
  for (const order of orders) counts.set(order, (counts.get(order) ?? 0) + 1);
  const recurring = [...counts].sort((a, b) => b[1] - a[1])[0],
    adaptation = Object.entries(state.adversary.adaptation).sort(
      (a, b) => b[1] - a[1],
    )[0],
    latest = records[0];
  return [
    `[LEDGER D1–D${Math.max(0, state.day - 1)}] ${records.length} resolved days · ${orders.length} enemy orders observed.`,
    recurring
      ? `[INFERRED] Most persistent observed pattern: ${recurring[0]} · ${recurring[1]} observations.`
      : "[UNKNOWN] No enemy order pattern exists before the first resolution.",
    adaptation && adaptation[1] > 0
      ? `[STATE] Enemy adaptation is highest against ${adaptation[0]} at ${adaptation[1].toFixed(0)} / 8.`
      : "[STATE] No maneuver-specific enemy adaptation has yet accumulated.",
    latest
      ? `[UNKNOWN] ${latest.adversaryObserved.hiddenOrders} enemy order${latest.adversaryObserved.hiddenOrders === 1 ? " remains" : "s remain"} unclassified in the latest resolved day.`
      : "[UNKNOWN] The first enemy order packet remains sealed until resolution.",
  ].join("\n");
};

const adviceText = (state: GameState, fraction: number) => {
  const report = buildAvaReport({ kind: "ADVISE" }, state),
    situation = situationForState(state),
    director = directorForState(state),
    catalog = enumerateAvaActions(state, fraction),
    baseline = commandUtility(state);
  if (state.status !== "active")
    return {
      report,
      text: `${report.direct}\n\n${accumulatedIntel(state)}\n\nCOMMANDS\n> retrospective\n> service record report`,
    };
  if (state.actions === 0) {
    const resolution = catalog.find((item) => item.kind === "resolve-day");
    return {
      report,
      text: `The orders are closed. Review the projection, then stage ${resolution ? `[${resolution.handle}] ${resolution.label}` : "day resolution"}.\n\n${accumulatedIntel(state)}\n\nCOMMANDS\n> projection\n> resolve day`,
    };
  }
  const candidates = catalog
    .filter(
      (item) =>
        item.available &&
        item.kind !== "resolve-day" &&
        item.kind !== "opportunity-response",
    )
    .map((descriptor) => {
      const preview = executeAvaAction(state, descriptor.action, fraction);
      let score = preview.executed
        ? commandUtility(preview.state) - baseline
        : -999;
      if (descriptor.domain === "main" && !state.maneuver) score += 48;
      if (descriptor.domain === "domestic") score += 6;
      if (descriptor.domain === "network") score += 6;
      if (descriptor.kind === "doctrine-stage") score += 3;
      return { descriptor, score };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.descriptor.handle.localeCompare(b.descriptor.handle),
    );
  const opportunity = catalog.find(
      (item) => item.kind === "opportunity-response" && item.available,
    ),
    primary = opportunity
      ? { descriptor: opportunity, score: 99 }
      : candidates[0],
    alternative = candidates.find(
      (item) => item.descriptor.id !== primary?.descriptor.id,
    );
  if (!primary)
    return {
      report,
      text: `${report.direct}\n\nNo legal order remains under the present constraints.\n\nGRAMMAR\n> status\n> list all`,
    };
  const d = primary.descriptor,
    a = alternative?.descriptor,
    projected = executeAvaAction(state, d.action, fraction),
    mechanic =
      projected.executed && d.kind !== "opportunity-response"
        ? diffText(state, projected.state)
        : "The response is bound to a sealed contingent ticket; its exact branch is not exposed before issue.";
  const recommendation = `Stage [${d.handle}] ${d.label}.`;
  return {
    report: { ...report, recommendation },
    text: [
      `FIELD CONTEXT\n${situation.headline}. ${director.event.brief}`,
      `RECOMMENDATION\n${recommendation}`,
      `WHY IT RANKS FIRST\n[STATE] ${situation.question}\n[PROJECTED D+0] ${mechanic}`,
      `CUMULATIVE INTELLIGENCE\n${accumulatedIntel(state)}`,
      `OWNED SACRIFICE\n${d.owned.join(" · ") || "No immediate ledger change is attached."}\nCONTINGENT EXPOSURE\n${d.contingent.join(" · ") || "No contingent exposure is attached."}`,
      a
        ? `NEAREST ALTERNATIVE\n[${a.handle}] ${a.label}. It ranks behind the recommendation under the default survival-to-victory objective; compare it if your objective differs.`
        : "NEAREST ALTERNATIVE\nNo second executable candidate is present.",
      `COMMANDS\n> forecast ${d.handle}${a ? `\n> compare ${d.handle} ${a.handle}` : ""}\n> stage ${d.handle}\n> missions`,
    ].join("\n\n"),
  };
};

function executeAvaInstruction(
  state: GameState,
  session: AvaTerminalSession,
  instruction: AvaInstruction,
  opportunityFraction = 0,
): AvaTerminalResult {
  if (instruction.kind === "GREETING")
    return finalize(
      state,
      session,
      withHeader(
        state,
        `FIELD CONTEXT\n${situationForState(state).headline}\n\nANSWER\nCommand channel open. I have said nothing before you addressed me.\n\nGRAMMAR\nwhat should I do\nmissions\nreport`,
      ),
    );
  if (instruction.kind === "IDENTITY")
    return finalize(
      state,
      session,
      withHeader(
        state,
        "FIELD CONTEXT\nPATTERN ANALYSIS DIRECTORATE\n\nANSWER\nI am Ava Moore. I read the command ledger, calculate the position, compare available sacrifices, prepare orders, and enter them only after your confirmation. I do not invent reports or disclose sealed outcomes.",
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
    return finalize(
      state,
      session,
      withHeader(
        state,
        `${instruction.scope.toUpperCase()}: ${actions.length} CURRENT ACTIONS\n\n${listed(actions) || "No action in this scope is present in the current docket."}\n\nGRAMMAR\n> forecast <handle>\n> stage <handle>\n> explain <handle>`,
      ),
    );
  }
  if (instruction.kind === "STATUS") {
    const report = buildAvaReport(
      { kind: "REPORT", topic: "overview", scope: "dashboard" },
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
    const advice = adviceText(state, opportunityFraction);
    return finalize(state, session, withHeader(state, advice.text), {
      report: advice.report,
    });
  }
  if (instruction.kind === "REPORT") {
    const report = buildAvaReport(instruction, state);
    return finalize(
      state,
      session,
      withHeader(state, reportText(report, session.detail)),
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
      withHeader(state, planText(state, session, opportunityFraction)),
    );
  if (instruction.kind === "FORECAST")
    return finalize(
      state,
      session,
      withHeader(
        state,
        instruction.plan
          ? forecastPlanText(state, session, opportunityFraction)
          : forecastText(
              state,
              instruction.entity?.action ?? session.plan[0],
              opportunityFraction,
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
        next = { ...initialAvaTerminalSession(), detail: session.detail };
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
    const next = { ...initialAvaTerminalSession(), detail: session.detail };
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
    dashboard: "overview",
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
      return { mode: "detail" };
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
): AvaTerminalResult {
  const result = executeAvaInstruction(
      state,
      session,
      instruction,
      opportunityFraction,
    ),
    voiced = voiceAvaResponse(
      result.state,
      result.text,
      voiceCueForInstruction(instruction, result, session),
    );
  return {
    ...result,
    text: voiced,
    session: { ...result.session, lastText: voiced },
  };
}
