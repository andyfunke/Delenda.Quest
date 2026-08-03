import { authorityLintA } from "./authority-lint-a.mjs";
import { authorityLintB } from "./authority-lint-b.mjs";

/**
 * Dual independent authority lint.
 * Agreement on failure → hard failure.
 * Disagreement → tag #curious with disagreement recorded.
 */
export function dualAuthorityLint(text) {
  const a = authorityLintA(text);
  const b = authorityLintB(text);
  const aSet = new Set(a.reasons);
  const bSet = new Set(b.reasons);
  const agreed = a.reasons.filter((reason) => bSet.has(reason));
  const onlyA = a.reasons.filter((reason) => !bSet.has(reason));
  const onlyB = b.reasons.filter((reason) => !aSet.has(reason));
  if (agreed.length) {
    return {
      status: "HARD_FAILURE",
      agreed,
      disagreement: { onlyA, onlyB },
      tags: [],
    };
  }
  if (onlyA.length || onlyB.length) {
    return {
      status: "COMPILED",
      agreed: [],
      disagreement: { onlyA, onlyB },
      tags: ["#curious"],
    };
  }
  return {
    status: "COMPILED",
    agreed: [],
    disagreement: { onlyA: [], onlyB: [] },
    tags: [],
  };
}
