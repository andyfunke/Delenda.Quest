import assert from "node:assert/strict";
import test from "node:test";

const parser = await import(process.env.DELENDA_SUBSTRATE_PARSER_BUNDLE);

const exact = [
  "help",
  "brief",
  "status",
  "production",
  "military",
  "diplomacy",
  "diplomacy orison",
  "show choice-1",
  "ask ava what now",
  "advise",
  "advise production",
  "advise military",
  "advise diplomacy orison",
  "compare a b",
  "compare a b c",
  "rank production",
  "rank military",
  "rank diplomacy orison",
  "prepare choice-1",
  "confirm prp_abc",
  "cancel prp_abc",
  "interrupts",
  "missions",
  "service record",
  "recent dispatches",
  "whoami",
  "logout",
  "quit",
];

test("every exact command parses", () => {
  for (const line of exact) {
    const result = parser.parseDelendaCommand(line);
    assert.equal(result.ok, true, line);
  }
});

test("aliases normalize", () => {
  const cases = [
    ["daily brief", "BRIEF"],
    ["campaign brief", "BRIEF"],
    ["situation", "STATUS"],
    ["prod", "SHOW_DOCKET"],
    ["mil", "SHOW_DOCKET"],
    ["diplo", "SHOW_DOCKET"],
    ["recommend", "ADVISE"],
    ["execute choice-1", "PREPARE"],
    ["issue choice-1", "PREPARE"],
    ["choose choice-1", "PREPARE"],
    ["versus a b", "COMPARE"],
    ["vs a b", "COMPARE"],
    ["record", "BATTLE_LOG"],
    ["service record", "BATTLE_LOG"],
    ["battle log", "BATTLE_LOG"],
    ["history", "RECENT_DISPATCHES"],
    ["exit", "QUIT"],
  ];
  for (const [line, operation] of cases) {
    const result = parser.parseDelendaCommand(line);
    assert.equal(result.ok, true, line);
    assert.equal(result.command.operation, operation, line);
  }
});

test("numeric shortcuts resolve from discourse", () => {
  const result = parser.parseDelendaCommand("prepare 2", {
    lastVisibleChoiceIds: ["a", "b", "c"],
    numericShortcuts: { "1": "a", "2": "b", "3": "c" },
  });
  assert.equal(result.ok, true);
  assert.equal(result.command.targetIds[0], "b");
});

test("bare affirmative blocked without active proposal", () => {
  const result = parser.parseDelendaCommand("yes", {}, { interactive: true });
  assert.equal(result.ok, false);
  assert.equal(result.status, "CONFIRMATION_REQUIRED");
});

test("yes confirms only with single rendered proposal", () => {
  const result = parser.parseDelendaCommand(
    "yes",
    {
      activeProposalToken: "prp_1",
      confirmationPhraseRendered: true,
      activeProposalExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
    { interactive: true },
  );
  assert.equal(result.ok, true);
  assert.equal(result.command.operation, "CONFIRM");
});

test("unsafe control sequences rejected", () => {
  const result = parser.parseDelendaCommand("brief\u001b]8;;http://x\u0007");
  assert.equal(result.ok, false);
  assert.equal(result.code, "UNSAFE_CONTROL_SEQUENCE");
});

test("unknown input returns examples", () => {
  const result = parser.parseDelendaCommand("do the thing");
  assert.equal(result.ok, false);
  assert.ok(result.examples?.length);
});
