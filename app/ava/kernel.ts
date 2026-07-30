import type { GameState } from "../game";
import type {
  DocketFact,
  PlayerContext,
  PreparedOrderFact,
  SemanticResponse,
} from "../substrate/contracts";
import type { Channel } from "../substrate/gates";
import {
  cancelPreparedOrder,
  confirmOrder,
  getVisibleDocket,
  prepareOrder,
  rankVisibleChoices,
} from "../substrate/services";
import {
  DEFAULT_STRATEGIC_POSTURE,
  mergePosture,
  type StrategicPosture,
} from "../substrate/posture";
import { compileAvaCommand } from "./compiler";
import { avaEntitiesForState } from "./game-context";
import type {
  AvaCompileResult,
  AvaEntity,
  AvaInstruction,
  AvaModule,
  AvaSemanticQuery,
} from "./schema";
import { avaShellFileReferences } from "./filesystem";
import {
  initialAvaTerminalSession,
  runAvaInstruction,
  type AvaTerminalSession,
} from "./terminal";
import { voiceAvaResponse, type AvaVoiceCue } from "./voice";
import type { AvaDarkNetContext } from "./darknet";

type DirectiveChannel = Extract<
  Channel,
  "production" | "military" | "diplomacy"
>;

export type AvaKernelSession = {
  terminal: AvaTerminalSession;
  currentModule: AvaModule;
  interactive: boolean;
  commandsRead: number;
  consequentialAttempts: number;
  proposalToken?: string;
  proposalExpiresAt?: string;
};

export type AvaKernelResult = {
  state: GameState;
  session: AvaKernelSession;
  response: SemanticResponse<unknown>;
  text: string;
  compile?: AvaCompileResult;
};

export const createAvaKernelSession = (
  interactive = true,
  currentModule: AvaModule = "campaign",
): AvaKernelSession => ({
  terminal: initialAvaTerminalSession(),
  currentModule,
  interactive,
  commandsRead: 0,
  consequentialAttempts: 0,
});

const revisionOf = (state: GameState) =>
  `${state.campaignId}:${state.day}:${state.actions}:${state.contentPackVersion}`;

const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const moduleForChannel = (channel: DirectiveChannel): AvaModule =>
  channel === "production" ? "national" : channel;

const channelForModule = (module: AvaModule): DirectiveChannel | null =>
  module === "national"
    ? "production"
    : module === "military" || module === "diplomacy"
      ? module
      : null;

const channelForLanguage = (
  raw: string,
  instruction: AvaInstruction,
  currentModule: AvaModule,
): DirectiveChannel | null => {
  const input = normalize(raw);
  if (/\b(production|producion|industry|industrial|national)\b/.test(input))
    return "production";
  if (/\b(military|army|forces)\b/.test(input)) return "military";
  if (/\b(diplomacy|diplomatic|foreign|statecraft)\b/.test(input))
    return "diplomacy";
  if (instruction.kind === "LIST") {
    if (instruction.scope === "production") return "production";
    if (instruction.scope === "military") return "military";
    if (instruction.scope === "diplomacy") return "diplomacy";
  }
  if (instruction.kind === "ADVISE" || instruction.kind === "SEMANTIC")
    return channelForModule(currentModule);
  return null;
};

const actorForLanguage = (raw: string, state: GameState) => {
  const input = normalize(raw);
  return state.actors.find((actor) =>
    [actor.id, actor.name, actor.name.split(" ")[0] ?? ""]
      .map(normalize)
      .some((candidate) => candidate && input.includes(candidate)),
  )?.id;
};

const compileVisibleAvaContext = (
  ctx: PlayerContext,
  state: GameState,
  opportunityFraction: number,
) => {
  let next = state;
  const visibleChoiceIds = new Set<string>();
  for (const channel of ["production", "military"] as const) {
    const docket = getVisibleDocket(ctx, next, channel);
    next = docket.state;
    docket.response.fact.choiceIds.forEach((id) => visibleChoiceIds.add(id));
  }
  for (const actor of next.actors) {
    const docket = getVisibleDocket(ctx, next, "diplomacy", actor.id);
    next = docket.state;
    docket.response.fact.choiceIds.forEach((id) => visibleChoiceIds.add(id));
  }
  const entities = avaEntitiesForState(next, opportunityFraction).filter(
    (entity) =>
      entity.action?.kind !== "directive" ||
      visibleChoiceIds.has(entity.action.choiceId),
  );
  return { state: next, entities };
};

const responseText = (
  state: GameState,
  response: SemanticResponse<unknown>,
  cue: AvaVoiceCue,
  variant: number,
) =>
  voiceAvaResponse(
    state,
    `${response.rendering.compact}\n${response.rendering.brief}`,
    { ...cue, variant },
  );

const clarification = (
  state: GameState,
  compile: Extract<AvaCompileResult, { status: "clarify" }>,
  variant: number,
): { response: SemanticResponse<unknown>; text: string } => {
  const candidates = compile.candidates?.length
    ? ` Valid interpretations: ${compile.candidates
        .map((item) => item.handle ?? item.label)
        .join(", ")}.`
    : "";
  const response: SemanticResponse<unknown> = {
    status: "AMBIGUOUS",
    fact: {
      failure: compile.failure,
      candidates: compile.candidates?.map((item) => item.id) ?? [],
    },
    rendering: {
      compact: "CLARIFY",
      brief: `${compile.prompt}${candidates}`,
    },
    recovery: {
      code: compile.failure,
      instruction: compile.prompt,
      validExamples: ["what should I do", "missions", "list production"],
    },
    campaignRevision: revisionOf(state),
  };
  return {
    response,
    text: responseText(
      state,
      response,
      { mode: "rejection", label: "CLARIFICATION" },
      variant,
    ),
  };
};

const docketText = (fact: DocketFact) => {
  const rows = fact.choices.map(
    (choice, index) =>
      `[${index + 1}] ${choice.title.toUpperCase()} · ${choice.available ? "AVAILABLE" : "LOCKED"}\n${choice.brief}\nID: ${choice.choiceId}`,
  );
  return [
    `${fact.channel.toUpperCase()} DOCKET / DAY ${fact.campaignDay}`,
    ...rows,
    "GRAMMAR\n> choose <id>\n> prepare <id>\n> advise",
  ].join("\n\n");
};

const postureFor = (query?: AvaSemanticQuery): StrategicPosture => {
  let posture = DEFAULT_STRATEGIC_POSTURE;
  const criteria = new Set(query?.criteria ?? []);
  if (criteria.has("PRODUCTION"))
    posture = mergePosture(posture, {
      objective: "preserve_industrial_capacity",
      priorities: { production_integrity: "critical" },
      confirmation: "inferred",
    });
  if (criteria.has("FRONT") || criteria.has("STRONGEST"))
    posture = mergePosture(posture, {
      objective: "stabilize_front",
      priorities: { territorial_control: "high", initiative: "high" },
      confirmation: "inferred",
    });
  if (criteria.has("LONG_TERM") || criteria.has("SUSTAINABILITY"))
    posture = mergePosture(posture, {
      objective: "build_long_term_capacity",
      horizon: "long",
      priorities: { long_term_capacity: "critical" },
      confirmation: "inferred",
    });
  if (criteria.has("IMMEDIATE"))
    posture = mergePosture(posture, {
      horizon: "immediate",
      confirmation: "inferred",
    });
  if (criteria.has("LOWEST_RISK"))
    posture = mergePosture(posture, {
      priorities: { force_preservation: "critical" },
      tolerances: {
        short_term_exposure: "low",
        veteran_attrition: "low",
      },
      confirmation: "inferred",
    });
  if (criteria.has("CHEAPEST") || criteria.has("LOWEST_MATERIEL_COST"))
    posture = mergePosture(posture, {
      priorities: { treasury_preservation: "critical" },
      tolerances: { treasury_expenditure: "low" },
      confirmation: "inferred",
    });
  return posture;
};

const findDirectiveEntity = (target: string, entities: AvaEntity[]) => {
  const wanted = normalize(target);
  const matches = entities.filter((entity) => {
    if (entity.action?.kind !== "directive") return false;
    return [
      entity.id,
      entity.handle ?? "",
      entity.label,
      entity.action.choiceId,
      ...(entity.aliases ?? []),
    ]
      .map(normalize)
      .some((value) => value === wanted);
  });
  return matches.length === 1 ? matches[0] : null;
};

const directiveEntityForInstruction = (
  instruction: AvaInstruction,
  session: AvaKernelSession,
): AvaEntity | null => {
  if (
    instruction.kind === "SELECT" &&
    instruction.entity.action?.kind === "directive"
  )
    return instruction.entity;
  if (
    (instruction.kind === "STAGE" || instruction.kind === "ISSUE") &&
    instruction.entities.length === 1 &&
    instruction.entities[0]?.action?.kind === "directive"
  )
    return instruction.entities[0];
  if (
    instruction.kind === "COMMIT" &&
    instruction.entity?.action?.kind === "directive"
  )
    return instruction.entity;
  if (
    instruction.kind === "ISSUE_PLAN" &&
    session.terminal.plan.length === 1 &&
    session.terminal.plan[0]?.kind === "directive"
  ) {
    const action = session.terminal.plan[0];
    return {
      id: `directive:${action.familyId}:${action.choiceId}`,
      kind: "directive",
      label: action.choiceId,
      action,
    };
  }
  return null;
};

const oldAvaResponse = (
  state: GameState,
  result: ReturnType<typeof runAvaInstruction>,
  instruction: AvaInstruction,
): SemanticResponse<unknown> => ({
  status: result.rejection
    ? "REJECTED"
    : result.executed
      ? "EXECUTED"
      : "OK",
  fact: {
    instruction: instruction.kind,
    answerPlan: result.answerPlan,
    report: result.report,
    navigate: result.navigate,
  },
  rendering: {
    compact: instruction.kind,
    brief: result.text,
  },
  recovery: result.rejection
    ? { code: result.rejection, instruction: result.rejection }
    : undefined,
  campaignRevision: revisionOf(result.state ?? state),
});

const prepareDirective = (
  ctx: PlayerContext,
  state: GameState,
  session: AvaKernelSession,
  entity: AvaEntity,
  variant: number,
): AvaKernelResult => {
  if (entity.action?.kind !== "directive") {
    const response: SemanticResponse<unknown> = {
      status: "AMBIGUOUS",
      fact: null,
      rendering: {
        compact: "PREPARE TARGET",
        brief: "Name one directive on today's visible docket.",
      },
      recovery: {
        code: "PREPARE_TARGET",
        instruction: "Open production, military, or diplomacy and use a visible id.",
      },
      campaignRevision: revisionOf(state),
    };
    return {
      state,
      session,
      response,
      text: responseText(state, response, { mode: "rejection" }, variant),
    };
  }
  const prepared = prepareOrder(
    ctx,
    state,
    entity.action.choiceId,
    `ava:${ctx.surface}:${ctx.playerId}:${session.commandsRead}:${entity.action.choiceId}`,
  );
  const nextSession = { ...session };
  if (prepared.response.status === "PREPARED") {
    const fact = prepared.response.fact as PreparedOrderFact;
    nextSession.proposalToken = fact.proposalToken;
    nextSession.proposalExpiresAt = fact.expiresAt;
  }
  return {
    state: prepared.state,
    session: nextSession,
    response: prepared.response,
    text: responseText(
      prepared.state,
      prepared.response,
      prepared.response.status === "PREPARED"
        ? { mode: "confirmation" }
        : { mode: "rejection" },
      variant,
    ),
  };
};

export const runAvaKernelLine = (
  raw: string,
  ctx: PlayerContext,
  state: GameState,
  session: AvaKernelSession,
  opportunityFraction = 0,
  darkNetContext: AvaDarkNetContext = {},
): AvaKernelResult => {
  const nextSession: AvaKernelSession = {
    ...session,
    commandsRead: session.commandsRead + 1,
    terminal: { ...session.terminal },
  };
  const visible = compileVisibleAvaContext(ctx, state, opportunityFraction);
  let nextState = visible.state;
  const input = normalize(raw);
  const variant = nextSession.terminal.voiceCursor;

  const exactChannel: DirectiveChannel | null =
    input === "production" || input === "prod"
      ? "production"
      : input === "military" || input === "mil"
        ? "military"
        : input === "diplomacy" || input === "diplo"
          ? "diplomacy"
          : null;
  if (exactChannel) {
    const actorId =
      exactChannel === "diplomacy"
        ? actorForLanguage(raw, nextState) ?? nextState.actors[0]?.id
        : undefined;
    const docket = getVisibleDocket(ctx, nextState, exactChannel, actorId);
    nextState = docket.state;
    nextSession.currentModule = moduleForChannel(exactChannel);
    const text = voiceAvaResponse(nextState, docketText(docket.response.fact), {
      topic: exactChannel,
      variant,
    });
    return {
      state: nextState,
      session: nextSession,
      response: docket.response,
      text,
    };
  }

  const prepareMatch = input.match(/^prepare\s+(.+)$/);
  if (prepareMatch) {
    nextSession.consequentialAttempts += 1;
    const entity = findDirectiveEntity(prepareMatch[1], visible.entities);
    if (!entity) {
      return prepareDirective(
        ctx,
        nextState,
        nextSession,
        { id: "missing", kind: "directive", label: prepareMatch[1] },
        variant,
      );
    }
    return prepareDirective(ctx, nextState, nextSession, entity, variant);
  }

  const confirmationInput = input.match(/^confirm(?:\s+(.+))?$/);
  if (confirmationInput || input === "yes" || input === "accept") {
    nextSession.consequentialAttempts += 1;
    const proposalToken =
      confirmationInput?.[1] ?? nextSession.proposalToken ?? "";
    if (!nextSession.interactive) {
      const response: SemanticResponse<unknown> = {
        status: "CONFIRMATION_REQUIRED",
        fact: null,
        rendering: {
          compact: "CONFIRMATION REQUIRED",
          brief: "Non-interactive sessions may prepare but never confirm.",
        },
        recovery: {
          code: "INTERACTIVE_CONFIRM_REQUIRED",
          instruction: "Open an interactive session and confirm the proposal token.",
        },
        campaignRevision: revisionOf(nextState),
      };
      return {
        state: nextState,
        session: nextSession,
        response,
        text: responseText(nextState, response, { mode: "rejection" }, variant),
      };
    }
    const confirmed = confirmOrder(
      ctx,
      nextState,
      proposalToken,
      `ava-confirm:${ctx.surface}:${ctx.playerId}:${nextSession.commandsRead}:${proposalToken}`,
    );
    nextState = confirmed.state;
    if (
      confirmed.response.status === "EXECUTED" ||
      confirmed.response.status === "ALREADY_EXECUTED"
    ) {
      nextSession.proposalToken = undefined;
      nextSession.proposalExpiresAt = undefined;
    }
    return {
      state: nextState,
      session: nextSession,
      response: confirmed.response,
      text: responseText(
        nextState,
        confirmed.response,
        confirmed.response.status === "EXECUTED"
          ? { mode: "receipt" }
          : { mode: "rejection" },
        variant,
      ),
    };
  }

  if (input === "cancel" || input.startsWith("cancel ")) {
    nextSession.consequentialAttempts += 1;
    const proposalToken =
      input.slice("cancel".length).trim() || nextSession.proposalToken || "";
    const cancelled = cancelPreparedOrder(ctx, nextState, proposalToken);
    nextState = cancelled.state;
    if (cancelled.response.status === "OK") {
      nextSession.proposalToken = undefined;
      nextSession.proposalExpiresAt = undefined;
    }
    return {
      state: nextState,
      session: nextSession,
      response: cancelled.response,
      text: responseText(
        nextState,
        cancelled.response,
        cancelled.response.status === "OK"
          ? { mode: "acknowledgment", label: "ORDER WITHHELD" }
          : { mode: "rejection" },
        variant,
      ),
    };
  }

  const compile = compileAvaCommand(raw, {
    currentModule: nextSession.currentModule,
    entities: visible.entities,
    discourse: nextSession.terminal.discourse,
    shellFileReferences: avaShellFileReferences(
      nextState,
      nextSession.terminal.shell,
      opportunityFraction,
    ),
  });
  if (compile.status === "clarify") {
    const clarified = clarification(nextState, compile, variant);
    return {
      state: nextState,
      session: nextSession,
      response: clarified.response,
      text: clarified.text,
      compile,
    };
  }

  const directive = directiveEntityForInstruction(
    compile.instruction,
    nextSession,
  );
  if (directive) {
    nextSession.consequentialAttempts += 1;
    const result = prepareDirective(
      ctx,
      nextState,
      nextSession,
      directive,
      variant,
    );
    return { ...result, compile };
  }

  const channel = channelForLanguage(
    raw,
    compile.instruction,
    nextSession.currentModule,
  );
  const semantic =
    compile.instruction.kind === "SEMANTIC"
      ? compile.instruction.query
      : compile.semantic;
  const asksForJudgment =
    compile.instruction.kind === "ADVISE" ||
    (compile.instruction.kind === "SEMANTIC" &&
      ["ADVISE", "RANK", "RECOMMEND", "COMPARE"].includes(
        compile.instruction.query.operation,
      ));
  if (channel && asksForJudgment) {
    const actorId =
      channel === "diplomacy"
        ? actorForLanguage(raw, nextState) ?? nextState.actors[0]?.id
        : undefined;
    const ranked = rankVisibleChoices(
      ctx,
      nextState,
      channel,
      actorId,
      postureFor(semantic),
    );
    nextState = ranked.state;
    nextSession.currentModule = moduleForChannel(channel);
    const labelByChoice = new Map<string, string>();
    for (const entity of visible.entities) {
      if (entity.action?.kind === "directive")
        labelByChoice.set(entity.action.choiceId, entity.label);
    }
    const rows = ranked.response.fact.ranked;
    const judgment = rows.length
      ? rows
          .map(
            (row, index) =>
              `${index + 1}. ${(labelByChoice.get(row.choiceId) ?? row.choiceId).toUpperCase()} · SCORE ${row.score}`,
          )
          .join("\n")
      : "No legal choice is visible in this channel.";
    const text = voiceAvaResponse(
      nextState,
      `JUDGMENT / ${channel.toUpperCase()}\n${judgment}\n\nThe ranking is deterministic against the posture inferred from your wording. No order was prepared or issued.`,
      { topic: channel, label: "JUDGMENT", variant },
    );
    return {
      state: nextState,
      session: nextSession,
      response: ranked.response,
      text,
      compile,
    };
  }

  if (compile.instruction.kind === "LIST" && channel) {
    const actorId =
      channel === "diplomacy"
        ? actorForLanguage(raw, nextState) ?? nextState.actors[0]?.id
        : undefined;
    const docket = getVisibleDocket(ctx, nextState, channel, actorId);
    nextState = docket.state;
    nextSession.currentModule = moduleForChannel(channel);
    const text = voiceAvaResponse(nextState, docketText(docket.response.fact), {
      topic: channel,
      variant,
    });
    return {
      state: nextState,
      session: nextSession,
      response: docket.response,
      text,
      compile,
    };
  }

  const result = runAvaInstruction(
    nextState,
    nextSession.terminal,
    compile.instruction,
    opportunityFraction,
    compile.semantic,
    compile.trace,
    darkNetContext,
  );
  nextSession.terminal = result.session;
  if (
    result.navigate &&
    [
      "campaign",
      "national",
      "military",
      "diplomacy",
      "doctrine",
      "account",
      "wiki",
    ].includes(result.navigate)
  )
    nextSession.currentModule = result.navigate as AvaModule;
  if (
    [
      "ISSUE",
      "ISSUE_PLAN",
      "COMMIT",
      "CONFIRM",
      "RESOLVE_DAY",
      "CANCEL",
    ].includes(compile.instruction.kind)
  )
    nextSession.consequentialAttempts += 1;
  return {
    state: result.state,
    session: nextSession,
    response: oldAvaResponse(nextState, result, compile.instruction),
    text: result.text,
    compile,
  };
};
