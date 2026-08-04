/**
 * Independent evaluator — reads policy JSON + held-out JSONL only.
 * MUST NOT import trainer code.
 */

import { readFileSync } from "node:fs";

function sigmoid(x) {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function scoreRow(policy, row) {
  const values = row.values;
  if (!values || values.length !== policy.weights.length) {
    throw new Error("FEATURE_WIDTH_MISMATCH");
  }
  const x = values.map(
    (value, i) => (value - policy.means[i]) / (policy.variances[i] || 1),
  );
  let logit = policy.intercept;
  for (let i = 0; i < policy.weights.length; i++) logit += policy.weights[i] * x[i];
  return sigmoid(logit);
}

export function evaluatePolicy(policy, heldOutRows, options = {}) {
  if (!policy?.weights || !policy?.featureIds) throw new Error("POLICY_INVALID");
  if (!heldOutRows.length) throw new Error("HELD_OUT_EMPTY");

  const threshold =
    policy.thresholds?.[policy.medium] ??
    policy.thresholds?.ava ??
    0.5;

  let logLoss = 0;
  let tp = 0,
    tn = 0,
    fp = 0,
    fn = 0;
  const byMedium = {};

  for (const row of heldOutRows) {
    const p = Math.min(1 - 1e-15, Math.max(1e-15, scoreRow(policy, row)));
    const y = row.label;
    logLoss += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
    const pred = p >= threshold ? 1 : 0;
    if (y === 1 && pred === 1) tp += 1;
    if (y === 0 && pred === 0) tn += 1;
    if (y === 0 && pred === 1) fp += 1;
    if (y === 1 && pred === 0) fn += 1;
    const medium = row.medium ?? policy.medium ?? "ava";
    const bucket = (byMedium[medium] ??= { tp: 0, tn: 0, fp: 0, fn: 0 });
    if (y === 1 && pred === 1) bucket.tp += 1;
    if (y === 0 && pred === 0) bucket.tn += 1;
    if (y === 0 && pred === 1) bucket.fp += 1;
    if (y === 1 && pred === 0) bucket.fn += 1;
  }

  const n = heldOutRows.length;
  const tpr = tp / Math.max(1, tp + fn);
  const tnr = tn / Math.max(1, tn + fp);
  const balancedAccuracy = (tpr + tnr) / 2;
  const falseNegativeRate = fn / Math.max(1, tp + fn);
  const calibrationError =
    Math.abs(
      heldOutRows.reduce((sum, row) => sum + scoreRow(policy, row), 0) / n -
        heldOutRows.reduce((sum, row) => sum + row.label, 0) / n,
    );

  const canaryIds = new Set(options.canaryIds ?? []);
  let canaryFlips = 0;
  for (const row of heldOutRows) {
    if (!canaryIds.has(row.id)) continue;
    const pred = scoreRow(policy, row) >= threshold ? 1 : 0;
    if (pred !== row.label) canaryFlips += 1;
  }

  const perMediumFn = Object.fromEntries(
    Object.entries(byMedium).map(([medium, b]) => [
      medium,
      b.fn / Math.max(1, b.tp + b.fn),
    ]),
  );

  return {
    heldOutLogLoss: logLoss / n,
    balancedAccuracy,
    falseNegativeRate,
    perMediumFalseNegativeRate: perMediumFn,
    calibrationError,
    canaryFlips,
    subgroupSampleCounts: {
      heldOut: n,
      positives: tp + fn,
      negatives: tn + fp,
    },
    threshold,
  };
}

export function evaluatePolicyFiles(policyPath, heldOutPath, options = {}) {
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  const heldOut = readFileSync(heldOutPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return evaluatePolicy(policy, heldOut, options);
}

/** Mutation detectors for independent acceptance. */
export function detectMutations(policy, heldOutRows) {
  const baseline = evaluatePolicy(policy, heldOutRows);
  const flipped = evaluatePolicy(policy, heldOutRows.map((row) => ({
    ...row,
    label: row.label ^ 1,
  })));
  const leaked = evaluatePolicy(policy, [
    ...heldOutRows,
    { ...heldOutRows[0], id: `${heldOutRows[0].id}-sib`, groupKey: heldOutRows[0].groupKey },
  ]);
  const reordered = {
    ...policy,
    featureIds: [...policy.featureIds].reverse(),
    weights: [...policy.weights].reverse(),
    means: [...policy.means].reverse(),
    variances: [...policy.variances].reverse(),
  };
  let orderDetected = false;
  try {
    const report = evaluatePolicy(reordered, heldOutRows);
    orderDetected = report.heldOutLogLoss !== baseline.heldOutLogLoss;
  } catch {
    orderDetected = true;
  }
  const weightTamper = {
    ...policy,
    weights: policy.weights.map((w, i) => (i === 0 ? w + 1 : w)),
  };
  const tampered = evaluatePolicy(weightTamper, heldOutRows);
  return {
    labelFlipDetected: flipped.heldOutLogLoss !== baseline.heldOutLogLoss,
    siblingLeakVisible: leaked.subgroupSampleCounts.heldOut !== baseline.subgroupSampleCounts.heldOut,
    featureOrderDetected: orderDetected,
    weightTamperDetected: tampered.heldOutLogLoss !== baseline.heldOutLogLoss,
  };
}
