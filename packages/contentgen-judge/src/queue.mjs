/**
 * §4.9 queue law — exact curiosity weights and lane assignment.
 */

import { PRIORITY_BANDS, priorityBand } from "./types.mjs";

const WEIGHTS = {
  entropy: 0.35,
  novelty: 0.2,
  judgeDeterministicDisagreement: 0.2,
  crossMediumTransferDisagreement: 0.15,
  chordCoverageDeficit: 0.1,
};

const CURIOSITY_THRESHOLD = 0.65;
const LANE_ORDER = { "#failures": 0, "#curious": 1, compliant: 2 };

export function binaryEntropy(p) {
  const x = Math.min(1, Math.max(0, p));
  if (x <= 0 || x >= 1) return 0;
  return -(x * Math.log2(x) + (1 - x) * Math.log2(1 - x));
}

/** Probability fallback: promoted policy → epoch-008 weak → 0.5 */
export function qualityProbability(candidate) {
  if (typeof candidate.promotedPolicyProbability === "number") {
    return {
      probability: candidate.promotedPolicyProbability,
      source: "latest-promoted-policy",
    };
  }
  if (typeof candidate.weakLabelProbability === "number") {
    return {
      probability: candidate.weakLabelProbability,
      source: "epoch-008-weak-label-aggregate",
    };
  }
  return { probability: 0.5, source: "constant-0.5" };
}

export function computeCuriosity(terms, judgeId = "NONE") {
  const judgeDeterministicDisagreement =
    judgeId === "NONE" ? 0 : (terms.judgeDeterministicDisagreement ?? 0);
  const curiosity =
    WEIGHTS.entropy * (terms.entropy ?? 0) +
    WEIGHTS.novelty * (terms.novelty ?? 0) +
    WEIGHTS.judgeDeterministicDisagreement * judgeDeterministicDisagreement +
    WEIGHTS.crossMediumTransferDisagreement *
      (terms.crossMediumTransferDisagreement ?? 0) +
    WEIGHTS.chordCoverageDeficit * (terms.chordCoverageDeficit ?? 0);
  return { curiosity, judgeDeterministicDisagreement };
}

export function assignQueueLane(candidate, judgeId = "NONE") {
  if (candidate.compileStatus === "HARD_FAILURE") {
    const failureSeverity = candidate.failureSeverity ?? 1;
    const judgeInformationValue =
      judgeId === "NONE" ? 0 : (candidate.judgeInformationValue ?? 0);
    const priority = failureSeverity + judgeInformationValue;
    return {
      lane: "#failures",
      priority,
      priorityBand: priorityBand(Math.min(1, priority / 2)),
      probabilitySource: null,
      curiosity: null,
    };
  }

  const { probability, source } = qualityProbability(candidate);
  const entropy = binaryEntropy(probability);
  const { curiosity } = computeCuriosity(
    {
      entropy,
      novelty: candidate.novelty ?? 0,
      judgeDeterministicDisagreement: candidate.judgeDeterministicDisagreement,
      crossMediumTransferDisagreement:
        candidate.crossMediumTransferDisagreement ?? 0,
      chordCoverageDeficit: candidate.chordCoverageDeficit ?? 0,
    },
    judgeId,
  );
  const lane = curiosity >= CURIOSITY_THRESHOLD ? "#curious" : "compliant";
  return {
    lane,
    priority: curiosity,
    priorityBand: priorityBand(curiosity),
    probabilitySource: source,
    curiosity,
    entropy,
    qualityProbability: probability,
  };
}

export function sortQueue(candidates, judgeId = "NONE") {
  return [...candidates]
    .map((row) => {
      const assigned = assignQueueLane(row, judgeId);
      return {
        ...row,
        ...assigned,
        tags: mergeLaneTag(row.tags, assigned.lane),
      };
    })
    .sort(
      (a, b) =>
        (LANE_ORDER[a.lane] ?? 9) - (LANE_ORDER[b.lane] ?? 9) ||
        b.priority - a.priority ||
        String(a.id).localeCompare(String(b.id)),
    );
}

function mergeLaneTag(tags, lane) {
  const next = new Set(tags ?? []);
  for (const value of ["#failures", "#curious", "compliant"]) next.delete(value);
  next.add(lane);
  return [...next];
}

export function bandBoundaries() {
  return { ...PRIORITY_BANDS, curiosityLaneThreshold: CURIOSITY_THRESHOLD };
}
