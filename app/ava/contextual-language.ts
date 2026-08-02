import type { AvaReportTopic } from "./schema";
import type { StrategicDimension } from "../substrate/gates";
import { cognitiveDigest } from "./cognitive-types";

export const AVA_CONTEXTUAL_LANGUAGE_VERSION =
  "ava-contextual-language/v1" as const;

export type AvaLanguageRoute =
  | "PRIORITY_FOCUS"
  | "STRATEGIC_ADVICE"
  | "METRIC_EXPLANATION"
  | "REPORT"
  | "OBJECTIVE_EXPLANATION"
  | "NARRATIVE_REFERENCE";

export type AvaLanguageSource =
  | "STATIC_CATALOG"
  | "CURRENT_SITUATION"
  | "CURRENT_METRIC"
  | "CURRENT_ACTION"
  | "AUTHORED_BRIEF";

export type AvaLanguageFacet = "meaning" | "effects" | "levers" | "calculus";

export type AvaNarrativeSection =
  | "headline"
  | "briefing"
  | "question"
  | "standing-order"
  | "maneuver-label"
  | "maneuver-rationale";

export type AvaLanguageEvidence = {
  section: AvaNarrativeSection;
  phrase: string;
  excerpt: string;
};

export type AvaLanguageEntry = {
  id: string;
  route: AvaLanguageRoute;
  label: string;
  aliases: string[];
  source: AvaLanguageSource;
  facet?: AvaLanguageFacet;
  topic?: AvaReportTopic;
  entityId?: string;
  priorityAxes?: StrategicDimension[];
  evidence?: AvaLanguageEvidence[];
};

export type AvaContextualLanguage = {
  version: typeof AVA_CONTEXTUAL_LANGUAGE_VERSION;
  stateRevision: string;
  contentRevision: string;
  entries: AvaLanguageEntry[];
  digest: string;
};

export type AvaContextualBinding = {
  route: AvaLanguageRoute;
  entryId: string;
  label: string;
  source: AvaLanguageSource;
  facet?: AvaLanguageFacet;
  topic?: AvaReportTopic;
  entityId?: string;
  priorityAxes?: StrategicDimension[];
  evidence?: AvaLanguageEvidence[];
};

const ROUTES = new Set<AvaLanguageRoute>([
  "PRIORITY_FOCUS",
  "STRATEGIC_ADVICE",
  "METRIC_EXPLANATION",
  "REPORT",
  "OBJECTIVE_EXPLANATION",
  "NARRATIVE_REFERENCE",
]);
const SOURCES = new Set<AvaLanguageSource>([
  "STATIC_CATALOG",
  "CURRENT_SITUATION",
  "CURRENT_METRIC",
  "CURRENT_ACTION",
  "AUTHORED_BRIEF",
]);
const FACETS = new Set<AvaLanguageFacet>([
  "meaning",
  "effects",
  "levers",
  "calculus",
]);
const SECTIONS = new Set<AvaNarrativeSection>([
  "headline",
  "briefing",
  "question",
  "standing-order",
  "maneuver-label",
  "maneuver-rationale",
]);
const DIMENSIONS = new Set<StrategicDimension>([
  "production_integrity",
  "supply_integrity",
  "veteran_preservation",
  "force_preservation",
  "territorial_control",
  "civil_stability",
  "treasury_preservation",
  "diplomatic_autonomy",
  "intelligence_advantage",
  "infrastructure_preservation",
  "initiative",
  "long_term_capacity",
]);

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const normalizeAvaLanguageInput = (raw: string) =>
  raw
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

export const languageTokens = (raw: string) =>
  normalizeAvaLanguageInput(raw).split(" ").filter(Boolean);

const canonicalEntry = (entry: AvaLanguageEntry): AvaLanguageEntry => ({
  ...entry,
  aliases: [...new Set(entry.aliases.map(normalizeAvaLanguageInput))].sort(),
  priorityAxes: entry.priorityAxes?.length
    ? [...new Set(entry.priorityAxes)].sort()
    : undefined,
  evidence: entry.evidence?.map((item) => ({ ...item })).sort((left, right) =>
    `${left.section}:${left.phrase}`.localeCompare(
      `${right.section}:${right.phrase}`,
    ),
  ),
});

const canonicalEntries = (entries: AvaLanguageEntry[]) =>
  [...entries].map(canonicalEntry).sort((left, right) =>
    left.id.localeCompare(right.id),
  );

export const contextualLanguageDigest = (input: {
  version: typeof AVA_CONTEXTUAL_LANGUAGE_VERSION;
  stateRevision: string;
  contentRevision: string;
  entries: AvaLanguageEntry[];
}) => {
  const { version, stateRevision, contentRevision, entries } = input;
  return cognitiveDigest({
    version,
    stateRevision,
    contentRevision,
    entries: canonicalEntries(entries),
  });
};

export const validateAvaLanguageEntries = (
  entries: unknown,
): string[] => {
  const issues: string[] = [];
  if (!Array.isArray(entries)) return ["entries must be an array"];
  const ids = new Set<string>();
  const aliases = new Map<string, string>();
  entries.forEach((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      issues.push(`entry ${index} must be an object`);
      return;
    }
    const entry = value as Record<string, unknown>;
    const required = ["id", "route", "label", "aliases", "source"];
    const allowed = [
      ...required,
      "facet",
      "topic",
      "entityId",
      "priorityAxes",
      "evidence",
    ];
    if (Object.keys(entry).some((key) => !allowed.includes(key)))
      issues.push(`entry ${index} contains unknown fields`);
    if (!nonEmpty(entry.id) || ids.has(entry.id))
      issues.push(`entry ${index} id must be unique and non-empty`);
    else ids.add(entry.id);
    if (!nonEmpty(entry.label)) issues.push(`entry ${index} label is required`);
    if (!ROUTES.has(entry.route as AvaLanguageRoute))
      issues.push(`entry ${index} route is unknown`);
    if (!SOURCES.has(entry.source as AvaLanguageSource))
      issues.push(`entry ${index} source is unknown`);
    if (
      entry.facet !== undefined &&
      !FACETS.has(entry.facet as AvaLanguageFacet)
    )
      issues.push(`entry ${index} facet is unknown`);
    if (
      entry.topic !== undefined &&
      (typeof entry.topic !== "string" || !entry.topic.trim())
    )
      issues.push(`entry ${index} topic must be non-empty when present`);
    if (
      !Array.isArray(entry.aliases) ||
      !entry.aliases.length ||
      entry.aliases.some((alias) => !nonEmpty(alias))
    ) {
      issues.push(`entry ${index} aliases must be non-empty strings`);
    } else {
      const normalizedAliases = entry.aliases.map((alias) =>
        normalizeAvaLanguageInput(alias),
      );
      if (new Set(normalizedAliases).size !== normalizedAliases.length)
        issues.push(`entry ${index} aliases must be unique after normalization`);
      normalizedAliases.forEach((alias) => {
        const owner = aliases.get(alias);
        if (owner && owner !== entry.id)
          issues.push(`alias '${alias}' collides between ${owner} and ${entry.id}`);
        else aliases.set(alias, entry.id as string);
      });
    }
    if (entry.priorityAxes !== undefined) {
      if (
        !Array.isArray(entry.priorityAxes) ||
        entry.priorityAxes.some(
          (axis) => !DIMENSIONS.has(axis as StrategicDimension),
        )
      )
        issues.push(`entry ${index} priorityAxes are unknown`);
    }
    if (entry.evidence !== undefined) {
      if (!Array.isArray(entry.evidence)) {
        issues.push(`entry ${index} evidence must be an array`);
      } else {
        entry.evidence.forEach((item, evidenceIndex) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            issues.push(`entry ${index} evidence ${evidenceIndex} is malformed`);
            return;
          }
          const evidence = item as Record<string, unknown>;
          if (
            Object.keys(evidence).some(
              (key) => !["section", "phrase", "excerpt"].includes(key),
            ) ||
            !SECTIONS.has(evidence.section as AvaNarrativeSection) ||
            !nonEmpty(evidence.phrase) ||
            !nonEmpty(evidence.excerpt) ||
            String(evidence.excerpt).length > 280
          )
            issues.push(`entry ${index} evidence ${evidenceIndex} is malformed`);
        });
      }
    }
  });
  return issues;
};

export const sealAvaContextualLanguage = (input: {
  stateRevision: string;
  contentRevision: string;
  entries: AvaLanguageEntry[];
}): AvaContextualLanguage => {
  const entries = canonicalEntries(input.entries);
  const issues = validateAvaLanguageEntries(entries);
  if (issues.length) throw new Error(`Invalid Ava contextual language: ${issues.join("; ")}`);
  const body = {
    version: AVA_CONTEXTUAL_LANGUAGE_VERSION,
    stateRevision: input.stateRevision,
    contentRevision: input.contentRevision,
    entries,
  } as const;
  return { ...body, digest: contextualLanguageDigest(body) };
};

export const isAvaContextualLanguage = (
  value: unknown,
): value is AvaContextualLanguage => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.version !== AVA_CONTEXTUAL_LANGUAGE_VERSION ||
    !nonEmpty(candidate.stateRevision) ||
    !nonEmpty(candidate.contentRevision) ||
    !nonEmpty(candidate.digest)
  )
    return false;
  const issues = validateAvaLanguageEntries(candidate.entries);
  if (issues.length) return false;
  return contextualLanguageDigest({
    version: candidate.version,
    stateRevision: candidate.stateRevision,
    contentRevision: candidate.contentRevision,
    entries: candidate.entries as AvaLanguageEntry[],
  }) === candidate.digest;
};
