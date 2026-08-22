import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const recipes = await import(process.env.DELENDA_EXECUTION_RECIPES_BUNDLE);

const PROMOTED_POOL = [
  "prosecution-cold/v1",
  "prosecution-ledger/v1",
  "prosecution-institutional/v1",
];

test("the committed promoted manifest verifies and yields the pool in order", () => {
  const manifest = JSON.parse(
    readFileSync(
      resolve("app/campaign-content/execution-scenes/recipes.v1.json"),
      "utf8",
    ),
  );
  assert.deepEqual(recipes.verifyExecutionRecipeManifest(manifest), []);
  assert.deepEqual(recipes.promotedExecutionRecipePoolFrom(manifest), PROMOTED_POOL);
  assert.deepEqual(recipes.promotedExecutionRecipePool(), PROMOTED_POOL);
});

test("the promoted pool equals the compiler's built-in fallback pool", () => {
  // Draw stability: the seeded realization draw indexes into the pool, so
  // the promoted manifest must match the execution-scene compiler's
  // built-in pool (ids and order) for existing campaigns to draw
  // identically whether or not the manifest verifies.
  const source = readFileSync(
    resolve("packages/execution-scenes/src/compile.mjs"),
    "utf8",
  );
  const fallback = source.match(/recipePool\?\.length[\s\S]{0,40}?\[([\s\S]*?)\]/);
  assert.ok(fallback, "fallback pool literal not found");
  const ids = [...fallback[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids, PROMOTED_POOL);
});

test("verification fails closed on manifest defects", () => {
  const valid = JSON.parse(
    readFileSync(
      resolve("app/campaign-content/execution-scenes/recipes.v1.json"),
      "utf8",
    ),
  );
  const defects = [
    { ...valid, version: "execution-realization/v2" },
    { ...valid, recipes: [] },
    { ...valid, recipes: [{ ...valid.recipes[0], id: "" }] },
    { ...valid, recipes: [valid.recipes[0], valid.recipes[0]] },
    {
      ...valid,
      recipes: [
        { ...valid.recipes[0], review: { ...valid.recipes[0].review, authenticated: false } },
      ],
    },
    {
      ...valid,
      recipes: [
        { ...valid.recipes[0], review: { ...valid.recipes[0].review, disposition: "REJECTED" } },
      ],
    },
    "not-an-object",
  ];
  for (const [index, manifest] of defects.entries()) {
    assert.ok(
      recipes.verifyExecutionRecipeManifest(manifest).length > 0,
      `defect ${index} accepted`,
    );
    assert.equal(
      recipes.promotedExecutionRecipePoolFrom(manifest),
      null,
      `defect ${index} produced a pool`,
    );
  }
});
