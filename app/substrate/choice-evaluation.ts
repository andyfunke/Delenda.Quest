import type { GameState } from "../game";
import { choiceById } from "./content-adapters";
import type { ConsequenceFact, UncertaintyFact } from "./contracts";
import type { StrategicPosture } from "./posture";

export type ChoiceEvaluation = {
  choiceId: string;
  legal: boolean;
  visible: boolean;
  score: number;
  components: {
    objectiveFit: number;
    priorityFit: number;
    toleranceFit: number;
    constraintRelief: number;
    continuity: number;
    opportunity: number;
    resourceEfficiency: number;
    horizonFit: number;
    riskPenalty: number;
    contradictionPenalty: number;
  };
  knownBenefits: ConsequenceFact[];
  knownCosts: ConsequenceFact[];
  knownRisks: ConsequenceFact[];
  unknowns: UncertaintyFact[];
  disqualifiers: string[];
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(n)));

/**
 * Integer directive evaluation vector.
 * Ranges (documented):
 * objectiveFit 0..200, priorityFit 0..200, toleranceFit 0..150,
 * constraintRelief 0..200, continuity 0..100, opportunity 0..100,
 * resourceEfficiency 0..150, horizonFit 0..100,
 * riskPenalty 0..200, contradictionPenalty 0..200.
 */
export const evaluateDirectiveChoices = (
  state: GameState,
  choiceIds: string[],
  posture: StrategicPosture,
): ChoiceEvaluation[] => {
  const materialConflict = posture.unresolvedConflicts.some((item) => item.material);
  return choiceIds.map((choiceId) => {
    const found = choiceById(choiceId);
    const disqualifiers: string[] = [];
    if (!found) disqualifiers.push("missing-choice");
    const family = found?.family;
    const choice = found?.choice;
    const locked = family ? (state.locks?.[family.id] ?? 0) > state.day : true;
    if (locked) disqualifiers.push("family-locked");
    if (state.actions <= 0) disqualifiers.push("no-orders");

    const exact = choice?.exact ?? [];
    const risk = choice?.risk ?? [];
    const treasuryCost = Math.abs(choice?.delta?.treasury ?? 0);
    const readinessGain = choice?.delta?.readiness ?? 0;
    const legitimacyGain = choice?.delta?.legitimacy ?? 0;
    const dependencyGain = choice?.delta?.dependency ?? 0;

    const objectiveFit = clamp(
      posture.objective === "preserve_industrial_capacity" && family?.module === "national"
        ? 180
        : posture.objective === "preserve_experienced_forces" && family?.module === "military"
          ? 170
          : posture.objective === "reduce_foreign_dependency" && family?.module === "diplomacy"
            ? 160
            : 110,
      0,
      200,
    );
    const priorityFit = clamp(
      (posture.priorities.production_integrity === "critical" && family?.module === "national"
        ? 160
        : 0) +
        (posture.priorities.force_preservation === "critical" && family?.module === "military"
          ? 160
          : 0) +
        (posture.priorities.diplomatic_autonomy === "critical" && dependencyGain < 0
          ? 140
          : 80),
      0,
      200,
    );
    const toleranceFit = clamp(
      (posture.tolerances.treasury_expenditure === "none" && treasuryCost > 5 ? 20 : 120) +
        (posture.tolerances.dependency === "none" && dependencyGain > 0 ? -40 : 0),
      0,
      150,
    );
    const constraintRelief = clamp(
      (state.materiel < 50 && (choice?.delta?.materiel ?? 0) > 0 ? 120 : 40) +
        (state.readiness < 55 && readinessGain > 0 ? 80 : 0) +
        (state.legitimacy < 45 && legitimacyGain > 0 ? 70 : 0),
      0,
      200,
    );
    const continuity = clamp(
      (state.decisions ?? []).some((decision) => decision.familyId === family?.id) ? 70 : 40,
      0,
      100,
    );
    const opportunity = clamp(100 - treasuryCost * 4, 0, 100);
    const resourceEfficiency = clamp(150 - treasuryCost * 8 + readinessGain * 10, 0, 150);
    const horizonFit = clamp(
      posture.horizon === "long" ? 80 + (choice?.duration ?? 0) * 5 : 70,
      0,
      100,
    );
    const riskPenalty = clamp(risk.length * 35, 0, 200);
    const contradictionPenalty = clamp(materialConflict ? 120 : 0, 0, 200);
    const components = {
      objectiveFit,
      priorityFit,
      toleranceFit,
      constraintRelief,
      continuity,
      opportunity,
      resourceEfficiency,
      horizonFit,
      riskPenalty,
      contradictionPenalty,
    };
    const score =
      objectiveFit +
      priorityFit +
      toleranceFit +
      constraintRelief +
      continuity +
      opportunity +
      resourceEfficiency +
      horizonFit -
      riskPenalty -
      contradictionPenalty;
    return {
      choiceId,
      legal: disqualifiers.length === 0,
      visible: Boolean(found),
      score,
      components,
      knownBenefits: exact.slice(0, 2).map((claim, index) => ({
        id: `${choiceId}:benefit:${index}`,
        claim,
        polarity: "benefit" as const,
        visible: true as const,
      })),
      knownCosts: exact
        .filter((claim) => /−|-/.test(claim))
        .slice(0, 2)
        .map((claim, index) => ({
          id: `${choiceId}:cost:${index}`,
          claim,
          polarity: "cost" as const,
          visible: true as const,
        })),
      knownRisks: risk.map((claim, index) => ({
        id: `${choiceId}:risk:${index}`,
        claim,
        polarity: "risk" as const,
        visible: true as const,
      })),
      unknowns: [
        {
          id: `${choiceId}:unknown:resolution`,
          claim: "Resolution variance remains outside disclosed exact effects.",
        },
      ],
      disqualifiers,
    };
  });
};
