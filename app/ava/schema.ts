import type {
  AvaContextualBinding,
  AvaContextualLanguage,
  AvaLanguageEvidence,
  AvaManeuverEvidenceKind,
} from "./contextual-language";

export type AvaModule =
  | "campaign"
  | "national"
  | "military"
  | "diplomacy"
  | "doctrine"
  | "account"
  | "wiki";

export type AvaEntityKind =
  | "campaign"
  | "module"
  | "domain"
  | "mission"
  | "sector"
  | "phase"
  | "event"
  | "operational-fact"
  | "metric"
  | "resource"
  | "maneuver"
  | "directive-family"
  | "directive"
  | "foreign-actor"
  | "sub-mission-option"
  | "opportunity"
  | "opportunity-response"
  | "doctrine-vector"
  | "doctrine-stage"
  | "active-effect"
  | "scheduled-effect"
  | "lock"
  | "intelligence-claim"
  | "resolution-record"
  | "campaign-record";
export type AvaReportTopic =
  | "overview"
  | "daily-brief"
  | "operations"
  | "losses"
  | "personnel"
  | "retrospective"
  | "production"
  | "resources"
  | "projection"
  | "domestic"
  | "network"
  | "military"
  | "diplomacy"
  | "doctrine"
  | "intelligence"
  | "adversary"
  | "effects"
  | "decision-ledger"
  | "opportunities"
  | "service-record";

export type AvaScopeDomain = "MAIN" | "DOMESTIC" | "NETWORK";
export type AvaScopeGroup =
  | "MAIN"
  | "DOMESTIC"
  | "NETWORK"
  | "SECONDARY"
  | "ALL";
export type AvaSemanticOperation =
  | "ADVISE"
  | "EXPLAIN"
  | "COMPARE"
  | "RANK"
  | "SUMMARIZE"
  | "INSPECT"
  | "CALCULATE"
  | "PREDICT"
  | "DIAGNOSE"
  | "RECOMMEND"
  | "WARN"
  | "IDENTIFY"
  | "DEFINE"
  | "LIST"
  | "JUSTIFY"
  | "CHALLENGE"
  | "CONFIRM"
  | "CORRECT";
export type AvaSemanticSubject =
  | "CAMPAIGN_CHOICE"
  | "MISSION_OBJECTIVE"
  | "METRIC"
  | "DIRECTIVE"
  | "REPORT"
  | "SCORE"
  | "ACTION"
  | "SYSTEM"
  | "UNKNOWN";
export type AvaEvaluationCriterion =
  | "OVERALL_VALUE"
  | "LOWEST_RISK"
  | "HIGHEST_UPSIDE"
  | "LOWEST_MATERIEL_COST"
  | "PRODUCTION"
  | "FRONT"
  | "LONG_TERM"
  | "IMMEDIATE"
  | "REVERSIBILITY"
  | "SUSTAINABILITY"
  | "STRONGEST"
  | "CHEAPEST";
export type AvaHypotheticalOverlay = {
  kind:
    | "WITHOUT_EFFECT"
    | "ASSUME_STATE"
    | "ASSUME_ACTION"
    | "IGNORE_COST"
    | "REMOVE_ENTITY"
    | "EXPECT_EVENT";
  target: string;
  value?: number | string;
  unit?: string;
  sourceText: string;
};
export type AvaSourceSpan = {
  start: number;
  end: number;
  text: string;
};
export type AvaSemanticQuery = {
  operation: AvaSemanticOperation;
  subject: {
    type: AvaSemanticSubject;
    entityIds: string[];
  };
  directive?: {
    channel: "production" | "military" | "diplomacy";
    actorId?: string;
  };
  scope: {
    group?: AvaScopeGroup;
    domains: AvaScopeDomain[];
    excludedDomains: AvaScopeDomain[];
  };
  metric?: string;
  metricOperands?: string[];
  timeframe:
    | "CURRENT_DOCKET"
    | "CURRENT_DAY"
    | "HISTORICAL"
    | "PROJECTED";
  comparisonMode?: "PAIR" | "RANK" | "FILTER" | "THRESHOLD";
  criteria: AvaEvaluationCriterion[];
  polarity: "AFFIRMATIVE" | "NEGATED";
  quantity?: { kind: "ORDINAL" | "CARDINAL"; value: number };
  certainty?: "CERTAIN" | "LIKELY" | "UNCERTAIN";
  requestedDetail: "JUDGMENT" | "REASONS" | "CALCULUS";
  perspective: "PLAYER";
  reference?: {
    type:
      | "LAST_SUBJECT"
      | "LAST_RECOMMENDATION"
      | "OTHER_ENTITY"
      | "SELECTED_ENTITY"
      | "PRIOR_REASON";
  };
  outputForm: "TERMINAL" | "REPORT" | "SPREADSHEET";
  overlays: AvaHypotheticalOverlay[];
  confidence: number;
  sourceSpans: Record<string, AvaSourceSpan>;
};

export type AvaDiscourseState = {
  lastSubject?: AvaSemanticSubject;
  lastEntities: string[];
  lastRecommended?: string;
  lastMetric?: string;
  lastScope: AvaScopeDomain[];
  lastTimeframe?: AvaSemanticQuery["timeframe"];
  currentScreen?: AvaModule;
  selectedObject?: string;
  openApplet?: string;
  unresolvedAmbiguity?: string;
  previousCorrection?: string;
  suppressedAdviceScopes: AvaScopeDomain[];
  realizationHistory: string[];
  directiveContext?: {
    channel: "production" | "military" | "diplomacy";
    actorId?: string;
    entityIds: string[];
  };
};

export type AvaAnswerPlan = {
  answerType:
    | "DIRECT_JUDGMENT"
    | "COMPARATIVE_RECOMMENDATION"
    | "CONDITIONAL_SPLIT"
    | "EXPLANATION"
    | "PARTIAL_UNDERSTANDING"
    | "CORRECTION";
  directAnswer?: string;
  rankedOptions: string[];
  decisiveReasons: string[];
  tradeoffs: string[];
  cautions: string[];
  assumptions: string[];
  alternatives: Array<{ criterion: string; optionId: string }>;
  calculationDisclosure: "NONE" | "COMMAND_SURFACE" | "FULL";
  stateRevision: string;
  structureId: string;
  clauseIds: string[];
};

export type AvaShellCommandName =
  | "REJECT"
  | "PIPELINE"
  | "STREAM"
  | "DARK_NET"
  | "PWD"
  | "CD"
  | "LS"
  | "CAT"
  | "OPEN"
  | "GREP"
  | "FIND"
  | "HELP"
  | "WHOAMI"
  | "HISTORY"
  | "CLEAR"
  | "DOWNLOAD"
  | "MAN"
  | "WHICH"
  | "TREE"
  | "STAT"
  | "FILE"
  | "HEAD"
  | "TAIL"
  | "SORT"
  | "UNIQ"
  | "WC"
  | "CUT"
  | "COLUMN"
  | "LESS"
  | "BREW"
  | "VIM"
  | "NANO"
  | "EDITOR_INPUT"
  | "ARCHIVE"
  | "GIT"
  | "SQLITE3"
  | "PS"
  | "SYSTEMCTL"
  | "CRONTAB"
  | "FORTUNE"
  | "SOCIAL_POST"
  | "SUDO"
  | "MAKE"
  | "RM"
  | "HOSTNAME"
  | "UPTIME"
  | "AVA_DOCTOR"
  | "AVA_TRACE"
  | "PROVE"
  | "JQ"
  | "BAT"
  | "BC"
  | "UNITS"
  | "CAL"
  | "DATE"
  | "ID"
  | "UNAME"
  | "ENV"
  | "DF"
  | "DU"
  | "TOP"
  | "SS"
  | "NL"
  | "TR"
  | "SED"
  | "AWK"
  | "DIFF"
  | "SHA256SUM"
  | "CSVLOOK"
  | "CSVCUT"
  | "CSVSTAT"
  | "NMAP"
  | "HACK";
export type AvaShellInstruction = {
  command: AvaShellCommandName;
  args: string[];
  raw: string;
  stages?: AvaShellInstruction[];
};

export type AvaVirtualFile = {
  path: string;
  kind: "text" | "workbook";
  mode: string;
  owner: "commander" | "ava" | "root";
  createdDay: number;
  content?: string;
  topic?: AvaReportTopic | "command-dashboard";
  stateRevision: string;
  asOfFraction?: number;
  workbookBytes?: number[];
  mime?: string;
};
export type AvaHackSession = {
  caseId: string;
  familyId: string;
  contentVersion: string;
  incidentSchemaVersion: "intrusion-incident/v1";
  campaignId: string;
  startedDay: number;
  status: "open" | "solved";
  hints: number;
  attempts: number;
  stateRevision: string;
  report?: string;
  proof?: string;
};
export type AvaShellSession = {
  cwd: string;
  history: string[];
  files: AvaVirtualFile[];
  darkNetUnlocked: boolean;
  installedPackages: string[];
  hack?: AvaHackSession;
  editor?: {
    program: "vim" | "nano";
    path: string;
    buffer: string;
    savedBuffer: string;
    undo: string[];
    mode: "normal" | "insert";
  };
  lastCompilerTrace?: string;
  lastProofDigest?: string;
  lastOperatorFamilies?: string[];
};

export type AvaActionRef =
  | { kind: "maneuver"; maneuverId: string }
  | { kind: "directive"; familyId: string; choiceId: string; actorId?: string }
  | {
      kind: "sub-mission";
      domain: "domestic" | "network";
      missionId: string;
      optionId: string;
      resolutionTicket: string;
    }
  | { kind: "opportunity-response"; opportunityId: string; responseId: string }
  | { kind: "doctrine-stage"; vectorId: string; stageId: string }
  | { kind: "resolve-day" };

export type AvaActionDescriptor = {
  id: string;
  handle: string;
  label: string;
  aliases: string[];
  kind: AvaActionRef["kind"];
  action: AvaActionRef;
  domain?: "main" | "domestic" | "network";
  parentLabel: string;
  available: boolean;
  rejection?: string;
  orderCost: number;
  insightCost?: number;
  owned: string[];
  contingent: string[];
  summary: string;
};

export type AvaPlan = {
  id: string;
  stateRevision: string;
  actions: AvaActionRef[];
  orderCost: number;
  insightCost: number;
};
export type AvaConfirmation = {
  id: string;
  stateRevision: string;
  plan: AvaPlan;
  purpose: "issue-plan" | "resolve-day" | "opportunity" | "doctrine";
};

export type AvaReportCard = {
  topic: AvaReportTopic;
  title: string;
  direct: string;
  flavor: string;
  calculation: {
    equation: string;
    rows: Array<{
      label: string;
      value: string;
      tone?: "gain" | "loss" | "neutral";
      conceptId?: string;
    }>;
  };
  history: {
    resolvedDays: number;
    requestedDays?: number;
    observedOrders: number;
    observations: string[];
  };
  recommendation: string;
  links: Array<{ id: string; label: string }>;
  commands: string[];
};

export type AvaEntity = {
  id: string;
  kind: AvaEntityKind;
  label: string;
  aliases?: string[];
  parentId?: string;
  handle?: string;
  action?: AvaActionRef;
};

export type AvaInstruction =
  | { kind: "GREETING" }
  | { kind: "ORDERS" }
  | { kind: "HELP"; subject?: string }
  | { kind: "STATUS" }
  | { kind: "ADVISE"; contextual?: AvaContextualBinding }
  | { kind: "SEMANTIC"; query: AvaSemanticQuery }
  | { kind: "SHELL"; shell: AvaShellInstruction }
  | { kind: "LIST"; scope?: string }
  | {
      kind: "REPORT";
      topic: AvaReportTopic;
      days?: number;
      scope?: AvaModule | "current";
      canonical?: true;
      contextual?: AvaContextualBinding;
    }
  | {
      kind: "EXPLAIN";
      entity: AvaEntity;
      facet: "meaning" | "effects" | "levers" | "calculus";
      contextual?: AvaContextualBinding;
    }
  | { kind: "OPEN"; module: AvaModule }
  | { kind: "SELECT"; entity: AvaEntity }
  | { kind: "STAGE"; entities: AvaEntity[] }
  | { kind: "UNSTAGE"; entities: AvaEntity[] }
  | { kind: "SHOW_PLAN" }
  | { kind: "ISSUE_PLAN" }
  | { kind: "ISSUE"; entities: AvaEntity[] }
  | { kind: "FORECAST"; entity?: AvaEntity; plan?: boolean }
  | { kind: "COMPARE"; entities: [AvaEntity, AvaEntity] }
  | { kind: "CLEAR" }
  | { kind: "CLEAR_PLAN" }
  | { kind: "CONFIRM"; token?: string }
  | { kind: "CANCEL" }
  | { kind: "EXPORT_CHAT" }
  | {
      kind:
        | "MORE"
        | "LESS"
        | "STORYTELLER"
        | "CONCISE"
        | "REPEAT"
        | "IDENTITY"
        | "GRATITUDE"
        | "FRUSTRATION";
    }
  | { kind: "COMMIT"; entity?: AvaEntity }
  | { kind: "RESOLVE_DAY" };

export type AvaFailureCode =
  | "empty"
  | "unrecognized"
  | "missing-target"
  | "ambiguous-target"
  | "unsupported-combination"
  | "unsupported-command-operator"
  | "AUTHORED_REFERENCE_UNAVAILABLE";

export type AvaCompilerTrace = {
  rule: string;
  rawInput: string;
  interaction: "open-ended" | "explicit";
  normalizedInput: string;
  normalizedTokens: string[];
  recognizedConcepts: Array<{
    kind: string;
    canonical: string;
    source: string;
  }>;
  semanticQuery?: AvaSemanticQuery;
  contextualResolutions: string[];
  grammarProvenance?: string[];
  exactIndexHit: boolean;
  tokenCount: number;
  tokenLedger: Array<{
    token: string;
    index: number;
    status: "consumed" | "unresolved";
    material: boolean;
    consumedBy?: string;
  }>;
  entityKinds: AvaEntityKind[];
  unresolvedTokenCount: number;
  authoredEvidence?: AvaLanguageEvidence[];
  maneuverId?: string;
  evidenceKind?: AvaManeuverEvidenceKind;
  availability?: "AVAILABLE" | "UNAVAILABLE";
  declarationId?: string;
  contextualCandidates?: string[];
};

export type AvaCompileResult =
  | {
      status: "compiled";
      instruction: AvaInstruction;
      semantic: AvaSemanticQuery;
      trace: AvaCompilerTrace;
    }
  | {
      status: "clarify";
      failure: AvaFailureCode;
      prompt: string;
      candidates?: AvaEntity[];
      semantic?: AvaSemanticQuery;
      trace: AvaCompilerTrace;
    };

export type AvaCompilerContext = {
  currentModule: AvaModule;
  entities: AvaEntity[];
  selected?: AvaEntity | null;
  discourse?: AvaDiscourseState;
  openApplet?: string | null;
  shellFileReferences?: string[];
  shellEditor?: "vim" | "nano";
  language?: AvaContextualLanguage;
};

export type AvaCommandHelp = {
  command: string;
  purpose: string;
  examples: string[];
  mutates: boolean;
};

export const AVA_COMMAND_HELP: AvaCommandHelp[] = [
  {
    command: "HELLO",
    purpose:
      "Open the command channel and receive the shortest useful orientation.",
    examples: ["hello", "hi Ava", "are you there"],
    mutates: false,
  },
  {
    command: "ORDERS",
    purpose:
      "List remaining capacity, staged actions, the Main Campaign, and today's one or two alternate fronts.",
    examples: ["orders", "what are my orders", "orders available"],
    mutates: false,
  },
  {
    command: "MISSIONS",
    purpose:
      "List the Main Campaign, today's active Domestic or Network fronts, and any active opportunity with stable day-scoped handles.",
    examples: ["missions", "list available actions", "what can I issue"],
    mutates: false,
  },
  {
    command: "LIST [SCOPE]",
    purpose:
      "Enumerate the current Production, Military, Diplomacy, Doctrine, directive, opportunity, or all-system docket.",
    examples: ["list production", "list doctrine", "list all"],
    mutates: false,
  },
  {
    command: "STATUS",
    purpose:
      "Summarize the campaign condition and orders still requiring command.",
    examples: ["status", "how are we doing", "command situation"],
    mutates: false,
  },
  {
    command: "ADVISE",
    purpose:
      "Answer what to do next with authored situation text, live calculus, accumulated intelligence, and a bounded recommendation.",
    examples: ["what should I do", "recommend a next move", "where do I start"],
    mutates: false,
  },
  {
    command: "REPORT [SYSTEM]",
    purpose:
      "Produce a layered report from the current or named command ledger.",
    examples: ["report", "produce a report on production", "domestic report"],
    mutates: false,
  },
  {
    command: "ALT UX BRIEF",
    purpose:
      "Report the Main Campaign and today's active Domestic or Network fronts with their live evidence and order handles.",
    examples: ["alt ux brief", "brief me", "produce a campaign briefing"],
    mutates: false,
  },
  {
    command: "REPORT LOSSES [WINDOW]",
    purpose:
      "Aggregate casualties, flight, replacement, enemy loss, and movement across recorded resolved days.",
    examples: [
      "report losses over the last 5 days",
      "casualties past three days",
    ],
    mutates: false,
  },
  {
    command: "RETROSPECTIVE [WINDOW]",
    purpose:
      "Review orders, outcomes, movement, doctrine, and observed enemy behavior.",
    examples: ["retrospective", "five day after action report"],
    mutates: false,
  },
  {
    command: "PROJECTION",
    purpose:
      "Project the next resolution across operations, production, personnel, and domestic state.",
    examples: ["projection", "what happens next", "produce an outlook"],
    mutates: false,
  },
  {
    command: "EXPLAIN [SUBJECT]",
    purpose:
      "Reveal a metric's meaning, effects, calculus, or controllable levers.",
    examples: [
      "explain intelligence",
      "what affects readiness",
      "how do I improve supply",
    ],
    mutates: false,
  },
  {
    command: "OPEN [MODULE]",
    purpose: "Navigate to a command surface.",
    examples: ["open campaign", "go to doctrine", "show production"],
    mutates: false,
  },
  {
    command: "SELECT [ORDER]",
    purpose:
      "Stage one current action for forecast, comparison, or later issue.",
    examples: ["select M2", "prepare methodical advance"],
    mutates: false,
  },
  {
    command: "STAGE [HANDLES]",
    purpose:
      "Build an atomic order packet from one or more listed action handles.",
    examples: ["stage M2 D1 N3", "stage guarantee family rations"],
    mutates: false,
  },
  {
    command: "UNSTAGE [HANDLES]",
    purpose:
      "Remove one or more actions from the staged packet without changing campaign state.",
    examples: ["unstage D1", "remove N2 from plan"],
    mutates: false,
  },
  {
    command: "PLAN",
    purpose:
      "Show the staged packet, costs, owned effects, contingencies, and current ledger seal.",
    examples: ["plan", "show plan", "forecast plan"],
    mutates: false,
  },
  {
    command: "FORECAST [ORDER]",
    purpose: "Project disclosed same-day effects without issuing an order.",
    examples: ["forecast", "forecast exploit the gap"],
    mutates: false,
  },
  {
    command: "COMPARE [A] WITH [B]",
    purpose:
      "Compare any two current actions, including sub-mission and directive tradeoffs.",
    examples: ["compare M1 M2", "compare D1 D3"],
    mutates: false,
  },
  {
    command: "ISSUE ORDER",
    purpose:
      "Validate a named or uniquely staged action and prepare a sealed confirmation.",
    examples: ["issue M2", "commit selection", "do it"],
    mutates: true,
  },
  {
    command: "ISSUE PLAN",
    purpose:
      "Validate the staged packet and prepare a sealed confirmation.",
    examples: ["issue plan", "commit plan"],
    mutates: true,
  },
  {
    command: "CONFIRM [TOKEN]",
    purpose:
      "Enter the one pending order only if the command position has not changed.",
    examples: ["confirm", "confirm C-11-A43E20", "yes do it"],
    mutates: true,
  },
  {
    command: "CANCEL",
    purpose:
      "Discard the pending confirmation without changing campaign state.",
    examples: ["cancel", "never mind"],
    mutates: false,
  },
  {
    command: "CLEAR SELECTION",
    purpose: "Clear the currently staged Ava decision.",
    examples: ["clear selection", "cancel that"],
    mutates: false,
  },
  {
    command: "RESOLVE DAY",
    purpose: "Open final day-resolution confirmation.",
    examples: ["resolve day", "end the day"],
    mutates: true,
  },
  {
    command: "MORE / LESS",
    purpose:
      "Change terminal disclosure depth without changing campaign state.",
    examples: ["more detail", "less", "go deeper"],
    mutates: false,
  },
  {
    command: "STORYTELLER / CONCISE MODE",
    purpose:
      "Change Ava's realization register without changing facts, mechanics, analytical depth, or campaign state.",
    examples: ["storyteller mode", "tell me the whole story", "concise mode"],
    mutates: false,
  },
  {
    command: "DAILY UNLOCK ON / OFF",
    purpose:
      "Unlock repeated day resolution for debugging, or restore the account-midnight daily limit.",
    examples: ["daily unlock on", "daily unlock off"],
    mutates: true,
  },
  {
    command: "EXPORT AVA CHAT",
    purpose:
      "Download the current local Ava conversation as a plain-text chat log without uploading the transcript.",
    examples: [
      "export chat",
      "export ava chat",
      "export ava chat log",
      "export ava log",
    ],
    mutates: false,
  },
  {
    command: "HELP [COMMAND]",
    purpose: "Open this command manual.",
    examples: ["help", "help forecast"],
    mutates: false,
  },
  {
    command: "UNIX SHELL",
    purpose:
      "Navigate Ava's sealed campaign filesystem and retrieve saved reports without touching the host system.",
    examples: [
      "pwd",
      "cd ~/home",
      "ls reports/current",
      "grep -i losses reports/current/daily-brief.txt",
      "download reports/current/command-dashboard.xlsx",
    ],
    mutates: false,
  },
];

// This is also the future LLM tool contract. A language model may emit these
// objects later, but it never bypasses the deterministic validator or executor.
export const AVA_INSTRUCTION_SCHEMA = {
  version: "delenda.quest.ava.instruction.v5",
  intents: AVA_COMMAND_HELP.map((item) => item.command.split(" ")[0]),
  execution: "fail-closed",
  rawPromptStorage: false,
} as const;
