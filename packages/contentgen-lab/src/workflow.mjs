/**
 * Route-level Contentgen Lab workflow (testable without Next.js).
 * Quality calculation never runs here — only disposition legality and queue.
 */

import {
  legalDispositionsFor,
  projectCandidateForLab,
  reasonCodesCatalog,
  summarizeQueue,
} from "./dispositions.mjs";
import { sampleManifestSubset } from "./sampler.mjs";

export async function labCreateBatch(ctx, body) {
  await ctx.requireAdmin();
  const {
    medium,
    sourceVersion,
    seed,
    samplePolicy = "uniform",
    batchSize,
    judgeId = "NONE",
  } = body;
  if (judgeId !== "NONE") {
    // Epoch 015 exit: no AI dependency. Real judges arrive in 016 under auth.
    throw new Error("JUDGE_NOT_AUTHORIZED_IN_EPOCH_015");
  }
  const manifest = ctx.loadStagingManifest({ medium, sourceVersion, seed });
  const sampled = sampleManifestSubset({
    manifest,
    batchSeed: seed,
    batchSize: Number(batchSize),
    samplePolicy,
  });
  const batch = await ctx.createBatch({
    medium: sampled.medium,
    sourceVersion: sampled.sourceVersion,
    seed: sampled.seed,
    manifestHash: sampled.manifestHash,
    candidates: sampled.candidates.map((row, index) => ({
      id: row.id,
      compileStatus: row.compileStatus,
      text: row.text,
      payload: row.payload ?? { text: row.text },
      tags: row.tags ?? [],
      queueRank: index,
    })),
  });
  await ctx.persistBatch?.(batch.id);
  return {
    batch,
    sample: {
      samplePolicy: sampled.samplePolicy,
      batchSize: sampled.batchSize,
      auditSlots: sampled.auditSlots,
      candidateIds: sampled.candidateIds,
    },
    judgeId: "NONE",
  };
}

export async function labGetBatch(ctx, batchId) {
  await ctx.requireAdmin();
  if (ctx.hydrateBatch) await ctx.hydrateBatch(batchId);
  const detail = ctx.getBatchDetail(batchId);
  const candidates = detail.candidates.map((row) =>
    projectCandidateForLab(row, { judgeId: "NONE" }),
  );
  return {
    batch: detail.batch,
    queue: summarizeQueue(detail.candidates),
    candidates,
    reviews: detail.reviews.map((row) => ({
      id: row.id,
      candidateId: row.candidateId,
      disposition: row.disposition,
      reasonCodes: row.reasonCodes,
      reviewerReceiptId: row.reviewerReceiptId,
      notes: row.notes,
    })),
    reasonCodes: reasonCodesCatalog(),
    judgeId: "NONE",
    // Explicitly absent AI provenance surface in NONE mode.
    aiProvenanceVisible: false,
  };
}

export async function labReview(ctx, body) {
  await ctx.requireAdmin();
  const result = await ctx.reviewCandidate(body);
  await ctx.persistBatch?.(result.batchId);
  return result;
}

export async function labClose(ctx, batchId) {
  await ctx.requireAdmin();
  const batch = await ctx.closeBatch(batchId);
  await ctx.persistBatch?.(batchId);
  return batch;
}

export async function labExport(ctx, batchId) {
  await ctx.requireAdmin();
  const exported = await ctx.exportBatch(batchId);
  await ctx.recordExport?.(exported);
  return {
    id: exported.id,
    batchId: exported.batchId,
    artifactHash: exported.artifactHash,
    redactionReceiptId: exported.redactionReceiptId,
    artifact: exported.artifact,
  };
}

export async function labList(ctx) {
  await ctx.requireAdmin();
  return { batches: ctx.listBatches(), judgeId: "NONE" };
}

export function labControlsForCompileStatus(compileStatus) {
  return {
    compileStatus,
    legalDispositions: legalDispositionsFor(compileStatus),
    autoPromote: false,
  };
}
