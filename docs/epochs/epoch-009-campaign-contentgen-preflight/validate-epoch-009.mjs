#!/usr/bin/env node
/**
 * Independent Epoch 009 validator.
 * Reads Git objects and protected-file hashes only.
 * MUST NOT import application source modules.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const EPOCH008 = "0e4daf7266cd1e3f365adc47a4983f76779633e5";
const MANIFEST_PATH = join(
  __dirname,
  "integrity/immutability-manifest.json",
);

const REQUIRED_WHOLE_FILES = [
  "app/epoch-006-content.ts",
  "app/sub-mission-content.ts",
  "app/concepts.ts",
];

const REQUIRED_GAME_EXPORTS = [
  "STATE_ARCHETYPES",
  "ADVERSARY_PERSONALITIES",
  "THEATERS",
  "CAMPAIGN_PHASES",
  "CAMPAIGN_EVENTS",
  "MANEUVERS",
];

const REQUIRED_CAMPAIGN_EXPORTS = ["GENERIC_SITUATION_TEMPLATES"];

const EXPECTED_EPOCH008_FILES = [
  "app/ava/content-quality-manifest.ts",
  "content-quality/corpus/approved.jsonl",
  "content-quality/corpus/calibration.jsonl",
  "content-quality/corpus/rejected.jsonl",
  "docs/epochs/epoch-008-ava-quality-infrastructure/README.md",
  "docs/epochs/epoch-008-ava-quality-infrastructure/receipts/NODE-08.md",
  "package.json",
  "scripts/ava-content-quality.mjs",
  "tests/ava-content-quality-epoch-008.test.mjs",
].sort();

function fail(message) {
  console.error(`validate:epoch-009 FAIL — ${message}`);
  process.exit(1);
}

function nfc(text) {
  return text.normalize("NFC");
}

function sha256Text(text) {
  return createHash("sha256").update(Buffer.from(nfc(text), "utf8")).digest("hex");
}

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
}

function extractInitializer(filePath, name) {
  const abs = join(ROOT, filePath);
  const text = readFileSync(abs, "utf8");
  const sf = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let found = null;
  const visit = (node) => {
    if (found) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer
    ) {
      found = text.slice(node.initializer.getStart(sf), node.initializer.getEnd());
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!found) fail(`AST initializer missing: ${filePath} :: ${name}`);
  return found;
}

function main() {
  if (!existsSync(MANIFEST_PATH)) {
    fail(`missing immutability manifest at ${MANIFEST_PATH}`);
  }

  // Ancestry: Epoch 008 commit reachable from HEAD and origin/main tip ancestry.
  try {
    git(["cat-file", "-t", EPOCH008]);
  } catch {
    fail(`Epoch 008 commit ${EPOCH008} is not a git object`);
  }
  try {
    git(["merge-base", "--is-ancestor", EPOCH008, "HEAD"]);
  } catch {
    fail(`Epoch 008 commit ${EPOCH008} is not an ancestor of HEAD`);
  }
  try {
    git(["merge-base", "--is-ancestor", EPOCH008, "origin/main"]);
  } catch {
    fail(`Epoch 008 commit ${EPOCH008} is not an ancestor of origin/main`);
  }

  const diffFiles = git([
    "diff-tree",
    "--no-commit-id",
    "--name-only",
    "-r",
    EPOCH008,
  ])
    .split("\n")
    .filter(Boolean)
    .sort();

  if (JSON.stringify(diffFiles) !== JSON.stringify(EXPECTED_EPOCH008_FILES)) {
    fail(
      `Epoch 008 commit file set mismatch.\nexpected=${EXPECTED_EPOCH008_FILES.join(",")}\nactual=${diffFiles.join(",")}`,
    );
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  if (manifest.version !== "immutability-manifest/v1") {
    fail(`unexpected manifest version ${manifest.version}`);
  }
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    fail("manifest entries empty");
  }

  const paths = new Set(
    manifest.entries.map((entry) =>
      entry.hashType === "ast-initializer"
        ? `${entry.path}::${entry.exportName}`
        : entry.path,
    ),
  );

  for (const path of REQUIRED_WHOLE_FILES) {
    if (!paths.has(path)) fail(`protected whole-file omitted: ${path}`);
  }
  for (const name of REQUIRED_GAME_EXPORTS) {
    if (!paths.has(`app/game.ts::${name}`)) {
      fail(`protected game.ts export omitted: ${name}`);
    }
  }
  for (const name of REQUIRED_CAMPAIGN_EXPORTS) {
    if (!paths.has(`app/campaign-substrate.ts::${name}`)) {
      fail(`protected campaign-substrate export omitted: ${name}`);
    }
  }

  for (const entry of manifest.entries) {
    if (entry.hashType === "whole-file") {
      const abs = join(ROOT, entry.path);
      if (!existsSync(abs)) fail(`missing protected file ${entry.path}`);
      const digest = sha256Text(readFileSync(abs, "utf8"));
      if (digest !== entry.sha256) {
        fail(`whole-file hash drift ${entry.path}: expected ${entry.sha256} got ${digest}`);
      }
      continue;
    }
    if (entry.hashType === "ast-initializer") {
      const init = extractInitializer(entry.path, entry.exportName);
      const digest = sha256Text(init);
      if (digest !== entry.sha256) {
        fail(
          `ast-initializer hash drift ${entry.path}::${entry.exportName}: expected ${entry.sha256} got ${digest}`,
        );
      }
      continue;
    }
    fail(`unknown hashType ${entry.hashType}`);
  }

  console.log("validate:epoch-009 PASS");
  console.log(`epoch008Files=${diffFiles.length}`);
  console.log(`protectedEntries=${manifest.entries.length}`);
  console.log(`epoch008Commit=${EPOCH008}`);
  console.log(`headContainsEpoch008=true`);
  console.log(`originMainContainsEpoch008=true`);
}

main();
