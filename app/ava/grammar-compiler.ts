import type { AvaSemanticQuery } from "./schema";

/**
 * The reusable compiler layer deliberately knows nothing about Delenda's
 * vocabulary. A GrammarSpec owns language, a DomainPack owns the complete IR
 * contract, and a CapabilityRegistry proves that an emitted IR has an
 * executable consumer.
 */
export type AvaSemanticField = keyof AvaSemanticQuery;

export type GrammarAtom = {
  id: string;
  surfaces: readonly string[];
  owns: readonly AvaSemanticField[];
  semantic: Partial<AvaSemanticQuery>;
  provenance?: string;
  allowEmptySurface?: boolean;
};

export type GrammarSlot = {
  id: string;
  atoms: readonly GrammarAtom[];
};

export type GrammarSpec = {
  id: string;
  version: string;
  fixedAtoms: readonly GrammarAtom[];
  slots: readonly GrammarSlot[];
  classification:
    | "generated"
    | "colloquial"
    | "misspelled"
    | "curated";
};

export type DomainPack = {
  id: string;
  version: string;
  requiredFields: readonly AvaSemanticField[];
  validate: (query: AvaSemanticQuery) => true | string;
};

export type CapabilityRegistry = {
  id: string;
  version: string;
  validate: (query: AvaSemanticQuery) => true | string;
};

export type CompiledSemanticRecipe = {
  id: string;
  normalized: string;
  expectedQuery: AvaSemanticQuery;
  /** Stable aliases for consumers that name the lowering target query or IR. */
  query: AvaSemanticQuery;
  ir: AvaSemanticQuery;
  provenance: string[];
  classification: GrammarSpec["classification"];
  semanticOwners: Partial<Record<AvaSemanticField, string>>;
};

export type GrammarCollision = {
  hash: string;
  normalized: string;
  recipes: CompiledSemanticRecipe[];
};

export type CompiledAgencyBundle = {
  grammarId: string;
  grammarVersion: string;
  domainPackId: string;
  domainPackVersion: string;
  capabilityRegistryId: string;
  capabilityRegistryVersion: string;
  recipes: CompiledSemanticRecipe[];
  utteranceIndex: Map<string, CompiledSemanticRecipe[]>;
  autocomplete: string[];
  collisions: GrammarCollision[];
  parse: (surface: string) => AvaSemanticQuery | null;
  print: (query: AvaSemanticQuery) => string | null;
  verifyRoundTrip: () => true;
};

export type CompileAgencyBundleInput = {
  grammarSpec: GrammarSpec;
  domainPack: DomainPack;
  capabilityRegistry: CapabilityRegistry;
  normalizeSurface: (surface: string) => string;
};

const own = Object.prototype.hasOwnProperty;

const clone = <T>(value: T): T => {
  if (Array.isArray(value))
    return value.map((item) => clone(item)) as T;
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value))
      result[key] = clone(child);
    return result as T;
  }
  return value;
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
};

export const semanticQuerySignature = (query: AvaSemanticQuery) =>
  JSON.stringify(canonicalize(query));

export const semanticQueriesEqual = (
  left: AvaSemanticQuery,
  right: AvaSemanticQuery,
) => semanticQuerySignature(left) === semanticQuerySignature(right);

export const stableUtteranceHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const assertAtom = (atom: GrammarAtom, location: string) => {
  if (!atom.id.trim()) throw new Error(`${location}: grammar atom has no id`);
  if (!atom.surfaces.length)
    throw new Error(`${location}/${atom.id}: grammar surface is empty`);
  if (!atom.owns.length)
    throw new Error(`${location}/${atom.id}: atom owns no semantic fields`);

  const declared = [...new Set(atom.owns)];
  if (declared.length !== atom.owns.length)
    throw new Error(
      `${location}/${atom.id}: a semantic field is owned more than once`,
    );
  const supplied = Object.keys(atom.semantic) as AvaSemanticField[];
  for (const field of declared) {
    if (!own.call(atom.semantic, field))
      throw new Error(
        `${location}/${atom.id}: owns ${field} but supplies no value`,
      );
    if (atom.semantic[field] === undefined)
      throw new Error(
        `${location}/${atom.id}: supplies undefined for owned field ${field}`,
      );
  }
  for (const field of supplied) {
    if (!declared.includes(field))
      throw new Error(
        `${location}/${atom.id}: supplies ${field} without owning it`,
      );
  }
  for (const surface of atom.surfaces) {
    if (!surface.trim() && !atom.allowEmptySurface)
      throw new Error(`${location}/${atom.id}: grammar surface is empty`);
  }
};

const selectedCombinations = (
  slots: readonly GrammarSlot[],
): Array<Array<{ slot: GrammarSlot; atom: GrammarAtom; surface: string }>> => {
  const output: Array<
    Array<{ slot: GrammarSlot; atom: GrammarAtom; surface: string }>
  > = [];
  const visit = (
    index: number,
    selected: Array<{ slot: GrammarSlot; atom: GrammarAtom; surface: string }>,
  ) => {
    if (index === slots.length) {
      output.push(selected);
      return;
    }
    const slot = slots[index];
    for (const atom of slot.atoms)
      for (const surface of atom.surfaces)
        visit(index + 1, [...selected, { slot, atom, surface }]);
  };
  visit(0, []);
  return output;
};

const composeQuery = (
  atoms: Array<{ atom: GrammarAtom; owner: string }>,
  requiredFields: readonly AvaSemanticField[],
) => {
  const semantic: Partial<AvaSemanticQuery> = {};
  const semanticOwners: Partial<Record<AvaSemanticField, string>> = {};
  for (const { atom, owner } of atoms) {
    for (const field of atom.owns) {
      const previous = semanticOwners[field];
      if (previous)
        throw new Error(
          `semantic field ${field} has multiple owners: ${previous}, ${owner}`,
        );
      semanticOwners[field] = owner;
      Object.assign(semantic, {
        [field]: clone(atom.semantic[field]),
      });
    }
  }
  const missing = requiredFields.filter(
    (field) => !own.call(semantic, field),
  );
  if (missing.length)
    throw new Error(
      `compiled production is missing semantic fields: ${missing.join(", ")}`,
    );
  return {
    query: semantic as AvaSemanticQuery,
    semanticOwners,
  };
};

/**
 * GrammarSpec + DomainPack + CapabilityRegistry -> CompiledAgencyBundle.
 *
 * Compilation is deliberately strict. Every emitted top-level semantic field
 * has exactly one owner, every required field is present, and every complete
 * query must be accepted by both the domain and an executable capability.
 */
export const compileAgencyBundle = ({
  grammarSpec,
  domainPack,
  capabilityRegistry,
  normalizeSurface,
}: CompileAgencyBundleInput): CompiledAgencyBundle => {
  if (!grammarSpec.id.trim())
    throw new Error("grammar spec has no id");
  if (!grammarSpec.version.trim())
    throw new Error(`${grammarSpec.id}: grammar spec has no version`);
  if (!domainPack.requiredFields.length)
    throw new Error(`${domainPack.id}: domain pack has no required fields`);
  if (!grammarSpec.slots.length)
    throw new Error(`${grammarSpec.id}: grammar surface is empty`);

  grammarSpec.fixedAtoms.forEach((atom) =>
    assertAtom(atom, `${grammarSpec.id}/fixed`),
  );
  for (const slot of grammarSpec.slots) {
    if (!slot.id.trim())
      throw new Error(`${grammarSpec.id}: grammar slot has no id`);
    if (!slot.atoms.length)
      throw new Error(
        `${grammarSpec.id}/${slot.id}: grammar surface is empty`,
      );
    slot.atoms.forEach((atom) =>
      assertAtom(atom, `${grammarSpec.id}/${slot.id}`),
    );
  }

  const combinations = selectedCombinations(grammarSpec.slots);
  if (!combinations.length)
    throw new Error(`${grammarSpec.id}: grammar surface is empty`);

  const recipes: CompiledSemanticRecipe[] = combinations.map(
    (combination, recipeIndex) => {
      const surface = combination
        .map(({ surface: part }) => part.trim())
        .filter(Boolean)
        .join(" ");
      const normalized = normalizeSurface(surface);
      if (!normalized)
        throw new Error(
          `${grammarSpec.id}: production ${recipeIndex} has an empty normalized surface`,
        );
      const atoms = [
        ...grammarSpec.fixedAtoms.map((atom) => ({
          atom,
          owner: `fixed:${atom.id}`,
        })),
        ...combination.map(({ slot, atom }) => ({
          atom,
          owner: `${slot.id}:${atom.id}`,
        })),
      ];
      const { query, semanticOwners } = composeQuery(
        atoms,
        domainPack.requiredFields,
      );
      const domainValidation = domainPack.validate(query);
      if (domainValidation !== true)
        throw new Error(
          `${grammarSpec.id}/${recipeIndex}: domain rejected IR: ${domainValidation}`,
        );
      const capabilityValidation = capabilityRegistry.validate(query);
      if (capabilityValidation !== true)
        throw new Error(
          `${grammarSpec.id}/${recipeIndex}: capability rejected IR: ${capabilityValidation}`,
        );
      const provenance = combination.map(
        ({ slot, atom, surface: atomSurface }) =>
          atom.provenance ??
          `${slot.id.toUpperCase()}:${atom.id}:${atomSurface || "<epsilon>"}`,
      );
      const completeQuery = clone(query);
      return {
        id: `${grammarSpec.id}:${recipeIndex}`,
        normalized,
        expectedQuery: completeQuery,
        query: completeQuery,
        ir: completeQuery,
        provenance,
        classification: grammarSpec.classification,
        semanticOwners,
      };
    },
  );

  const utteranceIndex = new Map<string, CompiledSemanticRecipe[]>();
  for (const recipe of recipes) {
    const hash = stableUtteranceHash(recipe.normalized);
    utteranceIndex.set(hash, [
      ...(utteranceIndex.get(hash) ?? []),
      recipe,
    ]);
  }

  const byNormalized = new Map<string, CompiledSemanticRecipe[]>();
  for (const recipe of recipes)
    byNormalized.set(recipe.normalized, [
      ...(byNormalized.get(recipe.normalized) ?? []),
      recipe,
    ]);
  const collisions: GrammarCollision[] = [];
  for (const [normalized, matching] of byNormalized) {
    const meanings = new Set(
      matching.map((recipe) =>
        semanticQuerySignature(recipe.expectedQuery),
      ),
    );
    if (meanings.size > 1)
      collisions.push({
        hash: stableUtteranceHash(normalized),
        normalized,
        recipes: matching,
      });
  }
  if (collisions.length)
    throw new Error(
      `${grammarSpec.id}: ${collisions.length} ambiguous normalized grammar surfaces`,
    );

  const canonicalBySemantic = new Map<string, string>();
  for (const recipe of recipes) {
    const signature = semanticQuerySignature(recipe.expectedQuery);
    if (!canonicalBySemantic.has(signature))
      canonicalBySemantic.set(signature, recipe.normalized);
  }
  const parse = (surface: string) => {
    const normalized = normalizeSurface(surface);
    const bucket =
      utteranceIndex.get(stableUtteranceHash(normalized)) ?? [];
    const recipe = bucket.find((entry) => entry.normalized === normalized);
    return recipe ? clone(recipe.expectedQuery) : null;
  };
  const print = (query: AvaSemanticQuery) =>
    canonicalBySemantic.get(semanticQuerySignature(query)) ?? null;
  const verifyRoundTrip = () => {
    for (const recipe of recipes) {
      const printed = print(recipe.expectedQuery);
      if (!printed)
        throw new Error(`${recipe.id}: no canonical printer surface`);
      const reparsed = parse(printed);
      if (
        !reparsed ||
        !semanticQueriesEqual(reparsed, recipe.expectedQuery)
      )
        throw new Error(`${recipe.id}: parse(print(IR)) != IR`);
    }
    return true as const;
  };

  const bundle: CompiledAgencyBundle = {
    grammarId: grammarSpec.id,
    grammarVersion: grammarSpec.version,
    domainPackId: domainPack.id,
    domainPackVersion: domainPack.version,
    capabilityRegistryId: capabilityRegistry.id,
    capabilityRegistryVersion: capabilityRegistry.version,
    recipes,
    utteranceIndex,
    autocomplete: [...new Set(recipes.map((recipe) => recipe.normalized))].sort(
      (left, right) => left.localeCompare(right),
    ),
    collisions,
    parse,
    print,
    verifyRoundTrip,
  };
  bundle.verifyRoundTrip();
  return bundle;
};

/** Compatibility aliases for research notes and downstream domain packs. */
export const compileGrammarSpec = compileAgencyBundle;
export const compileCompiledAgencyBundle = compileAgencyBundle;

