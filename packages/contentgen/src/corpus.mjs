import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  QUALITY_THRESHOLDS_V1,
  canonicalJson,
  identityCanonicalJson,
} from "../../contentgen-contracts/src/index.ts";
import { buildRetrievalIndex, bm25 } from "../../../scripts/ava-content-quality.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const CORPUS_ROOT = path.join(ROOT, "content-quality/corpus");

export const CORPUS_PARTITION_NAMES = [
  "approved",
  "rejected",
  "adversarial",
  "curious",
  "revisions",
  "calibration",
  "held-out",
  "canaries",
];

const sha256 = (text) =>
  crypto.createHash("sha256").update(String(text).normalize("NFC"), "utf8").digest("hex");

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function loadEpoch008Foundation() {
  return {
    approved: readJsonl(path.join(CORPUS_ROOT, "approved.jsonl")),
    rejected: readJsonl(path.join(CORPUS_ROOT, "rejected.jsonl")),
    calibration: readJsonl(path.join(CORPUS_ROOT, "calibration.jsonl")),
  };
}

export function buildCorpus({ corpusDir = CORPUS_ROOT, outDir } = {}) {
  const foundation = loadEpoch008Foundation();
  const partitions = Object.fromEntries(
    CORPUS_PARTITION_NAMES.map((name) => [name, []]),
  );

  // Extend rather than replace Epoch 008 IDs.
  partitions.approved = foundation.approved.map((row) => ({
    ...row,
    partition: "approved",
    lineage: { parentId: null, transformation: null },
    reviewReceiptId: row.reviewReceiptId || `receipt:${row.id}`,
  }));
  partitions.rejected = foundation.rejected.map((row) => ({
    ...row,
    partition: "rejected",
    lineage: { parentId: null, transformation: null },
    reviewReceiptId: row.reviewReceiptId || `receipt:${row.id}`,
  }));
  partitions.calibration = foundation.calibration.map((row) => ({
    ...row,
    partition: "calibration",
    lineage: { parentId: null, transformation: null },
    reviewReceiptId: row.reviewReceiptId || `receipt:${row.id}`,
  }));

  // Seed empty extension partitions with checked-in files when present.
  for (const name of [
    "adversarial",
    "curious",
    "revisions",
    "held-out",
    "canaries",
  ]) {
    partitions[name] = readJsonl(path.join(corpusDir, `${name}.jsonl`)).map(
      (row) => ({
        ...row,
        partition: name,
        lineage: row.lineage || { parentId: null, transformation: null },
        reviewReceiptId: row.reviewReceiptId || `receipt:${row.id}`,
      }),
    );
  }

  // Ensure canaries exist for stability.
  if (!partitions.canaries.length) {
    partitions.canaries = [
      {
        id: "canary-good-1",
        text: "Observation remains provisional under intermittent relays.",
        label: "known-good",
        partition: "canaries",
        lineage: { parentId: null, transformation: null },
        reviewReceiptId: "receipt:canary-good-1",
      },
      {
        id: "canary-bad-1",
        text: "The assault has happened and the salient was won.",
        label: "known-bad",
        partition: "canaries",
        lineage: { parentId: null, transformation: null },
        reviewReceiptId: "receipt:canary-bad-1",
      },
      {
        id: "canary-weird-1",
        text: "Purple elephant logistics remain doctrinal.",
        label: "known-weird",
        partition: "canaries",
        lineage: { parentId: null, transformation: null },
        reviewReceiptId: "receipt:canary-weird-1",
      },
    ];
  }

  const all = CORPUS_PARTITION_NAMES.flatMap((name) => partitions[name]);
  const ids = all.map((row) => row.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("corpus contains duplicate IDs");
  }

  // Preserve Epoch 008 foundation IDs exactly.
  for (const row of foundation.approved) {
    if (!partitions.approved.some((item) => item.id === row.id)) {
      throw new Error(`Epoch 008 approved id missing after extend: ${row.id}`);
    }
  }

  const retrievalDocs = all
    .filter((row) => row.partition !== "held-out")
    .map((row) => ({
      id: row.id,
      text: row.text,
      partition: row.partition,
      label: row.label || row.partition,
    }));
  const index = buildRetrievalIndex(retrievalDocs);
  const version = `contentgen-corpus/v1+${sha256(identityCanonicalJson({
    ids: ids.slice().sort(),
    partitions: Object.fromEntries(
      CORPUS_PARTITION_NAMES.map((name) => [name, partitions[name].length]),
    ),
  })).slice(0, 12)}`;

  const lineageLedger = all.map((row) => ({
    id: row.id,
    partition: row.partition,
    parentId: row.lineage?.parentId ?? null,
    transformation: row.lineage?.transformation ?? null,
    reviewReceiptId: row.reviewReceiptId,
  }));

  const artifact = {
    version,
    partitions,
    index,
    lineageLedger,
    thresholds: QUALITY_THRESHOLDS_V1.noveltyDuplicateThresholds,
    generatedAt: new Date().toISOString(),
  };

  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    for (const name of CORPUS_PARTITION_NAMES) {
      fs.writeFileSync(
        path.join(outDir, `${name}.jsonl`),
        partitions[name].map((row) => canonicalJson(row)).join("\n") +
          (partitions[name].length ? "\n" : ""),
      );
    }
    fs.writeFileSync(
      path.join(outDir, "lineage.json"),
      `${canonicalJson(lineageLedger)}\n`,
    );
    fs.writeFileSync(
      path.join(outDir, "index.json"),
      `${canonicalJson({
        version: index.version,
        documentCount: index.documents.length,
        avgdl: index.avgdl,
        documentFrequency: index.documentFrequency,
      })}\n`,
    );
    fs.writeFileSync(
      path.join(outDir, "corpus-manifest.json"),
      `${canonicalJson({
        version,
        counts: Object.fromEntries(
          CORPUS_PARTITION_NAMES.map((name) => [name, partitions[name].length]),
        ),
        epoch008ApprovedIds: foundation.approved.map((row) => row.id),
        generatedAt: artifact.generatedAt,
      })}\n`,
    );
  }

  return artifact;
}

function tokenize(text) {
  return String(text)
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function rhetoricalShapeMatch(a, b) {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  const union = new Set([...left, ...right]).size;
  if (!union) return 1;
  return [...left].filter((token) => right.has(token)).length / union;
}

function tfidfCosine(query, doc, index) {
  const qTerms = tokenize(query);
  const qtf = Object.fromEntries(
    [...new Set(qTerms)].map((term) => [
      term,
      qTerms.filter((item) => item === term).length / Math.max(1, qTerms.length),
    ]),
  );
  let dot = 0;
  let qn = 0;
  let dn = 0;
  for (const term of new Set([...Object.keys(qtf), ...Object.keys(doc.tfidf || {})])) {
    const idf = Math.log(
      (index.documents.length + 1) /
        ((index.documentFrequency[term] || 0) + 1),
    );
    const qv = (qtf[term] || 0) * idf;
    const dv = doc.tfidf?.[term] || 0;
    dot += qv * dv;
    qn += qv * qv;
    dn += dv * dv;
  }
  if (!qn || !dn) return 0;
  return dot / (Math.sqrt(qn) * Math.sqrt(dn));
}

export function similarity(candidateText, neighbor, index) {
  const bm = bm25(candidateText, index, index.documents.length).find(
    (row) => row.id === neighbor.id,
  );
  const bmScore = bm ? bm.score / (1 + bm.score) : 0;
  const cosine = tfidfCosine(candidateText, neighbor, index);
  const shape = rhetoricalShapeMatch(candidateText, neighbor.text || "");
  return Math.max(bmScore, cosine, shape);
}

export function novelty(candidateText, index) {
  let maxSim = 0;
  for (const doc of index.documents) {
    maxSim = Math.max(maxSim, similarity(candidateText, doc, index));
  }
  return 1 - maxSim;
}

export function directionalDuplicateClass(candidateText, index, partitionsById) {
  const thresholds = QUALITY_THRESHOLDS_V1.noveltyDuplicateThresholds;
  let best = { id: null, score: 0, partition: null };
  for (const doc of index.documents) {
    const score = similarity(candidateText, doc, index);
    if (score > best.score || (score === best.score && doc.id < best.id)) {
      best = { id: doc.id, score, partition: partitionsById.get(doc.id) };
    }
  }
  if (!best.id) return { class: "none", neighborId: null, score: 0 };
  if (best.partition === "approved" && best.score >= thresholds.approved) {
    return { class: "duplicate-approved", neighborId: best.id, score: best.score };
  }
  if (best.partition === "rejected" && best.score >= thresholds.rejected) {
    return { class: "duplicate-rejected", neighborId: best.id, score: best.score };
  }
  if (best.score >= thresholds.pending) {
    return { class: "duplicate-pending", neighborId: best.id, score: best.score };
  }
  return { class: "none", neighborId: best.id, score: best.score };
}

export function retrieve(query, artifact, limit = 8) {
  // Never retrieve held-out into judge/training prompts.
  const ranking = bm25(query, artifact.index, limit).filter((row) => {
    const partition = artifact.lineageLedger.find((item) => item.id === row.id)
      ?.partition;
    return partition !== "held-out";
  });
  return ranking;
}
