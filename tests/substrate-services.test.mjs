import assert from "node:assert/strict";
import test from "node:test";

const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);
const services = await import(process.env.DELENDA_SUBSTRATE_SERVICES_BUNDLE);

const ctx = (state, nowMs = 1_700_000_000_000) => ({
  playerId: "player-1",
  campaignId: state.campaignId,
  campaignRevision: `${state.day}:${state.actions}`,
  surface: "web",
  authority: "command",
  nowMs,
});

test("prepare spends zero orders; confirm spends declared cost", () => {
  const state = game.initialState({ seed: 7 });
  const docket = services.getVisibleDocket(ctx(state), state, "production");
  const choiceId = docket.response.fact.choiceIds[0];
  const prepared = services.prepareOrder(ctx(docket.state), docket.state, choiceId, "idem-1");
  assert.equal(prepared.response.status, "PREPARED");
  assert.equal(prepared.state.actions, state.actions);
  const confirmed = services.confirmOrder(
    ctx(prepared.state),
    prepared.state,
    prepared.response.fact.proposalToken,
    "idem-confirm-1",
  );
  assert.equal(confirmed.response.status, "EXECUTED");
  assert.equal(confirmed.state.actions, state.actions - 1);
});

test("repeat idempotency and consumed token behavior", () => {
  const state = game.initialState({ seed: 8 });
  const docket = services.getVisibleDocket(ctx(state), state, "military");
  const choiceId = docket.response.fact.choiceIds[0];
  const prepared = services.prepareOrder(ctx(docket.state), docket.state, choiceId, "idem-2");
  const token = prepared.response.fact.proposalToken;
  const first = services.confirmOrder(ctx(prepared.state), prepared.state, token, "idem-c2");
  const second = services.confirmOrder(ctx(first.state), first.state, token, "idem-c2");
  assert.equal(first.response.status, "EXECUTED");
  assert.equal(second.response.status, "ALREADY_EXECUTED");
  assert.equal(second.state.actions, first.state.actions);
});

test("expired token cannot execute", () => {
  const state = game.initialState({ seed: 9 });
  const docket = services.getVisibleDocket(ctx(state), state, "production");
  const choiceId = docket.response.fact.choiceIds[0];
  const prepared = services.prepareOrder(ctx(docket.state, 1000), docket.state, choiceId, "idem-3");
  const expired = services.confirmOrder(
    ctx(prepared.state, 1000 + 11 * 60 * 1000),
    prepared.state,
    prepared.response.fact.proposalToken,
    "idem-c3",
  );
  assert.equal(expired.response.status, "EXPIRED");
});

test("staff cannot prepare", () => {
  const state = game.initialState({ seed: 10 });
  const docket = services.getVisibleDocket(ctx(state), state, "production");
  const choiceId = docket.response.fact.choiceIds[0];
  const staff = { ...ctx(docket.state), authority: "staff" };
  const prepared = services.prepareOrder(staff, docket.state, choiceId, "idem-4");
  assert.equal(prepared.response.status, "FORBIDDEN");
});

test("deep link to invisible choice is unavailable", () => {
  const state = game.initialState({ seed: 11 });
  const response = services.getVisibleChoice(ctx(state), state, "definitely-not-visible");
  assert.equal(response.status, "NOT_FOUND");
});
