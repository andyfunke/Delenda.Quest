import assert from "node:assert/strict";
import test from "node:test";

const moduleUrl = process.env.DELENDA_AVA_RELEVANCE_BUNDLE;
if (!moduleUrl) throw new Error("DELENDA_AVA_RELEVANCE_BUNDLE is required");
const { avaRelevanceAudit, compileAvaRelevantAside } = await import(moduleUrl);

test("the relevance graph has unique, bounded authored realizations", () => {
  const audit = avaRelevanceAudit();
  assert.equal(audit.version, "ava-relevance-graph/v1");
  assert.equal(audit.realizationCount, 15);
  assert.equal(new Set(audit.ids).size, audit.ids.length);
  assert.ok(audit.chords.length >= 12);
});

test("semantic chords select clever lines relevant to the player's surface", () => {
  assert.equal(compileAvaRelevantAside("Maybe we can afford the losses?").line,
    "Calling a loss acceptable does not make it smaller. It identifies who was absent from the negotiation.");
  assert.equal(compileAvaRelevantAside("We should wait until later.").chord, "delay");
  assert.equal(compileAvaRelevantAside("Can we trust their report?").chord, "trust");
  assert.equal(compileAvaRelevantAside("Which option is better?").chord, "choice");
});

test("selection is deterministic and abstains without a declared chord", () => {
  const first = compileAvaRelevantAside("This is urgent. What should we do?", 7);
  assert.deepEqual(compileAvaRelevantAside("This is urgent. What should we do?", 7), first);
  assert.equal(first.chord, "urgency");
  assert.equal(compileAvaRelevantAside("purple bicycles sing softly"), null);
  assert.equal(compileAvaRelevantAside(undefined), null);
});

test("realizations contain no state-changing or fabricated outcome claims", () => {
  const forbidden = /\b(?:issued|executed|confirmed|will win|enemy will|casualties will)\b/i;
  for (const input of ["urgent", "losses", "enemy", "plan", "trust", "which option?"])
    assert.doesNotMatch(compileAvaRelevantAside(input).line, forbidden);
});
