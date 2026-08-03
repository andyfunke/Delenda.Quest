#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { verifyPolicyPromotion } from "../packages/contentgen-policy/src/verify.mjs";

function arg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1];
}

const manifestPath = arg("--manifest");
const heldOutPath = arg("--held-out", "content-quality/policy/fixtures/held-out.jsonl");
const baselinePath = arg("--baseline", "content-quality/policy/promoted/quality-policy.v1.json");
if (!manifestPath) {
  console.error("Usage: npm run contentgen:verify-policy -- --manifest <file>");
  process.exit(2);
}

const candidate = JSON.parse(readFileSync(manifestPath, "utf8"));
const promoted = JSON.parse(readFileSync(baselinePath, "utf8"));
const heldOut = readFileSync(heldOutPath, "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const report = verifyPolicyPromotion({
  candidate,
  promoted,
  heldOutRows: heldOut,
});

console.log(JSON.stringify({ ok: report.eligible, ...report }, null, 2));
process.exit(report.eligible ? 0 : 1);
