import assert from "node:assert/strict";
import test from "node:test";

const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);
const ssh = await import(process.env.DELENDA_SSH_SERVER_BUNDLE);

const makeServer = (controls = {}) => {
  const campaigns = new Map();
  return new ssh.DelendaSshServer({
    controls,
    loadCampaign: (playerId) =>
      campaigns.get(playerId) ?? game.initialState({ seed: 55 }),
    saveCampaign: (playerId, state) => campaigns.set(playerId, state),
    now: () => 1_700_000_300_000,
  });
};

test("public-key auth success and revoked key failure", () => {
  const server = makeServer();
  const credential = server.store.addKey({
    id: "k1",
    playerId: "p1@example.com",
    label: "laptop",
    algorithm: "ssh-ed25519",
    publicKey: "ssh-ed25519 AAAA test-key-1",
  });
  const ok = server.authenticate(credential.publicKey);
  assert.equal(ok.ok, true);
  server.store.revoke(credential.id);
  const bad = server.authenticate(credential.publicKey);
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, "revoked_key");
});

test("device-link flow expiry", () => {
  const store = new ssh.SshCredentialStore();
  store.startDeviceLink("ABCD", 1000, 1000);
  const expired = store.completeDeviceLink("ABCD", "p1", 3000);
  assert.equal(expired.ok, false);
  assert.equal(expired.reason, "expired");
});

test("PTY command session and one-shot confirm denied", () => {
  const server = makeServer();
  const credential = server.store.addKey({
    id: "k2",
    playerId: "p2@example.com",
    label: "ci",
    algorithm: "ssh-ed25519",
    publicKey: "ssh-ed25519 AAAA test-key-2",
  });
  const auth = server.authenticate(credential.publicKey);
  const interactive = server.openSession({
    playerId: credential.playerId,
    credentialId: credential.id,
    interactive: true,
    remoteRiskHash: auth.remoteRiskHash,
  });
  const brief = server.handleLine(interactive.sessionId, "brief");
  assert.equal(brief.ok, true);
  assert.match(brief.text, /DAY|STATUS|BRIEF/i);

  const oneShot = server.openSession({
    playerId: credential.playerId,
    credentialId: credential.id,
    interactive: false,
  });
  const docket = server.handleLine(oneShot.sessionId, "production");
  const choiceId = docket.response.fact.choiceIds[0];
  const prepared = server.handleLine(oneShot.sessionId, `prepare ${choiceId}`);
  assert.equal(prepared.status, "PREPARED");
  const confirm = server.handleLine(
    oneShot.sessionId,
    `confirm ${prepared.response.fact.proposalToken}`,
  );
  assert.equal(confirm.status, "CONFIRMATION_REQUIRED");
});

test("OG Ava language compiles through the substrate authority", () => {
  const server = makeServer();
  const credential = server.store.addKey({
    id: "k-og",
    playerId: "og-ava@example.com",
    label: "command terminal",
    algorithm: "ssh-ed25519",
    publicKey: "ssh-ed25519 AAAA og-ava-key",
  });
  const opened = server.openSession({
    playerId: credential.playerId,
    credentialId: credential.id,
    interactive: true,
  });

  const docket = server.handleLine(opened.sessionId, "production");
  assert.equal(docket.status, "OK");
  assert.ok(docket.response.fact.choiceIds.length >= 2);
  const choiceId = docket.response.fact.choiceIds[0];

  const colloquial = server.handleLine(
    opened.sessionId,
    "which one fucks me least",
  );
  assert.equal(colloquial.status, "OK");
  assert.match(colloquial.text, /JUDGMENT|SCORE|RANK/i);

  const typo = server.handleLine(
    opened.sessionId,
    "what should i do about producion",
  );
  assert.equal(typo.status, "OK");
  assert.match(typo.text, /JUDGMENT|SCORE/i);

  const prepared = server.handleLine(opened.sessionId, `choose ${choiceId}`);
  assert.equal(prepared.status, "PREPARED");
  assert.ok(prepared.response.fact.proposalToken.startsWith("prp_"));

  const confirmed = server.handleLine(opened.sessionId, "yes");
  assert.equal(confirmed.status, "EXECUTED");
  assert.ok(confirmed.response.auditId);
  assert.ok(
    confirmed.state.decisions.some(
      (decision) => decision.choiceId === choiceId,
    ),
  );
});

test("in-process SSH propagates the cognitive receipt and proof without printing internals", () => {
  const server = makeServer();
  const credential = server.store.addKey({
    id: "k-cognitive",
    playerId: "cognitive-ava@example.com",
    label: "cognitive terminal",
    algorithm: "ssh-ed25519",
    publicKey: "ssh-ed25519 AAAA cognitive-ava-key",
  });
  const opened = server.openSession({
    playerId: credential.playerId,
    credentialId: credential.id,
    interactive: true,
  });
  const result = server.handleLine(opened.sessionId, "what should I do");

  assert.equal(result.ok, true);
  assert.equal(result.cognitiveActivation.runtime, "AVA_COGNITIVE_NEXUS");
  assert.equal(result.cognitiveActivation.status, "COMPLETED");
  assert.deepEqual(result.cognitiveActivation.operatorFamilies, [
    "DECISION",
    "REALIZATION",
  ]);
  assert.match(result.cognitiveActivation.digest, /^[a-f0-9]{64}$/);
  assert.match(result.proofGraph.digest, /^[a-f0-9]{64}$/);
  assert.match(result.proofGraph.executionDigest, /^[a-f0-9]{64}$/);
  assert.ok(
    result.proofGraph.nodes.some((node) => node.kind === "OPERATOR"),
    "the SSH adapter discarded the cognitive operator proof",
  );
  assert.doesNotMatch(
    result.text,
    /AVA_COGNITIVE_NEXUS|executionDigest|proofGraph|domainDigest|fact:/i,
  );
});

test("forwarding and sftp denied; mutation kill switch", () => {
  const server = makeServer({ globalMutationsEnabled: false });
  assert.equal(server.requestForwarding("port-forwarding").ok, false);
  assert.equal(server.requestSubsystem("sftp").ok, false);
  assert.ok(ssh.isFeatureDisabled("scp"));
  const credential = server.store.addKey({
    id: "k3",
    playerId: "p3@example.com",
    label: "locked",
    algorithm: "ssh-ed25519",
    publicKey: "ssh-ed25519 AAAA test-key-3",
  });
  const opened = server.openSession({
    playerId: credential.playerId,
    credentialId: credential.id,
  });
  const blocked = server.handleLine(opened.sessionId, "prepare anything");
  assert.equal(blocked.status, "FORBIDDEN");
});

test("idle timeout and concurrent session limit", () => {
  let now = 1_000;
  const campaigns = new Map();
  const server = new ssh.DelendaSshServer({
    controls: {
      idleTimeoutMs: 100,
      maxConcurrentSessionsPerAccount: 1,
      absoluteSessionMs: 10_000,
    },
    loadCampaign: () => game.initialState({ seed: 1 }),
    saveCampaign: (playerId, state) => campaigns.set(playerId, state),
    now: () => now,
  });
  const credential = server.store.addKey({
    id: "k4",
    playerId: "p4@example.com",
    label: "limit",
    algorithm: "ssh-ed25519",
    publicKey: "ssh-ed25519 AAAA test-key-4",
  });
  const first = server.openSession({ playerId: credential.playerId });
  const second = server.openSession({ playerId: credential.playerId });
  assert.equal(second.ok, false);
  assert.equal(second.reason, "concurrent_limit");
  now = 1_500;
  const timedOut = server.handleLine(first.sessionId, "brief");
  assert.equal(timedOut.ok, false);
  assert.match(timedOut.reason, /idle/);
});

test("terminal escape sanitization in renderer path", () => {
  const server = makeServer();
  const credential = server.store.addKey({
    id: "k5",
    playerId: "p5@example.com",
    label: "safe",
    algorithm: "ssh-ed25519",
    publicKey: "ssh-ed25519 AAAA test-key-5",
  });
  const opened = server.openSession({ playerId: credential.playerId });
  const result = server.handleLine(opened.sessionId, "brief");
  assert.doesNotMatch(result.text, /\u001b\]8;/);
});

test("health endpoint signal", () => {
  const server = makeServer({ globalSshEnabled: true });
  const health = server.health();
  assert.equal(health.ok, true);
  assert.ok(Array.isArray(health.disabledFeatures));
});
