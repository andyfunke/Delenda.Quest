import assert from "node:assert/strict";
import test from "node:test";

const credential = await import(process.env.DELENDA_CREDENTIAL_BUNDLE);

const record = {
  publicSlug: "hermes-6682",
  campaignId: "#WAR-HERMES-6682",
  outcome: "victory",
  theater: "industrial",
  days: 19,
  campaignScore: 7421,
  scoringVersion: "campaign-score-v1",
  completedAt: 1_700_010_000_000,
};

test("campaign credentials expose one canonical simulation payload and SHA-256 digest", async () => {
  const first = await credential.campaignCredential(record);
  const second = await credential.campaignCredential({ ...record });
  assert.deepEqual(first, second);
  assert.equal(first.payload.credentialId, "DQ-hermes-6682");
  assert.equal(first.payload.issuer, "DELENDA.QUEST");
  assert.match(first.digest, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(credential.canonicalCredentialJson(first.payload), /email|owner|pseudonym/i);
});

test("the credential digest changes when an immutable scored field changes", async () => {
  const first = await credential.campaignCredential(record);
  const changed = await credential.campaignCredential({
    ...record,
    campaignScore: record.campaignScore + 1,
  });
  assert.notEqual(first.digest, changed.digest);
});
