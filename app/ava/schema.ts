export type AvaModule = "dashboard" | "campaign" | "national" | "military" | "diplomacy" | "doctrine" | "account" | "wiki";

export type AvaEntityKind = "module" | "metric" | "maneuver" | "directive";

export type AvaEntity = {
  id: string;
  kind: AvaEntityKind;
  label: string;
  aliases?: string[];
  parentId?: string;
};

export type AvaInstruction =
  | { kind: "HELP"; subject?: string }
  | { kind: "STATUS" }
  | { kind: "REPORT"; scope: AvaModule | "current" }
  | { kind: "EXPLAIN"; entity: AvaEntity; facet: "meaning" | "effects" | "levers" | "calculus" }
  | { kind: "OPEN"; module: AvaModule }
  | { kind: "SELECT"; entity: AvaEntity }
  | { kind: "FORECAST"; entity?: AvaEntity }
  | { kind: "COMPARE"; entities: [AvaEntity, AvaEntity] }
  | { kind: "CLEAR" }
  | { kind: "COMMIT"; entity?: AvaEntity }
  | { kind: "RESOLVE_DAY" };

export type AvaFailureCode = "empty" | "unrecognized" | "missing-target" | "ambiguous-target" | "unsupported-combination";

export type AvaCompilerTrace = {
  rule: string;
  tokenCount: number;
  entityKinds: AvaEntityKind[];
  unresolvedTokenCount: number;
};

export type AvaCompileResult =
  | { status: "compiled"; instruction: AvaInstruction; trace: AvaCompilerTrace }
  | { status: "clarify"; failure: AvaFailureCode; prompt: string; candidates?: AvaEntity[]; trace: AvaCompilerTrace };

export type AvaCompilerContext = {
  currentModule: AvaModule;
  entities: AvaEntity[];
  selected?: AvaEntity | null;
};

export type AvaCommandHelp = {
  command: string;
  purpose: string;
  examples: string[];
  mutates: boolean;
};

export const AVA_COMMAND_HELP: AvaCommandHelp[] = [
  { command:"STATUS",purpose:"Summarize the campaign condition and orders still requiring command.",examples:["status","how are we doing","command situation"],mutates:false },
  { command:"REPORT [SYSTEM]",purpose:"Produce the authoritative report for the current or named command system.",examples:["report","production report","report diplomacy"],mutates:false },
  { command:"EXPLAIN [SUBJECT]",purpose:"Reveal a metric's meaning, effects, calculus, or controllable levers.",examples:["explain intelligence","what affects readiness","how do I improve supply"],mutates:false },
  { command:"OPEN [MODULE]",purpose:"Navigate to a command surface.",examples:["open campaign","go to doctrine","show production"],mutates:false },
  { command:"SELECT [ORDER]",purpose:"Stage an authorized maneuver or open a directive for review.",examples:["select reinforce the salient","prepare methodical advance"],mutates:false },
  { command:"FORECAST [ORDER]",purpose:"Project disclosed same-day effects without issuing an order.",examples:["forecast","forecast exploit the gap"],mutates:false },
  { command:"COMPARE [A] WITH [B]",purpose:"Compare two authorized maneuvers.",examples:["compare hold the line with local surge"],mutates:false },
  { command:"ISSUE ORDER",purpose:"Issue the uniquely staged maneuver after validation.",examples:["issue order","commit selection","do it"],mutates:true },
  { command:"CLEAR SELECTION",purpose:"Clear the currently staged Ava decision.",examples:["clear selection","cancel that"],mutates:false },
  { command:"RESOLVE DAY",purpose:"Open final day-resolution confirmation.",examples:["resolve day","end the day"],mutates:true },
  { command:"HELP [COMMAND]",purpose:"Open this command manual.",examples:["help","help forecast"],mutates:false },
];

// This is also the future LLM tool contract. A language model may emit these
// objects later, but it never bypasses the deterministic validator or executor.
export const AVA_INSTRUCTION_SCHEMA = {
  version:"delenda.quest.ava.instruction.v1",
  intents:AVA_COMMAND_HELP.map(item=>item.command.split(" ")[0]),
  execution:"fail-closed",
  rawPromptStorage:false,
} as const;
