import {
  DAILY_ORDERS,
  FAMILIES,
  commit,
  directorForState,
  situationForState,
  type GameState,
  type PreparedOrderRecord,
} from "../game";
import { choiceById, familyById } from "./content-adapters";
import type {
  CanonicalCommand,
  DocketFact,
  PlayerContext,
  PreparedOrderFact,
  SemanticResponse,
  VisibleChoice,
} from "./contracts";

export type { PlayerContext };
import {
  compileDailyDocket,
  docketFactFromRecord,
  getStoredDocket,
} from "./docket";
import type { Channel } from "./gates";
import { hashInt } from "./hash";
import {
  DEFAULT_STRATEGIC_POSTURE,
  type StrategicPosture,
  validateStrategicPosture,
} from "./posture";
import { evaluateDirectiveChoices } from "./choice-evaluation";

const revisionOf = (state: GameState) =>
  `${state.campaignId}:${state.day}:${state.actions}:${state.contentPackVersion}`;

const ok = <T>(
  state: GameState,
  fact: T,
  rendering: SemanticResponse<T>["rendering"],
  status: SemanticResponse<T>["status"] = "OK",
  extra: Partial<SemanticResponse<T>> = {},
): SemanticResponse<T> => ({
  status,
  fact,
  rendering,
  campaignRevision: revisionOf(state),
  ...extra,
});

const token = (seed: string) =>
  `prp_${hashInt(seed).toString(16)}${hashInt(`${seed}:b`).toString(16)}`.slice(0, 18);

const audit = (seed: string) =>
  `ord_${hashInt(seed).toString(16).padStart(8, "0")}`;

export const getDailyBrief = (
  ctx: PlayerContext,
  state: GameState,
): SemanticResponse<{
  day: number;
  title: string;
  condition: string;
  ordersRemaining: number;
  ordersTotal: number;
}> => {
  const situation = situationForState(state);
  const director = directorForState(state);
  const fact = {
    day: state.day,
    title: situation.headline,
    condition: director.event.brief,
    ordersRemaining: state.actions,
    ordersTotal: DAILY_ORDERS,
  };
  return ok(state, fact, {
    compact: `DAY ${fact.day} · ${fact.title}`,
    brief: `${fact.condition} Orders ${fact.ordersRemaining}/${fact.ordersTotal}.`,
    spoken: fact.condition,
  });
};

export const getCampaignStatus = (ctx: PlayerContext, state: GameState) => {
  const fact = {
    day: state.day,
    front: state.front,
    readiness: state.readiness,
    legitimacy: state.legitimacy,
    actions: state.actions,
    status: state.status,
  };
  return ok(state, fact, {
    compact: `STATUS D${fact.day} FRONT ${fact.front.toFixed(1)}`,
    brief: `Day ${fact.day}. Front ${fact.front.toFixed(1)}. Readiness ${fact.readiness}. Orders ${fact.actions}.`,
  });
};

export const getVisibleDocket = (
  ctx: PlayerContext,
  state: GameState,
  channel: Channel,
  actorId?: string,
): { response: SemanticResponse<DocketFact, VisibleChoice>; state: GameState } => {
  const compiled = compileDailyDocket(state, channel, actorId);
  const fact = docketFactFromRecord(compiled.state, compiled.record);
  return {
    state: compiled.state,
    response: {
      status: fact.diagnostic === "no-action-docket" ? "NOT_FOUND" : "OK",
      fact,
      actions: fact.choices,
      rendering: {
        compact: `${channel.toUpperCase()} DOCKET ${fact.familyIds.length} FAMILIES`,
        brief: `${fact.choices.length} visible choices across ${fact.cladeIds.length} clades.`,
      },
      campaignRevision: revisionOf(compiled.state),
      recovery:
        fact.diagnostic === "no-action-docket"
          ? {
              code: "NO_ACTION_DOCKET",
              instruction: "No eligible orders in this channel today.",
            }
          : undefined,
    },
  };
};

export const getVisibleChoice = (
  ctx: PlayerContext,
  state: GameState,
  choiceId: string,
): SemanticResponse<{
  choiceId: string;
  title: string;
  brief: string;
  familyId: string;
  visible: boolean;
}> => {
  const found = choiceById(choiceId);
  if (!found) {
    return {
      status: "NOT_FOUND",
      fact: { choiceId, title: choiceId, brief: "", familyId: "", visible: false },
      rendering: { compact: "NOT FOUND", brief: "Unknown choice." },
      campaignRevision: revisionOf(state),
      recovery: {
        code: "UNKNOWN_CHOICE",
        instruction: "Use show <choice-id> with a visible docket id.",
      },
    };
  }
  const channel =
    found.family.module === "national"
      ? "production"
      : (found.family.module as Channel);
  const dockets =
    channel === "diplomacy"
      ? state.actors.map((actor) => getStoredDocket(state, "diplomacy", actor.id))
      : [getStoredDocket(state, channel)];
  const visible = dockets.some((record) =>
    record?.selectedChoiceIds.includes(choiceId),
  );
  if (!visible) {
    return {
      status: "NOT_FOUND",
      fact: {
        choiceId,
        title: found.choice.label,
        brief: found.choice.flavor,
        familyId: found.family.id,
        visible: false,
      },
      rendering: {
        compact: "UNAVAILABLE",
        brief: "That choice is not on today's visible docket.",
      },
      campaignRevision: revisionOf(state),
      recovery: {
        code: "CHOICE_NOT_VISIBLE",
        instruction: "Open the channel docket and select a currently visible choice.",
      },
    };
  }
  return ok(
    state,
    {
      choiceId,
      title: found.choice.label,
      brief: found.choice.flavor,
      familyId: found.family.id,
      visible: true,
    },
    {
      compact: found.choice.label,
      brief: found.choice.flavor,
    },
  );
};

export const prepareOrder = (
  ctx: PlayerContext,
  state: GameState,
  choiceId: string,
  idempotencyKey: string,
): { response: SemanticResponse<PreparedOrderFact>; state: GameState } => {
  if (ctx.authority !== "command") {
    return {
      state,
      response: {
        status: "FORBIDDEN",
        fact: null as unknown as PreparedOrderFact,
        rendering: { compact: "FORBIDDEN", brief: "Staff authority cannot prepare orders." },
        campaignRevision: revisionOf(state),
      },
    };
  }
  const existing = (state.preparedOrders ?? []).find(
    (item) =>
      (item.prepareIdempotencyKey ??
        (!item.consumedAt ? item.idempotencyKey : undefined)) ===
        idempotencyKey &&
      item.playerId === ctx.playerId &&
      item.campaignId === ctx.campaignId,
  );
  if (
    existing &&
    !existing.consumedAt &&
    existing.choiceId !== choiceId
  ) {
    return {
      state,
      response: {
        status: "REJECTED",
        fact: null as unknown as PreparedOrderFact,
        rendering: {
          compact: "IDEMPOTENCY CONFLICT",
          brief:
            "That preparation idempotency key is already bound to a different directive.",
        },
        recovery: {
          code: "IDEMPOTENCY_CONFLICT",
          instruction: "Use the original directive or a new idempotency key.",
        },
        campaignRevision: revisionOf(state),
      },
    };
  }
  if (existing && !existing.consumedAt) {
    const found = choiceById(existing.choiceId);
    const fact = preparedFactFromRecord(state, existing, found?.choice.exact ?? []);
    return {
      state,
      response: ok(state, fact, {
        compact: "ORDER PREPARED",
        brief: `${fact.normalizedAction.title}. Confirm with confirm ${fact.proposalToken}`,
      }, "PREPARED", { auditId: existing.auditId }),
    };
  }

  const visibility = getVisibleChoice(ctx, state, choiceId);
  if (visibility.status !== "OK" || !visibility.fact.visible) {
    return {
      state,
      response: {
        status: visibility.status,
        fact: null as unknown as PreparedOrderFact,
        rendering: visibility.rendering,
        recovery: visibility.recovery,
        campaignRevision: revisionOf(state),
      },
    };
  }
  const found = choiceById(choiceId)!;
  const proposalToken = token(
    `${ctx.playerId}:${ctx.campaignId}:${choiceId}:${idempotencyKey}:${ctx.nowMs}`,
  );
  const record: PreparedOrderRecord = {
    proposalToken,
    playerId: ctx.playerId,
    campaignId: state.campaignId,
    campaignRevision: revisionOf(state),
    choiceId,
    familyId: found.family.id,
    mechanicId: choiceId,
    title: found.choice.label,
    orderCost: 1,
    createdAt: new Date(ctx.nowMs).toISOString(),
    expiresAt: new Date(ctx.nowMs + 10 * 60 * 1000).toISOString(),
    prepareIdempotencyKey: idempotencyKey,
    idempotencyKey,
    auditId: audit(`${proposalToken}:prep`),
  };
  const next = {
    ...state,
    preparedOrders: [...(state.preparedOrders ?? []), record],
  };
  const fact = preparedFactFromRecord(next, record, found.choice.exact);
  return {
    state: next,
    response: ok(
      next,
      fact,
      {
        compact: "ORDER PREPARED",
        brief: `${fact.normalizedAction.title}. Cost ${fact.orderCost}. Confirm with confirm ${fact.proposalToken}`,
      },
      "PREPARED",
      { auditId: record.auditId },
    ),
  };
};

const preparedFactFromRecord = (
  state: GameState,
  record: PreparedOrderRecord,
  exact: string[],
): PreparedOrderFact => ({
  normalizedAction: {
    choiceId: record.choiceId,
    mechanicId: record.mechanicId,
    title: record.title,
  },
  campaignId: record.campaignId,
  campaignRevision: record.campaignRevision,
  orderCost: record.orderCost,
  ordersBefore: state.actions,
  ordersAfter: Math.max(0, state.actions - record.orderCost),
  knownConsequences: exact.map((claim, index) => ({
    id: `${record.choiceId}:c${index}`,
    claim,
    polarity: "neutral" as const,
    visible: true as const,
  })),
  reversible: false,
  expiresAt: record.expiresAt,
  proposalToken: record.proposalToken,
  confirmationPhrase: `confirm ${record.proposalToken}`,
});

export const confirmOrder = (
  ctx: PlayerContext,
  state: GameState,
  proposalToken: string,
  idempotencyKey: string,
): { response: SemanticResponse<{ choiceId: string; title: string }>; state: GameState } => {
  if (ctx.authority !== "command") {
    return {
      state,
      response: {
        status: "FORBIDDEN",
        fact: { choiceId: "", title: "" },
        rendering: { compact: "FORBIDDEN", brief: "Staff authority cannot confirm orders." },
        campaignRevision: revisionOf(state),
      },
    };
  }
  const orders = [...(state.preparedOrders ?? [])];
  const record = orders.find((item) => item.proposalToken === proposalToken);
  if (!record || record.playerId !== ctx.playerId || record.campaignId !== state.campaignId) {
    return {
      state,
      response: {
        status: "NOT_FOUND",
        fact: { choiceId: "", title: "" },
        rendering: { compact: "NOT FOUND", brief: "Unknown proposal token." },
        campaignRevision: revisionOf(state),
      },
    };
  }
  if (record.consumedAt) {
    return {
      state,
      response: {
        status: "ALREADY_EXECUTED",
        fact: { choiceId: record.choiceId, title: record.title },
        rendering: {
          compact: "ALREADY EXECUTED",
          brief: `Order already executed. Audit: ${record.auditId}`,
        },
        campaignRevision: revisionOf(state),
        auditId: record.auditId,
      },
    };
  }
  if (Date.parse(record.expiresAt) < ctx.nowMs) {
    return {
      state,
      response: {
        status: "EXPIRED",
        fact: { choiceId: record.choiceId, title: record.title },
        rendering: { compact: "EXPIRED", brief: "Proposal expired. Prepare again." },
        campaignRevision: revisionOf(state),
      },
    };
  }
  if (record.campaignRevision !== revisionOf(state)) {
    return {
      state,
      response: {
        status: "STATE_CHANGED",
        fact: { choiceId: record.choiceId, title: record.title },
        rendering: {
          compact: "STATE CHANGED",
          brief: "Campaign revision changed. Prepare the order again.",
        },
        campaignRevision: revisionOf(state),
      },
    };
  }
  const family = familyById(record.familyId);
  const choice = family?.choices.find((item) => item.id === record.choiceId);
  if (!family || !choice) {
    return {
      state,
      response: {
        status: "REJECTED",
        fact: { choiceId: record.choiceId, title: record.title },
        rendering: { compact: "REJECTED", brief: "Order target missing." },
        campaignRevision: revisionOf(state),
      },
    };
  }
  const priorIdempotent = orders.find(
    (item) =>
      (item.confirmationIdempotencyKey ??
        (item.consumedAt ? item.idempotencyKey : undefined)) ===
        idempotencyKey &&
      item.consumedAt &&
      item.playerId === ctx.playerId &&
      item.campaignId === ctx.campaignId,
  );
  if (priorIdempotent && priorIdempotent.proposalToken !== proposalToken) {
    return {
      state,
      response: {
        status: "REJECTED",
        fact: { choiceId: record.choiceId, title: record.title },
        rendering: {
          compact: "IDEMPOTENCY CONFLICT",
          brief:
            "That confirmation idempotency key is already bound to a different proposal.",
        },
        recovery: {
          code: "IDEMPOTENCY_CONFLICT",
          instruction: "Use the original proposal token or a new idempotency key.",
        },
        campaignRevision: revisionOf(state),
      },
    };
  }
  if (priorIdempotent) {
    return {
      state,
      response: {
        status: "ALREADY_EXECUTED",
        fact: { choiceId: priorIdempotent.choiceId, title: priorIdempotent.title },
        rendering: {
          compact: "ALREADY EXECUTED",
          brief: `Idempotent replay. Audit: ${priorIdempotent.auditId}`,
        },
        campaignRevision: revisionOf(state),
        auditId: priorIdempotent.auditId,
      },
    };
  }

  const nextState = commit(state, family, choice);
  if (nextState === state || nextState.actions === state.actions && !nextState.decisions.some((d) => d.day === state.day && d.choiceId === choice.id)) {
    // commit returns same ref on rejection
  }
  const spent = nextState.actions === state.actions - 1 || nextState.decisions.length > state.decisions.length;
  if (!spent && nextState.actions >= state.actions) {
    return {
      state,
      response: {
        status: "REJECTED",
        fact: { choiceId: record.choiceId, title: record.title },
        rendering: { compact: "REJECTED", brief: "Order could not be committed." },
        campaignRevision: revisionOf(state),
      },
    };
  }
  const auditId = audit(`${proposalToken}:exec:${idempotencyKey}`);
  const updatedOrders = (nextState.preparedOrders ?? orders).map((item) =>
    item.proposalToken === proposalToken
      ? {
          ...item,
          consumedAt: new Date(ctx.nowMs).toISOString(),
          confirmationIdempotencyKey: idempotencyKey,
          auditId,
          resultStatus: "EXECUTED",
        }
      : item,
  );
  const finalState = { ...nextState, preparedOrders: updatedOrders };
  return {
    state: finalState,
    response: {
      status: "EXECUTED",
      fact: { choiceId: record.choiceId, title: record.title },
      rendering: {
        compact: "ORDER EXECUTED",
        brief: `${record.title} executed. Audit: ${auditId}`,
      },
      campaignRevision: revisionOf(finalState),
      auditId,
    },
  };
};

export const cancelPreparedOrder = (
  ctx: PlayerContext,
  state: GameState,
  proposalToken: string,
): { response: SemanticResponse<{ cancelled: boolean }>; state: GameState } => {
  const orders = state.preparedOrders ?? [];
  const record = orders.find((item) => item.proposalToken === proposalToken);
  if (!record || record.playerId !== ctx.playerId) {
    return {
      state,
      response: {
        status: "NOT_FOUND",
        fact: { cancelled: false },
        rendering: { compact: "NOT FOUND", brief: "No such prepared order." },
        campaignRevision: revisionOf(state),
      },
    };
  }
  if (record.consumedAt) {
    return {
      state,
      response: {
        status: "ALREADY_EXECUTED",
        fact: { cancelled: false },
        rendering: { compact: "ALREADY EXECUTED", brief: "Cannot cancel an executed order." },
        campaignRevision: revisionOf(state),
      },
    };
  }
  const next = {
    ...state,
    preparedOrders: orders.filter((item) => item.proposalToken !== proposalToken),
  };
  return {
    state: next,
    response: ok(next, { cancelled: true }, {
      compact: "CANCELLED",
      brief: "Prepared order cancelled.",
    }),
  };
};

export const evaluateChoices = (
  ctx: PlayerContext,
  state: GameState,
  choiceIds: string[],
  posture?: StrategicPosture,
) => {
  const validated = validateStrategicPosture(
    posture ?? DEFAULT_STRATEGIC_POSTURE,
  );
  const activePosture = validated.ok
    ? validated.posture
    : DEFAULT_STRATEGIC_POSTURE;
  const evaluations = evaluateDirectiveChoices(state, choiceIds, activePosture);
  return ok(
    state,
    { evaluations, posture: activePosture },
    {
      compact: `EVALUATED ${evaluations.length}`,
      brief: evaluations
        .map((item) => `${item.choiceId}:${item.score}`)
        .join(" · "),
    },
  );
};

export const rankVisibleChoices = (
  ctx: PlayerContext,
  state: GameState,
  channel: Channel,
  actorId?: string,
  posture?: StrategicPosture,
) => {
  const { response, state: next } = getVisibleDocket(ctx, state, channel, actorId);
  const ranked = evaluateChoices(
    ctx,
    next,
    response.fact.choiceIds,
    posture,
  );
  const ordered = [...ranked.fact.evaluations].sort(
    (a, b) => b.score - a.score || a.choiceId.localeCompare(b.choiceId),
  );
  return {
    state: next,
    response: ok(
      next,
      { channel, actorId, ranked: ordered, posture: ranked.fact.posture },
      {
        compact: `RANK ${channel}`,
        brief: ordered.map((item) => item.choiceId).join(", "),
      },
    ),
  };
};

export const dispatchCanonicalCommand = (
  ctx: PlayerContext,
  state: GameState,
  command: CanonicalCommand,
  options: { allowConfirm?: boolean } = {},
): { response: SemanticResponse<unknown>; state: GameState } => {
  const allowConfirm = options.allowConfirm !== false;
  switch (command.operation) {
    case "HELP":
      return {
        state,
        response: ok(
          state,
          {
            commands: [
              "brief",
              "status",
              "production",
              "military",
              "diplomacy",
              "advise",
              "prepare <choice-id>",
              "confirm <token>",
            ],
          },
          {
            compact: "HELP",
            brief: "brief · status · production · military · diplomacy · advise · prepare · confirm",
          },
        ),
      };
    case "BRIEF":
      return { state, response: getDailyBrief(ctx, state) };
    case "STATUS":
      return { state, response: getCampaignStatus(ctx, state) };
    case "SHOW_DOCKET": {
      const channel = command.channel ?? "production";
      const result = getVisibleDocket(ctx, state, channel, command.actorId);
      return { state: result.state, response: result.response };
    }
    case "SHOW_CHOICE":
      return {
        state,
        response: getVisibleChoice(ctx, state, command.targetIds?.[0] ?? ""),
      };
    case "PREPARE": {
      const result = prepareOrder(
        ctx,
        state,
        command.targetIds?.[0] ?? "",
        command.idempotencyKey ?? `prep:${command.rawInput}:${ctx.nowMs}`,
      );
      return { state: result.state, response: result.response };
    }
    case "CONFIRM": {
      if (!allowConfirm) {
        return {
          state,
          response: {
            status: "CONFIRMATION_REQUIRED",
            fact: null,
            rendering: {
              compact: "CONFIRMATION REQUIRED",
              brief: "Non-interactive sessions may prepare but never confirm.",
            },
            recovery: {
              code: "INTERACTIVE_CONFIRM_REQUIRED",
              instruction: "Open an interactive session and confirm <token>.",
            },
            campaignRevision: revisionOf(state),
          },
        };
      }
      const result = confirmOrder(
        ctx,
        state,
        command.proposalToken ?? command.targetIds?.[0] ?? "",
        command.idempotencyKey ?? `confirm:${command.proposalToken}:${ctx.nowMs}`,
      );
      return { state: result.state, response: result.response };
    }
    case "CANCEL": {
      const result = cancelPreparedOrder(
        ctx,
        state,
        command.proposalToken ?? command.targetIds?.[0] ?? "",
      );
      return { state: result.state, response: result.response };
    }
    case "ADVISE":
    case "RANK": {
      const channel = command.channel ?? "production";
      return rankVisibleChoices(ctx, state, channel, command.actorId, command.posture);
    }
    case "COMPARE": {
      const evaluated = evaluateChoices(ctx, state, command.targetIds ?? [], command.posture);
      return { state, response: evaluated };
    }
    case "WHOAMI":
      return {
        state,
        response: ok(
          state,
          { playerId: ctx.playerId, campaignId: ctx.campaignId, surface: ctx.surface },
          {
            compact: ctx.playerId,
            brief: `${ctx.playerId} · ${ctx.campaignId} · ${ctx.surface}`,
          },
        ),
      };
    case "QUIT":
    case "LOGOUT":
      return {
        state,
        response: ok(state, { done: true }, { compact: "GOODBYE", brief: "Session closed." }),
      };
    default:
      return {
        state,
        response: {
          status: "AMBIGUOUS",
          fact: null,
          rendering: {
            compact: "UNRECOGNIZED",
            brief: "Command not recognized.",
          },
          recovery: {
            code: "UNKNOWN_COMMAND",
            instruction: "Try help, brief, status, production, or prepare <choice-id>.",
            validExamples: ["help", "brief", "production"],
          },
          campaignRevision: revisionOf(state),
        },
      };
  }
};

export const listDirectiveFamilyCatalog = () => FAMILIES;
