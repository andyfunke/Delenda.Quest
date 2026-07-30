import {
  type StrategicDimension,
  type StrategicWeight,
  type ToleranceDimension,
  type ToleranceLevel,
} from "./gates";

export const STRATEGIC_DIMENSIONS = [
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
] as const;

export const TOLERANCE_DIMENSIONS = [
  "territorial_loss",
  "conscript_attrition",
  "veteran_attrition",
  "civil_unrest",
  "dependency",
  "treasury_expenditure",
  "supply_disruption",
  "short_term_exposure",
] as const;

export const STRATEGIC_WEIGHTS = [
  "ignore",
  "low",
  "moderate",
  "high",
  "critical",
] as const;

export const TOLERANCE_LEVELS = [
  "none",
  "low",
  "moderate",
  "high",
  "unrestricted",
] as const;

export const HORIZONS = ["immediate", "short", "medium", "long"] as const;

export const OBJECTIVES = [
  "survive",
  "stabilize_front",
  "recover_territory",
  "preserve_industrial_capacity",
  "restore_supply",
  "preserve_experienced_forces",
  "build_long_term_capacity",
  "reduce_foreign_dependency",
  "gain_initiative",
] as const;

export type Horizon = (typeof HORIZONS)[number];
export type Objective = (typeof OBJECTIVES)[number];

export type PostureConflict = {
  code: string;
  dimensions: string[];
  material: boolean;
  clarification: string;
};

export type StrategicPosture = {
  objective: Objective;
  horizon: Horizon;
  priorities: Partial<Record<StrategicDimension, StrategicWeight>>;
  tolerances: Partial<Record<ToleranceDimension, ToleranceLevel>>;
  unresolvedConflicts: PostureConflict[];
  confirmation: "default" | "inferred" | "confirmed_by_player";
};

export type PostureContext = {
  offensivePathsRequireHighExposure?: boolean;
  productionDependsOnCurrentSupply?: boolean;
};

const WEIGHTS = new Set<string>(STRATEGIC_WEIGHTS);
const TOLERANCES = new Set<string>(TOLERANCE_LEVELS);
const OBJECTIVES_SET = new Set<string>(OBJECTIVES);
const HORIZONS_SET = new Set<string>(HORIZONS);
const highTolerance = (level?: ToleranceLevel) =>
  level === "high" || level === "unrestricted";

export const DEFAULT_STRATEGIC_POSTURE: StrategicPosture = {
  objective: "stabilize_front",
  horizon: "short",
  priorities: {
    force_preservation: "high",
    supply_integrity: "high",
    production_integrity: "moderate",
    territorial_control: "moderate",
    civil_stability: "moderate",
  },
  tolerances: {
    territorial_loss: "low",
    conscript_attrition: "moderate",
    veteran_attrition: "low",
    treasury_expenditure: "moderate",
    short_term_exposure: "moderate",
  },
  unresolvedConflicts: [],
  confirmation: "default",
};

export const detectPostureConflicts = (
  posture: Omit<StrategicPosture, "unresolvedConflicts">,
  context: PostureContext = {},
): PostureConflict[] => {
  const p = posture.priorities;
  const t = posture.tolerances;
  const conflicts: PostureConflict[] = [];
  const add = (
    code: string,
    dimensions: string[],
    clarification: string,
    material = true,
  ) => conflicts.push({ code, dimensions, material, clarification });

  if (p.territorial_control === "critical" && highTolerance(t.territorial_loss)) {
    add(
      "territory_critical_vs_loss_tolerance",
      ["territorial_control", "territorial_loss"],
      "You mark territorial control critical while accepting high territorial loss. Clarify which governs.",
    );
  }
  if (p.veteran_preservation === "critical" && highTolerance(t.veteran_attrition)) {
    add(
      "veterans_critical_vs_attrition",
      ["veteran_preservation", "veteran_attrition"],
      "Veteran preservation is critical while veteran attrition tolerance is high.",
    );
  }
  if (
    p.force_preservation === "critical" &&
    p.initiative === "critical" &&
    context.offensivePathsRequireHighExposure
  ) {
    add(
      "force_vs_initiative_exposure",
      ["force_preservation", "initiative"],
      "Current offensive paths require high exposure; force preservation and initiative cannot both be critical without clarification.",
    );
  }
  if (p.civil_stability === "critical" && highTolerance(t.civil_unrest)) {
    add(
      "civil_stability_vs_unrest",
      ["civil_stability", "civil_unrest"],
      "Civil stability is critical while civil unrest tolerance is high.",
    );
  }
  if (p.treasury_preservation === "critical" && highTolerance(t.treasury_expenditure)) {
    add(
      "treasury_vs_expenditure",
      ["treasury_preservation", "treasury_expenditure"],
      "Treasury preservation is critical while expenditure tolerance is high.",
    );
  }
  if (p.diplomatic_autonomy === "critical" && highTolerance(t.dependency)) {
    add(
      "autonomy_vs_dependency",
      ["diplomatic_autonomy", "dependency"],
      "Diplomatic autonomy is critical while dependency tolerance is high.",
    );
  }
  if (
    p.production_integrity === "critical" &&
    highTolerance(t.supply_disruption) &&
    context.productionDependsOnCurrentSupply
  ) {
    add(
      "production_vs_supply_disruption",
      ["production_integrity", "supply_disruption"],
      "Production integrity is critical while supply disruption tolerance is high and production depends on current supply.",
    );
  }
  return conflicts;
};

export const validateStrategicPosture = (
  input: unknown,
  context: PostureContext = {},
): { ok: true; posture: StrategicPosture } | { ok: false; errors: string[] } => {
  const errors: string[] = [];
  if (!input || typeof input !== "object") return { ok: false, errors: ["posture must be an object"] };
  const raw = input as Partial<StrategicPosture>;
  if (!raw.objective || !OBJECTIVES_SET.has(raw.objective)) errors.push("invalid objective");
  if (!raw.horizon || !HORIZONS_SET.has(raw.horizon)) errors.push("invalid horizon");
  const priorities: StrategicPosture["priorities"] = {};
  for (const [key, value] of Object.entries(raw.priorities ?? {})) {
    if (!(STRATEGIC_DIMENSIONS as readonly string[]).includes(key)) {
      errors.push(`unknown priority dimension ${key}`);
      continue;
    }
    if (!WEIGHTS.has(String(value))) errors.push(`invalid weight for ${key}`);
    else priorities[key as StrategicDimension] = value as StrategicWeight;
  }
  const tolerances: StrategicPosture["tolerances"] = {};
  for (const [key, value] of Object.entries(raw.tolerances ?? {})) {
    if (!(TOLERANCE_DIMENSIONS as readonly string[]).includes(key)) {
      errors.push(`unknown tolerance dimension ${key}`);
      continue;
    }
    if (!TOLERANCES.has(String(value))) errors.push(`invalid tolerance for ${key}`);
    else tolerances[key as ToleranceDimension] = value as ToleranceLevel;
  }
  if (errors.length) return { ok: false, errors };
  const base = {
    objective: raw.objective as Objective,
    horizon: raw.horizon as Horizon,
    priorities,
    tolerances,
    confirmation: raw.confirmation ?? "inferred",
  } as const;
  const unresolvedConflicts = detectPostureConflicts(base, context);
  return {
    ok: true,
    posture: { ...base, unresolvedConflicts },
  };
};

export const mergePosture = (
  base: StrategicPosture,
  patch: Partial<StrategicPosture>,
  context: PostureContext = {},
): StrategicPosture => {
  const merged = {
    objective: patch.objective ?? base.objective,
    horizon: patch.horizon ?? base.horizon,
    priorities: { ...base.priorities, ...patch.priorities },
    tolerances: { ...base.tolerances, ...patch.tolerances },
    confirmation: patch.confirmation ?? base.confirmation,
  };
  return {
    ...merged,
    unresolvedConflicts: detectPostureConflicts(merged, context),
  };
};
