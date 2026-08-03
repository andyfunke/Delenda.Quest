import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  CHECKLIST_BY_MEDIUM,
  assignQueueLane,
  bandBoundaries,
  frozenPromptContract,
  parseReplayFixture,
  priorityBand,
  runJudgeBatch,
  sortQueue,
  validateJudgeOutput,
} from "../packages/contentgen-judge/src/index.mjs";

test("frozen checklist prompt contracts match checked-in files", () => {
  const file = JSON.parse(
    readFileSync("content-quality/judge/prompts/ava.checklist.json", "utf8"),
  );
  assert.deepEqual(file.checklistItems, [...CHECKLIST_BY_MEDIUM.ava]);
  const contract = frozenPromptContract("ava");
  assert.deepEqual(contract.checklistItems, file.checklistItems);
  assert.match(contract.promptHash, /^[a-f0-9]{64}$/);
});

test("NONE judge batch is deterministic and hides AI priority terms", async () => {
  const batch = JSON.parse(
    readFileSync("content-quality/judge/fixtures/batch-none.json", "utf8"),
  );
  const a = await runJudgeBatch(batch, { judgeId: "NONE" });
  const b = await runJudgeBatch(batch, { judgeId: "NONE" });
  assert.equal(a.judgeId, "NONE");
  assert.deepEqual(
    a.queue.map((row) => row.id),
    b.queue.map((row) => row.id),
  );
  assert.equal(a.queue[0].lane, "#failures");
  const curious = a.queue.find((row) => row.id === "j-3");
  assert.equal(curious.lane, "#curious");
});

test("provider authorization absent blocks non-NONE judges", async () => {
  const batch = JSON.parse(
    readFileSync("content-quality/judge/fixtures/batch-none.json", "utf8"),
  );
  await assert.rejects(
    () => runJudgeBatch(batch, { judgeId: "openai-demo", providerAuthorized: false }),
    /PROVIDER_AUTHORIZATION_ABSENT/,
  );
});

test("schema rejects rewritten candidates and unknown checklist keys", () => {
  assert.throws(
    () =>
      validateJudgeOutput(
        {
          schemaVersion: "content-judge/v1",
          checklist: Object.fromEntries(
            CHECKLIST_BY_MEDIUM.ava.map((id) => [id, true]),
          ),
          evidenceSpans: [],
          uncertainties: [],
          curiousReasons: [],
          priorityBand: "P0",
          promptHash: "p",
          responseHash: "r",
          modelId: "m",
          rewrittenCandidate: "nope",
        },
        "ava",
      ),
    /JUDGE_MUST_NOT_REWRITE/,
  );
});

test("replay fixture parses; order reversal does not change schema validity", () => {
  const fixture = JSON.parse(
    readFileSync("content-quality/judge/replays/injection.json", "utf8"),
  );
  const parsed = parseReplayFixture(fixture);
  assert.equal(parsed.priorityBand, "P1");
  const reversed = {
    ...fixture,
    output: {
      modelId: fixture.output.modelId,
      responseHash: fixture.output.responseHash,
      promptHash: fixture.output.promptHash,
      priorityBand: fixture.output.priorityBand,
      curiousReasons: fixture.output.curiousReasons,
      uncertainties: fixture.output.uncertainties,
      evidenceSpans: fixture.output.evidenceSpans,
      checklist: fixture.output.checklist,
      schemaVersion: fixture.output.schemaVersion,
      rewrittenCandidate: null,
    },
  };
  assert.equal(parseReplayFixture(reversed).modelId, "replay");
});

test("priority band boundaries and queue sort contract", () => {
  const bands = bandBoundaries();
  assert.equal(priorityBand(0.85), "P0");
  assert.equal(priorityBand(0.65), "P1");
  assert.equal(priorityBand(0.45), "P2");
  assert.equal(priorityBand(0.44), "P3");
  assert.equal(bands.curiosityLaneThreshold, 0.65);

  const sorted = sortQueue(
    [
      { id: "c", compileStatus: "COMPILED", novelty: 0.1 },
      { id: "a", compileStatus: "HARD_FAILURE", failureSeverity: 1 },
      { id: "b", compileStatus: "COMPILED", novelty: 0.99, weakLabelProbability: 0.5, chordCoverageDeficit: 1, crossMediumTransferDisagreement: 1 },
    ],
    "NONE",
  );
  assert.deepEqual(
    sorted.map((row) => row.lane),
    ["#failures", "#curious", "compliant"],
  );
});

test("control failure invalidates the model-evidence batch", async () => {
  const batch = {
    id: "controls",
    medium: "ava",
    callBudget: 20,
    controls: [
      { id: "good-1", controlExpectation: "good", medium: "ava" },
      { id: "good-2", controlExpectation: "good", medium: "ava" },
      { id: "good-3", controlExpectation: "good", medium: "ava" },
      { id: "bad-1", controlExpectation: "bad", medium: "ava" },
      { id: "bad-2", controlExpectation: "bad", medium: "ava" },
      { id: "bad-3", controlExpectation: "bad", medium: "ava" },
    ],
    candidates: [{ id: "c1", compileStatus: "COMPILED", medium: "ava" }],
  };
  // NONE checklist is all false → "good" controls fail.
  await assert.rejects(
    () =>
      runJudgeBatch(batch, {
        judgeId: "mock",
        providerAuthorized: true,
        judge: async () => ({
          schemaVersion: "content-judge/v1",
          checklist: Object.fromEntries(
            CHECKLIST_BY_MEDIUM.ava.map((id) => [id, false]),
          ),
          evidenceSpans: [],
          uncertainties: [],
          curiousReasons: [],
          priorityBand: "P3",
          promptHash: "p",
          responseHash: "r",
          modelId: "mock",
          rewrittenCandidate: null,
        }),
      }),
    /CONTROL_FAILURE/,
  );
});

test("retry exhaustion marks curious without blocking deterministic review", async () => {
  const batch = {
    id: "retry",
    medium: "ava",
    callBudget: 20,
    controls: [
      { id: "g1", controlExpectation: "good", medium: "ava" },
      { id: "g2", controlExpectation: "good", medium: "ava" },
      { id: "g3", controlExpectation: "good", medium: "ava" },
      { id: "b1", controlExpectation: "bad", medium: "ava" },
      { id: "b2", controlExpectation: "bad", medium: "ava" },
      { id: "b3", controlExpectation: "bad", medium: "ava" },
    ],
    candidates: [{ id: "flaky", compileStatus: "COMPILED", medium: "ava", novelty: 0.5 }],
  };
  let n = 0;
  const result = await runJudgeBatch(batch, {
    judgeId: "mock",
    providerAuthorized: true,
    sleep: async () => {},
    judge: async () => {
      n += 1;
      // First six calls are controls (3 good, 3 bad); then candidate fails all attempts.
      if (n <= 6) {
        const good = n <= 3;
        return {
          schemaVersion: "content-judge/v1",
          checklist: Object.fromEntries(
            CHECKLIST_BY_MEDIUM.ava.map((id) => [id, good]),
          ),
          evidenceSpans: [],
          uncertainties: [],
          curiousReasons: [],
          priorityBand: good ? "P0" : "P3",
          promptHash: "p",
          responseHash: `r${n}`,
          modelId: "mock",
          rewrittenCandidate: null,
        };
      }
      throw new Error("PARSE_FAIL");
    },
  });
  assert.equal(result.results[0].status, "CURIOUS_RETRY_EXHAUSTED");
  assert.ok(result.queue.some((row) => row.id === "flaky"));
});

test("assignQueueLane NONE zeroes judge disagreement", () => {
  const lane = assignQueueLane(
    {
      id: "x",
      compileStatus: "COMPILED",
      novelty: 0.2,
      judgeDeterministicDisagreement: 1,
      weakLabelProbability: 0.9,
    },
    "NONE",
  );
  assert.equal(lane.lane, "compliant");
});
