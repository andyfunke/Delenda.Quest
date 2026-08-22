/**
 * Runtime gateway for promoted execution-scene realization recipes.
 *
 * Doctrine (Contentgen compiler law): runtime content enters through
 * Git-versioned promoted manifests only. This module is the one production
 * bridge from a promoted chord-metagrammar manifest
 * (`app/campaign-content/execution-scenes/recipes.v1.json`) into a live
 * campaign draw (`compileExecutionScene`'s realization selection in
 * `app/game.ts`).
 *
 * Verification fails closed: any manifest defect yields `null`, and the
 * caller then omits the pool so the execution-scene compiler keeps its
 * built-in deterministic pool. Recipe order is preserved exactly as
 * committed because the draw indexes into the pool by seeded ticket.
 */
import recipesManifest from "./campaign-content/execution-scenes/recipes.v1.json";

export const EXECUTION_RECIPE_MANIFEST_VERSION = "execution-realization/v1";

export type ExecutionRecipeReview = {
  authenticated: boolean;
  disposition: string;
  reviewerReceiptId: string;
};

export type ExecutionRecipe = {
  id: string;
  register: string;
  review: ExecutionRecipeReview;
};

const recordObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Returns a list of defects; an empty list means the manifest is promotable. */
export const verifyExecutionRecipeManifest = (manifest: unknown): string[] => {
  const issues: string[] = [];
  if (!recordObject(manifest)) return ["MANIFEST_NOT_OBJECT"];
  if (manifest.version !== EXECUTION_RECIPE_MANIFEST_VERSION) {
    issues.push("MANIFEST_VERSION_MISMATCH");
  }
  const recipes = manifest.recipes;
  if (!Array.isArray(recipes) || recipes.length === 0) {
    issues.push("MANIFEST_RECIPES_EMPTY");
    return issues;
  }
  const seen = new Set<string>();
  for (const [index, recipe] of recipes.entries()) {
    if (!recordObject(recipe)) {
      issues.push(`RECIPE_${index}_NOT_OBJECT`);
      continue;
    }
    if (typeof recipe.id !== "string" || !recipe.id) {
      issues.push(`RECIPE_${index}_MISSING_ID`);
      continue;
    }
    if (seen.has(recipe.id)) issues.push(`RECIPE_${recipe.id}_DUPLICATE`);
    seen.add(recipe.id);
    if (typeof recipe.register !== "string" || !recipe.register) {
      issues.push(`RECIPE_${recipe.id}_MISSING_REGISTER`);
    }
    const review = recipe.review;
    if (!recordObject(review)) {
      issues.push(`RECIPE_${recipe.id}_MISSING_REVIEW`);
      continue;
    }
    if (review.authenticated !== true) {
      issues.push(`RECIPE_${recipe.id}_UNAUTHENTICATED`);
    }
    if (review.disposition !== "QUALITY_MET") {
      issues.push(`RECIPE_${recipe.id}_DISPOSITION_${String(review.disposition)}`);
    }
    if (
      typeof review.reviewerReceiptId !== "string" ||
      !review.reviewerReceiptId
    ) {
      issues.push(`RECIPE_${recipe.id}_MISSING_RECEIPT`);
    }
  }
  return issues;
};

/**
 * The verified realization pool in committed manifest order, or `null` when
 * verification fails (fail closed; callers must then omit the pool).
 */
export const promotedExecutionRecipePoolFrom = (
  manifest: unknown,
): string[] | null => {
  if (verifyExecutionRecipeManifest(manifest).length > 0) return null;
  return (manifest as { recipes: ExecutionRecipe[] }).recipes.map(
    (recipe) => recipe.id,
  );
};

export const promotedExecutionRecipePool = (): string[] | null =>
  promotedExecutionRecipePoolFrom(recipesManifest);
