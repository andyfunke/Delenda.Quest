/**
 * Contentgen Lab route store + D1 persistence adapter.
 * Staging/review only — never runtime content authority (§21.7).
 */

import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  closeBatch,
  createBatch,
  createMemoryStore,
  exportBatch,
  getBatchDetail,
  listBatches,
  reviewCandidate,
  type ContentgenDeps,
  type ContentgenStore,
  type CompileStatus,
} from "./contentgen.ts";
import {
  contentgenBatches,
  contentgenCandidates,
  contentgenExports,
  contentgenReviews,
} from "./schema.ts";

declare global {
  // eslint-disable-next-line no-var
  var __contentgenLabStore: ContentgenStore | undefined;
}

export function labMemoryStore(): ContentgenStore {
  if (!globalThis.__contentgenLabStore) {
    globalThis.__contentgenLabStore = createMemoryStore();
  }
  return globalThis.__contentgenLabStore;
}

export function resetLabMemoryStoreForTests() {
  globalThis.__contentgenLabStore = createMemoryStore();
}

export async function labDeps(
  store: ContentgenStore = labMemoryStore(),
): Promise<ContentgenDeps> {
  const { getAuthenticatedUser } = await import("../app/auth.ts");
  const { isAdmin } = await import("./admin.ts");
  return { store, getAuthenticatedUser, isAdmin };
}

const sha256 = (value: string) =>
  createHash("sha256").update(value.normalize("NFC"), "utf8").digest("hex");

/** Load a frozen staging manifest by (medium, sourceVersion, seed). */
export function loadStagingManifest(input: {
  medium: string;
  sourceVersion: string;
  seed: number;
  root?: string;
}) {
  const root = input.root ?? process.cwd();
  const file = path.join(
    root,
    "content-quality/lab/staging",
    `${input.medium}-seed-${input.seed}.manifest.json`,
  );
  const raw = readFileSync(file, "utf8");
  const manifest = JSON.parse(raw) as {
    medium: string;
    sourceVersion: string;
    seed: number;
    manifestHash: string;
    candidates: Array<{
      id: string;
      compileStatus: CompileStatus;
      text: string;
      payload?: unknown;
      tags?: string[];
    }>;
  };
  if (manifest.medium !== input.medium) throw new Error("MANIFEST_MEDIUM_MISMATCH");
  if (manifest.sourceVersion !== input.sourceVersion) {
    throw new Error("MANIFEST_SOURCE_MISMATCH");
  }
  if (manifest.seed !== input.seed) throw new Error("MANIFEST_SEED_MISMATCH");
  const recomputed = sha256(
    JSON.stringify({
      medium: manifest.medium,
      sourceVersion: manifest.sourceVersion,
      seed: manifest.seed,
      candidates: manifest.candidates.map((row) => ({
        id: row.id,
        compileStatus: row.compileStatus,
        text: row.text,
      })),
    }),
  );
  if (recomputed !== manifest.manifestHash) {
    throw new Error("MANIFEST_HASH_MISMATCH");
  }
  return manifest;
}

/** Persist an in-memory batch snapshot into D1 (fail-closed on missing tables). */
export async function flushBatchToD1(store: ContentgenStore, batchId: string) {
  const { getDb } = await import("./index.ts");
  const db = await getDb();
  const detail = getBatchDetail(store, batchId);
  await db
    .insert(contentgenBatches)
    .values({
      id: detail.batch.id,
      medium: detail.batch.medium,
      sourceVersion: detail.batch.sourceVersion,
      policyVersion: detail.batch.policyVersion,
      seed: detail.batch.seed,
      manifestHash: detail.batch.manifestHash,
      status: detail.batch.status,
      creatorReceiptId: detail.batch.creatorReceiptId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: contentgenBatches.id,
      set: {
        status: detail.batch.status,
        updatedAt: Date.now(),
      },
    });

  for (const candidate of detail.candidates) {
    await db
      .insert(contentgenCandidates)
      .values({
        id: candidate.id,
        batchId: candidate.batchId,
        payloadJson: candidate.payloadJson,
        payloadHash: candidate.payloadHash,
        compileStatus: candidate.compileStatus,
        disposition: candidate.disposition,
        dispositionTerminal: candidate.dispositionTerminal,
        tagsJson: JSON.stringify(candidate.tags),
        queueRank: candidate.queueRank,
        revision: candidate.revision,
        parentCandidateId: candidate.parentCandidateId,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
      })
      .onConflictDoUpdate({
        target: contentgenCandidates.id,
        set: {
          disposition: candidate.disposition,
          dispositionTerminal: candidate.dispositionTerminal,
          tagsJson: JSON.stringify(candidate.tags),
          revision: candidate.revision,
          updatedAt: candidate.updatedAt,
        },
      });
  }

  for (const review of detail.reviews) {
    await db
      .insert(contentgenReviews)
      .values({
        id: review.id,
        candidateId: review.candidateId,
        batchId: review.batchId,
        disposition: review.disposition,
        reasonCodesJson: JSON.stringify(review.reasonCodes),
        notes: review.notes,
        reviewerReceiptId: review.reviewerReceiptId,
        idempotencyKey: review.idempotencyKey,
        supersedesReviewId: review.supersedesReviewId,
        createdAt: review.createdAt,
      })
      .onConflictDoNothing();
  }
}

/** Hydrate memory store from D1 for one batch (reload preservation). */
export async function hydrateBatchFromD1(
  store: ContentgenStore,
  batchId: string,
) {
  const { getDb } = await import("./index.ts");
  const db = await getDb();
  const batchRows = await db
    .select()
    .from(contentgenBatches)
    .where(eq(contentgenBatches.id, batchId))
    .limit(1);
  const batch = batchRows[0];
  if (!batch) throw new Error("BATCH_NOT_FOUND");
  store.batches.set(batch.id, {
    id: batch.id,
    medium: batch.medium,
    sourceVersion: batch.sourceVersion,
    policyVersion: batch.policyVersion,
    seed: batch.seed,
    manifestHash: batch.manifestHash,
    status: batch.status as "open" | "closed",
    creatorReceiptId: batch.creatorReceiptId,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  });
  const candidateRows = await db
    .select()
    .from(contentgenCandidates)
    .where(eq(contentgenCandidates.batchId, batchId));
  for (const row of candidateRows) {
    let text = "";
    try {
      const payload = JSON.parse(row.payloadJson) as { text?: string };
      text = String(payload.text ?? "");
    } catch {
      text = "";
    }
    store.candidates.set(row.id, {
      id: row.id,
      batchId: row.batchId,
      payloadJson: row.payloadJson,
      payloadHash: row.payloadHash,
      compileStatus: row.compileStatus as CompileStatus,
      disposition: row.disposition as never,
      dispositionTerminal: Boolean(row.dispositionTerminal),
      tags: JSON.parse(row.tagsJson) as string[],
      queueRank: row.queueRank,
      revision: row.revision,
      parentCandidateId: row.parentCandidateId,
      text,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
  const reviewRows = await db
    .select()
    .from(contentgenReviews)
    .where(eq(contentgenReviews.batchId, batchId));
  for (const row of reviewRows) {
    store.reviews.set(row.id, {
      id: row.id,
      candidateId: row.candidateId,
      batchId: row.batchId,
      disposition: row.disposition as never,
      reasonCodes: JSON.parse(row.reasonCodesJson) as string[],
      notes: row.notes,
      reviewerReceiptId: row.reviewerReceiptId,
      idempotencyKey: row.idempotencyKey,
      supersedesReviewId: row.supersedesReviewId,
      createdAt: row.createdAt,
    });
    store.idempotency.set(row.idempotencyKey, row.id);
  }
  return getBatchDetail(store, batchId);
}

export async function recordExportD1(input: {
  id: string;
  batchId: string;
  artifactHash: string;
  redactionReceiptId: string;
  createdAt: number;
}) {
  const { getDb } = await import("./index.ts");
  const db = await getDb();
  await db.insert(contentgenExports).values(input).onConflictDoNothing();
}

export {
  closeBatch,
  createBatch,
  exportBatch,
  getBatchDetail,
  listBatches,
  reviewCandidate,
};
