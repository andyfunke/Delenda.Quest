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
  | "maneuver-rationale"
  | "maneuver-presentation";

export const AVA_MANEUVER_EVIDENCE_KINDS = [
  "maneuver-label",
  "maneuver-rationale",
  "maneuver-presentation",
] as const;

export type AvaManeuverEvidenceKind =
  (typeof AVA_MANEUVER_EVIDENCE_KINDS)[number];

export type AvaLanguageEvidence = {
  section: AvaNarrativeSection;
  phrase: string;
  excerpt: string;
  /** Exact source path in the disclosed owner, when available. */
  sourcePath?: string;
  /** Stable source order; it is intentionally not canonicalized by sorting. */
  sourceOrder?: number;
};

export type AvaAuthoredManeuverEvidence = {
  maneuverId: string;
  label: string;
  labelEvidence?: AvaLanguageEvidence;
  rationaleEvidence?: AvaLanguageEvidence;
  presentationEvidence?: AvaLanguageEvidence;
  provenance: readonly string[];
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
  maneuverId?: string;
  maneuverLabel?: string;
  evidenceKind?: AvaManeuverEvidenceKind;
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
  maneuverId?: string;
  maneuverLabel?: string;
  evidenceKind?: AvaManeuverEvidenceKind;
  provenance?: string[];
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
  "maneuver-presentation",
]);
const MANEUVER_EVIDENCE_KINDS = new Set<AvaManeuverEvidenceKind>(
  AVA_MANEUVER_EVIDENCE_KINDS,
);
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

const stableUnique = <T>(values: readonly T[]) => [...new Set(values)];

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
  provenance: stableUnique(
    entry.provenance?.length
      ? entry.provenance
      : [`${entry.source}:${entry.id}`],
  ),
  // Evidence order is semantic source order. Sorting it would erase a
  // deterministic authored-order change from the content seal.
  evidence: entry.evidence?.map((item) => ({ ...item })),
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
  const aliases = new Map<
    string,
    {
      id: string;
      source: AvaLanguageSource;
      route: AvaLanguageRoute;
      maneuverId?: string;
    }
  >();
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
      "maneuverId",
      "maneuverLabel",
      "evidenceKind",
    ];
    if (Object.keys(entry).some((key) => !allowed.includes(key)))
      issues.push(`entry ${index} contains unknown fields`);
    if (!nonEmpty(entry.id) || ids.has(entry.id))
      issues.push(`entry ${index} id must be unique and non-empty`);
    else ids.add(entry.id);
    if (!nonEmpty(entry.label)) issues.push(`entry ${index} label is required`);
    if (entry.maneuverId !== undefined && !nonEmpty(entry.maneuverId))
      issues.push(`entry ${index} maneuverId must be non-empty when present`);
    if (entry.maneuverLabel !== undefined && !nonEmpty(entry.maneuverLabel))
      issues.push(`entry ${index} maneuverLabel must be non-empty when present`);
    if (
      entry.evidenceKind !== undefined &&
      (!MANEUVER_EVIDENCE_KINDS.has(
        entry.evidenceKind as AvaManeuverEvidenceKind,
      ) || !nonEmpty(entry.maneuverId))
    )
      issues.push(
        `entry ${index} evidenceKind requires a known kind and maneuverId`,
      );
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
        if (owner && owner.id !== entry.id) {
          const authoredManeuverCollision =
            owner.source === "AUTHORED_BRIEF" &&
            entry.source === "AUTHORED_BRIEF" &&
            owner.route === "NARRATIVE_REFERENCE" &&
            entry.route === "NARRATIVE_REFERENCE";
          if (!authoredManeuverCollision)
            issues.push(`alias '${alias}' collides between ${owner.id} and ${entry.id}`);
        } else {
          aliases.set(alias, {
            id: entry.id as string,
            source: entry.source as AvaLanguageSource,
            route: entry.route as AvaLanguageRoute,
            maneuverId: entry.maneuverId as string | undefined,
          });
        }
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
              (key) =>
                ![
                  "section",
                  "phrase",
                  "excerpt",
                  "sourcePath",
                  "sourceOrder",
                ].includes(key),
            ) ||
            !SECTIONS.has(evidence.section as AvaNarrativeSection) ||
            !nonEmpty(evidence.phrase) ||
            !nonEmpty(evidence.excerpt) ||
            String(evidence.excerpt).length > 280 ||
            (evidence.sourcePath !== undefined &&
              !nonEmpty(evidence.sourcePath)) ||
            (evidence.sourceOrder !== undefined &&
              (!Number.isInteger(evidence.sourceOrder) ||
                Number(evidence.sourceOrder) < 0))
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
      if (entry.evidenceKind !== undefined && route !== "NARRATIVE_REFERENCE")
        issues.push(`entry ${index} maneuver evidence must use NARRATIVE_REFERENCE`);
      if (entry.evidenceKind !== undefined && !nonEmpty(entry.maneuverLabel))
        issues.push(`entry ${index} maneuver evidence requires maneuverLabel`);
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
