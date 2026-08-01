import type { CompiledCognitiveDomain } from "./cognitive-domain";
import {
  cloneCognitive,
  cognitiveDigest,
  type CognitiveAuthority,
  type CognitiveValue,
} from "./cognitive-types";
import type {
  CognitiveDatum,
  OperatorAdapter,
} from "./operator-algebra";
import type { ResolvedSemanticTree } from "./resolved-semantic-tree";
import type { CognitiveWorldSnapshot } from "./world-model";

export type CognitiveRealizationBinding = {
  kind: "AVA_RESULT_BINDING";
  worldRevision: string;
  semanticTreeDigest: string;
  valueKind: CognitiveDatum["kind"];
  value: CognitiveValue;
  sourceDigest: string;
  authority: CognitiveAuthority;
  digest: string;
};

const sourceIdentity = (datum: CognitiveDatum) => ({
  kind: datum.kind,
  value: datum.value,
  sourceIds: [...datum.sourceIds].sort(),
  proofIds: [...datum.proofIds].sort(),
  authority: datum.authority,
});

const sealBinding = (input: {
  datum: CognitiveDatum;
  world: CognitiveWorldSnapshot;
  semanticTree: ResolvedSemanticTree;
}): CognitiveRealizationBinding => {
  const body: Omit<CognitiveRealizationBinding, "digest"> = {
    kind: "AVA_RESULT_BINDING",
    worldRevision: input.world.revision,
    semanticTreeDigest: input.semanticTree.digest,
    valueKind: input.datum.kind,
    value: cloneCognitive(input.datum.value),
    sourceDigest: cognitiveDigest(sourceIdentity(input.datum)),
    authority: input.datum.authority,
  };
  return Object.freeze({
    ...body,
    digest: cognitiveDigest(body),
  });
};

export const validateCognitiveRealizationBinding = (input: {
  binding: CognitiveRealizationBinding;
  source?: CognitiveDatum;
  worldRevision: string;
  semanticTreeDigest: string;
}) => {
  const { digest, ...body } = input.binding;
  if (digest !== cognitiveDigest(body))
    throw new Error("cognitive realization binding digest is invalid");
  if (
    input.binding.kind !== "AVA_RESULT_BINDING" ||
    input.binding.worldRevision !== input.worldRevision ||
    input.binding.semanticTreeDigest !== input.semanticTreeDigest
  )
    throw new Error("cognitive realization binding crossed its execution scope");
  if (
    input.source &&
    (input.binding.valueKind !== input.source.kind ||
      input.binding.authority !== input.source.authority ||
      input.binding.sourceDigest !==
        cognitiveDigest(sourceIdentity(input.source)) ||
      cognitiveDigest(input.binding.value) !==
        cognitiveDigest(input.source.value))
  )
    throw new Error("cognitive realization binding does not match its source");
  return input.binding;
};

export const realizationEngineAdapter: OperatorAdapter = ({
  operator,
  values,
  world,
  semanticTree,
}) => {
  if (operator !== "EXPLAIN" && operator !== "MATCH")
    throw new Error(`realization engine cannot execute ${operator}`);
  const source = values.value;
  if (!source)
    throw new Error("realization engine requires one typed source result");
  const binding = sealBinding({ datum: source, world, semanticTree });
  validateCognitiveRealizationBinding({
    binding,
    source,
    worldRevision: world.revision,
    semanticTreeDigest: semanticTree.digest,
  });
  return {
    datum: {
      kind: "RECORD",
      value: cloneCognitive(binding) as unknown as CognitiveValue,
      sourceIds: [...source.sourceIds],
      proofIds: [
        ...source.proofIds,
        "realization-engine-proof",
        "upstream-result-binding",
      ],
      authority: source.authority,
    },
    evidence: [
      "realization-engine-proof",
      "upstream-result-binding",
      `operator:${operator.toLowerCase()}`,
    ],
  };
};

export const realizationEngineAdapters = {
  "realization-engine": realizationEngineAdapter,
} as const;

export const cognitiveRealizationDomainSignature = (
  domain: CompiledCognitiveDomain,
) =>
  cognitiveDigest({
    domainId: domain.id,
    domainVersion: domain.version,
    operators: ["EXPLAIN", "MATCH"],
    bindingKind: "AVA_RESULT_BINDING",
  });
