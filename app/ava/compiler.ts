import type {
  AvaCompileResult,
  AvaCompilerContext,
  AvaCompilerTrace,
  AvaEntity,
  AvaEntityKind,
  AvaInstruction,
  AvaModule,
  AvaReportTopic,
} from "./schema";
import {
  compileSemanticQuery,
  genericSemanticQuery,
  normalizeSemanticInput,
  parseAvaShellInput,
  resolveOrdinalDocketReference,
  type SemanticCompilation,
} from "./grammar";
import {
  contextualFailurePrompt,
  matchAvaContextualLanguage,
} from "./contextual-language-compiler";
export {
  validateContextualLanguage,
  validateLanguageEntries,
} from "./contextual-language";
export {
  AVA_CAMPAIGN_ADVICE_GRAMMAR,
  AVA_CAMPAIGN_LANGUAGE_CORPUS,
  AVA_CLASSIC_CAPABILITY_REGISTRY,
  AVA_COMPILED_AGENCY_BUNDLE,
  AVA_DELENDA_DOMAIN_PACK,
  AVA_UTTERANCE_COLLISIONS,
  AVA_UTTERANCE_COVERAGE,
  AVA_UTTERANCE_INDEX,
  compileAgencyBundle,
  compileCompiledAgencyBundle,
  compileGrammarSpec,
  normalizeSemanticInput,
  semanticQueriesEqual,
  semanticQuerySignature,
  stableUtteranceHash,
} from "./grammar";
export type {
  AvaSemanticField,
  CapabilityRegistry,
  CompiledAgencyBundle,
  CompiledSemanticRecipe,
  CompileAgencyBundleInput,
  DomainPack,
  GrammarAtom,
  GrammarCollision,
  GrammarSlot,
  GrammarSpec,
} from "./grammar";
export { AVA_COMMAND_HELP } from "./schema";

const filler = new Set([
  "a",
  "an",
  "the",
  "me",
  "my",
  "our",
  "please",
  "ava",
  "now",
  "current",
  "currently",
  "some",
  "about",
  "its",
]);
const commandWords = new Set(
  "hello hi hey there online update orders order available actions missions list help grammar capabilities command commands status condition situation report reports produce brief briefing explain inspect what does meet mean affect affects underpin underpinnings improve raise change control calculus calculate open show take go navigate select choose prepare stage unstage remove plan maneuver manoeuvre forecast project projection predict compare versus vs with and clear cancel unselect commit issue execute do it that yes confirm never mind internalize learn respond exploit answer resolve end close day days daily unlock on off export chat log to for from of over last past how is are give loss losses casualties attrition retrospective recap after action production domestic network intelligence intel adversary enemy effects resources personnel opportunities opportunity doctrine diplomatic military directives service record outlook next happens recommend recommendation advise viable viability feasible feasibility precondition preconditions prerequisite prerequisites start move more less repeat who you thanks thank fuck fucking shit sense".split(
    " ",
  ),
);

export const normalizeAvaInput = (raw: string) =>
  raw
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

export const classifyAvaInteraction = (
  raw: string,
): AvaCompilerTrace["interaction"] => {
  const input = normalizeAvaInput(raw);
  if (
    /^(?:status|missions?|orders?|help|grammar|capabilities|commands?|production|military|diplomacy|doctrine|projection|retrospective|daily brief(?:ing)?|more|less|repeat|storyteller mode|concise mode)$/.test(
      input,
    ) ||
    /^(?:list|show|open|report|forecast|compare|inspect|prepare|stage|unstage|issue|execute|confirm|cancel|resolve|export|enable|disable)\b/.test(
      input,
    ) ||
    /^daily unlock (?:on|off)$/.test(input)
  )
    return "explicit";
  if (
    /^(?:what|why|how|where|when|who|which)\b/.test(input) ||
    /^(?:tell me|give me|brief me|catch me up|bring me up to speed|orient me|explain to me|can you|could you|would you)\b/.test(
      input,
    ) ||
    compileAvaPlayerNeed(input)
  )
    return "open-ended";
  return "explicit";
};

export type AvaPlayerNeed =
  | "NEXT_ACTION"
  | "HOW_TO_PLAY"
  | "CURRENT_POSITION"
  | "RECENT_ACTIONS";

export type AvaPlayerNeedParse = {
  need: AvaPlayerNeed;
  normalizedInput: string;
  match: "exact" | "composed";
  rule: string;
};

const crossProduct = (...dimensions: readonly (readonly string[])[]) =>
  dimensions.reduce<string[]>(
    (phrases, dimension) =>
      phrases.flatMap((phrase) =>
        dimension.map((part) => `${phrase} ${part}`.trim()),
      ),
    [""],
  );

const playerNeedSurfaces: Record<AvaPlayerNeed, readonly string[]> = {
  NEXT_ACTION: [
    "what next",
    "whats next",
    "what now",
    "what to do",
    "what am i supposed to do",
    "what are we supposed to do",
    "tell me what to do",
    "give me a next move",
    "give me the next move",
    "give me a next step",
    "give me the next step",
    "recommend a next move",
    "recommend the next move",
    "where do we go from here",
    "where should we go from here",
    "how do i proceed",
    "how should i proceed",
    "how do we proceed",
    "how should we proceed",
    "how do i continue",
    "how do we continue",
    ...crossProduct(
      ["what do", "what should", "what can"],
      ["i", "we"],
      ["do"],
      ["", "now", "next"],
    ),
    ...crossProduct(
      ["where do", "where should", "where can"],
      ["i", "we"],
      ["start", "begin", "go"],
      ["", "now", "next"],
    ),
  ],
  HOW_TO_PLAY: [
    "how to play",
    "how does this work",
    "how does the game work",
    "how is this played",
    "how is the game played",
    "what are the rules",
    "show me the rules",
    "explain the rules",
    "game rules",
    "instructions",
    "game instructions",
    "tutorial",
    "start tutorial",
    "teach me",
    "teach me the game",
    "teach me how to play",
    "show me how to play",
    "tell me how to play",
    "explain how to play",
    "help me play",
    "help me get started",
    "i dont know how to play",
    "i do not know how to play",
    "i dont understand how to play",
    "i do not understand how to play",
    "im lost",
    "i am lost",
    ...crossProduct(
      ["how do", "how can"],
      ["i", "we"],
      ["play", "start", "get started"],
    ),
  ],
  CURRENT_POSITION: [
    "status",
    "status update",
    "update",
    "update me",
    "give me an update",
    "situation update",
    "command status",
    "command situation",
    "catch me up",
    "bring me up to speed",
    "where are we",
    "where do we stand",
    "how are we doing",
    "how is it going",
    "whats going on",
    "what is going on",
    "what is happening",
    "what is the situation",
    "show me the situation",
    "orient me",
  ],
  RECENT_ACTIONS: [
    "what changed",
    "what happened",
    "what happened last day",
    "what happened last turn",
    "what did i do",
    "what did we do",
    "what have i done",
    "what have we done",
    "what was my last move",
    "what was our last move",
    "recap my last move",
    "recap our last move",
    "recap the last turn",
    "recap the last day",
    "show me what i did",
    "show me what we did",
    "yesterdays outcome",
  ],
};

const playerNeedIndex = new Map<string, AvaPlayerNeed>();
for (const [need, surfaces] of Object.entries(playerNeedSurfaces) as Array<
  [AvaPlayerNeed, readonly string[]]
>) {
  for (const surface of surfaces) {
    const normalized = normalizeAvaInput(surface);
    const prior = playerNeedIndex.get(normalized);
    if (prior && prior !== need)
      throw new Error(
        `Ava player-need grammar collision: ${normalized} (${prior}/${need})`,
      );
    playerNeedIndex.set(normalized, need);
  }
}

export const AVA_PLAYER_NEED_UTTERANCES = Object.freeze(
  [...playerNeedIndex.entries()].map(([utterance, need]) => ({
    utterance,
    need,
  })),
);

/**
 * Generously classify common read-only player needs. This grammar may recover
 * natural orientation language, but it never emits a consequential command.
 */
export const compileAvaPlayerNeed = (
  raw: string,
): AvaPlayerNeedParse | null => {
  const normalizedInput = normalizeAvaInput(raw);
  if (!normalizedInput) return null;
  const exact = playerNeedIndex.get(normalizedInput);
  if (exact)
    return {
      need: exact,
      normalizedInput,
      match: "exact",
      rule: `player-need-exact:${exact.toLowerCase()}`,
    };

  const tokens = new Set(normalizedInput.split(" "));
  if (tokens.size > 14) return null;

  const asksForRules =
    tokens.has("rules") ||
    tokens.has("tutorial") ||
    tokens.has("instructions") ||
    (tokens.has("how") &&
      (tokens.has("play") ||
        ((tokens.has("this") || tokens.has("game")) &&
          (tokens.has("work") || tokens.has("works"))))) ||
    (tokens.has("help") &&
      (tokens.has("play") || tokens.has("started")));
  if (asksForRules)
    return {
      need: "HOW_TO_PLAY",
      normalizedInput,
      match: "composed",
      rule: "player-need-composed:how-to-play",
    };

  const forecastLanguage =
    tokens.has("happen") ||
    tokens.has("happens") ||
    tokens.has("forecast") ||
    tokens.has("predict");
  const asksForNextAction =
    !forecastLanguage &&
    ((tokens.has("what") &&
      (tokens.has("next") ||
        tokens.has("now") ||
        tokens.has("move") ||
        tokens.has("step") ||
        (tokens.has("do") &&
          (tokens.has("i") || tokens.has("we"))))) ||
      (tokens.has("where") &&
        (tokens.has("start") ||
          tokens.has("begin") ||
          tokens.has("go"))) ||
      (tokens.has("how") &&
        (tokens.has("proceed") || tokens.has("continue"))));
  if (asksForNextAction)
    return {
      need: "NEXT_ACTION",
      normalizedInput,
      match: "composed",
      rule: "player-need-composed:next-action",
    };

  const asksForRecentActions =
    (tokens.has("what") &&
      (tokens.has("did") || tokens.has("done")) &&
      (tokens.has("i") || tokens.has("we"))) ||
    (tokens.has("recap") &&
      (tokens.has("last") || tokens.has("move") || tokens.has("turn")));
  if (asksForRecentActions)
    return {
      need: "RECENT_ACTIONS",
      normalizedInput,
      match: "composed",
      rule: "player-need-composed:recent-actions",
    };

  const asksForPosition =
    tokens.has("status") ||
    tokens.has("situation") ||
    (tokens.has("catch") && tokens.has("up")) ||
    (tokens.has("where") && tokens.has("we")) ||
    (tokens.has("going") && tokens.has("on"));
  if (asksForPosition)
    return {
      need: "CURRENT_POSITION",
      normalizedInput,
      match: "composed",
      rule: "player-need-composed:current-position",
    };

  return null;
};

const instructionForPlayerNeed = (need: AvaPlayerNeed): AvaInstruction => {
  switch (need) {
    case "NEXT_ACTION":
      return { kind: "ADVISE" };
    case "HOW_TO_PLAY":
      return { kind: "HELP" };
    case "CURRENT_POSITION":
      return { kind: "STATUS" };
    case "RECENT_ACTIONS":
      return {
        kind: "REPORT",
        topic: "retrospective",
        days: 1,
        scope: "current",
      };
  }
};

export const isAvaConfirmationInput=(raw:string)=>{
  const input=normalizeAvaInput(raw);
  return(
    /^confirm(?:\s+[a-z0-9]+)*$/.test(input)||
    /^(?:yes|yes issue it|yes do it|accept|commit|do it|issue it|commit it|execute it)$/.test(
      input,
    )
  );
};

export type AvaGodModeIntent = {
  kind: "force-random-event";
  normalizedInput: string;
};

export const compileAvaGodModeIntent = (
  raw: string,
): AvaGodModeIntent | null => {
  const input = normalizeAvaInput(raw);
  if (!input) return null;

  const eventConcept =
    /\b(?:event|events|opportunity|opportunities|incident|incidents|encounter|encounters|random thing)\b/;
  const forcingVerb =
    /\b(?:force|trigger|cause|create|spawn|generate|give|make|invoke|start|run|produce|want|need|bring)\b/;
  const exactCheat =
    /^(?:ava )?(?:please )?(?:random|unexpected) (?:event|opportunity)(?: now| please)?$/;

  if (
    exactCheat.test(input) ||
    (eventConcept.test(input) && forcingVerb.test(input)) ||
    (forcingVerb.test(input) && /\b(?:something unexpected|random thing)\b/.test(input))
  )
    return { kind: "force-random-event", normalizedInput: input };

  return null;
};

export type AvaTurnModeIntent = {
  kind: "set-daily-unlock";
  enabled: boolean;
  vocabulary: "daily-unlock" | "godmode";
  normalizedInput: string;
};

/**
 * Account turnover is persisted by the authenticated turn service rather than
 * the synchronous campaign-state Nexus. Compile its Ava surface language into
 * one typed adapter intent so aliases cannot acquire different mechanics.
 */
export const compileAvaTurnModeIntent = (
  raw: string,
): AvaTurnModeIntent | null => {
  const input = normalizeAvaInput(raw);
  if (input === "daily unlock on" || input === "daily unlock off")
    return {
      kind: "set-daily-unlock",
      enabled: input.endsWith(" on"),
      vocabulary: "daily-unlock",
      normalizedInput: input,
    };
  if (
    /^(?:enable|disable) god ?mode$/.test(input) ||
    /^god ?mode (?:on|off)$/.test(input) ||
    /^turn god ?mode (?:on|off)$/.test(input)
  )
    return {
      kind: "set-daily-unlock",
      enabled: /(?:enable god ?mode|god ?mode on|turn god ?mode on)$/.test(input),
      vocabulary: "godmode",
      normalizedInput: input,
    };
  return null;
};

const words = (value: string) =>
  normalizeAvaInput(value).split(" ").filter(Boolean);
const phraseSet = (entity: AvaEntity) =>
  [entity.id, entity.label, entity.handle ?? "", ...(entity.aliases ?? [])]
    .map(normalizeAvaInput)
    .filter(Boolean);
const containsPhrase = (input: string, phrase: string) =>
  input === phrase ||
  input.startsWith(`${phrase} `) ||
  input.endsWith(` ${phrase}`) ||
  input.includes(` ${phrase} `);

const entityMatches = (
  input: string,
  entities: AvaEntity[],
  kind?: AvaEntityKind,
) => {
  const candidates = entities
    .filter((entity) => !kind || entity.kind === kind)
    .map((entity) => {
      const phrases = phraseSet(entity),
        inputTokens = new Set(words(input));
      const exact = phrases.some((phrase) => containsPhrase(input, phrase));
      const score = Math.max(
        ...phrases.map((phrase) => {
          const tokens = words(phrase);
          return tokens.length &&
            tokens.every((token) => inputTokens.has(token))
            ? tokens.length
            : 0;
        }),
        0,
      );
      return { entity, exact, score };
    })
    .filter((item) => item.score > 0);
  const exact = candidates.filter((item) => item.exact);
  if (exact.length) return exact.map((item) => item.entity);
  const best = Math.max(...candidates.map((item) => item.score), 0);
  return candidates
    .filter((item) => item.score === best)
    .map((item) => item.entity);
};

const trace = (
  rule: string,
  input: string,
  entities: AvaEntity[] = [],
  semantic?: SemanticCompilation,
): AvaCompilerTrace => {
  const tokens = words(input),
    known = new Set([...commandWords, ...filler]);
  entities
    .flatMap(phraseSet)
    .flatMap(words)
    .forEach((token) => known.add(token));
  semantic?.concepts
    .flatMap((item) => words(item.source))
    .forEach((token) => known.add(token));
  const tokenLedger: AvaCompilerTrace["tokenLedger"] = tokens.map(
    (token, index) => {
      const isFiller = filler.has(token);
      const isKnown = known.has(token);
      return {
        token,
        index,
        status: isKnown ? "consumed" : "unresolved",
        material: !isFiller,
        consumedBy: isKnown
          ? isFiller
            ? "filler"
            : "grammar"
          : undefined,
      };
    },
  );
  return {
    rule,
    rawInput: input,
    interaction: classifyAvaInteraction(input),
    normalizedInput: normalizeSemanticInput(input).normalized,
    normalizedTokens: normalizeSemanticInput(input).tokens,
    recognizedConcepts: semantic?.concepts ?? [],
    semanticQuery: semantic?.query,
    contextualResolutions: semantic?.contextualResolutions ?? [],
    grammarProvenance: semantic?.grammarProvenance,
    exactIndexHit: semantic?.exactIndexHit ?? false,
    tokenCount: tokens.length,
    tokenLedger,
    entityKinds: [...new Set(entities.map((entity) => entity.kind))],
    unresolvedTokenCount: tokenLedger.filter(
      (entry) => entry.status === "unresolved" && entry.material,
    ).length,
  };
};
const clarification = (
  input: string,
  failure:
    | "missing-target"
    | "ambiguous-target"
    | "unsupported-combination"
    | "unrecognized",
  rule: string,
  prompt: string,
  candidates?: AvaEntity[],
): AvaCompileResult => ({
  status: "clarify",
  failure,
  prompt,
  candidates,
  trace: trace(rule, input, candidates),
});
const compiled = (
  input: string,
  rule: string,
  instruction: AvaInstruction,
  entities: AvaEntity[] = [],
): AvaCompileResult => ({
  status: "compiled",
  instruction,
  semantic: genericSemanticQuery(instruction, {
    currentModule: "campaign",
    entities,
  }),
  trace: trace(rule, input, entities),
});

const moduleAliases: Record<string, AvaModule> = {
  home: "campaign",
  dashboard: "campaign",
  overview: "campaign",
  campaign: "campaign",
  front: "campaign",
  operations: "campaign",
  production: "national",
  industry: "national",
  industrial: "national",
  national: "national",
  military: "military",
  army: "military",
  forces: "military",
  diplomacy: "diplomacy",
  statecraft: "diplomacy",
  foreign: "diplomacy",
  doctrine: "doctrine",
  account: "account",
  wiki: "wiki",
  manual: "wiki",
};
const resolveModule = (input: string): AvaModule | null =>
  [
    ...new Set(
      Object.entries(moduleAliases)
        .filter(([alias]) => containsPhrase(input, alias))
        .map(([, module]) => module),
    ),
  ][0] ?? null;
const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
};
const reportWindow = (input: string) => {
  const digit = input.match(
    /(?:last|past|over(?: the)? last)\s+(\d{1,2})\s+days?/,
  );
  if (digit) return Math.max(1, Math.min(30, Number(digit[1])));
  const word = input.match(
    /(?:last|past|over(?: the)? last)\s+([a-z]+)\s+days?/,
  );
  return word && numberWords[word[1]] ? numberWords[word[1]] : undefined;
};
const moduleTopic = (module: AvaModule | null): AvaReportTopic =>
  module === "campaign"
    ? "daily-brief"
    : module === "national"
      ? "production"
      : module === "military"
        ? "military"
        : module === "diplomacy"
          ? "diplomacy"
          : module === "doctrine"
            ? "doctrine"
            : module === "account"
              ? "service-record"
              : "overview";
const uniqueEntity = (
  input: string,
  context: AvaCompilerContext,
  kind?: AvaEntityKind,
) => {
  const hits = entityMatches(input, context.entities, kind);
  return { hit: hits.length === 1 ? hits[0] : null, hits };
};

const actionPriority = (entity: AvaEntity) =>
  entity.kind === "sub-mission-option"
    ? 6
    : entity.kind === "maneuver"
      ? 5
      : entity.kind === "opportunity-response"
        ? 4
        : entity.kind === "doctrine-stage"
          ? 3
          : entity.kind === "directive"
            ? 2
            : 1;
const actionMatches = (input: string, context: AvaCompilerContext) => {
  const inputTokens = new Set(words(input));
  const byHandle = context.entities.filter(
    (entity) =>
      entity.action &&
      entity.handle &&
      inputTokens.has(normalizeAvaInput(entity.handle)),
  );
  if (byHandle.length)
    return [...new Map(byHandle.map((entity) => [entity.id, entity])).values()];
  const raw = entityMatches(input, context.entities).filter(
      (entity) => !!entity.action,
    ),
    byLabel = new Map<string, AvaEntity>();
  for (const entity of raw) {
    const key = normalizeAvaInput(entity.label),
      existing = byLabel.get(key);
    if (!existing || actionPriority(entity) > actionPriority(existing))
      byLabel.set(key, entity);
  }
  return [...byLabel.values()];
};

const consequentialKinds = new Set<AvaInstruction["kind"]>([
  "STAGE",
  "UNSTAGE",
  "ISSUE",
  "ISSUE_PLAN",
  "CLEAR_PLAN",
  "CLEAR",
  "SELECT",
  "COMMIT",
  "RESOLVE_DAY",
  "CONFIRM",
  "CANCEL",
  "COMPARE",
]);

const consequentialRuleWords: Record<string, string[]> = {
  stage: [
    "stage",
    "prepare",
    "select",
    "order",
    "orders",
    "action",
    "actions",
    "mission",
    "missions",
    "maneuver",
    "maneuvers",
    "manoeuvre",
    "manoeuvres",
  ],
  unstage: [
    "unstage",
    "remove",
    "order",
    "orders",
    "action",
    "actions",
  ],
  "issue-actions": [
    "issue",
    "commit",
    "execute",
    "order",
    "orders",
    "action",
    "actions",
  ],
  internalize: ["internalize", "learn", "doctrine", "stage"],
  respond: ["respond", "exploit", "answer", "opportunity", "response", "to"],
  "resolve-day": ["resolve", "end", "close", "day", "today"],
  "clear-plan": ["clear", "discard", "unselect", "plan", "all", "staged"],
  "issue-plan": ["issue", "commit", "execute", "plan", "staged"],
  confirm: ["confirm", "yes", "issue", "do", "it"],
  clear: ["clear", "unselect", "selection", "that", "order", "maneuver", "manoeuvre"],
  commit: ["do", "issue", "commit", "execute", "it"],
  select: ["choose", "maneuver", "manoeuvre", "order", "action"],
  "implicit-select": [],
  cancel: ["cancel", "never", "mind", "nevermind"],
  compare: [
    "compare",
    "versus",
    "vs",
    "v",
    "with",
    "and",
    "main",
    "domestic",
    "network",
    "n",
    "d",
    "secondary",
    "mission",
    "missions",
    "operation",
    "operations",
    "option",
    "options",
    "choice",
    "choices",
    "campaign",
    "production",
    "prod",
    "military",
    "mil",
    "diplomacy",
    "diplo",
    "doctrine",
    "item",
    "1",
    "2",
    "3",
  ],
};

const markTokenSequence = (
  inputTokens: string[],
  sequence: string[],
  consumedBy: Array<string | undefined>,
  owner: string,
) => {
  if (!sequence.length) return;
  for (
    let start = 0;
    start <= inputTokens.length - sequence.length;
    start += 1
  ) {
    if (
      sequence.every(
        (token, offset) => inputTokens[start + offset] === token,
      )
    )
      for (let offset = 0; offset < sequence.length; offset += 1)
        consumedBy[start + offset] = owner;
  }
};

const consequentialTokenLedger = (
  raw: string,
  rule: string,
  entities: AvaEntity[],
): AvaCompilerTrace["tokenLedger"] => {
  const tokens = normalizeSemanticInput(raw).tokens;
  const consumedBy: Array<string | undefined> = tokens.map(() => undefined);
  const allowed = new Set([
    ...(consequentialRuleWords[rule] ?? []),
    ...filler,
    "and",
    "the",
  ]);
  tokens.forEach((token, index) => {
    if (allowed.has(token))
      consumedBy[index] = filler.has(token) ? "filler" : `rule:${rule}`;
  });
  for (const entity of entities)
    for (const phrase of phraseSet(entity))
      markTokenSequence(
        tokens,
        words(phrase),
        consumedBy,
        `entity:${entity.id}`,
      );

  // Confirmation tokens are opaque authority handles. Once CONFIRM has
  // consumed its command head, the remainder belongs to that token rather
  // than to natural-language grammar.
  if (rule === "confirm" && tokens[0] === "confirm")
    for (let index = 1; index < tokens.length; index += 1)
      consumedBy[index] = "confirmation-token";

  return tokens.map((token, index) => ({
    token,
    index,
    status: consumedBy[index] ? "consumed" : "unresolved",
    material: !filler.has(token),
    consumedBy: consumedBy[index],
  }));
};

const conserveConsequentialTokens = (
  raw: string,
  result: AvaCompileResult,
): AvaCompileResult => {
  if (
    result.status !== "compiled" ||
    !consequentialKinds.has(result.instruction.kind)
  )
    return result;
  const entities =
    "entities" in result.instruction
      ? result.instruction.entities
      : "entity" in result.instruction && result.instruction.entity
        ? [result.instruction.entity]
        : [];
  const tokenLedger = consequentialTokenLedger(
    raw,
    result.trace.rule,
    entities,
  );
  const unresolved = tokenLedger.filter(
    (entry) => entry.material && entry.status === "unresolved",
  );
  const guardedTrace = {
    ...result.trace,
    rawInput: raw,
    tokenLedger,
    unresolvedTokenCount: unresolved.length,
  };
  if (!unresolved.length) return { ...result, trace: guardedTrace };
  return {
    status: "clarify",
    failure: "unsupported-combination",
    prompt: `I recognized ${result.trace.rule.toUpperCase()}, but did not consume: ${unresolved
      .map((entry) => entry.token)
      .join(", ")}. Restate the complete consequential command with listed handles only.`,
    candidates: entities,
    semantic: result.semantic,
    trace: guardedTrace,
  };
};

const isNegatedConsequentialInput = (input: string) =>
  /\b(?:do not|dont|never|not|stop)\b(?:\s+[a-z0-9]+){0,4}\s+\b(?:stage|staging|prepare|preparing|select|selecting|choose|choosing|unstage|unstaging|remove|removing|issue|issuing|commit|committing|execute|executing|confirm|confirming|resolve|resolving|end|ending|close|closing|internalize|internalizing|learn|learning|respond|responding|exploit|exploiting|clear|clearing)\b/.test(
    input,
  ) ||
  /\b(?:do not|dont|never|not|stop)\s+(?:resolve|end|close)\b/.test(input) ||
  /\b(?:do not|dont|never|not|stop)\b(?:\s+[a-z0-9]+){0,4}\s+\b(?:advance|press forward|gain territory|take territory|hold territory)\b/.test(
    input,
  );

const reportTopic = (
  input: string,
  targetModule: AvaModule | null,
): AvaReportTopic => {
  if (
    /\b(operations|operational|force ratio|execution confidence)\b/.test(input)
  )
    return "operations";
  if (/\b(loss|losses|losing|casualties|attrition)\b/.test(input))
    return "losses";
  if (/\b(retrospective|recap|after action)\b/.test(input))
    return "retrospective";
  if (/\b(projection|outlook|what happens next)\b/.test(input))
    return "projection";
  if (/\b(domestic|home front|legitimacy|resistance)\b/.test(input))
    return "domestic";
  if (/\b(production|industry|industrial|factory|factories)\b/.test(input))
    return "production";
  if (/\b(network|communications|authentication|signal)\b/.test(input))
    return "network";
  if (/\b(intelligence|intel)\b/.test(input)) return "intelligence";
  if (/\b(adversary|enemy|enemyt)\b/.test(input)) return "adversary";
  if (/\b(personnel|replacement|training)\b/.test(input)) return "personnel";
  if (
    /\b(resources|munitions|ammunition|ammo|armor|drones|flight|stockpile|supply coverage)\b/.test(
      input,
    )
  )
    return "resources";
  if (/\b(readiness|equipment|army|forces|military)\b/.test(input))
    return "military";
  if (/\b(effects|locks|active policies)\b/.test(input)) return "effects";
  if (/\b(opportunities|opportunity)\b/.test(input)) return "opportunities";
  if (/\b(decision ledger|decisions)\b/.test(input)) return "decision-ledger";
  if (/\b(service record|campaign score|player rating|score if|current score|surrender value|termination value)\b/.test(input)) return "service-record";
  if (/\b(daily brief|briefing)\b/.test(input)) return "daily-brief";
  return moduleTopic(targetModule);
};

function compileLegacyCommand(
  raw: string,
  context: AvaCompilerContext,
): AvaCompileResult {
  const input = normalizeAvaInput(raw);
  if (!input)
    return {
      status: "clarify",
      failure: "empty",
      prompt: "No command received. Type HELP or ask what should I do.",
      trace: trace("empty", input),
    };
  if (
    /^(hello|hi|hey|yo)( there)?( ava)?$/.test(input) ||
    /^(ava|test|testing|ping)$/.test(input) ||
    /^(ava )?(are you there|are you online|can you hear me|you there)$/.test(input)
  )
    return compiled(input, "greeting", { kind: "GREETING" });
  if (/^(who are you|what are you|ava who are you)$/.test(input))
    return compiled(input, "identity", { kind: "IDENTITY" });
  if (/^(thanks|thank you|thank you ava|good work)$/.test(input))
    return compiled(input, "gratitude", { kind: "GRATITUDE" });
  if (
    /^(?:fuck|fucking hell|shit|this makes no sense|it makes no sense|i do not understand|i dont understand)[.!]*$/.test(
      input,
    )
  )
    return compiled(input, "frustration", { kind: "FRUSTRATION" });
  if (/^(more|more detail|go deeper)$/.test(input))
    return compiled(input, "more", { kind: "MORE" });
  if (/^(less|less detail|shorter)$/.test(input))
    return compiled(input, "less", { kind: "LESS" });
  if (
    /^(?:enable |turn on |switch to )?(?:verbose )?(?:storyteller|story|narrative) mode(?: on)?$/.test(
      input,
    ) || /^(?:tell|give) me (?:the )?(?:whole|full) story$/.test(input)
  )
    return compiled(input, "storyteller-mode", { kind: "STORYTELLER" });
  if (
    /^(?:disable |turn off |leave )?(?:storyteller|story|narrative) mode$/.test(
      input,
    ) || /^(?:concise|brief|normal|standard) mode$/.test(input)
  )
    return compiled(input, "concise-mode", { kind: "CONCISE" });
  if (
    /^(?:export chat|export ava chat|export ava chat log|export ava log)$/.test(
      input,
    )
  )
    return compiled(input, "export-ava-chat", { kind: "EXPORT_CHAT" });
  if (/^(repeat|say that again)$/.test(input))
    return compiled(input, "repeat", { kind: "REPEAT" });

  const docketReference = resolveOrdinalDocketReference(input, context);
  if (docketReference && docketReference.request !== "advise" && docketReference.request !== "recommend")
    return compiled(
      input,
      "inspect-docket-ordinal",
      { kind: "EXPLAIN", entity: docketReference.entity, facet: "meaning" },
      [docketReference.entity],
    );

  if (
    /^(orders?|orders available|available orders|what are (my|the) orders|what orders (do i have|remain))$/.test(
      input,
    )
  )
    return compiled(input, "orders", { kind: "ORDERS" });
  if (
    /^(missions|list missions|list actions|available actions|what can i issue|what can i do now)$/.test(
      input,
    )
  )
    return compiled(input, "list-actions", { kind: "LIST", scope: "missions" });
  const listScope = input.match(
    /^(?:list|show|available) (production|military|diplomacy|diplomatic|doctrine|directives|opportunities|opportunity|all)(?: actions| directives| stages| responses)?$/,
  )?.[1];
  if (listScope)
    return compiled(input, "list-scope", {
      kind: "LIST",
      scope:
        listScope === "diplomatic"
          ? "diplomacy"
          : listScope === "opportunity"
            ? "opportunities"
            : listScope,
    });
  const conversationalListScope = input.match(
    /^(?:is there )?anything(?: useful)? (?:in|on|under|for) (campaign|main|domestic|network|production|military|diplomacy|doctrine)$/,
  )?.[1];
  if (conversationalListScope)
    return compiled(input, "list-scope-conversational", {
      kind: "LIST",
      scope: conversationalListScope === "main" ? "campaign" : conversationalListScope,
    });
  if (
    /^(status update|update|update me|situation update|give me an update|catch me up|status|command status|how are we doing|where do we stand|command situation|query|info|summary)$/.test(
      input,
    )
  )
    return compiled(input, "status", { kind: "STATUS" });
  if (
    /^(what have we learned|what do we know|what has intelligence learned|show accumulated intelligence)$/.test(
      input,
    )
  )
    return compiled(input, "learned-intelligence", {
      kind: "REPORT",
      topic: "intelligence",
      scope: "current",
    });
  if (
    /^(what changed|what happened|what happened last day|yesterdays outcome|what did i do|what have i done|what have we done|what did we do)$/.test(
      input,
    )
  )
    return compiled(input, "what-changed", {
      kind: "REPORT",
      topic: "retrospective",
      days: 1,
      scope: "current",
    });
  if (
    /^(what is the enemy doing|what are they doing|enemy behavior|adversary behavior)(?: .*)?$/.test(
      input,
    )
  )
    return compiled(input, "enemy-behavior", {
      kind: "REPORT",
      topic: "adversary",
      days: reportWindow(input),
      scope: "current",
    });
  if (
    /^(what happens if we do nothing|project inaction|forecast inaction)$/.test(
      input,
    )
  )
    return compiled(input, "inaction-projection", {
      kind: "REPORT",
      topic: "projection",
      scope: "current",
    });
  if (
    /^(?:daily|daily brief(?:ing)?|todays daily brief(?:ing)?|give me the daily brief(?:ing)?|read (?:me )?(?:the )?daily brief(?:ing)?|(?:exact|verbatim) daily brief(?:ing)?|daily brief(?:ing)? (?:exact text|verbatim))$/.test(
      input,
    )
  )
    return compiled(input, "daily-brief-canonical", {
      kind: "REPORT",
      topic: "daily-brief",
      scope: "current",
      canonical: true,
    });
  if (
    /^(?:brief|brief me|todays brief|alt ux brief|summarize (?:the )?daily brief(?:ing)?|give me (?:a |the )?summary of (?:the )?daily brief(?:ing)?)$/.test(
      input,
    )
  )
    return compiled(input, "daily-brief", {
      kind: "REPORT",
      topic: "daily-brief",
      scope: "current",
    });
  if (/^(?:attack|attacks|offense|offensive)$/.test(input))
    return compiled(input, "operations-shortcut", {
      kind: "REPORT",
      topic: "operations",
      scope: "campaign",
    });
  const playerNeed = compileAvaPlayerNeed(input);
  if (playerNeed)
    return compiled(
      input,
      playerNeed.rule,
      instructionForPlayerNeed(playerNeed.need),
    );
  if (
    /\b(wtf do i do|what (the hell |the fuck )?do i do|what to do|what now|what am i supposed to do|what should i do|where (do i|should i) start|recommend|recommendation|advise|next move)\b/.test(
      input,
    )
  )
    return compiled(input, "advise", { kind: "ADVISE" });
  if (
    /^(help(?: me)?|how (?:do i|to) play|how does (?:this|the game) work|i am lost|im lost|grammar|capabilities|command list|commands|command|what can (you|i) do)/.test(
      input,
    )
  ) {
    const subject =
      input.replace(
        /^(help(?: me)?|how (?:do i|to) play|how does (?:this|the game) work|i am lost|im lost|grammar|capabilities|command list|commands|command|what can (you|i) do)\s*/,
        "",
      ) || undefined;
    return compiled(input, "help", { kind: "HELP", subject });
  }
  if (/^(condition|phase|field condition|current condition)$/.test(input))
    return compiled(input, "condition-report", {
      kind: "REPORT",
      topic: "overview",
      scope: "current",
    });

  if (
    /^confirm(?: [a-z0-9]+)*$/.test(input) ||
    /^(yes|yes issue it|yes do it)$/.test(input)
  )
    return compiled(input, "confirm", {
      kind: "CONFIRM",
      token: input
        .match(/^confirm (.+)$/)?.[1]
        ?.toUpperCase()
        .replace(/\s+/g, "-"),
    });
  if (/^(cancel|never mind|nevermind)$/.test(input))
    return compiled(input, "cancel", { kind: "CANCEL" });
  if (/\b(resolve|end|close)\b.*\bday\b/.test(input) || input === "resolve")
    return compiled(input, "resolve-day", { kind: "RESOLVE_DAY" });
  if (/^(clear plan|discard plan|unselect all)$/.test(input))
    return compiled(input, "clear-plan", { kind: "CLEAR_PLAN" });
  if (/^(plan|show plan|current plan|staged plan)$/.test(input))
    return compiled(input, "show-plan", { kind: "SHOW_PLAN" });
  if (/^(issue|commit|execute) plan$/.test(input))
    return compiled(input, "issue-plan", { kind: "ISSUE_PLAN" });
  if (
    /^(clear|unselect)( selection| that| order| maneuver| manoeuvre)?$/.test(
      input,
    )
  )
    return compiled(input, "clear", { kind: "CLEAR" });
  if (/^(do it|issue it|commit it|execute it)$/.test(input))
    return compiled(
      input,
      "commit",
      { kind: "COMMIT", entity: context.selected ?? undefined },
      context.selected ? [context.selected] : [],
    );

  if (/^(stage|prepare|select)\b/.test(input)) {
    const hits = actionMatches(input, context);
    return hits.length
      ? compiled(input, "stage", { kind: "STAGE", entities: hits }, hits)
      : clarification(
          input,
          "missing-target",
          "stage",
          "I recognized STAGE. Name one or more listed action handles, such as M2 D1 N3.",
        );
  }
  if (/^(unstage|remove)\b/.test(input)) {
    const hits = actionMatches(input, context);
    return hits.length
      ? compiled(input, "unstage", { kind: "UNSTAGE", entities: hits }, hits)
      : clarification(
          input,
          "missing-target",
          "unstage",
          "I recognized UNSTAGE. Name one or more staged handles.",
        );
  }
  if (/^(issue|commit|execute)\b/.test(input)) {
    const hits = actionMatches(input, context);
    if (hits.length)
      return compiled(
        input,
        "issue-actions",
        { kind: "ISSUE", entities: hits },
        hits,
      );
    if (context.selected)
      return compiled(
        input,
        "commit",
        { kind: "COMMIT", entity: context.selected },
        [context.selected],
      );
    return clarification(
      input,
      "missing-target",
      "issue",
      "I recognized ISSUE. Name a listed action or stage a plan first.",
    );
  }
  if (/^(internalize|learn)\b/.test(input)) {
    const hits = actionMatches(input, context).filter(
      (entity) => entity.kind === "doctrine-stage",
    );
    return hits.length === 1
      ? compiled(input, "internalize", { kind: "ISSUE", entities: hits }, hits)
      : clarification(
          input,
          hits.length > 1 ? "ambiguous-target" : "missing-target",
          "internalize",
          "I recognized INTERNALIZE. Name one available doctrine stage.",
          hits,
        );
  }
  if (/^(respond|exploit opportunity|answer opportunity)\b/.test(input)) {
    const hits = actionMatches(input, context).filter(
      (entity) => entity.kind === "opportunity-response",
    );
    return hits.length === 1
      ? compiled(input, "respond", { kind: "ISSUE", entities: hits }, hits)
      : clarification(
          input,
          hits.length > 1 ? "ambiguous-target" : "missing-target",
          "respond",
          "I recognized RESPOND. Name one active opportunity response.",
          hits,
        );
  }

  if (/\bcompare\b|\bversus\b|\bvs\b/.test(input)) {
    const hits = actionMatches(input, context);
    if (hits.length === 2)
      return compiled(
        input,
        "compare",
        { kind: "COMPARE", entities: [hits[0], hits[1]] },
        hits,
      );
    return clarification(
      input,
      hits.length > 2 ? "ambiguous-target" : "missing-target",
      "compare",
      "I recognized COMPARE. Name exactly two action handles.",
      hits,
    );
  }
  if (/\b(forecast|project|predict)\b/.test(input)) {
    if (/\bplan\b/.test(input))
      return compiled(input, "forecast-plan", { kind: "FORECAST", plan: true });
    const hits = actionMatches(input, context),
      hit = hits.length === 1 ? hits[0] : null;
    if (hits.length > 1)
      return clarification(
        input,
        "ambiguous-target",
        "forecast",
        "I recognized FORECAST. Name one action or use FORECAST PLAN.",
        hits,
      );
    return compiled(
      input,
      "forecast",
      { kind: "FORECAST", entity: hit ?? context.selected ?? undefined },
      hit ? [hit] : context.selected ? [context.selected] : [],
    );
  }

  const reportLike =
    /\b(report|reports|brief|briefing|retrospective|recap|after action|losses|casualties|attrition|projection|outlook)\b/.test(
      input,
    ) ||
    /^(production|domestic|network|intelligence|personnel|resources|military|diplomacy|doctrine|adversary|enemy|enemyt|effects|opportunities|decision ledger|service record|daily brief|what happens next)$/.test(
      input,
    ) ||
    /\b(how are (the )?factories|do we have enough (ammunition|ammo|munitions)|where are we losing (people|men|soldiers))\b/.test(
      input,
    );
  if (reportLike) {
    const explicitModule = resolveModule(input),
      targetModule = explicitModule ?? context.currentModule,
      days = reportWindow(input),
      topic = reportTopic(input, targetModule);
    return compiled(input, `report-${topic}`, {
      kind: "REPORT",
      topic,
      days,
      scope: explicitModule ?? "current",
    });
  }
  if (/^(open|go to|navigate to|take me to|show)\b/.test(input)) {
    const targetModule = resolveModule(input);
    return targetModule
      ? compiled(input, "open", { kind: "OPEN", module: targetModule })
      : clarification(
          input,
          "missing-target",
          "open",
          "I recognized OPEN. Specify a command module.",
        );
  }
  if (
    /^(explain|inspect|what|how|where|why)\b/.test(input) ||
    /^(?:estimate|bound|diagnose)\b/.test(input) ||
    /^(?:causal diagnosis|confidence (?:in|of|for)|confidence bound (?:for|of))\b/.test(
      input,
    ) ||
    /\b(mean|affect|affects|underpinnings|calculus|influence)\b/.test(input)
  ) {
    const entityInput = input.replace(
      /^(?:confidence (?:in|of|for)|confidence bound (?:for|of))\s+/,
      "",
    );
    const { hit, hits } = uniqueEntity(entityInput, context);
    if (hits.length > 1)
      return clarification(
        input,
        "ambiguous-target",
        "explain",
        "I recognized EXPLAIN. Clarify the metric, mission, action, or system.",
        hits,
      );
    if (!hit)
      return clarification(
        input,
        "missing-target",
        "explain",
        "I recognized EXPLAIN. Specify a metric, mission, action, or system.",
      );
    const facet: "meaning" | "effects" | "levers" | "calculus" =
      /improve|raise|change|control|lever|influence|where/.test(input)
        ? "levers"
        : /calculus|calculate|underpin|why/.test(input)
          ? "calculus"
          : /affect|effect/.test(input)
            ? "effects"
            : "meaning";
    return compiled(input, "explain", { kind: "EXPLAIN", entity: hit, facet }, [
      hit,
    ]);
  }
  if (/^(choose|maneuver|manoeuvre)\b/.test(input)) {
    const hits = actionMatches(input, context);
    if (hits.length === 1)
      return compiled(
        input,
        "select",
        { kind: "SELECT", entity: hits[0] },
        hits,
      );
    return clarification(
      input,
      hits.length > 1 ? "ambiguous-target" : "missing-target",
      "select",
      "I recognized SELECT. Name one listed action.",
      hits,
    );
  }
  const direct = actionMatches(input, context);
  if (direct.length === 1)
    return compiled(
      input,
      "implicit-select",
      { kind: "SELECT", entity: direct[0] },
      direct,
    );
  return clarification(
    input,
    direct.length > 1 ? "ambiguous-target" : "unrecognized",
    "fallback",
    direct.length > 1
      ? "I found several valid interpretations. Reply with one listed handle."
      : "I could not map that to the current command grammar. Type HELP or MISSIONS.",
    direct,
  );
}

const shouldUseSemanticInstruction = (
  input: string,
  semantic: SemanticCompilation,
) => {
  const query = semantic.query;
  const explicitConstraintQuestion =
    /\b(?:viable|viability|feasible|feasibility|preconditions?|prerequisites?)\b/.test(
      input,
    );
  if (/^(?:missions?|orders?)$/.test(input)) return false;
  const explicitHandleComparison =
    query.operation === "COMPARE" &&
    /\b[mdnxp]\d+\b/i.test(input);
  const mixedActionComparison =
    query.operation === "COMPARE" &&
    new Set(
      query.subject.entityIds.map((id) =>
        id.includes(":") ? id.slice(0, id.indexOf(":")) : "campaign",
      ),
    ).size > 1;
  return (
    query.operation === "ADVISE" ||
    query.operation === "RANK" ||
    query.operation === "RECOMMEND" ||
    query.operation === "JUSTIFY" ||
    (query.operation === "COMPARE" &&
      (!explicitHandleComparison || mixedActionComparison)) ||
    query.operation === "CORRECT" ||
    query.operation === "CHALLENGE" ||
    query.overlays.length > 0 ||
    query.reference !== undefined ||
    (explicitConstraintQuestion &&
      query.subject.type === "CAMPAIGN_CHOICE") ||
    (query.subject.type === "CAMPAIGN_CHOICE" &&
      /mission|operation|maneuver|option|choice/.test(input)) ||
    query.subject.type === "MISSION_OBJECTIVE"
  );
};

const applySemanticTrace = (
  result: AvaCompileResult,
  raw: string,
  semantic: SemanticCompilation,
): AvaCompileResult => {
  const normalized = normalizeSemanticInput(raw);
  const enriched: AvaCompilerTrace = {
    ...result.trace,
    rawInput: raw,
    normalizedInput: normalized.normalized,
    normalizedTokens: normalized.tokens,
    recognizedConcepts: semantic.concepts,
    semanticQuery: semantic.query,
    contextualResolutions: semantic.contextualResolutions,
    grammarProvenance: semantic.grammarProvenance,
    exactIndexHit: semantic.exactIndexHit,
  };
  return result.status === "compiled"
    ? { ...result, semantic: semantic.query, trace: enriched }
    : { ...result, semantic: semantic.query, trace: enriched };
};

export function compileAvaCommand(
  raw: string,
  context: AvaCompilerContext,
): AvaCompileResult {
  const semantic = compileSemanticQuery(raw, context);
  const shell = parseAvaShellInput(
    raw,
    context.shellFileReferences,
    context.shellEditor,
  );
  if (shell) {
    const instruction: AvaInstruction = { kind: "SHELL", shell };
    return {
      status: "compiled",
      instruction,
      semantic: genericSemanticQuery(instruction, context),
      trace: {
        rule: `shell-${shell.command.toLowerCase()}`,
        rawInput: raw,
        interaction: "explicit",
        normalizedInput: raw.trim(),
        normalizedTokens: [shell.command.toLowerCase(), ...shell.args],
        recognizedConcepts: [
          {
            kind: "SHELL_COMMAND",
            canonical: shell.command,
            source: shell.raw,
          },
        ],
        semanticQuery: genericSemanticQuery(instruction, context),
        contextualResolutions: [],
        grammarProvenance: [`SHELL:${shell.command}`],
        exactIndexHit: true,
        tokenCount: 1 + shell.args.length,
        tokenLedger: [
          shell.command.toLowerCase(),
          ...shell.args,
        ].map((token, index) => ({
          token,
          index,
          status: "consumed" as const,
          material: true,
          consumedBy: "shell-grammar",
        })),
        entityKinds: [],
        unresolvedTokenCount: 0,
      },
    };
  }
  if (
    /^(?:stage|unstage|issue|commit|confirm|resolve|end|internalize|learn|respond|exploit|clear\s+plan)\b/i.test(
      raw.trim(),
    ) &&
    (/[\u0000|;><`]/.test(raw) || /&&|\$\(/.test(raw))
  )
    return applySemanticTrace(
      {
        status: "clarify",
        failure: "unsupported-command-operator",
        prompt:
          "Command operators, redirects, substitutions, and chained commands are disabled. Enter one Ava or shell command at a time.",
        trace: trace("unsafe-syntax", normalizeAvaInput(raw)),
      },
      raw,
      semantic,
    );
  const normalized = normalizeSemanticInput(raw).normalized;
  if (isNegatedConsequentialInput(normalized))
    return applySemanticTrace(
      {
        status: "clarify",
        failure: "unsupported-combination",
        prompt:
          "I recognized a negated consequential command. Negation can never authorize or invert a campaign mutation; state the non-mutating question or cancellation you intend.",
        semantic: {
          ...semantic.query,
          polarity: "NEGATED",
        },
        trace: trace("negated-consequential", raw, [], semantic),
      },
      raw,
      {
        ...semantic,
        query: {
          ...semantic.query,
          polarity: "NEGATED",
        },
      },
    );
  const contextual = matchAvaContextualLanguage(raw, context);
  if (contextual?.status === "ambiguous")
    return applySemanticTrace(
      {
        status: "clarify",
        failure: "ambiguous-target",
        prompt: contextualFailurePrompt(contextual.candidates),
        semantic: semantic.query,
        trace: trace("contextual-ambiguity", raw, [], semantic),
      },
      raw,
      semantic,
    );
  if (contextual?.status === "compiled") {
    const value = contextual.value;
    const entity = value.entity ? [value.entity] : [];
    const contextualSemantic: SemanticCompilation = {
      query: value.semantic,
      concepts: [
        {
          kind: "CONTEXTUAL_LANGUAGE",
          canonical: value.match.entry.id,
          source: value.match.alias,
        },
      ],
      contextualResolutions: [
        `Contextual route ${value.match.entry.route} resolved through ${value.match.entry.id}.`,
      ],
      grammarProvenance: [
        "CONTEXTUAL_LANGUAGE",
        `SOURCE:${value.match.entry.source}`,
        `ROUTE:${value.match.entry.route}`,
      ],
      exactIndexHit: true,
    };
    return {
      status: "compiled",
      instruction: value.instruction,
      semantic: value.semantic,
      trace: trace(
        `contextual-${value.match.entry.route.toLowerCase()}`,
        raw,
        entity,
        contextualSemantic,
      ),
    };
  }
  if (semantic.clarification)
    return applySemanticTrace(
      {
        status: "clarify",
        failure: semantic.clarification.failure,
        prompt: semantic.clarification.prompt,
        candidates: semantic.clarification.candidates,
        semantic: semantic.query,
        trace: trace(
          "semantic-clarification",
          raw,
          semantic.clarification.candidates,
          semantic,
        ),
      },
      raw,
      semantic,
    );
  const useSemanticInstruction = shouldUseSemanticInstruction(
    normalized,
    semantic,
  );
  if (
    useSemanticInstruction &&
    semantic.query.operation === "CHALLENGE" &&
    semantic.query.subject.type === "METRIC" &&
    (semantic.query.metricOperands?.length ?? 0) < 2
  )
    return applySemanticTrace(
      {
        status: "clarify",
        failure: "missing-target",
        prompt:
          "A metric challenge requires two explicit metric operands. Name both systems to compare.",
        semantic: semantic.query,
        trace: trace("metric-challenge-operands", raw, [], semantic),
      },
      raw,
      semantic,
    );
  if (
    useSemanticInstruction &&
    semantic.query.operation === "LIST" &&
    semantic.query.subject.type !== "CAMPAIGN_CHOICE"
  )
    return applySemanticTrace(
      {
        status: "clarify",
        failure: "unsupported-combination",
        prompt:
          "LIST is defined only for a declared docket or campaign-choice scope. Name the list surface you want.",
        semantic: semantic.query,
        trace: trace("closed-list-subject", raw, [], semantic),
      },
      raw,
      semantic,
    );
  if (
    useSemanticInstruction &&
    semantic.query.operation === "COMPARE" &&
    semantic.query.subject.type === "CAMPAIGN_CHOICE"
  ) {
    const targetEntities = context.entities.filter((entity) =>
      semantic.query.subject.entityIds.includes(entity.id),
    );
    const ledger = consequentialTokenLedger(
      raw,
      "compare",
      targetEntities,
    );
    const unresolved = ledger.filter(
      (entry) => entry.material && entry.status === "unresolved",
    );
    const exactTargets =
      semantic.query.subject.entityIds.length === 2 ||
      (semantic.query.subject.entityIds.length > 2 &&
        /\bcampaign\b/.test(normalized) &&
        /\bproduction\b/.test(normalized)) ||
      (semantic.query.subject.entityIds.length === 0 &&
        semantic.query.scope.domains.length === 2);
    if (!exactTargets || unresolved.length)
      return applySemanticTrace(
        {
          status: "clarify",
          failure:
            semantic.query.subject.entityIds.length > 2
              ? "ambiguous-target"
              : "missing-target",
          prompt:
            "COMPARE requires exactly two complete action targets or two explicit campaign domains.",
          candidates: targetEntities,
          semantic: semantic.query,
          trace: {
            ...trace("compare-exact-targets", raw, targetEntities, semantic),
            tokenLedger: ledger,
            unresolvedTokenCount: unresolved.length,
          },
        },
        raw,
        semantic,
      );
  }
  if (useSemanticInstruction) {
    const instruction: AvaInstruction = {
      kind: "SEMANTIC",
      query: semantic.query,
    };
    return {
      status: "compiled",
      instruction,
      semantic: semantic.query,
      trace: trace(
        semantic.exactIndexHit ? "semantic-index" : "semantic-composition",
        raw,
        context.entities.filter((entity) =>
          semantic.query.subject.entityIds.includes(entity.id),
        ),
        semantic,
      ),
    };
  }
  const legacy = applySemanticTrace(
    conserveConsequentialTokens(
      raw,
      compileLegacyCommand(raw, context),
    ),
    raw,
    semantic,
  );
  if (legacy.status !== "compiled") return legacy;
  const canonicalSemantic = genericSemanticQuery(
    legacy.instruction,
    context,
  );
  return {
    ...legacy,
    semantic: canonicalSemantic,
    trace: {
      ...legacy.trace,
      semanticQuery: canonicalSemantic,
    },
  };
}
