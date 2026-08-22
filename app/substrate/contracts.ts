import type { Channel, SubstrateGate, SurfaceId } from "./gates";
import type { StrategicPosture } from "./posture";
import { CHANNELS, COMMAND_OPERATIONS } from "./vocabulary";

export { CHANNELS };

export type { Channel };

export const NODE_KINDS = [
  "clade",
  "family",
  "blueprint",
  "choice",
  "realization",
  "response",
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

export type RotationPolicy = {
  cadence: "daily" | "situation" | "campaign";
  cooldownDays: number;
  persistAfterPresentation: true;
};

export type ExhaustionPolicy = {
  scope: "campaign" | "account";
  repeat: "never_until_exhausted" | "cooldown" | "allowed";
};

export type SelectionPolicy = {
  slots: number;
  minChoices: number;
  maxChoices: number;
  diversityBy?: "clade" | "family" | "actor" | "mechanic";
};

export type SlotSchema = Record<
  string,
  { type: "string" | "number" | "boolean" | "enum"; values?: string[]; required?: boolean }
>;

export type RealizationTemplate = {
  id: string;
  register: string;
  title: string;
  brief: string;
  claimIds: string[];
};

export type LlmAuthorshipPolicy = {
  allowed: boolean;
  requiredClaims: string[];
  forbiddenClaims: string[];
  register: string;
};

export type SubstrateNode = {
  id: string;
  contentVersion: string;
  channel: Channel;
  kind: NodeKind;
  parentId?: string;
  actorBinding?: string;
  mechanicId?: string;
  label: string;
  brief?: string;
  category?: string;
  gates: SubstrateGate[];
  suppressors?: SubstrateGate[];
  rotation?: RotationPolicy;
  exhaustion?: ExhaustionPolicy;
  selection?: SelectionPolicy;
  semanticSlots?: SlotSchema;
  authoredVariants?: RealizationTemplate[];
  llmPolicy?: LlmAuthorshipPolicy;
  children?: SubstrateNode[];
  /** Existing family lock duration in campaign days. */
  lockDays?: number;
  exact?: string[];
  risk?: string[];
};

export { COMMAND_OPERATIONS };
export type CommandOperation = (typeof COMMAND_OPERATIONS)[number];

export type CanonicalCommand = {
  operation: CommandOperation;
  channel?: Channel;
  actorId?: string;
  targetIds?: string[];
  posture?: StrategicPosture;
  proposalToken?: string;
  idempotencyKey?: string;
  question?: string;
  rawInput: string;
  parser: "deterministic" | "llm_proposed";
  confidence: "exact" | "normalized" | "ambiguous";
};

export type SemanticStatus =
  | "OK"
  | "PREPARED"
  | "EXECUTED"
  | "REJECTED"
  | "EXPIRED"
  | "ALREADY_EXECUTED"
  | "STATE_CHANGED"
  | "CONFIRMATION_REQUIRED"
  | "AMBIGUOUS"
  | "NOT_FOUND"
  | "FORBIDDEN";

export type SemanticResponse<TFact, TAction = unknown> = {
  status: SemanticStatus;
  fact: TFact;
  actions?: TAction[];
  rendering: {
    compact: string;
    brief: string;
    spoken?: string;
  };
  recovery?: {
    code: string;
    instruction: string;
    validExamples?: string[];
  };
  campaignRevision: string;
  auditId?: string;
};

export type ConsequenceFact = {
  id: string;
  claim: string;
  polarity: "benefit" | "cost" | "risk" | "neutral";
  visible: true;
};

export type UncertaintyFact = {
  id: string;
  claim: string;
};

export type VisibleChoice = {
  choiceId: string;
  familyId: string;
  cladeId: string;
  channel: Channel;
  actorId?: string;
  title: string;
  brief: string;
  mechanicId: string;
  orderCost: number;
  available: boolean;
  availability?: "available" | "locked" | "invalidated" | "exhausted";
};

export type DocketFact = {
  campaignDay: number;
  channel: Channel;
  actorId?: string;
  cladeIds: string[];
  familyIds: string[];
  choiceIds: string[];
  choices: VisibleChoice[];
  cooldownOverride: boolean;
  degraded?: boolean;
  diagnostic?: string;
  selectionTicket: string;
  contentVersion: string;
};

export type DocketRecord = {
  campaignId: string;
  campaignDay: number;
  channel: Channel;
  actorId?: string;
  contentVersion: string;
  selectedCladeIds: string[];
  selectedFamilyIds: string[];
  selectedChoiceIds: string[];
  realizationIds: string[];
  candidateSetHash: string;
  selectionTicket: string;
  compiledAtRevision: string;
  presentedAt?: string;
  cooldownOverride: boolean;
  degraded?: boolean;
  diagnostic?: string;
};

export type PreparedOrderFact = {
  normalizedAction: {
    choiceId: string;
    mechanicId: string;
    title: string;
  };
  campaignId: string;
  campaignRevision: string;
  orderCost: number;
  ordersBefore: number;
  ordersAfter: number;
  knownConsequences: ConsequenceFact[];
  reversible: boolean;
  expiresAt: string;
  proposalToken: string;
  confirmationPhrase: string;
};

export type PlayerContext = {
  playerId: string;
  campaignId: string;
  campaignRevision: string;
  surface: SurfaceId;
  authority: "observer" | "staff" | "command";
  nowMs: number;
};

export const CONTENT_VERSION = "substrate-directives-v1";

export const moduleToChannel = (module: string): Channel => {
  if (module === "national") return "production";
  if (
    module === "production" ||
    module === "military" ||
    module === "diplomacy" ||
    module === "campaign" ||
    module === "upgrade" ||
    module === "domestic" ||
    module === "network"
  ) {
    return module;
  }
  return "campaign";
};

export const channelToModule = (channel: Channel): string => {
  if (channel === "production") return "national";
  return channel;
};
