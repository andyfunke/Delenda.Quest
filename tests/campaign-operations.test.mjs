import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advanceOperationDay,
  mainThreadPrompt,
  migratePreMetastratumSave,
  resolveLegacyOneDayManeuver,
  semanticIdsEqual,
  startOperation,
} from "../packages/campaign-operations/src/index.mjs";

test("start/continue/complete advances exactly one stage per day", () => {
  let op = startOperation({
    maneuverId: "reinforce",
    sectorId: "kesh",
    startedDay: 4,
    durationDays: 3,
    standingIntentId: "hold-line",
    mechanicSnapshot: { commitment: 31000 },
  });
  assert.equal(op.stageIndex, 0);
  op = advanceOperationDay(op, { action: "continue", resolutionId: "r1" });
  assert.equal(op.stageIndex, 1);
  op = advanceOperationDay(op, { action: "romanticOverlay", resolutionId: "r2" });
  assert.equal(op.stageIndex, 2);
  assert.equal(op.status, "active");
  op = advanceOperationDay(op, { action: "continue", resolutionId: "r3" });
  assert.equal(op.status, "completed");
  assert.ok(op.residueIds.length);
});

test("duplicate resolution is idempotent", () => {
  let op = startOperation({
    maneuverId: "breach",
    sectorId: "thorne-line",
    startedDay: 2,
    durationDays: 2,
    standingIntentId: "force-wire",
  });
  op = advanceOperationDay(op, { action: "continue", resolutionId: "same" });
  const again = advanceOperationDay(op, { action: "continue", resolutionId: "same" });
  assert.equal(again.stageIndex, op.stageIndex);
});

test("redirect and abort require declared mechanics / close cleanly", () => {
  let op = startOperation({
    maneuverId: "interdict",
    sectorId: "vell-plain",
    startedDay: 5,
    durationDays: 2,
    standingIntentId: "fires",
  });
  assert.throws(
    () => advanceOperationDay(op, { action: "redirect", resolutionId: "x" }),
    /REDIRECT_MECHANIC_REQUIRED/,
  );
  op = advanceOperationDay(op, {
    action: "redirect",
    redirectMechanicId: "network",
    resolutionId: "redir",
  });
  assert.equal(op.maneuverId, "network");
  const aborted = advanceOperationDay(
    startOperation({
      maneuverId: "exploit",
      sectorId: "ash-spine",
      startedDay: 6,
      durationDays: 2,
      standingIntentId: "push",
    }),
    { action: "abort", resolutionId: "abort-1" },
  );
  assert.equal(aborted.status, "aborted");
});

test("legacy one-day manoeuvre never creates ActiveOperation and runs once", () => {
  const migrated = migratePreMetastratumSave({
    day: 3,
    maneuver: "reinforce",
    docket: ["x"],
  });
  assert.equal(migrated.metastratum.activeOperation, null);
  const once = resolveLegacyOneDayManeuver(migrated, "reinforce", "legacy-1");
  const twice = resolveLegacyOneDayManeuver(once, "reinforce", "legacy-1");
  assert.equal(once._legacyResolvedIds.length, 1);
  assert.equal(twice._legacyResolvedIds.length, 1);
  assert.deepEqual(twice.docket, ["x"]);
});

test("MainThreadPrompt variants and semantic ID parity", () => {
  const continuing = {
    operationId: "op:1",
    maneuverId: "route",
    stageIndex: 1,
    status: "active",
  };
  const romantic = mainThreadPrompt({
    kind: "romantic",
    arc: { arcId: "fallback-contact", beatIndex: 0, heat: "hot" },
    continuingOperation: continuing,
  });
  const web = romantic;
  const nexus = mainThreadPrompt({
    kind: "romantic",
    arc: { arcId: "fallback-contact", beatIndex: 0, heat: "hot" },
    continuingOperation: continuing,
  });
  assert.equal(semanticIdsEqual(web, nexus), true);
  assert.equal(romantic.kind, "romantic");
  assert.equal(romantic.continuingOperation.operationId, "op:1");

  const escalatory = mainThreadPrompt({
    kind: "escalatory",
    event: { eventId: "doomsday-shell", heat: "medium", doomsday: true },
    continuingOperation: null,
  });
  assert.equal(escalatory.kind, "escalatory");
});
