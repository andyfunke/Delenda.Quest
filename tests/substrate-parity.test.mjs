import assert from "node:assert/strict";
import test from "node:test";

const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);
const services = await import(process.env.DELENDA_SUBSTRATE_SERVICES_BUNDLE);
const terminal = await import(process.env.DELENDA_TERMINAL_CORE_BUNDLE);
const ava = await import(process.env.DELENDA_SUBSTRATE_AVA_BUNDLE);

const ctxFor = (state, surface) => ({
  playerId: "parity-player",
  campaignId: state.campaignId,
  campaignRevision: `${state.day}:${state.actions}`,
  surface,
  authority: "command",
  nowMs: 1_700_000_200_000,
});

test("web, ava, and terminal retrieve identical docket semantics", () => {
  const state = game.initialState({ seed: 99 });
  const web = services.getVisibleDocket(ctxFor(state, "web"), state, "production");
  const avaDisc = ava.initialDiscourse(ctxFor(state, "ava"), "parity");
  const avaRun = ava.runAvaClassic("production", ctxFor(state, "ava"), state, avaDisc);
  const session = terminal.createTerminalSession(true);
  const term = terminal.runTerminalLine(
    "production",
    ctxFor(state, "ssh"),
    state,
    session,
  );

  assert.deepEqual(web.response.fact.choiceIds, avaRun.response.fact.choiceIds);
  assert.deepEqual(web.response.fact.choiceIds, term.response.fact.choiceIds);
  assert.deepEqual(web.response.fact.familyIds, term.response.fact.familyIds);
});

test("prepare through each adapter yields same mechanic and cost semantics", () => {
  const base = game.initialState({ seed: 100 });
  const docket = services.getVisibleDocket(ctxFor(base, "web"), base, "production");
  const choiceId = docket.response.fact.choiceIds[0];

  const web = services.prepareOrder(ctxFor(docket.state, "web"), docket.state, choiceId, "p-web");
  const termSession = terminal.createTerminalSession(true);
  termSession.discourse.lastVisibleChoiceIds = docket.response.fact.choiceIds;
  const term = terminal.runTerminalLine(
    `prepare ${choiceId}`,
    ctxFor(docket.state, "ssh"),
    docket.state,
    termSession,
  );

  assert.equal(web.response.status, "PREPARED");
  assert.equal(term.response.status, "PREPARED");
  assert.equal(web.response.fact.normalizedAction.mechanicId, choiceId);
  assert.equal(term.response.fact.normalizedAction.mechanicId, choiceId);
  assert.equal(web.response.fact.orderCost, term.response.fact.orderCost);
  assert.equal(web.state.actions, base.actions);
  assert.equal(term.state.actions, base.actions);
});
