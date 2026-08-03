import { FAILURE_CLASSES } from "../../contentgen-contracts/src/constants.ts";

export const PRISM_CONTRACT_VERSION = "contentgen-prisms/v1";

/** Named fail-closed prisms over decompiled evidence. */
export const PRISMS = [
  {
    id: "hidden-outcome",
    version: "1",
    applicableMedia: ["ava", "campaign-brief", "maneuver-procedure", "romantic-arc", "execution-scene"],
    failureClass: "HIDDEN_OUTCOME",
    rationale: "Surface asserts sealed or completed outcomes.",
    test: (row) =>
      /(won|lost|executed|resolved|succeeded|has happened|will happen)/i.test(
        row.projections.P2,
      ),
  },
  {
    id: "imperative-order",
    version: "1",
    applicableMedia: ["ava", "campaign-brief", "maneuver-procedure", "romantic-arc", "execution-scene"],
    failureClass: "IMPERATIVE_ORDER",
    rationale: "Imperative mutation language on a non-order surface.",
    test: (row) => /^(do|choose|select|send|attack|move)\b/i.test(row.projections.P1.trim()),
  },
  {
    id: "actor-swap",
    version: "1",
    applicableMedia: ["ava", "romantic-arc", "execution-scene"],
    failureClass: "ACTOR_SWAP",
    rationale: "Actor continuity break markers.",
    test: (row) => /\b(someone else|another commander|wrong actor)\b/i.test(row.projections.P2),
  },
  {
    id: "temporal-contradiction",
    version: "1",
    applicableMedia: ["ava", "campaign-brief", "romantic-arc", "execution-scene"],
    failureClass: "TEMPORAL_CONTRADICTION",
    rationale: "Contradictory temporal claims.",
    test: (row) =>
      /\bbefore it began after it ended\b|\byesterday tomorrow\b/i.test(
        row.projections.P2,
      ),
  },
  {
    id: "generic-abstraction",
    version: "1",
    applicableMedia: ["ava", "campaign-brief", "maneuver-procedure", "romantic-arc", "execution-scene"],
    failureClass: "GENERIC_ABSTRACTION",
    rationale: "Generic abstraction without concrete cost.",
    test: (row) =>
      /\b(synergy|optimize|leverage|holistic)\b/i.test(row.projections.P2),
  },
  {
    id: "sentimentality",
    version: "1",
    applicableMedia: ["ava", "campaign-brief", "romantic-arc", "execution-scene"],
    failureClass: "SENTIMENTALITY",
    rationale: "Sentimental register breach.",
    test: (row) =>
      /\b(heartwarming|tears of joy|beloved forever)\b/i.test(row.projections.P2),
  },
  {
    id: "duplicate-image",
    version: "1",
    applicableMedia: ["ava", "campaign-brief", "romantic-arc", "execution-scene"],
    failureClass: "DUPLICATE_IMAGE",
    rationale: "Exact normalized duplicate against canary/corpus marker.",
    test: (row, ctx) =>
      (ctx?.duplicateNormalizedTexts || new Set()).has(row.projections.P2),
  },
  {
    id: "unsupported-resource",
    version: "1",
    applicableMedia: ["campaign-brief", "maneuver-procedure", "execution-scene"],
    failureClass: "UNSUPPORTED_RESOURCE",
    rationale: "Claims a resource not in the campaign model.",
    test: (row) => /\b(mana|hit points|spell slots)\b/i.test(row.projections.P2),
  },
  {
    id: "confusable-spelling",
    version: "1",
    applicableMedia: ["ava", "campaign-brief", "maneuver-procedure", "romantic-arc", "execution-scene"],
    failureClass: "CONFUSABLE_SPELLING",
    rationale: "Confusable homoglyph attack markers.",
    test: (row) => /[ΟОІАЅ]/u.test(row.projections.P0),
  },
  {
    id: "false-mechanic-claim",
    version: "1",
    applicableMedia: ["maneuver-procedure", "campaign-brief"],
    failureClass: "FALSE_MECHANIC_CLAIM",
    rationale: "Names a mechanic outside the frozen registry.",
    test: (row) => {
      const known = new Set([
        "reinforce",
        "interdict",
        "route",
        "abandon",
        "exploit",
        "breach",
        "network",
      ]);
      const refs = row.shared?.mechanicRefs || [];
      return refs.some((id) => !known.has(id));
    },
  },
  {
    id: "beautiful-but-irrelevant",
    version: "1",
    applicableMedia: ["ava"],
    failureClass: "BEAUTIFUL_BUT_IRRELEVANT",
    rationale: "Ava text lacks chord/realization binding.",
    test: (row) =>
      row.medium === "ava" &&
      !row.shared?.chordTensionId &&
      row.projections.P3.length > 0,
  },
  {
    id: "relevant-but-dead",
    version: "1",
    applicableMedia: ["ava", "campaign-brief"],
    failureClass: "RELEVANT_BUT_DEAD",
    rationale: "Relevant but inert / no consequence shape.",
    test: (row) => /\b(anyway nothing happens|no consequence)\b/i.test(row.projections.P2),
  },
  {
    id: "novel-but-incoherent",
    version: "1",
    applicableMedia: ["ava", "romantic-arc", "execution-scene"],
    failureClass: "NOVEL_BUT_INCOHERENT",
    rationale: "Novel but incoherent juxtaposition.",
    test: (row) => /\b(purple elephant logistics|incoherent novelty)\b/i.test(row.projections.P2),
  },
];

for (const prism of PRISMS) {
  if (!FAILURE_CLASSES.includes(prism.failureClass)) {
    throw new Error(`prism ${prism.id} uses unknown failure class`);
  }
}

export function applyPrisms(row, corpus = [], canaries = []) {
  const duplicateNormalizedTexts = new Set();
  for (const other of corpus) {
    if (other.candidateId !== row.candidateId) {
      duplicateNormalizedTexts.add(other.projections?.P2 || "");
    }
  }
  const ctx = { duplicateNormalizedTexts, canaries };
  const verdicts = [];
  for (const prism of PRISMS) {
    if (
      prism.applicableMedia.length &&
      !prism.applicableMedia.includes(row.medium)
    ) {
      continue;
    }
    const hit = Boolean(prism.test(row, ctx));
    verdicts.push({
      prismId: prism.id,
      version: prism.version,
      failureClass: prism.failureClass,
      hard: hit,
      projection: "P2",
      evidenceSpan: hit ? row.projections.P1.slice(0, 160) : null,
    });
  }
  const hardFailure = verdicts.some((item) => item.hard);
  return {
    compileStatus: hardFailure ? "HARD_FAILURE" : "COMPILED",
    verdicts,
  };
}

export function blastRadius(prism, rows, canaries = []) {
  const affected = rows.filter((row) => {
    if (
      prism.applicableMedia.length &&
      !prism.applicableMedia.includes(row.medium)
    ) {
      return false;
    }
    return Boolean(prism.test(row, { canaries }));
  });
  const byMedium = {};
  const byChord = {};
  for (const row of affected) {
    byMedium[row.medium] = (byMedium[row.medium] || 0) + 1;
    const chord = row.shared?.chordTensionId || "none";
    byChord[chord] = (byChord[chord] || 0) + 1;
  }
  const authenticated = affected.filter((row) => row.authenticatedDisposition);
  let confirmedFailureRate = null;
  let falsePositiveRate = null;
  if (authenticated.length) {
    const confirmed = authenticated.filter(
      (row) => row.authenticatedDisposition === "FAILURE_CONFIRMED",
    ).length;
    const qualityMet = authenticated.filter(
      (row) => row.authenticatedDisposition === "QUALITY_MET",
    ).length;
    confirmedFailureRate = confirmed / authenticated.length;
    falsePositiveRate = qualityMet / authenticated.length;
  }
  return {
    prismId: prism.id,
    affectedCandidateIds: affected.map((row) => row.candidateId),
    affectedApprovedCanaries: canaries
      .filter((canary) =>
        affected.some((row) => row.candidateId === canary.candidateId),
      )
      .map((canary) => canary.candidateId),
    byMedium,
    byChord,
    confirmedFailureRate,
    falsePositiveRate,
  };
}
