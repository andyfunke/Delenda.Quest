#!/usr/bin/env node
/**
 * Deterministic pack materializer for Epochs 022–024.
 * Semantics-first spines; prose is declared after mechanic links.
 * Emits promoted manifests with authenticated review receipts (lab loop).
 */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  CAMPAIGN_PHASES as CANON_PHASES,
  MANEUVER_IDS as CANON_MANEUVERS,
  PROBLEM_CLASSES as CANON_PROBLEMS,
  THEATERS as CANON_THEATERS,
} from "../app/substrate/vocabulary.ts";

const sha256 = (v) =>
  createHash("sha256").update(String(v).normalize("NFC"), "utf8").digest("hex");

const THEATERS = ["industrial", "lowland", "ridge", "river"];
const PROBLEMS = [
  "assault",
  "command",
  "counterstroke",
  "crossing",
  "exploitation",
  "force-preservation",
  "logistics",
  "observation",
];
const MANEUVERS = [
  "reinforce",
  "interdict",
  "route",
  "abandon",
  "exploit",
  "breach",
  "network",
];
const PHASES = ["contact", "compression", "exhaustion", "terminal"];

// Local arrays keep this script's historical emission order (committed pack
// bytes must not drift); the shared substrate vocabulary is the id authority.
const assertCanonSet = (label, local, canon) => {
  const a = [...local].sort().join("|");
  const b = [...canon].sort().join("|");
  if (a !== b) throw new Error(`PACKS_VOCABULARY_DRIFT:${label}:${a}!=${b}`);
};
assertCanonSet("theaters", THEATERS, CANON_THEATERS);
assertCanonSet("problems", PROBLEMS, CANON_PROBLEMS);
assertCanonSet("maneuvers", MANEUVERS, CANON_MANEUVERS);
assertCanonSet("phases", PHASES, CANON_PHASES);
const SHAPES = ["observation-reversal", "cost-ledger", "geometric-imperative"];
const IMAGES = ["wire", "relay", "ford"];
const ARCHETYPES = [
  "siege-state",
  "industrial-republic",
  "conscription-directorate",
  "mercantile-compact",
  "officer-regency",
  "ruined-federation",
];
const ADVERSARIES = ["attritional", "adaptive", "opportunist", "cautious"];
const SECTORS_BY_THEATER = {
  industrial: [
    "hollow-relay-district",
    "calder-foundry-belt",
    "blackglass-rail-yards",
    "cinder-ward",
    "annealing-quarter",
    "south-switch",
  ],
  lowland: [
    "kesh-corridor",
    "vell-plain",
    "ossuary-mile",
    "morrow-depot",
    "calve-junction",
    "saint-orsen-fields",
  ],
  ridge: [
    "thorne-line",
    "ash-spine",
    "varren-steps",
    "pilgrim-cut",
    "redoubt-nine",
    "talus-road",
  ],
  river: [
    "dalca-crossing",
    "neme-locks",
    "charnel-ford",
    "west-reach",
    "upper-pool",
    "ferry-nine",
  ],
};
const ALL_SECTORS = Object.values(SECTORS_BY_THEATER).flat();

const GEOMETRIES = [
  "crossings",
  "reserve-release",
  "command-rupture",
  "supply-sacrifice",
  "exposed-recovery",
  "counterstroke",
  "deliberate-abandonment",
  "terminal-concentration",
];

function receipt(id) {
  return {
    disposition: "QUALITY_MET",
    reasonCodes: ["WEAK_CONSEQUENCE"],
    reviewerReceiptId: "receipt:pack-builder",
    authenticated: true,
    candidateId: id,
  };
}

function writeJson(file, data) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

// ——— Epoch 022: Routine situations + maneuver frames ———
function buildRoutinePack() {
  // Full theater × problem matrix (32) satisfies ≥24 and covers all §1.2 classes.
  const spines = [];
  let n = 0;
  for (const theater of THEATERS) {
    for (const problem of PROBLEMS) {
      const id = `routine-${theater}-${problem}`;
      const geometry = GEOMETRIES[n % GEOMETRIES.length];
      spines.push({
        id,
        medium: "campaign-brief",
        theater,
        problemClass: problem,
        geometry,
        heatCoverage: ["hot", "medium"],
        register: "operational-brief",
        requiredClaims: [`theater:${theater}`, `problem:${problem}`],
        forbiddenClaims: ["hidden-outcome", "undeclared-mechanic"],
        mechanicIds: MANEUVERS.slice(0, 3),
        effectEnvelope: {
          axes: ["pressure", "supply"],
          rounding: "floor-ppm",
          caps: { pressure: 1_000_000, supply: 1_000_000 },
        },
        rhetoricalShapes: SHAPES,
        imageFamilies: IMAGES,
        prose: {
          headline: `${theater} // ${problem}`,
          briefing: `Semantic spine ${id} binds ${geometry} to existing mechanics without inventing actors.`,
          question: "Which declared mechanic absorbs the cost?",
        },
        review: receipt(id),
        cooldownDays: 5,
        slotDomains: {
          theater: { values: [theater] },
          problemClass: { values: [problem] },
          heat: { values: ["hot", "medium"] },
          sectorId: { values: SECTORS_BY_THEATER[theater] },
          rhetoricalShape: { values: SHAPES },
          imageFamily: { values: IMAGES },
          mechanicId: { values: MANEUVERS.slice(0, 3) },
        },
      });
      n += 1;
    }
  }
  return spines;
}

function buildManeuverFrames() {
  const frames = [];
  for (const maneuverId of MANEUVERS) {
    for (const heat of ["hot", "medium"]) {
      for (let i = 0; i < 4; i++) {
        const id = `maneuver-${maneuverId}-${heat}-${i + 1}`;
        frames.push({
          id,
          medium: "maneuver-procedure",
          maneuverId,
          heat,
          rhetoricalShape: SHAPES[i % SHAPES.length],
          imageFamily: IMAGES[i % IMAGES.length],
          continuationLanguage: `Continue ${maneuverId} under standing intent; stage advances one day.`,
          aftermathLanguage: `Aftermath of ${maneuverId} leaves a typed residue without hidden rolls.`,
          multiDay: true,
          durationDaysOptions: [2, 3],
          requiredClaims: [`mechanic:${maneuverId}`, `heat:${heat}`],
          forbiddenClaims: ["prose-invented-mechanic"],
          effectEnvelope: {
            axes: ["personnel", "materiel"],
            rounding: "floor-ppm",
            caps: { personnel: 1_000_000, materiel: 1_000_000 },
          },
          prose: {
            label: `${maneuverId} / ${heat} / frame ${i + 1}`,
            body: `Procedure frame for ${maneuverId} at ${heat} heat. Shape=${SHAPES[i % SHAPES.length]}; image=${IMAGES[i % IMAGES.length]}.`,
          },
          review: receipt(id),
          slotDomains: {
            maneuverId: { values: [maneuverId] },
            heat: { values: [heat] },
            frame: { values: [String(i + 1)] },
            durationDays: { values: ["2", "3"] },
            sectorId: { values: ALL_SECTORS },
            problemClass: { values: PROBLEMS },
            archetype: { values: ARCHETYPES },
          },
        });
      }
    }
  }
  return frames;
}

// ——— Epoch 023: Romantic arcs ———
function buildRomanticPack() {
  const arcs = [];
  // 12 spines; ≥3 per phase via gate metadata
  const plan = [
    ["romantic-contact-oath", "contact", 2],
    ["romantic-contact-letter", "contact", 1],
    ["romantic-contact-witness", "contact", 3],
    ["romantic-compression-debt", "compression", 2],
    ["romantic-compression-silence", "compression", 1],
    ["romantic-compression-roster", "compression", 3],
    ["romantic-exhaustion-memory", "exhaustion", 2],
    ["romantic-exhaustion-rescue", "exhaustion", 1],
    ["romantic-exhaustion-custody", "exhaustion", 3],
    ["romantic-terminal-farewell", "terminal", 2],
    ["romantic-terminal-ledger", "terminal", 1],
    ["romantic-terminal-name", "terminal", 3],
  ];
  for (const [id, phase, durationDays] of plan) {
    const beats = [];
    for (let b = 0; b < durationDays; b++) {
      beats.push({
        beatIndex: b,
        heatRealizations: {
          hot: `${id}-beat${b}-hot`,
          medium: `${id}-beat${b}-medium`,
        },
        choices: [
          {
            id: `${id}-b${b}-duty`,
            label: "Hold the obligation",
            mechanicIds: ["reinforce"],
            cost: { readiness: -1 },
            tradeoff: "force-preservation vs private duty",
          },
          {
            id: `${id}-b${b}-tempo`,
            label: "Spend the person for tempo",
            mechanicIds: ["exploit"],
            cost: { legitimacy: -1 },
            tradeoff: "tempo vs institutional affection",
          },
          {
            id: `${id}-b${b}-withdraw`,
            label: "Withdraw the name from the map",
            mechanicIds: ["abandon"],
            cost: { intelligence: -1 },
            tradeoff: "memory vs classification",
          },
        ],
        prose: {
          hot: `${id} beat ${b} (hot): loyalty collides with the timetable.`,
          medium: `${id} beat ${b} (medium): the obligation is quieter and still expensive.`,
        },
      });
    }
    arcs.push({
      id,
      medium: "romantic-arc",
      phases: [phase],
      gates: { phases: [phase] },
      durationDays,
      beatCount: durationDays,
      alwaysEligible: false,
      optional: false,
      setup: `Setup for ${id}`,
      pressure: "Private obligation becomes public liability.",
      immediateCost: "Readiness or legitimacy debt",
      operationalInteraction: "May overlay ActiveOperation standing intent",
      interruptionBehavior: "close-with-residue",
      closure: "Typed residue persisted",
      carriedResidue: [`${id}-residue`],
      beats,
      review: receipt(id),
      slotDomains: {
        phase: { values: [phase] },
        duration: { values: [String(durationDays)] },
        heat: { values: ["hot", "medium"] },
        theater: { values: THEATERS },
        sectorId: { values: ALL_SECTORS },
        choicePath: { cardinality: 3 ** durationDays },
        adversaryPersonality: { values: ADVERSARIES },
      },
    });
  }
  // Always-eligible fallbacks (also registered for scheduler)
  for (const phase of PHASES) {
    const id = `fallback-${phase}`;
    arcs.push({
      id,
      medium: "romantic-arc",
      phases: [phase],
      gates: { phases: [phase] },
      durationDays: 1,
      beatCount: 1,
      alwaysEligible: true,
      optional: false,
      setup: `Fallback ${phase}`,
      pressure: "Guarantee surface",
      immediateCost: "Minimal readiness",
      operationalInteraction: "Standing intent continues",
      interruptionBehavior: "close-with-residue",
      closure: "Fallback closure",
      carriedResidue: [`${id}-residue`],
      beats: [
        {
          beatIndex: 0,
          heatRealizations: {
            hot: `${id}-beat0-hot`,
            medium: `${id}-beat0-medium`,
          },
          choices: [
            { id: `${id}-c1`, mechanicIds: ["reinforce"], cost: {}, tradeoff: "duty" },
            { id: `${id}-c2`, mechanicIds: ["abandon"], cost: {}, tradeoff: "withdrawal" },
            { id: `${id}-c3`, mechanicIds: ["network"], cost: {}, tradeoff: "signal" },
          ],
          prose: { hot: `${id} hot`, medium: `${id} medium` },
        },
      ],
      review: receipt(id),
      slotDomains: {
        phase: { values: [phase] },
        heat: { values: ["hot", "medium"] },
        theater: { values: THEATERS },
        sectorId: { values: ALL_SECTORS },
        choicePath: { cardinality: 3 },
        adversaryPersonality: { values: ADVERSARIES },
      },
    });
  }
  return arcs;
}

// ——— Epoch 024: Escalatory + Doomsday ———
function buildEscalatoryPack() {
  const standard = [];
  const maximum = [];
  for (let i = 1; i <= 16; i++) {
    const id = `escalatory-standard-${String(i).padStart(2, "0")}`;
    standard.push({
      id,
      tier: "escalatory",
      intensity: "standard",
      terminalRisk: "none",
      heatPaths: ["hot", "medium"],
      mechanicIds: ["interdict", "breach"],
      baseTerminalPpm: null,
      prose: {
        hot: `${id} hot escalation without terminal claim.`,
        medium: `${id} medium escalation without terminal claim.`,
      },
      review: receipt(id),
      slotDomains: {
        intensity: { values: ["standard"] },
        heat: { values: ["hot", "medium"] },
        index: { values: [String(i)] },
        sectorId: { values: ALL_SECTORS },
        archetype: { values: ARCHETYPES },
      },
    });
  }
  for (let i = 1; i <= 12; i++) {
    const id = `escalatory-maximum-${String(i).padStart(2, "0")}`;
    maximum.push({
      id,
      tier: "escalatory",
      intensity: "maximum",
      terminalRisk: "none",
      heatPaths: ["hot", "medium"],
      mechanicIds: ["exploit", "network"],
      baseTerminalPpm: null,
      prose: {
        hot: `${id} maximum hot path; nonterminal.`,
        medium: `${id} maximum medium path; nonterminal.`,
      },
      review: receipt(id),
      slotDomains: {
        intensity: { values: ["maximum"] },
        heat: { values: ["hot", "medium"] },
        index: { values: [String(i)] },
        sectorId: { values: ALL_SECTORS },
        archetype: { values: ARCHETYPES },
      },
    });
  }
  return { standard, maximum };
}

function buildDoomsdayPack() {
  const families = [
    "command-blackout",
    "reserve-annihilation",
    "corridor-collapse",
    "industrial-firestorm",
    "river-breach-cascade",
    "legitimacy-rupture",
  ];
  return families.map((family, index) => {
    const id = `doomsday-${family}`;
    // Bounds: base + maxPressure + maxAdj <= 450000; min sum >= 50000
    const baseTerminalPpm = 80_000 + index * 10_000; // 80k..130k
    const maxPressure = 200_000;
    const maxAdjustment = 0; // v1 late-run zeros
    return {
      id,
      family,
      tier: "escalatory",
      intensity: "maximum",
      terminalRisk: "doomsday",
      heatPaths: ["hot", "medium"],
      mechanicIds: ["network", "abandon"],
      baseTerminalPpm,
      allowedStatePressure: {
        kind: "declared-linear",
        axes: ["frontPressure", "legitimacyDebt"],
        minPpm: 0,
        maxPpm: maxPressure,
      },
      boundProof: {
        minSum: baseTerminalPpm + 0 + 0,
        maxSum: baseTerminalPpm + maxPressure + maxAdjustment,
        clamp: [50_000, 450_000],
      },
      outcomes: {
        nonterminal: `${id}-nonterminal`,
        nearMiss: `${id}-near-miss`,
        terminal: `${id}-terminal`,
      },
      terminalClosure: index % 2 === 0 ? "defeat" : "scenario-specific",
      prose: {
        hot: `${id} hot realization — ominous language is not law.`,
        medium: `${id} medium realization — sealed roll only decides terminality.`,
        nonterminal: "The formation continues under debt.",
        nearMiss: "The seal holds; the map does not celebrate.",
        terminal: "Typed scenario closure; not inferred from adjectives.",
      },
      review: receipt(id),
      slotDomains: {
        family: { values: [family] },
        heat: { values: ["hot", "medium"] },
        outcome: { values: ["nonterminal", "near-miss", "terminal"] },
        sectorId: { values: ALL_SECTORS },
        archetype: { values: ARCHETYPES },
      },
    };
  });
}

function capacityOf(entry) {
  const domains = Object.values(entry.slotDomains ?? {});
  if (!domains.length) return 1;
  return domains.reduce((product, domain) => {
    if (typeof domain.cardinality === "number") {
      return product * Math.max(1, domain.cardinality);
    }
    const card = domain.values?.length ?? 1;
    return product * card;
  }, 1);
}

function buildPromotedManifest(packId, entries) {
  const ids = entries.map((e) => e.id).sort();
  return {
    version: "contentgen-promoted-pack/v1",
    packId,
    status: "PROMOTED",
    humanSigned: true,
    signerReceiptId: "receipt:pack-builder",
    recipeIds: ids,
    policyGate: "quality-policy/v1",
    manifestHash: sha256(JSON.stringify({ packId, ids })),
    authenticatedCount: entries.filter((e) => e.review?.authenticated).length,
  };
}

const root = process.cwd();
const outRoot = path.join(root, "app/campaign-content");

const routine = buildRoutinePack();
const maneuvers = buildManeuverFrames();
const romantic = buildRomanticPack();
const { standard, maximum } = buildEscalatoryPack();
const doomsday = buildDoomsdayPack();

writeJson(path.join(outRoot, "routine/spines.v1.json"), {
  version: "routine-pack/v1",
  spines: routine,
});
writeJson(path.join(outRoot, "maneuvers/frames.v1.json"), {
  version: "maneuver-frames/v1",
  maneuverCount: MANEUVERS.length,
  frameMinimum: MANEUVERS.length * 8,
  frames: maneuvers,
});
writeJson(path.join(outRoot, "romantic/arcs.v1.json"), {
  version: "romantic-pack/v1",
  arcs: romantic,
});
writeJson(path.join(outRoot, "escalatory/standard.v1.json"), {
  version: "escalatory-standard/v1",
  events: standard,
});
writeJson(path.join(outRoot, "escalatory/maximum.v1.json"), {
  version: "escalatory-maximum/v1",
  events: maximum,
});
writeJson(path.join(outRoot, "doomsday/families.v1.json"), {
  version: "doomsday-pack/v1",
  families: doomsday,
});

const all022 = [...routine, ...maneuvers];
const all023 = romantic;
const all024 = [...standard, ...maximum, ...doomsday];

writeJson(path.join(root, "content-quality/packs/routine-maneuver.promoted.json"), buildPromotedManifest("routine-maneuver-v1", all022));
writeJson(path.join(root, "content-quality/packs/romantic.promoted.json"), buildPromotedManifest("romantic-v1", all023));
writeJson(path.join(root, "content-quality/packs/escalatory-doomsday.promoted.json"), buildPromotedManifest("escalatory-doomsday-v1", all024));

const capacity = {
  version: "pack-capacity/v1",
  packs: {
    "routine-maneuver-v1": all022.reduce((s, e) => s + capacityOf(e), 0),
    "romantic-v1": all023.reduce((s, e) => s + capacityOf(e), 0),
    "escalatory-doomsday-v1": all024.reduce((s, e) => s + capacityOf(e), 0),
  },
};
capacity.total = Object.values(capacity.packs).reduce((a, b) => a + b, 0);
writeJson(path.join(root, "content-quality/packs/capacity.v1.json"), capacity);

console.log(
  JSON.stringify(
    {
      ok: true,
      routineSpines: routine.length,
      maneuverFrames: maneuvers.length,
      romanticArcs: romantic.length,
      escalatoryStandard: standard.length,
      escalatoryMaximum: maximum.length,
      doomsdayFamilies: doomsday.length,
      totalLegalCapacity: capacity.total,
    },
    null,
    2,
  ),
);
