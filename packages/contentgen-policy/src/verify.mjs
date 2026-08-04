/**
 * Epoch 018 promotion gate verifier.
 */

import { createHash } from "node:crypto";
import { evaluatePolicy } from "../../contentgen-evaluate/src/evaluate.mjs";

const sha256 = (value) =>
  createHash("sha256").update(String(value).normalize("NFC"), "utf8").digest("hex");

const LOG_LOSS_MARGIN = 0.005;
const FN_CEILING = 0.1;

export function verifyPolicyPromotion(input) {
  const { candidate, promoted, heldOutRows, zeroBaseline } = input;
  const failures = [];

  if (!candidate?.policyHash || !candidate?.configHash) {
    failures.push("MANIFEST_HASH_MISSING");
  }
  if (!candidate.corpusVersion) failures.push("CORPUS_VERSION_MISSING");

  const weights = normalizeWeights(candidate);
  for (const weight of weights) {
    if (!weight.featureId || !weight.mediumScope) {
      failures.push("UNDECLARED_FEATURE_OR_SCOPE");
      break;
    }
  }
  if (candidate.featureIds) {
    for (const id of candidate.featureIds) {
      if (!weights.some((w) => w.featureId === id)) {
        failures.push("WEIGHT_MISSING_FOR_FEATURE");
        break;
      }
    }
  }

  const policyForEval = toEvalPolicy(candidate);
  let metrics;
  try {
    metrics = evaluatePolicy(policyForEval, heldOutRows);
  } catch (error) {
    failures.push(`EVAL_FAILED:${error instanceof Error ? error.message : "unknown"}`);
    return { eligible: false, failures, metrics: null };
  }

  const baselineMetrics =
    promoted?.baselineMetrics ??
    (zeroBaseline ? evaluatePolicy(toEvalPolicy(zeroBaseline), heldOutRows) : null);

  if (baselineMetrics) {
    const delta = metrics.heldOutLogLoss - baselineMetrics.heldOutLogLoss;
    if (delta > LOG_LOSS_MARGIN) failures.push(`LOG_LOSS_REGRESSION:${delta}`);
    if (metrics.balancedAccuracy < baselineMetrics.balancedAccuracy) {
      failures.push("BALANCED_ACCURACY_REGRESSION");
    }
  }

  for (const [medium, rate] of Object.entries(metrics.perMediumFalseNegativeRate)) {
    if (rate > FN_CEILING) failures.push(`FN_CEILING:${medium}:${rate}`);
  }
  if ((metrics.canaryFlips ?? 0) > 0) failures.push("CANARY_FLIPS");
  if (candidate.proposedPrismsReviewed === false) failures.push("PRISMS_UNREVIEWED");
  if (!candidate.promotionReceipt?.humanSigned) failures.push("HUMAN_SIGNATURE_REQUIRED");

  if (candidate.intercept != null && Array.isArray(candidate.rawWeights)) {
    const expected = sha256(
      JSON.stringify({
        config: candidate.config,
        corpusVersion: candidate.corpusVersion,
        featureIds: candidate.featureIds,
        weights: candidate.rawWeights,
        intercept: candidate.intercept,
        means: candidate.means,
        variances: candidate.variances,
        thresholds: candidate.thresholds,
      }),
    );
    if (expected !== candidate.policyHash) failures.push("POLICY_HASH_TAMPER");
  }

  return {
    eligible: failures.length === 0,
    failures,
    metrics,
    gate: {
      logLossMargin: LOG_LOSS_MARGIN,
      falseNegativeCeiling: FN_CEILING,
      zeroCanaryFlipsTolerated: true,
    },
  };
}

function normalizeWeights(candidate) {
  if (Array.isArray(candidate.weights) && candidate.weights[0]?.featureId) {
    return candidate.weights;
  }
  if (Array.isArray(candidate.weights) && Array.isArray(candidate.featureIds)) {
    return candidate.weights.map((value, i) => ({
      featureId: candidate.featureIds[i],
      mediumScope: String(candidate.featureIds[i]).includes(":") ? "ava" : "shared",
      value,
    }));
  }
  return [];
}

function toEvalPolicy(candidate) {
  const weights = normalizeWeights(candidate);
  return {
    medium: candidate.medium ?? "ava",
    featureIds: candidate.featureIds ?? weights.map((w) => w.featureId),
    means: candidate.means,
    variances: candidate.variances,
    intercept: candidate.intercept,
    weights: weights.map((w) => w.value),
    thresholds: candidate.thresholds,
  };
}

export function mutateForAcceptance(promoted) {
  return {
    undeclaredFeature: {
      ...promoted,
      weights: [
        ...promoted.weights,
        { featureId: "undeclared-magic", mediumScope: null, value: 1 },
      ],
    },
    removeMediumResidual: {
      ...promoted,
      weights: promoted.weights.filter((w) => w.mediumScope === "shared"),
      featureIds: promoted.featureIds.filter((id) => !id.includes(":")),
      means: promoted.means.slice(
        0,
        promoted.featureIds.filter((id) => !id.includes(":")).length,
      ),
      variances: promoted.variances.slice(
        0,
        promoted.featureIds.filter((id) => !id.includes(":")).length,
      ),
    },
  };
}
