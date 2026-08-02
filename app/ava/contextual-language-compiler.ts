import {
  genericSemanticQuery,
} from "./grammar";
import {
  compileDeclaredPriorityFocus,
} from "./contextual-language-priorities";
import {
  isAvaContextualLanguage,
  languageTokens,
  normalizeAvaLanguageInput,
  type AvaContextualBinding,
  type AvaLanguageEntry,
} from "./contextual-language";
import type {
  AvaCompilerContext,
  AvaEntity,
  AvaInstruction,
} from "./schema";

const CONSEQUENTIAL_HEAD = /^(?:stage|unstage|issue|commit|confirm|resolve|end|close|internalize|learn|respond|exploit|clear|select|prepare|choose)\b/;

const containsPhrase = (input: string, phrase: string) => {
  const paddedInput = ` ${input} `;
  return paddedInput.includes(` ${phrase} `);
};

export type AvaContextualMatch = {
  entry: AvaLanguageEntry;
  alias: string;
  normalizedInput: string;
};

export type AvaContextualCompilation = {
  instruction: AvaInstruction;
  semantic: ReturnType<typeof genericSemanticQuery>;
  match: AvaContextualMatch;
  entity?: AvaEntity;
};

export type AvaContextualCompilationResult =
  | { status: "compiled"; value: AvaContextualCompilation }
  | { status: "ambiguous"; normalizedInput: string; candidates: AvaLanguageEntry[] }
  | null;

export const matchAvaContextualLanguage = (
  raw: string,
  context: AvaCompilerContext,
): AvaContextualCompilationResult => {
  if (!context.language || !isAvaContextualLanguage(context.language)) return null;
  const normalizedInput = normalizeAvaLanguageInput(raw);
  if (!normalizedInput || CONSEQUENTIAL_HEAD.test(normalizedInput)) return null;
  const candidates = context.language.entries.flatMap((entry) =>
    entry.aliases.flatMap((alias) => {
      const normalizedAlias = normalizeAvaLanguageInput(alias);
      if (!normalizedAlias || !containsPhrase(normalizedInput, normalizedAlias))
        return [];
      return [
        {
          entry,
          alias: normalizedAlias,
          tokenCount: languageTokens(normalizedAlias).length,
        },
      ];
    }),
  );
  if (!candidates.length) return null;
  const longest = Math.max(...candidates.map((candidate) => candidate.tokenCount));
  const top = candidates
    .filter((candidate) => candidate.tokenCount === longest)
    .sort((left, right) => left.entry.id.localeCompare(right.entry.id));
  const distinctEntries = [
    ...new Map(top.map((candidate) => [candidate.entry.id, candidate.entry])).values(),
  ];
  if (distinctEntries.length > 1)
    return { status: "ambiguous", normalizedInput, candidates: distinctEntries };
  const selected = top[0];
  const entity = selected.entry.entityId
    ? context.entities.find((candidate) => candidate.id === selected.entry.entityId)
    : undefined;
  if (
    (selected.entry.route === "METRIC_EXPLANATION" ||
      selected.entry.route === "OBJECTIVE_EXPLANATION" ||
      selected.entry.route === "NARRATIVE_REFERENCE") &&
    !entity
  )
    return null;
  const priority = compileDeclaredPriorityFocus(selected.entry.priorityAxes ?? []);
  const contextual: AvaContextualBinding = {
    route: selected.entry.route,
    entryId: selected.entry.id,
    label: selected.entry.label,
    source: selected.entry.source,
    facet: selected.entry.facet,
    topic: selected.entry.topic,
    entityId: selected.entry.entityId,
    priorityAxes: priority.axes.length ? priority.axes : undefined,
    evidence: selected.entry.evidence,
  };
  const instruction: AvaInstruction =
    selected.entry.route === "PRIORITY_FOCUS" ||
    selected.entry.route === "STRATEGIC_ADVICE"
      ? { kind: "ADVISE", contextual }
      : selected.entry.route === "REPORT"
        ? {
            kind: "REPORT",
            topic: selected.entry.topic ?? "overview",
            scope: "current",
            contextual,
          }
        : {
            kind: "EXPLAIN",
            entity: entity!,
            facet: selected.entry.facet ?? "meaning",
            contextual,
          };
  return {
    status: "compiled",
    value: {
      instruction,
      semantic: genericSemanticQuery(instruction, context),
      match: {
        entry: selected.entry,
        alias: selected.alias,
        normalizedInput,
      },
      entity,
    },
  };
};

export const contextualFailurePrompt = (candidates: AvaLanguageEntry[]) =>
  `That contextual phrase has more than one declared reading. Choose one: ${candidates
    .map((candidate) => candidate.label)
    .join(", ")}.`;
