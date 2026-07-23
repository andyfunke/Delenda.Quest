import type {
  AvaCompilerContext,
  AvaDiscourseState,
  AvaEntity,
  AvaEvaluationCriterion,
  AvaInstruction,
  AvaScopeDomain,
  AvaSemanticOperation,
  AvaSemanticQuery,
  AvaSemanticSubject,
  AvaShellInstruction,
  AvaSourceSpan,
} from "./schema";

const TYPO_VARIANTS: Record<string, string> = {
  adv: "advise",
  advis: "advise",
  compar: "compare",
  domesticc: "domestic",
  misson: "mission",
  missons: "missions",
  misison: "mission",
  misisons: "missions",
  missin: "mission",
  missins: "missions",
  netwrk: "network",
  producion: "production",
  rediness: "readiness",
  secodary: "secondary",
  secondry: "secondary",
  seconday: "secondary",
  whats: "what is",
  wht: "what",
  woudl: "would",
};

const shellNames = new Set([
  "pwd",
  "cd",
  "ls",
  "cat",
  "grep",
  "find",
  "whoami",
  "history",
  "clear",
  "download",
]);

const shellLex = (raw: string) => {
  const tokens: string[] = [];
  let token = "";
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (quote) {
      if (character === quote) quote = null;
      else token += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (/\s/.test(character)) {
      if (token) tokens.push(token);
      token = "";
      continue;
    }
    token += character;
  }
  if (quote) return null;
  if (token) tokens.push(token);
  return tokens;
};

const hasUnsafeShellSyntax = (raw: string) => {
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (
      character === "\u0000" ||
      character === "|" ||
      character === ";" ||
      character === ">" ||
      character === "<" ||
      character === "`" ||
      (character === "&" && raw[index + 1] === "&") ||
      (character === "$" && raw[index + 1] === "(")
    )
      return true;
  }
  return false;
};

const rejectedShell = (
  raw: string,
  message: string,
): AvaShellInstruction => ({
  command: "REJECT",
  args: [message],
  raw: raw.trim(),
});

const shellArgumentError = (
  command: string,
  args: string[],
): string | null => {
  if (["pwd", "whoami", "history", "clear"].includes(command))
    return args.length ? `${command}: unexpected operand` : null;
  if (command === "cd")
    return args.length > 1 || args.some((arg) => arg.startsWith("-"))
      ? "cd: expected at most one path"
      : null;
  if (command === "ls") {
    if (args.some((arg) => arg.startsWith("-") && !/^-[al]+$/.test(arg)))
      return "ls: unsupported flag";
    return args.filter((arg) => !arg.startsWith("-")).length > 1
      ? "ls: expected at most one path"
      : null;
  }
  if (command === "cat")
    return !args.length || args.some((arg) => arg.startsWith("-"))
      ? "cat: expected one or more file paths"
      : null;
  if (command === "grep") {
    if (args.some((arg) => arg.startsWith("-") && !/^-[inr]+$/.test(arg)))
      return "grep: unsupported flag";
    return args.filter((arg) => !arg.startsWith("-")).length < 2
      ? "grep: expected PATTERN and PATH"
      : null;
  }
  if (command === "find") {
    let index = args[0] && !args[0].startsWith("-") ? 1 : 0;
    while (index < args.length) {
      const option = args[index];
      const value = args[index + 1];
      if (option === "-maxdepth") {
        if (!/^\d+$/.test(value ?? "") || Number(value) > 8)
          return "find: -maxdepth expects an integer from 0 to 8";
      } else if (option === "-type") {
        if (value !== "f" && value !== "d")
          return "find: -type expects f or d";
      } else if (option === "-name") {
        if (!value) return "find: -name expects a glob";
      } else return `find: unsupported option ${option}`;
      index += 2;
    }
    return null;
  }
  if (command === "download")
    return args.length === 1 ? null : "download: expected one .xlsx file";
  if (command === "help")
    return args.length === 1 && shellNames.has(args[0].toLowerCase())
      ? null
      : "help: expected one supported shell command";
  return null;
};

export const parseAvaShellInput = (
  raw: string,
): AvaShellInstruction | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lexicalHead = trimmed.match(/^([a-z]+)/i)?.[1].toLowerCase();
  const beginsAsShell = !!lexicalHead && shellNames.has(lexicalHead);
  if (beginsAsShell && trimmed.length > 512)
    return rejectedShell(trimmed, "command exceeds the 512-character limit");
  if (
    beginsAsShell &&
    hasUnsafeShellSyntax(trimmed)
  )
    return rejectedShell(
      trimmed,
      "operators, redirects, substitutions, and command chaining are disabled",
    );
  const tokens = shellLex(trimmed);
  if (!tokens?.length)
    return lexicalHead && shellNames.has(lexicalHead)
      ? rejectedShell(trimmed, "unterminated quoted argument")
      : null;
  const command = tokens[0].toLowerCase();
  if (command === "help") {
    if (tokens.length < 2 || !shellNames.has(tokens[1].toLowerCase()))
      return null;
  } else if (!shellNames.has(command)) return null;
  if (
    command === "find" &&
    tokens.length > 1 &&
    !/^(?:[./~]|-[a-z]|\/|reports?$|orders?$|home$|var$|etc$|usr$)/i.test(
      tokens[1],
    )
  )
    return null;
  if (
    command === "clear" &&
    tokens.slice(1).some((token) => /plan|selection|order/i.test(token))
  )
    return null;
  const argumentError = shellArgumentError(command, tokens.slice(1));
  if (argumentError) return rejectedShell(trimmed, argumentError);
  return {
    command: command.toUpperCase() as AvaShellInstruction["command"],
    args: tokens.slice(1),
    raw: trimmed,
  };
};

export const normalizeSemanticInput = (raw: string) => {
  const basic = raw
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\b2ndary\b/g, "secondary")
    .replace(/\bnon[\s-]?main\b/g, "non main")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  const tokens = basic
    .split(" ")
    .filter(Boolean)
    .flatMap((token) => (TYPO_VARIANTS[token] ?? token).split(" "));
  return {
    normalized: tokens.join(" "),
    tokens,
    variants: basic === tokens.join(" ") ? [] : [basic],
  };
};

export const stableUtteranceHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

type IndexedRecipe = {
  normalized: string;
  scope: AvaSemanticQuery["scope"];
  criteria: AvaEvaluationCriterion[];
  provenance: string[];
  classification: "generated" | "colloquial" | "misspelled" | "curated";
};

const adviceVerbs = [
  "advise me on",
  "give me advice on",
  "help me choose",
  "tell me what to take from",
  "what should i pick from",
  "what would you choose from",
  "which one makes sense among",
  "assess",
  "evaluate",
  "recommend from",
];
const secondaryScopes = [
  "secondary",
  "side",
  "non main",
  "domestic and network",
  "network and domestic",
  "other",
  "remaining",
  "auxiliary",
];
const campaignSubjects = [
  "mission",
  "missions",
  "operation",
  "operations",
  "maneuver",
  "maneuvers",
  "option",
  "options",
  "choice",
  "choices",
];
const criterionSuffixes: Array<{
  text: string;
  criterion: AvaEvaluationCriterion;
}> = [
  { text: "", criterion: "OVERALL_VALUE" },
  { text: " if production matters", criterion: "PRODUCTION" },
  { text: " by lowest risk", criterion: "LOWEST_RISK" },
  { text: " by materiel cost", criterion: "LOWEST_MATERIEL_COST" },
  { text: " for the front", criterion: "FRONT" },
  { text: " for the long term", criterion: "LONG_TERM" },
];

const generatedIndex = new Map<string, IndexedRecipe[]>();
const registerGenerated = (recipe: IndexedRecipe) => {
  const hash = stableUtteranceHash(recipe.normalized);
  generatedIndex.set(hash, [...(generatedIndex.get(hash) ?? []), recipe]);
};

for (const verb of adviceVerbs)
  for (const scope of secondaryScopes)
    for (const subject of campaignSubjects)
      for (const suffix of criterionSuffixes) {
        const normalized = normalizeSemanticInput(
          `${verb} ${scope} ${subject}${suffix.text}`,
        ).normalized;
        registerGenerated({
          normalized,
          scope: {
            group: "SECONDARY",
            domains: ["DOMESTIC", "NETWORK"],
            excludedDomains: ["MAIN"],
          },
          criteria: [suffix.criterion],
          provenance: [
            `REQUEST_ADVICE:${verb}`,
            `SECONDARY_SCOPE:${scope}`,
            `CAMPAIGN_SUBJECT:${subject}`,
            `CRITERION:${suffix.criterion}`,
          ],
          classification: "generated",
        });
      }

export const AVA_UTTERANCE_INDEX = generatedIndex;
export const AVA_UTTERANCE_COLLISIONS = [...generatedIndex.entries()].flatMap(
  ([hash, entries]) => {
    const meanings = new Set(
      entries.map(
        (entry) =>
          `${entry.scope.group}:${entry.criteria.join(",")}:${entry.normalized}`,
      ),
    );
    return meanings.size > 1 ? [{ hash, entries }] : [];
  },
);
export const AVA_UTTERANCE_COVERAGE = {
  recognizedUtterances: [...generatedIndex.values()].reduce(
    (sum, entries) => sum + entries.length,
    0,
  ),
  hashBuckets: generatedIndex.size,
  collisions: AVA_UTTERANCE_COLLISIONS.length,
  grammarComponents: {
    requestAdvice: adviceVerbs.length,
    secondaryScope: secondaryScopes.length,
    campaignSubject: campaignSubjects.length,
    criteria: criterionSuffixes.length,
  },
};

export type AvaCorpusExpectation = {
  id: string;
  class:
    | "formal"
    | "conversational"
    | "terse"
    | "fragment"
    | "colloquial"
    | "profane"
    | "misspelled"
    | "reordered"
    | "implied"
    | "contextual"
    | "correction"
    | "negative-neighbor"
    | "ambiguous-neighbor";
  utterance: string;
  operation: AvaSemanticOperation;
  subject: AvaSemanticSubject;
  scope?: AvaSemanticQuery["scope"]["group"];
  forbiddenScope?: AvaSemanticQuery["scope"]["group"];
};

/**
 * Curated expectations sit beside the combinatorial index. They preserve
 * semantic edge cases that become less accurate when generalized away.
 */
export const AVA_CAMPAIGN_LANGUAGE_CORPUS: readonly AvaCorpusExpectation[] = [
  {
    id: "campaign-formal-advice",
    class: "formal",
    utterance: "advise me on the missions",
    operation: "ADVISE",
    subject: "CAMPAIGN_CHOICE",
    scope: "ALL",
  },
  {
    id: "secondary-formal-advice",
    class: "formal",
    utterance: "advise me on the secondary missions",
    operation: "ADVISE",
    subject: "CAMPAIGN_CHOICE",
    scope: "SECONDARY",
  },
  {
    id: "secondary-conversational",
    class: "conversational",
    utterance: "what about the side missions",
    operation: "INSPECT",
    subject: "CAMPAIGN_CHOICE",
    scope: "SECONDARY",
  },
  {
    id: "secondary-terse",
    class: "terse",
    utterance: "compare n and d",
    operation: "COMPARE",
    subject: "CAMPAIGN_CHOICE",
    scope: "SECONDARY",
  },
  {
    id: "secondary-safety",
    class: "reordered",
    utterance: "which non-main mission is safer",
    operation: "RANK",
    subject: "CAMPAIGN_CHOICE",
    scope: "SECONDARY",
  },
  {
    id: "all-implied",
    class: "implied",
    utterance: "what else can I do today",
    operation: "LIST",
    subject: "CAMPAIGN_CHOICE",
    scope: "ALL",
  },
  {
    id: "secondary-colloquial",
    class: "colloquial",
    utterance: "are either of the other operations worth it",
    operation: "ADVISE",
    subject: "CAMPAIGN_CHOICE",
    scope: "SECONDARY",
  },
  {
    id: "secondary-rank-exclusion",
    class: "reordered",
    utterance: "ignore the main one and rank the rest",
    operation: "RANK",
    subject: "CAMPAIGN_CHOICE",
    scope: "SECONDARY",
  },
  {
    id: "secondary-materiel",
    class: "conversational",
    utterance: "which secondary option costs less materiel",
    operation: "RANK",
    subject: "CAMPAIGN_CHOICE",
    scope: "SECONDARY",
  },
  {
    id: "secondary-production",
    class: "fragment",
    utterance: "best domestic or network choice if production matters",
    operation: "RANK",
    subject: "CAMPAIGN_CHOICE",
    scope: "SECONDARY",
  },
  {
    id: "context-justification",
    class: "contextual",
    utterance: "why did you choose the domestic mission",
    operation: "JUSTIFY",
    subject: "CAMPAIGN_CHOICE",
    scope: "DOMESTIC",
  },
  {
    id: "context-other",
    class: "contextual",
    utterance: "what about the other one",
    operation: "INSPECT",
    subject: "CAMPAIGN_CHOICE",
  },
  {
    id: "correction-network",
    class: "correction",
    utterance: "no, I meant the network option",
    operation: "CORRECT",
    subject: "CAMPAIGN_CHOICE",
    scope: "NETWORK",
  },
  {
    id: "counterfactual-without-production",
    class: "contextual",
    utterance: "would you still recommend it without the production gain",
    operation: "ADVISE",
    subject: "CAMPAIGN_CHOICE",
  },
  {
    id: "risk-profane",
    class: "profane",
    utterance: "which one fucks me least",
    operation: "RANK",
    subject: "CAMPAIGN_CHOICE",
    scope: "ALL",
  },
  {
    id: "secondary-misspelled",
    class: "misspelled",
    utterance: "adv me secondary missons",
    operation: "ADVISE",
    subject: "CAMPAIGN_CHOICE",
    scope: "SECONDARY",
  },
  {
    id: "negated-secondary-advice",
    class: "negative-neighbor",
    utterance: "do not advise me on the secondary missions",
    operation: "CORRECT",
    subject: "CAMPAIGN_CHOICE",
    scope: "SECONDARY",
  },
  {
    id: "secondary-objective-attachment",
    class: "negative-neighbor",
    utterance: "what is the secondary objective of the main mission",
    operation: "INSPECT",
    subject: "MISSION_OBJECTIVE",
    scope: "MAIN",
    forbiddenScope: "SECONDARY",
  },
  {
    id: "ordinal-second",
    class: "ambiguous-neighbor",
    utterance: "show me the second mission",
    operation: "LIST",
    subject: "CAMPAIGN_CHOICE",
    scope: "ALL",
    forbiddenScope: "SECONDARY",
  },
  {
    id: "secondary-predicate",
    class: "negative-neighbor",
    utterance: "is production secondary to military readiness",
    operation: "CHALLENGE",
    subject: "METRIC",
    forbiddenScope: "SECONDARY",
  },
] as const;

const span = (input: string, phrase: string): AvaSourceSpan | undefined => {
  const start = input.indexOf(phrase);
  return start < 0
    ? undefined
    : { start, end: start + phrase.length, text: phrase };
};

const concept = (
  input: string,
  phrases: string[],
): { phrase: string; sourceSpan: AvaSourceSpan } | null => {
  for (const phrase of phrases) {
    const found = span(input, phrase);
    if (found) return { phrase, sourceSpan: found };
  }
  return null;
};

const matchedEntityIds = (input: string, entities: AvaEntity[]) =>
  entities
    .filter((entity) =>
      [entity.handle ?? "", entity.id, entity.label, ...(entity.aliases ?? [])]
        .map((value) => normalizeSemanticInput(value).normalized)
        .filter((value) => value.length > 1)
        .some((value) => input.includes(value)),
    )
    .map((entity) => entity.id);

const operationFor = (
  input: string,
  discourse?: AvaDiscourseState,
): AvaSemanticOperation => {
  if (
    /\b(do not|dont|never|stop)\b.*\b(advise|recommend)\b/.test(input) ||
    /^(no|not) .*meant\b/.test(input) ||
    /^no i meant\b/.test(input)
  )
    return "CORRECT";
  if (/^(no|not|correction)\b|i meant|rather than/.test(input))
    return "CORRECT";
  if (
    /\bwhy (did|do|would) (you )?(choose|recommend|rank)\b/.test(input) ||
    /\bwhy (that|this) one\b/.test(input)
  )
    return "JUSTIFY";
  if (/\b(compare|versus| vs | v )\b/.test(` ${input} `)) return "COMPARE";
  if (
    /\b(rank|ranking|best|safest|safer|strongest|stronger|cheapest|cheaper|worst|least|costs? less|more efficient|most efficient)\b/.test(
      input,
    )
  )
    return "RANK";
  if (
    /\b(advise|recommend|what should|what would you choose|worth|viable|should i|where do i start|what (?:the )?(?:fuck|hell) do i do|wtf do i do|next move)\b/.test(
      input,
    )
  )
    return "ADVISE";
  if (/^what about\b/.test(input))
    return discourse?.lastRecommended ? "ADVISE" : "INSPECT";
  if (/\b(calculate|calculus|equation|math)\b/.test(input)) return "CALCULATE";
  if (/\b(forecast|predict|project|what happens if)\b/.test(input))
    return "PREDICT";
  if (/\b(why|explain|meaning|mean)\b/.test(input)) return "EXPLAIN";
  if (/\b(list|show|what else|available)\b/.test(input)) return "LIST";
  if (/\b(is production secondary to|challenge)\b/.test(input))
    return "CHALLENGE";
  return "INSPECT";
};

const scopeFor = (input: string) => {
  const excludedDomains: AvaScopeDomain[] = [];
  if (/\b(ignore|exclude|without|not)\b.*\bmain\b/.test(input))
    excludedDomains.push("MAIN");

  const ordinalOrAttachment =
    /\bsecondary (objective|effect|effects|purpose|consequence)\b/.test(input) ||
    /\b(second|2nd) (mission|operation|option|choice)\b/.test(input) ||
    /\bis .+ secondary to\b/.test(input);
  const secondary =
    !ordinalOrAttachment &&
    (/\b(secondary|side|non main|auxiliary) (mission|missions|operation|operations|maneuver|maneuvers|option|options|choice|choices|trees?)\b/.test(
      input,
    ) ||
      /\b(anything outside|everything outside|other|remaining) (the )?(main|missions|operations|options|choices)\b/.test(
        input,
      ) ||
      /\b(n and d|d and n|n vs d|d vs n|domestic and network|network and domestic|domestic v network|network v domestic)\b/.test(
        input,
      ));
  if (secondary || excludedDomains.includes("MAIN"))
    return {
      group: "SECONDARY" as const,
      domains: ["DOMESTIC", "NETWORK"] as AvaScopeDomain[],
      excludedDomains: ["MAIN"] as AvaScopeDomain[],
    };

  const domains: AvaScopeDomain[] = [];
  if (/\bmain\b/.test(input)) domains.push("MAIN");
  if (/\b(domestic|\bd\b)\b/.test(input)) domains.push("DOMESTIC");
  if (/\b(network|\bn\b)\b/.test(input)) domains.push("NETWORK");
  const unique = [...new Set(domains)];
  const group =
    unique.length === 1
      ? unique[0]
      : unique.length === 2 &&
          unique.includes("DOMESTIC") &&
          unique.includes("NETWORK")
        ? ("SECONDARY" as const)
      : unique.length === 3
        ? ("ALL" as const)
        : undefined;
  return { group, domains: unique, excludedDomains };
};

const subjectFor = (input: string): AvaSemanticSubject => {
  if (/\bsecondary (objective|purpose)\b|\bmission objective\b/.test(input))
    return "MISSION_OBJECTIVE";
  if (/\b(score|rating|points)\b/.test(input)) return "SCORE";
  if (
    /\b(mission|missions|operation|operations|maneuver|maneuvers|option|options|choice|choices|order|orders)\b/.test(
      input,
    ) ||
    /\b(what else can i do|which one|other one|other two|the rest|n and d|d and n|n vs d|d vs n|recommend it|choose it)\b/.test(
      input,
    )
  )
    return "CAMPAIGN_CHOICE";
  if (
    /\b(production|readiness|materiel|military|desertion|net flight|intelligence|legitimacy|resistance)\b/.test(
      input,
    )
  )
    return "METRIC";
  if (/\b(report|brief|ledger)\b/.test(input)) return "REPORT";
  return "UNKNOWN";
};

const criteriaFor = (input: string): AvaEvaluationCriterion[] => {
  const criteria: AvaEvaluationCriterion[] = [];
  if (/\b(safest|safer|lowest risk|fucks me least|least destructive|least likely to fail)\b/.test(input))
    criteria.push("LOWEST_RISK");
  if (/\b(strongest|highest force|most powerful)\b/.test(input))
    criteria.push("STRONGEST");
  if (/\b(cheapest|cheaper|costs? less|lowest cost)\b/.test(input))
    criteria.push("CHEAPEST");
  if (/\b(materiel cost|spending materiel|without spending reserves)\b/.test(input))
    criteria.push("LOWEST_MATERIEL_COST");
  if (/\bproduction\b.*\b(matters|priority|best|protect|gain)\b|\bfor production\b/.test(input))
    criteria.push("PRODUCTION");
  if (/\b(front|attack|ground|enemy attacks)\b/.test(input))
    criteria.push("FRONT");
  if (/\b(long term|long run|sustainable)\b/.test(input))
    criteria.push("LONG_TERM");
  if (/\b(right now|today|immediate)\b/.test(input))
    criteria.push("IMMEDIATE");
  if (/\b(reversible|most reversible)\b/.test(input))
    criteria.push("REVERSIBILITY");
  if (/\b(highest upside|upside)\b/.test(input))
    criteria.push("HIGHEST_UPSIDE");
  return criteria.length ? [...new Set(criteria)] : ["OVERALL_VALUE"];
};

const overlaysFor = (input: string) => {
  const overlays: AvaSemanticQuery["overlays"] = [];
  const without = input.match(/\bwithout (?:the )?([a-z ]+?)(?:$| if | and )/);
  if (without)
    overlays.push({
      kind: "WITHOUT_EFFECT",
      target: without[1].trim(),
      sourceText: without[0],
    });
  const lose = input.match(/\b(?:if|assume) (?:i |we )?lose (\d+) ([a-z]+)/);
  if (lose)
    overlays.push({
      kind: "ASSUME_STATE",
      target: lose[2],
      value: -Number(lose[1]),
      sourceText: lose[0],
    });
  const expect = input.match(/\bif (?:the )?enemy attacks? (today|tomorrow)\b/);
  if (expect)
    overlays.push({
      kind: "EXPECT_EVENT",
      target: "enemy attack",
      value: expect[1],
      sourceText: expect[0],
    });
  if (/\b(?:at|with) full readiness\b/.test(input))
    overlays.push({
      kind: "ASSUME_STATE",
      target: "readiness",
      value: 100,
      sourceText: input.match(/\b(?:at|with) full readiness\b/)?.[0] ??
        "at full readiness",
    });
  if (/\b(?:ignore|without) (?:the )?production penalty\b/.test(input))
    overlays.push({
      kind: "IGNORE_COST",
      target: "production",
      sourceText:
        input.match(/\b(?:ignore|without) (?:the )?production penalty\b/)?.[0] ??
        "ignore production penalty",
    });
  if (
    /\bnetwork (?:mission|operation|option) (?:expired|expires|is unavailable)\b/.test(
      input,
    )
  )
    overlays.push({
      kind: "REMOVE_ENTITY",
      target: "network",
      sourceText:
        input.match(
          /\bnetwork (?:mission|operation|option) (?:expired|expires|is unavailable)\b/,
        )?.[0] ?? "network mission expired",
    });
  if (/\bassume (?:i|we) take the main mission first\b/.test(input))
    overlays.push({
      kind: "ASSUME_ACTION",
      target: "main",
      sourceText:
        input.match(/\bassume (?:i|we) take the main mission first\b/)?.[0] ??
        "assume I take the Main mission first",
    });
  return overlays;
};

const referenceFor = (
  input: string,
): AvaSemanticQuery["reference"] | undefined => {
  if (/\bwhy (that|this) one\b|\bwhy did you choose\b/.test(input))
    return { type: "LAST_RECOMMENDATION" };
  if (/\bother (one|two)\b|\bwhat else\b/.test(input))
    return { type: "OTHER_ENTITY" };
  if (/\b(it|that one|this one)\b/.test(input))
    return { type: "SELECTED_ENTITY" };
  if (/\bsecond reason\b/.test(input)) return { type: "PRIOR_REASON" };
  return undefined;
};

export type SemanticCompilation = {
  query: AvaSemanticQuery;
  concepts: Array<{ kind: string; canonical: string; source: string }>;
  contextualResolutions: string[];
  grammarProvenance: string[];
  exactIndexHit: boolean;
};

export const compileSemanticQuery = (
  raw: string,
  context: AvaCompilerContext,
): SemanticCompilation => {
  const { normalized: input } = normalizeSemanticInput(raw);
  const bucket = generatedIndex.get(stableUtteranceHash(input)) ?? [];
  const indexed = bucket.find((entry) => entry.normalized === input);
  const operation = operationFor(input, context.discourse);
  let scope = indexed?.scope ?? scopeFor(input);
  const subject = subjectFor(input);
  const criteria = indexed?.criteria ?? criteriaFor(input);
  const sourceSpans: Record<string, AvaSourceSpan> = {};
  const concepts: SemanticCompilation["concepts"] = [];
  const contextualResolutions: string[] = [];
  const register = (kind: string, canonical: string, phrases: string[]) => {
    const match = concept(input, phrases);
    if (!match) return;
    sourceSpans[kind.toLowerCase()] = match.sourceSpan;
    concepts.push({ kind, canonical, source: match.phrase });
  };
  register("OPERATION", operation, [
    "advise",
    "recommend",
    "compare",
    "rank",
    "why",
    "show",
    "what about",
  ]);
  if (scope.group)
    register("SCOPE", scope.group, [
      "secondary",
      "side",
      "non main",
      "domestic and network",
      "network and domestic",
      "main",
      "domestic",
      "network",
    ]);
  register("SUBJECT", subject, campaignSubjects);

  let reference = referenceFor(input);
  if (
    reference?.type === "SELECTED_ENTITY" &&
    !context.selected &&
    !context.discourse?.lastRecommended
  )
    reference = undefined;
  if (!scope.domains.length && reference && context.discourse?.lastScope.length) {
    scope = {
      ...scope,
      domains: [...context.discourse.lastScope],
      group:
        context.discourse.lastScope.length === 2 &&
        context.discourse.lastScope.includes("DOMESTIC") &&
        context.discourse.lastScope.includes("NETWORK")
          ? "SECONDARY"
          : context.discourse.lastScope[0],
    };
    contextualResolutions.push(
      `Scope inherited from discourse: ${scope.domains.join(", ")}`,
    );
  }
  if (!scope.domains.length && subject === "CAMPAIGN_CHOICE") {
    scope = {
      ...scope,
      group: "ALL",
      domains: ["MAIN", "DOMESTIC", "NETWORK"],
    };
    contextualResolutions.push("Campaign scope defaulted to the active docket.");
  }

  const entityIds = matchedEntityIds(input, context.entities);
  if (
    reference?.type === "LAST_RECOMMENDATION" &&
    context.discourse?.lastRecommended &&
    !entityIds.includes(context.discourse.lastRecommended)
  ) {
    entityIds.push(context.discourse.lastRecommended);
    contextualResolutions.push(
      `Resolved recommendation reference to ${context.discourse.lastRecommended}.`,
    );
  }
  if (
    reference?.type === "OTHER_ENTITY" &&
    context.discourse?.lastEntities.length
  ) {
    for (const id of context.discourse.lastEntities)
      if (!entityIds.includes(id)) entityIds.push(id);
    contextualResolutions.push("Resolved OTHER through the prior option set.");
  }
  if (
    reference?.type === "SELECTED_ENTITY" &&
    (context.selected || context.discourse?.lastRecommended)
  ) {
    const selectedId = context.selected?.id ?? context.discourse?.lastRecommended;
    if (selectedId && !entityIds.includes(selectedId)) entityIds.push(selectedId);
    if (selectedId)
      contextualResolutions.push(`Resolved selected object to ${selectedId}.`);
  }

  const negativeAdvice =
    operation === "CORRECT" &&
    /\b(do not|dont|never|stop)\b.*\b(advise|recommend)\b/.test(input);
  const ordinal = input.match(/\b(second|2nd|third|3rd|first|1st)\b/);
  const ordinalValue =
    ordinal?.[1] === "second" || ordinal?.[1] === "2nd"
      ? 2
      : ordinal?.[1] === "third" || ordinal?.[1] === "3rd"
        ? 3
        : ordinal
          ? 1
          : undefined;
  const query: AvaSemanticQuery = {
    operation,
    subject: { type: subject, entityIds },
    scope,
    metric:
      subject === "METRIC"
        ? [
            "production",
            "readiness",
            "materiel",
            "desertion",
            "intelligence",
            "legitimacy",
            "resistance",
          ].find((metric) => input.includes(metric))
        : undefined,
    timeframe: /\b(yesterday|last|historical|previous)\b/.test(input)
      ? "HISTORICAL"
      : /\b(if|would|forecast|predict|project|without|assume)\b/.test(input)
        ? "PROJECTED"
        : /\btoday|current|now\b/.test(input)
          ? "CURRENT_DAY"
          : "CURRENT_DOCKET",
    comparisonMode:
      operation === "RANK"
        ? "RANK"
        : operation === "COMPARE"
          ? "PAIR"
          : undefined,
    criteria,
    polarity: negativeAdvice ? "NEGATED" : "AFFIRMATIVE",
    quantity: ordinalValue
      ? { kind: "ORDINAL", value: ordinalValue }
      : undefined,
    certainty: /\b(maybe|likely|probably|uncertain)\b/.test(input)
      ? "UNCERTAIN"
      : undefined,
    requestedDetail: /\b(calculus|equation|math|numerically)\b/.test(input)
      ? "CALCULUS"
      : /\b(why|reason|explain)\b/.test(input)
        ? "REASONS"
        : "JUDGMENT",
    perspective: "PLAYER",
    reference,
    outputForm: /\b(xlsx|excel|spreadsheet|download)\b/.test(input)
      ? "SPREADSHEET"
      : /\b(report|brief|ledger)\b/.test(input)
        ? "REPORT"
        : "TERMINAL",
    overlays: overlaysFor(input),
    confidence:
      indexed || concepts.length >= 2
        ? 1
        : concepts.length
          ? 0.86
          : 0.62,
    sourceSpans,
  };
  return {
    query,
    concepts,
    contextualResolutions,
    grammarProvenance: indexed?.provenance ?? [
      `COMPOSITIONAL:${operation}`,
      `SUBJECT:${subject}`,
      `SCOPE:${query.scope.group ?? "CONTEXT"}`,
    ],
    exactIndexHit: !!indexed,
  };
};

export const genericSemanticQuery = (
  instruction: AvaInstruction,
  context: AvaCompilerContext,
): AvaSemanticQuery => {
  if (instruction.kind === "SEMANTIC") return instruction.query;
  const operation: AvaSemanticOperation =
    instruction.kind === "ADVISE"
      ? "ADVISE"
      : instruction.kind === "COMPARE"
        ? "COMPARE"
        : instruction.kind === "FORECAST"
          ? "PREDICT"
          : instruction.kind === "EXPLAIN"
            ? "EXPLAIN"
            : instruction.kind === "LIST" || instruction.kind === "ORDERS"
              ? "LIST"
              : instruction.kind === "REPORT" || instruction.kind === "STATUS"
                ? "SUMMARIZE"
                : instruction.kind === "CONFIRM"
                  ? "CONFIRM"
                  : "INSPECT";
  return {
    operation,
    subject: {
      type:
        instruction.kind === "REPORT" ? "REPORT" : "SYSTEM",
      entityIds:
        instruction.kind === "EXPLAIN"
          ? [instruction.entity.id]
          : instruction.kind === "COMPARE"
            ? instruction.entities.map((entity) => entity.id)
            : context.selected
              ? [context.selected.id]
              : [],
    },
    scope: { domains: [], excludedDomains: [] },
    timeframe: "CURRENT_DOCKET",
    criteria: ["OVERALL_VALUE"],
    polarity: "AFFIRMATIVE",
    requestedDetail:
      instruction.kind === "EXPLAIN" && instruction.facet === "calculus"
        ? "CALCULUS"
        : "JUDGMENT",
    perspective: "PLAYER",
    outputForm:
      instruction.kind === "REPORT" ? "REPORT" : "TERMINAL",
    overlays: [],
    confidence: 1,
    sourceSpans: {},
  };
};
