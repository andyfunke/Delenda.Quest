import {
  DOCTRINES,
  FAMILIES,
  MANEUVERS,
  commit,
  commitManeuver,
  commitOpportunity,
  directiveRejection,
  doctrineStage,
  maneuverOrderRejection,
  opportunityResponseRejection,
  opportunityStatusForFraction,
  resolve,
  situationForState,
  unlockDoctrine,
  type GameState,
} from "../game";
import {
  commitConvergence,
  compileConvergence,
  convergenceOptionAvailable,
} from "../convergence";
import type {
  AvaActionDescriptor,
  AvaActionRef,
  AvaConfirmation,
  AvaPlan,
} from "./schema";

const hashInt = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const shortHash = (text: string) => hashInt(text).toString(16).padStart(8, "0");

export const avaStateRevision = (state: GameState) =>
  `D${state.day}-${shortHash(
    JSON.stringify({
      day: state.day,
      status: state.status,
      actions: state.actions,
      maneuver: state.maneuver,
      active: state.active,
      locks: state.locks,
      scheduled: state.scheduled,
      activeDiplomacy: state.activeDiplomacy,
      unlocked: state.unlocked,
      decisions: state.decisions,
      opportunityHistory: state.opportunityHistory,
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
      production: state.production,
      currentSituation: state.currentSituation,
      currentSubMissions: state.currentSubMissions,
    }),
  )}`;

const directiveDescriptor = (
  state: GameState,
  family: (typeof FAMILIES)[number],
  choice: (typeof family.choices)[number],
  index: number,
): AvaActionDescriptor => {
  const rejection = directiveRejection(state, family, choice);
  const moduleLabel =
    family.module === "national"
      ? "Production"
      : family.module === "military"
        ? "Military"
        : "Diplomacy";
  return {
    id: `directive:${family.id}:${choice.id}`,
    handle: `P${index + 1}`,
    label: choice.label,
    aliases: [choice.label, `${family.label} ${choice.label}`, choice.id],
    kind: "directive",
    action: { kind: "directive", familyId: family.id, choiceId: choice.id },
    parentLabel: `${moduleLabel} / ${family.category} / ${family.label}`,
    available: !rejection,
    rejection: rejection ?? undefined,
    orderCost: 1,
    owned: [...choice.exact],
    contingent: [...choice.risk],
    summary: choice.flavor,
  };
};

export const enumerateAvaActions = (
  state: GameState,
  opportunityFraction = 0,
): AvaActionDescriptor[] => {
  const situation = situationForState(state),
    packet = compileConvergence(state);
  const actions: AvaActionDescriptor[] = [];
  situation.maneuvers.forEach((id, index) => {
    const maneuver = MANEUVERS.find((item) => item.id === id);
    if (!maneuver) return;
    const rejection = maneuverOrderRejection(state, maneuver);
    actions.push({
      id: `maneuver:${id}`,
      handle: `M${index + 1}`,
      label: maneuver.label,
      aliases: [maneuver.label, maneuver.vector, id],
      kind: "maneuver",
      action: { kind: "maneuver", maneuverId: id },
      domain: "main",
      parentLabel: `Main Campaign / ${situation.sector}`,
      available: !rejection,
      rejection: rejection ?? undefined,
      orderCost: 1,
      owned: [...maneuver.exact],
      contingent: [...maneuver.risk],
      summary: maneuver.flavor,
    });
  });
  for (const [domain, prompt, prefix] of [
    ["domestic", packet.domestic, "D"],
    ["network", packet.network, "N"],
  ] as const)
    prompt.options.forEach((option, index) => {
      const rejection = directiveRejection(state, option.family, option.choice);
      actions.push({
        id: `sub-mission:${prompt.id}:${option.id}`,
        handle: `${prefix}${index + 1}`,
        label: option.choice.label,
        aliases: [
          option.choice.label,
          `${prompt.title} ${option.choice.label}`,
          ...prompt.aliases,
        ],
        kind: "sub-mission",
        action: {
          kind: "sub-mission",
          domain,
          missionId: prompt.id,
          optionId: option.id,
          resolutionTicket: prompt.resolutionTicket,
        },
        domain,
        parentLabel: `${domain === "domestic" ? "Domestic Front" : "Command Network"} / ${prompt.title}`,
        available: convergenceOptionAvailable(state, option),
        rejection: rejection ?? undefined,
        orderCost: 1,
        owned: [...option.choice.exact],
        contingent: [...option.choice.risk],
        summary: `${option.choice.flavor} WHY TODAY: ${prompt.convergence.map((edge) => edge.summary).join(" ")}`,
      });
    });
  FAMILIES.flatMap((family) =>
    family.choices.map((choice) => ({ family, choice })),
  ).forEach(({ family, choice }, index) =>
    actions.push(directiveDescriptor(state, family, choice, index)),
  );
  const opportunity = opportunityStatusForFraction(state, opportunityFraction);
  if (opportunity.packet)
    opportunity.packet.responses.forEach((response, index) => {
      const rejection =
        opportunity.status !== "active"
          ? `Opportunity is ${opportunity.status}.`
          : opportunityResponseRejection(state, response);
      actions.push({
        id: `opportunity:${opportunity.packet!.id}:${response.id}`,
        handle: `X${index + 1}`,
        label: response.label,
        aliases: [
          response.label,
          opportunity.packet!.label,
          opportunity.packet!.headline,
        ],
        kind: "opportunity-response",
        action: {
          kind: "opportunity-response",
          opportunityId: opportunity.packet!.id,
          responseId: response.id,
        },
        parentLabel: `Target of Opportunity / ${opportunity.packet!.label}`,
        available: !rejection,
        rejection: rejection ?? undefined,
        orderCost: 0,
        owned: [...response.exact],
        contingent: [...response.contingent],
        summary: response.flavor,
      });
    });
  let doctrineIndex = 0;
  for (const vector of DOCTRINES)
    for (const stage of vector.stages) {
      doctrineIndex += 1;
      const found = doctrineStage(stage.id),
        prerequisite =
          found && found.index > 0
            ? found.vector.stages[found.index - 1]
            : null;
      const rejection =
        state.status !== "active"
          ? `Campaign is ${state.status}.`
          : state.unlocked.includes(stage.id)
            ? "Principle is already internalized."
            : prerequisite && !state.unlocked.includes(prerequisite.id)
              ? `Requires ${prerequisite.label}.`
              : state.doctrine < stage.cost
                ? `Requires ${stage.cost} Insight Points; ${state.doctrine} are available.`
                : null;
      actions.push({
        id: `doctrine:${vector.id}:${stage.id}`,
        handle: `T${doctrineIndex}`,
        label: stage.label,
        aliases: [stage.label, `${vector.label} ${stage.label}`, stage.id],
        kind: "doctrine-stage",
        action: {
          kind: "doctrine-stage",
          vectorId: vector.id,
          stageId: stage.id,
        },
        parentLabel: `Doctrine / ${vector.label}`,
        available: !rejection,
        rejection: rejection ?? undefined,
        orderCost: 0,
        insightCost: stage.cost,
        owned: [stage.effect],
        contingent: [],
        summary: stage.description,
      });
    }
  actions.push({
    id: "resolve-day",
    handle: "Z1",
    label: `Resolve Day ${state.day}`,
    aliases: ["resolve day", "end day", "close day"],
    kind: "resolve-day",
    action: { kind: "resolve-day" },
    parentLabel: "Campaign Clock",
    available: state.status === "active",
    rejection:
      state.status === "active" ? undefined : `Campaign is ${state.status}.`,
    orderCost: 0,
    owned: [
      "Close every daily command ledger",
      "Persist the daily ledger",
      "Open the next campaign day",
    ],
    contingent: ["Sealed operational outcomes become final"],
    summary: "Close the current order window and resolve the day.",
  });
  return actions;
};

export const actionKey = (action: AvaActionRef) =>
  action.kind === "maneuver"
    ? `maneuver:${action.maneuverId}`
    : action.kind === "directive"
      ? `directive:${action.familyId}:${action.choiceId}${action.actorId ? `:${action.actorId}` : ""}`
      : action.kind === "sub-mission"
        ? `sub-mission:${action.missionId}:${action.optionId}`
        : action.kind === "opportunity-response"
          ? `opportunity:${action.opportunityId}:${action.responseId}`
          : action.kind === "doctrine-stage"
            ? `doctrine:${action.vectorId}:${action.stageId}`
            : "resolve-day";

export const descriptorForAction = (
  state: GameState,
  action: AvaActionRef,
  opportunityFraction = 0,
) =>
  enumerateAvaActions(state, opportunityFraction).find(
    (item) => actionKey(item.action) === actionKey(action),
  );

export type AvaRuntimeResult = {
  state: GameState;
  executed: boolean;
  rejection?: string;
  receipt: string[];
};

export const executeAvaAction = (
  state: GameState,
  action: AvaActionRef,
  opportunityFraction = 0,
): AvaRuntimeResult => {
  const descriptor = descriptorForAction(state, action, opportunityFraction);
  if (!descriptor)
    return {
      state,
      executed: false,
      rejection: "That order is not present in the current command docket.",
      receipt: [],
    };
  if (!descriptor.available)
    return {
      state,
      executed: false,
      rejection: descriptor.rejection ?? "The action is unavailable.",
      receipt: [],
    };
  let next = state;
  if (action.kind === "maneuver") {
    const maneuver = MANEUVERS.find((item) => item.id === action.maneuverId);
    if (maneuver) next = commitManeuver(state, maneuver);
  } else if (action.kind === "directive") {
    const family = FAMILIES.find((item) => item.id === action.familyId),
      choice = family?.choices.find((item) => item.id === action.choiceId);
    if (family && choice) next = commit(state, family, choice);
  } else if (action.kind === "sub-mission") {
    const packet = compileConvergence(state),
      prompt = packet[action.domain];
    if (
      prompt.id !== action.missionId ||
      prompt.resolutionTicket !== action.resolutionTicket
    )
      return {
        state,
        executed: false,
        rejection: "The sub-mission reference is stale.",
        receipt: [],
      };
    const result = commitConvergence(
      state,
      action.domain === "domestic"
        ? { domesticId: action.optionId }
        : { networkId: action.optionId },
    );
    next = result.state;
  } else if (action.kind === "opportunity-response") {
    const status = opportunityStatusForFraction(state, opportunityFraction),
      response =
        status.packet?.id === action.opportunityId
          ? status.packet.responses.find(
              (item) => item.id === action.responseId,
            )
          : undefined;
    if (response) next = commitOpportunity(state, response);
  } else if (action.kind === "doctrine-stage")
    next = unlockDoctrine(state, action.stageId);
  else if (action.kind === "resolve-day") next = resolve(state);
  if (next === state)
    return {
      state,
      executed: false,
      rejection: "The command desk rejected the order.",
      receipt: [],
    };
  return {
    state: next,
    executed: true,
    receipt: [
      `${descriptor.label} executed.`,
      descriptor.orderCost
        ? `${descriptor.orderCost} strategic order spent.`
        : descriptor.insightCost
          ? `${descriptor.insightCost} Insight Points spent.`
          : "No strategic order spent.",
      "Command ledger advanced after the order was sealed.",
    ],
  };
};

export const buildAvaPlan = (
  state: GameState,
  actions: AvaActionRef[],
  opportunityFraction = 0,
): AvaPlan => {
  const unique = actions.filter(
    (action, index) =>
      actions.findIndex((other) => actionKey(other) === actionKey(action)) ===
      index,
  );
  const descriptors = unique.map((action) =>
    descriptorForAction(state, action, opportunityFraction),
  );
  return {
    id: `P-${state.day}-${shortHash(
      `${avaStateRevision(state)}:${unique.map(actionKey).join("|")}`,
    )
      .slice(0, 6)
      .toUpperCase()}`,
    stateRevision: avaStateRevision(state),
    actions: unique,
    orderCost: descriptors.reduce(
      (sum, item) => sum + (item?.orderCost ?? 0),
      0,
    ),
    insightCost: descriptors.reduce(
      (sum, item) => sum + (item?.insightCost ?? 0),
      0,
    ),
  };
};

export const executeAvaPlan = (
  state: GameState,
  plan: AvaPlan,
  opportunityFraction = 0,
): AvaRuntimeResult => {
  if (plan.stateRevision !== avaStateRevision(state))
    return {
      state,
      executed: false,
      rejection: "The plan expired because the command position changed.",
      receipt: [],
    };
  if (
    plan.actions.some((action) => action.kind === "resolve-day") &&
    plan.actions.length > 1
  )
    return {
      state,
      executed: false,
      rejection: "Day resolution cannot share an order packet.",
      receipt: [],
    };
  let next = state;
  const receipt: string[] = [];
  for (const action of plan.actions) {
    const result = executeAvaAction(next, action, opportunityFraction);
    if (!result.executed)
      return {
        state,
        executed: false,
        rejection: result.rejection ?? "The combined order could not be entered.",
        receipt: [],
      };
    next = result.state;
    receipt.push(...result.receipt);
  }
  return { state: next, executed: true, receipt };
};

export const stageAvaConfirmation = (
  state: GameState,
  plan: AvaPlan,
  purpose: AvaConfirmation["purpose"],
): AvaConfirmation => ({
  id: `C-${state.day}-${shortHash(`${plan.id}:${purpose}`).slice(0, 6).toUpperCase()}`,
  stateRevision: avaStateRevision(state),
  plan,
  purpose,
});

export const executeAvaConfirmation = (
  state: GameState,
  confirmation: AvaConfirmation,
  opportunityFraction = 0,
) =>
  confirmation.stateRevision === avaStateRevision(state)
    ? executeAvaPlan(state, confirmation.plan, opportunityFraction)
    : {
        state,
        executed: false,
        rejection: "Confirmation expired because the command position changed.",
        receipt: [],
      };

export const renderAvaAction = (descriptor: AvaActionDescriptor) =>
  [
    `[${descriptor.handle}] ${descriptor.label.toUpperCase()} · ${descriptor.available ? "AVAILABLE" : `LOCKED: ${descriptor.rejection}`}`,
    descriptor.summary,
    ...descriptor.owned.map((line) => `OWNED: ${line}`),
    ...descriptor.contingent.map((line) => `CONTINGENT: ${line}`),
  ].join("\n");
