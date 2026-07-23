import {
  DAILY_ORDERS,
  FAMILIES,
  MANEUVERS,
  activeDiplomacyForState,
  coverage,
  estimateDay,
  fmt,
  maneuverChance,
  opportunityForState,
  projectAdversary,
  projectDomestic,
  projectForceGeneration,
  projectOperations,
  projectProduction,
  situationForState,
  type GameState,
} from "../game";
import { compileConvergence } from "../convergence";
import type { AvaInstruction, AvaReportCard, AvaReportTopic } from "./schema";
import { avaReportOpening as flavor } from "./voice";

type ReportInstruction =
  | Extract<AvaInstruction, { kind: "REPORT" }>
  | Extract<AvaInstruction, { kind: "ADVISE" }>;
const signed = (value: number, digits = 1) =>
  `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const recent = (state: GameState, days = 5) =>
  state.resolutionHistory.slice(0, Math.max(1, Math.min(30, days)));
const observed = (state: GameState, days = state.resolutionHistory.length) =>
  recent(state, days).reduce(
    (sum, record) => sum + record.adversaryObserved.observedOrders.length,
    0,
  );
const historyLayer = (
  state: GameState,
  records: GameState["resolutionHistory"],
  requested?: number,
  observations: string[] = [],
): AvaReportCard["history"] => ({
  resolvedDays: records.length,
  requestedDays: requested,
  observedOrders: records.reduce(
    (sum, record) => sum + record.adversaryObserved.observedOrders.length,
    0,
  ),
  observations: [
    records.length
      ? `${records.length}${requested ? ` of requested ${requested}` : ""} resolved day${records.length === 1 ? "" : "s"} are present in this ledger.`
      : "No resolved-day history has entered this ledger yet.",
    ...observations,
  ],
});
const commonCommands = [
  "what should I do",
  "report losses over the last 5 days",
  "report production",
  "projection",
  "domestic report",
  "retrospective",
];

function lossesReport(state: GameState, requested = 5): AvaReportCard {
  const records = recent(state, requested),
    sum = (pick: (record: GameState["resolutionHistory"][number]) => number) =>
      records.reduce((total, record) => total + pick(record), 0);
  const combat = sum((record) => record.personnel.combatLosses),
    attempts = sum((record) => record.personnel.desertionAttempts),
    retained = sum((record) => record.personnel.retained),
    intercepted = sum((record) => record.personnel.intercepted),
    net = sum((record) => record.personnel.netDesertion),
    enemy = sum((record) => record.operations.enemyLosses),
    replacements = sum((record) => record.personnel.effectiveGraduates),
    movement = sum((record) => record.outcome.groundMovement);
  return {
    topic: "losses",
    title: `Loss report / last ${requested} days`,
    direct: `${fmt(combat, true)} combat losses and ${fmt(net, true)} net desertions are recorded across ${records.length} available resolved day${records.length === 1 ? "" : "s"}.`,
    flavor: flavor(state, "losses"),
    calculation: {
      equation:
        "combat loss + (attempted flight − retained − intercepted) compared with replacements and enemy loss",
      rows: [
        {
          label: "FRIENDLY COMBAT LOSS",
          value: fmt(combat, true),
          tone: "loss",
          conceptId: "casualty-burden",
        },
        {
          label: "FLIGHT ATTEMPTS",
          value: fmt(attempts, true),
          conceptId: "desertion-pressure",
        },
        {
          label: "RETAINED BY POLICY",
          value: `−${fmt(retained, true)}`,
          tone: "gain",
          conceptId: "legitimacy",
        },
        {
          label: "INTERCEPTED",
          value: `−${fmt(intercepted, true)}`,
          tone: "gain",
          conceptId: "deployable-force",
        },
        {
          label: "NET FLIGHT",
          value: fmt(net, true),
          tone: "loss",
          conceptId: "desertion-pressure",
        },
        {
          label: "EFFECTIVE GRADUATES",
          value: `+${fmt(replacements, true)}`,
          tone: "gain",
          conceptId: "graduates",
        },
        {
          label: "ENEMY LOSSES",
          value: fmt(enemy, true),
          conceptId: "enemy-forward-deployment",
        },
        {
          label: "GROUND MOVEMENT",
          value: `${signed(movement)} KM`,
          tone: movement >= 0 ? "gain" : "loss",
          conceptId: "front-movement",
        },
      ],
    },
    history: historyLayer(state, records, requested, [
      `${observed(state, requested)} enemy orders were actually observed in the same interval.`,
    ]),
    recommendation:
      combat + net > replacements
        ? "Losses exceed recorded effective graduates. Inspect Personnel Sustainment and Training before increasing tempo."
        : "Recorded replacement output covers personnel loss in this interval; preserve the margin rather than treating it as free capacity.",
    links: [
      { id: "casualty-burden", label: "Casualty burden" },
      { id: "desertion-pressure", label: "Desertion pressure" },
      { id: "graduates", label: "Replacement output" },
    ],
    commands: [
      `report losses over the last ${requested} days`,
      "report military",
      "projection",
      "what should I do",
    ],
  };
}

function retrospectiveReport(state: GameState, requested = 5): AvaReportCard {
  const records = recent(state, requested),
    maneuvers = records.filter((record) => !!record.orders.maneuverId),
    orders = records.reduce((sum, record) => sum + record.orders.used, 0),
    unused = records.reduce((sum, record) => sum + record.orders.unused, 0),
    movement = records.reduce(
      (sum, record) => sum + record.outcome.groundMovement,
      0,
    ),
    doctrine = records.reduce(
      (sum, record) => sum + record.outcome.doctrineGain,
      0,
    ),
    wins = maneuvers.filter((record) => record.operations.succeeded).length;
  const doctrines = [
    ...new Set(
      records.flatMap((record) =>
        record.orders.directives.map((order) => order.choice),
      ),
    ),
  ].slice(0, 4);
  return {
    topic: "retrospective",
    title: `Command retrospective / ${requested}-day window`,
    direct: `${orders} orders were issued, ${unused} lapsed, and ${wins} of ${maneuvers.length} issued maneuvers met their execution threshold.`,
    flavor: flavor(state, "retrospective"),
    calculation: {
      equation:
        "issued orders + issued-maneuver outcomes + ground movement + doctrine observation",
      rows: [
        { label: "ORDERS ISSUED", value: String(orders), conceptId: "actions" },
        {
          label: "ORDERS LAPSED",
          value: String(unused),
          tone: unused ? "loss" : "neutral",
          conceptId: "actions",
        },
        {
          label: "ISSUED MANEUVERS SUCCEEDED",
          value: `${wins} / ${maneuvers.length}`,
          conceptId: "execution-confidence",
        },
        {
          label: "NET GROUND",
          value: `${signed(movement)} KM`,
          tone: movement >= 0 ? "gain" : "loss",
          conceptId: "front-movement",
        },
        {
          label: "DOCTRINE GAIN",
          value: `+${doctrine} IP`,
          tone: "gain",
          conceptId: "verified-win",
        },
      ],
    },
    history: historyLayer(state, records, requested, [
      maneuvers.length
        ? `${maneuvers.length} deliberate maneuver${maneuvers.length === 1 ? " was" : "s were"} evaluated; standing tempo was not counted as an issued success.`
        : "No maneuver was issued in the available interval; standing tempo is not reported as command success.",
      doctrines.length
        ? `Recurring directives: ${doctrines.join("; ")}.`
        : "No issued directive pattern exists in the available interval.",
    ]),
    recommendation:
      unused > records.length
        ? "Too many command orders are lapsing. Use ORDERS at the start of the next day and deliberately leave capacity unused only when inaction is the policy."
        : movement < 0
          ? "Execution has not converted into ground. Compare local force ratio, supply, and enemy posture before repeating the same maneuver."
          : "The command pattern is producing positive ground. Check adaptation before repeating the decisive maneuver.",
    links: [
      { id: "actions", label: "Order budget" },
      { id: "front-movement", label: "Front movement" },
      { id: "enemy-adaptation", label: "Enemy adaptation" },
    ],
    commands: [
      "orders",
      "missions",
      "report losses over the last 5 days",
      "projection",
    ],
  };
}

function productionReport(state: GameState, requested = 5): AvaReportCard {
  const projection = projectProduction(state),
    records = recent(state, requested);
  const historicalNet = (resource: string) =>
    records.reduce(
      (sum, record) =>
        sum +
        (record.production.lines.find((line) => line.resource === resource)
          ?.net ?? 0),
      0,
    );
  const lines = projection.lines.map((line) => ({
    label: line.resource.toUpperCase(),
    value: `${line.net >= 0 ? "+" : ""}${fmt(line.net, true)} NEXT · ${line.coverage.toFixed(1)} DAYS`,
    tone:
      line.status === "critical"
        ? ("loss" as const)
        : line.net >= 0
          ? ("gain" as const)
          : ("neutral" as const),
    conceptId: "production-coverage",
  }));
  return {
    topic: "production",
    title: "Production report",
    direct: `${projection.shortages} line${projection.shortages === 1 ? " is" : "s are"} critical. ${projection.target.toUpperCase()} is the active allocation and maintenance debt projects to ${projection.maintenanceDebtAfter.toFixed(0)}.`,
    flavor: flavor(state, "production"),
    calculation: {
      equation:
        "stock + converted output − operational use = closing stock and days of coverage",
      rows: [
        ...lines,
        {
          label: `MUNITIONS NET / ${records.length} DAYS`,
          value: fmt(historicalNet("munitions"), true),
          tone: historicalNet("munitions") >= 0 ? "gain" : "loss",
          conceptId: "munitions",
        },
        {
          label: "MATERIEL CHANGE",
          value: signed(projection.materielChange),
          tone: projection.materielChange >= 0 ? "gain" : "loss",
          conceptId: "industrial-health",
        },
      ],
    },
    history: historyLayer(state, records, requested, [
      records.length
        ? `The available ledger records ${fmt(historicalNet("munitions"), true)} cumulative munitions net.`
        : "Production history begins after the first resolution.",
    ]),
    recommendation: projection.shortages
      ? "Open Production and put the marginal allocation on the shortest coverage line, unless retooling loss would make tonight worse."
      : projection.maintenanceDebtAfter > 55
        ? "Coverage is usable but maintenance debt is becoming the next shortage. Consider a maintenance posture."
        : "No critical line requires emergency retooling. Preserve coverage while avoiding unnecessary conversion loss.",
    links: [
      { id: "production-target", label: "Production target" },
      { id: "production-coverage", label: "Days of coverage" },
      { id: "maintenance-debt", label: "Maintenance debt" },
    ],
    commands: [
      "open production",
      "projection",
      "report losses over the last 5 days",
      "what should I do",
    ],
  };
}

function projectionReport(state: GameState): AvaReportCard {
  const operation = projectOperations(state),
    production = projectProduction(state),
    force = projectForceGeneration(state),
    domestic = projectDomestic(state),
    personnel = estimateDay(state),
    history = recent(state, 5);
  return {
    topic: "projection",
    title: `Projection / Day ${state.day} resolution`,
    direct: `Standing state projects ${fmt(personnel.casualty, true)} combat losses, ${fmt(personnel.netDesertion, true)} net flight, and ${signed(operation.groundMovement)} km before the day closes.`,
    flavor: flavor(state, "projection"),
    calculation: {
      equation:
        "current orders → operations + production + force generation + domestic ledgers → next command position",
      rows: [
        {
          label: "FRIENDLY LOSS",
          value: fmt(personnel.casualty, true),
          tone: "loss",
          conceptId: "casualty-burden",
        },
        {
          label: "NET FLIGHT",
          value: fmt(personnel.netDesertion, true),
          tone: personnel.netDesertion ? "loss" : "neutral",
          conceptId: "desertion-pressure",
        },
        {
          label: "GROUND MOVEMENT",
          value: `${signed(operation.groundMovement)} KM`,
          tone: operation.groundMovement >= 0 ? "gain" : "loss",
          conceptId: "front-movement",
        },
        {
          label: "EFFECTIVE GRADUATES",
          value: `+${fmt(force.effectiveGraduates, true)}`,
          tone: "gain",
          conceptId: "graduates",
        },
        {
          label: "PRODUCTION SHORTAGES",
          value: String(production.shortages),
          tone: production.shortages ? "loss" : "neutral",
          conceptId: "lines-below-two-days",
        },
        {
          label: "LEGITIMACY CHANGE",
          value: signed(domestic.legitimacyChange),
          tone: domestic.legitimacyChange >= 0 ? "gain" : "loss",
          conceptId: "legitimacy",
        },
        {
          label: "RESISTANCE CHANGE",
          value: signed(domestic.resistanceChange),
          tone: domestic.resistanceChange <= 0 ? "gain" : "loss",
          conceptId: "resistance",
        },
      ],
    },
    history: historyLayer(state, history, 5, [
      `${observed(state, 5)} enemy orders have been observed across the available five-day intelligence window.`,
    ]),
    recommendation:
      state.actions === 0
        ? `All ${DAILY_ORDERS} orders are issued. Review the projection, then resolve Day ${state.day}.`
        : !state.maneuver
          ? "No Main Campaign maneuver is issued. Inspect the active Campaign problem before spending the remaining institutional orders."
          : "A Main Campaign order is present. Spend remaining orders only where the projected state exposes a named bottleneck.",
    links: [
      { id: "resolution", label: "Resolution order" },
      { id: "front-movement", label: "Front movement" },
      { id: "legitimacy", label: "Domestic tolerance" },
    ],
    commands: [
      "orders",
      "what should I do",
      "report production",
      "domestic report",
    ],
  };
}

function domesticReport(state: GameState, requested = 5): AvaReportCard {
  const projection = projectDomestic(state),
    records = recent(state, requested),
    legitimacy = records.reduce(
      (sum, record) => sum + record.domestic.legitimacyChange,
      0,
    ),
    resistance = records.reduce(
      (sum, record) => sum + record.domestic.resistanceChange,
      0,
    );
  return {
    topic: "domestic",
    title: "Domestic report",
    direct: `Legitimacy is ${state.legitimacy.toFixed(0)} and resistance is ${state.resistance.toFixed(0)}. Next resolution projects ${signed(projection.legitimacyChange)} legitimacy and ${signed(projection.resistanceChange)} resistance.`,
    flavor: flavor(state, "domestic"),
    calculation: {
      equation:
        "policy support − casualty burden − coercion − shortages − fiscal stress = state tolerance change",
      rows: [
        {
          label: "CASUALTY BURDEN",
          value: projection.casualtyBurden.toFixed(2),
          tone: "loss",
          conceptId: "casualty-burden",
        },
        {
          label: "FORCED INTAKE BURDEN",
          value: projection.forcedIntakeBurden.toFixed(2),
          tone: "loss",
          conceptId: "forced-intake-burden",
        },
        {
          label: "SHORTAGE BURDEN",
          value: projection.shortageBurden.toFixed(2),
          tone: "loss",
          conceptId: "shortage-burden",
        },
        {
          label: "STRIKE RISK",
          value: `${Math.round(projection.strikeRisk * 100)}%`,
          tone: projection.strikeRisk > 0.35 ? "loss" : "neutral",
          conceptId: "resistance",
        },
        {
          label: "COLLAPSE RISK",
          value: `${Math.round(projection.collapseRisk * 100)}%`,
          tone: projection.collapseRisk > 0.2 ? "loss" : "neutral",
          conceptId: "legitimacy",
        },
        {
          label: `RECORDED LEGITIMACY / ${records.length}D`,
          value: signed(legitimacy),
          tone: legitimacy >= 0 ? "gain" : "loss",
          conceptId: "legitimacy",
        },
        {
          label: `RECORDED RESISTANCE / ${records.length}D`,
          value: signed(resistance),
          tone: resistance <= 0 ? "gain" : "loss",
          conceptId: "resistance",
        },
      ],
    },
    history: historyLayer(state, records, requested, [
      records.length
        ? `The recorded interval moved legitimacy ${signed(legitimacy)} and resistance ${signed(resistance)}.`
        : "No resolved domestic ledger is yet available.",
    ]),
    recommendation:
      projection.collapseRisk > 0.2
        ? "State continuity is the primary constraint. Choose a Domestic Front order before attempting to buy ground with further coercion."
        : projection.strikeRisk > 0.35
          ? "Strike risk is operationally relevant. Inspect civil allocation and industrial labor tradeoffs."
          : "Domestic tolerance remains usable. Avoid spending it merely because the meter is not yet red.",
    links: [
      { id: "legitimacy", label: "Legitimacy" },
      { id: "resistance", label: "Resistance" },
      { id: "casualty-burden", label: "Casualty burden" },
    ],
    commands: [
      "open production",
      "report losses over the last 5 days",
      "projection",
      "what should I do",
    ],
  };
}

function operationsReport(state: GameState, requested = 5): AvaReportCard {
  const operation = projectOperations(state),
    situation = situationForState(state),
    records = recent(state, requested),
    movement = records.reduce(
      (sum, record) => sum + record.outcome.groundMovement,
      0,
    ),
    losses = records.reduce(
      (sum, record) => sum + record.personnel.combatLosses,
      0,
    );
  return {
    topic: "operations",
    title: `Operations report / ${situation.sector}`,
    direct: `${operation.maneuver} commits ${fmt(operation.committed, true)} local personnel${operation.packageEfficiency < 1 ? ` against a ${fmt(operation.nominalCommitment, true)} nominal requirement` : ""} at a literal ${operation.forceRatio.toFixed(2)} effective-force ratio and projects ${signed(operation.groundMovement)} km.`,
    flavor: flavor(state, "operations"),
    calculation: {
      equation:
        "local personnel × disclosed condition conversion = local effective force; friendly effective ÷ enemy effective = literal ratio",
      rows: [
        {
          label: "OPERATIONALLY AVAILABLE",
          value: fmt(operation.operationallyAvailable, true),
          conceptId: "deployable-force",
        },
        {
          label: "LOCAL PERSONNEL COMMITTED",
          value: fmt(operation.committed, true),
          conceptId: "force-commitment",
        },
        ...(operation.packageEfficiency < 1
          ? [
              {
                label: "TASK-PACKAGE EQUIVALENT",
                value: fmt(operation.combatEquivalent, true),
                conceptId: "force-commitment",
              },
              {
                label: "PERSONNEL WITHHELD",
                value: fmt(
                  Math.max(0, operation.nominalCommitment - operation.committed),
                  true,
                ),
                conceptId: "deployable-force",
              },
            ]
          : []),
        {
          label: "FRIENDLY LOCAL EFFECTIVE",
          value: fmt(operation.friendlyPower, true),
          conceptId: "effective-committed-force",
        },
        {
          label: "ASSESSED ENEMY LOCAL",
          value: `${fmt(operation.enemyCommitted, true)} · ${fmt(operation.enemyCommittedLow, true)}–${fmt(operation.enemyCommittedHigh, true)}`,
          conceptId: "enemy-forward-deployment",
        },
        {
          label: "ENEMY LOCAL EFFECTIVE",
          value: fmt(operation.enemyPower, true),
          conceptId: "enemy-forward-deployment",
        },
        {
          label: "LITERAL FORCE RATIO",
          value: operation.forceRatio.toFixed(2),
          tone: operation.forceRatio >= 1 ? "gain" : "loss",
          conceptId: "force-ratio",
        },
        {
          label: "BOUNDED ATTRITION RATIO",
          value: operation.boundedForceRatio.toFixed(2),
          conceptId: "force-ratio",
        },
        {
          label: "EXECUTION CONFIDENCE",
          value: `${Math.round(operation.executionConfidence * 100)}%`,
          conceptId: "execution-confidence",
        },
        {
          label: "PROJECTED FRIENDLY LOSS",
          value: fmt(operation.friendlyLosses, true),
          tone: "loss",
          conceptId: "casualty-exposure",
        },
        {
          label: "PROJECTED GROUND",
          value: `${signed(operation.groundMovement)} KM`,
          tone: operation.groundMovement >= 0 ? "gain" : "loss",
          conceptId: "front-movement",
        },
      ],
    },
    history: historyLayer(state, records, requested, [
      `${signed(movement)} km and ${fmt(losses, true)} friendly combat losses are recorded in the available interval.`,
    ]),
    recommendation: !state.maneuver
      ? `No deliberate maneuver is issued at ${situation.sector}. Compare the authorized maneuvers before accepting standing tempo.`
      : operation.forceRatio < 0.9
        ? "The local exchange remains unfavorable. Inspect condition conversion, supply, and the enemy estimate before resolving."
        : "The issued maneuver has a usable local ratio. Verify its loss exposure and supply cost before resolving.",
    links: [
      { id: "force-ratio", label: "Local force ratio" },
      { id: "execution-confidence", label: "Execution confidence" },
      { id: "casualty-exposure", label: "Loss exposure" },
    ],
    commands: ["missions", "compare M1 M2", "projection", "report adversary"],
  };
}

function networkReport(state: GameState, requested = 5): AvaReportCard {
  const operation = projectOperations(state),
    packet = compileConvergence(state).network,
    records = recent(state, requested),
    history = state.subMissionHistory
      .filter((record) => record.domain === "network")
      .slice(0, requested),
    issued = history.filter((record) => record.outcome === "issued").length;
  const optionRows: AvaReportCard["calculation"]["rows"] = packet.options.map(
    (option, index) => ({
      label: `N${index + 1} / ${option.choice.label.toUpperCase()}`,
      value: `${option.family.label} · ${option.choice.exact.join("; ")}`,
      conceptId: "command-network",
    }),
  );
  return {
    topic: "network",
    title: `Command Network / ${packet.title}`,
    direct: `${packet.pressureBand.toUpperCase()} network pressure is active under ${state.networkPosture.toUpperCase()} posture; the current local conversion factor is ${operation.networkFactor.toFixed(2)}.`,
    flavor: flavor(state, "network"),
    calculation: {
      equation:
        "sector network condition + network posture + authentication/custody policy − hostile interference = operational network conversion",
      rows: [
        {
          label: "CURRENT POSTURE",
          value: state.networkPosture.toUpperCase(),
          conceptId: "command-network",
        },
        {
          label: "SECTOR NETWORK",
          value: situationForState(state).network.toUpperCase(),
          conceptId: "command-network",
        },
        {
          label: "LOCAL NETWORK FACTOR",
          value: operation.networkFactor.toFixed(2),
          tone: operation.networkFactor >= 0.9 ? "gain" : "loss",
          conceptId: "command-network",
        },
        {
          label: "OPERATIONAL INTELLIGENCE",
          value: `${state.intelligence.toFixed(0)} / 100`,
          conceptId: "intelligence",
        },
        {
          label: "ACTIVE NETWORK MISSION",
          value: `${packet.category} · ${packet.title}`,
          conceptId: packet.archetypeId,
        },
        ...optionRows,
      ],
    },
    history: historyLayer(state, records, requested, [
      `${issued} of ${history.length} recorded Network missions received an order.`,
      ...packet.evidence.map((item) => `Field evidence: ${item}.`),
      `Front-line consequence: ${packet.convergence.map((edge) => edge.summary).join(" ")}`,
    ]),
    recommendation:
      operation.networkFactor < 0.8
        ? "Command conversion is materially degraded. Compare the three current Network responses before committing additional personnel to the sector."
        : "The network is converting command at a usable rate. Preserve either secrecy or redundancy rather than buying marginal speed without examining exposure.",
    links: [
      { id: "command-network", label: "Command network" },
      { id: packet.archetypeId, label: packet.title },
      { id: "intelligence", label: "Operational intelligence" },
    ],
    commands: ["missions", "compare N1 N2", "stage N1", "report intelligence"],
  };
}

function intelligenceReport(state: GameState, requested = 5): AvaReportCard {
  const adversary = projectAdversary(state),
    operation = projectOperations(state),
    records = recent(state, requested),
    observedOrders = records.flatMap(
      (record) => record.adversaryObserved.observedOrders,
    ),
    unique = [...new Set(observedOrders)].slice(0, 8);
  return {
    topic: "intelligence",
    title: "Intelligence report",
    direct: `Classification is ${state.intelligence.toFixed(0)} / 100. The enemy theater estimate is ${fmt(adversary.estimatedForce, true)} inside a ${fmt(adversary.estimateLow, true)}–${fmt(adversary.estimateHigh, true)} confidence interval; ${adversary.hiddenOrders} of three current orders remain unclassified.`,
    flavor: flavor(state, "intelligence"),
    calculation: {
      equation:
        "collection quality → enemy uncertainty band + visible enemy orders + friendly operational conversion",
      rows: [
        {
          label: "CLASSIFICATION QUALITY",
          value: `${state.intelligence.toFixed(0)} / 100`,
          conceptId: "intelligence",
        },
        {
          label: "INTEL CONFIDENCE",
          value: `${Math.round(adversary.intelConfidence)}%`,
          conceptId: "intelligence",
        },
        {
          label: "ENEMY THEATER ESTIMATE",
          value: fmt(adversary.estimatedForce, true),
          conceptId: "enemy-forward-deployment",
        },
        {
          label: "ESTIMATE INTERVAL",
          value: `${fmt(adversary.estimateLow, true)}–${fmt(adversary.estimateHigh, true)}`,
          conceptId: "enemy-forward-deployment",
        },
        {
          label: "ASSESSED LOCAL DEPLOYMENT",
          value: `${fmt(adversary.deployedEstimate, true)} · ${fmt(adversary.deployedLow, true)}–${fmt(adversary.deployedHigh, true)}`,
          conceptId: "enemy-forward-deployment",
        },
        {
          label: "FRIENDLY INTELLIGENCE FACTOR",
          value: operation.intelligenceFactor.toFixed(2),
          conceptId: "intelligence",
        },
        {
          label: "CURRENT ORDERS OBSERVED",
          value: `${adversary.observedOrders.length} / 3`,
          tone: adversary.hiddenOrders ? "loss" : "gain",
          conceptId: "enemy-orders",
        },
        ...adversary.observedOrders.map((order, index) => ({
          label: `OBSERVED ORDER ${index + 1}`,
          value: order,
          conceptId: "enemy-orders",
        })),
      ],
    },
    history: historyLayer(state, records, requested, [
      `${observedOrders.length} enemy orders were observed in the interval; repeated observations are retained as evidence.`,
      unique.length
        ? `Observed corpus: ${unique.join("; ")}.`
        : "No enemy-order corpus is yet available.",
    ]),
    recommendation: adversary.hiddenOrders
      ? `${adversary.hiddenOrders} current enemy order${adversary.hiddenOrders === 1 ? " remains" : "s remain"} hidden. Intelligence, foreign collection, and network choices can narrow the estimate, but no report should fill the gap with invention.`
      : "All three current enemy orders are classified. Use the information to compare maneuvers rather than continuing collection without a decision purpose.",
    links: [
      { id: "intelligence", label: "Operational intelligence" },
      { id: "enemy-orders", label: "Enemy orders" },
      { id: "enemy-forward-deployment", label: "Enemy estimate" },
    ],
    commands: ["report adversary", "report network", "missions", "projection"],
  };
}

function adversaryReport(state: GameState, requested = 5): AvaReportCard {
  const adversary = projectAdversary(state),
    records = recent(state, requested),
    past = records.flatMap((record) => record.adversaryObserved.observedOrders),
    operations =
      adversary.observedOrders.find((order) =>
        order.startsWith("OPERATIONS"),
      ) ?? "UNCLASSIFIED",
    production =
      adversary.observedOrders.find((order) =>
        order.startsWith("PRODUCTION"),
      ) ?? "UNCLASSIFIED",
    countermeasure =
      adversary.observedOrders.find((order) =>
        order.startsWith("COUNTERMEASURE"),
      ) ?? "UNCLASSIFIED";
  return {
    topic: "adversary",
    title: "Adversary report",
    direct: `Enemy force is assessed at ${fmt(adversary.estimatedForce, true)}, with ${fmt(adversary.deployedEstimate, true)} assessed in ${adversary.objective}. ${adversary.observedOrders.length} of three current orders are classified.`,
    flavor: flavor(state, "adversary"),
    calculation: {
      equation:
        "observed disposition + intelligence uncertainty + posture deployment share = assessed local adversary",
      rows: [
        {
          label: "THEATER ESTIMATE",
          value: `${fmt(adversary.estimatedForce, true)} · ${fmt(adversary.estimateLow, true)}–${fmt(adversary.estimateHigh, true)}`,
          conceptId: "enemy-forward-deployment",
        },
        {
          label: "LOCAL DEPLOYMENT ESTIMATE",
          value: `${fmt(adversary.deployedEstimate, true)} · ${(adversary.deploymentShare * 100).toFixed(0)}% SHARE`,
          conceptId: "enemy-forward-deployment",
        },
        {
          label: "OPERATIONS ORDER",
          value: operations,
          conceptId: "enemy-orders",
        },
        {
          label: "PRODUCTION ORDER",
          value: production,
          conceptId: "enemy-orders",
        },
        {
          label: "COUNTERMEASURE",
          value: countermeasure,
          conceptId: "enemy-adaptation",
        },
        {
          label: "ORDERS HIDDEN",
          value: String(adversary.hiddenOrders),
          tone: adversary.hiddenOrders ? "loss" : "gain",
          conceptId: "enemy-orders",
        },
        {
          label: "PRESSURE",
          value: adversary.pressure.toFixed(2),
          conceptId: "pressure",
        },
        {
          label: "NETWORK INTERFERENCE",
          value: adversary.networkInterference.toFixed(2),
          conceptId: "command-network",
        },
      ],
    },
    history: historyLayer(state, records, requested, [
      `${past.length} enemy-order observations are preserved in the selected window.`,
      ...adversary.signals.map((signal) => `Current signal: ${signal}`),
    ]),
    recommendation: adversary.hiddenOrders
      ? "Treat unclassified orders as unknown. Improve collection or select a maneuver robust to the disclosed estimate interval."
      : adversary.pressure > 0.8
        ? "The classified posture is generating high pressure. Compare force-preserving and counterstroke responses before resolving."
        : "Enemy pressure is presently bounded. Check adaptation before repeating the last successful maneuver.",
    links: [
      { id: "enemy-orders", label: "Observed enemy orders" },
      { id: "enemy-forward-deployment", label: "Assessed deployment" },
      { id: "enemy-adaptation", label: "Enemy adaptation" },
    ],
    commands: [
      "report intelligence",
      "report operations",
      "compare M1 M2",
      "retrospective",
    ],
  };
}

function personnelReport(state: GameState, requested = 5): AvaReportCard {
  const force = projectForceGeneration(state),
    personnel = estimateDay(state),
    records = recent(state, requested),
    combat = records.reduce(
      (sum, record) => sum + record.personnel.combatLosses,
      0,
    ),
    netFlight = records.reduce(
      (sum, record) => sum + record.personnel.netDesertion,
      0,
    ),
    graduates = records.reduce(
      (sum, record) => sum + record.personnel.effectiveGraduates,
      0,
    ),
    projectedNet =
      force.deployableAssigned - personnel.casualty - personnel.netDesertion;
  return {
    topic: "personnel",
    title: "Personnel report",
    direct: `${fmt(state.deployable, true)} personnel are deployable. Tonight projects ${fmt(force.deployableAssigned, true)} new deployable assignments against ${fmt(personnel.casualty, true)} combat losses and ${fmt(personnel.netDesertion, true)} net flight.`,
    flavor: flavor(state, "personnel"),
    calculation: {
      equation:
        "armed force + quality-adjusted graduates − casualties − net flight − rear commitments = deployable force",
      rows: [
        {
          label: "ARMED FORCE",
          value: fmt(state.armed, true),
          conceptId: "deployable-force",
        },
        {
          label: "DEPLOYABLE FORCE",
          value: fmt(state.deployable, true),
          conceptId: "deployable-force",
        },
        {
          label: "TRAINING QUEUE",
          value: fmt(state.queue, true),
          conceptId: "training-queue",
        },
        {
          label: "DAILY CAPACITY",
          value: fmt(state.training, true),
          conceptId: "training-capacity",
        },
        {
          label: "EFFECTIVE GRADUATES",
          value: `+${fmt(force.effectiveGraduates, true)}`,
          tone: "gain",
          conceptId: "graduates",
        },
        {
          label: "DEPLOYABLE ASSIGNMENTS",
          value: `+${fmt(force.deployableAssigned, true)}`,
          tone: "gain",
          conceptId: "equipment-assignment",
        },
        {
          label: "COMBAT LOSS",
          value: `−${fmt(personnel.casualty, true)}`,
          tone: "loss",
          conceptId: "casualty-burden",
        },
        {
          label: "FLIGHT ATTEMPTS",
          value: fmt(personnel.desertion, true),
          conceptId: "desertion-pressure",
        },
        {
          label: "RETAINED / INTERCEPTED",
          value: `${fmt(personnel.retained, true)} / ${fmt(personnel.intercepted, true)}`,
          tone: "gain",
          conceptId: "desertion-pressure",
        },
        {
          label: "NET FLIGHT",
          value: `−${fmt(personnel.netDesertion, true)}`,
          tone: personnel.netDesertion ? "loss" : "neutral",
          conceptId: "desertion-pressure",
        },
        {
          label: "PROJECTED NET DEPLOYABLE",
          value: signed(projectedNet, 0),
          tone: projectedNet >= 0 ? "gain" : "loss",
          conceptId: "deployable-force",
        },
      ],
    },
    history: historyLayer(state, records, requested, [
      `${fmt(graduates, true)} effective graduates, ${fmt(combat, true)} combat losses, and ${fmt(netFlight, true)} net flight are recorded in the selected interval.`,
    ]),
    recommendation:
      projectedNet < 0
        ? "The personnel system is shrinking tonight. Compare training throughput, retention, and operational commitment before spending more force."
        : force.estimatedWaitDays > 2
          ? "Net deployable flow is positive, but the induction backlog remains material. Inspect capacity and training standard."
          : "The replacement stream covers projected personnel loss. Preserve training quality and avoid treating the margin as free force.",
    links: [
      { id: "deployable-force", label: "Deployable force" },
      { id: "training-queue", label: "Training queue" },
      { id: "desertion-pressure", label: "Desertion pressure" },
    ],
    commands: [
      "report losses over the last 5 days",
      "report resources",
      "missions",
      "projection",
    ],
  };
}

function resourcesReport(state: GameState, requested = 5): AvaReportCard {
  const production = projectProduction(state),
    records = recent(state, requested),
    critical = production.lines.filter((line) => line.status === "critical"),
    historical = production.lines.map((line) => ({
      resource: line.resource,
      net: records.reduce(
        (sum, record) =>
          sum +
          (record.production.lines.find(
            (item) => item.resource === line.resource,
          )?.net ?? 0),
        0,
      ),
    }));
  return {
    topic: "resources",
    title: "Resource ledger",
    direct: `${critical.length} of ${production.lines.length} strategic resource lines close below two days of coverage. ${production.target.toUpperCase()} is the active production target.`,
    flavor: flavor(state, "resources"),
    calculation: {
      equation:
        "opening stock + converted output − operational use = closing stock and coverage",
      rows: production.lines.flatMap((line) => [
        {
          label: line.resource.toUpperCase(),
          value: `OPEN ${fmt(line.opening, true)} · +${fmt(line.output, true)} · −${fmt(line.use, true)} · CLOSE ${fmt(line.closing, true)}`,
          tone:
            line.status === "critical"
              ? ("loss" as const)
              : ("neutral" as const),
          conceptId:
            line.resource === "munitions" ? "munitions" : "production-coverage",
        },
        {
          label: `${line.resource.toUpperCase()} COVERAGE`,
          value: `${line.coverage.toFixed(1)} DAYS · ${line.status.toUpperCase()}`,
          tone:
            line.status === "critical"
              ? ("loss" as const)
              : line.status === "stable"
                ? ("gain" as const)
                : ("neutral" as const),
          conceptId: "production-coverage",
        },
      ]),
    },
    history: historyLayer(state, records, requested, [
      ...historical.map(
        (line) =>
          `${line.resource.toUpperCase()} recorded net over ${records.length} days: ${signed(line.net, 0)}.`,
      ),
    ]),
    recommendation: critical.length
      ? `Protect ${critical.map((line) => line.resource).join(", ")} coverage before increasing operational use. A target change incurs the disclosed retooling loss.`
      : "No resource line is critical. Compare future use against maintenance debt before reallocating production.",
    links: [
      { id: "production-coverage", label: "Days of coverage" },
      { id: "production-target", label: "Production target" },
      { id: "maintenance-debt", label: "Maintenance debt" },
    ],
    commands: [
      "report production",
      "report personnel",
      "projection",
      "open production",
    ],
  };
}

function effectsReport(state: GameState, requested = 5): AvaReportCard {
  const standing = Object.entries(state.active)
      .map(([familyId, choiceId]) => {
        const family = FAMILIES.find((item) => item.id === familyId),
          choice = family?.choices.find((item) => item.id === choiceId);
        return family && choice && family.module !== "diplomacy"
          ? { family, choice }
          : null;
      })
      .filter(
        (
          item,
        ): item is {
          family: (typeof FAMILIES)[number];
          choice: (typeof FAMILIES)[number]["choices"][number];
        } => !!item,
      ),
    diplomacy = activeDiplomacyForState(state)
      .map((action) => {
        const family = FAMILIES.find((item) => item.id === action.familyId),
          choice = family?.choices.find((item) => item.id === action.choiceId);
        return family && choice ? { action, family, choice } : null;
      })
      .filter((item): item is NonNullable<typeof item> => !!item),
    locks = Object.entries(state.locks).filter(
      ([, until]) => until > state.day,
    ),
    scheduled = state.scheduled.filter((item) => item.day >= state.day),
    records = recent(state, requested);
  const rows: AvaReportCard["calculation"]["rows"] = [
    {
      label: "STANDING POLICIES",
      value: String(standing.length),
      conceptId: "owned-effects",
    },
    {
      label: "ACTIVE DIPLOMATIC ACTIONS",
      value: String(diplomacy.length),
      conceptId: "owned-effects",
    },
    {
      label: "FAMILY LOCKS",
      value: String(locks.length),
      conceptId: "actions",
    },
    {
      label: "SCHEDULED EFFECTS",
      value: String(scheduled.length),
      conceptId: "resolution",
    },
    ...standing.map((item) => ({
      label: item.family.label.toUpperCase(),
      value: `${item.choice.label} · ${item.choice.exact.join("; ")}`,
      conceptId: `directive-${slug(item.choice.label)}`,
    })),
    ...diplomacy.map((item) => ({
      label: `DIPLOMACY / ${item.choice.label.toUpperCase()}`,
      value: `THROUGH DAY ${item.action.expiresDay - 1} · ${item.choice.exact.join("; ")}`,
      conceptId: "diplomatic-trust",
    })),
    ...locks.map(([familyId, until]) => ({
      label: `LOCK / ${(FAMILIES.find((item) => item.id === familyId)?.label ?? familyId).toUpperCase()}`,
      value: `AVAILABLE DAY ${until}`,
      conceptId: "actions",
    })),
    ...scheduled.map((item) => ({
      label: `SCHEDULED / ${item.source.toUpperCase()}`,
      value: `DAY ${item.day}`,
      conceptId: "resolution",
    })),
  ];
  return {
    topic: "effects",
    title: "Active effects and contingencies",
    direct: `${standing.length + diplomacy.length} policies or diplomatic actions are operant, ${scheduled.length} effects are scheduled, and ${locks.length} issue families remain locked.`,
    flavor: flavor(state, "effects"),
    calculation: {
      equation:
        "owned effects apply at issue; standing ticks and scheduled deltas apply at resolution; expired diplomacy is removed before its circuit",
      rows,
    },
    history: historyLayer(state, records, requested, [
      `${state.decisions.filter((decision) => decision.day >= Math.max(1, state.day - requested)).length} decisions appear in the corresponding command interval.`,
    ]),
    recommendation: scheduled.length
      ? "Review scheduled arrivals before issuing a redundant replacement. A delayed effect already in the ledger will resolve on its recorded day."
      : locks.length
        ? "Several issue families remain locked. Use MISSIONS to select among currently authorized alternatives rather than waiting on an unavailable family."
        : "No delayed effect or family lock constrains the next order. Choose from current campaign pressure rather than policy inertia.",
    links: [
      { id: "owned-effects", label: "Owned effects" },
      { id: "contingent-effects", label: "Contingent effects" },
      { id: "resolution", label: "Resolution order" },
    ],
    commands: [
      "missions",
      "report decision ledger",
      "projection",
      "retrospective",
    ],
  };
}

function opportunitiesReport(state: GameState, requested = 5): AvaReportCard {
  const packet = opportunityForState(state),
    records = recent(state, requested),
    today = packet
      ? state.opportunityHistory.find(
          (record) =>
            record.day === state.day && record.opportunityId === packet.id,
        )
      : undefined,
    history = state.opportunityHistory.filter(
      (record) => record.day >= Math.max(1, state.day - requested),
    ),
    exploited = history.filter(
      (record) => record.outcome === "exploited",
    ).length;
  const rows: AvaReportCard["calculation"]["rows"] = [
    {
      label: "TODAY'S OPPORTUNITY DOCKET",
      value: packet ? `${packet.label} · ${packet.sector}` : "NONE SCHEDULED",
      conceptId: "target-of-opportunity",
    },
    {
      label: "TODAY'S RESULT",
      value: today
        ? `${today.outcome.toUpperCase()} · ${today.response}`
        : packet
          ? "UNRESOLVED: CLOCK WINDOW REQUIRED"
          : "NOT APPLICABLE",
      conceptId: "target-of-opportunity",
    },
    {
      label: `RECORDED / ${requested}D`,
      value: `${history.length} OCCURRED · ${exploited} EXPLOITED`,
      conceptId: "target-of-opportunity",
    },
    ...(packet?.responses.map((response, index) => ({
      label: `X${index + 1} / ${response.label.toUpperCase()}`,
      value: `${Math.round(response.chance * 100)}% · ${response.exact.join("; ")} · ${response.contingent.join("; ")}`,
      conceptId: "target-of-opportunity",
    })) ?? []),
  ];
  return {
    topic: "opportunities",
    title: "Targets of opportunity",
    direct: packet
      ? `${packet.label} is scheduled for Day ${state.day} at ${packet.sector}. This report does not establish whether its clock window is presently open.`
      : `No target of opportunity is scheduled for Day ${state.day}.`,
    flavor: flavor(state, "opportunities"),
    calculation: {
      equation:
        "sealed campaign sequence + day → occurrence; command clock → open window; selected response → immediate result",
      rows,
    },
    history: historyLayer(state, records, requested, [
      ...history.map(
        (record) =>
          `Day ${record.day}: ${record.response} · ${record.outcome} · ${record.report}`,
      ),
    ]),
    recommendation: today
      ? "Today's opportunity is already resolved. Its immediate effect is included in the current state and projection."
      : packet
        ? "Ask MISSIONS for the live timed window and response handles. Do not infer availability from this report alone."
        : "No opportunity action is available today. Preserve resources for the main order system.",
    links: [
      { id: "target-of-opportunity", label: "Target of opportunity" },
      { id: "intelligence", label: "Operational intelligence" },
      { id: "resolution", label: "Same-day projection" },
    ],
    commands: ["missions", "report resources", "projection", "retrospective"],
  };
}

function decisionLedgerReport(state: GameState, requested = 5): AvaReportCard {
  const records = recent(state, requested),
    startDay = Math.max(1, state.day - requested + 1),
    decisions = state.decisions.filter((decision) => decision.day >= startDay),
    resolved = records.reduce((sum, record) => sum + record.orders.used, 0),
    lapsed = records.reduce((sum, record) => sum + record.orders.unused, 0),
    rows: AvaReportCard["calculation"]["rows"] = [
      { label: "WINDOW", value: `DAY ${startDay}–${state.day}` },
      {
        label: "DECISIONS RECORDED",
        value: String(decisions.length),
        conceptId: "actions",
      },
      {
        label: "RESOLVED ORDERS ISSUED",
        value: String(resolved),
        conceptId: "actions",
      },
      {
        label: "RESOLVED ORDERS LAPSED",
        value: String(lapsed),
        tone: lapsed ? "loss" : "neutral",
        conceptId: "actions",
      },
      ...decisions.slice(0, 24).map((decision) => {
        const family = FAMILIES.find((item) => item.id === decision.familyId);
        return {
          label: `DAY ${decision.day} / ${(decision.domain ?? decision.family).toUpperCase()}`,
          value: decision.choice,
          conceptId: family ? `issue-${slug(family.label)}` : "actions",
        };
      }),
    ];
  return {
    topic: "decision-ledger",
    title: `Decision ledger / ${requested}-day window`,
    direct: `${decisions.length} decisions are recorded from Day ${startDay} through Day ${state.day}; ${resolved} orders have resolved and ${lapsed} order slots lapsed in the available historical rows.`,
    flavor: flavor(state, "decision-ledger"),
    calculation: {
      equation:
        "sealed order → command-ledger entry → day-resolution entry; unused capacity is recorded separately",
      rows,
    },
    history: historyLayer(state, records, requested, [
      decisions.length > 24
        ? `${decisions.length - 24} older decision rows in the selected window are omitted from this compact report.`
        : "Every decision row in the selected window is displayed.",
    ]),
    recommendation:
      lapsed > records.length
        ? "The ledger shows persistent unused command capacity. Use MISSIONS before resolution so inaction is deliberate rather than accidental."
        : "The order budget is being used consistently. Inspect outcomes, not merely issue volume, before repeating the same pattern.",
    links: [
      { id: "actions", label: "Order budget" },
      { id: "resolution", label: "Resolution ledger" },
      { id: "owned-effects", label: "Owned effects" },
    ],
    commands: [
      "retrospective",
      "report effects",
      "report losses over the last 5 days",
      "missions",
    ],
  };
}

function serviceRecordReport(state: GameState, requested = 5): AvaReportCard {
  const records = recent(state, requested),
    openingArmed = state.resolutionHistory.at(-1)?.opening.armed ?? state.armed,
    preserved = openingArmed ? (state.armed / openingArmed) * 100 : 100,
    closed = state.status !== "active";
  return {
    topic: "service-record",
    title: "Campaign service record",
    direct: closed
      ? `Campaign ${state.campaignId} is ${state.status}. Its campaign ledger is complete; permanent Service Record issuance and ranking occur at the records office.`
      : `Campaign ${state.campaignId} remains active on Day ${state.day}. No permanent Service Record can be issued before the campaign closes.`,
    flavor: flavor(state, "service-record"),
    calculation: {
      equation:
        "campaign ledger + verified identity → score + cohort rank + Player Rating + public record",
      rows: [
        {
          label: "CAMPAIGN ID",
          value: state.campaignId,
          conceptId: "campaign-synopsis",
        },
        {
          label: "STATUS",
          value: state.status.toUpperCase(),
          tone:
            state.status === "victory"
              ? "gain"
              : state.status === "defeat"
                ? "loss"
                : "neutral",
          conceptId: "service-record",
        },
        {
          label: "RESOLVED DAYS",
          value: String(state.resolutionHistory.length),
          conceptId: "resolution",
        },
        {
          label: "CURRENT FRONT",
          value: `${signed(state.front)} KM`,
          tone: state.front >= 0 ? "gain" : "loss",
          conceptId: "front-movement",
        },
        {
          label: "OPENING FORCE REMAINING",
          value: `${preserved.toFixed(1)}% OF OPENING LEDGER`,
          conceptId: "deployable-force",
        },
        {
          label: "DECISIONS",
          value: String(state.decisions.length),
          conceptId: "actions",
        },
      ],
    },
    history: historyLayer(state, records, requested, [
      closed
        ? "The closed campaign may now be presented to the records office; this field report does not claim that a permanent record has been issued."
        : "Campaign Score, Player Rating, cohort rank, and public citation do not exist until record issuance.",
    ]),
    recommendation: closed
      ? "Open the records office to verify whether this completed campaign received a permanent record. Until then, no score, rank, or public citation is claimed."
      : "Complete the campaign before requesting a permanent record. Use the decision ledger or retrospective for current-run history.",
    links: [
      { id: "service-record", label: "Service Record" },
      { id: "campaign-record", label: "Campaign Record" },
      { id: "actions", label: "Decision ledger" },
    ],
    commands: [
      "open account",
      "report decision ledger",
      "retrospective",
      "status",
    ],
  };
}

function dailyBriefReport(state: GameState): AvaReportCard {
  const packet = compileConvergence(state),
    operation = projectOperations(state),
    production = projectProduction(state),
    domestic = projectDomestic(state),
    personnel = estimateDay(state),
    opportunity = opportunityForState(state),
    advice = adviceReport(state),
    maneuvers = packet.operational.maneuvers
      .map((id) => MANEUVERS.find((item) => item.id === id))
      .filter((item): item is (typeof MANEUVERS)[number] => !!item),
    records = recent(state, 5);
  const rows: AvaReportCard["calculation"]["rows"] = [
    {
      label: "ORDERS REMAINING",
      value: `${state.actions} / ${DAILY_ORDERS}`,
      conceptId: "actions",
    },
    {
      label: "MAIN CAMPAIGN",
      value: `${packet.operational.sector} · ${packet.operational.question}`,
      conceptId: "campaign-synopsis",
    },
    ...maneuvers.map((maneuver, index) => ({
      label: `M${index + 1} / ${maneuver.label.toUpperCase()}`,
      value: `${Math.round(maneuverChance(state, maneuver) * 100)}% CONFIDENCE · ${fmt(projectOperations(state, maneuver).committed, true)} COMMITTED`,
      conceptId: `maneuver-${slug(maneuver.label)}`,
    })),
    {
      label: "DOMESTIC FRONT",
      value: `${packet.domestic.pressureBand.toUpperCase()} · ${packet.domestic.title} · ${packet.domestic.question}`,
      conceptId: packet.domestic.archetypeId,
    },
    ...packet.domestic.options.map((option, index) => ({
      label: `D${index + 1} / ${option.choice.label.toUpperCase()}`,
      value: option.choice.exact.join("; "),
      conceptId: packet.domestic.archetypeId,
    })),
    {
      label: "COMMAND NETWORK",
      value: `${packet.network.pressureBand.toUpperCase()} · ${packet.network.title} · ${packet.network.question}`,
      conceptId: packet.network.archetypeId,
    },
    ...packet.network.options.map((option, index) => ({
      label: `N${index + 1} / ${option.choice.label.toUpperCase()}`,
      value: option.choice.exact.join("; "),
      conceptId: packet.network.archetypeId,
    })),
    {
      label: "PROJECTED CLOSE",
      value: `${fmt(personnel.casualty, true)} LOSSES · ${fmt(personnel.netDesertion, true)} NET FLIGHT · ${signed(operation.groundMovement)} KM`,
      conceptId: "resolution",
    },
    {
      label: "PRODUCTION / DOMESTIC",
      value: `${production.shortages} CRITICAL LINES · LEGITIMACY ${signed(domestic.legitimacyChange)} · RESISTANCE ${signed(domestic.resistanceChange)}`,
      conceptId: "legitimacy",
    },
    {
      label: "OPPORTUNITY DOCKET",
      value: opportunity
        ? `${opportunity.label} · ASK MISSIONS FOR THE LIVE WINDOW`
        : "NONE SCHEDULED",
      conceptId: "target-of-opportunity",
    },
  ];
  return {
    topic: "daily-brief",
    title: `Daily command brief / Day ${state.day}`,
    direct: `Three convergent fronts are open: ${packet.operational.sector}, ${packet.domestic.title}, and ${packet.network.title}. ${state.actions} of ${DAILY_ORDERS} orders remain.`,
    flavor: flavor(state, "daily-brief"),
    calculation: {
      equation:
        "operational problem + sealed Domestic mission + sealed Network mission + live constraints = today's complete command docket",
      rows,
    },
    history: historyLayer(state, records, 5, [
      `Domestic pressure is assessed as ${packet.domestic.pressureBand}.`,
      `Network pressure is assessed as ${packet.network.pressureBand}.`,
      ...packet.domestic.evidence.map((item) => `Domestic evidence: ${item}.`),
      ...packet.network.evidence.map((item) => `Network evidence: ${item}.`),
    ]),
    recommendation: advice.recommendation,
    links: [
      { id: "campaign-synopsis", label: "Main Campaign" },
      { id: packet.domestic.archetypeId, label: packet.domestic.title },
      { id: packet.network.archetypeId, label: packet.network.title },
    ],
    commands: [
      "missions",
      "what should I do",
      "compare M1 M2",
      "stage M1 D1 N1",
      "projection",
    ],
  };
}

function overviewReport(
  state: GameState,
  topic: AvaReportTopic,
): AvaReportCard {
  if (topic === "production") return productionReport(state);
  if (topic === "projection") return projectionReport(state);
  if (topic === "domestic") return domesticReport(state);
  const operation = projectOperations(state),
    force = projectForceGeneration(state),
    history = recent(state, 5);
  let title = "Strategic status",
    direct = `Day ${state.day}. ${state.actions} orders remain. Local effective-force ratio is ${operation.forceRatio.toFixed(2)} at ${signed(state.front)} km.`;
  let rows: AvaReportCard["calculation"]["rows"] = [
    {
      label: "FRIENDLY LOCAL EFFECTIVE",
      value: fmt(operation.friendlyPower, true),
      conceptId: "effective-committed-force",
    },
    {
      label: "ENEMY LOCAL EFFECTIVE",
      value: fmt(operation.enemyPower, true),
      conceptId: "enemy-forward-deployment",
    },
    {
      label: "LITERAL RATIO",
      value: operation.forceRatio.toFixed(2),
      conceptId: "force-ratio",
    },
    {
      label: "ORDERS REMAINING",
      value: String(state.actions),
      conceptId: "actions",
    },
  ];
  let recommendation =
    "Ask what should I do for a prioritized recommendation, or name a report surface.";
  let links = [
    { id: "campaign-synopsis", label: "Campaign synopsis" },
    { id: "force-ratio", label: "Local force ratio" },
  ];
  if (topic === "military") {
    title = "Military report";
    direct = `${fmt(state.deployable, true)} are deployable; ${fmt(force.effectiveGraduates, true)} effective graduates and ${fmt(force.deployableAssigned, true)} deployable assignments are projected.`;
    rows = [
      ...rows,
      {
        label: "READINESS",
        value: `${state.readiness.toFixed(0)}%`,
        conceptId: "readiness",
      },
      {
        label: "EQUIPMENT",
        value: `${state.equipment.toFixed(0)}%`,
        conceptId: "equipment-coverage",
      },
    ];
    recommendation =
      "Compare projected personnel loss with deployable assignment before changing tempo.";
  }
  if (topic === "diplomacy") {
    title = "Diplomatic report";
    direct = `${state.activeDiplomacy.length} actions are active across ${state.actors.length} foreign actors. Dependency is ${state.dependency.toFixed(0)} and intelligence is ${state.intelligence.toFixed(0)}.`;
    rows = state.actors.map((actor) => ({
      label: actor.name.toUpperCase(),
      value: `TRUST ${actor.trust.toFixed(0)} · LEVERAGE ${actor.leverage.toFixed(0)} · RISK ${Math.round(actor.betrayalRisk * 100)}%`,
      conceptId: "diplomatic-trust",
    }));
    recommendation =
      "Select the actor first, then choose the action whose dependency or exposure tradeoff you are willing to own.";
    links = [
      { id: "diplomatic-trust", label: "Trust" },
      { id: "foreign-leverage", label: "Leverage" },
      { id: "betrayal-pressure", label: "Betrayal pressure" },
    ];
  }
  if (topic === "doctrine") {
    title = "Doctrine report";
    direct = `${state.doctrine} Insight Points are available from ${state.doctrineWinAwards.length} verified wins; ${state.unlocked.length} principles are internalized.`;
    rows = [
      {
        label: "AVAILABLE INSIGHT",
        value: String(state.doctrine),
        conceptId: "verified-win",
      },
      {
        label: "LIFETIME EARNED",
        value: String(state.doctrineEarned),
        conceptId: "verified-win",
      },
      {
        label: "VERIFIED WINS",
        value: String(state.doctrineWinAwards.length),
        conceptId: "execution-confidence",
      },
      {
        label: "INTERNALIZED",
        value: String(state.unlocked.length),
        conceptId: "execution-confidence",
      },
    ];
    recommendation =
      "Internalize only a principle whose stated field effect addresses a current bottleneck.";
  }
  return {
    topic,
    title,
    direct,
    flavor: flavor(state, topic),
    calculation: {
      equation: "current command position + live disclosed projections",
      rows,
    },
    history: historyLayer(state, history, 5, [
      `${observed(state, 5)} enemy orders are preserved as cumulative observed intelligence.`,
    ]),
    recommendation,
    links,
    commands: commonCommands,
  };
}

function adviceReport(state: GameState): AvaReportCard {
  const operation = projectOperations(state),
    production = projectProduction(state),
    domestic = projectDomestic(state),
    force = projectForceGeneration(state),
    personnel = estimateDay(state),
    situation = situationForState(state);
  const terminalPrimary =
    state.status !== "active"
      ? {
          score: Number.POSITIVE_INFINITY,
          priority: -2,
          label: `Review the ${state.status}`,
          reason: `This campaign is ${state.status}; no further daily order can alter the closed record.`,
          command: "retrospective",
          link: "campaign-synopsis",
        }
      : state.actions === 0
        ? {
            score: Number.POSITIVE_INFINITY,
            priority: -1,
            label: "Resolve the day",
            reason: `All ${DAILY_ORDERS} orders are issued; further command input cannot change this day.`,
            command: "projection",
            link: "resolution",
          }
        : null;
  const candidates = [
    {
      score: !state.maneuver && state.actions > 0 ? 110 : 0,
      priority: 1,
      label: `Decide ${situation.sector}`,
      reason: `The Main Campaign problem is still uncommitted and asks: ${situation.question}`,
      command: "open campaign",
      link: "campaign-synopsis",
    },
    {
      score:
        production.shortages * 22 +
        Math.max(0, 3 - coverage(state, "munitions")) * 8,
      priority: 2,
      label: "Protect the shortest production line",
      reason: `${production.shortages} critical line${production.shortages === 1 ? "" : "s"}; munitions coverage is ${coverage(state, "munitions").toFixed(1)} days.`,
      command: "report production",
      link: "production-coverage",
    },
    {
      score: domestic.collapseRisk * 100 + domestic.strikeRisk * 45,
      priority: 3,
      label: "Stabilize the domestic front",
      reason: `Collapse risk ${Math.round(domestic.collapseRisk * 100)}%; strike risk ${Math.round(domestic.strikeRisk * 100)}%.`,
      command: "domestic report",
      link: "legitimacy",
    },
    {
      score:
        personnel.netDesertion > force.effectiveGraduates
          ? 42 + (personnel.netDesertion - force.effectiveGraduates) / 1000
          : 0,
      priority: 4,
      label: "Close the personnel leak",
      reason: `${fmt(personnel.netDesertion, true)} projected net flight exceeds ${fmt(force.effectiveGraduates, true)} effective graduates.`,
      command: "report losses over the last 5 days",
      link: "desertion-pressure",
    },
    {
      score:
        operation.forceRatio < 0.9 ? 36 + (1 - operation.forceRatio) * 40 : 0,
      priority: 5,
      label: "Change the local exchange",
      reason: `Literal local force ratio is ${operation.forceRatio.toFixed(2)}; bounded attrition calculus is ${operation.boundedForceRatio.toFixed(2)}.`,
      command: `forecast ${situation.maneuvers[0] ?? ""}`.trim(),
      link: "force-ratio",
    },
  ].sort((a, b) => b.score - a.score || a.priority - b.priority);
  const primary = terminalPrimary ?? candidates[0],
    history = recent(state, 11),
    daysSpent = state.resolutionHistory.length;
  return {
    topic: "overview",
    title: "Ava / command recommendation",
    direct: `Do this next: ${primary.label}.`,
    flavor: `${flavor(state, "overview")} The recommendation is derivative, not decisive.`,
    calculation: {
      equation:
        "urgency = unresolved command + shortage + state risk + personnel replacement gap + local-force disadvantage",
      rows: [
        {
          label: "PRIMARY REASON",
          value: primary.reason,
          conceptId: primary.link,
        },
        {
          label: "ORDERS REMAINING",
          value: String(state.actions),
          conceptId: "actions",
        },
        {
          label: "LOCAL FORCE RATIO",
          value: operation.forceRatio.toFixed(2),
          tone: operation.forceRatio >= 1 ? "gain" : "loss",
          conceptId: "force-ratio",
        },
        {
          label: "MUNITIONS COVERAGE",
          value: `${coverage(state, "munitions").toFixed(1)} DAYS`,
          tone: coverage(state, "munitions") < 2 ? "loss" : "neutral",
          conceptId: "production-coverage",
        },
        {
          label: "NET FLIGHT / GRADUATES",
          value: `${fmt(personnel.netDesertion, true)} / ${fmt(force.effectiveGraduates, true)}`,
          tone:
            personnel.netDesertion > force.effectiveGraduates ? "loss" : "gain",
          conceptId: "desertion-pressure",
        },
        {
          label: "DOMESTIC COLLAPSE RISK",
          value: `${Math.round(domestic.collapseRisk * 100)}%`,
          tone: domestic.collapseRisk > 0.2 ? "loss" : "neutral",
          conceptId: "legitimacy",
        },
      ],
    },
    history: historyLayer(
      state,
      history,
      Math.min(11, Math.max(1, daysSpent)),
      [
        `${daysSpent} days have been resolved in this campaign.`,
        `${observed(state)} enemy orders have been cumulatively observed rather than inferred.`,
      ],
    ),
    recommendation: `${primary.reason} Use “${primary.command}” to inspect the causal ledger. I will not issue it without your separate confirmation.`,
    links: [
      { id: primary.link, label: primary.label },
      { id: "campaign-synopsis", label: "Current problem" },
      { id: "resolution", label: "Resolution order" },
    ],
    commands: [
      primary.command,
      "orders",
      "projection",
      "report losses over the last 5 days",
      "report production",
      "domestic report",
    ],
  };
}

export function buildAvaReport(
  instruction: ReportInstruction,
  state: GameState,
): AvaReportCard {
  if (instruction.kind === "ADVISE") return adviceReport(state);
  const requested = instruction.days ?? 5;
  if (instruction.topic === "daily-brief") return dailyBriefReport(state);
  if (instruction.topic === "operations")
    return operationsReport(state, requested);
  if (instruction.topic === "losses") return lossesReport(state, requested);
  if (instruction.topic === "personnel")
    return personnelReport(state, requested);
  if (instruction.topic === "retrospective")
    return retrospectiveReport(state, requested);
  if (instruction.topic === "production")
    return productionReport(state, requested);
  if (instruction.topic === "resources")
    return resourcesReport(state, requested);
  if (instruction.topic === "projection") return projectionReport(state);
  if (instruction.topic === "domestic") return domesticReport(state, requested);
  if (instruction.topic === "network") return networkReport(state, requested);
  if (instruction.topic === "intelligence")
    return intelligenceReport(state, requested);
  if (instruction.topic === "adversary")
    return adversaryReport(state, requested);
  if (instruction.topic === "effects") return effectsReport(state, requested);
  if (instruction.topic === "opportunities")
    return opportunitiesReport(state, requested);
  if (instruction.topic === "decision-ledger")
    return decisionLedgerReport(state, requested);
  if (instruction.topic === "service-record")
    return serviceRecordReport(state, requested);
  return overviewReport(state, instruction.topic);
}
