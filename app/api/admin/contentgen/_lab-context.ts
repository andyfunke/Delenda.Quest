import {
  closeBatch,
  createBatch,
  exportBatch,
  flushBatchToD1,
  getBatchDetail,
  hydrateBatchFromD1,
  labDeps,
  labMemoryStore,
  listBatches,
  loadStagingManifest,
  recordExportD1,
  reviewCandidate,
} from "../../../../db/contentgen-lab.ts";
import type { ContentgenDeps, ContentgenStore } from "../../../../db/contentgen.ts";
import { getAuthenticatedUser } from "../../../auth";
import { isAdmin } from "../../../../db/admin";

export async function createLabContext(options?: {
  store?: ContentgenStore;
  persist?: boolean;
}) {
  const store = options?.store ?? labMemoryStore();
  const deps: ContentgenDeps = options?.store
    ? {
        store,
        getAuthenticatedUser,
        isAdmin,
      }
    : await labDeps(store);
  const persist = options?.persist ?? true;

  return {
    async requireAdmin() {
      const user = await deps.getAuthenticatedUser();
      if (!user) throw new Error("AUTHENTICATION_REQUIRED");
      if (!(await deps.isAdmin(user))) throw new Error("ADMIN_REQUIRED");
      return user;
    },
    loadStagingManifest,
    createBatch: (input: Parameters<typeof createBatch>[1]) =>
      createBatch(deps, input),
    reviewCandidate: (input: Parameters<typeof reviewCandidate>[1]) =>
      reviewCandidate(deps, input),
    closeBatch: (batchId: string) => closeBatch(deps, batchId),
    exportBatch: (batchId: string) => exportBatch(deps, batchId),
    getBatchDetail: (batchId: string) => getBatchDetail(store, batchId),
    listBatches: () => listBatches(store),
    async persistBatch(batchId: string) {
      if (!persist) return;
      try {
        await flushBatchToD1(store, batchId);
      } catch {
        // Local/test environments may lack D1; memory store remains authoritative
        // for the isolate. Production Workers Builds has D1 bound.
      }
    },
    async hydrateBatch(batchId: string) {
      if (!persist) return;
      try {
        await hydrateBatchFromD1(store, batchId);
      } catch {
        // Fall through to memory if D1 row absent.
      }
    },
    async recordExport(exported: {
      id: string;
      batchId: string;
      artifactHash: string;
      redactionReceiptId: string;
    }) {
      if (!persist) return;
      try {
        await recordExportD1({ ...exported, createdAt: Date.now() });
      } catch {
        /* optional in non-D1 test envs */
      }
    },
  };
}

export function mapLabError(error: unknown) {
  const message = error instanceof Error ? error.message : "Lab request failed.";
  if (message === "AUTHENTICATION_REQUIRED") {
    return { status: 401 as const, error: "Sign in." };
  }
  if (message === "ADMIN_REQUIRED") {
    return { status: 403 as const, error: "Administrator access required." };
  }
  if (message === "STALE_REVISION") {
    return { status: 409 as const, error: message };
  }
  if (message === "BATCH_UNRESOLVED") {
    return { status: 409 as const, error: message };
  }
  return { status: 400 as const, error: message };
}
