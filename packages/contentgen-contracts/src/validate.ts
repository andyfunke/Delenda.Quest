/** Schema-shaped validators for contentgen-contract/v1 fixtures. */

import { CONTENTGEN_CONTRACT_VERSION } from "./canonical.ts";
import {
  CONTENT_MEDIA,
  DISPOSITION_LEGALITY,
  FAILURE_CLASSES,
  REVIEW_REASON_CODES,
} from "./constants.ts";
import type {
  ContentMedium,
  Disposition,
  FailureClass,
  GrammarRecipe,
  ReviewReasonCode,
} from "./types.ts";

export type ValidationIssue = { path: string; message: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const knownMechanics = new Set([
  "reinforce",
  "interdict",
  "route",
  "abandon",
  "exploit",
  "breach",
  "network",
]);

export const validateGrammarRecipe = (value: unknown): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (!isObject(value)) return [{ path: "", message: "recipe must be object" }];

  if (value.contractVersion !== CONTENTGEN_CONTRACT_VERSION) {
    issues.push({
      path: "contractVersion",
      message: `expected ${CONTENTGEN_CONTRACT_VERSION}`,
    });
  }
  if (typeof value.id !== "string" || !value.id) {
    issues.push({ path: "id", message: "required string" });
  }
  if (typeof value.version !== "string" || !value.version) {
    issues.push({ path: "version", message: "required string" });
  }
  if (!(CONTENT_MEDIA as readonly string[]).includes(value.medium as string)) {
    issues.push({ path: "medium", message: "missing or undeclared medium" });
  }
  if (!isObject(value.chord)) {
    issues.push({ path: "chord", message: "SharedChord required" });
  }
  if (!Array.isArray(value.mechanicRefs)) {
    issues.push({ path: "mechanicRefs", message: "required array" });
  } else {
    for (const [i, ref] of value.mechanicRefs.entries()) {
      if (typeof ref !== "string" || !knownMechanics.has(ref)) {
        issues.push({
          path: `mechanicRefs[${i}]`,
          message: "undeclared mechanic reference",
        });
      }
    }
  }
  if (!Array.isArray(value.requiredClaims) || !Array.isArray(value.forbiddenClaims)) {
    issues.push({
      path: "claims",
      message: "requiredClaims and forbiddenClaims required",
    });
  } else {
    const forbidden = new Set(value.forbiddenClaims as string[]);
    for (const claim of value.requiredClaims as string[]) {
      if (forbidden.has(claim)) {
        issues.push({
          path: "requiredClaims",
          message: `contradictory required/forbidden claim: ${claim}`,
        });
      }
    }
  }
  if (isObject(value.projection)) {
    const medium = value.medium as ContentMedium;
    const projectionMedium = value.projection.medium;
    if (projectionMedium && projectionMedium !== medium) {
      issues.push({
        path: "projection.medium",
        message: "illegal cross-medium field",
      });
    }
    // Ava-only fields on non-Ava media are illegal cross-medium fields.
    if (medium !== "ava") {
      for (const key of [
        "intentLowering",
        "clarificationSafety",
        "actionReadSeparation",
      ]) {
        if (key in value.projection) {
          issues.push({
            path: `projection.${key}`,
            message: "illegal cross-medium field",
          });
        }
      }
    }
  }
  return issues;
};

export const isLegalDisposition = (
  compileStatus: "COMPILED" | "HARD_FAILURE",
  disposition: Disposition,
): boolean =>
  (DISPOSITION_LEGALITY[compileStatus] as readonly string[]).includes(
    disposition,
  );

export const isReviewReasonCode = (value: string): value is ReviewReasonCode =>
  (REVIEW_REASON_CODES as readonly string[]).includes(value);

export const isFailureClass = (value: string): value is FailureClass =>
  (FAILURE_CLASSES as readonly string[]).includes(value);

export type { GrammarRecipe };
