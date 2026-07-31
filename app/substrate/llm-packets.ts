import type { Channel } from "./gates";
import type { ChoiceEvaluation } from "./choice-evaluation";
import type { StrategicPosture } from "./posture";
import { validateStrategicPosture } from "./posture";

export type RealizationPacket = {
  channel: Channel;
  semanticObjectId: string;
  mechanic: {
    id: string;
    effects: Record<string, number | string | boolean>;
  };
  bindings: Record<string, string | number | boolean>;
  requiredClaims: string[];
  forbiddenClaims: string[];
  register: string;
  outputSchema: {
    title: { minWords: number; maxWords: number };
    brief: { minWords: number; maxWords: number };
    terms?: { clauses: number };
    risk?: { clauses: number };
  };
  contentVersion: string;
  reviewStatus: "draft" | "approved" | "rejected";
};

export type LlmDeliberationPacket = {
  posture: StrategicPosture;
  legalCandidateIds: string[];
  evaluations: ChoiceEvaluation[];
  visibleFactIds: string[];
  requiredClaims: string[];
  forbiddenClaims: string[];
  clarificationConflicts: StrategicPosture["unresolvedConflicts"];
};

export type RealizationDraft = {
  title: string;
  brief: string;
  claimIds: string[];
  numbers: number[];
  stateKeys: string[];
  mechanicId: string;
};

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export const validateRealizationDraft = (
  packet: RealizationPacket,
  draft: RealizationDraft,
): { ok: true } | { ok: false; errors: string[] } => {
  const errors: string[] = [];
  if (packet.reviewStatus !== "approved" && packet.reviewStatus !== "draft") {
    errors.push("invalid review status");
  }
  if (!packet.contentVersion) errors.push("missing content version");
  if (draft.mechanicId !== packet.mechanic.id) errors.push("mechanic mismatch");
  const titleWords = wordCount(draft.title);
  const briefWords = wordCount(draft.brief);
  if (titleWords < packet.outputSchema.title.minWords || titleWords > packet.outputSchema.title.maxWords) {
    errors.push("title length");
  }
  if (briefWords < packet.outputSchema.brief.minWords || briefWords > packet.outputSchema.brief.maxWords) {
    errors.push("brief length");
  }
  for (const claim of packet.requiredClaims) {
    if (!draft.claimIds.includes(claim)) errors.push(`missing required claim ${claim}`);
  }
  for (const claim of packet.forbiddenClaims) {
    if (draft.claimIds.includes(claim) || draft.brief.includes(claim) || draft.title.includes(claim)) {
      errors.push(`forbidden claim ${claim}`);
    }
  }
  const allowedNumbers = new Set(
    Object.values(packet.mechanic.effects).filter((value): value is number => typeof value === "number"),
  );
  for (const number of draft.numbers) {
    if (!allowedNumbers.has(number)) errors.push(`undeclared number ${number}`);
  }
  for (const key of draft.stateKeys) {
    if (!(key in packet.bindings) && !(key in packet.mechanic.effects)) {
      errors.push(`unknown state key ${key}`);
    }
  }
  if (packet.reviewStatus !== "approved") errors.push("publication requires approved review status");
  return errors.length ? { ok: false, errors } : { ok: true };
};

export const compileLlmPostureProposal = (input: unknown) => validateStrategicPosture(input);

export const buildDeliberationPacket = (input: {
  posture: StrategicPosture;
  evaluations: ChoiceEvaluation[];
  visibleFactIds: string[];
}): LlmDeliberationPacket => ({
  posture: input.posture,
  legalCandidateIds: input.evaluations.filter((item) => item.legal && item.visible).map((item) => item.choiceId),
  evaluations: input.evaluations,
  visibleFactIds: input.visibleFactIds,
  requiredClaims: input.evaluations.flatMap((item) =>
    item.knownBenefits.map((benefit) => benefit.id),
  ),
  forbiddenClaims: ["hidden_probability", "gate_trace", "rng_state"],
  clarificationConflicts: input.posture.unresolvedConflicts,
});

export const assertPacketPlayerVisibleOnly = (packet: LlmDeliberationPacket) => {
  const bannedPaths = ["rng_state", "gate_trace", "exhaustion_order", "hidden_probability_value"];
  const visible = JSON.stringify({
    posture: packet.posture,
    legalCandidateIds: packet.legalCandidateIds,
    evaluations: packet.evaluations,
    visibleFactIds: packet.visibleFactIds,
    clarificationConflicts: packet.clarificationConflicts,
  }).toLowerCase();
  if (packet.legalCandidateIds.some((_, index) => !packet.evaluations[index]?.visible && packet.evaluations[index]?.choiceId)) {
    // non-visible candidates must not appear as legal
  }
  if (packet.legalCandidateIds.some((id) => {
    const row = packet.evaluations.find((item) => item.choiceId === id);
    return !row || !row.visible || !row.legal;
  })) {
    return false;
  }
  return bannedPaths.every((token) => !visible.includes(token));
};
