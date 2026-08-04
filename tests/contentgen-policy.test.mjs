import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  mutateForAcceptance,
  verifyPolicyPromotion,
} from "../packages/contentgen-policy/src/verify.mjs";

function load() {
  const promoted = JSON.parse(
    readFileSync("content-quality/policy/promoted/quality-policy.v1.json", "utf8"),
  );
  const heldOut = readFileSync(
    "content-quality/policy/fixtures/held-out.jsonl",
    "utf8",
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  return { promoted, heldOut };
}

test("promoted manifest verifies", () => {
  const { promoted, heldOut } = load();
  const report = verifyPolicyPromotion({
    candidate: promoted,
    promoted,
    heldOutRows: heldOut,
  });
  assert.equal(report.eligible, true, report.failures.join(","));
});

test("mutations fail promotion", () => {
  const { promoted, heldOut } = load();
  const mutants = mutateForAcceptance(promoted);

  const undeclared = verifyPolicyPromotion({
    candidate: {
      ...mutants.undeclaredFeature,
      promotionReceipt: promoted.promotionReceipt,
      proposedPrismsReviewed: true,
    },
    promoted,
    heldOutRows: heldOut,
  });
  assert.equal(undeclared.eligible, false);
  assert.ok(undeclared.failures.some((f) => f.includes("UNDECLARED")));

  const unsigned = verifyPolicyPromotion({
    candidate: {
      ...promoted,
      promotionReceipt: { ...promoted.promotionReceipt, humanSigned: false },
    },
    promoted,
    heldOutRows: heldOut,
  });
  assert.equal(unsigned.eligible, false);
  assert.ok(unsigned.failures.includes("HUMAN_SIGNATURE_REQUIRED"));
});

test("hash tamper detected when raw weights supplied", () => {
  const { promoted, heldOut } = load();
  const tampered = {
    ...promoted,
    policyHash: "deadbeef".repeat(8),
    rawWeights: promoted.weights.map((w) => w.value),
    config: { version: "trainer-config/v1" },
  };
  const report = verifyPolicyPromotion({
    candidate: tampered,
    promoted,
    heldOutRows: heldOut,
  });
  assert.ok(report.failures.includes("POLICY_HASH_TAMPER"));
});
