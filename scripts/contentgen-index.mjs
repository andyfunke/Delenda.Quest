#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildCorpus } from "../packages/contentgen/src/corpus.mjs";
import { canonicalJson } from "../packages/contentgen-contracts/src/canonical.ts";

const args = process.argv.slice(2);
const get = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const corpus = get("--corpus", "content-quality/corpus");
const out = path.resolve(get("--out", ".tmp/contentgen-index"));
const artifact = buildCorpus({ corpusDir: path.resolve(corpus) });
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "retrieval-index.json"),
  `${canonicalJson({
    version: artifact.index.version,
    avgdl: artifact.index.avgdl,
    documentFrequency: artifact.index.documentFrequency,
    documents: artifact.index.documents.map((doc) => ({
      id: doc.id,
      partition: doc.partition,
      label: doc.label,
      tfidf: doc.tfidf,
      minhash: doc.minhash,
    })),
  })}\n`,
);
console.log(JSON.stringify({ ok: true, out, documents: artifact.index.documents.length }, null, 2));
