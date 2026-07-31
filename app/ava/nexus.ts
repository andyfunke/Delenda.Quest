import {
  forceOpportunityForCurrentDay,
  opportunityStatusForFraction,
  recordOpportunityExpired,
  recordOpportunityOpened,
  type GameState,
} from "../game";
import type {
  DocketFact,
  PlayerContext,
  PreparedOrderFact,
  SemanticResponse,
} from "../substrate/contracts";
import type { Channel } from "../substrate/gates";
import { hashInt } from "../substrate/hash";
import {
  cancelPreparedOrder,
  confirmOrder,
  getVisibleDocket,
  prepareOrder,
  rankVisibleChoices,
} from "../substrate/services";
import { createCapabilityRegistry } from "../substrate/capability-registry";
import {
  DEFAULT_STRATEGIC_POSTURE,
  mergePosture,
  type StrategicPosture,
} from "../substrate/posture";
import {
  compileAvaCommand,
  isAvaConfirmationInput,
} from "./compiler";
import { genericSemanticQuery } from "./grammar";
import { avaEntitiesForState } from "./game-context";
import type {
  AvaCompileResult,
  AvaActionRef,
  AvaEntity,
  AvaInstruction,
  AvaModule,
  AvaReportTopic,
  AvaSemanticQuery,
  AvaShellInstruction,
} from "./schema";
import { avaShellFileReferences } from "./filesystem";
import {
  initialAvaTerminalSession,
  runAvaInstruction,
  type AvaTerminalResult,
  type AvaTerminalSession,
} from "./terminal";
import { voiceAvaResponse, type AvaVoiceCue } from "./voice";
import type { AvaDarkNetContext } from "./darknet";
import {
  avaRequestStateSeal,
  instructionAvaRequest,
  validateAvaRequestIR,
  validateAvaSemanticQuery,
  type AvaDirectiveBinding,
  type AvaRequestIR,
  type AvaResolutionGrant,
  type AvaResponseEnvelope,
} from "./request-ir";
import {
  actionKey,
  buildAvaPlan,
  executeAvaAction,
  executeAvaPlan,
} from "./runtime";

type DirectiveChannel = Extract<
  Channel,
  "production" | "military" | "diplomacy"
>;

type AvaCapabilityHandler =
  | "campaign-choice"
  | "mission-objective"
  | "metric-challenge"
  | "directive-rank"
  | "terminal-instruction";

/**
 * This is intentionally closed. Adding a semantic operation or subject to the
 * type system does not make it executable until its exact cell is registered.
 */
export const AVA_CAPABILITY_REGISTRY = createCapabilityRegistry<
  AvaSemanticQuery["operation"],
  AvaSemanticQuery["subject"]["type"],
  AvaCapabilityHandler
>([
  {
    operation: "ADVISE",
    subject: "CAMPAIGN_CHOICE",
    handler: "campaign-choice",
  },
  {
    operation: "RANK",
    subject: "CAMPAIGN_CHOICE",
    handler: "campaign-choice",
  },
  {
    operation: "RECOMMEND",
    subject: "CAMPAIGN_CHOICE",
    handler: "campaign-choice",
  },
  {
    operation: "COMPARE",
    subject: "CAMPAIGN_CHOICE",
    handler: "campaign-choice",
  },
  {
    operation: "JUSTIFY",
    subject: "CAMPAIGN_CHOICE",
    handler: "campaign-choice",
  },
  {
    operation: "CORRECT",
    subject: "CAMPAIGN_CHOICE",
    handler: "campaign-choice",
  },
  {
    operation: "LIST",
    subject: "CAMPAIGN_CHOICE",
    handler: "terminal-instruction",
  },
  {
    operation: "INSPECT",
    subject: "CAMPAIGN_CHOICE",
    handler: "campaign-choice",
  },
  {
    operation: "PREDICT",
    subject: "CAMPAIGN_CHOICE",
    handler: "terminal-instruction",
  },
  {
    operation: "SUMMARIZE",
    subject: "REPORT",
    handler: "terminal-instruction",
  },
  {
    operation: "INSPECT",
    subject: "SYSTEM",
    handler: "terminal-instruction",
  },
  {
    operation: "INSPECT",
    subject: "ACTION",
    handler: "terminal-instruction",
  },
  {
    operation: "CONFIRM",
    subject: "ACTION",
    handler: "terminal-instruction",
  },
  {
    operation: "EXPLAIN",
    subject: "METRIC",
    handler: "terminal-instruction",
  },
  {
    operation: "EXPLAIN",
    subject: "SYSTEM",
    handler: "terminal-instruction",
  },
  {
    operation: "EXPLAIN",
    subject: "CAMPAIGN_CHOICE",
    handler: "terminal-instruction",
  },
  {
    operation: "INSPECT",
    subject: "MISSION_OBJECTIVE",
    handler: "mission-objective",
  },
  {
    operation: "EXPLAIN",
    subject: "MISSION_OBJECTIVE",
    handler: "mission-objective",
  },
  {
    operation: "CHALLENGE",
    subject: "METRIC",
    handler: "metric-challenge",
  },
  {
    operation: "ADVISE",
    subject: "DIRECTIVE",
    handler: "directive-rank",
  },
  {
    operation: "RANK",
    subject: "DIRECTIVE",
    handler: "directive-rank",
  },
  {
    operation: "RECOMMEND",
    subject: "DIRECTIVE",
    handler: "directive-rank",
  },
]);

export type AvaNexusSession = {
  terminal: AvaTerminalSession;
  currentModule: AvaModule;
  interactive: boolean;
  commandsRead: number;
  consequentialAttempts: number;
  proposalToken?: string;
  proposalExpiresAt?: string;
  consumedResolutionGrantIds: string[];
};

export type AvaKernelSession = AvaNexusSession;

export type AvaNexusResult = {
  state: GameState;
  session: AvaNexusSession;
  envelope: AvaResponseEnvelope;
  response: SemanticResponse<unknown>;
  text: string;
  compile?: AvaCompileResult;
  terminalResult?: AvaTerminalResult;
};

export type AvaKernelResult = AvaNexusResult;

/**
 * Trusted capabilities supplied by a server adapter only after it has
 * validated the request against persisted authority state.
 */
export type AvaNexusExecutionOptions = {
  resolutionAuthority?: "persisted-redemption";
};

export const createAvaNexusSession = (
  interactive = true,
  currentModule: AvaModule = "campaign",
  terminal: AvaTerminalSession = initialAvaTerminalSession(),
): AvaNexusSession => ({
  terminal,
  currentModule,
  interactive,
  commandsRead: 0,
  consequentialAttempts: 0,
  consumedResolutionGrantIds: [],
});

export const createAvaKernelSession = createAvaNexusSession;

export const avaNexusStateRevision = (state: GameState) =>
  avaRequestStateSeal(state);

const revisionOf = avaNexusStateRevision;

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

type AvaNexusExecutionResult = Omit<AvaNexusResult, "envelope">;

const prepareDirective = (
  ctx: PlayerContext,
  state: GameState,
  session: AvaKernelSession,
  entity: AvaEntity,
  variant: number,
  idempotencyKey = `ava:${ctx.surface}:${ctx.playerId}:${session.commandsRead}:${entity.action?.kind === "directive" ? entity.action.choiceId : entity.id}`,
): AvaNexusExecutionResult => {
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
    idempotencyKey,
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

const originForSurface = (
  surface: PlayerContext["surface"],
): AvaRequestIR["origin"] =>
  surface === "web"
    ? "browser-text"
    : surface === "ssh"
      ? "ssh"
      : surface === "mcp"
        ? "mcp"
        : surface === "internal"
          ? "internal"
          : "terminal";

const terminalPresentation = (
  text: string,
  terminalResult?: AvaTerminalResult,
): AvaResponseEnvelope["presentation"] => ({
  text,
  report: terminalResult?.report,
  navigate: terminalResult?.navigate,
  outputKind: terminalResult?.outputKind,
  clearScreen: terminalResult?.clearScreen,
  aphorismViewIds: terminalResult?.aphorismViewIds,
  download: terminalResult?.download,
});

const withEnvelope = (
  request: AvaRequestIR,
  result: AvaNexusExecutionResult,
  options: {
    compile?: AvaCompileResult;
    terminalResult?: AvaTerminalResult;
  } = {},
): AvaNexusResult => {
  const semantic =
    request.kind === "instruction" ? request.semantic : undefined;
  const trace = request.kind === "instruction" ? request.trace : undefined;
  const compile = options.compile ?? result.compile;
  return {
    ...result,
    compile,
    terminalResult: options.terminalResult ?? result.terminalResult,
    envelope: {
      requestKind: request.kind,
      instructionKind:
        request.kind === "instruction"
          ? request.instruction.kind
          : undefined,
      semantic,
      trace,
      compile,
      response: result.response,
      presentation: terminalPresentation(
        result.text,
        options.terminalResult ?? result.terminalResult,
      ),
    },
  };
};

const responseFailure = (
  state: GameState,
  session: AvaNexusSession,
  status: SemanticResponse<unknown>["status"],
  code: string,
  instruction: string,
  variant = session.terminal.voiceCursor,
): AvaNexusExecutionResult => {
  const response: SemanticResponse<unknown> = {
    status,
    fact: { code },
    rendering: {
      compact: code.replaceAll("_", " "),
      brief: instruction,
    },
    recovery: {
      code,
      instruction,
      validExamples: ["help", "missions", "what should I do"],
    },
    campaignRevision: revisionOf(state),
  };
  return {
    state,
    session,
    response,
    text: responseText(
      state,
      response,
      { mode: "rejection", label: status === "AMBIGUOUS" ? "CLARIFICATION" : "REJECTION" },
      variant,
    ),
  };
};

const resultFromTerminal = (
  state: GameState,
  session: AvaNexusSession,
  instruction: AvaInstruction,
  terminalResult: AvaTerminalResult,
): AvaNexusExecutionResult => ({
  state: terminalResult.state,
  session: { ...session, terminal: terminalResult.session },
  response: oldAvaResponse(state, terminalResult, instruction),
  text: terminalResult.text,
  terminalResult,
});

const isConsequentialInstruction = (instruction: AvaInstruction) =>
  [
    "SELECT",
    "STAGE",
    "UNSTAGE",
    "ISSUE",
    "ISSUE_PLAN",
    "COMMIT",
    "CONFIRM",
    "CANCEL",
    "RESOLVE_DAY",
  ].includes(instruction.kind);

const directiveActions = (actions: readonly AvaActionRef[]) =>
  actions.filter(
    (action): action is Extract<AvaActionRef, { kind: "directive" }> =>
      action.kind === "directive",
  );

const typedExecutionPayloadHash = (
  request: Extract<AvaRequestIR, { kind: "action" | "plan" }>,
) => {
  const actions =
    request.kind === "action" ? [request.action] : request.actions;
  const payload = `${request.kind}:${actions.map(actionKey).join("|")}`;
  return `ava_${hashInt(payload).toString(16).padStart(8, "0")}`;
};

const priorTypedExecution = (
  request: Extract<AvaRequestIR, { kind: "action" | "plan" }>,
  ctx: PlayerContext,
  state: GameState,
) =>
  request.idempotencyKey
    ? (state.avaExecutions ?? []).find(
        (record) =>
          record.playerId === ctx.playerId &&
          record.campaignId === ctx.campaignId &&
          record.idempotencyKey === request.idempotencyKey,
      )
    : undefined;

const instructionActions = (
  instruction: AvaInstruction,
  session: AvaNexusSession,
): AvaActionRef[] => {
  if (
    instruction.kind === "SELECT" ||
    instruction.kind === "COMMIT"
  )
    return instruction.entity?.action ? [instruction.entity.action] : [];
  if (
    instruction.kind === "STAGE" ||
    instruction.kind === "UNSTAGE" ||
    instruction.kind === "ISSUE"
  )
    return instruction.entities.flatMap((entity) =>
      entity.action ? [entity.action] : [],
    );
  if (instruction.kind === "ISSUE_PLAN") return session.terminal.plan;
  return [];
};

const clearLegacyDirectiveAuthority = (
  session: AvaNexusSession,
): {
  session: AvaNexusSession;
  clearedConfirmation: boolean;
  clearedPlan: boolean;
} => {
  const confirmationHasDirective =
    session.terminal.confirmation?.plan.actions.some(
      (action) => action.kind === "directive",
    ) ?? false;
  const planHasDirective = session.terminal.plan.some(
    (action) => action.kind === "directive",
  );
  if (!confirmationHasDirective && !planHasDirective)
    return {
      session,
      clearedConfirmation: false,
      clearedPlan: false,
    };
  return {
    session: {
      ...session,
      terminal: {
        ...session.terminal,
        confirmation: confirmationHasDirective
          ? null
          : session.terminal.confirmation,
        plan: planHasDirective
          ? session.terminal.plan.filter(
              (action) => action.kind !== "directive",
            )
          : session.terminal.plan,
      },
    },
    clearedConfirmation: confirmationHasDirective,
    clearedPlan: planHasDirective,
  };
};

const validateResolutionGrant = (
  ctx: PlayerContext,
  state: GameState,
  session: AvaNexusSession,
  grant?: AvaResolutionGrant,
  executionOptions: AvaNexusExecutionOptions = {},
): string | null => {
  if (
    ctx.surface !== "internal" ||
    executionOptions.resolutionAuthority !== "persisted-redemption"
  )
    return "SERVER_REDEMPTION_REQUIRED";
  if (!grant) return "DAY_RESOLUTION_GRANT_REQUIRED";
  if (
    !grant.grantId ||
    grant.campaignId !== state.campaignId ||
    grant.campaignDay !== state.day ||
    !grant.accountDayKey
  )
    return "DAY_RESOLUTION_GRANT_MISMATCH";
  if (session.consumedResolutionGrantIds.includes(grant.grantId))
    return "DAY_RESOLUTION_GRANT_CONSUMED";
  return null;
};

const sessionAfterResolutionGrant = (
  session: AvaNexusSession,
  grant?: AvaResolutionGrant,
) =>
  grant
    ? {
        ...session,
        consumedResolutionGrantIds: [
          ...session.consumedResolutionGrantIds,
          grant.grantId,
        ].slice(-32),
      }
    : session;

const requireExecutionAuthority = (
  ctx: PlayerContext,
  session: AvaNexusSession,
): string | null => {
  if (ctx.authority !== "command") return "COMMAND_AUTHORITY_REQUIRED";
  if (!session.interactive) return "INTERACTIVE_CONFIRM_REQUIRED";
  return null;
};

const syntheticEntity = (action: AvaActionRef): AvaEntity => ({
  id:
    action.kind === "directive"
      ? `directive:${action.familyId}:${action.choiceId}`
      : action.kind === "maneuver"
        ? `maneuver:${action.maneuverId}`
        : action.kind === "sub-mission"
          ? `${action.domain}:${action.missionId}:${action.optionId}`
          : action.kind === "opportunity-response"
            ? `opportunity:${action.opportunityId}:${action.responseId}`
            : action.kind === "doctrine-stage"
              ? `doctrine:${action.vectorId}:${action.stageId}`
              : "resolve-day",
  kind:
    action.kind === "directive"
      ? "directive"
      : action.kind === "maneuver"
        ? "maneuver"
        : action.kind === "sub-mission"
          ? "sub-mission-option"
          : action.kind === "opportunity-response"
            ? "opportunity-response"
            : action.kind === "doctrine-stage"
              ? "doctrine-stage"
              : "resolution-record",
  label:
    action.kind === "directive"
      ? action.choiceId
      : action.kind === "maneuver"
        ? action.maneuverId
        : action.kind === "sub-mission"
          ? action.optionId
          : action.kind === "opportunity-response"
            ? action.responseId
            : action.kind === "doctrine-stage"
              ? action.stageId
              : "Resolve day",
  action,
});

const directiveBindingFor = (
  query: AvaSemanticQuery,
): AvaDirectiveBinding | undefined =>
  (
    query as AvaSemanticQuery & {
      directive?: AvaDirectiveBinding;
    }
  ).directive;

const directiveJudgment = (
  ctx: PlayerContext,
  state: GameState,
  session: AvaNexusSession,
  query: AvaSemanticQuery,
  entities: AvaEntity[],
): AvaNexusExecutionResult => {
  const binding = directiveBindingFor(query);
  if (!binding)
    return responseFailure(
      state,
      session,
      "AMBIGUOUS",
      "DIRECTIVE_CONTEXT_REQUIRED",
      "Name production, military, or diplomacy and its actor.",
    );
  const actorId =
    binding.channel === "diplomacy" ? binding.actorId : undefined;
  if (
    binding.channel === "diplomacy" &&
    (!actorId || !state.actors.some((actor) => actor.id === actorId))
  )
    return responseFailure(
      state,
      session,
      "AMBIGUOUS",
      "DIPLOMACY_ACTOR_REQUIRED",
      "Name exactly one current diplomacy actor.",
    );
  const ranked = rankVisibleChoices(
    ctx,
    state,
    binding.channel,
    actorId,
    postureFor(query),
  );
  const labelByChoice = new Map<string, string>();
  for (const entity of entities)
    if (entity.action?.kind === "directive")
      labelByChoice.set(entity.action.choiceId, entity.label);
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
    ranked.state,
    `JUDGMENT / ${binding.channel.toUpperCase()}\n${judgment}\n\nThe ranking is deterministic against the supplied strategic posture. No order was prepared or issued.`,
    {
      topic: binding.channel,
      label: "JUDGMENT",
      variant: session.terminal.voiceCursor,
    },
  );
  return {
    state: ranked.state,
    session: {
      ...session,
      currentModule: moduleForChannel(binding.channel),
      terminal: {
        ...session.terminal,
        voiceCursor: session.terminal.voiceCursor + 1,
        lastText: text,
      },
    },
    response: ranked.response,
    text,
  };
};

const executeConfirmation = (
  request: Extract<AvaRequestIR, { kind: "confirmation" }>,
  ctx: PlayerContext,
  state: GameState,
  session: AvaNexusSession,
  opportunityFraction: number,
  executionOptions: AvaNexusExecutionOptions,
): AvaNexusExecutionResult => {
  const authorityIssue = requireExecutionAuthority(ctx, session);
  if (authorityIssue)
    return responseFailure(
      state,
      session,
      "CONFIRMATION_REQUIRED",
      authorityIssue,
      "Only an interactive command session can confirm a prepared effect.",
    );
  const sanitized = clearLegacyDirectiveAuthority(session);
  if (sanitized.clearedConfirmation)
    return responseFailure(
      state,
      sanitized.session,
      "REJECTED",
      "LEGACY_DIRECTIVE_CONFIRMATION_BLOCKED",
      "A directive must be prepared and confirmed through the canonical order service.",
    );
  session = sanitized.session;
  const suppliedToken = request.token?.trim();
  const substrateToken =
    suppliedToken?.startsWith("prp_") ||
    (suppliedToken && suppliedToken === session.proposalToken)
      ? suppliedToken
      : !suppliedToken
        ? session.proposalToken
        : undefined;
  const legacy = session.terminal.confirmation;
  if (!suppliedToken && substrateToken && legacy)
    return responseFailure(
      state,
      session,
      "AMBIGUOUS",
      "MULTIPLE_CONFIRMATIONS",
      "Name the proposal token to confirm exactly one prepared effect.",
    );
  if (substrateToken) {
    const confirmed = confirmOrder(
      ctx,
      state,
      substrateToken,
      request.idempotencyKey ??
        `ava-confirm:${ctx.surface}:${ctx.playerId}:${session.commandsRead}:${substrateToken}`,
    );
    const nextSession =
      confirmed.response.status === "EXECUTED" ||
      confirmed.response.status === "ALREADY_EXECUTED"
        ? {
            ...session,
            proposalToken: undefined,
            proposalExpiresAt: undefined,
          }
        : session;
    return {
      state: confirmed.state,
      session: nextSession,
      response: confirmed.response,
      text: responseText(
        confirmed.state,
        confirmed.response,
        confirmed.response.status === "EXECUTED"
          ? { mode: "receipt" }
          : { mode: "rejection" },
        session.terminal.voiceCursor,
      ),
    };
  }
  if (
    !legacy ||
    (suppliedToken &&
      suppliedToken.toUpperCase() !== legacy.id.toUpperCase())
  )
    return responseFailure(
      state,
      session,
      "CONFIRMATION_REQUIRED",
      "NO_MATCHING_CONFIRMATION",
      "No prepared effect matches that confirmation.",
    );
  const resolvesDay = legacy.plan.actions.some(
    (action) => action.kind === "resolve-day",
  );
  if (resolvesDay) {
    const grantIssue = validateResolutionGrant(
      ctx,
      state,
      session,
      request.resolutionGrant,
      executionOptions,
    );
    if (grantIssue)
      return responseFailure(
        state,
        session,
        "FORBIDDEN",
        grantIssue,
        "Claim the current account day before resolving the campaign day.",
      );
  }
  const instruction: AvaInstruction = {
    kind: "CONFIRM",
    token: legacy.id.toUpperCase(),
  };
  const terminalResult = runAvaInstruction(
    state,
    session.terminal,
    instruction,
    opportunityFraction,
  );
  let nextSession = {
    ...session,
    terminal: terminalResult.session,
  };
  if (terminalResult.executed && resolvesDay)
    nextSession = sessionAfterResolutionGrant(
      nextSession,
      request.resolutionGrant,
    );
  return resultFromTerminal(
    state,
    nextSession,
    instruction,
    terminalResult,
  );
};

const executeCancellation = (
  request: Extract<AvaRequestIR, { kind: "cancellation" }>,
  ctx: PlayerContext,
  state: GameState,
  session: AvaNexusSession,
  opportunityFraction: number,
): AvaNexusExecutionResult => {
  const authorityIssue = requireExecutionAuthority(ctx, session);
  if (authorityIssue)
    return responseFailure(
      state,
      session,
      "FORBIDDEN",
      authorityIssue,
      "Only an interactive command session can cancel a prepared effect.",
    );
  const token = request.token?.trim() || session.proposalToken;
  if (token) {
    const cancelled = cancelPreparedOrder(ctx, state, token);
    return {
      state: cancelled.state,
      session:
        cancelled.response.status === "OK"
          ? {
              ...session,
              proposalToken: undefined,
              proposalExpiresAt: undefined,
            }
          : session,
      response: cancelled.response,
      text: responseText(
        cancelled.state,
        cancelled.response,
        cancelled.response.status === "OK"
          ? { mode: "acknowledgment", label: "ORDER WITHHELD" }
          : { mode: "rejection" },
        session.terminal.voiceCursor,
      ),
    };
  }
  const instruction: AvaInstruction = { kind: "CANCEL" };
  const terminalResult = runAvaInstruction(
    state,
    session.terminal,
    instruction,
    opportunityFraction,
  );
  return resultFromTerminal(
    state,
    { ...session, terminal: terminalResult.session },
    instruction,
    terminalResult,
  );
};

const SEMANTIC_DESCRIPTOR_KINDS = new Set([
  "report",
  "status",
  "list",
  "module",
  "help",
  "shell",
  "forecast",
  "confirmation",
  "explain",
]);

const semanticDescriptor = (
  value: string,
): { kind: string; payload: Record<string, unknown> } | null => {
  const separator = value.indexOf(":");
  if (separator < 1) return null;
  const kind = value.slice(0, separator);
  if (!SEMANTIC_DESCRIPTOR_KINDS.has(kind)) return null;
  try {
    const payload = JSON.parse(value.slice(separator + 1));
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? { kind, payload: payload as Record<string, unknown> }
      : null;
  } catch {
    return null;
  }
};

const overlayTargetIssue = (
  query: AvaSemanticQuery,
  entities: readonly AvaEntity[],
): string | null => {
  if (!query.overlays.length) return null;
  const normalizeTarget = (value: string) => normalize(value);
  const exactTargets = new Set<string>();
  const tokenTargets = new Set([
    "main",
    "domestic",
    "network",
    "production",
    "readiness",
    "materiel",
    "military",
    "desertion",
    "intelligence",
    "legitimacy",
    "resistance",
    "treasury",
    "front",
    "supply",
    "equipment",
    "munitions",
    "armor",
    "flight",
    "drones",
    "enemy attack",
  ]);
  for (const entity of entities) {
    for (const candidate of [
      entity.id,
      entity.label,
      entity.handle,
      ...(entity.aliases ?? []),
    ])
      if (candidate) exactTargets.add(normalizeTarget(candidate));
  }
  for (const target of tokenTargets) exactTargets.add(target);
  for (const overlay of query.overlays) {
    const target = normalizeTarget(overlay.target);
    const exact = exactTargets.has(target);
    const knownToken = [...tokenTargets].some(
      (candidate) =>
        target === candidate ||
        target.startsWith(`${candidate} `) ||
        target.endsWith(` ${candidate}`),
    );
    const valid =
      overlay.kind === "REMOVE_ENTITY"
        ? exact
        : overlay.kind === "EXPECT_EVENT"
          ? target === "enemy attack" || exact
          : exact || knownToken;
    if (!valid)
      return `Overlay target ${overlay.target} is not in its declared live target domain.`;
  }
  return null;
};

const instructionForSemanticQuery = (
  query: AvaSemanticQuery,
  entities: readonly AvaEntity[],
): AvaInstruction | null => {
  const ids = query.subject.entityIds;
  const descriptor = ids.length === 1 ? semanticDescriptor(ids[0]) : null;
  const entity =
    ids.length === 1
      ? entities.find((candidate) => candidate.id === ids[0])
      : undefined;
  if (query.operation === "PREDICT" && query.subject.type === "CAMPAIGN_CHOICE") {
    if (descriptor?.kind === "forecast" && descriptor.payload.plan === true)
      return { kind: "FORECAST", plan: true };
    if (entity?.action) return { kind: "FORECAST", entity };
    if (!ids.length) return { kind: "FORECAST" };
    return null;
  }
  if (query.operation === "SUMMARIZE" && query.subject.type === "REPORT") {
    if (descriptor?.kind === "status") return { kind: "STATUS" };
    if (descriptor?.kind !== "report") return null;
    const { topic, days, scope } = descriptor.payload;
    const reportTopics = new Set<AvaReportTopic>([
      "overview",
      "daily-brief",
      "operations",
      "losses",
      "personnel",
      "retrospective",
      "production",
      "resources",
      "projection",
      "domestic",
      "network",
      "military",
      "diplomacy",
      "doctrine",
      "intelligence",
      "adversary",
      "effects",
      "decision-ledger",
      "opportunities",
      "service-record",
    ]);
    if (typeof topic !== "string" || !reportTopics.has(topic as AvaReportTopic))
      return null;
    if (
      days !== undefined &&
      (typeof days !== "number" ||
        !Number.isInteger(days) ||
        days < 1 ||
        days > 30)
    )
      return null;
    if (
      scope !== undefined &&
      scope !== "current" &&
      ![
        "campaign",
        "national",
        "military",
        "diplomacy",
        "doctrine",
        "account",
        "wiki",
      ].includes(String(scope))
    )
      return null;
    return {
      kind: "REPORT",
      topic: topic as AvaReportTopic,
      days: days as number | undefined,
      scope: scope as AvaModule | "current" | undefined,
    };
  }
  if (query.operation === "LIST" && query.subject.type === "CAMPAIGN_CHOICE") {
    if (descriptor?.kind !== "list") return { kind: "LIST" };
    const scope = descriptor.payload.scope;
    if (scope === "orders") return { kind: "ORDERS" };
    return typeof scope === "string"
      ? { kind: "LIST", scope }
      : { kind: "LIST" };
  }
  if (query.operation === "INSPECT" && query.subject.type === "SYSTEM") {
    if (!ids.length) return { kind: "HELP" };
    if (descriptor?.kind === "module") {
      const targetModule = descriptor.payload.module;
      return typeof targetModule === "string" &&
        [
          "campaign",
          "national",
          "military",
          "diplomacy",
          "doctrine",
          "account",
          "wiki",
        ].includes(targetModule)
        ? { kind: "OPEN", module: targetModule as AvaModule }
        : null;
    }
    if (descriptor?.kind === "help")
      return typeof descriptor.payload.subject === "string"
        ? { kind: "HELP", subject: descriptor.payload.subject }
        : null;
    if (descriptor?.kind === "shell") {
      const shell = descriptor.payload;
      return typeof shell.command === "string" &&
        Array.isArray(shell.args) &&
        shell.args.every((argument) => typeof argument === "string") &&
        typeof shell.raw === "string"
        ? { kind: "SHELL", shell: shell as AvaShellInstruction }
        : null;
    }
    return null;
  }
  if (
    query.operation === "EXPLAIN" &&
    (query.subject.type === "METRIC" ||
      query.subject.type === "MISSION_OBJECTIVE" ||
      query.subject.type === "CAMPAIGN_CHOICE" ||
      query.subject.type === "SYSTEM")
  ) {
    const explainedEntity = ids
      .map((id) => entities.find((candidate) => candidate.id === id))
      .find(Boolean);
    const explainDescriptor = ids
      .map(semanticDescriptor)
      .find((candidate) => candidate?.kind === "explain");
    if (!explainedEntity || !explainDescriptor) return null;
    const facet = explainDescriptor.payload.facet;
    if (
      facet !== "meaning" &&
      facet !== "effects" &&
      facet !== "levers" &&
      facet !== "calculus"
    )
      return null;
    return {
      kind: "EXPLAIN",
      entity: explainedEntity,
      facet,
    };
  }
  return null;
};

const executeInstructionRequest = (
  request: Extract<AvaRequestIR, { kind: "instruction" }>,
  ctx: PlayerContext,
  state: GameState,
  session: AvaNexusSession,
  opportunityFraction: number,
  darkNetContext: AvaDarkNetContext,
  executionOptions: AvaNexusExecutionOptions,
): AvaNexusExecutionResult => {
  const visible = compileVisibleAvaContext(
    ctx,
    state,
    opportunityFraction,
  );
  state = visible.state;
  const instruction = request.instruction;
  const semanticValidation = validateAvaSemanticQuery(request.semantic);
  if (!semanticValidation.ok)
    return responseFailure(
      state,
      session,
      "AMBIGUOUS",
      "MALFORMED_SEMANTIC_QUERY",
      `The typed semantic request is incomplete: ${semanticValidation.issues.join("; ")}.`,
    );
  const semantic = semanticValidation.query;
  const liveEntityIds = new Set(visible.entities.map((entity) => entity.id));
  const unresolvedEntityIds = semantic.subject.entityIds.filter(
    (entityId) =>
      !liveEntityIds.has(entityId) && !semanticDescriptor(entityId),
  );
  if (
    unresolvedEntityIds.length ||
    (semantic.operation === "COMPARE" &&
      semantic.subject.type === "CAMPAIGN_CHOICE" &&
      semantic.subject.entityIds.length !== 2)
  )
    return responseFailure(
      state,
      session,
      "AMBIGUOUS",
      "UNRESOLVED_SEMANTIC_TARGET",
      unresolvedEntityIds.length
        ? `These semantic targets are not in the current visible ontology: ${unresolvedEntityIds.join(", ")}.`
        : "COMPARE requires exactly two current visible targets.",
    );
  const overlayIssue = overlayTargetIssue(semantic, visible.entities);
  if (overlayIssue)
    return responseFailure(
      state,
      session,
      "AMBIGUOUS",
      "UNRESOLVED_OVERLAY_TARGET",
      overlayIssue,
    );
  const capability = AVA_CAPABILITY_REGISTRY.resolve(
    semantic.operation,
    semantic.subject.type,
  );
  if (!capability)
    return responseFailure(
      state,
      session,
      "AMBIGUOUS",
      "UNSUPPORTED_SEMANTIC_CAPABILITY",
      `${semantic.operation} does not have a handler for ${semantic.subject.type}.`,
    );
  if (
    isConsequentialInstruction(instruction) &&
    semantic.polarity === "NEGATED"
  )
    return responseFailure(
      state,
      session,
      "REJECTED",
      "NEGATED_CONSEQUENTIAL_REQUEST",
      "A negated semantic request can never authorize or prepare an effect.",
    );
  if (
    isConsequentialInstruction(instruction) &&
    ctx.authority !== "command"
  )
    return responseFailure(
      state,
      session,
      "FORBIDDEN",
      "COMMAND_AUTHORITY_REQUIRED",
      "Observer and staff sessions cannot prepare, execute, confirm, or cancel effects.",
    );
  if (instruction.kind === "CONFIRM" || instruction.kind === "COMMIT")
    return executeConfirmation(
      {
        kind: "confirmation",
        origin: request.origin,
        token:
          instruction.kind === "CONFIRM"
            ? instruction.token
            : undefined,
        expectedStateSeal: request.expectedStateSeal,
      },
      ctx,
      state,
      session,
      opportunityFraction,
      executionOptions,
    );
  if (instruction.kind === "CANCEL")
    return executeCancellation(
      {
        kind: "cancellation",
        origin: request.origin,
        expectedStateSeal: request.expectedStateSeal,
      },
      ctx,
      state,
      session,
      opportunityFraction,
    );

  if (instruction.kind === "SEMANTIC") {
    if (capability.handler === "directive-rank")
      return directiveJudgment(
        ctx,
        state,
        session,
        semantic,
        visible.entities,
      );
    if (capability.handler === "terminal-instruction") {
      const lowered = instructionForSemanticQuery(
        semantic,
        visible.entities,
      );
      if (!lowered)
        return responseFailure(
          state,
          session,
          "AMBIGUOUS",
          "SEMANTIC_LOWERING_UNAVAILABLE",
          "That semantic cell lacks the typed operands required by its handler.",
        );
      return executeInstructionRequest(
        { ...request, instruction: lowered },
        ctx,
        state,
        session,
        opportunityFraction,
        darkNetContext,
        executionOptions,
      );
    }
  }

  if (instruction.kind === "LIST") {
    const channel =
      instruction.scope === "production"
        ? "production"
        : instruction.scope === "military"
          ? "military"
          : instruction.scope === "diplomacy"
            ? "diplomacy"
            : null;
    if (channel) {
      const explicitActor =
        channel === "diplomacy"
          ? actorForLanguage(request.rawInput, state)
          : undefined;
      if (
        channel === "diplomacy" &&
        request.rawInput.trim().split(/\s+/).length > 1 &&
        !explicitActor
      )
        return responseFailure(
          state,
          session,
          "AMBIGUOUS",
          "UNKNOWN_DIPLOMACY_ACTOR",
          "Name one current diplomacy actor.",
        );
      const actorId =
        channel === "diplomacy"
          ? explicitActor ?? state.actors[0]?.id
          : undefined;
      const docket = getVisibleDocket(ctx, state, channel, actorId);
      const text = voiceAvaResponse(
        docket.state,
        docketText(docket.response.fact),
        {
          topic: channel,
          variant: session.terminal.voiceCursor,
        },
      );
      return {
        state: docket.state,
        session: {
          ...session,
          currentModule: moduleForChannel(channel),
          terminal: {
            ...session.terminal,
            lastText: text,
            voiceCursor: session.terminal.voiceCursor + 1,
          },
        },
        response: docket.response,
        text,
      };
    }
  }

  const actions = instructionActions(instruction, session);
  const directives = directiveActions(actions);
  if (directives.length) {
    if (actions.length !== 1 || directives.length !== 1) {
      const cleared = clearLegacyDirectiveAuthority(session).session;
      return responseFailure(
        state,
        cleared,
        "REJECTED",
        "MIXED_DIRECTIVE_PLAN_BLOCKED",
        "Prepare exactly one directive. Directives cannot share a legacy action plan.",
      );
    }
    if (
      instruction.kind !== "SELECT" &&
      instruction.kind !== "STAGE" &&
      instruction.kind !== "ISSUE" &&
      instruction.kind !== "ISSUE_PLAN"
    )
      return responseFailure(
        state,
        session,
        "REJECTED",
        "DIRECTIVE_AUTHORITY_PATH_REQUIRED",
        "Prepare the directive through its canonical order record.",
      );
    if (ctx.authority !== "command")
      return responseFailure(
        state,
        session,
        "FORBIDDEN",
        "COMMAND_AUTHORITY_REQUIRED",
        "Observer and staff sessions cannot prepare directives.",
      );
    const entity =
      directiveEntityForInstruction(instruction, session) ??
      syntheticEntity(directives[0]);
    return prepareDirective(
      ctx,
      state,
      session,
      entity,
      session.terminal.voiceCursor,
      `ava-instruction:${request.origin}:${ctx.playerId}:${request.expectedStateSeal}:${directives[0].choiceId}`,
    );
  }

  const terminalResult = runAvaInstruction(
    state,
    session.terminal,
    instruction,
    opportunityFraction,
    request.semantic,
    request.trace,
    darkNetContext,
  );
  if (terminalResult.executed) {
    const authorityIssue = requireExecutionAuthority(ctx, session);
    if (authorityIssue)
      return responseFailure(
        state,
        session,
        "FORBIDDEN",
        authorityIssue,
        "The executed effect was rejected at the Nexus authority boundary.",
      );
  }
  return resultFromTerminal(
    state,
    { ...session, terminal: terminalResult.session },
    instruction,
    terminalResult,
  );
};

const executeActionOrPlanRequest = (
  request: Extract<AvaRequestIR, { kind: "action" | "plan" }>,
  ctx: PlayerContext,
  state: GameState,
  session: AvaNexusSession,
  opportunityFraction: number,
  executionOptions: AvaNexusExecutionOptions,
): AvaNexusExecutionResult => {
  const actions =
    request.kind === "action" ? [request.action] : request.actions;
  const directives = directiveActions(actions);
  if (directives.length && (actions.length !== 1 || directives.length !== 1))
    return responseFailure(
      state,
      session,
      "REJECTED",
      "MIXED_DIRECTIVE_PLAN_BLOCKED",
      "A directive must be issued as one canonical action, never inside a mixed or multi-directive plan.",
    );
  if (ctx.authority !== "command")
    return responseFailure(
      state,
      session,
      "FORBIDDEN",
      "COMMAND_AUTHORITY_REQUIRED",
      "Observer and staff sessions cannot prepare or execute actions.",
    );
  if (directives.length)
    return prepareDirective(
      ctx,
      state,
      session,
      syntheticEntity(directives[0]),
      session.terminal.voiceCursor,
      request.idempotencyKey ??
        `ava-request:${request.kind}:${request.origin}:${ctx.playerId}:${request.expectedStateSeal}:${directives[0].choiceId}`,
    );
  if (request.mode === "prepare") {
    const instruction: AvaInstruction = {
      kind: "ISSUE",
      entities: actions.map(syntheticEntity),
    };
    const terminalResult = runAvaInstruction(
      state,
      session.terminal,
      instruction,
      opportunityFraction,
    );
    return resultFromTerminal(
      state,
      { ...session, terminal: terminalResult.session },
      instruction,
      terminalResult,
    );
  }
  const authorityIssue = requireExecutionAuthority(ctx, session);
  if (authorityIssue)
    return responseFailure(
      state,
      session,
      "FORBIDDEN",
      authorityIssue,
      "One-shot and noninteractive sessions cannot execute actions.",
    );
  if (!request.idempotencyKey)
    return responseFailure(
      state,
      session,
      "REJECTED",
      "IDEMPOTENCY_KEY_REQUIRED",
      "Typed action and plan execution requires an idempotency key.",
    );
  const payloadHash = typedExecutionPayloadHash(request);
  const priorExecution = priorTypedExecution(request, ctx, state);
  if (priorExecution) {
    if (priorExecution.payloadHash !== payloadHash)
      return responseFailure(
        state,
        session,
        "REJECTED",
        "IDEMPOTENCY_CONFLICT",
        "That idempotency key is already bound to a different action payload.",
      );
    const replayResponse: SemanticResponse<unknown> = {
      status: "ALREADY_EXECUTED",
      fact: {
        actions,
        receipt: priorExecution.receipt,
      },
      rendering: {
        compact: "ALREADY EXECUTED",
        brief: priorExecution.receipt.join("\n"),
      },
      campaignRevision: revisionOf(state),
      auditId: priorExecution.auditId,
    };
    return {
      state,
      session,
      response: replayResponse,
      text: responseText(
        state,
        replayResponse,
        { mode: "receipt" },
        session.terminal.voiceCursor,
      ),
    };
  }
  const resolvesDay = actions.some((action) => action.kind === "resolve-day");
  if (resolvesDay) {
    const grantIssue = validateResolutionGrant(
      ctx,
      state,
      session,
      request.resolutionGrant,
      executionOptions,
    );
    if (grantIssue)
      return responseFailure(
        state,
        session,
        "FORBIDDEN",
        grantIssue,
        "Claim the current account day before resolving the campaign day.",
      );
  }
  const executed =
    request.kind === "action"
      ? executeAvaAction(state, request.action, opportunityFraction)
      : executeAvaPlan(
          state,
          buildAvaPlan(state, request.actions, opportunityFraction),
          opportunityFraction,
        );
  if (!executed.executed)
    return responseFailure(
      state,
      session,
      "REJECTED",
      "ACTION_REJECTED",
      executed.rejection ?? "The action could not be executed.",
    );
  const auditId = `ava_${hashInt(
    `${ctx.campaignId}:${ctx.playerId}:${request.idempotencyKey}:${payloadHash}`,
  )
    .toString(16)
    .padStart(8, "0")}`;
  const finalState: GameState = {
    ...executed.state,
    avaExecutions: [
      ...(executed.state.avaExecutions ?? []),
      {
        idempotencyKey: request.idempotencyKey,
        playerId: ctx.playerId,
        campaignId: ctx.campaignId,
        payloadHash,
        receipt: [...executed.receipt],
        auditId,
        executedAt: new Date(ctx.nowMs).toISOString(),
      },
    ],
  };
  const authorizedSession = resolvesDay
    ? sessionAfterResolutionGrant(session, request.resolutionGrant)
    : session;
  const nextSession: AvaNexusSession = {
    ...authorizedSession,
    terminal: {
      ...authorizedSession.terminal,
      confirmation: null,
      plan: [],
    },
  };
  const response: SemanticResponse<unknown> = {
    status: "EXECUTED",
    fact: {
      actions,
      receipt: executed.receipt,
    },
    rendering: {
      compact: actions.length === 1 ? "ACTION EXECUTED" : "PLAN EXECUTED",
      brief: executed.receipt.join("\n"),
    },
    campaignRevision: revisionOf(finalState),
    auditId,
  };
  return {
    state: finalState,
    session: nextSession,
    response,
    text: responseText(
      finalState,
      response,
      { mode: "receipt" },
      session.terminal.voiceCursor,
    ),
  };
};

const executeInternalRequest = (
  request: Extract<AvaRequestIR, { kind: "internal" }>,
  ctx: PlayerContext,
  state: GameState,
  session: AvaNexusSession,
): AvaNexusExecutionResult => {
  if (ctx.authority !== "command" || ctx.surface !== "internal")
    return responseFailure(
      state,
      session,
      "FORBIDDEN",
      "INTERNAL_AUTHORITY_REQUIRED",
      "Opportunity reconciliation is restricted to the internal Nexus adapter.",
    );
  let next = state;
  let status: "opened" | "expired" | "unchanged" = "unchanged";
  let packetId: string | undefined;
  if (request.operation === "force-opportunity") {
    next = forceOpportunityForCurrentDay(state);
    status = next === state ? "unchanged" : "opened";
    packetId = opportunityStatusForFraction(next, 0).packet?.id;
  } else if (request.operation === "record-opportunity-opened") {
    next = recordOpportunityOpened(state, request.packet);
    status = next === state ? "unchanged" : "opened";
    packetId = request.packet.id;
  } else if (request.operation === "record-opportunity-expired") {
    next = recordOpportunityExpired(state, request.packet);
    status = next === state ? "unchanged" : "expired";
    packetId = request.packet.id;
  } else {
    const opportunityFraction = (
      request as Extract<
        AvaRequestIR,
        { kind: "internal"; operation: "reconcile-opportunity" }
      >
    ).opportunityFraction;
    const opportunity = opportunityStatusForFraction(
      state,
      opportunityFraction,
    );
    const packet = opportunity.packet;
    packetId = packet?.id;
    if (packet && opportunity.status === "active") {
      const assignment = state.opportunityAssignments.find(
        (item) =>
          item.campaignId === state.campaignId &&
          item.day === state.day &&
          item.opportunityId === packet.id,
      );
      if (!assignment) {
        next = recordOpportunityOpened(state, packet);
        status = next === state ? "unchanged" : "opened";
      }
    } else if (
      packet &&
      opportunity.status === "expired" &&
      !state.opportunityHistory.some(
        (record) =>
          record.day === state.day &&
          record.opportunityId === packet.id,
      )
    ) {
      next = recordOpportunityExpired(state, packet);
      status = next === state ? "unchanged" : "expired";
    }
  }
  const response: SemanticResponse<unknown> = {
    status: "OK",
    fact: { operation: request.operation, status, packetId },
    rendering: {
      compact: `OPPORTUNITY ${status.toUpperCase()}`,
      brief:
        status === "unchanged"
          ? "The opportunity ledger already matches the current window."
          : `Opportunity ${packetId ?? ""} recorded as ${status}.`,
    },
    campaignRevision: revisionOf(next),
  };
  return {
    state: next,
    session,
    response,
    text: response.rendering.brief,
  };
};

export const runAvaNexusRequest = (
  untrustedRequest: AvaRequestIR,
  ctx: PlayerContext,
  state: GameState,
  session: AvaNexusSession,
  opportunityFraction = 0,
  darkNetContext: AvaDarkNetContext = {},
  executionOptions: AvaNexusExecutionOptions = {},
): AvaNexusResult => {
  const nextSession: AvaNexusSession = {
    ...session,
    terminal: { ...session.terminal },
    commandsRead: session.commandsRead + 1,
  };
  const validated = validateAvaRequestIR(untrustedRequest);
  if (!validated.ok) {
    const fallback: AvaRequestIR = {
      kind: "cancellation",
      origin: "internal",
      expectedStateSeal: avaRequestStateSeal(state),
    };
    return withEnvelope(
      fallback,
      responseFailure(
        state,
        nextSession,
        "AMBIGUOUS",
        "MALFORMED_AVA_REQUEST",
        `The typed Ava request is invalid: ${validated.issues.join("; ")}.`,
      ),
    );
  }
  const request = validated.request;
  const isTypedExecutionReplay =
    (request.kind === "action" || request.kind === "plan") &&
    request.mode === "execute" &&
    !!priorTypedExecution(request, ctx, state);
  if (
    request.expectedStateSeal !== avaRequestStateSeal(state) &&
    !isTypedExecutionReplay
  )
    return withEnvelope(
      request,
      responseFailure(
        state,
        nextSession,
        "STATE_CHANGED",
        "STATE_SEAL_MISMATCH",
        "Campaign state changed. Recompile or prepare the request again.",
      ),
    );
  if (
    request.kind === "instruction" &&
    isConsequentialInstruction(request.instruction)
  )
    nextSession.consequentialAttempts += 1;
  if (
    request.kind === "action" ||
    request.kind === "plan" ||
    request.kind === "confirmation" ||
    request.kind === "cancellation" ||
    request.kind === "internal"
  )
    nextSession.consequentialAttempts += 1;

  const execution =
    request.kind === "instruction"
      ? executeInstructionRequest(
          request,
          ctx,
          state,
          nextSession,
          opportunityFraction,
          darkNetContext,
          executionOptions,
        )
      : request.kind === "confirmation"
        ? executeConfirmation(
            request,
            ctx,
            state,
            nextSession,
            opportunityFraction,
            executionOptions,
          )
        : request.kind === "cancellation"
          ? executeCancellation(
              request,
              ctx,
              state,
              nextSession,
              opportunityFraction,
            )
          : request.kind === "action" || request.kind === "plan"
            ? executeActionOrPlanRequest(
                request,
                ctx,
                state,
                nextSession,
                opportunityFraction,
                executionOptions,
              )
            : executeInternalRequest(
                request,
                ctx,
                state,
                nextSession,
              );
  return withEnvelope(request, execution);
};

const exactDocketInstruction = (
  raw: string,
  input: string,
): AvaInstruction | null => {
  if (input === "production" || input === "prod")
    return { kind: "LIST", scope: "production" };
  if (input === "military" || input === "mil")
    return { kind: "LIST", scope: "military" };
  if (/^(diplomacy|diplo)(?:\s+.+)?$/.test(input))
    return { kind: "LIST", scope: "diplomacy" };
  void raw;
  return null;
};

export const runAvaNexusLine = (
  raw: string,
  ctx: PlayerContext,
  state: GameState,
  session: AvaNexusSession,
  opportunityFraction = 0,
  darkNetContext: AvaDarkNetContext = {},
): AvaNexusResult => {
  const input = normalize(raw);
  const expectedStateSeal = avaRequestStateSeal(state);
  const origin = originForSurface(ctx.surface);
  const confirmationMatch = input.match(/^confirm(?:\s+(.+))?$/);
  if (
    confirmationMatch ||
    isAvaConfirmationInput(input)
  )
    return runAvaNexusRequest(
      {
        kind: "confirmation",
        origin,
        token: confirmationMatch?.[1],
        expectedStateSeal,
      },
      ctx,
      state,
      session,
      opportunityFraction,
      darkNetContext,
    );
  if (input === "cancel" || input.startsWith("cancel "))
    return runAvaNexusRequest(
      {
        kind: "cancellation",
        origin,
        token: input.slice("cancel".length).trim() || undefined,
        expectedStateSeal,
      },
      ctx,
      state,
      session,
      opportunityFraction,
      darkNetContext,
    );

  const visible = compileVisibleAvaContext(
    ctx,
    state,
    opportunityFraction,
  );
  const docketInstruction = exactDocketInstruction(raw, input);
  const compile = docketInstruction
    ? null
    : compileAvaCommand(raw, {
        currentModule: session.currentModule,
        entities: visible.entities,
        discourse: session.terminal.discourse,
        shellFileReferences: avaShellFileReferences(
          visible.state,
          session.terminal.shell,
          opportunityFraction,
        ),
      });
  if (compile?.status === "clarify") {
    const nextSession = {
      ...session,
      commandsRead: session.commandsRead + 1,
    };
    const clarified = clarification(
      state,
      compile,
      session.terminal.voiceCursor,
    );
    const fallback = instructionAvaRequest({
      origin,
      rawInput: raw,
      instruction: { kind: "HELP" },
      semantic:
        compile.semantic ??
        compileAvaCommand("help", {
          currentModule: session.currentModule,
          entities: visible.entities,
        }).semantic!,
      trace: compile.trace,
      expectedStateSeal,
    });
    return withEnvelope(fallback, {
      state,
      session: nextSession,
      response: clarified.response,
      text: clarified.text,
      compile,
    }, { compile });
  }
  const instruction =
    docketInstruction ??
    (compile?.status === "compiled" ? compile.instruction : { kind: "HELP" as const });
  const semantic =
    compile?.status === "compiled"
      ? compile.semantic
      : docketInstruction
        ? genericSemanticQuery(docketInstruction, {
            currentModule: session.currentModule,
            entities: visible.entities,
            discourse: session.terminal.discourse,
          })
      : compileAvaCommand("help", {
          currentModule: session.currentModule,
          entities: visible.entities,
        }).semantic!;
  const request = instructionAvaRequest({
    origin,
    rawInput: raw,
    instruction,
    semantic,
    trace: compile?.status === "compiled" ? compile.trace : undefined,
    expectedStateSeal,
  });
  const result = runAvaNexusRequest(
    request,
    ctx,
    state,
    session,
    opportunityFraction,
    darkNetContext,
  );
  return {
    ...result,
    compile: compile ?? undefined,
    envelope: {
      ...result.envelope,
      compile: compile ?? undefined,
    },
  };
};

export const runAvaKernelLine = runAvaNexusLine;
