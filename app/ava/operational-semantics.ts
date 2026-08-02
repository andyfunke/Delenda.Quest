import { enumerateAvaActions } from "./runtime";
import type { AvaActionDescriptor } from "./schema";
import {
  decisionCalculusFor,
  forecastFor,
  adviceFor,
} from "./operational-calculus";
import { projectAvaManeuverComparison } from "./operational-comparison";
import {
  AVA_OPERATIONAL_SEMANTICS_VERSION,
  type AvaOperationalProjectionInput,
  type AvaOperationalSemanticResult,
} from "./operational-contracts";
import { cognitiveDigest } from "./cognitive-types";
import { avaVisibleWorldRevision } from "./world-model";

const seal = <T extends Record<string, unknown>>(body: T) => ({
  ...body,
  digest: cognitiveDigest(body),
});

const readOnlyInstruction = new Set([
  "ADVISE",
  "REPORT",
  "EXPLAIN",
  "FORECAST",
  "COMPARE",
  "SEMANTIC",
  "STATUS",
  "LIST",
  "OPEN",
  "HELP",
  "GREETING",
  "IDENTITY",
  "GRATITUDE",
  "FRUSTRATION",
  "REPEAT",
  "CONCISE",
  "STORYTELLER",
]);

const authoredEvidenceIds = (input: AvaOperationalProjectionInput) => [
  ...new Set([
    ...(input.trace?.contextualResolutions ?? []),
    ...(input.trace?.authoredEvidence ?? []).map(
      (evidence) => `${evidence.section}:${evidence.sourceOrder ?? "na"}:${evidence.phrase}`,
    ),
  ]),
].sort();

export const projectAvaOperationalSemantics = (
  input: AvaOperationalProjectionInput,
): AvaOperationalSemanticResult | undefined => {
  if (!readOnlyInstruction.has(input.instruction.kind)) return undefined;
  if (input.query.subject.type === "DIRECTIVE") return undefined;
  const descriptors: AvaActionDescriptor[] = enumerateAvaActions(
    input.state,
    input.opportunityFraction ?? 0,
  );
  const parts: Partial<AvaOperationalSemanticResult> = {};
  if (input.cognitiveGuidance) {
    const calculus = decisionCalculusFor({
      state: input.state,
      query: input.query,
      guidance: input.cognitiveGuidance,
      descriptors,
    });
    parts.calculus = calculus;
    if (["ADVISE", "RANK", "RECOMMEND", "JUSTIFY", "CORRECT"].includes(input.query.operation))
      parts.advice = adviceFor({
        state: input.state,
        query: input.query,
        guidance: input.cognitiveGuidance,
        descriptors,
        calculus,
      });
  }
  if (input.cognitiveForecast) {
    const forecast = forecastFor({ state: input.state, guidance: input.cognitiveForecast });
    parts.calculus = forecast.calculus;
    parts.forecast = forecast.forecast;
  }
  if (input.query.operation === "COMPARE") {
    const comparison = projectAvaManeuverComparison({
      state: input.state,
      query: input.query,
      trace: input.trace,
      opportunityFraction: input.opportunityFraction,
    });
    if (comparison) parts.comparison = comparison;
  }
  if (!parts.calculus && !parts.advice && !parts.forecast) return undefined;
  const body: Omit<AvaOperationalSemanticResult, "digest"> = {
    version: AVA_OPERATIONAL_SEMANTICS_VERSION,
    status: "AVAILABLE",
    operation: input.query.operation,
    subject: input.query.subject,
    instructionKind: input.instruction.kind,
    stateRevision: avaVisibleWorldRevision(input.state),
    contentRevision: input.state.contentPackVersion,
    authority: "READ_ONLY",
    mutation: false,
    ...parts,
    authoredEvidenceIds: authoredEvidenceIds(input),
    unavailableEvidence: [],
  };
  return seal(body) as AvaOperationalSemanticResult;
};

export type {
  AvaOperationalSemanticResult,
} from "./operational-contracts";
export { projectAvaManeuverComparison } from "./operational-comparison";
