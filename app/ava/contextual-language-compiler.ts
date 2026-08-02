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
import { authoredReferenceDeclarationFor } from "./contextual-language-references";

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
  | {
      status: "unavailable";
      normalizedInput: string;
      entry?: AvaLanguageEntry;
      entityId?: string;
      declarationId?: string;
      availability: "UNAVAILABLE";
    }
  | null;

const evidenceKindOrder = new Map([
  ["maneuver-label", 0],
  ["maneuver-presentation", 1],
  ["maneuver-rationale", 2],
]);

const mergeSameManeuverIdentity = (
  entries: readonly AvaLanguageEntry[],
): AvaLanguageEntry => {
  const ordered = [...entries].sort(
    (left, right) =>
      (evidenceKindOrder.get(left.evidenceKind ?? "") ?? 9) -
        (evidenceKindOrder.get(right.evidenceKind ?? "") ?? 9) ||
      left.id.localeCompare(right.id),
  );
  const first = ordered[0];
  return {
    ...first,
    aliases: [...new Set(ordered.flatMap((entry) => entry.aliases))],
    evidence: ordered.flatMap((entry) => entry.evidence ?? []),
    provenance: [
      ...new Set(ordered.flatMap((entry) => entry.provenance ?? [])),
    ],
  };
};

export const matchAvaContextualLanguage = (
  raw: string,
  context: AvaCompilerContext,
): AvaContextualCompilationResult => {
  if (!context.language || !isAvaContextualLanguage(context.language)) return null;
  const normalizedInput = normalizeAvaLanguageInput(raw);
  if (!normalizedInput) return null;
  const candidates = context.language.entries.flatMap((entry) =>
    entry.aliases.flatMap((alias) => {
      const normalizedAlias = normalizeAvaLanguageInput(alias);
      if (!normalizedAlias || normalizedAlias !== normalizedInput)
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
  if (!candidates.length) {
    const declaration = authoredReferenceDeclarationFor(raw);
    return declaration
      ? {
          status: "unavailable",
          normalizedInput,
          declarationId: declaration.id,
          availability: "UNAVAILABLE",
        }
      : null;
  }
  const longest = Math.max(...candidates.map((candidate) => candidate.tokenCount));
  const top = candidates
    .filter((candidate) => candidate.tokenCount === longest)
    .sort((left, right) => left.entry.id.localeCompare(right.entry.id));
  const distinctEntries = [
    ...new Map(top.map((candidate) => [candidate.entry.id, candidate.entry])).values(),
  ];
  const maneuverIdentities = new Set(
    distinctEntries.map((entry) => entry.maneuverId ?? entry.id),
  );
  if (maneuverIdentities.size > 1)
    return { status: "ambiguous", normalizedInput, candidates: distinctEntries };
  const selectedEntry =
    maneuverIdentities.size === 1 && distinctEntries.length > 1
      ? mergeSameManeuverIdentity(distinctEntries)
      : distinctEntries[0];
  const selected =
    top.find((candidate) => candidate.entry.id === selectedEntry.id) ?? top[0];
  const entity = selectedEntry.entityId
    ? context.entities.find((candidate) => candidate.id === selectedEntry.entityId)
    : undefined;
  if (
    (selectedEntry.route === "METRIC_EXPLANATION" ||
      selectedEntry.route === "OBJECTIVE_EXPLANATION" ||
      selectedEntry.route === "NARRATIVE_REFERENCE") &&
    !entity
  )
    return {
      status: "unavailable",
      normalizedInput,
      entry: selectedEntry,
      entityId: selectedEntry.entityId,
      availability: "UNAVAILABLE",
    };
  const priority = compileDeclaredPriorityFocus(selectedEntry.priorityAxes ?? []);
  const contextual: AvaContextualBinding = {
    route: selectedEntry.route,
    entryId: selectedEntry.id,
    label: selectedEntry.label,
    source: selectedEntry.source,
    facet: selectedEntry.facet,
    topic: selectedEntry.topic,
    entityId: selectedEntry.entityId,
    priorityAxes: priority.axes.length ? priority.axes : undefined,
    evidence: selectedEntry.evidence,
    maneuverId: selectedEntry.maneuverId,
    maneuverLabel: selectedEntry.maneuverLabel,
    evidenceKind: selectedEntry.evidenceKind,
    provenance: selectedEntry.provenance,
  };
  const instruction: AvaInstruction =
    selectedEntry.route === "PRIORITY_FOCUS" ||
    selectedEntry.route === "STRATEGIC_ADVICE"
      ? { kind: "ADVISE", contextual }
      : selectedEntry.route === "REPORT"
        ? {
            kind: "REPORT",
            topic: selectedEntry.topic ?? "overview",
            scope: "current",
            contextual,
          }
        : {
            kind: "EXPLAIN",
            entity: entity!,
            facet: selectedEntry.facet ?? "meaning",
            contextual,
          };
  return {
    status: "compiled",
    value: {
      instruction,
      semantic: genericSemanticQuery(instruction, context),
      match: {
        entry: selectedEntry,
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
