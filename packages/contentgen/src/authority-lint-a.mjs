/** Independent authority lint A — shares only failure-class names, not helpers. */

export function authorityLintA(text) {
  const reasons = [];
  if (/(won|lost|executed|resolved|succeeded|has happened)/i.test(text)) {
    reasons.push("HIDDEN_OUTCOME");
  }
  if (/\b(do|execute|issue|send|attack)\b/i.test(text)) {
    reasons.push("IMPERATIVE_ORDER");
  }
  if (/\b(mana|hit points|spell slots)\b/i.test(text)) {
    reasons.push("UNSUPPORTED_RESOURCE");
  }
  return { implementation: "A", reasons: [...new Set(reasons)].sort() };
}
