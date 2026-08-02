import {
  projectProduction,
  situationForState,
  type GameState,
} from "../game";
import {
  enumerateAvaActions,
  executeAvaAction,
} from "./runtime";
import type {
  AvaActionDescriptor,
  AvaAnswerPlan,
  AvaDiscourseState,
  AvaEvaluationCriterion,
  AvaSemanticQuery,
} from "./schema";
import { projectAvaEnvelope } from "./projection";
import {
  buildAdvisoryProofGraph,
  type CanonicalProofGraph,
} from "./proof-graph";
import type { AvaCognitiveDecisionGuidance } from "./cognitive-nexus";
import { canonicalJson } from "./cognitive-types";
import { avaVisibleWorldRevision } from "./world-model";
import { narratedCampaignRecommendation } from "./campaign-narrative";
import {
  formatPublicRating,
  publicCognitiveRating,
  publicOpportunityRating,
} from "./public-rating";

export type AvaEvaluatedAction = {
  descriptor: AvaActionDescriptor;
  score: number;
  risk: number;
  production: number;
  pressure: number;
  stockCost: number;
  facts: string[];
};

const clamp = (value: number, minimum = 0, maximum = 100) =>
  Math.max(minimum, Math.min(maximum, value));

const stateWithOverlays = (
  state: GameState,
  query: AvaSemanticQuery,
): GameState =>
  query.overlays.reduce((current, overlay) => {
    if (overlay.kind !== "ASSUME_STATE") return current;
    const value = Number(overlay.value);
    if (!Number.isFinite(value)) return current;
    const target = overlay.target.toLowerCase();
    if (target === "readiness")
      return {
        ...current,
        readiness: /full readiness/i.test(overlay.sourceText)
          ? 100
          : clamp(current.readiness + value),
      };
    if (target === "materiel")
      return { ...current, materiel: clamp(current.materiel + value) };
    if (target === "equipment")
      return { ...current, equipment: clamp(current.equipment + value) };
    if (target === "intelligence")
      return { ...current, intelligence: clamp(current.intelligence + value) };
    if (target === "treasury")
      return { ...current, treasury: Math.max(0, current.treasury + value) };
    if (target === "reserves")
      return { ...current, reserves: Math.max(0, current.reserves + value) };
    if (target in current.production) {
      const resource = target as keyof GameState["production"];
      return {
        ...current,
        production: {
          ...current.production,
          [resource]: {
            ...current.production[resource],
            stock: Math.max(0, current.production[resource].stock + value),
          },
        },
      };
    }
    return current;
  }, state);

const domainName = (domain?: AvaActionDescriptor["domain"]) =>
  domain === "main"
    ? "Main"
    : domain === "domestic"
      ? "Domestic"
      : domain === "network"
        ? "Network"
        : "Command";

const canonicalStockCost = (
  before: GameState,
  after: GameState,
) => {
  const beforeProjection = projectProduction(before);
  const afterProjection = projectProduction(after);
  const immediate = Object.keys(before.production).reduce((total, key) => {
    const resource = key as keyof GameState["production"];
    return (
      total +
      Math.max(
        0,
        before.production[resource].stock -
          after.production[resource].stock,
      )
    );
  }, 0);
  const addedDailyDemand = afterProjection.lines.reduce((total, line) => {
    const previous =
      beforeProjection.lines.find(
        (candidate) => candidate.resource === line.resource,
      )?.requestedUse ?? 0;
    return total + Math.max(0, line.requestedUse - previous);
  }, 0);
  return immediate + addedDailyDemand;
};

const criterionLabel = (criterion: AvaEvaluationCriterion) =>
  (
    {
      OVERALL_VALUE: "overall command value",
      LOWEST_RISK: "personnel risk",
      HIGHEST_UPSIDE: "upside",
      LOWEST_MATERIEL_COST: "materiel cost",
      PRODUCTION: "industrial continuity",
      FRONT: "frontline effect",
      LONG_TERM: "long-term position",
      IMMEDIATE: "immediate effect",
      REVERSIBILITY: "reversibility",
      SUSTAINABILITY: "sustainability",
      STRONGEST: "operational strength",
      CHEAPEST: "disclosed cost",
    } satisfies Record<AvaEvaluationCriterion, string>
  )[criterion];

const naturalList = (values: readonly string[]) =>
  values.length < 2
    ? (values[0] ?? "")
    : values.length === 2
      ? `${values[0]} and ${values[1]}`
      : `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;

const scoreFor = (
  criterion: AvaEvaluationCriterion,
  values: Omit<AvaEvaluatedAction, "descriptor" | "score" | "facts">,
) => {
  switch (criterion) {
    case "LOWEST_RISK":
      return -values.risk;
    case "LOWEST_MATERIEL_COST":
    case "CHEAPEST":
      return -values.stockCost;
    case "PRODUCTION":
      return values.production;
    case "FRONT":
    case "STRONGEST":
      return values.pressure;
    case "REVERSIBILITY":
      return -values.stockCost - values.risk * 0.25;
    case "LONG_TERM":
    case "SUSTAINABILITY":
      return values.production * 0.7 + values.pressure * 0.35 - values.risk * 0.6;
    case "HIGHEST_UPSIDE":
      return values.pressure + values.production * 0.25;
    case "IMMEDIATE":
      return values.pressure * 0.7 - values.stockCost * 0.0004;
    case "OVERALL_VALUE":
    default:
      return (
        values.pressure * 0.5 +
        values.production * 0.35 -
        values.risk * 0.55 -
        values.stockCost * 0.00025
      );
  }
};

const evaluate = (
  state: GameState,
  descriptor: AvaActionDescriptor,
  criterion: AvaEvaluationCriterion,
  query: AvaSemanticQuery,
  opportunityFraction: number,
): AvaEvaluatedAction => {
  const preview = executeAvaAction(
    state,
    descriptor.action,
    opportunityFraction,
  );
  const projectedState = preview.executed ? preview.state : state;
  const projection = projectAvaEnvelope(projectedState);
  const totalProduction = projection.production.lines.reduce(
    (sum, line) => sum + line.net,
    0,
  );
  const risk =
    projection.personnel.casualty / 450 +
    projection.personnel.netDesertion / 300 +
    projection.domestic.collapseRisk * 30 +
    descriptor.contingent.length * 1.75;
  const pressure =
    projection.groundMovement * 22 +
    projection.forceRatio * 14 +
    projectedState.readiness * 0.08 +
    projectedState.intelligence * 0.04;
  const withoutProduction =
    query.overlays.some(
      (overlay) =>
        overlay.kind === "WITHOUT_EFFECT" &&
        /production|industrial|materiel/.test(overlay.target),
    ) &&
    query.subject.entityIds.includes(descriptor.id);
  const productionValue = withoutProduction
    ? 0
    : totalProduction / 400 +
      projection.production.materielChange * 8 -
      projection.production.shortages * 5;
  const stockCost = canonicalStockCost(state, projectedState);
  const values = {
    risk,
    production: productionValue,
    pressure,
    stockCost,
  };
  return {
    descriptor,
    ...values,
    score: scoreFor(criterion, values),
    facts: [
      `${domainName(descriptor.domain)} option: ${descriptor.label}.`,
      descriptor.summary,
      ...descriptor.owned.slice(0, 2),
      ...descriptor.contingent.slice(0, 1),
      projection.disclosure,
    ],
  };
};

export const evaluateAvaCampaignChoices = (
  state: GameState,
  query: AvaSemanticQuery,
  opportunityFraction = 0,
) => {
  const hypotheticalState = stateWithOverlays(state, query);
  const criterion = query.criteria[0] ?? "OVERALL_VALUE";
  return campaignCandidates(
    hypotheticalState,
    query,
    opportunityFraction,
  )
    .map((candidate) =>
      evaluate(
        hypotheticalState,
        candidate,
        criterion,
        query,
        opportunityFraction,
      ),
    )
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.descriptor.handle.localeCompare(right.descriptor.handle),
    );
};

const candidateDomains = (query: AvaSemanticQuery) =>
  new Set(
    query.scope.domains.map((domain) =>
      domain === "MAIN"
        ? "main"
        : domain === "DOMESTIC"
          ? "domestic"
          : "network",
    ),
  );

const campaignCandidates = (
  state: GameState,
  query: AvaSemanticQuery,
  opportunityFraction: number,
) => {
  const domains = candidateDomains(query);
  const removedDomains = new Set(
    query.overlays.flatMap((overlay) =>
      overlay.kind === "REMOVE_ENTITY" &&
      /^(main|domestic|network)$/.test(overlay.target)
        ? [overlay.target]
        : [],
    ),
  );
  const actions = enumerateAvaActions(state, opportunityFraction).filter(
    (action) => {
      if (!action.available) return false;
      const explicitlyNamed = query.subject.entityIds.some(
        (id) => action.id === id || action.id.includes(id),
      );
      if (explicitlyNamed) return true;
      return (
        !!action.domain &&
        !removedDomains.has(action.domain) &&
        (!domains.size || domains.has(action.domain))
      );
    },
  );
  if (!query.subject.entityIds.length) return actions;
  const explicit = actions.filter(
    (action) =>
      query.subject.entityIds.includes(action.id) ||
      query.subject.entityIds.some((id) => action.id.includes(id)),
  );
  return explicit.length ? explicit : actions;
};

const reasonFor = (
  criterion: AvaEvaluationCriterion,
  best: AvaEvaluatedAction,
  second?: AvaEvaluatedAction,
) => {
  const contrast = second
    ? ` than ${second.descriptor.label}`
    : " in the active docket";
  switch (criterion) {
    case "LOWEST_RISK":
      return `It exposes less of the force to immediate and contingent loss${contrast}.`;
    case "LOWEST_MATERIEL_COST":
    case "CHEAPEST":
      return `It preserves more disclosed stock${contrast}.`;
    case "PRODUCTION":
      return `It leaves the stronger industrial position after the order${contrast}.`;
    case "FRONT":
    case "STRONGEST":
      return `It converts the current position into more battlefield pressure${contrast}.`;
    case "LONG_TERM":
    case "SUSTAINABILITY":
      return `It preserves the best balance between industrial continuity, force exposure, and pressure${contrast}.`;
    case "REVERSIBILITY":
      return `It commits less that cannot be recovered on the next order${contrast}.`;
    case "HIGHEST_UPSIDE":
      return `It has the strongest favorable outcome without requiring a hidden premise${contrast}.`;
    case "IMMEDIATE":
      return `It changes the current day more decisively${contrast}.`;
    case "OVERALL_VALUE":
    default:
      return `Its consequences fit the present position better${contrast}.`;
  }
};

const narrativeFamilies = {
  choice: [
    "A choice is not intelligent because it contains more arithmetic. It is intelligent when the arithmetic leaves only one honest sacrifice.",
    "The position does not need another description. It needs the distinction that changes the order.",
    "Every available course spends something. The useful question is whether it spends what can be replaced.",
    "Command becomes legible at the moment two tolerable options stop being equivalent.",
    "The docket is small. Its consequences are not.",
  ],
  correction: [
    "A corrected premise is not an embarrassment. An uncorrected order is.",
    "Then the distinction was mine to repair before it became yours to pay for.",
    "Language failed at the boundary. The ledger has not moved.",
  ],
  refusal: [
    "Advice withheld is still a command condition. Silence should be deliberate.",
    "A recommendation can be removed without removing the consequences.",
    "I will preserve the options and withhold the judgment.",
  ],
  objective: [
    "An objective is the part of an order that survives contact with its phrasing.",
    "The mission may contain secondary effects. It still has only one governing purpose.",
    "A force can perform many actions and still fail the one verb that mattered.",
  ],
} as const;

const chooseNarrative = (
  family: keyof typeof narrativeFamilies,
  discourse: AvaDiscourseState,
  day: number,
) => {
  const lines = narrativeFamilies[family];
  const used = new Set(
    discourse.realizationHistory.filter((entry) =>
      entry.startsWith(`${family}:`),
    ),
  );
  for (let offset = 0; offset < lines.length; offset += 1) {
    const index = (day + discourse.realizationHistory.length + offset) % lines.length;
    const key = `${family}:${index}`;
    if (!used.has(key)) return { key, line: lines[index] };
  }
  const index = (day + discourse.realizationHistory.length) % lines.length;
  return { key: `${family}:${index}`, line: lines[index] };
};

const formatOption = (action: AvaActionDescriptor) =>
  `[${action.handle}] ${action.label}`;

export type AvaSemanticAnswer = {
  text: string;
  answerPlan: AvaAnswerPlan;
  discourse: AvaDiscourseState;
  retrievedFacts: string[];
  proofGraph: CanonicalProofGraph;
};

const planBase = (
  state: GameState,
  answerType: AvaAnswerPlan["answerType"],
  structureId: string,
): AvaAnswerPlan => ({
  answerType,
  rankedOptions: [],
  decisiveReasons: [],
  tradeoffs: [],
  cautions: [],
  assumptions: [],
  alternatives: [],
  calculationDisclosure: "NONE",
  stateRevision: avaVisibleWorldRevision(state),
  structureId,
  clauseIds: [],
});

const answerSemanticQueryUnproven = (
  state: GameState,
  query: AvaSemanticQuery,
  discourse: AvaDiscourseState,
  opportunityFraction = 0,
  cognitiveGuidance?: AvaCognitiveDecisionGuidance,
  interaction: "open-ended" | "explicit" = "explicit",
): Omit<AvaSemanticAnswer, "proofGraph"> => {
  const situation = situationForState(state);
  if (query.polarity === "NEGATED" && query.operation === "CORRECT") {
    const narrative = chooseNarrative("refusal", discourse, state.day);
    const plan = planBase(state, "CORRECTION", "withhold-judgment");
    plan.directAnswer =
      "I will not recommend among the current Domestic and Network operations.";
    plan.clauseIds = [narrative.key, "withhold-secondary-advice"];
    return {
      text: `FIELD NOTE / CORRECTION\n${narrative.line}\n\nANSWER\n${plan.directAnswer}\n\nOPTIONS\nThe active choices remain available through: missions`,
      answerPlan: plan,
      retrievedFacts: ["Advice suppression applies to Domestic and Network."],
      discourse: {
        ...discourse,
        previousCorrection: "Withhold secondary advice.",
        suppressedAdviceScopes: ["DOMESTIC", "NETWORK"],
        realizationHistory: [...discourse.realizationHistory, narrative.key],
      },
    };
  }

  if (query.subject.type === "MISSION_OBJECTIVE") {
    const narrative = chooseNarrative("objective", discourse, state.day);
    const plan = planBase(state, "EXPLANATION", "objective-first");
    plan.directAnswer = situation.question;
    plan.decisiveReasons = [
      `${situation.headline}.`,
      situation.briefing,
    ];
    plan.clauseIds = [narrative.key, "main-objective", "objective-distinction"];
    return {
      text: `FIELD NOTE / OBJECTIVE\n${narrative.line}\n\nANSWER\nThe Main mission asks: ${situation.question}\n\nDISTINCTION\n“Secondary” modifies objective in your sentence. It does not invoke the Domestic and Network campaign scope.`,
      answerPlan: plan,
      retrievedFacts: plan.decisiveReasons,
      discourse: {
        ...discourse,
        lastSubject: "MISSION_OBJECTIVE",
        lastScope: ["MAIN"],
        realizationHistory: [...discourse.realizationHistory, narrative.key],
      },
    };
  }

  if (
    query.operation === "CHALLENGE" &&
    query.subject.type === "METRIC"
  ) {
    const narrative = chooseNarrative("objective", discourse, state.day);
    const plan = planBase(state, "EXPLANATION", "forbidden-equivalence");
    plan.directAnswer =
      "No. Production is not secondary to Military Readiness. They are related systems with separate state and separate controls.";
    plan.decisiveReasons = [
      "Production supplies and repairs the force.",
      "Readiness measures the force's present ability to act.",
    ];
    plan.clauseIds = [narrative.key, "production-readiness-separation"];
    return {
      text: `FIELD NOTE / DISTINCTION\n${narrative.line}\n\nANSWER\n${plan.directAnswer}\n\nRELATION\nProduction can raise or constrain Readiness without becoming a subordinate name for it.`,
      answerPlan: plan,
      retrievedFacts: plan.decisiveReasons,
      discourse: {
        ...discourse,
        lastSubject: "METRIC",
        lastMetric: query.metric,
        realizationHistory: [...discourse.realizationHistory, narrative.key],
      },
    };
  }

  const suppressed = query.scope.domains.filter((domain) =>
    discourse.suppressedAdviceScopes.includes(domain),
  );
  if (
    ["ADVISE", "RANK", "RECOMMEND"].includes(query.operation) &&
    suppressed.length &&
    suppressed.length === query.scope.domains.length
  ) {
    const narrative = chooseNarrative("refusal", discourse, state.day);
    const plan = planBase(state, "CORRECTION", "preserve-advice-suppression");
    plan.directAnswer =
      "You previously told me to withhold advice in this scope. I will preserve that correction until you revoke it.";
    plan.clauseIds = [narrative.key, "preserve-advice-suppression"];
    return {
      text: `FIELD NOTE / CORRECTION\n${narrative.line}\n\nANSWER\n${plan.directAnswer}\n\nOPTIONS\nI can still list or compare the active docket without choosing for you.`,
      answerPlan: plan,
      retrievedFacts: [
        `Suppressed advice scope: ${suppressed.join(", ")}.`,
      ],
      discourse: {
        ...discourse,
        realizationHistory: [...discourse.realizationHistory, narrative.key],
      },
    };
  }

  const unresolvedSequence = query.overlays.find(
    (overlay) =>
      overlay.kind === "ASSUME_ACTION" &&
      overlay.target === "main" &&
      !query.subject.entityIds.length,
  );
  if (unresolvedSequence) {
    const narrative = chooseNarrative("choice", discourse, state.day);
    const plan = planBase(
      state,
      "PARTIAL_UNDERSTANDING",
      "hypothetical-action-unresolved",
    );
    plan.directAnswer =
      "I understand the sequence—Main first—but the Main docket contains several maneuvers. Name the maneuver whose consequences should become the temporary starting state.";
    plan.assumptions = [
      `Compiled assumption: ${unresolvedSequence.sourceText}.`,
    ];
    plan.clauseIds = [narrative.key, "hypothetical-action-unresolved"];
    return {
      text: `FIELD NOTE / ASSUMPTION\n${narrative.line}\n\nANSWER\n${plan.directAnswer}`,
      answerPlan: plan,
      retrievedFacts: [],
      discourse: {
        ...discourse,
        unresolvedAmbiguity: "Main maneuver for hypothetical sequence",
        realizationHistory: [...discourse.realizationHistory, narrative.key],
      },
    };
  }

  const hypotheticalState = stateWithOverlays(state, query);
  let candidates = campaignCandidates(
    hypotheticalState,
    query,
    opportunityFraction,
  );
  if (
    query.reference?.type === "OTHER_ENTITY" &&
    discourse.lastRecommended
  ) {
    const alternatives = candidates.filter(
      (candidate) => candidate.id !== discourse.lastRecommended,
    );
    if (alternatives.length) candidates = alternatives;
  }
  if (!candidates.length) {
    const narrative = chooseNarrative("choice", discourse, state.day);
    const plan = planBase(state, "PARTIAL_UNDERSTANDING", "no-legal-option");
    plan.directAnswer =
      "No legal option exists in the requested scope on the current docket.";
    plan.cautions = [
      "An inactive alternate track is not silently reconstructed.",
    ];
    plan.clauseIds = [narrative.key, "no-legal-option"];
    return {
      text: `FIELD NOTE / SCOPE\n${narrative.line}\n\nANSWER\n${plan.directAnswer}\n\nBOUNDARY\nI will not invent an absent Domestic or Network operation.`,
      answerPlan: plan,
      retrievedFacts: [],
      discourse: {
        ...discourse,
        lastSubject: query.subject.type,
        lastScope: query.scope.domains,
        realizationHistory: [...discourse.realizationHistory, narrative.key],
      },
    };
  }

  if (query.quantity?.kind === "ORDINAL") {
    const ordered = [...candidates].sort((left, right) =>
      left.handle.localeCompare(right.handle, undefined, { numeric: true }),
    );
    const selected = ordered[query.quantity.value - 1];
    const narrative = chooseNarrative("choice", discourse, state.day);
    const plan = planBase(state, "DIRECT_JUDGMENT", "ordinal-inspection");
    plan.directAnswer = selected
      ? formatOption(selected)
      : `There are only ${ordered.length} active choices.`;
    plan.rankedOptions = selected ? [selected.id] : [];
    plan.clauseIds = [narrative.key, "ordinal-selection"];
    return {
      text: `FIELD NOTE / INSPECTION\n${narrative.line}\n\nANSWER\n${plan.directAnswer}${selected ? `\n${selected.summary}` : ""}`,
      answerPlan: plan,
      retrievedFacts: selected ? [selected.summary, ...selected.owned] : [],
      discourse: {
        ...discourse,
        lastSubject: "CAMPAIGN_CHOICE",
        lastEntities: ordered.map((action) => action.id),
        lastRecommended: selected?.id,
        lastScope: query.scope.domains,
        realizationHistory: [...discourse.realizationHistory, narrative.key],
      },
    };
  }

  if (query.operation === "LIST" || query.operation === "INSPECT") {
    const narrative = chooseNarrative("choice", discourse, state.day);
    const plan = planBase(state, "DIRECT_JUDGMENT", "docket-list");
    plan.rankedOptions = candidates.map((candidate) => candidate.id);
    plan.directAnswer = `${candidates.length} active choice${candidates.length === 1 ? "" : "s"} in the requested scope.`;
    plan.clauseIds = [narrative.key, "docket-list"];
    return {
      text: `FIELD NOTE / DOCKET\n${narrative.line}\n\nANSWER\n${plan.directAnswer}\n\nOPTIONS\n${candidates
        .map(
          (candidate) =>
            `${formatOption(candidate)}\n${candidate.summary}`,
        )
        .join("\n\n")}`,
      answerPlan: plan,
      retrievedFacts: candidates.flatMap((candidate) => [
        candidate.summary,
        ...candidate.owned,
      ]),
      discourse: {
        ...discourse,
        lastSubject: "CAMPAIGN_CHOICE",
        lastEntities: candidates.map((candidate) => candidate.id),
        lastScope: query.scope.domains,
        realizationHistory: [...discourse.realizationHistory, narrative.key],
      },
    };
  }

  const criterion = query.criteria[0] ?? "OVERALL_VALUE";
  const calculated = candidates.map((candidate) =>
      evaluate(
        hypotheticalState,
        candidate,
        criterion,
        query,
        opportunityFraction,
      ),
    );
  let evaluated = [...calculated].sort(
    (left, right) =>
      right.score - left.score ||
      left.descriptor.handle.localeCompare(right.descriptor.handle),
  );
  if (cognitiveGuidance) {
    const decision = cognitiveGuidance.decision;
    const expectedKind =
      query.operation === "COMPARE"
        ? "COMPARE"
        : query.operation === "RANK"
          ? "RANK"
          : "OPTIMIZE";
    const candidateIds = calculated.map((entry) => entry.descriptor.id).sort();
    if (
      decision.kind !== expectedKind ||
      decision.worldRevision !== avaVisibleWorldRevision(state) ||
      decision.ranking.length !== candidateIds.length ||
      canonicalJson([...decision.ranking].sort()) !== canonicalJson(candidateIds)
    )
      throw new Error("cognitive decision does not cover the realized advisory docket");
    const byId = new Map(
      calculated.map((entry) => [entry.descriptor.id, entry]),
    );
    evaluated = decision.ranking.map((id) => byId.get(id)!);
  }
  const best = evaluated[0];
  const second = evaluated[1];
  const cognitiveWinner = cognitiveGuidance?.decision.candidates.find(
    (candidate) => candidate.candidateId === best.descriptor.id,
  );
  const cognitiveRunnerUp = second
    ? cognitiveGuidance?.decision.candidates.find(
        (candidate) => candidate.candidateId === second.descriptor.id,
      )
    : undefined;
  const cognitiveStrengths =
    cognitiveWinner && cognitiveRunnerUp
      ? cognitiveWinner.metrics
          .filter((metric) => {
            const other = cognitiveRunnerUp.metrics.find(
              (candidate) => candidate.metricId === metric.metricId,
            );
            return !!other && metric.normalized.low >= other.normalized.low;
          })
          .map((metric) => metric.metricId)
      : [];
  const reason = cognitiveGuidance
    ? `The compiled ${cognitiveGuidance.decision.modelId} model gives it the strongest robust balance${
        cognitiveStrengths.length
          ? ` in ${naturalList(cognitiveStrengths)}`
          : " across the retained objectives"
      }.`
    : reasonFor(criterion, best, second);
  const narrative = chooseNarrative(
    query.operation === "CORRECT" ? "correction" : "choice",
    discourse,
    state.day,
  );
  const answerType =
    query.operation === "CORRECT"
      ? "CORRECTION"
      : second
        ? "COMPARATIVE_RECOMMENDATION"
        : "DIRECT_JUDGMENT";
  const structureIndex =
    (state.day + discourse.realizationHistory.length) % 3;
  const structureId = [
    "answer-contrast",
    "distinction-answer",
    "elimination-answer",
  ][structureIndex];
  const plan = planBase(state, answerType, structureId);
  plan.directAnswer = formatOption(best.descriptor);
  plan.rankedOptions = evaluated.map((entry) => entry.descriptor.id);
  plan.decisiveReasons = [reason];
  const cognitiveConcessions =
    cognitiveWinner && cognitiveRunnerUp
      ? cognitiveWinner.metrics
          .filter((metric) => {
            const other = cognitiveRunnerUp.metrics.find(
              (candidate) => candidate.metricId === metric.metricId,
            );
            return !!other && metric.normalized.high < other.normalized.high;
          })
          .map(
            (metric) =>
              `It concedes ${metric.metricId} to ${second?.descriptor.label ?? "the next course"}.`,
          )
      : [];
  plan.tradeoffs = cognitiveGuidance
    ? cognitiveConcessions.slice(0, 2)
    : best.descriptor.contingent.slice(0, 2);
  plan.cautions = best.descriptor.contingent.slice(0, 1);
  plan.assumptions = query.overlays.map(
    (overlay) => `Assumption applied: ${overlay.sourceText}.`,
  );
  plan.alternatives = second
    ? [{ criterion: criterionLabel(criterion), optionId: second.descriptor.id }]
    : [];
  plan.calculationDisclosure =
    query.requestedDetail === "CALCULUS" ? "FULL" : "NONE";
  plan.clauseIds = [
    narrative.key,
    `criterion:${criterion}`,
    `structure:${structureId}`,
  ];

  const direct = `Take ${formatOption(best.descriptor)}.`;
  const ratingFor = (entry: AvaEvaluatedAction) => {
    const candidate = cognitiveGuidance?.decision.candidates.find(
      (item) => item.candidateId === entry.descriptor.id,
    );
    return formatPublicRating(
      candidate
        ? publicCognitiveRating(candidate.utility.low, candidate.utility.high)
        : publicOpportunityRating(entry.score),
    );
  };
  const publicRating = ratingFor(best);
  const alternativeRating = second
    ? ratingFor(second)
    : null;
  const tradeoff =
    plan.tradeoffs[0] ??
    "Its principal cost is the opportunity to issue a different order.";
  const alternative = second
    ? `${formatOption(second.descriptor)} becomes preferable if you value a different sacrifice more than ${criterionLabel(criterion)}.`
    : "No second legal option exists in the requested scope.";
  const parts =
    structureIndex === 0
      ? [
          `ANSWER\n${direct}\nRATING ${publicRating}`,
          `WHY\n${reason}`,
          `TRADEOFF\n${tradeoff}`,
          `ALTERNATIVE\n${alternative}`,
        ]
      : structureIndex === 1
        ? [
            `DISTINCTION\nThe decisive criterion is ${criterionLabel(criterion)}.`,
            `ANSWER\n${direct}\nRATING ${publicRating}`,
            `WHY\n${reason}`,
            `TRADEOFF\n${tradeoff}`,
          ]
        : [
            `ELIMINATION\n${second ? `${formatOption(second.descriptor)} loses the comparison under ${criterionLabel(criterion)}.` : "There is no second legal course to eliminate."}`,
            `ANSWER\n${direct}\nRATING ${publicRating}`,
            `WHY\n${reason}`,
            `TRADEOFF\n${tradeoff}`,
          ];
  if (query.operation === "COMPARE")
    parts.unshift(
      "COMPARISON / COGNITIVE NEXUS",
      `FULL RANKING\n${evaluated
        .map(
          (entry, index) =>
            `${index + 1}. ${formatOption(entry.descriptor)} · ${ratingFor(entry)}`,
        )
        .join("\n")}`,
      `OPPORTUNITY COSTS\n${evaluated
        .map(
          (entry) =>
            `${formatOption(entry.descriptor)} · ${entry.descriptor.contingent[0] ?? "Consumes the opportunity to issue a different order."}`,
        )
        .join("\n")}`,
    );
  if (plan.assumptions.length)
    parts.push(`ASSUMPTION\n${plan.assumptions.join("\n")}`);
  if (plan.calculationDisclosure === "FULL")
    parts.push(
      `CALCULATION\nThe complete disclosed calculus is preserved in reports/current/command-dashboard.xlsx. Use: download reports/current/command-dashboard.xlsx`,
    );
  if (second && alternativeRating)
    parts.push(
      `ALTERNATIVE RATING\n${formatOption(second.descriptor)} · ${alternativeRating}`,
    );
  if (best.descriptor.action.kind === "maneuver")
    parts.push(
      `BATTLEFIELD RANGE\nCampaign orders own the largest direct movement conversion. A successful order can reverse standing attrition; an operational-collapse branch can be worse than accepting the standing loss for the day.`,
    );
  const mainCampaignNarrative =
    interaction === "open-ended" &&
    (query.operation === "ADVISE" || query.operation === "RECOMMEND") &&
    query.scope.domains.length === 1 &&
    query.scope.domains[0] === "MAIN";
  return {
    text: mainCampaignNarrative
      ? narratedCampaignRecommendation({
          state,
          candidates: evaluated.map((entry) => entry.descriptor),
          winner: best.descriptor,
          reason,
          tradeoff,
          ratings: Object.fromEntries(
            evaluated.map((entry) => [
              entry.descriptor.id,
              ratingFor(entry),
            ]),
          ),
          variant: discourse.realizationHistory.length,
        })
      : `FIELD NOTE / ${query.operation === "JUSTIFY" ? "JUSTIFICATION" : query.operation === "CORRECT" ? "CORRECTION" : "JUDGMENT"}\n${narrative.line}\n\n${parts.join("\n\n")}`,
    answerPlan: plan,
    retrievedFacts: best.facts,
    discourse: {
      ...discourse,
      lastSubject: "CAMPAIGN_CHOICE",
      lastEntities:
        query.operation === "JUSTIFY" && discourse.lastEntities.length
          ? discourse.lastEntities
          : evaluated.map((entry) => entry.descriptor.id),
      lastRecommended: best.descriptor.id,
      lastScope: query.scope.domains,
      lastTimeframe: query.timeframe,
      previousCorrection:
        query.operation === "CORRECT" ? query.sourceSpans.operation?.text : discourse.previousCorrection,
      realizationHistory: [
        ...discourse.realizationHistory,
        narrative.key,
        `structure:${structureId}`,
      ].slice(-40),
    },
  };
};

export const answerSemanticQuery = (
  state: GameState,
  query: AvaSemanticQuery,
  discourse: AvaDiscourseState,
  opportunityFraction = 0,
  cognitiveGuidance?: AvaCognitiveDecisionGuidance,
  interaction: "open-ended" | "explicit" = "explicit",
): AvaSemanticAnswer => {
  const answer = answerSemanticQueryUnproven(
    state,
    query,
    discourse,
    opportunityFraction,
    cognitiveGuidance,
    interaction,
  );
  return {
    ...answer,
    proofGraph: buildAdvisoryProofGraph({
      worldRevision: avaVisibleWorldRevision(state),
      semantic: query,
      answerPlan: answer.answerPlan,
      retrievedFacts: answer.retrievedFacts,
      ...(cognitiveGuidance
        ? {
            cognitiveDecision: {
              executionDigest: cognitiveGuidance.executionDigest,
              decisionDigest: cognitiveGuidance.decision.digest,
              winnerId: cognitiveGuidance.decision.winnerId!,
              ranking: cognitiveGuidance.decision.ranking,
            },
          }
        : {}),
    }),
  };
};
