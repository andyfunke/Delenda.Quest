/** §4.4 Normalization projections P0–P4 (ratify@012) — verbatim meanings. */

export function normalizeP0ThroughP4(text) {
  const p0 = String(text); // raw bytes preserved (JS string / UTF-16 code units of source text)
  const p1 = p0.normalize("NFC");
  const p2 = p1.toLocaleLowerCase("en-US");
  const p3 = p2
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const p4 = rhetoricalSkeleton(p3);
  return { P0: p0, P1: p1, P2: p2, P3: p3, P4: p4 };
}

function rhetoricalSkeleton(tokens) {
  const markers = [];
  const joined = tokens.join(" ");
  if (/\b(but|however|yet|still)\b/.test(joined)) markers.push("contrast");
  if (/\b(because|therefore|so|thus)\b/.test(joined)) markers.push("causal");
  if (/\b(will|shall|must|cannot)\b/.test(joined)) markers.push("modal");
  if (tokens.length <= 8) markers.push("compressed");
  if (tokens.at(-1) === "cost" || /\bcost|loss|debt\b/.test(joined)) {
    markers.push("cost-ending");
  }
  return markers.length ? markers : ["observation"];
}
