#!/usr/bin/env node
import path from "node:path";
import { enumerate, writeEnumeration } from "../packages/contentgen/src/enumerate.mjs";

const args = process.argv.slice(2);
const get = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

const seed = Number(get("--seed", "1"));
const out = get("--out", ".tmp/contentgen-enumerate");
const result = writeEnumeration(path.resolve(out), enumerate({ globalSeed: seed }));
console.log(
  JSON.stringify(
    {
      ok: true,
      out,
      candidateCount: result.manifest.candidateCount,
      failureCount: result.manifest.failureCount,
      packCapacity: result.manifest.packCapacity,
      identityHash: result.identityHash,
    },
    null,
    2,
  ),
);
