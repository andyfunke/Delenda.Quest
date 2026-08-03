#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { decompile } from "../packages/contentgen/src/decompile.mjs";
import { dualAuthorityLint } from "../packages/contentgen/src/authority-dual.mjs";
import { applyPrisms, blastRadius, PRISMS } from "../packages/contentgen/prisms/prisms.mjs";
import { canonicalJson } from "../packages/contentgen-contracts/src/canonical.ts";

const args = process.argv.slice(2);
const get = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

const manifestPath = get("--manifest");
const outDir = path.resolve(get("--out", ".tmp/contentgen-decompile"));
if (!manifestPath) {
  console.error("usage: contentgen:decompile -- --manifest <candidates.jsonl> --out <dir>");
  process.exit(2);
}

const candidates = fs
  .readFileSync(path.resolve(manifestPath), "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const decompiled = candidates.map((candidate) => decompile(candidate));
const rows = decompiled.map((row) => {
  const dual = dualAuthorityLint(row.textExact);
  const prismmed = applyPrisms(row, decompiled);
  return {
    ...row,
    dualAuthority: dual,
    compileStatus:
      dual.status === "HARD_FAILURE" ? "HARD_FAILURE" : prismmed.compileStatus,
    prismVerdicts: prismmed.verdicts,
    tags: dual.tags,
  };
});

const matrix = rows.map((row) => ({
  candidateId: row.candidateId,
  medium: row.medium,
  shared: row.shared,
  mediumFeatures: row.mediumFeatures,
  claims: row.claims,
  projections: {
    P0: row.projections.P0,
    P1: row.projections.P1,
    P2: row.projections.P2,
    P3: row.projections.P3,
    P4: row.projections.P4,
  },
  compileStatus: row.compileStatus,
  tags: row.tags,
}));

const blast = PRISMS.map((prism) => blastRadius(prism, rows));

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "feature-matrix.jsonl"),
  matrix.map((row) => canonicalJson(row)).join("\n") + "\n",
);
fs.writeFileSync(
  path.join(outDir, "prism-verdicts.jsonl"),
  rows
    .map((row) =>
      canonicalJson({
        candidateId: row.candidateId,
        compileStatus: row.compileStatus,
        verdicts: row.prismVerdicts,
        dualAuthority: row.dualAuthority,
      }),
    )
    .join("\n") + "\n",
);
fs.writeFileSync(
  path.join(outDir, "blast-zone-report.json"),
  `${canonicalJson({ version: "contentgen-blast/v1", prisms: blast })}\n`,
);
console.log(
  JSON.stringify(
    {
      ok: true,
      out: outDir,
      rows: rows.length,
      hardFailures: rows.filter((row) => row.compileStatus === "HARD_FAILURE")
        .length,
    },
    null,
    2,
  ),
);
