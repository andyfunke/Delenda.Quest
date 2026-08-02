import assert from "node:assert/strict";
import test from "node:test";

const inline = await import(process.env.DELENDA_AVA_INLINE_TOKENS_BUNDLE);

test("Ava inline tokens classify every action-handle family without changing text", () => {
  const source = "stage M3 D1 N2; inspect P97 X1 T4 Z1";
  const tokens = inline.tokenizeAvaInline(source);
  const handles = tokens
    .filter((token) => token.kind === "action-handle")
    .map((token) => [token.handle, token.family]);
  assert.deepEqual(handles, [
    ["M3", "M"],
    ["D1", "D"],
    ["N2", "N"],
    ["P97", "P"],
    ["X1", "X"],
    ["T4", "T"],
    ["Z1", "Z"],
  ]);
  assert.equal(tokens.map((token) => token.value).join(""), source);
});

test("bracketed handles and public rating bands retain their exact plain text", () => {
  const source = "[M2] LOW 12/100 · [P97] MEDIUM 52/100 · HIGH 88/100";
  const tokens = inline.tokenizeAvaInline(source);
  assert.deepEqual(
    tokens
      .filter((token) => token.kind === "rating")
      .map((token) => [token.band, token.score]),
    [
      ["LOW", 12],
      ["MEDIUM", 52],
      ["HIGH", 88],
    ],
  );
  assert.equal(tokens.map((token) => token.value).join(""), source);
});

test("ordinary prose remains one unchanged text token", () => {
  assert.deepEqual(inline.tokenizeAvaInline("No order has been issued."), [
    { kind: "text", value: "No order has been issued." },
  ]);
});
