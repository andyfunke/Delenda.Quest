/**
 * Always-eligible fallback Romantic arcs — one per phase (§4.12(g)/(f)).
 * Instantiated to match slot durationDays (beatCount === durationDays).
 */

const PHASES = ["contact", "compression", "exhaustion", "terminal"];

export const FALLBACK_ARC_IDS = Object.freeze({
  contact: "fallback-contact",
  compression: "fallback-compression",
  exhaustion: "fallback-exhaustion",
  terminal: "fallback-terminal",
});

export function materializeFallbackArc(phase, durationDays) {
  if (!PHASES.includes(phase)) throw new Error(`UNKNOWN_PHASE:${phase}`);
  if (![1, 2, 3].includes(durationDays)) throw new Error("BAD_DURATION");
  const id = FALLBACK_ARC_IDS[phase];
  const beats = [];
  for (let i = 0; i < durationDays; i++) {
    beats.push({
      beatIndex: i,
      heatRealizations: {
        hot: `${id}-beat${i}-hot`,
        medium: `${id}-beat${i}-medium`,
      },
      choices: [
        { id: `${id}-b${i}-c1`, mechanicIds: ["reinforce"] },
        { id: `${id}-b${i}-c2`, mechanicIds: ["abandon"] },
        { id: `${id}-b${i}-c3`, mechanicIds: ["network"] },
      ],
    });
  }
  return {
    id,
    phases: [phase],
    durationDays,
    beatCount: durationDays,
    alwaysEligible: true,
    optional: false,
    gates: { phases: [phase] },
    beats,
    interruptionBehavior: "close-with-residue",
    residueIds: [`${id}-residue`],
  };
}

/** Registry entries used for selection scoring (identity only). */
export const FALLBACK_ARCS_V1 = Object.freeze(
  PHASES.map((phase) =>
    Object.freeze({
      id: FALLBACK_ARC_IDS[phase],
      phases: Object.freeze([phase]),
      alwaysEligible: true,
      optional: false,
      gates: Object.freeze({ phases: Object.freeze([phase]) }),
      interruptionBehavior: "close-with-residue",
      residueIds: Object.freeze([`${FALLBACK_ARC_IDS[phase]}-residue`]),
    }),
  ),
);

export function arcsForPhase(phase, registry = FALLBACK_ARCS_V1) {
  return registry.filter(
    (arc) =>
      arc.alwaysEligible ||
      (arc.phases ?? []).includes(phase) ||
      (arc.gates?.phases ?? []).includes(phase),
  );
}

export function phaseForDay(day) {
  if (day <= 7) return "contact";
  if (day <= 15) return "compression";
  if (day <= 23) return "exhaustion";
  return "terminal";
}
