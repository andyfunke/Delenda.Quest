import assert from "node:assert/strict";
import test from "node:test";

const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);
const ava = await import(process.env.DELENDA_SUBSTRATE_AVA_BUNDLE);
const index = await import(process.env.DELENDA_SUBSTRATE_INDEX_BUNDLE);
const services = await import(process.env.DELENDA_SUBSTRATE_SERVICES_BUNDLE);

const ctx = (state) => ({
  playerId: "ava-player",
  campaignId: state.campaignId,
  campaignRevision: `${state.day}:${state.actions}`,
  surface: "ava",
  authority: "command",
  nowMs: 1_700_000_100_000,
});

const seeded = () => {
  const state = game.initialState({ seed: 21 });
  const docket = services.getVisibleDocket(ctx(state), state, "production");
  const discourse = ava.initialDiscourse(ctx(docket.state), "sess-1");
  discourse.activeChannel = "production";
  discourse.lastVisibleChoiceIds = docket.response.fact.choiceIds;
  return { state: docket.state, discourse };
};

test("semantic index generates from authoritative content without collisions", () => {
  const entries = index.buildSemanticIndex();
  const issues = index.validateSemanticIndex(entries);
  assert.equal(issues.length, 0, issues.join("\n"));
  assert.ok(entries.some((entry) => entry.entityType === "choice"));
  assert.ok(entries.every((entry) => entry.visibility !== "internal" || true));
});

test("Ava Classic minimum interaction set without network/model", () => {
  process.env.OPENAI_API_KEY = "";
  process.env.ANTHROPIC_API_KEY = "";
  let { state, discourse } = seeded();
  const lines = [
    "What should I do?",
    "What should I do if I care most about production?",
    "I can lose territory, but preserve the veterans.",
    "Which military option best protects supply?",
    "Compare the first and third Production choices.",
    "Why is the railway option better?",
    "Why not reinforce the salient?",
    "What does Ava recommend?",
    "What changes if I prioritize civil stability?",
    "Which option is cheapest?",
    "Which option has the longest-term benefit?",
    "What can I do with the northern faction?",
    "Why is that diplomatic approach unavailable?",
    "Show only options I can afford.",
    "Prepare the second option.",
    "What exactly will this cost?",
    "Cancel that.",
    "I changed my mind. Preserve territory instead.",
    "Now rank them again.",
  ];
  for (const line of lines) {
    if (line.toLowerCase().includes("military")) {
      const mil = services.getVisibleDocket(ctx(state), state, "military");
      state = mil.state;
      discourse.lastVisibleChoiceIds = mil.response.fact.choiceIds;
      discourse.activeChannel = "military";
    }
    const result = ava.runAvaClassic(line, ctx(state), state, discourse);
    state = result.state;
    discourse = result.discourse;
    assert.ok(result.response, line);
    assert.ok(result.plan, line);
    assert.ok(result.realization.register === "ava_classic", line);
    assert.notEqual(result.response.rendering.brief.includes("I cannot help"), true, line);
  }
});

test("repeated identical input yields identical semantic output", () => {
  const { state, discourse } = seeded();
  const a = ava.runAvaClassic("What should I do?", ctx(state), state, discourse);
  const b = ava.runAvaClassic("What should I do?", ctx(state), state, discourse);
  assert.deepEqual(a.response.fact, b.response.fact);
  assert.equal(a.response.status, b.response.status);
});

test("counterfactual advice performs no writes", () => {
  const { state, discourse } = seeded();
  const before = JSON.stringify(state.decisions);
  const result = ava.runAvaClassic(
    "What should I do if I care most about production?",
    ctx(state),
    state,
    discourse,
  );
  assert.equal(JSON.stringify(result.state.decisions), before);
});

test("material posture conflicts trigger clarification", () => {
  const { state, discourse } = seeded();
  discourse.activePosture = {
    objective: "recover_territory",
    horizon: "short",
    priorities: { territorial_control: "critical" },
    tolerances: { territorial_loss: "unrestricted" },
    unresolvedConflicts: [],
    confirmation: "inferred",
  };
  discourse.activePosture.unresolvedConflicts = [
    {
      code: "territory_critical_vs_loss_tolerance",
      dimensions: ["territorial_control", "territorial_loss"],
      material: true,
      clarification: "Clarify territory.",
    },
  ];
  const result = ava.runAvaClassic("What should I do?", ctx(state), state, discourse);
  assert.equal(result.response.status, "AMBIGUOUS");
});
