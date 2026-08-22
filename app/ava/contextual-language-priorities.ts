import type {
  AvaEvaluationCriterion,
} from "./schema";
import type { StrategicDimension } from "../substrate/substrate-core";

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

const AXES = new Set<StrategicDimension>(ORDER);

export const validateDeclaredPriorityAxes = (
  axes: readonly StrategicDimension[],
): void => {
  if (!Array.isArray(axes) || axes.length === 0)
    throw new Error("Declared priority focus requires at least one axis");
  if (axes.length > 4)
    throw new Error("Declared priority focus cannot contain more than four axes");
  if (new Set(axes).size !== axes.length)
    throw new Error("Declared priority focus cannot contain duplicate axes");
  if (axes.some((axis) => !AXES.has(axis)))
    throw new Error("Declared priority focus contains an unknown axis");
};

export const compileDeclaredPriorityFocus = (
  axes: readonly StrategicDimension[],
  _surface?: string,
): AvaDeclaredPriorityFocus => {
  // Empty axes are retained as the existing non-contextual advice fallback;
  // contextual PRIORITY_FOCUS entries are validated before reaching here.
  if (axes.length) validateDeclaredPriorityAxes(axes);
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
