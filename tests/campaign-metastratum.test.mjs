import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  assertTierIntensityLegal,
  contentLink,
  emptyMetastratum,
  restoreMetastratum,
} from "../packages/campaign-metastratum/src/types.mjs";
import { ESCALATORY_REGISTRY_V1 } from "../packages/campaign-metastratum/src/escalatory-registry.mjs";
import { generateAllTables } from "../packages/campaign-metastratum/src/tables-generate.mjs";
import { validatePacingTables } from "../packages/campaign-metastratum/src/tables-validate.mjs";
import { restoreCampaignSaveWithMetastratum } from "../app/campaign-metastratum.ts";
import { stableHash as substrateHash } from "../app/substrate/hash.ts";

test("tier/intensity legality", () => {
  assert.equal(assertTierIntensityLegal("routine", "none"), true);
  assert.throws(() => assertTierIntensityLegal("routine", "standard"));
  assert.throws(() => assertTierIntensityLegal("escalatory", "none"));
});

test("ContentLink rejects path traversal; registry carries TerminalRisk", () => {
  const link = contentLink({
    id: "l1",
    kind: "mechanic",
    targetId: "reinforce",
    mechanicIds: ["reinforce"],
  });
  assert.equal(link.targetId, "reinforce");
  assert.throws(() =>
    contentLink({ id: "bad", kind: "x", targetId: "../secret" }),
  );
  const doom = ESCALATORY_REGISTRY_V1.find((row) => row.terminalRisk === "doomsday");
  assert.ok(doom);
  assert.equal(doom.terminalEnvelopePpm.min, 50_000);
});

test("metastratum restore does not invent active operations", () => {
  const restored = restoreMetastratum({ day: 4, docket: ["a"] });
  assert.equal(restored.metastratum.activeOperation, null);
  assert.deepEqual(restored.docket, ["a"]);
  const typed = restoreCampaignSaveWithMetastratum({ campaignSeed: 1, day: 2 });
  assert.equal(typed.metastratum.narrativeSlots.length, 3);
});

test("stableHash consolidated to substrate/hash", () => {
  assert.ok(Number.isFinite(substrateHash("campaign-seed:1")));
  const source = readFileSync("app/campaign-substrate.ts", "utf8");
  assert.match(source, /from \"\.\/substrate\/hash\"/);
  assert.match(source, /export \{ stableHash \}/);
  assert.doesNotMatch(
    source,
    /const hashInt=\(text:string\)=>\{let h=2166136261/,
  );
});

test("independent validator accepts generated tables and anchors", () => {
  const bundle = generateAllTables();
  // Validator must not import generator — checked structurally.
  const validateSource = readFileSync(
    "packages/campaign-metastratum/src/tables-validate.mjs",
    "utf8",
  );
  assert.doesNotMatch(validateSource, /from [\"'].*tables-generate/);
  const report = validatePacingTables(bundle);
  assert.equal(report.ok, true, report.failures.join(","));
  assert.equal(bundle.lateRun.every((row) => row.adjustmentPpm === 0), true);
  assert.equal(emptyMetastratum().version, "campaign-metastratum/v1");
});
