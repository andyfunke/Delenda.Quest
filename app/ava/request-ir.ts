import type {
  OpportunityPacket,
  GameState,
} from "../game";
import type { SemanticResponse } from "../substrate/contracts";
import type { Channel } from "../substrate/gates";
import { avaStateRevision } from "./runtime";
import type {
  AvaActionRef,
  AvaCompileResult,
  AvaCompilerTrace,
  AvaEntity,
  AvaEntityKind,
  AvaInstruction,
  AvaModule,
  AvaReportCard,
  AvaReportTopic,
  AvaSemanticOperation,
  AvaSemanticQuery,
  AvaSemanticSubject,
  AvaShellCommandName,
  AvaShellInstruction,
} from "./schema";
import { semanticQueriesEqual } from "./grammar-compiler";
import { genericSemanticQuery } from "./grammar";

export type AvaRequestOrigin =
  | "browser-text"
  | "browser-ui"
  | "terminal"
  | "ssh"
  | "mcp"
  | "internal";

export type AvaDirectiveBinding = {
  channel: Extract<Channel, "production" | "military" | "diplomacy">;
  actorId?: string;
};

export type AvaResolutionGrant = {
  /** Opaque identity of the successful server-side claim. */
  grantId: string;
  campaignId: string;
  campaignDay: number;
  /** Account-day identity is retained for audit and replay rejection. */
  accountDayKey: string;
};

export type AvaInstructionRequestIR = {
  kind: "instruction";
  origin: AvaRequestOrigin;
  rawInput: string;
  instruction: AvaInstruction;
  semantic: AvaSemanticQuery;
  trace?: AvaCompilerTrace;
  expectedStateSeal: string;
};

export type AvaActionRequestIR = {
  kind: "action";
  origin: Exclude<AvaRequestOrigin, "browser-text">;
  action: AvaActionRef;
  mode: "prepare" | "execute";
  expectedStateSeal: string;
  idempotencyKey?: string;
  resolutionGrant?: AvaResolutionGrant;
};

export type AvaPlanRequestIR = {
  kind: "plan";
  origin: Exclude<AvaRequestOrigin, "browser-text">;
  actions: AvaActionRef[];
  mode: "prepare" | "execute";
  expectedStateSeal: string;
  idempotencyKey?: string;
  resolutionGrant?: AvaResolutionGrant;
};

export type AvaConfirmationRequestIR = {
  kind: "confirmation";
  origin: AvaRequestOrigin;
  token?: string;
  expectedStateSeal: string;
  idempotencyKey?: string;
  resolutionGrant?: AvaResolutionGrant;
};

export type AvaCancellationRequestIR = {
  kind: "cancellation";
  origin: AvaRequestOrigin;
  token?: string;
  expectedStateSeal: string;
};

export type AvaInternalRequestIR =
  | {
      kind: "internal";
      origin: "internal";
      operation: "force-opportunity";
      expectedStateSeal: string;
    }
  | {
      kind: "internal";
      origin: "internal";
      operation: "reconcile-opportunity";
      opportunityFraction: number;
      expectedStateSeal: string;
    }
  | {
      kind: "internal";
      origin: "internal";
      operation: "record-opportunity-opened" | "record-opportunity-expired";
      packet: OpportunityPacket;
      expectedStateSeal: string;
    };

/**
 * Canonical request IR accepted by the Nexus.
 *
 * Text itself is not a request variant. Text adapters compile first, then pass
 * a typed instruction through the same request spine as UI and future MCP
 * adapters.
 */
export type AvaRequestIR =
  | AvaInstructionRequestIR
  | AvaActionRequestIR
  | AvaPlanRequestIR
  | AvaConfirmationRequestIR
  | AvaCancellationRequestIR
  | AvaInternalRequestIR;

export type AvaEnvelopePresentation = {
  text: string;
  report?: AvaReportCard;
  navigate?: string;
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
};

export type AvaResponseEnvelope = {
  requestKind: AvaRequestIR["kind"];
  instructionKind?: AvaInstruction["kind"];
  semantic?: AvaSemanticQuery;
  trace?: AvaCompilerTrace;
  compile?: AvaCompileResult;
  response: SemanticResponse<unknown>;
  presentation: AvaEnvelopePresentation;
};

export const avaRequestStateSeal = (state: GameState) =>
  avaStateRevision(state);

export const instructionAvaRequest = (
  input: Omit<AvaInstructionRequestIR, "kind">,
): AvaInstructionRequestIR => ({ kind: "instruction", ...input });

export const executeAvaActionRequest = (
  state: GameState,
  action: AvaActionRef,
  input: Omit<
    AvaActionRequestIR,
    "kind" | "action" | "mode" | "expectedStateSeal"
  >,
): AvaActionRequestIR => ({
  kind: "action",
  action,
  mode: "execute",
  expectedStateSeal: avaRequestStateSeal(state),
  ...input,
});

export const prepareAvaActionRequest = (
  state: GameState,
  action: AvaActionRef,
  input: Omit<
    AvaActionRequestIR,
    "kind" | "action" | "mode" | "expectedStateSeal"
  >,
): AvaActionRequestIR => ({
  kind: "action",
  action,
  mode: "prepare",
  expectedStateSeal: avaRequestStateSeal(state),
  ...input,
});

export const executeAvaPlanRequest = (
  state: GameState,
  actions: AvaActionRef[],
  input: Omit<
    AvaPlanRequestIR,
    "kind" | "actions" | "mode" | "expectedStateSeal"
  >,
): AvaPlanRequestIR => ({
  kind: "plan",
  actions,
  mode: "execute",
  expectedStateSeal: avaRequestStateSeal(state),
  ...input,
});

const OPERATIONS = new Set<AvaSemanticOperation>([
  "ADVISE",
  "EXPLAIN",
  "COMPARE",
  "RANK",
  "SUMMARIZE",
  "INSPECT",
  "CALCULATE",
  "PREDICT",
  "DIAGNOSE",
  "RECOMMEND",
  "WARN",
  "IDENTIFY",
  "DEFINE",
  "LIST",
  "JUSTIFY",
  "CHALLENGE",
  "CONFIRM",
  "CORRECT",
]);

const SUBJECTS = new Set<AvaSemanticSubject>([
  "CAMPAIGN_CHOICE",
  "MISSION_OBJECTIVE",
  "METRIC",
  "DIRECTIVE",
  "REPORT",
  "SCORE",
  "ACTION",
  "SYSTEM",
  "UNKNOWN",
]);

const DOMAINS = new Set(["MAIN", "DOMESTIC", "NETWORK"]);
const SCOPE_GROUPS = new Set([
  "MAIN",
  "DOMESTIC",
  "NETWORK",
  "SECONDARY",
  "ALL",
]);
const TIMEFRAMES = new Set([
  "CURRENT_DOCKET",
  "CURRENT_DAY",
  "HISTORICAL",
  "PROJECTED",
]);
const CRITERIA = new Set([
  "OVERALL_VALUE",
  "LOWEST_RISK",
  "HIGHEST_UPSIDE",
  "LOWEST_MATERIEL_COST",
  "PRODUCTION",
  "FRONT",
  "LONG_TERM",
  "IMMEDIATE",
  "REVERSIBILITY",
  "SUSTAINABILITY",
  "STRONGEST",
  "CHEAPEST",
]);
const DETAIL_LEVELS = new Set(["JUDGMENT", "REASONS", "CALCULUS"]);
const OUTPUT_FORMS = new Set(["TERMINAL", "REPORT", "SPREADSHEET"]);
const POLARITIES = new Set(["AFFIRMATIVE", "NEGATED"]);
const DIRECTIVE_CHANNELS = new Set([
  "production",
  "military",
  "diplomacy",
]);
const COMPARISON_MODES = new Set(["PAIR", "RANK", "FILTER", "THRESHOLD"]);
const CERTAINTIES = new Set(["CERTAIN", "LIKELY", "UNCERTAIN"]);
const REFERENCE_TYPES = new Set([
  "LAST_SUBJECT",
  "LAST_RECOMMENDATION",
  "OTHER_ENTITY",
  "SELECTED_ENTITY",
  "PRIOR_REASON",
]);
const OVERLAY_KINDS = new Set([
  "WITHOUT_EFFECT",
  "ASSUME_STATE",
  "ASSUME_ACTION",
  "IGNORE_COST",
  "REMOVE_ENTITY",
  "EXPECT_EVENT",
]);
const MODULES = new Set<AvaModule>([
  "campaign",
  "national",
  "military",
  "diplomacy",
  "doctrine",
  "account",
  "wiki",
]);
const ENTITY_KINDS = new Set<AvaEntityKind>([
  "campaign",
  "module",
  "domain",
  "mission",
  "sector",
  "phase",
  "event",
  "operational-fact",
  "metric",
  "resource",
  "maneuver",
  "directive-family",
  "directive",
  "foreign-actor",
  "sub-mission-option",
  "opportunity",
  "opportunity-response",
  "doctrine-vector",
  "doctrine-stage",
  "active-effect",
  "scheduled-effect",
  "lock",
  "intelligence-claim",
  "resolution-record",
  "campaign-record",
]);
const REPORT_TOPICS = new Set<AvaReportTopic>([
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
const SHELL_COMMANDS = new Set<AvaShellCommandName>([
  "REJECT",
  "DARK_NET",
  "PWD",
  "CD",
  "LS",
  "CAT",
  "OPEN",
  "GREP",
  "FIND",
  "HELP",
  "WHOAMI",
  "HISTORY",
  "CLEAR",
  "DOWNLOAD",
]);
const LIST_SCOPES = new Set([
  "missions",
  "production",
  "military",
  "diplomacy",
  "doctrine",
  "directives",
  "opportunities",
  "all",
]);
const REQUEST_ORIGINS = new Set<AvaRequestOrigin>([
  "browser-text",
  "browser-ui",
  "terminal",
  "ssh",
  "mcp",
  "internal",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const unique = (values: string[]) => new Set(values).size === values.length;
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && !!value.trim();
const hasOnlyKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
) => {
  const allowedSet = new Set(allowed);
  return Object.keys(value).every((key) => allowedSet.has(key));
};
const hasExactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
) =>
  required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
  hasOnlyKeys(value, [...required, ...optional]);

export type AvaSemanticValidation =
  | { ok: true; query: AvaSemanticQuery }
  | { ok: false; issues: string[] };

/**
 * Runtime guard for typed callers. TypeScript types are not an authority
 * boundary because browser, MCP, test, and persisted inputs can be untyped.
 */
export const validateAvaSemanticQuery = (
  value: unknown,
): AvaSemanticValidation => {
  const issues: string[] = [];
  if (!isRecord(value))
    return { ok: false, issues: ["semantic query must be an object"] };
  if (
    !hasExactKeys(
      value,
      [
        "operation",
        "subject",
        "scope",
        "timeframe",
        "criteria",
        "polarity",
        "requestedDetail",
        "perspective",
        "outputForm",
        "overlays",
        "confidence",
        "sourceSpans",
      ],
      [
        "directive",
        "metric",
        "metricOperands",
        "comparisonMode",
        "quantity",
        "certainty",
        "reference",
      ],
    )
  )
    issues.push("semantic query contains missing or unknown fields");
  const operation = value.operation;
  const subject = value.subject;
  const scope = value.scope;
  if (
    typeof operation !== "string" ||
    !OPERATIONS.has(operation as AvaSemanticOperation)
  )
    issues.push("unknown semantic operation");
  if (!isRecord(subject)) issues.push("subject must be an object");
  else {
    if (!hasExactKeys(subject, ["type", "entityIds"]))
      issues.push("subject contains missing or unknown fields");
    if (
      typeof subject.type !== "string" ||
      !SUBJECTS.has(subject.type as AvaSemanticSubject)
    )
      issues.push("unknown semantic subject");
    if (!isStringArray(subject.entityIds))
      issues.push("subject.entityIds must be a string array");
    else if (
      subject.entityIds.some((item) => !item.trim()) ||
      !unique(subject.entityIds)
    )
      issues.push("subject.entityIds must contain unique non-empty ids");
  }
  if (!isRecord(scope)) issues.push("scope must be an object");
  else {
    if (!hasExactKeys(scope, ["domains", "excludedDomains"], ["group"]))
      issues.push("scope contains missing or unknown fields");
    if (
      scope.group !== undefined &&
      (typeof scope.group !== "string" || !SCOPE_GROUPS.has(scope.group))
    )
      issues.push("unknown scope group");
    for (const field of ["domains", "excludedDomains"] as const) {
      const domains = scope[field];
      if (
        !isStringArray(domains) ||
        domains.some((item) => !DOMAINS.has(item)) ||
        !unique(domains)
      )
        issues.push(`scope.${field} must contain unique known domains`);
    }
    const included = scope.domains;
    const excluded = scope.excludedDomains;
    if (
      isStringArray(included) &&
      isStringArray(excluded) &&
      included.some((domain) => excluded.includes(domain))
    )
      issues.push("included and excluded scope domains overlap");
  }
  if (
    typeof value.timeframe !== "string" ||
    !TIMEFRAMES.has(value.timeframe)
  )
    issues.push("unknown timeframe");
  if (
    !isStringArray(value.criteria) ||
    !value.criteria.length ||
    value.criteria.some((item) => !CRITERIA.has(item)) ||
    !unique(value.criteria)
  )
    issues.push("criteria must contain unique known criteria");
  if (
    typeof value.polarity !== "string" ||
    !POLARITIES.has(value.polarity)
  )
    issues.push("unknown polarity");
  if (
    typeof value.requestedDetail !== "string" ||
    !DETAIL_LEVELS.has(value.requestedDetail)
  )
    issues.push("unknown requested detail");
  if (value.perspective !== "PLAYER")
    issues.push("unknown semantic perspective");
  if (
    typeof value.outputForm !== "string" ||
    !OUTPUT_FORMS.has(value.outputForm)
  )
    issues.push("unknown output form");
  if (!Array.isArray(value.overlays)) {
    issues.push("overlays must be an array");
  } else {
    for (const overlay of value.overlays) {
      if (
        !isRecord(overlay) ||
        !hasExactKeys(
          overlay,
          ["kind", "target", "sourceText"],
          ["value", "unit"],
        ) ||
        typeof overlay.kind !== "string" ||
        !OVERLAY_KINDS.has(overlay.kind) ||
        !isNonEmptyString(overlay.target) ||
        !isNonEmptyString(overlay.sourceText) ||
        (overlay.value !== undefined &&
          !(
            (typeof overlay.value === "number" &&
              Number.isFinite(overlay.value)) ||
            isNonEmptyString(overlay.value)
          )) ||
        (overlay.unit !== undefined && !isNonEmptyString(overlay.unit))
      )
        issues.push("overlay entries must be complete typed overlays");
    }
  }
  if (
    typeof value.confidence !== "number" ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1
  )
    issues.push("confidence must be between zero and one");
  if (!isRecord(value.sourceSpans)) {
    issues.push("sourceSpans must be an object");
  } else {
    for (const [name, span] of Object.entries(value.sourceSpans)) {
      if (
        !name.trim() ||
        !isRecord(span) ||
        !hasExactKeys(span, ["start", "end", "text"]) ||
        typeof span.start !== "number" ||
        !Number.isInteger(span.start) ||
        span.start < 0 ||
        typeof span.end !== "number" ||
        !Number.isInteger(span.end) ||
        span.end < span.start ||
        typeof span.text !== "string"
      )
        issues.push("sourceSpans entries must be valid source spans");
    }
  }

  if (value.metric !== undefined && !isNonEmptyString(value.metric))
    issues.push("metric must be a non-empty string");
  if (
    value.metricOperands !== undefined &&
    (!isStringArray(value.metricOperands) ||
      value.metricOperands.some((item) => !item.trim()) ||
      !unique(value.metricOperands))
  )
    issues.push("metricOperands must contain unique non-empty strings");
  if (
    value.comparisonMode !== undefined &&
    (typeof value.comparisonMode !== "string" ||
      !COMPARISON_MODES.has(value.comparisonMode))
  )
    issues.push("unknown comparison mode");
  if (value.quantity !== undefined) {
    const quantity = value.quantity;
    if (
      !isRecord(quantity) ||
      !hasExactKeys(quantity, ["kind", "value"]) ||
      (quantity.kind !== "ORDINAL" && quantity.kind !== "CARDINAL") ||
      typeof quantity.value !== "number" ||
      !Number.isInteger(quantity.value) ||
      quantity.value < 1
    )
      issues.push("quantity must be a positive typed integer");
  }
  if (
    value.certainty !== undefined &&
    (typeof value.certainty !== "string" ||
      !CERTAINTIES.has(value.certainty))
  )
    issues.push("unknown certainty");
  if (value.reference !== undefined) {
    const reference = value.reference;
    if (
      !isRecord(reference) ||
      !hasExactKeys(reference, ["type"]) ||
      typeof reference.type !== "string" ||
      !REFERENCE_TYPES.has(reference.type)
    )
      issues.push("reference must be a known typed reference");
  }

  const directive = value.directive;
  if (directive !== undefined) {
    if (!isRecord(directive)) issues.push("directive binding must be an object");
    else {
      if (!hasExactKeys(directive, ["channel"], ["actorId"]))
        issues.push("directive binding contains missing or unknown fields");
      if (
        typeof directive.channel !== "string" ||
        !DIRECTIVE_CHANNELS.has(directive.channel)
      )
        issues.push("unknown directive channel");
      if (
        directive.actorId !== undefined &&
        (typeof directive.actorId !== "string" || !directive.actorId.trim())
      )
        issues.push("directive actorId must be a non-empty string");
      if (
        directive.channel !== "diplomacy" &&
        directive.actorId !== undefined
      )
        issues.push("only diplomacy directives may bind an actor");
      if (
        typeof subject === "object" &&
        subject !== null &&
        (subject as { type?: unknown }).type !== "DIRECTIVE"
      )
        issues.push("directive binding requires DIRECTIVE subject");
    }
  }

  if (operation === "COMPARE" && isRecord(subject)) {
    const ids = subject.entityIds;
    if (
      subject.type === "CAMPAIGN_CHOICE" &&
      (!isStringArray(ids) || ids.length !== 2)
    )
      issues.push("campaign comparison requires exactly two exact targets");
  }
  if (
    operation === "CHALLENGE" &&
    isRecord(subject) &&
    subject.type === "METRIC"
  ) {
    if (!isNonEmptyString(value.metric))
      issues.push("metric challenge requires an explicit metric operand");
    if (
      !isStringArray(value.metricOperands) ||
      value.metricOperands.length < 2
    )
      issues.push("metric challenge requires an explicit comparison operand");
  }
  if (operation === "LIST" && isRecord(subject)) {
    if (subject.type !== "CAMPAIGN_CHOICE" && subject.type !== "DIRECTIVE")
      issues.push("LIST only supports campaign choices or directives");
  }
  return issues.length
    ? { ok: false, issues }
    : { ok: true, query: value as unknown as AvaSemanticQuery };
};

export const isAvaActionRef = (value: unknown): value is AvaActionRef => {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  const string = (key: string) =>
    typeof value[key] === "string" && !!String(value[key]).trim();
  switch (value.kind) {
    case "maneuver":
      return (
        hasExactKeys(value, ["kind", "maneuverId"]) &&
        string("maneuverId")
      );
    case "directive":
      return (
        hasExactKeys(value, ["kind", "familyId", "choiceId"], ["actorId"]) &&
        string("familyId") &&
        string("choiceId") &&
        (value.actorId === undefined || string("actorId"))
      );
    case "sub-mission":
      return (
        hasExactKeys(
          value,
          [
            "kind",
            "domain",
            "missionId",
            "optionId",
            "resolutionTicket",
          ],
        ) &&
        (value.domain === "domestic" || value.domain === "network") &&
        string("missionId") &&
        string("optionId") &&
        string("resolutionTicket")
      );
    case "opportunity-response":
      return (
        hasExactKeys(value, ["kind", "opportunityId", "responseId"]) &&
        string("opportunityId") &&
        string("responseId")
      );
    case "doctrine-stage":
      return (
        hasExactKeys(value, ["kind", "vectorId", "stageId"]) &&
        string("vectorId") &&
        string("stageId")
      );
    case "resolve-day":
      return hasExactKeys(value, ["kind"]);
    default:
      return false;
  }
};

export const isAvaEntity = (value: unknown): value is AvaEntity => {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      ["id", "kind", "label"],
      ["aliases", "parentId", "handle", "action"],
    ) ||
    !isNonEmptyString(value.id) ||
    typeof value.kind !== "string" ||
    !ENTITY_KINDS.has(value.kind as AvaEntityKind) ||
    !isNonEmptyString(value.label)
  )
    return false;
  if (
    value.aliases !== undefined &&
    (!isStringArray(value.aliases) ||
      value.aliases.some((alias) => !alias.trim()) ||
      !unique(value.aliases))
  )
    return false;
  if (value.parentId !== undefined && !isNonEmptyString(value.parentId))
    return false;
  if (value.handle !== undefined && !isNonEmptyString(value.handle))
    return false;
  return value.action === undefined || isAvaActionRef(value.action);
};

const isExecutableEntity = (value: unknown): value is AvaEntity =>
  isAvaEntity(value) && value.action !== undefined;

const isAvaShellInstruction = (
  value: unknown,
): value is AvaShellInstruction =>
  isRecord(value) &&
  hasExactKeys(value, ["command", "args", "raw"]) &&
  typeof value.command === "string" &&
  SHELL_COMMANDS.has(value.command as AvaShellCommandName) &&
  isStringArray(value.args) &&
  value.args.every((argument) => !!argument.trim()) &&
  isNonEmptyString(value.raw);

export type AvaInstructionValidation =
  | { ok: true; instruction: AvaInstruction }
  | { ok: false; issues: string[] };

const instructionFailure = (issue: string): AvaInstructionValidation => ({
  ok: false,
  issues: [issue],
});

/**
 * Exhaustive runtime guard for every instruction variant. The instruction
 * union is a compile-time convenience, not permission to trust an untyped
 * browser, MCP, persisted, or test payload.
 */
export const validateAvaInstruction = (
  value: unknown,
): AvaInstructionValidation => {
  if (!isRecord(value) || !isNonEmptyString(value.kind))
    return instructionFailure("instruction must be a tagged object");
  const noPayloadKinds = new Set([
    "GREETING",
    "ORDERS",
    "STATUS",
    "ADVISE",
    "SHOW_PLAN",
    "ISSUE_PLAN",
    "CLEAR",
    "CLEAR_PLAN",
    "CANCEL",
    "MORE",
    "LESS",
    "REPEAT",
    "IDENTITY",
    "GRATITUDE",
    "FRUSTRATION",
    "RESOLVE_DAY",
  ]);
  if (noPayloadKinds.has(value.kind))
    return hasExactKeys(value, ["kind"])
      ? { ok: true, instruction: value as AvaInstruction }
      : instructionFailure(`${value.kind} contains an unexpected payload`);

  switch (value.kind) {
    case "HELP":
      return hasExactKeys(value, ["kind"], ["subject"]) &&
        (value.subject === undefined || isNonEmptyString(value.subject))
        ? { ok: true, instruction: value as AvaInstruction }
        : instructionFailure("HELP subject must be a non-empty string");
    case "SEMANTIC": {
      if (!hasExactKeys(value, ["kind", "query"]))
        return instructionFailure("SEMANTIC requires exactly one query");
      const semantic = validateAvaSemanticQuery(value.query);
      return semantic.ok
        ? { ok: true, instruction: value as unknown as AvaInstruction }
        : instructionFailure(
            `SEMANTIC query is malformed: ${semantic.issues.join("; ")}`,
          );
    }
    case "SHELL":
      return hasExactKeys(value, ["kind", "shell"]) &&
        isAvaShellInstruction(value.shell)
        ? { ok: true, instruction: value as unknown as AvaInstruction }
        : instructionFailure("SHELL requires a complete typed shell command");
    case "LIST":
      return hasExactKeys(value, ["kind"], ["scope"]) &&
        (value.scope === undefined ||
          (isNonEmptyString(value.scope) && LIST_SCOPES.has(value.scope)))
        ? { ok: true, instruction: value as AvaInstruction }
        : instructionFailure("LIST scope is unknown");
    case "REPORT":
      return hasExactKeys(value, ["kind", "topic"], ["days", "scope"]) &&
        typeof value.topic === "string" &&
        REPORT_TOPICS.has(value.topic as AvaReportTopic) &&
        (value.days === undefined ||
          (typeof value.days === "number" &&
            Number.isInteger(value.days) &&
            value.days >= 1 &&
            value.days <= 30)) &&
        (value.scope === undefined ||
          value.scope === "current" ||
          (typeof value.scope === "string" &&
            MODULES.has(value.scope as AvaModule)))
        ? { ok: true, instruction: value as AvaInstruction }
        : instructionFailure("REPORT fields are malformed");
    case "EXPLAIN":
      return hasExactKeys(value, ["kind", "entity", "facet"]) &&
        isAvaEntity(value.entity) &&
        (value.facet === "meaning" ||
          value.facet === "effects" ||
          value.facet === "levers" ||
          value.facet === "calculus")
        ? { ok: true, instruction: value as unknown as AvaInstruction }
        : instructionFailure("EXPLAIN requires a typed entity and facet");
    case "OPEN":
      return hasExactKeys(value, ["kind", "module"]) &&
        typeof value.module === "string" &&
        MODULES.has(value.module as AvaModule)
        ? { ok: true, instruction: value as AvaInstruction }
        : instructionFailure("OPEN requires a known module");
    case "SELECT":
      return hasExactKeys(value, ["kind", "entity"]) &&
        isExecutableEntity(value.entity)
        ? { ok: true, instruction: value as unknown as AvaInstruction }
        : instructionFailure("SELECT requires one executable entity");
    case "STAGE":
    case "UNSTAGE":
    case "ISSUE":
      return hasExactKeys(value, ["kind", "entities"]) &&
        Array.isArray(value.entities) &&
        value.entities.length > 0 &&
        value.entities.every(isExecutableEntity) &&
        unique(value.entities.map((entity) => entity.id))
        ? { ok: true, instruction: value as unknown as AvaInstruction }
        : instructionFailure(
            `${value.kind} requires unique executable entities`,
          );
    case "FORECAST":
      return hasExactKeys(value, ["kind"], ["entity", "plan"]) &&
        (value.entity === undefined || isExecutableEntity(value.entity)) &&
        (value.plan === undefined || value.plan === true) &&
        !(value.entity !== undefined && value.plan === true)
        ? { ok: true, instruction: value as unknown as AvaInstruction }
        : instructionFailure(
            "FORECAST requires one executable entity or plan mode",
          );
    case "COMPARE":
      return hasExactKeys(value, ["kind", "entities"]) &&
        Array.isArray(value.entities) &&
        value.entities.length === 2 &&
        value.entities.every(isExecutableEntity) &&
        value.entities[0].id !== value.entities[1].id
        ? { ok: true, instruction: value as unknown as AvaInstruction }
        : instructionFailure(
            "COMPARE requires exactly two distinct executable entities",
          );
    case "CONFIRM":
      return hasExactKeys(value, ["kind"], ["token"]) &&
        (value.token === undefined || isNonEmptyString(value.token))
        ? { ok: true, instruction: value as AvaInstruction }
        : instructionFailure("CONFIRM token must be a non-empty string");
    case "COMMIT":
      return hasExactKeys(value, ["kind"], ["entity"]) &&
        (value.entity === undefined || isExecutableEntity(value.entity))
        ? { ok: true, instruction: value as unknown as AvaInstruction }
        : instructionFailure("COMMIT entity must be executable");
    default:
      return instructionFailure("unknown Ava instruction kind");
  }
};

const validateInstructionSemanticCoherence = (
  instruction: AvaInstruction,
  semantic: AvaSemanticQuery,
): string[] => {
  if (instruction.kind === "SEMANTIC")
    return semanticQueriesEqual(instruction.query, semantic)
      ? []
      : ["SEMANTIC instruction query must equal request.semantic"];
  const expected = genericSemanticQuery(instruction, {
    currentModule: "campaign",
    entities: [],
  });
  return semanticQueriesEqual(expected, semantic)
    ? []
    : [
        `${instruction.kind} semantic payload must equal its canonical lowering`,
      ];
};

export type AvaRequestValidation =
  | { ok: true; request: AvaRequestIR }
  | { ok: false; issues: string[] };

export const validateAvaRequestIR = (
  value: unknown,
): AvaRequestValidation => {
  if (!isRecord(value) || typeof value.kind !== "string")
    return { ok: false, issues: ["Ava request must be a typed object"] };
  const seal = value.expectedStateSeal;
  if (typeof seal !== "string" || !seal.trim())
    return { ok: false, issues: ["consequential request requires a state seal"] };
  if (
    typeof value.origin !== "string" ||
    !REQUEST_ORIGINS.has(value.origin as AvaRequestOrigin)
  )
    return { ok: false, issues: ["unknown Ava request origin"] };
  const invalidOptionalString = (field: string) =>
    value[field] !== undefined &&
    (typeof value[field] !== "string" || !String(value[field]).trim());
  if (invalidOptionalString("idempotencyKey"))
    return { ok: false, issues: ["idempotencyKey must be a non-empty string"] };
  if (invalidOptionalString("token"))
    return { ok: false, issues: ["token must be a non-empty string"] };
  if (value.resolutionGrant !== undefined) {
    const grant = value.resolutionGrant;
    if (
      !isRecord(grant) ||
      typeof grant.grantId !== "string" ||
      !grant.grantId.trim() ||
      typeof grant.campaignId !== "string" ||
      !grant.campaignId.trim() ||
      typeof grant.campaignDay !== "number" ||
      !Number.isInteger(grant.campaignDay) ||
      grant.campaignDay < 1 ||
      typeof grant.accountDayKey !== "string" ||
      !grant.accountDayKey.trim()
    )
      return { ok: false, issues: ["resolutionGrant is malformed"] };
  }
  if (value.kind === "instruction") {
    if (typeof value.rawInput !== "string")
      return { ok: false, issues: ["instruction must be a typed instruction"] };
    const instruction = validateAvaInstruction(value.instruction);
    if (!instruction.ok) return instruction;
    const semantic = validateAvaSemanticQuery(value.semantic);
    if (!semantic.ok) return semantic;
    const coherence = validateInstructionSemanticCoherence(
      instruction.instruction,
      semantic.query,
    );
    return coherence.length
      ? { ok: false, issues: coherence }
      : { ok: true, request: value as unknown as AvaRequestIR };
  }
  if (value.kind === "action")
    return (
      (value.mode === "prepare" || value.mode === "execute") &&
      value.origin !== "browser-text" &&
      isAvaActionRef(value.action)
    )
      ? { ok: true, request: value as unknown as AvaRequestIR }
      : {
          ok: false,
          issues: ["action request contains an invalid origin, mode, or action"],
        };
  if (value.kind === "plan")
    return (value.mode === "prepare" || value.mode === "execute") &&
      value.origin !== "browser-text" &&
      Array.isArray(value.actions) &&
      value.actions.length > 0 &&
      value.actions.every(isAvaActionRef)
      ? { ok: true, request: value as unknown as AvaRequestIR }
      : {
          ok: false,
          issues: ["plan request requires a valid origin, mode, and actions"],
        };
  if (value.kind === "confirmation" || value.kind === "cancellation")
    return {
      ok: true,
      request: value as unknown as AvaRequestIR,
    };
  if (value.kind === "internal") {
    if (value.origin !== "internal")
      return { ok: false, issues: ["internal request requires internal origin"] };
    if (value.operation === "force-opportunity")
      return { ok: true, request: value as unknown as AvaRequestIR };
    if (
      value.operation === "reconcile-opportunity" &&
      typeof value.opportunityFraction === "number" &&
      Number.isFinite(value.opportunityFraction) &&
      value.opportunityFraction >= 0 &&
      value.opportunityFraction <= 1
    )
      return { ok: true, request: value as unknown as AvaRequestIR };
    if (
      (value.operation === "record-opportunity-opened" ||
        value.operation === "record-opportunity-expired") &&
      isRecord(value.packet) &&
      typeof value.packet.id === "string" &&
      !!value.packet.id.trim() &&
      typeof value.packet.ticket === "string" &&
      !!value.packet.ticket.trim() &&
      typeof value.packet.occurrence === "number" &&
      Number.isInteger(value.packet.occurrence) &&
      typeof value.packet.opensAtFraction === "number" &&
      typeof value.packet.closesAtFraction === "number" &&
      value.packet.opensAtFraction >= 0 &&
      value.packet.closesAtFraction <= 1 &&
      value.packet.opensAtFraction < value.packet.closesAtFraction &&
      Array.isArray(value.packet.responses)
    )
      return { ok: true, request: value as unknown as AvaRequestIR };
    return { ok: false, issues: ["unknown internal Ava request"] };
  }
  return { ok: false, issues: ["unknown Ava request kind"] };
};
