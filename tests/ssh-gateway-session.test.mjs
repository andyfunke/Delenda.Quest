import assert from "node:assert/strict";
import test from "node:test";

const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);
const gateway = await import(process.env.DELENDA_SSH_GATEWAY_BUNDLE);
const nexus = await import(process.env.DELENDA_AVA_NEXUS_BUNDLE);

const stateFor = () => {
  const state = game.initialState({ seed: 71, theater: "lowland" });
  state.currentSituation = null;
  state.currentSubMissions = null;
  return state;
};

const playerId = "native-gateway@example.com";
const nowMs = 1_700_000_400_000;

test("native OpenSSH gateway retains canonical Nexus receipt and proof parity", () => {
  const state = stateFor();
  const before = structuredClone(state);
  const directSession = nexus.createAvaNexusSession(true, "campaign");
  const gatewaySession = nexus.createAvaNexusSession(true, "campaign");
  const direct = nexus.runAvaNexusLine(
    "what should I do",
    {
      playerId,
      campaignId: state.campaignId,
      campaignRevision: `${state.day}:${state.actions}:${state.contentPackVersion}`,
      surface: "ssh",
      authority: "command",
      nowMs,
    },
    state,
    directSession,
  );
  const throughGateway = gateway.executeNativeSshGatewayLine({
    raw: "what should I do",
    state,
    session: gatewaySession,
    playerId,
    nowMs,
  });

  assert.equal(throughGateway.changed, false);
  assert.deepEqual(throughGateway.state, before);
  assert.deepEqual(state, before);
  assert.equal(throughGateway.publicResult.status, direct.response.status);
  assert.equal(throughGateway.publicResult.text, direct.text);
  assert.deepEqual(
    throughGateway.publicResult.cognitiveAttestation.cognitiveActivation,
    direct.cognitiveActivation,
  );
  assert.equal(
    throughGateway.publicResult.cognitiveAttestation.proofDigest,
    direct.proofGraph.digest,
  );
  assert.equal(
    throughGateway.publicResult.cognitiveAttestation.version,
    "1",
  );
  assert.match(
    throughGateway.publicResult.cognitiveAttestation.proofDigest,
    /^[a-f0-9]{64}$/,
  );
  assert.match(
    throughGateway.publicResult.cognitiveAttestation.digest,
    /^[a-f0-9]{64}$/,
  );
  assert.deepEqual(
    gateway.validateNativeSshGatewayCognitiveAttestation(
      throughGateway.publicResult.cognitiveAttestation,
    ),
    throughGateway.publicResult.cognitiveAttestation,
  );
  assert.deepEqual(
    Object.keys(throughGateway.publicResult).sort(),
    ["cognitiveAttestation", "status", "text"],
  );
  assert.deepEqual(
    Object.keys(throughGateway.publicResult.cognitiveAttestation).sort(),
    ["cognitiveActivation", "digest", "proofDigest", "version"],
  );
  assert.deepEqual(
    Object.keys(
      throughGateway.publicResult.cognitiveAttestation.cognitiveActivation,
    ).sort(),
    [
      "authority",
      "digest",
      "domainDigest",
      "domainId",
      "domainVersion",
      "operatorFamilies",
      "runtime",
      "status",
      "version",
    ],
  );
  assert.ok(Object.isFrozen(throughGateway.publicResult));
  assert.ok(
    Object.isFrozen(throughGateway.publicResult.cognitiveAttestation),
  );
  const serialized = JSON.stringify(
    throughGateway.publicResult.cognitiveAttestation,
  );
  for (const forbidden of [
    "proofGraph",
    "executionDigest",
    "worldRevision",
    "semanticDigest",
    "nodes",
    "sourceIds",
    "campaignId",
    "rawInput",
    "fact:",
  ])
    assert.doesNotMatch(serialized, new RegExp(forbidden, "i"));
});

test("native SSH attestation rejects open shapes and every stale digest binding", () => {
  const state = stateFor();
  const direct = nexus.runAvaNexusLine(
    "what should I do",
    {
      playerId,
      campaignId: state.campaignId,
      campaignRevision: `${state.day}:${state.actions}:${state.contentPackVersion}`,
      surface: "ssh",
      authority: "command",
      nowMs,
    },
    state,
    nexus.createAvaNexusSession(true, "campaign"),
  );
  const sealed = gateway.nativeSshGatewayAttestationFor({
    cognitiveActivation: direct.cognitiveActivation,
    proofDigest: direct.proofGraph.digest,
  });
  assert.ok(sealed);

  const changedReceipt = structuredClone(direct.cognitiveActivation);
  changedReceipt.authority = "PLAN_ONLY";
  assert.throws(
    () =>
      gateway.nativeSshGatewayAttestationFor({
        cognitiveActivation: changedReceipt,
        proofDigest: direct.proofGraph.digest,
      }),
    /activation digest does not match/,
  );
  assert.throws(
    () =>
      gateway.nativeSshGatewayAttestationFor({
        cognitiveActivation: {
          ...direct.cognitiveActivation,
          debug: "must-not-cross-the-gateway",
        },
        proofDigest: direct.proofGraph.digest,
      }),
    /open or incomplete shape/,
  );
  assert.throws(
    () =>
      gateway.nativeSshGatewayAttestationFor({
        cognitiveActivation: direct.cognitiveActivation,
        proofDigest: "f".repeat(63),
      }),
    /proof attestation is malformed/,
  );

  for (const forged of [
    { ...sealed, proofDigest: "0".repeat(64) },
    { ...sealed, digest: "0".repeat(64) },
    {
      ...sealed,
      cognitiveActivation: {
        ...sealed.cognitiveActivation,
        digest: "0".repeat(64),
      },
    },
    { ...sealed, debug: true },
    Object.fromEntries(
      Object.entries(sealed).filter(([key]) => key !== "version"),
    ),
  ])
    assert.throws(
      () => gateway.validateNativeSshGatewayCognitiveAttestation(forged),
      /native SSH cognitive (?:activation|attestation)/,
    );
});

test("native gateway failures expose closed public codes, never raw messages", () => {
  const secret =
    "SQLITE_ERROR secret-token full-campaign-json NEVER_DISCLOSE_GATEWAY_ERROR";
  const cases = [
    {
      error: new Error(secret),
      phase: "CONFIGURATION",
      code: "SSH_GATEWAY_CONFIGURATION_INVALID",
    },
    {
      error: new gateway.GatewayRequestError(secret, 401, {
        error: secret,
      }),
      phase: "CAMPAIGN_LOAD",
      code: "SSH_GATEWAY_AUTHENTICATION_FAILED",
    },
    {
      error: new gateway.GatewayRequestError(secret, 409, {
        error: secret,
        campaign: secret,
      }),
      phase: "CAMPAIGN_PERSISTENCE",
      code: "SSH_CAMPAIGN_REVISION_CONFLICT",
    },
    {
      error: new gateway.GatewayRequestError(secret, 413, {
        error: secret,
      }),
      phase: "CAMPAIGN_PERSISTENCE",
      code: "SSH_CAMPAIGN_TOO_LARGE",
    },
    {
      error: new gateway.GatewayRequestError(secret, 500, {
        error: secret,
      }),
      phase: "CAMPAIGN_PERSISTENCE",
      code: "SSH_CAMPAIGN_PERSISTENCE_FAILED",
    },
    {
      error: new Error(secret),
      phase: "SESSION",
      code: "SSH_SESSION_FAILED",
    },
  ];

  for (const item of cases) {
    const failure = gateway.publicNativeSshGatewayFailure(
      item.error,
      item.phase,
    );
    assert.equal(failure.code, item.code);
    assert.deepEqual(Object.keys(failure).sort(), ["code", "message"]);
    assert.doesNotMatch(JSON.stringify(failure), new RegExp(secret));
    assert.doesNotMatch(JSON.stringify(failure), /SQLITE|campaign-json/i);
  }
});
