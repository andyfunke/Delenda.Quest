import assert from "node:assert/strict";
import test from "node:test";

const mod = await import(process.env.DELENDA_INTERFACE_BUNDLE);

test("unambiguous interface commands switch immediately", () => {
  for (const phrase of [
    "toggle ux",
    "change ux",
    "switch ux",
    "swap ux",
    "alternate ux",
    "switch UI",
    "Ava, toggle the graphical interface",
  ])
    assert.equal(mod.avaInterfaceIntent(phrase), "switch", phrase);
});

test("any other UI or UX mention requests confirmation", () => {
  for (const phrase of [
    "ux",
    "what is this ui",
    "I like the UX",
    "can you explain the UI to me",
  ])
    assert.equal(mod.avaInterfaceIntent(phrase), "confirm", phrase);
});

test("unrelated commands remain available to Ava", () => {
  assert.equal(mod.avaInterfaceIntent("advise me on the missions"), null);
});

