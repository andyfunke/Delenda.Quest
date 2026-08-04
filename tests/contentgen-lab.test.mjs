import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  createBatch,
  closeBatch,
  createMemoryStore,
  exportBatch,
  getBatchDetail,
  listBatches,
  reviewCandidate,
} from "../db/contentgen.ts";
import { loadStagingManifest } from "../db/contentgen-lab.ts";
import {
  labControlsForCompileStatus,
  labCreateBatch,
  labClose,
  labExport,
  labGetBatch,
  labReview,
} from "../packages/contentgen-lab/src/workflow.mjs";
import {
  legalDispositionsFor,
  projectCandidateForLab,
} from "../packages/contentgen-lab/src/dispositions.mjs";
import { sampleManifestSubset } from "../packages/contentgen-lab/src/sampler.mjs";

const admin = { email: "admin@example.com", displayName: "Admin" };
const mortal = { email: "user@example.com", displayName: "User" };

function makeCtx(store, user = admin, durable = new Map()) {
  const deps = {
    store,
    getAuthenticatedUser: async () => user,
    isAdmin: async (u) => u.email === admin.email,
    now: () => 1_700_000_000_000,
  };
  return {
    async requireAdmin() {
      const current = await deps.getAuthenticatedUser();
      if (!current) throw new Error("AUTHENTICATION_REQUIRED");
      if (!(await deps.isAdmin(current))) throw new Error("ADMIN_REQUIRED");
      return current;
    },
    loadStagingManifest: (input) => loadStagingManifest(input),
    createBatch: (input) => createBatch(deps, input),
    reviewCandidate: (input) => reviewCandidate(deps, input),
    closeBatch: (batchId) => closeBatch(deps, batchId),
    exportBatch: (batchId) => exportBatch(deps, batchId),
    getBatchDetail: (batchId) => getBatchDetail(store, batchId),
    listBatches: () => listBatches(store),
    async persistBatch(batchId) {
      // Simulated D1: durable map survives "reload" into a fresh memory store.
      const detail = getBatchDetail(store, batchId);
      durable.set(batchId, structuredClone(detail));
    },
    async hydrateBatch(batchId) {
      const snap = durable.get(batchId);
      if (!snap) return;
      store.batches.set(batchId, {
        ...snap.batch,
        policyVersion: snap.batch.policyVersion ?? null,
        creatorReceiptId: snap.batch.creatorReceiptId,
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_000_000,
      });
      for (const row of snap.candidates) {
        store.candidates.set(row.id, structuredClone(row));
      }
      for (const row of snap.reviews) {
        store.reviews.set(row.id, structuredClone(row));
        store.idempotency.set(row.idempotencyKey, row.id);
      }
    },
  };
}

test("compile statuses expose only legal dispositions", () => {
  assert.deepEqual(legalDispositionsFor("COMPILED"), [
    "QUALITY_MET",
    "QUALITY_NOT_MET",
    "REVISE",
  ]);
  assert.deepEqual(legalDispositionsFor("HARD_FAILURE"), [
    "FAILURE_CONFIRMED",
    "GATE_FALSE_POSITIVE",
  ]);
  assert.equal(labControlsForCompileStatus("COMPILED").autoPromote, false);
});

test("sampler is deterministic and audit-first", () => {
  const manifest = loadStagingManifest({
    medium: "ava",
    sourceVersion: "contentgen-inventory/v1",
    seed: 7,
  });
  const a = sampleManifestSubset({
    manifest,
    batchSeed: 7,
    batchSize: 4,
    samplePolicy: "uniform",
  });
  const b = sampleManifestSubset({
    manifest,
    batchSeed: 7,
    batchSize: 4,
    samplePolicy: "uniform",
  });
  assert.deepEqual(a.candidateIds, b.candidateIds);
  assert.equal(a.auditSlots, Math.max(1, Math.floor(4 * 0.2)));
  assert.equal(a.candidates.filter((row) => row.sampleLane === "audit").length, a.auditSlots);
});

test("admin workflow: dispositions, unresolved gate, stale conflict, reload", async () => {
  const durable = new Map();
  const store = createMemoryStore();
  const ctx = makeCtx(store, admin, durable);

  const created = await labCreateBatch(ctx, {
    medium: "ava",
    sourceVersion: "contentgen-inventory/v1",
    seed: 7,
    batchSize: 4,
    samplePolicy: "uniform",
    judgeId: "NONE",
  });
  assert.equal(created.judgeId, "NONE");
  assert.equal(created.batch.unresolvedCandidateCount, 4);

  let view = await labGetBatch(ctx, created.batch.id);
  assert.equal(view.aiProvenanceVisible, false);
  assert.equal(view.queue.unresolved, 4);
  for (const candidate of view.candidates) {
    assert.ok(!("aiEvidence" in candidate));
    assert.deepEqual(
      candidate.legalDispositions,
      legalDispositionsFor(candidate.compileStatus),
    );
  }

  await assert.rejects(
    () => labClose(ctx, created.batch.id),
    /BATCH_UNRESOLVED/,
  );

  for (const [index, candidate] of view.candidates.entries()) {
    const disposition =
      candidate.compileStatus === "HARD_FAILURE"
        ? "FAILURE_CONFIRMED"
        : "QUALITY_MET";
    await labReview(ctx, {
      candidateId: candidate.id,
      expectedRevision: candidate.revision,
      idempotencyKey: `ok-${index}`,
      disposition,
      reasonCodes: ["WEAK_CONSEQUENCE"],
    });
  }

  await assert.rejects(
    () =>
      labReview(ctx, {
        candidateId: view.candidates[0].id,
        expectedRevision: 1,
        idempotencyKey: "stale-key",
        disposition: "QUALITY_NOT_MET",
        reasonCodes: ["REGISTER_BREAK"],
      }),
    /STALE_REVISION/,
  );

  // Reload into a fresh store from durable (D1 stand-in).
  const reloaded = createMemoryStore();
  const reloadCtx = makeCtx(reloaded, admin, durable);
  view = await labGetBatch(reloadCtx, created.batch.id);
  assert.equal(view.queue.unresolved, 0);

  const closed = await labClose(reloadCtx, created.batch.id);
  assert.equal(closed.status, "closed");
  const exported = await labExport(reloadCtx, created.batch.id);
  assert.match(exported.artifactHash, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(exported.artifact).includes(admin.email));
});

test("ordinary account cannot access lab workflow", async () => {
  const store = createMemoryStore();
  const ctx = makeCtx(store, mortal);
  await assert.rejects(
    () =>
      labCreateBatch(ctx, {
        medium: "ava",
        sourceVersion: "contentgen-inventory/v1",
        seed: 7,
        batchSize: 2,
      }),
    /ADMIN_REQUIRED/,
  );
});

test("NONE-mode projection never includes AI provenance", () => {
  const projected = projectCandidateForLab(
    {
      id: "x",
      batchId: "b",
      text: "hello",
      compileStatus: "COMPILED",
      disposition: null,
      dispositionTerminal: false,
      tags: [],
      queueRank: 0,
      revision: 1,
      parentCandidateId: null,
      payload: { text: "hello" },
      aiEvidence: { modelId: "secret-model" },
    },
    { judgeId: "NONE" },
  );
  assert.equal("aiEvidence" in projected, false);
});

test("keyboard/status announcements surface required for a11y contract", () => {
  const source = readFileSync(
    new URL("../app/ContentgenLab.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /Authenticate disposition/);
  assert.doesNotMatch(source, /Auto promote|autoPromote|onAutoPromote/i);
  assert.match(source, /Promotion is repository-manifest only/);
});
