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
  type SemanticCompilation,
} from "./grammar";
export {
  AVA_CAMPAIGN_LANGUAGE_CORPUS,
  AVA_UTTERANCE_COLLISIONS,
  AVA_UTTERANCE_COVERAGE,
  AVA_UTTERANCE_INDEX,
  normalizeSemanticInput,
  stableUtteranceHash,
} from "./grammar";

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
]);
const commandWords = new Set(
  "hello hi hey there online update orders order available actions missions list help grammar capabilities command commands status condition situation report reports produce brief briefing explain inspect what does mean affect affects underpin underpinnings improve raise change control calculus calculate open show take go navigate select choose prepare stage unstage remove plan maneuver manoeuvre forecast project projection predict compare versus vs with and clear cancel unselect commit issue execute do it that yes confirm never mind internalize learn respond exploit answer resolve end close day days to for from of over last past how is are give loss losses casualties attrition retrospective recap after action production domestic network intelligence intel adversary enemy effects resources personnel opportunities opportunity doctrine diplomatic military directives service record outlook next happens recommend recommendation advise start move more less repeat who you thanks thank fuck fucking shit sense".split(
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
  return {
    rule,
    rawInput: input,
    normalizedInput: normalizeSemanticInput(input).normalized,
    normalizedTokens: normalizeSemanticInput(input).tokens,
    recognizedConcepts: semantic?.concepts ?? [],
    semanticQuery: semantic?.query,
    contextualResolutions: semantic?.contextualResolutions ?? [],
    grammarProvenance: semantic?.grammarProvenance,
    exactIndexHit: semantic?.exactIndexHit ?? false,
    tokenCount: tokens.length,
    entityKinds: [...new Set(entities.map((entity) => entity.kind))],
    unresolvedTokenCount: tokens.filter((token) => !known.has(token)).length,
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
  home: "dashboard",
  dashboard: "dashboard",
  overview: "dashboard",
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
  if (/\b(adversary|enemy)\b/.test(input)) return "adversary";
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
    /^(hello|hi|hey)( there)?( ava)?$/.test(input) ||
    /^(ava )?(are you there|are you online)$/.test(input)
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
  if (/^(repeat|say that again)$/.test(input))
    return compiled(input, "repeat", { kind: "REPEAT" });

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
  if (
    /^(status update|update|update me|situation update|give me an update|status|command status|how are we doing|where do we stand|command situation)$/.test(
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
    /^(what changed|what happened|what happened last day|yesterdays outcome)$/.test(
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
    /^(brief me|daily brief|todays brief|give me the daily brief|alt ux brief)$/.test(
      input,
    )
  )
    return compiled(input, "daily-brief", {
      kind: "REPORT",
      topic: "daily-brief",
      scope: "current",
    });
  if (
    /\b(wtf do i do|what (the hell |the fuck )?do i do|what should i do|where (do i|should i) start|recommend|recommendation|advise|next move)\b/.test(
      input,
    )
  )
    return compiled(input, "advise", { kind: "ADVISE" });
  if (
    /^(help|grammar|capabilities|command list|commands|command|what can (you|i) do)/.test(
      input,
    )
  ) {
    const subject =
      input.replace(
        /^(help|grammar|capabilities|command list|commands|command|what can (you|i) do)\s*/,
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
    /^(production|domestic|network|intelligence|personnel|resources|military|diplomacy|doctrine|adversary|enemy|effects|opportunities|decision ledger|service record|daily brief|what happens next)$/.test(
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
    /\b(mean|affect|affects|underpinnings|calculus|influence)\b/.test(input)
  ) {
    const { hit, hits } = uniqueEntity(input, context);
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
  if (/^(?:missions?|orders?)$/.test(input)) return false;
  const explicitHandleComparison =
    query.operation === "COMPARE" &&
    /\b[mdnxp]\d+\b/i.test(input);
  return (
    query.operation === "ADVISE" ||
    query.operation === "RANK" ||
    query.operation === "RECOMMEND" ||
    query.operation === "JUSTIFY" ||
    (query.operation === "COMPARE" && !explicitHandleComparison) ||
    query.operation === "CORRECT" ||
    query.operation === "CHALLENGE" ||
    query.overlays.length > 0 ||
    query.reference !== undefined ||
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
  const shell = parseAvaShellInput(raw, context.shellFileReferences);
  if (shell) {
    const instruction: AvaInstruction = { kind: "SHELL", shell };
    return {
      status: "compiled",
      instruction,
      semantic: genericSemanticQuery(instruction, context),
      trace: {
        rule: `shell-${shell.command.toLowerCase()}`,
        rawInput: raw,
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
  if (shouldUseSemanticInstruction(normalized, semantic)) {
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
  return applySemanticTrace(compileLegacyCommand(raw, context), raw, semantic);
}
