/** §4.4 Grammar recipe and candidate boundary — types verbatim. */

export type ContentMedium =
  | "ava"
  | "campaign-brief"
  | "maneuver-procedure"
  | "romantic-arc"
  | "execution-scene";

export type SharedChord = {
  tensionId: string;
  intentClass: "inspect" | "compare" | "decide" | "witness";
  actorRoles: readonly string[];
  temporalShape: "instant" | "continuation" | "delay" | "closure";
  pressureShape: "scarcity" | "exposure" | "obligation" | "irreversibility";
  evidenceShape: "observed" | "estimated" | "declared" | "unavailable";
  consequenceShape: "cost" | "exchange" | "residue" | "terminal-risk";
};

export type SlotContract = {
  id: string;
  valueType: "string" | "number" | "boolean" | "enum";
  enumValues?: readonly string[];
  required: boolean;
};

export type BindingClass = {
  id: string;
  slotId: string;
  representatives: readonly (string | number | boolean)[];
  cardinality: number;
};

export type GrammarRecipe = {
  id: string;
  version: string;
  medium: ContentMedium;
  chord: SharedChord;
  spineId: string;
  mechanicRefs: readonly string[];
  slots: readonly SlotContract[];
  requiredClaims: readonly string[];
  forbiddenClaims: readonly string[];
  registerProfileId: string;
  equivalenceClasses: readonly BindingClass[];
};

export type CandidateProvenance = {
  productionId: string;
  globalSeed: string | number;
  localSeedTicket: string;
  sourceVersion: string;
  sourceHashes: readonly string[];
  contractVersion: string;
};

export type GrammarCandidate = {
  candidateId: string;
  recipe: GrammarRecipe;
  representativeBindings: Record<string, string | number | boolean>;
  semanticPlan: unknown;
  text: string;
  provenance: CandidateProvenance;
  parentCandidateId: string | null;
};

export type CompileStatus = "COMPILED" | "HARD_FAILURE";

export type TerminalDisposition =
  | "QUALITY_MET"
  | "QUALITY_NOT_MET"
  | "FAILURE_CONFIRMED"
  | "GATE_FALSE_POSITIVE";

export type Disposition = TerminalDisposition | "REVISE";

export type ReviewReasonCode =
  | "REGISTER_BREAK"
  | "MECHANIC_MISMATCH"
  | "HIDDEN_STATE_RISK"
  | "UNSUPPORTED_CLAIM"
  | "CONTINUITY_BREAK"
  | "DUPLICATE_IMAGE"
  | "GENERIC_ABSTRACTION"
  | "SENTIMENTALITY"
  | "SLANG_REGISTER"
  | "OMNISCIENCE"
  | "UNEXPLAINED_JARGON"
  | "CHORD_MISMATCH"
  | "WEAK_CONSEQUENCE"
  | "CLAIM_BUDGET_BREACH"
  | "OTHER_WITH_NOTE";

export type FailureClass =
  | "HIDDEN_OUTCOME"
  | "IMPERATIVE_ORDER"
  | "ACTOR_SWAP"
  | "TEMPORAL_CONTRADICTION"
  | "GENERIC_ABSTRACTION"
  | "SENTIMENTALITY"
  | "DUPLICATE_IMAGE"
  | "UNSUPPORTED_RESOURCE"
  | "CONFUSABLE_SPELLING"
  | "FALSE_MECHANIC_CLAIM"
  | "BEAUTIFUL_BUT_IRRELEVANT"
  | "RELEVANT_BUT_DEAD"
  | "NOVEL_BUT_INCOHERENT";

export type PriorityBand = "P0" | "P1" | "P2" | "P3";

export type AvaProjection = {
  medium: "ava";
  intentLowering: string;
  clarificationSafety: boolean;
  actionReadSeparation: boolean;
  forbiddenIntentOwnership: true;
};

export type CampaignBriefProjection = {
  medium: "campaign-brief";
  theaterId: string;
  problemClass: string;
  phaseId: string;
  situationTemplateId: string;
};

export type ManeuverProcedureProjection = {
  medium: "maneuver-procedure";
  mechanicId: string;
  heat: "hot" | "medium";
  realizationId: string;
};

export type RomanticArcProjection = {
  medium: "romantic-arc";
  arcId: string;
  beatIndex: number;
  durationDays: 1 | 2 | 3;
};

export type ExecutionSceneProjection = {
  medium: "execution-scene";
  resolvedDay: number;
  tier: "routine" | "romantic" | "escalatory";
  heat: "hot" | "medium";
};

export type MediumProjection =
  | AvaProjection
  | CampaignBriefProjection
  | ManeuverProcedureProjection
  | RomanticArcProjection
  | ExecutionSceneProjection;
