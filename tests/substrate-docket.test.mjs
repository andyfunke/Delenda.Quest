import assert from "node:assert/strict";
import test from "node:test";

const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);
const docket = await import(process.env.DELENDA_SUBSTRATE_DOCKET_BUNDLE);
const adapters = await import(
  process.env.DELENDA_SUBSTRATE_DOCKET_BUNDLE
).then(async () => {
  // content adapters are bundled through docket; inventory via game FAMILIES
  return null;
});
void adapters;

const state = () => game.initialState({ seed: 42, theater: "lowland" });

test("inventory counts remain 56 families / 237 choices", () => {
  assert.equal(game.FAMILIES.length, 56);
  assert.equal(
    game.FAMILIES.reduce((n, family) => n + family.choices.length, 0),
    237,
  );
});

test("production presents exactly two clades when eligible", () => {
  const s = state();
  const { record } = docket.compileDailyDocket(s, "production");
  assert.equal(record.selectedCladeIds.length, 2);
  assert.ok(record.selectedFamilyIds.length >= 2);
  for (const familyId of record.selectedFamilyIds) {
    const family = game.FAMILIES.find((item) => item.id === familyId);
    const count = record.selectedChoiceIds.filter((id) =>
      family.choices.some((choice) => choice.id === id),
    ).length;
    assert.ok(count >= 2 && count <= 3, `${familyId} choices=${count}`);
  }
});

test("military presents exactly two clades when eligible", () => {
  const s = state();
  const { record } = docket.compileDailyDocket(s, "military");
  assert.equal(record.selectedCladeIds.length, 2);
});

test("diplomacy presents one tree per active actor", () => {
  const s = state();
  assert.equal(s.actors.length, 4);
  for (const actor of s.actors) {
    const { record } = docket.compileDailyDocket(s, "diplomacy", actor.id);
    assert.equal(record.actorId, actor.id);
    assert.equal(record.selectedFamilyIds.length, 1);
    assert.ok(record.selectedChoiceIds.length >= 2);
  }
});

test("same state produces identical docket and refresh does not reroll", () => {
  const s = state();
  const a = docket.compileDailyDocket(s, "production");
  const b = docket.compileDailyDocket(a.state, "production");
  assert.deepEqual(a.record.selectedChoiceIds, b.record.selectedChoiceIds);
  assert.equal(a.record.selectionTicket, b.record.selectionTicket);
});

test("spending an order does not reroll remaining choices", () => {
  const s = state();
  const first = docket.compileDailyDocket(s, "production");
  const family = game.FAMILIES.find((item) =>
    first.record.selectedFamilyIds.includes(item.id),
  );
  const choice = family.choices.find((item) =>
    first.record.selectedChoiceIds.includes(item.id),
  );
  const spent = game.commit(first.state, family, choice);
  const second = docket.compileDailyDocket(spent, "production");
  assert.deepEqual(first.record.selectedChoiceIds, second.record.selectedChoiceIds);
});

test("candidate set hash is stable for identical eligibility", () => {
  const s = state();
  const a = docket.compileDailyDocket(s, "military").record;
  const b = docket.compileDailyDocket(s, "military").record;
  assert.equal(a.candidateSetHash, b.candidateSetHash);
});

test("initial state compiles all daily dockets", () => {
  const s = state();
  const day = s.dailyDockets.filter((item) => item.campaignDay === s.day);
  assert.equal(day.length, 6); // production + military + 4 diplomacy
});
