import {
  cognitiveDigest,
} from "./cognitive-types";
import {
  normalizeAvaLanguageInput,
  type AvaLanguageEntry,
  type AvaLanguageEvidence,
  type AvaManeuverEvidenceKind,
  type AvaNarrativeSection,
} from "./contextual-language";

export type AvaAuthoredBriefingSource = {
  section: AvaNarrativeSection;
  text: string;
  sourcePath?: string;
  sourceOrder?: number;
  maneuverId?: string;
  evidenceKind?: AvaManeuverEvidenceKind;
  maneuverLabel?: string;
  provenance?: string[];
  /** A one-token typed label is the only permitted one-token span. */
  exactTypedLabel?: boolean;
};

export type AvaAuthoredReferenceDeclaration = {
  id: string;
  surfaces: string[];
  provenance: string[];
};

/**
 * A declaration is an availability boundary, not a second parser. When its
 * exact surface is absent from the current disclosed briefing, the compiler
 * can distinguish truthful unavailability from an unrecognized phrase.
 */
export const AVA_AUTHORED_REFERENCE_DECLARATIONS: readonly AvaAuthoredReferenceDeclaration[] = [
  {
    id: "declared.authored.future-freedom",
    surfaces: ["future freedom"],
    provenance: ["campaign-substrate:reserve-crisis.briefing"],
  },
];

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "what",
  "which",
  "with",
]);

const MAX_AUTHORED_INDEX_ENTRIES = 2048;
const TOKEN_PATTERN = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;

type TokenSpan = { text: string; start: number; end: number };

const tokenSpans = (text: string): TokenSpan[] =>
  [...text.matchAll(TOKEN_PATTERN)].flatMap((match) => {
    const textValue = match[0];
    const start = match.index;
    return start === undefined
      ? []
      : [{ text: textValue, start, end: start + textValue.length }];
  });

const contentTokens = (phrase: string) =>
  normalizeAvaLanguageInput(phrase)
    .split(" ")
    .filter((token) => token && !STOPWORDS.has(token));

const exactExcerpt = (text: string, start: number, end: number) => {
  const phraseLength = end - start;
  if (phraseLength >= 280) return text.slice(start, end).slice(0, 280);
  const room = 280 - phraseLength;
  const before = Math.min(start, Math.floor(room / 2));
  const after = Math.min(text.length - end, room - before);
  const remaining = room - before - after;
  const extraBefore = Math.min(start - before, remaining);
  return text.slice(start - before - extraBefore, end + after);
};

const phraseCandidates = (source: AvaAuthoredBriefingSource) => {
  const tokens = tokenSpans(source.text);
  const candidates: TokenSpan[] = [];
  const minimum = source.exactTypedLabel && tokens.length === 1 ? 1 : 2;
  for (let size = minimum; size <= Math.min(8, tokens.length); size += 1) {
    for (let index = 0; index + size <= tokens.length; index += 1) {
      const start = tokens[index].start;
      const end = tokens[index + size - 1].end;
      const phrase = source.text.slice(start, end);
      const normalized = normalizeAvaLanguageInput(phrase);
      const exactSingleToken =
        size === 1 &&
        source.exactTypedLabel &&
        normalizeAvaLanguageInput(source.text) === normalized;
      if (
        normalized &&
        (size > 1 || exactSingleToken) &&
        contentTokens(phrase).length >= 1
      )
        candidates.push({ text: phrase, start, end });
    }
  }
  return candidates;
};

const appendEvidence = (
  entry: AvaLanguageEntry,
  evidence: AvaLanguageEvidence,
  provenance: readonly string[],
) => ({
  ...entry,
  evidence: [...(entry.evidence ?? []), evidence],
  provenance: [...new Set([...(entry.provenance ?? []), ...provenance])],
});

const sourceProvenance = (source: AvaAuthoredBriefingSource) =>
  source.provenance?.length
    ? source.provenance
    : source.sourcePath
      ? [source.sourcePath]
      : [`AUTHORED_BRIEF:${source.section}`];

const stableManeuverEntryId = (
  source: AvaAuthoredBriefingSource,
  normalized: string,
) =>
  source.maneuverId
    ? `maneuver.${source.maneuverId}.${source.evidenceKind ?? source.section}.${cognitiveDigest(
        {
          maneuverId: source.maneuverId,
          evidenceKind: source.evidenceKind ?? source.section,
          phrase: normalized,
        },
      ).slice(0, 12)}`
    : `narrative.${source.section}.${cognitiveDigest({
        section: source.section,
        phrase: normalized,
      }).slice(0, 12)}`;

const evidenceFor = (
  source: AvaAuthoredBriefingSource,
  candidate: TokenSpan,
): AvaLanguageEvidence => ({
  section: source.section,
  phrase: candidate.text,
  // This remains a byte-for-byte slice of the authored source. Only the
  // lookup key is normalized; stored evidence is never normalized.
  excerpt: exactExcerpt(source.text, candidate.start, candidate.end),
  sourcePath: source.sourcePath,
  sourceOrder: source.sourceOrder,
});

export const indexAvaAuthoredBriefing = (
  sources: readonly AvaAuthoredBriefingSource[],
  staticEntries: readonly AvaLanguageEntry[] = [],
): AvaLanguageEntry[] => {
  const staticAliases = new Set(
    staticEntries.flatMap((entry) =>
      entry.aliases.map(normalizeAvaLanguageInput),
    ),
  );
  const claimedStandard = new Set<string>();
  const entriesByKey = new Map<string, AvaLanguageEntry>();

  for (const source of sources) {
    for (const candidate of phraseCandidates(source)) {
      const normalized = normalizeAvaLanguageInput(candidate.text);
      if (!normalized || staticAliases.has(normalized)) continue;

      const maneuverKey = source.maneuverId
        ? `${source.maneuverId}:${source.evidenceKind ?? source.section}:${normalized}`
        : `standard:${normalized}`;
      if (!source.maneuverId && claimedStandard.has(normalized)) continue;

      const evidence = evidenceFor(source, candidate);
      const provenance = sourceProvenance(source);
      const existing = entriesByKey.get(maneuverKey);
      if (existing) {
        entriesByKey.set(
          maneuverKey,
          appendEvidence(existing, evidence, provenance),
        );
        continue;
      }

      if (entriesByKey.size >= MAX_AUTHORED_INDEX_ENTRIES)
        throw new Error(
          `Ava authored reference index exceeded ${MAX_AUTHORED_INDEX_ENTRIES} entries`,
        );

      const entry: AvaLanguageEntry = {
        id: stableManeuverEntryId(source, normalized),
        route: "NARRATIVE_REFERENCE",
        label: candidate.text,
        aliases: [candidate.text],
        source: "AUTHORED_BRIEF",
        entityId: "campaign-synopsis",
        facet: "meaning",
        provenance: [...provenance],
        evidence: [evidence],
        maneuverId: source.maneuverId,
        maneuverLabel: source.maneuverLabel,
        evidenceKind: source.evidenceKind,
      };
      entriesByKey.set(maneuverKey, entry);
      if (!source.maneuverId) claimedStandard.add(normalized);
    }
  }
  return [...entriesByKey.values()];
};

export const authoredReferenceDeclarationFor = (
  raw: string,
): AvaAuthoredReferenceDeclaration | undefined => {
  const normalized = normalizeAvaLanguageInput(raw);
  return AVA_AUTHORED_REFERENCE_DECLARATIONS.find((declaration) =>
    declaration.surfaces.some(
      (surface) => normalizeAvaLanguageInput(surface) === normalized,
    ),
  );
};
