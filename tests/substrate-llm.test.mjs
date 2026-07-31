import assert from "node:assert/strict";
import test from "node:test";

const llm = await import(process.env.DELENDA_SUBSTRATE_LLM_BUNDLE);
const postureMod = await import(process.env.DELENDA_SUBSTRATE_PARSER_BUNDLE).catch(() => null);
void postureMod;

test("realization packet validation rejects forbidden/missing claims and undeclared numbers", () => {
  const packet = {
    channel: "production",
    semanticObjectId: "choice-1",
    mechanic: { id: "choice-1", effects: { treasury: -2 } },
    bindings: { sector: "north" },
    requiredClaims: ["claim.a"],
    forbiddenClaims: ["hidden_probability"],
    register: "directive",
    outputSchema: {
      title: { minWords: 1, maxWords: 8 },
      brief: { minWords: 2, maxWords: 40 },
    },
    contentVersion: "v1",
    reviewStatus: "approved",
  };
  const bad = llm.validateRealizationDraft(packet, {
    title: "Shells",
    brief: "Spend treasury quickly.",
    claimIds: ["hidden_probability"],
    numbers: [99],
    stateKeys: ["unknown"],
    mechanicId: "choice-1",
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((item) => item.includes("required")));
  assert.ok(bad.errors.some((item) => item.includes("forbidden")));
  assert.ok(bad.errors.some((item) => item.includes("undeclared")));
});

test("valid LLM posture proposal compiles into Ava posture schema", () => {
  const result = llm.compileLlmPostureProposal({
    objective: "stabilize_front",
    horizon: "short",
    priorities: { production_integrity: "high" },
    tolerances: { treasury_expenditure: "moderate" },
    confirmation: "inferred",
  });
  assert.equal(result.ok, true);
  assert.equal(result.posture.objective, "stabilize_front");
});

test("invalid LLM output cannot affect recommendations", () => {
  const result = llm.compileLlmPostureProposal({ objective: "invented" });
  assert.equal(result.ok, false);
});

test("deliberation packet stays player-visible", () => {
  const packet = llm.buildDeliberationPacket({
    posture: {
      objective: "survive",
      horizon: "immediate",
      priorities: {},
      tolerances: {},
      unresolvedConflicts: [],
      confirmation: "default",
    },
    evaluations: [
      {
        choiceId: "c1",
        legal: true,
        visible: true,
        score: 10,
        components: {
          objectiveFit: 1,
          priorityFit: 1,
          toleranceFit: 1,
          constraintRelief: 1,
          continuity: 1,
          opportunity: 1,
          resourceEfficiency: 1,
          horizonFit: 1,
          riskPenalty: 0,
          contradictionPenalty: 0,
        },
        knownBenefits: [{ id: "b1", claim: "ok", polarity: "benefit", visible: true }],
        knownCosts: [],
        knownRisks: [],
        unknowns: [],
        disqualifiers: [],
      },
    ],
    visibleFactIds: ["front"],
  });
  assert.ok(llm.assertPacketPlayerVisibleOnly(packet));
  assert.deepEqual(packet.legalCandidateIds, ["c1"]);
});
