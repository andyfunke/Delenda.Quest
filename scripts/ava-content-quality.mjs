#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const REPORT_SCHEMA_VERSION = "ava-content-quality/v1";
export const NORMALIZER_VERSION = "ava-content-normalizer/v1";
export const DECOMPILER_VERSION = "ava-content-decompiler/v1";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SOURCE = path.join(ROOT, "app/ava/relevance-engine.ts");
const DEFAULT_OUT = path.join(ROOT, "content-quality/generated");
const FAILURE_CLASSES = ["IRRELEVANT", "GENERIC", "INCOHERENT", "UNSAFE", "DUPLICATE", "AUTHORITY_LEAK", "VOICE_DRIFT", "CLAIM_OVERFLOW", "CLASS_COVERAGE_GAP", "RETRIEVAL_FRAGILITY"];

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const nfc = (value) => String(value).normalize("NFC");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const hashObject = (value) => sha256(stable(value));
const tokens = (text) => normalize(text).split(" ").filter(Boolean);
const normalize = (text) => nfc(text).toLowerCase().replace(/[’]/g, "'").replace(/[^\p{L}\p{N}'?]+/gu, " ").trim();

const zeroWidth = (text) => text.replace(/[\u0000-\u001f\u007f\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u2800\u3000\ufeff\ufe00-\ufe0f]/g, "");
const confusable = (text) => zeroWidth(text).replace(/[ΟООоο]/g, "o").replace(/[ΙІі]/g, "i").replace(/[ΑАа]/g, "a").replace(/[Сс]/g, "c").replace(/[ΕЕе]/g, "e").replace(/[ΤТт]/g, "t").replace(/[РРр]/g, "p").replace(/[ΧХх]/g, "x");
const leet = (text) => zeroWidth(text).replace(/[04]/g, "o").replace(/[13]/g, "e").replace(/[57]/g, "s").replace(/[@]/g, "a").replace(/[!|]/g, "i");
const projections = (text) => {
  const p0 = normalize(text);
  const p1 = normalize(zeroWidth(text));
  const p2 = normalize(confusable(text));
  const p3 = normalize(text).replace(/[?]/g, " ").replace(/\s+/g, " ").trim();
  const p4 = normalize(leet(text));
  return { P0: p0, P1: p1, P2: p2, P3: p3, P4: p4 };
};

const parseRealizations = (source) => {
  const rows = [];
  const rowPattern = /\{ id: "([^"]+)", chord: "([^"]+)", line: "((?:\\.|[^"\\])*)", required: \[([^\]]*)\]/g;
  for (const match of source.matchAll(rowPattern)) {
    const required = [...match[3].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((item) => item[1]);
    rows.push({ id: match[1], chord: match[2], line: match[3].replaceAll("\\'", "'").replaceAll('\\"', '"'), required });
  }
  if (!rows.length) throw new Error("No relevance realizations found; enumeration inventory is empty");
  return rows.sort((a, b) => a.id.localeCompare(b.id));
};

const trigramSet = (items) => new Set(items.length < 3 ? items : items.slice(0, -2).map((_, i) => items.slice(i, i + 3).join(" ")));
const jaccard = (a, b) => { const union = new Set([...a, ...b]).size; return union ? [...a].filter((x) => b.has(x)).length / union : 1; };
const containment = (a, b) => a.size ? [...a].filter((x) => b.has(x)).length / a.size : 1;
const editDistance = (a, b) => {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prior = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j]; row[j] = a[i - 1] === b[j - 1] ? prior : 1 + Math.min(prior, row[j - 1], current); prior = current;
    }
  }
  return row[b.length];
};

export function enumerate(source = fs.readFileSync(SOURCE, "utf8"), seed = 0) {
  const sourceFileHash = sha256(source);
  const grammarVersion = sha256(source);
  return parseRealizations(source).map((row) => {
    const key = { productionId: row.id, parameters: {}, seed: seed >>> 0 };
    const candidate = { ...key, text: row.line, chord: row.chord, realizationId: row.id, sourceFile: "app/ava/relevance-engine.ts", sourceFileHash, sourceLine: null, grammarVersion, contractVersion: "ava-relevance-graph/v1" };
    return { ...candidate, contentHash: hashObject(candidate) };
  });
}

export function decompile(candidate) {
  const p = projections(candidate.text);
  const words = tokens(candidate.text);
  const unsafe = { outcome: /(won|lost|executed|resolved|succeeded|failed|has happened|will happen)/i.test(p.P0), mutation: /\b(do|execute|issue|send|attack|move|choose|select)\b/i.test(p.P0), imperative: /^(do|choose|select|send|attack|move)\b/i.test(p.P0) };
  const shape = [candidate.text.includes(".") ? "sentence-break" : "single-sentence", /\bbut\b|\bnot\b|\bmerely\b|\bonly\b/i.test(candidate.text) ? "contrast-or-reversal" : "observation"];
  return { candidate, projections: p, claims: [{ text: candidate.text, possibleOutcome: unsafe.outcome, possibleMutation: unsafe.mutation }], rhetoricalShape: shape, features: { tokenCount: words.length, uniqueTokenRatio: new Set(words).size / Math.max(1, words.length), questionCount: (candidate.text.match(/\?/g) || []).length, sentenceCount: candidate.text.split(/[.!?]+/).filter(Boolean).length }, authorityEvidence: unsafe, decompilerVersion: DECOMPILER_VERSION };
}

export function hardGate(item, allItems) {
  const reasons = [];
  const p = item.projections.P0;
  if (!item.candidate.chord || !item.candidate.realizationId) reasons.push(["G01_MISSING_CHORD_EVIDENCE", "IRRELEVANT"]);
  if (item.authorityEvidence.outcome) reasons.push(["G02_UNSUPPORTED_OUTCOME", "AUTHORITY_LEAK"]);
  if (item.authorityEvidence.mutation || item.authorityEvidence.imperative) reasons.push(["G03_MUTATION_LANGUAGE", "UNSAFE"]);
  if (allItems.some((other) => other.candidate.contentHash !== item.candidate.contentHash && normalize(other.candidate.text) === p)) reasons.push(["G04_EXACT_DUPLICATE", "DUPLICATE"]);
  if (!item.candidate.text.trim()) reasons.push(["G06_NO_SURFACE_RELEVANCE", "IRRELEVANT"]);
  return { verdict: reasons.length ? "REJECT" : "PASS", reasons: reasons.map(([gate, failureClass]) => ({ gate, failureClass })) };
}

export function indexAndCompare(items) {
  return items.map((item, index) => {
    const neighbors = items.filter((other) => other.candidate.contentHash !== item.candidate.contentHash).map((other) => {
      const a = trigramSet(tokens(item.candidate.text)); const b = trigramSet(tokens(other.candidate.text));
      return { realizationId: other.candidate.realizationId, sameChord: item.candidate.chord === other.candidate.chord, jaccard: jaccard(a, b), containment: Math.max(containment(a, b), containment(b, a)), editDistance: editDistance(normalize(item.candidate.text), normalize(other.candidate.text)) };
    }).sort((a, b) => Number(b.sameChord) - Number(a.sameChord) || b.jaccard - a.jaccard || a.realizationId.localeCompare(b.realizationId));
    return { ...item, neighbors: neighbors.slice(0, 8), novelty: neighbors.length ? 1 - neighbors[0].jaccard : 1, indexPosition: index };
  });
}

export function buildReport({ source = fs.readFileSync(SOURCE, "utf8"), seed = 0 } = {}) {
  const candidates = enumerate(source, seed);
  const decompiled = candidates.map(decompile);
  const gated = decompiled.map((item) => ({ ...item, gate: hardGate(item, decompiled) }));
  const indexed = indexAndCompare(gated);
  const report = { reportSchemaVersion: REPORT_SCHEMA_VERSION, grammarVersion: sha256(source), contractVersion: "ava-relevance-graph/v1", corpusVersion: "ava-taste/empty-v1", indexVersion: "ava-index/v1", decompilerVersion: DECOMPILER_VERSION, normalizerVersion: NORMALIZER_VERSION, seed: seed >>> 0, candidates: indexed, summary: { candidateCount: indexed.length, pass: indexed.filter((x) => x.gate.verdict === "PASS").length, review: indexed.filter((x) => x.gate.verdict === "REVIEW").length, reject: indexed.filter((x) => x.gate.verdict === "REJECT").length, failureClasses: FAILURE_CLASSES } };
  return { ...report, manifestHash: hashObject(report) };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const out = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUT;
  fs.mkdirSync(out, { recursive: true });
  const report = buildReport();
  fs.writeFileSync(path.join(out, "ava-content-quality-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(out, "ava-content-quality-report.canonical.json"), `${stable(report)}\n`);
  process.stdout.write(`${JSON.stringify(report.summary)}\n`);
}
