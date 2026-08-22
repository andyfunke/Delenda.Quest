import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const substrate = await import(process.env.DELENDA_SUBSTRATE_CORE_BUNDLE);
const scheduler = await import(
  new URL("../packages/campaign-scheduler/src/hash.mjs", import.meta.url)
);
const lab = await import(
  new URL("../packages/contentgen-lab/src/hash.mjs", import.meta.url)
);

const ASCII_CORPUS = [
  "",
  "docket-1",
  "seed:17:day:4:route:CALC-9",
  "execution-scene:res:12:hot",
  "campaign-metastratum/v1:slot:romantic",
  "a|b|c",
  "prosecution-cold/v1",
];

test("every seeded-draw hash copy agrees on ASCII tickets", () => {
  for (const ticket of ASCII_CORPUS) {
    assert.equal(scheduler.hashInt(ticket), substrate.hashInt(ticket), ticket);
    assert.equal(lab.hashInt(ticket), substrate.hashInt(ticket), ticket);
    assert.equal(scheduler.stableHash(ticket), substrate.stableHash(ticket), ticket);
    assert.equal(lab.stableHash(ticket), substrate.stableHash(ticket), ticket);
  }
});

test("the NFC divergence of the offline copies is pinned, not silent", () => {
  // The canonical app-side hash does not normalize (tickets are ASCII by
  // construction); the offline scheduler and lab copies NFC-normalize.
  // The scheduler wiring epoch must reconcile this; until then, any silent
  // change to either behavior fails here.
  const decomposed = "cafe\u0301"; // non-NFC: 'e' + combining acute
  const composed = decomposed.normalize("NFC");
  assert.notEqual(decomposed.length, composed.length);
  assert.equal(scheduler.hashInt(decomposed), substrate.hashInt(composed));
  assert.equal(lab.hashInt(decomposed), substrate.hashInt(composed));
  assert.notEqual(scheduler.hashInt(decomposed), substrate.hashInt(decomposed));
});

test("no inline FNV-1a copies remain in app draw code", () => {
  for (const path of [
    "app/game.ts",
    "app/submission-schema.ts",
    "app/campaign-substrate.ts",
  ]) {
    const source = readFileSync(resolve(path), "utf8");
    assert.doesNotMatch(source, /2166136261/, path);
  }
});
