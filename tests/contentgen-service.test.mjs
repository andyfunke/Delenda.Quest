import assert from "node:assert/strict";
import { test } from "node:test";
import {
  closeBatch,
  createBatch,
  createMemoryStore,
  exportBatch,
  mutateParentTextForbidden,
  reviewCandidate,
  unresolvedCandidateCount,
} from "../db/contentgen.ts";

const admin = { email: "admin@example.com", displayName: "Admin" };
const mortal = { email: "user@example.com", displayName: "User" };

function deps(store, user) {
  return {
    store,
    getAuthenticatedUser: async () => user,
    isAdmin: async (u) => u.email === admin.email,
    now: () => 1_700_000_000_000,
  };
}

async function openBatch(store, user = admin, extra = {}) {
  return createBatch(deps(store, user), {
    medium: "ava",
    sourceVersion: "contentgen-inventory/v1",
    seed: 7,
    manifestHash: "abc123",
    candidates: [
      {
        id: "cand-1",
        compileStatus: "COMPILED",
        text: "Delay is still a choice.",
        payload: { text: "Delay is still a choice." },
      },
      {
        id: "cand-2",
        compileStatus: "HARD_FAILURE",
        text: "Do attack now.",
        payload: { text: "Do attack now." },
      },
      ...(extra.candidates || []),
    ],
  });
}

test("anonymous access fails closed", async () => {
  const store = createMemoryStore();
  await assert.rejects(
    () => openBatch(store, null),
    /AUTHENTICATION_REQUIRED/,
  );
});

test("non-admin access fails closed", async () => {
  const store = createMemoryStore();
  await assert.rejects(() => openBatch(store, mortal), /ADMIN_REQUIRED/);
});

test("duplicate idempotency keys return the same review", async () => {
  const store = createMemoryStore();
  const batch = await openBatch(store);
  const first = await reviewCandidate(deps(store, admin), {
    candidateId: "cand-1",
    expectedRevision: 1,
    idempotencyKey: "idem-1",
    disposition: "QUALITY_MET",
    reasonCodes: ["WEAK_CONSEQUENCE"],
  });
  const second = await reviewCandidate(deps(store, admin), {
    candidateId: "cand-1",
    expectedRevision: 2,
    idempotencyKey: "idem-1",
    disposition: "QUALITY_NOT_MET",
    reasonCodes: ["REGISTER_BREAK"],
  });
  assert.equal(first.id, second.id);
  assert.equal(second.disposition, "QUALITY_MET");
  assert.equal(batch.id, first.batchId);
});

test("stale revision fails closed", async () => {
  const store = createMemoryStore();
  await openBatch(store);
  await reviewCandidate(deps(store, admin), {
    candidateId: "cand-1",
    expectedRevision: 1,
    idempotencyKey: "idem-stale-a",
    disposition: "QUALITY_MET",
    reasonCodes: ["WEAK_CONSEQUENCE"],
  });
  await assert.rejects(
    () =>
      reviewCandidate(deps(store, admin), {
        candidateId: "cand-1",
        expectedRevision: 1,
        idempotencyKey: "idem-stale-b",
        disposition: "QUALITY_NOT_MET",
        reasonCodes: ["REGISTER_BREAK"],
      }),
    /STALE_REVISION/,
  );
});

test("illegal hard-failure approval fails closed", async () => {
  const store = createMemoryStore();
  await openBatch(store);
  await assert.rejects(
    () =>
      reviewCandidate(deps(store, admin), {
        candidateId: "cand-2",
        expectedRevision: 1,
        idempotencyKey: "idem-illegal",
        disposition: "QUALITY_MET",
        reasonCodes: ["MECHANIC_MISMATCH"],
      }),
    /ILLEGAL_DISPOSITION/,
  );
});

test("premature batch close fails closed, including unreviewed revision child", async () => {
  const store = createMemoryStore();
  const batch = await openBatch(store);
  await reviewCandidate(deps(store, admin), {
    candidateId: "cand-1",
    expectedRevision: 1,
    idempotencyKey: "idem-revise",
    disposition: "REVISE",
    reasonCodes: ["REGISTER_BREAK"],
    revisedText: "Delay remains a choice under arithmetic.",
  });
  await reviewCandidate(deps(store, admin), {
    candidateId: "cand-2",
    expectedRevision: 1,
    idempotencyKey: "idem-fail",
    disposition: "FAILURE_CONFIRMED",
    reasonCodes: ["HIDDEN_STATE_RISK"],
  });
  assert.ok(unresolvedCandidateCount(store, batch.id) >= 1);
  await assert.rejects(
    () => closeBatch(deps(store, admin), batch.id),
    /BATCH_UNRESOLVED/,
  );
});

test("parent mutation fails closed", async () => {
  const store = createMemoryStore();
  await openBatch(store);
  assert.throws(
    () => mutateParentTextForbidden(store, "cand-1", "mutated parent"),
    /PARENT_MUTATION_FORBIDDEN/,
  );
});

test("export redacts private identity to opaque receipt ids", async () => {
  const store = createMemoryStore();
  const batch = await openBatch(store);
  await reviewCandidate(deps(store, admin), {
    candidateId: "cand-1",
    expectedRevision: 1,
    idempotencyKey: "idem-exp-1",
    disposition: "QUALITY_MET",
    reasonCodes: ["WEAK_CONSEQUENCE"],
  });
  await reviewCandidate(deps(store, admin), {
    candidateId: "cand-2",
    expectedRevision: 1,
    idempotencyKey: "idem-exp-2",
    disposition: "FAILURE_CONFIRMED",
    reasonCodes: ["HIDDEN_STATE_RISK"],
  });
  await closeBatch(deps(store, admin), batch.id);
  const exported = await exportBatch(deps(store, admin), batch.id);
  const blob = JSON.stringify(exported.artifact);
  assert.equal(blob.includes("admin@example.com"), false);
  assert.ok(
    exported.artifact.reviews.every((row) =>
      String(row.reviewerReceiptId).startsWith("receipt:"),
    ),
  );
});
