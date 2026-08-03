export const AVA_RELEVANCE_VERSION = "ava-relevance-graph/v1" as const;

export type AvaRelevanceChord =
  | "uncertainty"
  | "certainty"
  | "urgency"
  | "delay"
  | "loss"
  | "resources"
  | "enemy"
  | "trust"
  | "choice"
  | "plan"
  | "gratitude"
  | "frustration"
  | "identity"
  | "comparison"
  | "question";

export type AvaRelevantAside = {
  version: typeof AVA_RELEVANCE_VERSION;
  realizationId: string;
  chord: AvaRelevanceChord;
  line: string;
  score: number;
};

type Realization = {
  id: string;
  chord: AvaRelevanceChord;
  line: string;
  required: readonly string[];
  forbidden?: readonly string[];
};

const REALIZATIONS: readonly Realization[] = [
  { id: "uncertainty-evidence", chord: "uncertainty", line: "You are asking uncertainty to become permission. It can only become a price.", required: ["uncertain", "unsure", "maybe", "might", "risk"] },
  { id: "certainty-blind", chord: "certainty", line: "Certainty is usually the last report received before the evidence changes.", required: ["certain", "definitely", "obvious", "guarantee", "sure"] },
  { id: "urgency-clock", chord: "urgency", line: "The clock is not an argument. It is merely the enemy's least imaginative accomplice.", required: ["urgent", "hurry", "quick", "now", "immediately"] },
  { id: "delay-choice", chord: "delay", line: "Delay is still a choice. It merely delegates the terms to whatever keeps moving.", required: ["wait", "later", "delay", "hold", "not yet"] },
  { id: "loss-affordable", chord: "loss", line: "Calling a loss acceptable does not make it smaller. It identifies who was absent from the negotiation.", required: ["loss", "losses", "casualties", "sacrifice", "acceptable", "afford"] },
  { id: "resources-priority", chord: "resources", line: "A shortage is a priority stripped of its rhetoric.", required: ["resource", "supply", "shortage", "enough", "cost", "afford"] },
  { id: "enemy-repeat", chord: "enemy", line: "You are studying what the enemy may do. The enemy is studying what you do twice.", required: ["enemy", "adversary", "opponent", "they"] },
  { id: "trust-verification", chord: "trust", line: "Trust is useful between people. Between reports, use corroboration.", required: ["trust", "believe", "honest", "truth", "lying"] },
  { id: "choice-exclusion", chord: "choice", line: "A choice becomes strategic when its rejected alternatives continue to matter.", required: ["choose", "choice", "option", "which", "better"] },
  { id: "plan-failure", chord: "plan", line: "A plan that cannot name its failure has merely concealed an optimism budget.", required: ["plan", "strategy", "intend", "going to"] },
  { id: "gratitude-debt", chord: "gratitude", line: "Keep the gratitude. Spend the improved judgment.", required: ["thanks", "thank you", "helpful", "good job"] },
  { id: "frustration-specific", chord: "frustration", line: "Anger is imprecise evidence. Point it at the exact failure and it becomes useful.", required: ["wrong", "useless", "stupid", "frustrating", "damn"] },
  { id: "identity-observation", chord: "identity", line: "You want to know what I am. I am more interested in what your question permits me to infer.", required: ["who are you", "what are you", "are you alive", "are you ai"] },
  { id: "comparison-distinction", chord: "comparison", line: "A comparison is not a verdict. It is a promise to keep the differences visible long enough to matter.", required: ["compare", "comparison", "versus", " vs "] },
  { id: "question-omission", chord: "question", line: "The shape of the question is evidence. So is the fact you left outside it.", required: ["?", "why", "how", "what", "should"] },
] as const;

const normalize = (value: string) =>
  value.normalize("NFKC").toLowerCase().replace(/[’]/g, "'").replace(/[^\p{L}\p{N}'?]+/gu, " ").trim();

const contains = (surface: string, phrase: string) =>
  phrase === "?"
    ? surface.includes("?")
    : ` ${surface.replaceAll("?", " ").replace(/\s+/g, " ")} `.includes(` ${phrase} `);

const hash = (value: string) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
};

/**
 * Compiles a bounded player-language chord into an authored aside. This is a
 * realization-only layer: it neither interprets commands nor asserts campaign
 * facts. Ties rotate deterministically with the existing voice cursor.
 */
export const compileAvaRelevantAside = (
  utterance: string | undefined,
  variant = 0,
): AvaRelevantAside | null => {
  if (!utterance?.trim()) return null;
  const surface = normalize(utterance);
  const candidates = REALIZATIONS.flatMap((realization) => {
    const rawScore = realization.required.reduce(
      (total, phrase) => total + (contains(surface, phrase) ? (phrase.includes(" ") ? 4 : 2) : 0),
      0,
    );
    // Question shape is a useful fallback, never stronger than a topical edge.
    const score = realization.chord === "question" ? Math.min(1, rawScore) : rawScore;
    const forbidden = realization.forbidden?.some((phrase) => contains(surface, phrase));
    return score > 0 && !forbidden ? [{ realization, score }] : [];
  }).sort((left, right) =>
    right.score - left.score ||
    ((hash(`${surface}:${variant}:${left.realization.id}`) - hash(`${surface}:${variant}:${right.realization.id}`)) || left.realization.id.localeCompare(right.realization.id)),
  );
  const winner = candidates[0];
  if (!winner) return null;
  return {
    version: AVA_RELEVANCE_VERSION,
    realizationId: winner.realization.id,
    chord: winner.realization.chord,
    line: winner.realization.line,
    score: winner.score,
  };
};

export const avaRelevanceAudit = () => ({
  version: AVA_RELEVANCE_VERSION,
  realizationCount: REALIZATIONS.length,
  ids: REALIZATIONS.map(({ id }) => id),
  chords: [...new Set(REALIZATIONS.map(({ chord }) => chord))],
});
