/**
 * Deterministic grouped L2-logistic trainer (§4.5 config only).
 */

import { createHash } from "node:crypto";
import { buildFeatureVector, featureOrderFor, groupKeyFor } from "./features.mjs";
import { stableHash } from "./hash.mjs";
import { minePrismProposals } from "./prism-mine.mjs";

export const TRAINER_CONFIG_V1 = {
  version: "trainer-config/v1",
  featureOrder: "codepoint-ascending-feature-ids",
  weightInitialization: "zeros",
  iterations: 500,
  learningRate: { numerator: 0.2, denominatorBase: 1, denominatorSlope: 0.01 },
  l2PenaltyLambda: 1e-4,
  groupKey: "recipeLineage|chordFamily|productionFamily",
  split: { train: 0.7, calibration: 0.15, heldOut: 0.15 },
  trainOrder: "codepoint-ascending-candidate-ids",
  arithmetic: "ieee754-doubles-stream-order",
};

const sha256 = (value) =>
  createHash("sha256").update(String(value).normalize("NFC"), "utf8").digest("hex");

function sigmoid(x) {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function lr(t) {
  return TRAINER_CONFIG_V1.learningRate.numerator /
    (TRAINER_CONFIG_V1.learningRate.denominatorBase +
      TRAINER_CONFIG_V1.learningRate.denominatorSlope * t);
}

export function splitGroups(groupKeys, corpusVersion) {
  const ranked = [...new Set(groupKeys)]
    .map((key) => ({
      key,
      rank: stableHash(`${corpusVersion}:group-split:${key}`),
    }))
    .sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key));
  const n = ranked.length;
  const trainEnd = Math.floor(n * TRAINER_CONFIG_V1.split.train);
  const calEnd = trainEnd + Math.floor(n * TRAINER_CONFIG_V1.split.calibration);
  const train = new Set(ranked.slice(0, trainEnd).map((row) => row.key));
  const calibration = new Set(ranked.slice(trainEnd, calEnd).map((row) => row.key));
  const heldOut = new Set(ranked.slice(calEnd).map((row) => row.key));
  // Ensure non-empty partitions on tiny corpora by spilling from train.
  if (!calibration.size && train.size > 1) {
    const move = [...train].sort()[0];
    train.delete(move);
    calibration.add(move);
  }
  if (!heldOut.size && train.size > 1) {
    const move = [...train].sort().at(-1);
    train.delete(move);
    heldOut.add(move);
  }
  return { train, calibration, heldOut };
}

export function trainPolicy(rows, options = {}) {
  const medium = options.medium ?? "ava";
  const corpusVersion = options.corpusVersion ?? "training/v1";
  for (const row of rows) {
    if (row.label !== "approved" && row.label !== "rejected") {
      throw new Error("UNAUTHENTICATED_LABEL");
    }
  }

  const prepared = rows.map((row) => {
    const features = buildFeatureVector(row, medium);
    return {
      id: row.id,
      label: row.label === "approved" ? 1 : 0,
      groupKey: groupKeyFor(row),
      medium,
      values: features.values,
      featureIds: features.featureIds,
      failureClass: row.failureClass ?? null,
      discretePredicates: row.discretePredicates ?? derivePredicates(row),
      sessionId: row.sessionId ?? "session-default",
    };
  });

  const groups = splitGroups(
    prepared.map((row) => row.groupKey),
    corpusVersion,
  );
  const trainRows = prepared
    .filter((row) => groups.train.has(row.groupKey))
    .sort((a, b) => a.id.localeCompare(b.id));
  const calibrationRows = prepared.filter((row) =>
    groups.calibration.has(row.groupKey),
  );
  const heldOutRows = prepared.filter((row) => groups.heldOut.has(row.groupKey));

  if (!trainRows.length) throw new Error("EMPTY_TRAIN_SPLIT");

  // Normalize on train only.
  const dim = featureOrderFor(medium).length;
  const means = Array(dim).fill(0);
  for (const row of trainRows) {
    for (let i = 0; i < dim; i++) means[i] += row.values[i];
  }
  for (let i = 0; i < dim; i++) means[i] /= trainRows.length;
  const variances = Array(dim).fill(0);
  for (const row of trainRows) {
    for (let i = 0; i < dim; i++) {
      const d = row.values[i] - means[i];
      variances[i] += d * d;
    }
  }
  for (let i = 0; i < dim; i++) {
    variances[i] = Math.sqrt(variances[i] / trainRows.length) || 1;
  }
  const normalize = (values) =>
    values.map((value, i) => (value - means[i]) / variances[i]);

  const weights = Array(dim).fill(0);
  let intercept = 0;
  const lambda = TRAINER_CONFIG_V1.l2PenaltyLambda;

  for (let t = 1; t <= TRAINER_CONFIG_V1.iterations; t++) {
    const step = lr(t);
    for (const row of trainRows) {
      const x = normalize(row.values);
      let logit = intercept;
      for (let i = 0; i < dim; i++) logit += weights[i] * x[i];
      const p = sigmoid(logit);
      const err = p - row.label;
      intercept -= step * err;
      for (let i = 0; i < dim; i++) {
        weights[i] -= step * (err * x[i] + lambda * weights[i]);
      }
    }
  }

  const threshold = calibrateThreshold(calibrationRows, weights, intercept, normalize);

  const featureIds = featureOrderFor(medium);
  const policy = {
    version: "contentgen-policy-candidate/v1",
    medium,
    corpusVersion,
    config: TRAINER_CONFIG_V1,
    configHash: sha256(JSON.stringify(TRAINER_CONFIG_V1)),
    featureIds,
    means,
    variances,
    intercept,
    weights,
    thresholds: { [medium]: threshold },
    splitCounts: {
      train: trainRows.length,
      calibration: calibrationRows.length,
      heldOut: heldOutRows.length,
      groups: {
        train: groups.train.size,
        calibration: groups.calibration.size,
        heldOut: groups.heldOut.size,
      },
    },
  };
  policy.policyHash = sha256(
    JSON.stringify({
      config: policy.config,
      corpusVersion,
      featureIds,
      weights,
      intercept,
      means,
      variances,
      thresholds: policy.thresholds,
    }),
  );

  const heldOutExport = heldOutRows.map((row) => ({
    id: row.id,
    label: row.label,
    medium: row.medium,
    values: row.values,
    groupKey: row.groupKey,
  }));

  const failures = prepared.filter(
    (row) => row.label === 0 && row.failureClass,
  );
  const proposals = minePrismProposals(failures, {
    approvedCanaryIds: options.approvedCanaryIds ?? [],
  });

  return {
    policy,
    heldOut: heldOutExport,
    proposals,
    receipt: {
      configHash: policy.configHash,
      policyHash: policy.policyHash,
      corpusVersion,
      rowCount: rows.length,
      iterations: TRAINER_CONFIG_V1.iterations,
    },
  };
}

function calibrateThreshold(rows, weights, intercept, normalize) {
  if (!rows.length) return 0.5;
  const scored = rows.map((row) => {
    const x = normalize(row.values);
    let logit = intercept;
    for (let i = 0; i < weights.length; i++) logit += weights[i] * x[i];
    return { p: sigmoid(logit), label: row.label };
  });
  let best = { t: 0.5, j: -Infinity };
  for (let t = 0.05; t <= 0.95; t += 0.01) {
    let tp = 0,
      fn = 0,
      tn = 0,
      fp = 0;
    for (const row of scored) {
      const pred = row.p >= t ? 1 : 0;
      if (row.label === 1 && pred === 1) tp += 1;
      if (row.label === 1 && pred === 0) fn += 1;
      if (row.label === 0 && pred === 0) tn += 1;
      if (row.label === 0 && pred === 1) fp += 1;
    }
    const tpr = tp / Math.max(1, tp + fn);
    const fpr = fp / Math.max(1, fp + tn);
    const fnr = fn / Math.max(1, tp + fn);
    if (fnr > 0.1) continue;
    const j = tpr - fpr;
    if (j > best.j) best = { t, j };
  }
  return best.t;
}

function derivePredicates(row) {
  const predicates = [];
  if (row.failureClass) predicates.push(`failureClass=${row.failureClass}`);
  if (row.chord) predicates.push(`chord=${row.chord}`);
  if (row.imageFamily) predicates.push(`imageFamily=${row.imageFamily}`);
  return predicates;
}

export function auditSlotCount(batchSize) {
  return Math.max(1, Math.floor(batchSize * 0.2));
}
