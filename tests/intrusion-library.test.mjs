import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

const library = await import(process.env.DELENDA_INTRUSION_LIBRARY_BUNDLE);

const tools = {
  hashInt(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  },
  sha256Hex(text) {
    return createHash("sha256").update(text).digest("hex");
  },
};

const binding = (overrides = {}) => ({
  campaignId: "campaign-library-contract",
  campaignSeed: 9917,
  day: 7,
  sector: "Won Ton Ridge",
  disclosureLines: [
    { label: "ENEMY FORCE", value: "18,400" },
    { label: "ENEMY READINESS", value: "63.0%" },
  ],
  ...overrides,
});

const compile = (overrides = {}) =>
  library.compileIntrusionIncident({ binding: binding(overrides), tools });

const artifact = (incident, name) => {
  const found = incident.artifacts.find((candidate) => candidate.name === name);
  assert.ok(found, `missing compiled artifact ${name}`);
  return found.content;
};

test("intrusion content catalogue is structurally valid and separately versioned", () => {
  assert.deepEqual(library.validateIntrusionCatalog(), []);
  assert.equal(library.INTRUSION_CATALOG.length, 1);
  assert.equal(library.INTRUSION_CATALOG[0].schemaVersion, "intrusion-family/v1");
  assert.match(library.INTRUSION_CATALOG[0].contentVersion, /^authentication-drift\//);
});

test("same family binding compiles the same semantic incident", () => {
  const first = compile();
  const second = compile();
  assert.deepEqual(second, first);
  assert.equal(first.schemaVersion, "intrusion-incident/v1");
  assert.equal(first.familyId, "authentication-drift");
  assert.match(first.proof, /^[a-f0-9]{64}$/);
  assert.notEqual(compile({ day: 8 }).id, first.id);
});

test("authentication-drift evidence converges on exactly one accepted claim", () => {
  const incident = compile();
  const authLog = artifact(incident, "auth.log");
  const failureCounts = new Map();
  for (const line of authLog.split("\n").filter((row) => row.includes("AUTH=FAIL"))) {
    const node = line.match(/\bNODE=(relay-[a-z]+)/)?.[1];
    assert.ok(node, line);
    failureCounts.set(node, (failureCounts.get(node) ?? 0) + 1);
  }
  const frequencyClaims = [...failureCounts]
    .filter(([, count]) => count === 4)
    .map(([node]) => node);

  const csvMap = (name) =>
    new Map(
      artifact(incident, name)
        .split("\n")
        .slice(1)
        .map((row) => row.split(",")),
    );
  const authorized = csvMap("authorized-keys.csv");
  const observed = csvMap("observed-keys.csv");
  const mismatchClaims = [...authorized]
    .filter(([node, key]) => observed.get(node) !== key)
    .map(([node]) => node);
  const converged = frequencyClaims.filter((node) => mismatchClaims.includes(node));

  assert.deepEqual(converged, incident.verifier.acceptedClaims);
  assert.equal(converged.length, 1);
});

test("compiled content contains no host or network target escape", () => {
  const incident = compile();
  assert.equal(incident.target, "relay-grid");
  assert.equal(incident.scan.boundary, "No packets or sockets left Delenda Quest.");
  assert.ok(incident.artifacts.every((item) => !item.name.includes("/") && !item.name.includes("..")));
  assert.match(incident.report, /does not alter the campaign/);
});
