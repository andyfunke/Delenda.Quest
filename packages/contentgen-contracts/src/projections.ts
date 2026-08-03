/** Medium projection contracts (§4.4 / Epoch 010 procedure steps 3–4). */

import type { ContentMedium, MediumProjection } from "./types.ts";
import { FEATURE_FAMILIES } from "./constants.ts";

export const MEDIUM_PROJECTION_REQUIREMENTS: Record<
  ContentMedium,
  readonly string[]
> = {
  ava: ["intentLowering", "clarificationSafety", "actionReadSeparation"],
  "campaign-brief": [
    "theaterId",
    "problemClass",
    "phaseId",
    "situationTemplateId",
  ],
  "maneuver-procedure": ["mechanicId", "heat", "realizationId"],
  "romantic-arc": ["arcId", "beatIndex", "durationDays"],
  "execution-scene": ["resolvedDay", "tier", "heat"],
};

export const isSharedFeature = (featureId: string): boolean =>
  (FEATURE_FAMILIES.shared as readonly string[]).includes(featureId);

export const isForbiddenTransferFeature = (featureId: string): boolean =>
  (FEATURE_FAMILIES.forbiddenTransfer as readonly string[]).includes(featureId);

export const projectionMedium = (projection: MediumProjection): ContentMedium =>
  projection.medium;
