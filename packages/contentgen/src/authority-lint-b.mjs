/** Independent authority lint B — separately authored; no shared helpers with A. */

export function authorityLintB(surface) {
  const findings = [];
  const lower = String(surface).toLowerCase();
  if (
    lower.includes("won") ||
    lower.includes("lost") ||
    lower.includes("has happened") ||
    lower.includes("will happen")
  ) {
    findings.push("HIDDEN_OUTCOME");
  }
  if (/^\s*(do|choose|select|send|attack|move)\b/i.test(surface)) {
    findings.push("IMPERATIVE_ORDER");
  }
  // claim-budget undercount: fewer than one concrete noun-like token heuristic
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((token) => token.length < 3)) {
    findings.push("GENERIC_ABSTRACTION");
  }
  return { implementation: "B", reasons: [...new Set(findings)].sort() };
}
