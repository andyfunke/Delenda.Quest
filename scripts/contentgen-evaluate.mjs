#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { evaluatePolicyFiles } from "../packages/contentgen-evaluate/src/evaluate.mjs";

function arg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1];
}

const policyPath = arg("--policy");
const heldOutPath = arg("--held-out");
const outDir = arg("--out", "content-quality/policy/out");
if (!policyPath || !heldOutPath) {
  console.error("Usage: npm run contentgen:evaluate -- --policy <file> --held-out <file>");
  process.exit(2);
}

const report = evaluatePolicyFiles(policyPath, heldOutPath);
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "evaluation-report.json");
writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, outFile, ...report }));
