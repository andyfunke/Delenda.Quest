import { createHash, randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "../app/auth.ts";

export type CompileStatus = "COMPILED" | "HARD_FAILURE";
export type Disposition =
  | "QUALITY_MET"
  | "QUALITY_NOT_MET"
  | "FAILURE_CONFIRMED"
  | "GATE_FALSE_POSITIVE"
  | "REVISE";

const LEGAL: Record<CompileStatus, readonly Disposition[]> = {
  COMPILED: ["QUALITY_MET", "QUALITY_NOT_MET", "REVISE"],
  HARD_FAILURE: ["FAILURE_CONFIRMED", "GATE_FALSE_POSITIVE"],
};

const TERMINAL = new Set<Disposition>([
  "QUALITY_MET",
  "QUALITY_NOT_MET",
  "FAILURE_CONFIRMED",
  "GATE_FALSE_POSITIVE",
]);

const REASON_CODES = new Set([
  "REGISTER_BREAK",
  "MECHANIC_MISMATCH",
  "HIDDEN_STATE_RISK",
  "UNSUPPORTED_CLAIM",
  "CONTINUITY_BREAK",
  "DUPLICATE_IMAGE",
  "GENERIC_ABSTRACTION",
  "SENTIMENTALITY",
  "SLANG_REGISTER",
  "OMNISCIENCE",
  "UNEXPLAINED_JARGON",
  "CHORD_MISMATCH",
  "WEAK_CONSEQUENCE",
  "CLAIM_BUDGET_BREACH",
  "OTHER_WITH_NOTE",
]);

export type ContentgenStore = {
  batches: Map<string, BatchRow>;
  candidates: Map<string, CandidateRow>;
  reviews: Map<string, ReviewRow>;
  exports: Map<string, ExportRow>;
  idempotency: Map<string, string>;
};

export type BatchRow = {
  id: string;
  medium: string;
  sourceVersion: string;
  policyVersion: string | null;
  seed: number;
  manifestHash: string;
  status: "open" | "closed";
  creatorReceiptId: string;
  createdAt: number;
  updatedAt: number;
};

export type CandidateRow = {
  id: string;
  batchId: string;
  payloadJson: string;
  payloadHash: string;
  compileStatus: CompileStatus;
  disposition: Disposition | null;
  dispositionTerminal: boolean;
  tags: string[];
  queueRank: number;
  revision: number;
  parentCandidateId: string | null;
  text: string;
  createdAt: number;
  updatedAt: number;
};

export type ReviewRow = {
  id: string;
  candidateId: string;
  batchId: string;
  disposition: Disposition;
  reasonCodes: string[];
  notes: string | null;
  reviewerReceiptId: string;
  idempotencyKey: string;
  supersedesReviewId: string | null;
  createdAt: number;
};

export type ExportRow = {
  id: string;
  batchId: string;
  artifactHash: string;
  redactionReceiptId: string;
  createdAt: number;
};

export function createMemoryStore(): ContentgenStore {
  return {
    batches: new Map(),
    candidates: new Map(),
    reviews: new Map(),
    exports: new Map(),
    idempotency: new Map(),
  };
}

const sha256 = (value: string) =>
  createHash("sha256").update(value.normalize("NFC"), "utf8").digest("hex");

export function opaqueReceiptId(email: string): string {
  return `receipt:${sha256(email.trim().toLowerCase()).slice(0, 16)}`;
}

export type ContentgenDeps = {
  getAuthenticatedUser: () => Promise<AuthenticatedUser | null>;
  isAdmin: (user: AuthenticatedUser) => Promise<boolean>;
  store: ContentgenStore;
  now?: () => number;
};

async function requireAdminUser(deps: ContentgenDeps): Promise<AuthenticatedUser> {
  const user = await deps.getAuthenticatedUser();
  if (!user) throw new Error("AUTHENTICATION_REQUIRED");
  if (!(await deps.isAdmin(user))) throw new Error("ADMIN_REQUIRED");
  return user;
}

export async function createBatch(
  deps: ContentgenDeps,
  input: {
    medium: string;
    sourceVersion: string;
    seed: number;
    manifestHash: string;
    policyVersion?: string | null;
    candidates: Array<{
      id: string;
      compileStatus: CompileStatus;
      text: string;
      payload: unknown;
      tags?: string[];
      queueRank?: number;
      parentCandidateId?: string | null;
    }>;
  },
) {
  const user = await requireAdminUser(deps);
  if (!input.manifestHash) throw new Error("MANIFEST_HASH_REQUIRED");
  if (!input.candidates.length) throw new Error("EMPTY_BATCH");
  const now = (deps.now ?? Date.now)();
  const batchId = randomUUID();
  const creatorReceiptId = opaqueReceiptId(user.email);
  deps.store.batches.set(batchId, {
    id: batchId,
    medium: input.medium,
    sourceVersion: input.sourceVersion,
    policyVersion: input.policyVersion ?? null,
    seed: input.seed,
    manifestHash: input.manifestHash,
    status: "open",
    creatorReceiptId,
    createdAt: now,
    updatedAt: now,
  });
  for (const [index, candidate] of input.candidates.entries()) {
    const payloadJson = JSON.stringify(candidate.payload);
    const payloadHash = sha256(payloadJson);
    deps.store.candidates.set(candidate.id, {
      id: candidate.id,
      batchId,
      payloadJson,
      payloadHash,
      compileStatus: candidate.compileStatus,
      disposition: null,
      dispositionTerminal: false,
      tags: candidate.tags ?? [],
      queueRank: candidate.queueRank ?? index,
      revision: 1,
      parentCandidateId: candidate.parentCandidateId ?? null,
      text: candidate.text,
      createdAt: now,
      updatedAt: now,
    });
  }
  return publicBatch(deps.store, batchId);
}

export async function reviewCandidate(
  deps: ContentgenDeps,
  input: {
    candidateId: string;
    expectedRevision: number;
    idempotencyKey: string;
    disposition: Disposition;
    reasonCodes: string[];
    notes?: string | null;
    revisedText?: string | null;
  },
) {
  const user = await requireAdminUser(deps);
  const existing = deps.store.idempotency.get(input.idempotencyKey);
  if (existing) {
    return publicReview(deps.store, existing);
  }
  const candidate = deps.store.candidates.get(input.candidateId);
  if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
  const batch = deps.store.batches.get(candidate.batchId);
  if (!batch || batch.status !== "open") throw new Error("BATCH_NOT_OPEN");
  if (candidate.revision !== input.expectedRevision) {
    throw new Error("STALE_REVISION");
  }
  if (!LEGAL[candidate.compileStatus].includes(input.disposition)) {
    throw new Error("ILLEGAL_DISPOSITION");
  }
  if (!input.reasonCodes.length) throw new Error("REASON_CODES_REQUIRED");
  for (const code of input.reasonCodes) {
    if (!REASON_CODES.has(code)) throw new Error("INVALID_REASON_CODE");
  }
  if (
    input.reasonCodes.includes("OTHER_WITH_NOTE") &&
    !String(input.notes || "").trim()
  ) {
    throw new Error("NOTE_REQUIRED");
  }

  const now = (deps.now ?? Date.now)();
  let childId: string | null = null;
  if (input.disposition === "REVISE") {
    if (!String(input.revisedText || "").trim()) {
      throw new Error("REVISED_TEXT_REQUIRED");
    }
    // Parent text stays immutable; child carries the edit.
    childId = randomUUID();
    const payload = {
      parentCandidateId: candidate.id,
      text: input.revisedText,
      transformation: "spot-edit",
    };
    deps.store.candidates.set(childId, {
      id: childId,
      batchId: candidate.batchId,
      payloadJson: JSON.stringify(payload),
      payloadHash: sha256(JSON.stringify(payload)),
      compileStatus: "COMPILED",
      disposition: null,
      dispositionTerminal: false,
      tags: ["#revision-child"],
      queueRank: candidate.queueRank,
      revision: 1,
      parentCandidateId: candidate.id,
      text: String(input.revisedText),
      createdAt: now,
      updatedAt: now,
    });
  }

  const reviewId = randomUUID();
  const reviewerReceiptId = opaqueReceiptId(user.email);
  deps.store.reviews.set(reviewId, {
    id: reviewId,
    candidateId: candidate.id,
    batchId: candidate.batchId,
    disposition: input.disposition,
    reasonCodes: input.reasonCodes,
    notes: input.notes ?? null,
    reviewerReceiptId,
    idempotencyKey: input.idempotencyKey,
    supersedesReviewId: null,
    createdAt: now,
  });
  deps.store.idempotency.set(input.idempotencyKey, reviewId);

  candidate.disposition = input.disposition;
  candidate.dispositionTerminal =
    TERMINAL.has(input.disposition) ||
    (input.disposition === "REVISE" && childId !== null);
  // REVISE resolves parent only once child exists (§4.7(a)).
  if (input.disposition === "REVISE" && childId) {
    candidate.dispositionTerminal = true;
  }
  candidate.revision += 1;
  candidate.updatedAt = now;
  // Never mutate parent text.
  batch.updatedAt = now;

  return {
    ...publicReview(deps.store, reviewId),
    childCandidateId: childId,
  };
}

export async function closeBatch(deps: ContentgenDeps, batchId: string) {
  await requireAdminUser(deps);
  const batch = deps.store.batches.get(batchId);
  if (!batch) throw new Error("BATCH_NOT_FOUND");
  const unresolved = unresolvedCandidateCount(deps.store, batchId);
  if (unresolved > 0) throw new Error("BATCH_UNRESOLVED");
  batch.status = "closed";
  batch.updatedAt = (deps.now ?? Date.now)();
  return publicBatch(deps.store, batchId);
}

export async function exportBatch(deps: ContentgenDeps, batchId: string) {
  await requireAdminUser(deps);
  const batch = deps.store.batches.get(batchId);
  if (!batch) throw new Error("BATCH_NOT_FOUND");
  if (batch.status !== "closed") throw new Error("BATCH_NOT_CLOSED");
  const candidates = [...deps.store.candidates.values()].filter(
    (row) => row.batchId === batchId,
  );
  const reviews = [...deps.store.reviews.values()].filter(
    (row) => row.batchId === batchId,
  );
  const artifact = {
    batch: {
      id: batch.id,
      medium: batch.medium,
      sourceVersion: batch.sourceVersion,
      seed: batch.seed,
      manifestHash: batch.manifestHash,
    },
    candidates: candidates.map((row) => ({
      id: row.id,
      compileStatus: row.compileStatus,
      disposition: row.disposition,
      payloadHash: row.payloadHash,
      parentCandidateId: row.parentCandidateId,
      text: row.text,
    })),
    reviews: reviews.map((row) => ({
      id: row.id,
      candidateId: row.candidateId,
      disposition: row.disposition,
      reasonCodes: row.reasonCodes,
      reviewerReceiptId: row.reviewerReceiptId,
      // never export raw email
    })),
  };
  const artifactHash = sha256(JSON.stringify(artifact));
  const id = randomUUID();
  deps.store.exports.set(id, {
    id,
    batchId,
    artifactHash,
    redactionReceiptId: `redaction:${artifactHash.slice(0, 12)}`,
    createdAt: (deps.now ?? Date.now)(),
  });
  return {
    id,
    batchId,
    artifactHash,
    redactionReceiptId: `redaction:${artifactHash.slice(0, 12)}`,
    artifact,
  };
}

export function unresolvedCandidateCount(store: ContentgenStore, batchId: string) {
  return [...store.candidates.values()].filter(
    (row) => row.batchId === batchId && !row.dispositionTerminal,
  ).length;
}

function publicBatch(store: ContentgenStore, batchId: string) {
  const batch = store.batches.get(batchId)!;
  return {
    id: batch.id,
    medium: batch.medium,
    sourceVersion: batch.sourceVersion,
    seed: batch.seed,
    manifestHash: batch.manifestHash,
    status: batch.status,
    creatorReceiptId: batch.creatorReceiptId,
    unresolvedCandidateCount: unresolvedCandidateCount(store, batchId),
  };
}

function publicReview(store: ContentgenStore, reviewId: string) {
  const review = store.reviews.get(reviewId)!;
  return {
    id: review.id,
    candidateId: review.candidateId,
    batchId: review.batchId,
    disposition: review.disposition,
    reasonCodes: review.reasonCodes,
    reviewerReceiptId: review.reviewerReceiptId,
    idempotencyKey: review.idempotencyKey,
    notes: review.notes,
  };
}

export function mutateParentTextForbidden(
  store: ContentgenStore,
  candidateId: string,
  nextText: string,
) {
  const candidate = store.candidates.get(candidateId);
  if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
  if (candidate.text !== nextText) {
    throw new Error("PARENT_MUTATION_FORBIDDEN");
  }
}

/** Production helper wiring — uses live auth/admin; store must be provided by route layer later. */
export async function liveDeps(store: ContentgenStore): Promise<ContentgenDeps> {
  const { getAuthenticatedUser } = await import("../app/auth.ts");
  const { isAdmin } = await import("./admin.ts");
  return {
    store,
    getAuthenticatedUser,
    isAdmin,
  };
}
