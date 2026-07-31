import type { CompiledCognitiveDomain } from "./cognitive-domain";
import { cognitiveDigest } from "./cognitive-types";
import type { AvaCompilerTrace, AvaSemanticQuery, AvaSourceSpan } from "./schema";

export type SurfaceLexeme = {
  index: number;
  text: string;
  normalized: string;
  start: number;
  end: number;
  material: boolean;
};

export type ConceptActivation = {
  conceptId: string;
  alias: string;
  source: "EXACT_ALIAS" | "COMPILER_TRACE" | "VALIDATED_SUGGESTION";
  confidence: number;
  span: AvaSourceSpan;
};

export type SurfaceClause = {
  id: string;
  kind: "REQUEST" | "CONSTRAINT" | "HYPOTHETICAL" | "REFERENCE";
  lexemeIndexes: readonly number[];
  semanticFields: readonly string[];
};

export type SurfaceAst = {
  kind: "SURFACE_AST";
  version: "1";
  raw: string;
  normalized: string;
  lexemes: readonly SurfaceLexeme[];
  clauses: readonly SurfaceClause[];
  activations: readonly ConceptActivation[];
  semantic: AvaSemanticQuery;
  digest: string;
};

const normalize = (value: string) =>
  value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const lex = (raw: string): SurfaceLexeme[] => {
  const output: SurfaceLexeme[] = [];
  const matcher = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
  for (const match of raw.matchAll(matcher)) {
    const text = match[0];
    const start = match.index ?? 0;
    output.push({
      index: output.length,
      text,
      normalized: normalize(text),
      start,
      end: start + text.length,
      material: !new Set(["a", "an", "the", "please", "ava"]).has(normalize(text)),
    });
  }
  return output;
};

const exactActivations = (
  raw: string,
  domain: CompiledCognitiveDomain,
): ConceptActivation[] => {
  const normalized = normalize(raw);
  const activations: ConceptActivation[] = [];
  for (const [alias, conceptIds] of domain.aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`(?:^| )(${escaped})(?: |$)`).exec(normalized);
    if (!match) continue;
    const start = normalized.indexOf(match[1]);
    for (const conceptId of conceptIds)
      activations.push({
        conceptId,
        alias,
        source: "EXACT_ALIAS",
        confidence: 1,
        span: { start, end: start + alias.length, text: match[1] },
      });
  }
  return activations;
};

export const compileSurfaceAst = (
  raw: string,
  semantic: AvaSemanticQuery,
  domain: CompiledCognitiveDomain,
  trace?: AvaCompilerTrace,
  suggestedConceptIds: readonly string[] = [],
): SurfaceAst => {
  if (!raw.trim()) throw new Error("surface AST cannot compile empty input");
  const lexemes = lex(raw);
  if (!lexemes.length) throw new Error("surface AST contains no lexemes");
  const activations = exactActivations(raw, domain);
  for (const item of trace?.recognizedConcepts ?? []) {
    if (!domain.concepts.has(item.canonical)) continue;
    const start = raw.toLowerCase().indexOf(item.source.toLowerCase());
    activations.push({
      conceptId: item.canonical,
      alias: normalize(item.source),
      source: "COMPILER_TRACE",
      confidence: 1,
      span: { start: Math.max(0, start), end: Math.max(0, start) + item.source.length, text: item.source },
    });
  }
  for (const conceptId of suggestedConceptIds) {
    if (!domain.concepts.has(conceptId))
      throw new Error(`suggested concept ${conceptId} is outside the compiled domain`);
    activations.push({
      conceptId,
      alias: conceptId,
      source: "VALIDATED_SUGGESTION",
      confidence: 0.5,
      span: { start: 0, end: raw.length, text: raw },
    });
  }
  const uniqueActivations = [...new Map(
    activations.map((item) => [`${item.conceptId}:${item.source}:${item.span.start}:${item.span.end}`, item]),
  ).values()].sort((a, b) => a.conceptId.localeCompare(b.conceptId) || a.span.start - b.span.start);
  const clauses: SurfaceClause[] = [
    {
      id: "request",
      kind: "REQUEST",
      lexemeIndexes: lexemes.map((item) => item.index),
      semanticFields: ["operation", "subject", "scope", "timeframe", "requestedDetail"],
    },
    ...semantic.overlays.map((_, index) => ({
      id: `hypothetical:${index}`,
      kind: "HYPOTHETICAL" as const,
      lexemeIndexes: lexemes.map((item) => item.index),
      semanticFields: [`overlays.${index}`],
    })),
    ...(semantic.reference
      ? [{
          id: "reference",
          kind: "REFERENCE" as const,
          lexemeIndexes: lexemes.map((item) => item.index),
          semanticFields: ["reference"],
        }]
      : []),
  ];
  const base = {
    kind: "SURFACE_AST" as const,
    version: "1" as const,
    raw,
    normalized: normalize(raw),
    lexemes,
    clauses,
    activations: uniqueActivations,
    semantic,
  };
  return { ...base, digest: cognitiveDigest(base) };
};
