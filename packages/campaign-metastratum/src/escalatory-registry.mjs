/**
 * Additive escalatory registry metadata only — TerminalRisk lives here (§4.10).
 * No authored prose in Epoch 019.
 */

export const ESCALATORY_REGISTRY_V1 = Object.freeze([
  {
    id: "escalatory-standard-shell",
    tier: "escalatory",
    intensity: "standard",
    terminalRisk: "none",
    mechanicIds: ["reinforce", "interdict", "breach"],
    contentLinks: [
      {
        id: "link-escalatory-standard-shell",
        kind: "escalatory-event",
        targetId: "escalatory-standard-shell",
        mechanicIds: ["reinforce", "interdict", "breach"],
        realizationIds: [],
        spineIds: [],
      },
    ],
  },
  {
    id: "escalatory-maximum-shell",
    tier: "escalatory",
    intensity: "maximum",
    terminalRisk: "none",
    mechanicIds: ["breach", "network", "exploit"],
    contentLinks: [
      {
        id: "link-escalatory-maximum-shell",
        kind: "escalatory-event",
        targetId: "escalatory-maximum-shell",
        mechanicIds: ["breach", "network", "exploit"],
        realizationIds: [],
        spineIds: [],
      },
    ],
  },
  {
    id: "doomsday-shell",
    tier: "escalatory",
    intensity: "maximum",
    terminalRisk: "doomsday",
    terminalEnvelopePpm: { min: 50_000, max: 450_000 },
    mechanicIds: ["network"],
    contentLinks: [
      {
        id: "link-doomsday-shell",
        kind: "doomsday-event",
        targetId: "doomsday-shell",
        mechanicIds: ["network"],
        realizationIds: [],
        spineIds: ["doomsday-spine/v1"],
      },
    ],
  },
]);

/** Scalable effect envelopes — axes, rounding, caps (§4.11(a)). */
export const SCALABLE_EFFECT_ENVELOPES_V1 = Object.freeze({
  version: "scalable-effect-envelopes/v1",
  mechanics: {
    reinforce: {
      axes: ["personnel", "materiel"],
      rounding: "floor-ppm",
      caps: { personnel: 1_000_000, materiel: 1_000_000 },
    },
    interdict: {
      axes: ["supply", "mobility"],
      rounding: "floor-ppm",
      caps: { supply: 1_000_000, mobility: 800_000 },
    },
    breach: {
      axes: ["fortification", "casualties"],
      rounding: "floor-ppm",
      caps: { fortification: 1_000_000, casualties: 900_000 },
    },
    network: {
      axes: ["networkState"],
      rounding: "floor-ppm",
      caps: { networkState: 1_000_000 },
    },
    exploit: {
      axes: ["groundMovementKm"],
      rounding: "floor-ppm",
      caps: { groundMovementKm: 1_200_000 },
    },
  },
});
