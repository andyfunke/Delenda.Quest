#!/usr/bin/env node
import path from "node:path";
import { buildCorpus } from "../packages/contentgen/src/corpus.mjs";

const args = process.argv.slice(2);
const get = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const corpus = get("--corpus", "content-quality/corpus");
const out = path.resolve(get("--out", ".tmp/contentgen-corpus"));
const artifact = buildCorpus({ corpusDir: path.resolve(corpus), outDir: out });
console.log(
  JSON.stringify(
    {
      ok: true,
      out,
      version: artifact.version,
      counts: Object.fromEntries(
        Object.entries(artifact.partitions).map(([key, rows]) => [key, rows.length]),
      ),
    },
    null,
    2,
  ),
);
