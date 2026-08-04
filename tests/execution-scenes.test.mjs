import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  assertRegisterContract,
  compileExecutionScene,
  renderProsecutionProse,
  requiredClaims,
  sceneDigest,
  schemaForbidsDoomsdayRolls,
  validateExecutionScene,
} from "../packages/execution-scenes/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const fixture = JSON.parse(
  readFileSync(
    path.join(root, "content-quality/execution-scenes/fixtures/day-7.ledger.json"),
    "utf8",
  ),
);

test("compiles fixture scene without importing resolve()", () => {
  const scene = compileExecutionScene(fixture);
  const report = validateExecutionScene(scene);
  assert.equal(report.ok, true, report.failures?.join(","));
  assert.equal(scene.resolvedDay, 7);
  assert.ok(scene.realizationId);
  assert.equal(scene.doomsday.occurred, false);
  // Independent acceptance: compiler and this test must not import resolve().
  const compileSrc = readFileSync(
    path.join(root, "packages/execution-scenes/src/compile.mjs"),
    "utf8",
  );
  const testSrc = readFileSync(new URL(import.meta.url), "utf8");
  assert.doesNotMatch(compileSrc, /from\s+["'].*app\/game/);
  assert.doesNotMatch(compileSrc, /\bimport\s*\{[^}]*\bresolve\b/);
  assert.doesNotMatch(testSrc, /from\s+["'].*app\/game/);
  assert.doesNotMatch(testSrc, /\bimport\s*\{[^}]*\bresolve\b/);
});

test("schema source greps forbid doomsday numeric roll fields", () => {
  const schemaSource = readFileSync(
    path.join(root, "packages/execution-scenes/src/schema.mjs"),
    "utf8",
  );
  assert.equal(schemaForbidsDoomsdayRolls(schemaSource), true);
  assert.match(schemaSource, /FORBIDDEN_DOOMSDAY_KEYS/);
  assert.doesNotMatch(schemaSource, /doomsday:\s*\{[^}]*rollPpm/s);
  const scene = compileExecutionScene(fixture);
  assert.equal(
    validateExecutionScene({
      ...scene,
      doomsday: { ...scene.doomsday, rollPpm: 123 },
    }).ok,
    false,
  );
});

test("register contract: required claims present, forbidden absent", () => {
  const scene = compileExecutionScene(fixture);
  const prose = renderProsecutionProse(scene);
  const claims = requiredClaims(scene);
  for (const term of claims.forbidden) {
    assert.equal(
      prose.body.toLowerCase().includes(term.toLowerCase()),
      false,
      `forbidden:${term}`,
    );
  }
  const register = assertRegisterContract(prose.body);
  assert.equal(register.ok, true, register.hits?.join(","));
  assert.match(prose.body, /Kesh|kesh/i);
  assert.match(prose.body, /romantic/i);
  assert.match(prose.body, /LOSSES/i);
  assert.match(prose.body, /MOVEMENT/i);
});

test("semantic digest identical across web/Ava/terminal render projections", () => {
  const scene = compileExecutionScene(fixture);
  const web = renderProsecutionProse(scene);
  const ava = renderProsecutionProse(structuredClone(scene));
  const terminal = renderProsecutionProse(structuredClone(scene));
  assert.equal(web.digest, ava.digest);
  assert.equal(ava.digest, terminal.digest);
  assert.equal(web.digest, sceneDigest(scene));
});

test("hidden adversary actuality rejected", () => {
  const scene = compileExecutionScene(fixture);
  const bad = {
    ...scene,
    adversary: { ...scene.adversary, actualForce: 99999 },
  };
  assert.equal(validateExecutionScene(bad).ok, false);
});
