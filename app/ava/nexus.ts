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
} from "../substrate/services";
import { createCapabilityRegistry } from "../substrate/capability-registry";
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
import { formatPublicRating, publicDirectiveRating } from "./public-rating";
import { avaShellFileReferences } from "./filesystem";
import {
  initialAvaTerminalSession,
  runAvaInstruction,
  type AvaTerminalResult,
  type AvaTerminalSession,
} from "./terminal";
import {
  realizeAvaPresentation,
  voiceAvaResponse,
  type AvaRealizationMode,
  type AvaVoiceCue,
} from "./voice";
import type { AvaDarkNetContext } from "./darknet";
import {
  avaRequestStateSeal,
  instructionAvaRequest,
  validateAvaRequestIR,
  validateAvaSemanticQuery,
  type AvaDirectiveBinding,
  type AvaCognitiveActivationReceipt,
  type AvaRequestIR,
  type AvaResolutionGrant,
  type AvaResponseEnvelope,
} from "./request-ir";
import {
  actionKey,
  buildAvaPlan,
  descriptorForAction,
  executeAvaAction,
  executeAvaPlan,
} from "./runtime";
import {
  bindResponseProofToExecution,
  buildNexusProofGraph,
  composeCanonicalProofGraphs,
  type CanonicalProofGraph,
} from "./proof-graph";
import {
  cognitiveCausalGuidanceFor,
  cognitiveConstraintGuidanceFor,
  cognitiveDecisionGuidanceFor,
  cognitiveEpistemicGuidanceFor,
  cognitiveForecastGuidanceFor,
  cognitivePlanningGuidanceFor,
  cognitiveSemanticGuidanceFor,
  runAvaCognitiveNexus,
} from "./cognitive-nexus";
import { canonicalJson, cognitiveDigest } from "./cognitive-types";
import { avaVisibleWorldRevision } from "./world-model";
import { projectAvaDisclosedState } from "./projection";
import { buildAvaContextualLanguage } from "./contextual-language-projection";
import { projectAvaOperationalSemantics } from "./operational-semantics";
import { renderAvaOperationalSemantics } from "./operational-render";
import type { AvaOperationalSemanticResult } from "./operational-contracts";

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
  realizationMode: AvaRealizationMode;
  proposalToken?: string;
  proposalExpiresAt?: string;
  consumedResolutionGrantIds: string[];
  typedPreparations?: Array<{
    idempotencyKey: string;
    payloadHash: string;
    confirmationId: string;
  }>;
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
  proofGraph: CanonicalProofGraph;
  cognitiveActivation?: AvaCognitiveActivationReceipt;
  operationalSemantics?: AvaOperationalSemanticResult;
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
  realizationMode: "concise",
  consumedResolutionGrantIds: [],
  typedPreparations: [],
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
  const entities = avaEntitiesForState(
    projectAvaDisclosedState(next),
    opportunityFraction,
  ).filter(
    (entity) =>
      entity.action?.kind !== "directive" ||
      visibleChoiceIds.has(entity.action.choiceId),
  );
  return {
    state: next,
    entities,
    language: buildAvaContextualLanguage(next, entities),
  };
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

const directiveEntityIdsForDocket = (fact: DocketFact) =>
  fact.choices.map(
    (choice) => `directive:${choice.familyId}:${choice.choiceId}`,
  );

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
    ...(result.operationalSemantics
      ? { operationalSemantics: result.operationalSemantics }
      : {}),
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

type AvaNexusExecutionResult = Omit<
  AvaNexusResult,
  "envelope" | "proofGraph" | "cognitiveActivation"
> & {
  cognition?: {
    cognitiveActivation: AvaCognitiveActivationReceipt;
    proofGraph: CanonicalProofGraph;
    cognitiveDecision?: {
      executionDigest: string;
      decisionDigest: string;
      winnerId: string;
      ranking: readonly string[];
    };
  };
};

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
  chatExport: terminalResult?.chatExport,
  archiveRequest: terminalResult?.archiveRequest,
});

const withEnvelope = (
  request: AvaRequestIR,
  result: AvaNexusExecutionResult,
  options: {
    compile?: AvaCompileResult;
    terminalResult?: AvaTerminalResult;
  } = {},
): AvaNexusResult => {
  const realizedBaseText = realizeAvaPresentation(
    result.state,
    result.text,
    result.session.realizationMode,
    {
      interaction:
        request.kind === "instruction"
          ? request.trace?.interaction ?? "explicit"
          : "explicit",
      preserveCanonical:
        request.kind === "instruction" &&
        request.instruction.kind === "REPORT" &&
        request.instruction.topic === "daily-brief" &&
        request.instruction.canonical === true,
    },
  );
  const realizedText = result.operationalSemantics
    ? `${realizedBaseText}\n\n${renderAvaOperationalSemantics(result.operationalSemantics)}`
    : realizedBaseText;
  const voicedText = voiceAvaResponse(
    result.state,
    realizedText,
    {
      utterance:
        request.kind === "instruction" ? request.rawInput : undefined,
      variant: result.session.terminal.voiceCursor,
    },
  );
  result = {
    ...result,
    text: voicedText,
    response: {
      ...result.response,
      rendering: { ...result.response.rendering, brief: voicedText },
    },
    ...(result.terminalResult
      ? { terminalResult: { ...result.terminalResult, text: voicedText } }
      : {}),
    session: {
      ...result.session,
      terminal: { ...result.session.terminal, lastText: voicedText },
    },
  };
  const { cognition, ...publicResult } = result;
  const semantic =
    request.kind === "instruction" ? request.semantic : undefined;
  const trace = request.kind === "instruction" ? request.trace : undefined;
  const compile = options.compile ?? result.compile;
  const terminalResult = options.terminalResult ?? result.terminalResult;
  const responseProofGraph =
    terminalResult?.proofGraph ??
    buildNexusProofGraph({
      worldRevision:
        cognition?.proofGraph.worldRevision ??
        avaVisibleWorldRevision(result.state),
      request:
        request.kind === "action"
          ? {
              ...request,
              action:
                request.action.kind === "sub-mission"
                  ? {
                      kind: request.action.kind,
                      domain: request.action.domain,
                      missionId: request.action.missionId,
                      optionId: request.action.optionId,
                    }
                  : request.action,
            }
          : request.kind === "plan"
            ? {
                ...request,
                actions: request.actions.map((action) =>
                  action.kind === "sub-mission"
                    ? {
                        kind: action.kind,
                        domain: action.domain,
                        missionId: action.missionId,
                        optionId: action.optionId,
                      }
                    : action,
                ),
              }
            : request,
      response: result.response,
      cognitiveDecision: cognition?.cognitiveDecision,
    });
  const boundResponseProofGraph = cognition
    ? bindResponseProofToExecution(
        responseProofGraph,
        cognition.proofGraph.executionDigest ?? "",
      )
    : responseProofGraph;
  const proofGraph = cognition
    ? composeCanonicalProofGraphs(
        boundResponseProofGraph,
        cognition.proofGraph,
      )
    : boundResponseProofGraph;
  const retainedTerminalResult =
    terminalResult && cognition
      ? { ...terminalResult, proofGraph }
      : terminalResult;
  return {
    ...publicResult,
    compile,
    terminalResult: retainedTerminalResult,
    proofGraph,
    cognitiveActivation: cognition?.cognitiveActivation,
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
      proofGraph,
      cognitiveActivation: cognition?.cognitiveActivation,
      operationalSemantics: result.operationalSemantics,
      presentation: terminalPresentation(
        result.text,
        retainedTerminalResult,
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
  ...(terminalResult.operationalSemantics
    ? { operationalSemantics: terminalResult.operationalSemantics }
    : {}),
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
    "CLEAR",
    "CLEAR_PLAN",
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
  return `ava_${cognitiveDigest({
    binding: "AVA_TYPED_EXECUTION_PAYLOAD_V2",
    requestKind: request.kind,
    mode: request.mode,
    actions,
  })}`;
};

const legacyTypedExecutionPayloadHash = (
  request: Extract<AvaRequestIR, { kind: "action" | "plan" }>,
) => {
  const actions =
    request.kind === "action" ? [request.action] : request.actions;
  const payload = `${request.kind}:${actions.map(actionKey).join("|")}`;
  return `ava_${hashInt(payload).toString(16).padStart(8, "0")}`;
};

const typedExecutionPayloadMatches = (
  stored: string,
  request: Extract<AvaRequestIR, { kind: "action" | "plan" }>,
) => {
  if (stored === typedExecutionPayloadHash(request)) return true;
  const actions =
    request.kind === "action" ? [request.action] : request.actions;
  // The historical 32-bit format did not bind the opaque sub-mission ticket
  // (or its domain), so accepting it for that action class would turn a stale
  // or forged ticket into an idempotent replay. Other historical action keys
  // were complete, and remain replay-compatible during migration.
  return (
    /^ava_[a-f0-9]{8}$/.test(stored) &&
    actions.every((action) => action.kind !== "sub-mission") &&
    stored === legacyTypedExecutionPayloadHash(request)
  );
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
  if (instruction.kind === "RESOLVE_DAY") return [{ kind: "resolve-day" }];
  return [];
};

const exactInstructionActionIds = (
  instruction: AvaInstruction,
  actions: readonly AvaActionRef[],
  state: GameState,
  opportunityFraction: number,
): string[] => {
  if (instruction.kind === "SELECT") return [instruction.entity.id];
  if (instruction.kind === "STAGE" || instruction.kind === "ISSUE")
    return instruction.entities.map((entity) => entity.id);
  return actions.map(
    (action) =>
      descriptorForAction(state, action, opportunityFraction)?.id ??
      actionKey(action),
  );
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
  cognitiveGuidance: NonNullable<
    ReturnType<typeof cognitiveDecisionGuidanceFor>
  >,
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
  const docket = getVisibleDocket(
    ctx,
    state,
    binding.channel,
    actorId,
  );
  const artifact = cognitiveGuidance.directiveArtifact;
  if (
    !artifact ||
    artifact.binding.channel !== binding.channel ||
    artifact.binding.actorId !== actorId ||
    artifact.worldRevision !== avaVisibleWorldRevision(docket.state) ||
    canonicalJson([...cognitiveGuidance.decision.ranking].sort()) !==
      canonicalJson([...docket.response.fact.choiceIds].sort())
  )
    return responseFailure(
      docket.state,
      session,
      "REJECTED",
      "COGNITIVE_DIRECTIVE_BINDING_REJECTED",
      "The cognitive decision did not exactly cover the visible directive docket. No order was prepared or issued.",
    );
  const evaluationByChoice = new Map(
    artifact.evaluations.map((evaluation) => [
      evaluation.choiceId,
      evaluation,
    ]),
  );
  const rows = cognitiveGuidance.decision.ranking.map((choiceId) => {
    const evaluation = evaluationByChoice.get(choiceId);
    if (!evaluation)
      throw new Error(`cognitive directive result omitted ${choiceId}`);
    return evaluation;
  });
  const labelByChoice = new Map<string, string>();
  for (const choice of docket.response.fact.choices)
    labelByChoice.set(choice.choiceId, choice.title);
  const legalRows = rows.filter((row) => row.legal);
  const targetedChoice = docket.response.fact.choices.find((choice) =>
    query.subject.entityIds.includes(
      `directive:${choice.familyId}:${choice.choiceId}`,
    ),
  );
  const targetedRow = targetedChoice
    ? rows.find((row) => row.choiceId === targetedChoice.choiceId)
    : undefined;
  const targetedRank = targetedRow
    ? rows.findIndex((row) => row.choiceId === targetedRow.choiceId) + 1
    : 0;
  const strongest = legalRows[0];
  const publicRatings = new Map(
    rows.map((row) => [row.choiceId, publicDirectiveRating(row.score)]),
  );
  const judgment = targetedChoice && targetedRow
    ? [
        `[${docket.response.fact.choices.findIndex((choice) => choice.choiceId === targetedChoice.choiceId) + 1}] ${targetedChoice.title.toUpperCase()} · ${targetedRow.legal ? "AVAILABLE" : "UNAVAILABLE"}`,
        targetedChoice.brief,
        `ASSESSMENT\n${targetedRow.legal
          ? targetedRank === 1
            ? `This is the strongest current ${binding.channel} choice under the compiled ${cognitiveGuidance.decision.modelId} model. Rating ${formatPublicRating(publicRatings.get(targetedRow.choiceId)!)}.`
            : `This ranks ${targetedRank} of ${rows.length} under the compiled ${cognitiveGuidance.decision.modelId} model at ${formatPublicRating(publicRatings.get(targetedRow.choiceId)!)}. ${(labelByChoice.get(strongest?.choiceId ?? "") ?? strongest?.choiceId ?? "No legal alternative").toUpperCase()} ranks first.`
          : `This choice is not currently executable: ${targetedRow.disqualifiers.join(", ") || "the visible gate is closed"}.`}`,
        `KNOWN EFFECTS\n${[
          ...targetedRow.knownBenefits,
          ...targetedRow.knownCosts,
        ].map((fact) => fact.claim).join("\n") || "No additional exact effect is disclosed."}`,
        `RISK\n${targetedRow.knownRisks.map((fact) => fact.claim).join("\n") || "No authored contingent risk is attached."}`,
      ].join("\n\n")
    : legalRows.length
      ? rows
          .map(
            (row, index) =>
              `${index + 1}. ${(labelByChoice.get(row.choiceId) ?? row.choiceId).toUpperCase()} · ${formatPublicRating(publicRatings.get(row.choiceId)!)}${row.legal ? "" : " · UNAVAILABLE"}`,
          )
          .join("\n")
      : "No legal choice is visible in this channel.";
  const response: SemanticResponse<unknown> = {
    ...docket.response,
    fact: {
      channel: binding.channel,
      actorId,
      ranked: rows,
      targetChoiceId: targetedChoice?.choiceId,
      posture: artifact.posture,
    },
    rendering: {
      compact: `RANK ${binding.channel}`,
      brief: rows.map((item) => item.choiceId).join(", "),
    },
  };
  const text = voiceAvaResponse(
    docket.state,
    `JUDGMENT / ${binding.channel.toUpperCase()}\n${judgment}\n\nThe compiled ${cognitiveGuidance.decision.modelId} model owns this ${targetedChoice ? "judgment" : "ranking"} against the supplied strategic posture. No order was prepared or issued.`,
    {
      topic: binding.channel,
      label: "JUDGMENT",
      variant: session.terminal.voiceCursor,
    },
  );
  return {
    state: docket.state,
    session: {
      ...session,
      currentModule: moduleForChannel(binding.channel),
      terminal: {
        ...session.terminal,
        voiceCursor: session.terminal.voiceCursor + 1,
        lastText: text,
      },
    },
    response,
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
    const priorConfirmation = request.idempotencyKey
      ? (state.preparedOrders ?? []).find(
          (record) =>
            record.playerId === ctx.playerId &&
            record.campaignId === ctx.campaignId &&
            (record.confirmationIdempotencyKey ??
              (record.consumedAt ? record.idempotencyKey : undefined)) ===
              request.idempotencyKey &&
            !!record.consumedAt,
        )
      : undefined;
    if (
      priorConfirmation &&
      priorConfirmation.proposalToken !== substrateToken
    )
      return responseFailure(
        state,
        session,
        "REJECTED",
        "IDEMPOTENCY_CONFLICT",
        "That confirmation idempotency key is already bound to a different proposal.",
      );
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
      (semantic.subject.entityIds.length < 2 ||
        semantic.subject.entityIds.length > 20))
  )
    return responseFailure(
      state,
      session,
      "AMBIGUOUS",
      "UNRESOLVED_SEMANTIC_TARGET",
      unresolvedEntityIds.length
        ? `These semantic targets are not in the current visible ontology: ${unresolvedEntityIds.join(", ")}.`
        : "COMPARE requires 2 to 20 current visible targets.",
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
  if (capability.handler === "directive-rank") {
    const binding = directiveBindingFor(semantic);
    if (!binding)
      return responseFailure(
        state,
        session,
        "AMBIGUOUS",
        "DIRECTIVE_CONTEXT_REQUIRED",
        "Name production, military, or diplomacy and its actor.",
      );
    if (
      binding.channel === "diplomacy" &&
      (!binding.actorId ||
        !state.actors.some((actor) => actor.id === binding.actorId))
    )
      return responseFailure(
        state,
        session,
        "AMBIGUOUS",
        "DIPLOMACY_ACTOR_REQUIRED",
        "Name exactly one current diplomacy actor.",
      );
  }
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

  if (
    instruction.kind === "SEMANTIC" &&
    capability.handler === "terminal-instruction"
  ) {
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

  const actions = instructionActions(instruction, session);
  const directives = directiveActions(actions);
  const preparesDirective =
    actions.length === 1 &&
    directives.length === 1 &&
    (instruction.kind === "SELECT" || instruction.kind === "STAGE");
  const planValidationActions =
    actions.length > 0 &&
    (instruction.kind === "ISSUE" ||
      instruction.kind === "ISSUE_PLAN" ||
      instruction.kind === "RESOLVE_DAY" ||
      preparesDirective)
      ? actions
      : undefined;
  const planningExpectedActionIds =
    planValidationActions ??
    (instruction.kind === "SHOW_PLAN" && session.terminal.plan.length
      ? session.terminal.plan
      : undefined);
  const expectedPlanningBinding = planningExpectedActionIds
    ? {
        actionIds: exactInstructionActionIds(
          instruction,
          planningExpectedActionIds,
          state,
          opportunityFraction,
        ),
        worldRevision: avaVisibleWorldRevision(state),
        actions: planningExpectedActionIds,
      }
    : undefined;
  const cognitive =
    !isConsequentialInstruction(instruction) || planValidationActions
      ? runAvaCognitiveNexus({
          request,
          state,
          visibleEntities: visible.entities,
          discourse: session.terminal.discourse,
          opportunityFraction,
          stagedActions: planValidationActions ?? session.terminal.plan,
        })
      : null;
  if (cognitive?.status === "REJECTED")
    return responseFailure(
      state,
      session,
      "REJECTED",
      cognitive.code,
      "The cognitive Nexus could not validate this read. Campaign state was not changed.",
    );
  const retainCognition = (
    result: AvaNexusExecutionResult,
    decisionGuidance?: NonNullable<
      ReturnType<typeof cognitiveDecisionGuidanceFor>
    >,
  ): AvaNexusExecutionResult =>
    cognitive
      ? {
          ...result,
          cognition: {
            cognitiveActivation: cognitive.cognitiveActivation,
            proofGraph: cognitive.proofGraph,
            ...(decisionGuidance
              ? {
                  cognitiveDecision: {
                    executionDigest: decisionGuidance.executionDigest,
                    decisionDigest: decisionGuidance.decision.digest,
                    winnerId: decisionGuidance.decision.winnerId!,
                    ranking: decisionGuidance.decision.ranking,
                  },
                }
              : {}),
          },
        }
      : result;
  let cognitiveGuidance: ReturnType<typeof cognitiveDecisionGuidanceFor>;
  let cognitiveCausal: ReturnType<typeof cognitiveCausalGuidanceFor>;
  let cognitiveConstraint: ReturnType<typeof cognitiveConstraintGuidanceFor>;
  let cognitiveEpistemic: ReturnType<typeof cognitiveEpistemicGuidanceFor>;
  let cognitiveForecast: ReturnType<typeof cognitiveForecastGuidanceFor>;
  let cognitivePlanning: ReturnType<typeof cognitivePlanningGuidanceFor>;
  let cognitiveSemantic: ReturnType<typeof cognitiveSemanticGuidanceFor>;
  try {
    cognitiveGuidance = cognitive
      ? cognitiveDecisionGuidanceFor(cognitive)
      : undefined;
    cognitiveCausal = cognitive
      ? cognitiveCausalGuidanceFor(cognitive)
      : undefined;
    cognitiveConstraint = cognitive
      ? cognitiveConstraintGuidanceFor(cognitive)
      : undefined;
    cognitiveEpistemic = cognitive
      ? cognitiveEpistemicGuidanceFor(cognitive)
      : undefined;
    cognitiveForecast = cognitive
      ? cognitiveForecastGuidanceFor(cognitive)
      : undefined;
    cognitivePlanning = cognitive
      ? cognitivePlanningGuidanceFor(cognitive, expectedPlanningBinding)
      : undefined;
    cognitiveSemantic = cognitive
      ? cognitiveSemanticGuidanceFor(cognitive)
      : undefined;
    if (
      cognitiveSemantic &&
      canonicalJson(cognitiveSemantic.semantic) !== canonicalJson(semantic)
    )
      throw new Error("cognitive realization changed the resolved semantic query");
  } catch {
    return retainCognition(
      responseFailure(
        state,
        session,
        "REJECTED",
        "COGNITIVE_GUIDANCE_REJECTED",
        "The cognitive result could not be bound to Ava's answer. Campaign state was not changed.",
      ),
    );
  }

  if (planValidationActions) {
    if (!cognitivePlanning)
      return retainCognition(
        responseFailure(
          state,
          session,
          "REJECTED",
          "COGNITIVE_PLAN_BINDING_REJECTED",
          "The prepared actions were not bound to an exact cognitive plan. No confirmation was created.",
        ),
      );
    if (cognitivePlanning.planning.status !== "PLANNED")
      return retainCognition(
        responseFailure(
          state,
          session,
          "REJECTED",
          "COGNITIVE_PLAN_BLOCKED",
          `The cognitive plan is blocked: ${cognitivePlanning.planning.blockers.join("; ")}. No confirmation was created and campaign state was not changed.`,
        ),
      );
  }

  if (
    instruction.kind === "SEMANTIC" &&
    capability.handler === "directive-rank"
  ) {
    if (!cognitiveGuidance?.directiveArtifact)
      return retainCognition(
        responseFailure(
          state,
          session,
          "REJECTED",
          "COGNITIVE_DIRECTIVE_DECISION_REQUIRED",
          "The visible directive docket was not ranked by the cognitive decision engine. No order was prepared or issued.",
        ),
      );
    const directiveWinner = cognitiveGuidance.decision.candidates.find(
      (candidate) =>
        candidate.candidateId === cognitiveGuidance.decision.winnerId,
    );
    return retainCognition(
      directiveJudgment(
        ctx,
        state,
        session,
        semantic,
        cognitiveGuidance,
      ),
      directiveWinner?.feasible && directiveWinner.hardObjectivesSatisfied
        ? cognitiveGuidance
        : undefined,
    );
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
        /^(?:diplomacy|diplo)\s+\S+/i.test(request.rawInput.trim()) &&
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
      return retainCognition({
        state: docket.state,
        session: {
          ...session,
          currentModule: moduleForChannel(channel),
          terminal: {
            ...session.terminal,
            discourse: {
              ...session.terminal.discourse,
              currentScreen: moduleForChannel(channel),
              lastSubject: "DIRECTIVE",
              lastEntities: directiveEntityIdsForDocket(
                docket.response.fact,
              ),
              lastScope: [],
              directiveContext: {
                channel,
                actorId,
                entityIds: directiveEntityIdsForDocket(
                  docket.response.fact,
                ),
              },
            },
            lastText: text,
            voiceCursor: session.terminal.voiceCursor + 1,
          },
        },
        response: docket.response,
        text,
      });
    }
  }

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
    return retainCognition(
      prepareDirective(
        ctx,
        state,
        session,
        entity,
        session.terminal.voiceCursor,
        `ava-instruction:${request.origin}:${ctx.playerId}:${request.expectedStateSeal}:${directives[0].choiceId}`,
      ),
    );
  }

  let terminalResult: AvaTerminalResult;
  try {
    terminalResult = runAvaInstruction(
      cognitive && !planValidationActions
        ? projectAvaDisclosedState(state)
        : state,
      session.terminal,
      instruction,
      opportunityFraction,
      request.semantic,
      request.trace,
      darkNetContext,
      cognitiveGuidance,
      cognitiveForecast,
      cognitivePlanning,
      cognitiveConstraint,
      cognitiveCausal,
      cognitiveEpistemic,
    );
    if (cognitive && !terminalResult.executed)
      terminalResult = { ...terminalResult, state };
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "Ava cognitive realization rejected",
        error: error instanceof Error ? error.message : "Unknown realization error",
        instruction: instruction.kind,
      }),
    );
    return responseFailure(
      state,
      session,
      "REJECTED",
      "COGNITIVE_REALIZATION_REJECTED",
      "Ava could not realize an answer from the validated cognitive decision. Campaign state was not changed.",
    );
  }
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
  if (!terminalResult.executed) {
    try {
      const operationalSemantics = projectAvaOperationalSemantics({
        state: cognitive ? projectAvaDisclosedState(state) : state,
        opportunityFraction,
        query: request.semantic,
        instruction,
        trace: request.trace,
        cognitiveGuidance,
        cognitiveForecast,
      });
      if (operationalSemantics)
        terminalResult = {
          ...terminalResult,
          operationalSemantics,
        };
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "Ava operational semantic projection rejected",
          error: error instanceof Error ? error.message : "Unknown projection error",
          operation: request.semantic.operation,
        }),
      );
      return retainCognition(
        responseFailure(
          state,
          session,
          "REJECTED",
          "OPERATIONAL_SEMANTIC_PROJECTION_REJECTED",
          "Ava could not expose a typed read-only semantic result. Campaign state was not changed.",
        ),
      );
    }
  }
  return retainCognition(
    resultFromTerminal(
      state,
      { ...session, terminal: terminalResult.session },
      instruction,
      terminalResult,
    ),
  );
};

const publicTypedActionIdentity = (action: AvaActionRef) =>
  action.kind === "sub-mission"
    ? {
        kind: action.kind,
        domain: action.domain,
        missionId: action.missionId,
        optionId: action.optionId,
      }
    : action;

const runTypedPlanningGate = (
  request: Extract<AvaRequestIR, { kind: "action" | "plan" }>,
  state: GameState,
  session: AvaNexusSession,
  opportunityFraction: number,
) => {
  const actions =
    request.kind === "action" ? [request.action] : request.actions;
  const disclosedState = projectAvaDisclosedState(state);
  const visibleEntities = avaEntitiesForState(
    disclosedState,
    opportunityFraction,
  );
  const plannedEntities = actions.map((action) => {
    const descriptor = descriptorForAction(
      disclosedState,
      action,
      opportunityFraction,
    );
    return (
      visibleEntities.find((entity) => entity.id === descriptor?.id) ??
      syntheticEntity(action)
    );
  });
  const entities = [
    ...visibleEntities,
    ...plannedEntities.filter(
      (entity) =>
        !visibleEntities.some((candidate) => candidate.id === entity.id),
    ),
  ];
  const instruction: AvaInstruction = {
    kind: "ISSUE",
    entities: plannedEntities,
  };
  const semantic = genericSemanticQuery(instruction, {
    currentModule: session.currentModule,
    entities,
    discourse: session.terminal.discourse,
  });
  const cognitive = runAvaCognitiveNexus({
    request: instructionAvaRequest({
      origin: request.origin,
      rawInput: "typed action planning validation",
      instruction,
      semantic,
      expectedStateSeal: request.expectedStateSeal,
    }),
    state,
    visibleEntities: entities,
    discourse: session.terminal.discourse,
    opportunityFraction,
    stagedActions: actions,
  });
  if (cognitive.status === "REJECTED")
    return {
      status: "REJECTED" as const,
      code: cognitive.code,
      reason: cognitive.reason,
    };
  try {
    const actionIds = actions.map(
      (action) =>
        descriptorForAction(state, action, opportunityFraction)?.id ??
        actionKey(action),
    );
    const planning = cognitivePlanningGuidanceFor(cognitive, {
      actionIds,
      worldRevision: avaVisibleWorldRevision(state),
      actions,
    });
    if (!planning)
      throw new Error("typed request did not produce planning guidance");
    return {
      status: "VALIDATED" as const,
      cognitive,
      planning,
    };
  } catch (error) {
    return {
      status: "REJECTED" as const,
      code: "COGNITIVE_PLAN_BINDING_REJECTED",
      reason: error instanceof Error ? error.message : "planning binding failed",
      cognitive,
    };
  }
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
  if (
    request.kind === "plan" &&
    new Set(actions.map(actionKey)).size !== actions.length
  )
    return responseFailure(
      state,
      session,
      "REJECTED",
      "DUPLICATE_PLAN_ACTION",
      "A typed plan cannot contain the same canonical action more than once.",
    );
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
  if (directives.length && request.idempotencyKey) {
    const priorDirective = (state.preparedOrders ?? []).find(
      (record) =>
        record.playerId === ctx.playerId &&
        record.campaignId === ctx.campaignId &&
        (record.prepareIdempotencyKey ??
          (!record.consumedAt ? record.idempotencyKey : undefined)) ===
          request.idempotencyKey,
    );
    if (priorDirective) {
      if (priorDirective.choiceId !== directives[0].choiceId)
        return responseFailure(
          state,
          session,
          "REJECTED",
          "IDEMPOTENCY_CONFLICT",
          "That idempotency key is already bound to a different directive.",
        );
      if (priorDirective.consumedAt) {
        const replayResponse: SemanticResponse<unknown> = {
          status: "ALREADY_EXECUTED",
          fact: {
            actions: actions.map(publicTypedActionIdentity),
            receipt: [`${priorDirective.title} already executed.`],
          },
          rendering: {
            compact: "ALREADY EXECUTED",
            brief: `${priorDirective.title} already executed. Audit: ${priorDirective.auditId}`,
          },
          campaignRevision: revisionOf(state),
          auditId: priorDirective.auditId,
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
    }
  }
  const preparationPayloadHash =
    request.mode === "prepare" &&
    !directives.length &&
    request.idempotencyKey
      ? typedExecutionPayloadHash(request)
      : undefined;
  const priorPreparation = request.idempotencyKey
    ? (session.typedPreparations ?? []).find(
        (record) => record.idempotencyKey === request.idempotencyKey,
      )
    : undefined;
  if (priorPreparation && preparationPayloadHash) {
    if (priorPreparation.payloadHash !== preparationPayloadHash)
      return responseFailure(
        state,
        session,
        "REJECTED",
        "IDEMPOTENCY_CONFLICT",
        "That idempotency key is already bound to a different typed preparation payload.",
      );
    const confirmation = session.terminal.confirmation;
    if (!confirmation || confirmation.id !== priorPreparation.confirmationId)
      return responseFailure(
        state,
        session,
        "REJECTED",
        "IDEMPOTENCY_REPLAY_UNAVAILABLE",
        "That typed preparation is no longer pending. Use a new idempotency key.",
      );
    const replayResponse: SemanticResponse<unknown> = {
      status: "OK",
      fact: {
        actions: actions.map(publicTypedActionIdentity),
        confirmationId: confirmation.id,
        replay: true,
      },
      rendering: {
        compact: "ORDER AWAITING CONFIRMATION",
        brief: `The same typed preparation still awaits confirmation as ${confirmation.id}.`,
      },
      campaignRevision: revisionOf(state),
    };
    return {
      state,
      session,
      response: replayResponse,
      text: responseText(
        state,
        replayResponse,
        { mode: "confirmation" },
        session.terminal.voiceCursor,
      ),
    };
  }
  let payloadHash: string | undefined;
  if (request.mode === "execute" && !directives.length) {
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
    payloadHash = typedExecutionPayloadHash(request);
    const priorExecution = priorTypedExecution(request, ctx, state);
    if (priorExecution) {
      if (!typedExecutionPayloadMatches(priorExecution.payloadHash, request))
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
          actions: actions.map(publicTypedActionIdentity),
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
  }

  const gate = runTypedPlanningGate(
    request,
    state,
    session,
    opportunityFraction,
  );
  if (gate.status === "REJECTED")
    return responseFailure(
      state,
      session,
      "REJECTED",
      gate.code,
      "The typed action payload could not be bound to an exact cognitive plan. Campaign state was not changed.",
    );
  const retainPlanning = (
    result: AvaNexusExecutionResult,
  ): AvaNexusExecutionResult => ({
    ...result,
    cognition: {
      cognitiveActivation: gate.cognitive.cognitiveActivation,
      proofGraph: gate.cognitive.proofGraph,
    },
  });
  if (gate.planning.planning.status !== "PLANNED")
    return retainPlanning(
      responseFailure(
        state,
        session,
        "REJECTED",
        "COGNITIVE_PLAN_BLOCKED",
        `The cognitive plan is blocked: ${gate.planning.planning.blockers.join("; ")}. Campaign state was not changed.`,
      ),
    );

  if (directives.length)
    return retainPlanning(
      prepareDirective(
        ctx,
        state,
        session,
        syntheticEntity(directives[0]),
        session.terminal.voiceCursor,
        request.idempotencyKey ??
          `ava-request:${request.kind}:${request.origin}:${ctx.playerId}:${request.expectedStateSeal}:${directives[0].choiceId}`,
      ),
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
    const stagedConfirmation = terminalResult.session.confirmation;
    const result = resultFromTerminal(
      state,
      { ...session, terminal: terminalResult.session },
      instruction,
      terminalResult,
    );
    const preparedSession =
      request.idempotencyKey &&
      preparationPayloadHash &&
      !terminalResult.rejection &&
      stagedConfirmation &&
      canonicalJson(stagedConfirmation.plan.actions) === canonicalJson(actions)
        ? {
            ...result.session,
            typedPreparations: [
              ...(result.session.typedPreparations ?? []).filter(
                (record) => record.idempotencyKey !== request.idempotencyKey,
              ),
              {
                idempotencyKey: request.idempotencyKey,
                payloadHash: preparationPayloadHash,
                confirmationId: stagedConfirmation.id,
              },
            ],
          }
        : result.session;
    return retainPlanning(
      { ...result, session: preparedSession },
    );
  }
  const idempotencyKey = request.idempotencyKey;
  if (!idempotencyKey || !payloadHash)
    return retainPlanning(
      responseFailure(
        state,
        session,
        "REJECTED",
        "IDEMPOTENCY_KEY_REQUIRED",
        "Typed action and plan execution requires an idempotency key.",
      ),
    );
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
    `${ctx.campaignId}:${ctx.playerId}:${idempotencyKey}:${payloadHash}`,
  )
    .toString(16)
    .padStart(8, "0")}`;
  const finalState: GameState = {
    ...executed.state,
    avaExecutions: [
      ...(executed.state.avaExecutions ?? []),
      {
        idempotencyKey,
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
      actions: actions.map(publicTypedActionIdentity),
      receipt: executed.receipt,
    },
    rendering: {
      compact: actions.length === 1 ? "ACTION EXECUTED" : "PLAN EXECUTED",
      brief: executed.receipt.join("\n"),
    },
    campaignRevision: revisionOf(finalState),
    auditId,
  };
  return retainPlanning({
    state: finalState,
    session: nextSession,
    response,
    text: responseText(
      finalState,
      response,
      { mode: "receipt" },
      session.terminal.voiceCursor,
    ),
  });
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
  let packetHeadline: string | undefined;
  if (request.operation === "force-opportunity") {
    if (state.day <= 1) {
      const response: SemanticResponse<unknown> = {
        status: "OK",
        fact: {
          operation: request.operation,
          status: "unchanged",
          eligibility: "sealed-day-one",
        },
        rendering: {
          compact: "RANDOM EVENT SEALED",
          brief:
            "RANDOM EVENT SEALED / DAY 1\nThe opening day never receives a random Daily mission. No activation was attempted; campaign state is unchanged.",
        },
        campaignRevision: revisionOf(state),
      };
      return { state, session, response, text: response.rendering.brief };
    }
    next = forceOpportunityForCurrentDay(state);
    status = next === state ? "unchanged" : "opened";
    const forcedWindow = opportunityStatusForFraction(next, 0);
    packetId = forcedWindow.packet?.id;
    packetHeadline = forcedWindow.packet?.headline;
    if (!forcedWindow.packet)
      return responseFailure(
        state,
        session,
        "REJECTED",
        "OPPORTUNITY_OVERRIDE_UNAVAILABLE",
        "No authored target of opportunity is available for this campaign day.",
      );
    if (
      !next.opportunityAssignments.some(
        (item) =>
          item.campaignId === next.campaignId &&
          item.day === next.day &&
          item.opportunityId === forcedWindow.packet?.id,
      )
    ) {
      next = recordOpportunityOpened(next, forcedWindow.packet);
      status = "opened";
    }
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
      const assignment = next.opportunityAssignments.find(
        (item) =>
          item.campaignId === next.campaignId &&
          item.day === next.day &&
          item.opportunityId === packet.id,
      );
      if (!assignment) {
        const opened = recordOpportunityOpened(next, packet);
        status = opened === next ? "unchanged" : "opened";
        next = opened;
      }
    } else if (
      packet &&
      opportunity.status === "expired" &&
      !next.opportunityHistory.some(
        (record) =>
          record.day === next.day &&
          record.opportunityId === packet.id,
      )
    ) {
      const expired = recordOpportunityExpired(next, packet);
      status = expired === next ? "unchanged" : "expired";
      next = expired;
    }
  }
  const response: SemanticResponse<unknown> = {
    status: "OK",
    fact: { operation: request.operation, status, packetId, packetHeadline },
    rendering: {
      compact: `OPPORTUNITY ${status.toUpperCase()}`,
      brief:
        request.operation === "force-opportunity"
          ? status === "unchanged"
            ? `RANDOM EVENT ALREADY OPEN\n${packetHeadline}\nThis campaign day already has a target-of-opportunity window. Advance the day before forcing another.`
            : `RANDOM EVENT FORCED\n${packetHeadline}\nThe target-of-opportunity window is open for the current campaign day.`
          : status === "unchanged"
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
        shellEditor: session.terminal.shell.editor?.program,
        language: visible.language,
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
        language: visible.language,
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
          language: visible.language,
        }).semantic!;
  const mode =
    instruction.kind === "STORYTELLER"
      ? "storyteller"
      : instruction.kind === "CONCISE"
        ? "concise"
        : session.realizationMode;
  session = { ...session, realizationMode: mode };
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
  const preserveTrace =
    instruction.kind === "SHELL" &&
    (instruction.shell.command === "AVA_TRACE" || instruction.shell.command === "PROVE");
  const sessionWithTrace = preserveTrace
    ? result.session
    : {
        ...result.session,
        terminal: {
          ...result.session.terminal,
          shell: {
            ...result.session.terminal.shell,
            lastCompilerTrace: compile?.status === "compiled"
              ? JSON.stringify(compile.trace)
              : result.session.terminal.shell.lastCompilerTrace,
            lastProofDigest: result.proofGraph.digest,
            lastOperatorFamilies: [...(result.cognitiveActivation?.operatorFamilies ?? [])],
          },
        },
      };
  return {
    ...result,
    session: sessionWithTrace,
    compile: compile ?? undefined,
    envelope: {
      ...result.envelope,
      compile: compile ?? undefined,
    },
  };
};

export const runAvaKernelLine = runAvaNexusLine;
