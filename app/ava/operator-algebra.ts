import type { CompiledCognitiveDomain } from "./cognitive-domain";
import {
  canonicalJson,
  cloneCognitive,
  cognitiveDigest,
  type CognitiveAuthority,
  type CognitiveValue,
} from "./cognitive-types";
import type { ResolvedSemanticTree } from "./resolved-semantic-tree";
import type { CognitiveWorldSnapshot } from "./world-model";

export const COGNITIVE_OPERATORS = [
  "IDENTITY", "CONSTANT", "SELECT", "PROJECT", "FILTER", "MAP", "REDUCE",
  "GROUP", "SORT", "UNION", "INTERSECTION", "DIFFERENCE", "JOIN", "COUNT",
  "SUM", "AVERAGE", "MINIMUM", "MAXIMUM", "NORMALIZE", "CLAMP", "RATIO",
  "DELTA", "MATCH", "EXPLAIN", "SATISFY", "CHECK_PRECONDITION", "SEQUENCE",
  "FORECAST", "DELAY", "INTERVENE", "COUNTERFACTUAL", "PROPAGATE_EFFECT",
  "FIND_CAUSE", "CORROBORATE", "DISPUTE", "ASSUME", "ESTIMATE", "BOUND",
  "DOWNWEIGHT", "MARGINALIZE", "COMPARE", "SCORE", "RANK", "OPTIMIZE",
  "DOMINANCE", "PARETO", "FALSIFY", "SENSITIVITY", "BUILD_PLAN", "ALLOCATE",
  "REPAIR", "EXPAND_ACTION", "BRANCH", "RESERVE", "TERMINATE",
] as const;

export type CognitiveOperator = (typeof COGNITIVE_OPERATORS)[number];
export type CognitiveDatumKind =
  | "ANY" | "NUMBER" | "BOOLEAN" | "STRING" | "LIST" | "RECORD" | "NULL";

export type CognitiveDatum = {
  kind: Exclude<CognitiveDatumKind, "ANY">;
  value: CognitiveValue;
  sourceIds: readonly string[];
  proofIds: readonly string[];
  authority: CognitiveAuthority;
};

export type CognitiveInputSpec = { id: string; kind: CognitiveDatumKind };
export type CognitiveOperatorSpec = {
  id: CognitiveOperator;
  category:
    | "RELATIONAL" | "NUMERIC" | "CONSTRAINT" | "TEMPORAL" | "CAUSAL"
    | "EPISTEMIC" | "DECISION" | "PLANNING" | "REALIZATION";
  inputs: readonly CognitiveInputSpec[];
  output: CognitiveDatumKind;
  authority: CognitiveAuthority;
  proofObligations: readonly string[];
  implementation: { kind: "INTRINSIC" } | { kind: "ADAPTER"; adapterId: string };
};

export type CognitiveInputRef =
  | { kind: "LITERAL"; datum: CognitiveDatum }
  | { kind: "NODE"; nodeId: string }
  | { kind: "FACT"; factId: string };

export type CognitiveProgramNode = {
  id: string;
  operator: CognitiveOperator;
  inputs: Record<string, CognitiveInputRef>;
};

export type CognitiveProgram = {
  id: string;
  version: "1";
  semanticTreeDigest: string;
  worldRevision: string;
  authorityCeiling: CognitiveAuthority;
  nodes: readonly CognitiveProgramNode[];
  outputNodeId: string;
};

export type OperatorAdapterResult = {
  datum: CognitiveDatum;
  evidence: readonly string[];
};

export type OperatorAdapter = (input: {
  operator: CognitiveOperator;
  values: Readonly<Record<string, CognitiveDatum>>;
  node: CognitiveProgramNode;
  program: CognitiveProgram;
  domain: CompiledCognitiveDomain;
  world: CognitiveWorldSnapshot;
  semanticTree: ResolvedSemanticTree;
}) => OperatorAdapterResult;

export type CognitiveExecutionContext = {
  domain: CompiledCognitiveDomain;
  world: CognitiveWorldSnapshot;
  semanticTree: ResolvedSemanticTree;
  adapters?: Readonly<Record<string, OperatorAdapter>>;
};

export type CognitiveNodeExecution = {
  nodeId: string;
  operator: CognitiveOperator;
  status: "COMPLETED" | "BLOCKED";
  datum?: CognitiveDatum;
  missingAdapter?: string;
  obligations: readonly string[];
  dependencies: readonly string[];
};

export type CognitiveProgramResult = {
  status: "COMPLETED" | "BLOCKED" | "REJECTED";
  programId: string;
  worldRevision: string;
  executions: readonly CognitiveNodeExecution[];
  output?: CognitiveDatum;
  blocker?: string;
  digest: string;
};

const coreIntrinsic = new Set<CognitiveOperator>([
  "IDENTITY", "CONSTANT", "SELECT", "PROJECT", "FILTER", "MAP", "REDUCE",
  "GROUP", "SORT", "UNION", "INTERSECTION", "DIFFERENCE", "JOIN", "COUNT",
  "SUM", "AVERAGE", "MINIMUM", "MAXIMUM", "NORMALIZE", "CLAMP", "RATIO",
  "DELTA",
]);
const genericIntrinsic = new Set<CognitiveOperator>([
  "BRANCH", "RESERVE", "TERMINATE",
]);

const categories: Record<CognitiveOperator, CognitiveOperatorSpec["category"]> = {
  IDENTITY:"RELATIONAL", CONSTANT:"RELATIONAL", SELECT:"RELATIONAL", PROJECT:"RELATIONAL",
  FILTER:"RELATIONAL", MAP:"RELATIONAL", REDUCE:"RELATIONAL", GROUP:"RELATIONAL",
  SORT:"RELATIONAL", UNION:"RELATIONAL", INTERSECTION:"RELATIONAL", DIFFERENCE:"RELATIONAL",
  JOIN:"RELATIONAL", COUNT:"NUMERIC", SUM:"NUMERIC", AVERAGE:"NUMERIC",
  MINIMUM:"NUMERIC", MAXIMUM:"NUMERIC", NORMALIZE:"NUMERIC", CLAMP:"NUMERIC",
  RATIO:"NUMERIC", DELTA:"NUMERIC", MATCH:"REALIZATION", EXPLAIN:"REALIZATION",
  SATISFY:"CONSTRAINT", CHECK_PRECONDITION:"CONSTRAINT", SEQUENCE:"TEMPORAL",
  FORECAST:"TEMPORAL", DELAY:"TEMPORAL", INTERVENE:"CAUSAL", COUNTERFACTUAL:"CAUSAL",
  PROPAGATE_EFFECT:"CAUSAL", FIND_CAUSE:"CAUSAL", CORROBORATE:"EPISTEMIC",
  DISPUTE:"EPISTEMIC", ASSUME:"EPISTEMIC", ESTIMATE:"EPISTEMIC", BOUND:"EPISTEMIC",
  DOWNWEIGHT:"EPISTEMIC", MARGINALIZE:"EPISTEMIC", COMPARE:"DECISION", SCORE:"DECISION",
  RANK:"DECISION", OPTIMIZE:"DECISION", DOMINANCE:"DECISION", PARETO:"DECISION",
  FALSIFY:"DECISION", SENSITIVITY:"DECISION", BUILD_PLAN:"PLANNING", ALLOCATE:"PLANNING",
  REPAIR:"PLANNING", EXPAND_ACTION:"PLANNING", BRANCH:"PLANNING", RESERVE:"PLANNING",
  TERMINATE:"PLANNING",
};

const adapterId = (operator: CognitiveOperator) => {
  const category = categories[operator].toLowerCase();
  return `${category}-engine`;
};

const inputSpecs: Partial<Record<CognitiveOperator, readonly CognitiveInputSpec[]>> = {
  CONSTANT: [{ id: "value", kind: "ANY" }],
  COUNT: [{ id: "values", kind: "LIST" }],
  SUM: [{ id: "values", kind: "LIST" }],
  AVERAGE: [{ id: "values", kind: "LIST" }],
  MINIMUM: [{ id: "values", kind: "LIST" }],
  MAXIMUM: [{ id: "values", kind: "LIST" }],
  NORMALIZE: [{ id: "value", kind: "NUMBER" }, { id: "minimum", kind: "NUMBER" }, { id: "maximum", kind: "NUMBER" }],
  CLAMP: [{ id: "value", kind: "NUMBER" }, { id: "minimum", kind: "NUMBER" }, { id: "maximum", kind: "NUMBER" }],
  RATIO: [{ id: "numerator", kind: "NUMBER" }, { id: "denominator", kind: "NUMBER" }],
  DELTA: [{ id: "before", kind: "NUMBER" }, { id: "after", kind: "NUMBER" }],
  UNION: [{ id: "left", kind: "LIST" }, { id: "right", kind: "LIST" }],
  INTERSECTION: [{ id: "left", kind: "LIST" }, { id: "right", kind: "LIST" }],
  DIFFERENCE: [{ id: "left", kind: "LIST" }, { id: "right", kind: "LIST" }],
  JOIN: [{ id: "left", kind: "RECORD" }, { id: "right", kind: "RECORD" }],
  SATISFY: [{ id: "request", kind: "RECORD" }],
  CHECK_PRECONDITION: [{ id: "request", kind: "RECORD" }],
  SEQUENCE: [{ id: "request", kind: "RECORD" }],
  FORECAST: [{ id: "request", kind: "RECORD" }],
  DELAY: [{ id: "request", kind: "RECORD" }],
  INTERVENE: [{ id: "request", kind: "RECORD" }],
  COUNTERFACTUAL: [{ id: "request", kind: "RECORD" }],
  PROPAGATE_EFFECT: [{ id: "request", kind: "RECORD" }],
  FIND_CAUSE: [{ id: "request", kind: "RECORD" }],
  CORROBORATE: [{ id: "request", kind: "RECORD" }],
  DISPUTE: [{ id: "request", kind: "RECORD" }],
  ASSUME: [{ id: "request", kind: "RECORD" }],
  ESTIMATE: [{ id: "request", kind: "RECORD" }],
  BOUND: [{ id: "request", kind: "RECORD" }],
  DOWNWEIGHT: [{ id: "request", kind: "RECORD" }],
  MARGINALIZE: [{ id: "request", kind: "RECORD" }],
  COMPARE: [{ id: "request", kind: "RECORD" }],
  SCORE: [{ id: "request", kind: "RECORD" }],
  RANK: [{ id: "request", kind: "RECORD" }],
  OPTIMIZE: [{ id: "request", kind: "RECORD" }],
  DOMINANCE: [{ id: "request", kind: "RECORD" }],
  PARETO: [{ id: "request", kind: "RECORD" }],
  FALSIFY: [{ id: "request", kind: "RECORD" }],
  SENSITIVITY: [{ id: "request", kind: "RECORD" }],
  BRANCH: [{ id: "condition", kind: "BOOLEAN" }, { id: "whenTrue", kind: "ANY" }, { id: "whenFalse", kind: "ANY" }],
  RESERVE: [{ id: "resource", kind: "STRING" }, { id: "amount", kind: "NUMBER" }],
  TERMINATE: [{ id: "condition", kind: "BOOLEAN" }],
};

const defaultInputs: readonly CognitiveInputSpec[] = [{ id: "value", kind: "ANY" }];
const outputKind = (operator: CognitiveOperator): CognitiveDatumKind => {
  if (["COUNT","SUM","AVERAGE","MINIMUM","MAXIMUM","NORMALIZE","CLAMP","RATIO","DELTA"].includes(operator)) return "NUMBER";
  if (["TERMINATE"].includes(operator)) return "BOOLEAN";
  if (["SELECT","PROJECT","FILTER","MAP","REDUCE","GROUP","SORT","UNION","INTERSECTION","DIFFERENCE"].includes(operator)) return "LIST";
  if ([
    "JOIN","DELAY","SEQUENCE","COMPARE","BRANCH","RESERVE","FORECAST","INTERVENE",
    "COUNTERFACTUAL","PROPAGATE_EFFECT","FIND_CAUSE","CORROBORATE","DISPUTE",
    "ASSUME","BOUND","DOWNWEIGHT","MARGINALIZE","COMPARE","SCORE","RANK",
    "OPTIMIZE","DOMINANCE","PARETO","FALSIFY","SENSITIVITY",
    "BUILD_PLAN","ALLOCATE","REPAIR","EXPAND_ACTION","EXPLAIN","SATISFY",
    "CHECK_PRECONDITION",
  ].includes(operator)) return "RECORD";
  return "ANY";
};

export const COGNITIVE_OPERATOR_REGISTRY: ReadonlyMap<CognitiveOperator, CognitiveOperatorSpec> =
  new Map(COGNITIVE_OPERATORS.map((operator) => {
    const intrinsic = coreIntrinsic.has(operator) || genericIntrinsic.has(operator);
    const spec: CognitiveOperatorSpec = {
      id: operator,
      category: categories[operator],
      inputs: inputSpecs[operator] ?? defaultInputs,
      output: outputKind(operator),
      authority: "READ_ONLY",
      proofObligations: ["typed-inputs", "visible-evidence", "authority-ceiling", `operator:${operator.toLowerCase()}`],
      implementation: intrinsic ? { kind: "INTRINSIC" } : { kind: "ADAPTER", adapterId: adapterId(operator) },
    };
    return [operator, spec];
  }));

const authorityRank: Record<CognitiveAuthority, number> = { READ_ONLY:0, PLAN_ONLY:1, PREPARE:2, MUTATE:3 };
const kindOf = (value: CognitiveValue): CognitiveDatum["kind"] =>
  value === null ? "NULL" : Array.isArray(value) ? "LIST" : typeof value === "number" ? "NUMBER" : typeof value === "boolean" ? "BOOLEAN" : typeof value === "string" ? "STRING" : "RECORD";
const accepts = (expected: CognitiveDatumKind, actual: CognitiveDatum["kind"]) => expected === "ANY" || expected === actual;
const list = (datum: CognitiveDatum) => datum.value as CognitiveValue[];
const numberList = (datum: CognitiveDatum) => {
  const values = list(datum);
  if (values.some((value) => typeof value !== "number" || !Number.isFinite(value)))
    throw new Error("numeric operator received a nonnumeric list");
  return values as number[];
};
const combined = (values: readonly CognitiveDatum[], value: CognitiveValue, authority: CognitiveAuthority = "READ_ONLY"): CognitiveDatum => ({
  kind: kindOf(value), value: cloneCognitive(value),
  sourceIds: [...new Set(values.flatMap((item) => item.sourceIds))].sort(),
  proofIds: [...new Set(values.flatMap((item) => item.proofIds))].sort(), authority,
});
const valueKey = (value: CognitiveValue) => canonicalJson(value);

const intrinsicKernel = (operator: CognitiveOperator, values: Record<string, CognitiveDatum>): CognitiveDatum => {
  const all = Object.values(values);
  const first = all[0];
  switch (operator) {
    case "IDENTITY": case "CONSTANT": return combined(all, first.value, first.authority);
    case "SELECT": case "PROJECT": case "FILTER": case "MAP": case "REDUCE": case "GROUP": case "SORT":
      return combined(all, Array.isArray(first.value) ? [...first.value] : [first.value]);
    case "UNION": return combined(all, [...new Map([...list(values.left), ...list(values.right)].map((item) => [valueKey(item), item])).values()]);
    case "INTERSECTION": { const right = new Set(list(values.right).map(valueKey)); return combined(all, list(values.left).filter((item) => right.has(valueKey(item)))); }
    case "DIFFERENCE": { const right = new Set(list(values.right).map(valueKey)); return combined(all, list(values.left).filter((item) => !right.has(valueKey(item)))); }
    case "JOIN": return combined(all, { ...(values.left.value as Record<string, CognitiveValue>), ...(values.right.value as Record<string, CognitiveValue>) });
    case "COUNT": return combined(all, list(values.values).length);
    case "SUM": return combined(all, numberList(values.values).reduce((sum, value) => sum + value, 0));
    case "AVERAGE": { const numbers = numberList(values.values); if (!numbers.length) throw new Error("AVERAGE requires at least one value"); return combined(all, numbers.reduce((a,b)=>a+b,0)/numbers.length); }
    case "MINIMUM": { const numbers=numberList(values.values); if(!numbers.length)throw new Error("MINIMUM requires at least one value"); return combined(all,Math.min(...numbers)); }
    case "MAXIMUM": { const numbers=numberList(values.values); if(!numbers.length)throw new Error("MAXIMUM requires at least one value"); return combined(all,Math.max(...numbers)); }
    case "NORMALIZE": { const value=values.value.value as number,min=values.minimum.value as number,max=values.maximum.value as number;if(max<=min)throw new Error("NORMALIZE requires maximum > minimum");return combined(all,(value-min)/(max-min)); }
    case "CLAMP": { const value=values.value.value as number,min=values.minimum.value as number,max=values.maximum.value as number;if(max<min)throw new Error("CLAMP range is inverted");return combined(all,Math.min(max,Math.max(min,value))); }
    case "RATIO": { const denominator=values.denominator.value as number;if(denominator===0)throw new Error("RATIO denominator is zero");return combined(all,(values.numerator.value as number)/denominator); }
    case "DELTA": return combined(all,(values.after.value as number)-(values.before.value as number));
    case "SATISFY": return combined(all,list(values.conditions).every(Boolean));
    case "SEQUENCE": return combined(all,[...list(values.values)]);
    case "DELAY": { const phases=values.phases.value as number;if(!Number.isInteger(phases)||phases<0)throw new Error("DELAY phases must be nonnegative integer");return combined(all,{value:values.value.value,phases}); }
    case "COMPARE": { const left=values.left.value as number,right=values.right.value as number;return combined(all,{relation:left===right?"EQUAL":left>right?"GREATER":"LESS",delta:left-right}); }
    case "SCORE": { const numbers=numberList(values.values),weights=numberList(values.weights);if(numbers.length!==weights.length)throw new Error("SCORE values and weights differ in length");return combined(all,numbers.reduce((sum,value,index)=>sum+value*weights[index],0)); }
    case "RANK": return combined(all,[...list(values.values)].sort((a,b)=>valueKey(a).localeCompare(valueKey(b))));
    case "BRANCH": return combined(all,{selected:(values.condition.value as boolean)?"whenTrue":"whenFalse",value:(values.condition.value as boolean)?values.whenTrue.value:values.whenFalse.value});
    case "RESERVE": { const amount=values.amount.value as number;if(amount<0)throw new Error("RESERVE amount must be nonnegative");return combined(all,{resource:values.resource.value,amount}); }
    case "TERMINATE": return combined(all,values.condition.value as boolean);
    default: throw new Error(`${operator} has no intrinsic kernel`);
  }
};

const reject = (program: CognitiveProgram, executions: CognitiveNodeExecution[], blocker: string): CognitiveProgramResult => {
  const body = { status:"REJECTED" as const, programId:program.id, worldRevision:program.worldRevision, executions, blocker };
  return { ...body, digest:cognitiveDigest(body) };
};

export const executeCognitiveProgram = (program: CognitiveProgram, context: CognitiveExecutionContext): CognitiveProgramResult => {
  const executions: CognitiveNodeExecution[] = [];
  try {
    if (program.version !== "1") throw new Error("unsupported cognitive program version");
    if (program.worldRevision !== context.world.revision) throw new Error("cognitive program world revision is stale");
    if (program.semanticTreeDigest !== context.semanticTree.digest) throw new Error("cognitive program semantic tree is stale or forged");
    if (authorityRank[program.authorityCeiling] > authorityRank[context.semanticTree.authorityCeiling])
      throw new Error("program authority exceeds semantic authority ceiling");
    const nodes = new Map<string,CognitiveProgramNode>();
    for(const item of program.nodes){if(nodes.has(item.id))throw new Error(`duplicate cognitive node ${item.id}`);nodes.set(item.id,item);}
    if(!nodes.has(program.outputNodeId))throw new Error("program output node is absent");
    const results=new Map<string,CognitiveDatum>(),visiting=new Set<string>();
    const visibleFacts=new Map(context.world.facts.filter((fact)=>fact.visibility!=="HIDDEN").map((fact)=>[fact.id,fact]));
    const visit=(nodeId:string):CognitiveDatum|null=>{
      if(results.has(nodeId))return results.get(nodeId)!;
      if(visiting.has(nodeId))throw new Error(`cognitive graph cycle at ${nodeId}`);
      const current=nodes.get(nodeId);if(!current)throw new Error(`unknown cognitive dependency ${nodeId}`);
      const spec=COGNITIVE_OPERATOR_REGISTRY.get(current.operator);if(!spec)throw new Error(`unknown cognitive operator ${current.operator}`);
      const expected=spec.inputs.map((item)=>item.id),supplied=Object.keys(current.inputs);
      if(expected.length!==supplied.length||expected.some((id)=>!supplied.includes(id)))throw new Error(`${nodeId}: operator inputs do not match typed contract`);
      visiting.add(nodeId);const values:Record<string,CognitiveDatum>={};const dependencies:string[]=[];
      for(const input of spec.inputs){const ref=current.inputs[input.id];let datum:CognitiveDatum|null;
        if(ref.kind==="LITERAL")datum=cloneCognitive(ref.datum);
        else if(ref.kind==="NODE"){dependencies.push(ref.nodeId);datum=visit(ref.nodeId);}
        else {const fact=visibleFacts.get(ref.factId);if(!fact)throw new Error(`${nodeId}: hidden or absent fact ${ref.factId}`);datum={kind:kindOf(fact.value),value:cloneCognitive(fact.value),sourceIds:[fact.id,...fact.sourceIds],proofIds:[],authority:"READ_ONLY"};}
        if(!datum)return null;if(!accepts(input.kind,datum.kind))throw new Error(`${nodeId}/${input.id}: expected ${input.kind}, received ${datum.kind}`);values[input.id]=datum;
      }
      visiting.delete(nodeId);
      if(spec.implementation.kind==="ADAPTER"){
        const adapter=context.adapters?.[spec.implementation.adapterId];
        if(!adapter){executions.push({nodeId,operator:current.operator,status:"BLOCKED",missingAdapter:spec.implementation.adapterId,obligations:spec.proofObligations,dependencies});return null;}
        const output=adapter({operator:current.operator,values,node:current,program,domain:context.domain,world:context.world,semanticTree:context.semanticTree});
        if(!accepts(spec.output,output.datum.kind))throw new Error(`${nodeId}: adapter output violates ${spec.output} contract`);
        if(authorityRank[output.datum.authority]>authorityRank[program.authorityCeiling])throw new Error(`${nodeId}: adapter exceeded program authority`);
        for(const sourceId of output.datum.sourceIds)if(sourceId.startsWith("fact:")&&!visibleFacts.has(sourceId))throw new Error(`${nodeId}: adapter cited hidden or absent evidence ${sourceId}`);
        const datum={...cloneCognitive(output.datum),proofIds:[...new Set([...output.datum.proofIds,...spec.proofObligations,...output.evidence])].sort()};results.set(nodeId,datum);executions.push({nodeId,operator:current.operator,status:"COMPLETED",datum,obligations:spec.proofObligations,dependencies});return datum;
      }
      const raw=intrinsicKernel(current.operator,values);const datum={...raw,proofIds:[...new Set([...raw.proofIds,...spec.proofObligations])].sort()};
      if(!accepts(spec.output,datum.kind))throw new Error(`${nodeId}: intrinsic output violates ${spec.output} contract`);
      results.set(nodeId,datum);executions.push({nodeId,operator:current.operator,status:"COMPLETED",datum,obligations:spec.proofObligations,dependencies});return datum;
    };
    const output=visit(program.outputNodeId);
    if(!output){const blocker=executions.find((item)=>item.status==="BLOCKED")?.missingAdapter??"blocked dependency";const body={status:"BLOCKED" as const,programId:program.id,worldRevision:program.worldRevision,executions,blocker};return{...body,digest:cognitiveDigest(body)};}
    const body={status:"COMPLETED" as const,programId:program.id,worldRevision:program.worldRevision,executions,output};return{...body,digest:cognitiveDigest(body)};
  } catch(error){return reject(program,executions,error instanceof Error?error.message:String(error));}
};

export const cognitiveOperatorManifest = () => ({
  count: COGNITIVE_OPERATOR_REGISTRY.size,
  intrinsic: [...COGNITIVE_OPERATOR_REGISTRY.values()].filter((item)=>item.implementation.kind==="INTRINSIC").map((item)=>item.id),
  adapted: [...COGNITIVE_OPERATOR_REGISTRY.values()].filter((item)=>item.implementation.kind==="ADAPTER").map((item)=>item.id),
  digest: cognitiveDigest([...COGNITIVE_OPERATOR_REGISTRY.values()]),
});
