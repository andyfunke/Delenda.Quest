import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  CONTENTGEN_CONTRACT_VERSION,
  TICKET_GRAMMARS,
  canonicalJson,
  identityCanonicalJson,
  validateGrammarRecipe,
} from "../../contentgen-contracts/src/index.ts";
import { codepointSort, loadInventory } from "./inventory.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

const sha256 = (text) =>
  crypto.createHash("sha256").update(String(text).normalize("NFC"), "utf8").digest("hex");

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

function sourceHash(rel) {
  return { path: rel, sha256: sha256(read(rel)) };
}

function parseQuotedIds(source, pattern) {
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

function avaRecipes(seedTicket) {
  const source = read("app/ava/relevance-engine.ts");
  const rows = [
    ...source.matchAll(
      /\{ id: "([^"]+)", chord: "([^"]+)", line: "((?:\\.|[^"\\])*)"/g,
    ),
  ].map((match) => ({
    id: match[1],
    chord: match[2],
    line: match[3].replaceAll("\\'", "'").replaceAll('\\"', '"'),
  }));
  return codepointSort(rows, (row) => row.id).map((row) => {
    const recipe = {
      contractVersion: CONTENTGEN_CONTRACT_VERSION,
      id: `ava.${row.id}`,
      version: "1.0.0",
      medium: "ava",
      chord: {
        tensionId: row.chord,
        intentClass: "inspect",
        actorRoles: ["ava", "commander"],
        temporalShape: "instant",
        pressureShape: "exposure",
        evidenceShape: "declared",
        consequenceShape: "cost",
      },
      spineId: row.chord,
      mechanicRefs: [],
      slots: [{ id: "line", valueType: "string", required: true }],
      requiredClaims: ["disclosed-only"],
      forbiddenClaims: ["hidden-outcome"],
      registerProfileId: "ava-cold",
      equivalenceClasses: [
        {
          id: "line-fixed",
          slotId: "line",
          representatives: [row.line],
          cardinality: 1,
        },
      ],
      projection: {
        medium: "ava",
        intentLowering: "REPORT",
        clarificationSafety: true,
        actionReadSeparation: true,
        forbiddenIntentOwnership: true,
      },
    };
    return {
      recipe,
      text: row.line,
      representativeBindings: { line: row.line },
      semanticPlan: { realizationId: row.id, chord: row.chord },
      seedTicket,
    };
  });
}

function situationRecipes(mediumOwner, pattern, productionPrefix, seedTicket) {
  const source = read(mediumOwner);
  const ids = codepointSort([...new Set(parseQuotedIds(source, pattern))]);
  return ids.map((situationId) => {
    const recipe = {
      contractVersion: CONTENTGEN_CONTRACT_VERSION,
      id: `${productionPrefix}.${situationId}`,
      version: "1.0.0",
      medium: "campaign-brief",
      chord: {
        tensionId: "situation-pressure",
        intentClass: "decide",
        actorRoles: ["commander"],
        temporalShape: "instant",
        pressureShape: "scarcity",
        evidenceShape: "observed",
        consequenceShape: "cost",
      },
      spineId: situationId,
      mechanicRefs: ["reinforce", "abandon"],
      slots: [{ id: "situationId", valueType: "string", required: true }],
      requiredClaims: ["situation-bound"],
      forbiddenClaims: ["hidden-enemy-intent"],
      registerProfileId: "campaign-doctrinal",
      equivalenceClasses: [
        {
          id: "situation-fixed",
          slotId: "situationId",
          representatives: [situationId],
          cardinality: 1,
        },
      ],
      projection: {
        medium: "campaign-brief",
        theaterId: "lowland",
        problemClass: "force-preservation",
        phaseId: "contact",
        situationTemplateId: situationId,
      },
    };
    return {
      recipe,
      text: `Situation template ${situationId}`,
      representativeBindings: { situationId },
      semanticPlan: { situationId, owner: mediumOwner },
      seedTicket,
    };
  });
}

function maneuverRecipes(seedTicket) {
  const mechanics = [
    "abandon",
    "breach",
    "exploit",
    "interdict",
    "network",
    "reinforce",
    "route",
  ];
  return mechanics.map((mechanicId) => {
    const recipe = {
      contractVersion: CONTENTGEN_CONTRACT_VERSION,
      id: `maneuver.${mechanicId}.frame`,
      version: "1.0.0",
      medium: "maneuver-procedure",
      chord: {
        tensionId: "operational-geometry",
        intentClass: "decide",
        actorRoles: ["commander", "staff"],
        temporalShape: "continuation",
        pressureShape: "irreversibility",
        evidenceShape: "estimated",
        consequenceShape: "exchange",
      },
      spineId: mechanicId,
      mechanicRefs: [mechanicId],
      slots: [
        {
          id: "mechanicId",
          valueType: "enum",
          enumValues: mechanics,
          required: true,
        },
      ],
      requiredClaims: ["mechanic-bound"],
      forbiddenClaims: ["invented-mechanic"],
      registerProfileId: "campaign-doctrinal",
      equivalenceClasses: [
        {
          id: "mechanic-fixed",
          slotId: "mechanicId",
          representatives: [mechanicId],
          cardinality: 1,
        },
      ],
      projection: {
        medium: "maneuver-procedure",
        mechanicId,
        heat: "hot",
        realizationId: `${mechanicId}-base`,
      },
    };
    return {
      recipe,
      text: `Manoeuvre procedure frame for ${mechanicId}`,
      representativeBindings: { mechanicId },
      semanticPlan: { mechanicId },
      seedTicket,
    };
  });
}

function subMissionRecipes(seedTicket) {
  const source = read("app/sub-mission-content.ts");
  const ids = codepointSort([
    ...new Set(parseQuotedIds(source, /id:\s*"([a-z0-9-]+)"/g)),
  ]).slice(0, 32);
  return ids.map((frameId) => {
    const recipe = {
      contractVersion: CONTENTGEN_CONTRACT_VERSION,
      id: `submission.${frameId}`,
      version: "1.0.0",
      medium: "romantic-arc",
      chord: {
        tensionId: "obligation",
        intentClass: "witness",
        actorRoles: ["commander", "civilian"],
        temporalShape: "delay",
        pressureShape: "obligation",
        evidenceShape: "declared",
        consequenceShape: "residue",
      },
      spineId: frameId,
      mechanicRefs: [],
      slots: [{ id: "frameId", valueType: "string", required: true }],
      requiredClaims: ["secondary-front"],
      forbiddenClaims: ["main-thread-mutation"],
      registerProfileId: "campaign-doctrinal",
      equivalenceClasses: [
        {
          id: "frame-fixed",
          slotId: "frameId",
          representatives: [frameId],
          cardinality: 1,
        },
      ],
      projection: {
        medium: "romantic-arc",
        arcId: frameId,
        beatIndex: 0,
        durationDays: 1,
      },
    };
    return {
      recipe,
      text: `Sub-mission frame ${frameId}`,
      representativeBindings: { frameId },
      semanticPlan: { frameId },
      seedTicket,
    };
  });
}

function reportRecipes(seedTicket) {
  const tones = ["grim", "measured", "severe"];
  return tones.map((tone) => {
    const recipe = {
      contractVersion: CONTENTGEN_CONTRACT_VERSION,
      id: `report.war-dispatch.${tone}`,
      version: "1.0.0",
      medium: "execution-scene",
      chord: {
        tensionId: "aftermath",
        intentClass: "witness",
        actorRoles: ["staff"],
        temporalShape: "closure",
        pressureShape: "exposure",
        evidenceShape: "observed",
        consequenceShape: "residue",
      },
      spineId: "war-dispatch",
      mechanicRefs: [],
      slots: [
        { id: "tone", valueType: "enum", enumValues: tones, required: true },
      ],
      requiredClaims: ["morning-report"],
      forbiddenClaims: ["sealed-roll"],
      registerProfileId: "campaign-doctrinal",
      equivalenceClasses: [
        {
          id: "tone-class",
          slotId: "tone",
          representatives: tones,
          cardinality: tones.length,
        },
      ],
      projection: {
        medium: "execution-scene",
        resolvedDay: 1,
        tier: "routine",
        heat: "medium",
      },
    };
    return {
      recipe,
      text: `War dispatch tone ${tone}`,
      representativeBindings: { tone },
      semanticPlan: { tone, owner: "app/war-dispatch.ts" },
      seedTicket,
    };
  });
}

function resolutionRecipes(seedTicket) {
  const recipe = {
    contractVersion: CONTENTGEN_CONTRACT_VERSION,
    id: "resolution.record.v1",
    version: "1.0.0",
    medium: "execution-scene",
    chord: {
      tensionId: "day-close",
      intentClass: "witness",
      actorRoles: ["authority"],
      temporalShape: "closure",
      pressureShape: "irreversibility",
      evidenceShape: "declared",
      consequenceShape: "terminal-risk",
    },
    spineId: "daily-resolution",
    mechanicRefs: [],
    slots: [
      {
        id: "schemaVersion",
        valueType: "enum",
        enumValues: ["1"],
        required: true,
      },
    ],
    requiredClaims: ["resolution-history"],
    forbiddenClaims: ["client-owned-outcome"],
    registerProfileId: "campaign-doctrinal",
    equivalenceClasses: [
      {
        id: "schema-fixed",
        slotId: "schemaVersion",
        representatives: [1],
        cardinality: 1,
      },
    ],
    projection: {
      medium: "execution-scene",
      resolvedDay: 1,
      tier: "routine",
      heat: "hot",
    },
  };
  return [
    {
      recipe,
      text: "DailyResolutionRecord schemaVersion 1",
      representativeBindings: { schemaVersion: 1 },
      semanticPlan: { schemaVersion: 1, owner: "app/game.ts" },
      seedTicket,
    },
  ];
}

const ADAPTERS = {
  "ava-relevance": avaRecipes,
  "legacy-situations": (ticket) =>
    situationRecipes(
      "app/game.ts",
      /id:\s*"([a-z0-9-]+)".*theater:/g,
      "legacy",
      ticket,
    ),
  "generic-situations": (ticket) =>
    situationRecipes(
      "app/campaign-substrate.ts",
      /id:\s*"([a-z0-9-]+)".*theater:/g,
      "generic",
      ticket,
    ),
  "maneuver-presentations": maneuverRecipes,
  "sub-mission-frames": subMissionRecipes,
  "war-dispatch": reportRecipes,
  "resolution-record": resolutionRecipes,
};

function capacityFor(recipe) {
  const raw = recipe.equivalenceClasses.reduce(
    (product, cls) => product * Math.max(1, cls.cardinality),
    1,
  );
  return { rawCapacity: raw, legalCapacity: raw };
}

export function enumerate({ globalSeed = 1, inventoryPath } = {}) {
  const inventory = loadInventory(inventoryPath);
  const media = codepointSort([
    ...new Set(inventory.productions.map((item) => item.medium)),
  ]);
  const sourceHashes = codepointSort(
    [
      ...new Set(inventory.productions.map((item) => item.owner)),
      "content-quality/inventory/production-inventory.v1.json",
    ].map(sourceHash),
    (row) => row.path,
  );

  const candidates = [];
  const failures = [];

  for (const medium of media) {
    const productions = codepointSort(
      inventory.productions.filter((item) => item.medium === medium),
      (item) => item.id,
    );
    for (const production of productions) {
      const localSeed = TICKET_GRAMMARS.enumerationLocalSeed(
        globalSeed,
        medium,
        production.id,
      );
      const adapter = ADAPTERS[production.adapter];
      if (!adapter) {
        failures.push({
          productionId: production.id,
          medium,
          reason: "MISSING_ADAPTER",
          localSeed,
        });
        continue;
      }
      const emitted = adapter(localSeed);
      for (const item of emitted) {
        const issues = validateGrammarRecipe(item.recipe);
        if (issues.length) {
          failures.push({
            productionId: production.id,
            medium,
            recipeId: item.recipe.id,
            reason: "SCHEMA_INVALID",
            issues,
            localSeed,
          });
          continue;
        }
        const candidate = {
          candidateId: sha256(
            identityCanonicalJson({
              recipeId: item.recipe.id,
              bindings: item.representativeBindings,
              localSeed,
            }),
          ).slice(0, 32),
          recipe: item.recipe,
          representativeBindings: item.representativeBindings,
          semanticPlan: item.semanticPlan,
          text: item.text,
          provenance: {
            productionId: production.id,
            globalSeed,
            localSeedTicket: localSeed,
            sourceVersion: inventory.version,
            sourceHashes: sourceHashes.map((row) => row.sha256),
            contractVersion: CONTENTGEN_CONTRACT_VERSION,
          },
          parentCandidateId: null,
        };
        const reps = item.recipe.equivalenceClasses.flatMap((cls) =>
          cls.representatives.map(String),
        );
        if (!reps.length) {
          failures.push({
            productionId: production.id,
            medium,
            recipeId: item.recipe.id,
            reason: "UNATTESTED_BINDING",
            localSeed,
          });
          continue;
        }
        candidates.push({
          ...candidate,
          capacity: capacityFor(item.recipe),
        });
      }
    }
  }

  const sorted = codepointSort(candidates, (row) =>
    [
      row.recipe.medium,
      row.provenance.productionId,
      row.recipe.id,
      row.candidateId,
    ].join("|"),
  );
  const sortedFailures = codepointSort(failures, (row) =>
    [row.medium, row.productionId, row.recipeId || "", row.reason].join("|"),
  );

  const packCapacity = sorted.reduce(
    (sum, row) => sum + row.capacity.legalCapacity,
    0,
  );

  const manifest = {
    version: "contentgen-enumerate/v1",
    contractVersion: CONTENTGEN_CONTRACT_VERSION,
    globalSeed,
    sourceHashes,
    productionIds: codepointSort([
      ...new Set(sorted.map((row) => row.provenance.productionId)),
    ]),
    candidateCount: sorted.length,
    failureCount: sortedFailures.length,
    packCapacity,
    generatedAt: new Date().toISOString(),
  };

  return {
    manifest,
    identityManifest: {
      ...manifest,
      generatedAt: undefined,
    },
    candidates: sorted,
    failures: sortedFailures,
    identityHash: sha256(identityCanonicalJson(manifest)),
  };
}

export function writeEnumeration(outDir, result) {
  fs.mkdirSync(outDir, { recursive: true });
  const writeJsonl = (name, rows) => {
    const body = rows.map((row) => canonicalJson(row)).join("\n") + (rows.length ? "\n" : "");
    fs.writeFileSync(path.join(outDir, name), body);
  };
  writeJsonl("candidates.jsonl", result.candidates);
  writeJsonl("failures.jsonl", result.failures);
  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    `${canonicalJson(result.manifest)}\n`,
  );
  fs.writeFileSync(
    path.join(outDir, "capacity.json"),
    `${canonicalJson({
      packCapacity: result.manifest.packCapacity,
      candidateCount: result.manifest.candidateCount,
      byMedium: Object.fromEntries(
        codepointSort([
          ...new Set(result.candidates.map((row) => row.recipe.medium)),
        ]).map((medium) => [
          medium,
          result.candidates
            .filter((row) => row.recipe.medium === medium)
            .reduce((sum, row) => sum + row.capacity.legalCapacity, 0),
        ]),
      ),
    })}\n`,
  );
  fs.writeFileSync(
    path.join(outDir, "identity-hash.txt"),
    `${result.identityHash}\n`,
  );
  return result;
}
