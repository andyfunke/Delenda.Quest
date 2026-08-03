#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { runJudgeBatch } from "../packages/contentgen-judge/src/runner.mjs";

function arg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1];
}

const batchPath = arg("--batch");
const judgeId = arg("--judge", "NONE");
const outDir = arg("--out", "content-quality/judge/out");

if (!batchPath) {
  console.error("Usage: npm run contentgen:judge -- --batch <file> --judge <id|NONE> [--out dir]");
  process.exit(2);
}

if (judgeId !== "NONE") {
  console.error(
    JSON.stringify({
      ok: false,
      error: "PROVIDER_AUTHORIZATION_ABSENT",
      note: "Epoch 016 is not operational with judgeId != NONE until provider auth.",
    }),
  );
  process.exit(1);
}

const batch = JSON.parse(readFileSync(batchPath, "utf8"));
const result = await runJudgeBatch(batch, { judgeId: "NONE", providerAuthorized: false });
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `judge-${batch.id ?? "batch"}-NONE.json`);
writeFileSync(outFile, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, judgeId: "NONE", outFile, queueSize: result.queue.length }));
