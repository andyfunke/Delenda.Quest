import {
  cognitiveDigest,
} from "./cognitive-types";
import {
  normalizeAvaLanguageInput,
  type AvaLanguageEntry,
  type AvaNarrativeSection,
} from "./contextual-language";

export type AvaAuthoredBriefingSource = {
  section: AvaNarrativeSection;
  text: string;
};

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

const words = (text: string) =>
  text.match(/[A-Za-z0-9]+(?:[’'-][A-Za-z0-9]+)*/g) ?? [];

const excerpt = (text: string) => text.trim().replace(/\s+/g, " ").slice(0, 280);

const phraseCandidates = (text: string) => {
  const tokens = words(text);
  const candidates: string[] = [];
  for (let size = 2; size <= 5; size += 1) {
    for (let index = 0; index + size <= tokens.length; index += 1) {
      const phrase = tokens.slice(index, index + size).join(" ");
      const normalized = normalizeAvaLanguageInput(phrase);
      if (
        normalized &&
        normalized.split(" ").some((token) => !STOPWORDS.has(token))
      )
        candidates.push(phrase);
    }
  }
  return candidates;
};

export const indexAvaAuthoredBriefing = (
  sources: readonly AvaAuthoredBriefingSource[],
  staticEntries: readonly AvaLanguageEntry[] = [],
): AvaLanguageEntry[] => {
  const staticAliases = new Set(
    staticEntries.flatMap((entry) =>
      entry.aliases.map(normalizeAvaLanguageInput),
    ),
  );
  const claimed = new Set<string>();
  const entries: AvaLanguageEntry[] = [];
  for (const source of sources) {
    const sourceExcerpt = excerpt(source.text);
    for (const phrase of phraseCandidates(source.text)) {
      const normalized = normalizeAvaLanguageInput(phrase);
      if (
        !normalized ||
        staticAliases.has(normalized) ||
        claimed.has(normalized)
      )
        continue;
      claimed.add(normalized);
      const id = `narrative.${source.section}.${cognitiveDigest({
        section: source.section,
        phrase: normalized,
      }).slice(0, 12)}`;
      entries.push({
        id,
        route: "NARRATIVE_REFERENCE",
        label: phrase,
        aliases: [phrase],
        source: "AUTHORED_BRIEF",
        entityId: "campaign-synopsis",
        facet: "meaning",
        evidence: [
          {
            section: source.section,
            phrase,
            excerpt: sourceExcerpt,
          },
        ],
      });
      if (entries.length >= 160) return entries;
    }
  }
  return entries;
};
