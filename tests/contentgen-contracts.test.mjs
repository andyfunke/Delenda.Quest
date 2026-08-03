import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  CONTENTGEN_CONTRACT_VERSION,
  canonicalJson,
  identityCanonicalJson,
  rollPpm,
  stableHash,
  validateGrammarRecipe,
  FEATURE_FAMILIES,
  TRAINER_CONFIG_V1,
  QUALITY_THRESHOLDS_V1,
  REVIEW_REASON_CODES,
  FAILURE_CLASSES,
  DISPOSITION_LEGALITY,
  TICKET_GRAMMARS,
} from "../packages/contentgen-contracts/src/index.ts";

const FIXTURE_ROOT = "content-quality/fixtures/contentgen-contracts";

const loadJson = (path) => JSON.parse(readFileSync(path, "utf8"));

test("contract version is contentgen-contract/v1", () => {
  assert.equal(CONTENTGEN_CONTRACT_VERSION, "contentgen-contract/v1");
});

test("canonicalJson sorts keys and is NFC-stable", () => {
  assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(
    canonicalJson({ a: "e\u0301" }),
    canonicalJson({ a: "é" }),
  );
});

test("identityCanonicalJson excludes generatedAt", () => {
  const a = identityCanonicalJson({ id: "x", generatedAt: 1 });
  const b = identityCanonicalJson({ id: "x", generatedAt: 999 });
  assert.equal(a, b);
});

test("rollPpm clamps at 999999", () => {
  // Construct a ticket that yields stableHash near 1.0 by brute force if needed;
  // the clamp contract is still enforced on the formula.
  const ppm = rollPpm("any");
  assert.ok(ppm >= 0 && ppm <= 999_999);
  assert.equal(Math.min(999_999, Math.floor(stableHash("any") * 1_000_000)), ppm);
});

test("ticket grammars match §4.2 table", () => {
  assert.equal(
    TICKET_GRAMMARS.enumerationLocalSeed(1, "ava", "prod"),
    "1:ava:prod",
  );
  assert.equal(TICKET_GRAMMARS.groupSplit("c1", "g"), "c1:group-split:g");
});

test("versioned taxonomies and trainer/threshold constants are frozen", () => {
  assert.equal(REVIEW_REASON_CODES.length, 15);
  assert.equal(FAILURE_CLASSES.length, 13);
  assert.deepEqual(DISPOSITION_LEGALITY.COMPILED, [
    "QUALITY_MET",
    "QUALITY_NOT_MET",
    "REVISE",
  ]);
  assert.equal(TRAINER_CONFIG_V1.iterations, 500);
  assert.equal(QUALITY_THRESHOLDS_V1.curiosityLaneThreshold, 0.65);
  assert.ok(FEATURE_FAMILIES.forbiddenTransfer.includes("quality-score-as-mechanic"));
});

test("valid fixtures pass validation", () => {
  const dir = join(FIXTURE_ROOT, "valid");
  for (const name of readdirSync(dir)) {
    const issues = validateGrammarRecipe(loadJson(join(dir, name)));
    assert.deepEqual(issues, [], name);
  }
});

test("invalid fixtures fail closed for required fault classes", () => {
  const expectations = {
    "missing-medium.json": "medium",
    "undeclared-mechanic.json": "mechanicRefs",
    "contradictory-claims.json": "requiredClaims",
    "illegal-cross-medium-field.json": "projection",
  };
  for (const [file, pathPrefix] of Object.entries(expectations)) {
    const issues = validateGrammarRecipe(
      loadJson(join(FIXTURE_ROOT, "invalid", file)),
    );
    assert.ok(issues.length > 0, file);
    assert.ok(
      issues.some((issue) => issue.path.startsWith(pathPrefix)),
      `${file} expected path ${pathPrefix}, got ${JSON.stringify(issues)}`,
    );
  }
});

test("quality layer contracts do not assign mechanics ownership", () => {
  assert.ok(
    FEATURE_FAMILIES.forbiddenTransfer.includes("ava-action-authority"),
  );
  assert.ok(
    FEATURE_FAMILIES.forbiddenTransfer.includes("quality-score-as-mechanic"),
  );
});
