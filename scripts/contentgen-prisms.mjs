#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { decompile } from "../packages/contentgen/src/decompile.mjs";
import { blastRadius, PRISMS } from "../packages/contentgen/prisms/prisms.mjs";
import { canonicalJson } from "../packages/contentgen-contracts/src/canonical.ts";

const args = process.argv.slice(2);
const get = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const matrixPath = get("--matrix");
const outDir = path.resolve(get("--out", ".tmp/contentgen-prisms"));
if (!matrixPath) {
  console.error("usage: contentgen:prisms -- --matrix <feature-matrix.jsonl> --out <dir>");
  process.exit(2);
}

const rows = fs
  .readFileSync(path.resolve(matrixPath), "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .map((row) => ({
    candidateId: row.candidateId,
    medium: row.medium,
    projections: row.projections,
    shared: row.shared,
  }));

const report = {
  version: "contentgen-blast/v1",
  prisms: PRISMS.map((prism) => blastRadius(prism, rows)),
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "blast-zone-report.json"),
  `${canonicalJson(report)}\n`,
);
console.log(JSON.stringify({ ok: true, out: outDir, prismCount: PRISMS.length }, null, 2));
