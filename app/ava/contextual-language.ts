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
  provenance?: string[];
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

/**
 * Normalize only declared contextual-language surfaces. The general Ava
 * command normalizer remains owned by compiler.ts; this boundary preserves
 * apostrophes while making punctuation and Unicode presentation variants
 * converge deterministically.
 */
export const normalizeAvaLanguageSurface = (raw: string) =>
  raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

// Kept as a named compatibility export for the existing contextual modules.
export const normalizeAvaLanguageInput = normalizeAvaLanguageSurface;

export const languageTokens = (raw: string) =>
  normalizeAvaLanguageInput(raw).split(" ").filter(Boolean);

const canonicalEntry = (entry: AvaLanguageEntry): AvaLanguageEntry => ({
  ...entry,
  aliases: [...new Set(entry.aliases.map(normalizeAvaLanguageSurface))].sort(),
  priorityAxes: entry.priorityAxes?.length
    ? [...new Set(entry.priorityAxes)].sort()
    : undefined,
  provenance: entry.provenance?.length
    ? [...new Set(entry.provenance)].sort()
    : [`${entry.source}:${entry.id}`],
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
      "provenance",
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
      entry.provenance !== undefined &&
      (!Array.isArray(entry.provenance) ||
        !entry.provenance.length ||
        entry.provenance.some((item) => !nonEmpty(item)))
    )
      issues.push(`entry ${index} provenance must be non-empty strings`);
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

/**
 * Runtime contract validator for the closed contextual catalog. Callers that
 * cross a serialization boundary receive an exception instead of a partially
 * trusted language object.
 */
export const validateLanguageEntries = (entries: unknown): void => {
  const issues = validateAvaLanguageEntries(entries);
  if (Array.isArray(entries)) {
    entries.forEach((value, index) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return;
      const entry = value as Record<string, unknown>;
      const route = entry.route as AvaLanguageRoute;
      const requireField = (field: string) => {
        if (!nonEmpty(entry[field]))
          issues.push(`entry ${index} ${field} is required for ${route}`);
      };
      if (route === "PRIORITY_FOCUS") {
        if (
          !Array.isArray(entry.priorityAxes) ||
          entry.priorityAxes.length === 0 ||
          entry.priorityAxes.length > 4
        )
          issues.push(`entry ${index} priorityAxes must contain 1-4 axes`);
      }
      if (route === "REPORT") requireField("topic");
      if (route === "METRIC_EXPLANATION" || route === "OBJECTIVE_EXPLANATION")
        requireField("entityId");
      if (
        route === "NARRATIVE_REFERENCE" &&
        (!Array.isArray(entry.evidence) || entry.evidence.length === 0)
      )
        issues.push(`entry ${index} evidence is required for narrative references`);
      if (
        entry.provenance !== undefined &&
        Array.isArray(entry.provenance) &&
        entry.provenance.length > 0
      )
        return;
      issues.push(`entry ${index} provenance is required`);
    });
  }
  if (issues.length) throw new Error(`Invalid Ava language entries: ${issues.join("; ")}`);
};

export const sealAvaContextualLanguage = (input: {
  stateRevision: string;
  contentRevision: string;
  entries: AvaLanguageEntry[];
}): AvaContextualLanguage => {
  const entries = canonicalEntries(input.entries);
  validateLanguageEntries(entries);
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
  try {
    validateLanguageEntries(candidate.entries);
  } catch {
    return false;
  }
  return contextualLanguageDigest({
    version: candidate.version,
    stateRevision: candidate.stateRevision,
    contentRevision: candidate.contentRevision,
    entries: candidate.entries as AvaLanguageEntry[],
  }) === candidate.digest;
};

export const validateContextualLanguage = (value: unknown): void => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Contextual language must be an object");
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== AVA_CONTEXTUAL_LANGUAGE_VERSION)
    throw new Error("Contextual language version is unsupported");
  if (!nonEmpty(candidate.stateRevision))
    throw new Error("Contextual language stateRevision is required");
  if (!nonEmpty(candidate.contentRevision))
    throw new Error("Contextual language contentRevision is required");
  if (!nonEmpty(candidate.digest))
    throw new Error("Contextual language digest is required");
  validateLanguageEntries(candidate.entries);
  const expected = contextualLanguageDigest({
    version: candidate.version,
    stateRevision: candidate.stateRevision,
    contentRevision: candidate.contentRevision,
    entries: candidate.entries as AvaLanguageEntry[],
  });
  if (expected !== candidate.digest)
    throw new Error("Contextual language digest does not match its contents");
};
