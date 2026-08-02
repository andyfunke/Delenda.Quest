import type {
  AvaEvaluationCriterion,
} from "./schema";
import type { StrategicDimension } from "../substrate/gates";

export type AvaDeclaredPriorityFocus = {
  axes: StrategicDimension[];
  criteria: AvaEvaluationCriterion[];
  label: string;
};

const ORDER: StrategicDimension[] = [
  "territorial_control",
  "initiative",
  "force_preservation",
  "veteran_preservation",
  "supply_integrity",
  "production_integrity",
  "intelligence_advantage",
  "infrastructure_preservation",
  "civil_stability",
  "treasury_preservation",
  "diplomatic_autonomy",
  "long_term_capacity",
];

const CRITERION_BY_AXIS: Partial<
  Record<StrategicDimension, AvaEvaluationCriterion>
> = {
  territorial_control: "FRONT",
  initiative: "IMMEDIATE",
  force_preservation: "LOWEST_RISK",
  veteran_preservation: "LOWEST_RISK",
  supply_integrity: "LOWEST_MATERIEL_COST",
  production_integrity: "PRODUCTION",
  intelligence_advantage: "HIGHEST_UPSIDE",
  infrastructure_preservation: "SUSTAINABILITY",
  civil_stability: "SUSTAINABILITY",
  treasury_preservation: "LOWEST_MATERIEL_COST",
  diplomatic_autonomy: "LONG_TERM",
  long_term_capacity: "LONG_TERM",
};

const humanLabel = (axis: StrategicDimension) =>
  axis
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");

export const compileDeclaredPriorityFocus = (
  axes: readonly StrategicDimension[],
): AvaDeclaredPriorityFocus => {
  const ordered = ORDER.filter((axis) => axes.includes(axis));
  if (!ordered.length)
    return {
      axes: [],
      criteria: ["OVERALL_VALUE"],
      label: "OVERALL VALUE",
    };
  const criteria = [
    ...new Set(
      ordered
        .map((axis) => CRITERION_BY_AXIS[axis])
        .filter((criterion): criterion is AvaEvaluationCriterion => !!criterion),
    ),
  ];
  return {
    axes: ordered,
    criteria: criteria.length ? criteria : ["OVERALL_VALUE"],
    label: ordered.map(humanLabel).join(" + "),
  };
};

export const strategicDimensionOrder = [...ORDER];
