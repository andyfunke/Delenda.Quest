import type { GameState } from "../game";
import { actorMetadataById, DIPLOMACY_ACTOR_METADATA } from "./actor-metadata";
import { militaryCladeCategory } from "./clades";
import {
  buildDirectiveForest,
  choiceById,
  familyById,
} from "./content-adapters";
import {
  CONTENT_VERSION,
  type DocketFact,
  type DocketRecord,
  type VisibleChoice,
} from "./contracts";
import type { Channel } from "./gates";
import { evaluateGate, type GateContext } from "./gates";
import { candidateSetHash, selectionTicketFor, stableHash } from "./hash";

export type ScoreComponents = {
  relevance: number;
  continuity: number;
  novelty: number;
  actorAffinity: number;
  priorityFit: number;
  diversityFit: number;
  repetition: number;
  cooldown: number;
  overexposure: number;
};

export type ScoredCandidate = {
  cladeId: string;
  familyId: string;
  category: string;
  score: number;
  components: ScoreComponents;
  cooldownActive: boolean;
};

const clampInt = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(n)));

const docketKey = (day: number, channel: Channel, actorId?: string) =>
  `${day}:${channel}:${actorId ?? ""}`;

export const getStoredDocket = (
  state: GameState,
  channel: Channel,
  actorId?: string,
): DocketRecord | null => {
  const records = state.dailyDockets ?? [];
  return (
    records.find(
      (record) =>
        record.campaignDay === state.day &&
        record.channel === channel &&
        (record.actorId ?? "") === (actorId ?? ""),
    ) ?? null
  );
};

export const upsertDocketRecord = (
  state: GameState,
  record: DocketRecord,
): GameState => {
  const dailyDockets = [...(state.dailyDockets ?? [])];
  const index = dailyDockets.findIndex(
    (item) =>
      item.campaignDay === record.campaignDay &&
      item.channel === record.channel &&
      (item.actorId ?? "") === (record.actorId ?? ""),
  );
  if (index >= 0) dailyDockets[index] = record;
  else dailyDockets.push(record);
  return { ...state, dailyDockets };
};

const gateContextFor = (state: GameState, channel: Channel, actorId?: string): GateContext => ({
  day: state.day,
  campaignDay: state.day,
  module: channel,
  actorId,
  ordersRemaining: state.actions,
  surface: "internal",
  scalars: {
    readiness: state.readiness,
    legitimacy: state.legitimacy,
    resistance: state.resistance,
    dependency: state.dependency,
    intelligence: state.intelligence,
    treasury: state.treasury,
    front: state.front,
  },
  activeNodeIds: Object.keys(state.active ?? {}),
  usedCounts: Object.fromEntries(
    Object.entries(state.locks ?? {}).map(([id, until]) => [id, Math.max(0, until - state.day)]),
  ),
  cooldownElapsed: Object.fromEntries(
    Object.entries(state.locks ?? {}).map(([id, until]) => [
      id,
      Math.max(0, state.day - until),
    ]),
  ),
  relationships: Object.fromEntries(
    (state.actors ?? []).map((actor) => [
      actor.id,
      {
        trust: actor.trust,
        leverage: actor.leverage,
        dependency: actor.dependency,
        obligation: actor.obligation,
      },
    ]),
  ),
});

const familyEligible = (state: GameState, familyId: string) => {
  const family = familyById(familyId);
  if (!family) return false;
  const lockUntil = state.locks?.[familyId] ?? 0;
  return lockUntil <= state.day;
};

const scoreFamily = (
  state: GameState,
  cladeId: string,
  familyId: string,
  category: string,
  actorId: string | undefined,
  respectCooldown: boolean,
): ScoredCandidate | null => {
  const family = familyById(familyId);
  if (!family) return null;
  const lockUntil = state.locks?.[familyId] ?? 0;
  const cooldownActive = lockUntil > state.day;
  if (respectCooldown && cooldownActive) return null;

  const recent = (state.decisions ?? []).filter(
    (decision) => decision.familyId === familyId || decision.family === family.label,
  ).length;
  const relevance = clampInt(
    120 +
      (family.module === "national" && state.materiel < 50 ? 80 : 0) +
      (family.module === "military" && state.readiness < 55 ? 90 : 0) +
      (family.module === "diplomacy" && state.dependency > 30 ? 70 : 0) +
      (category.toLowerCase().includes("supply") && coveragePressure(state) ? 100 : 0),
    0,
    400,
  );
  const continuity = clampInt(recent > 0 ? 40 : 20, 0, 100);
  const novelty = clampInt(150 - recent * 40, 0, 150);
  const meta = actorId ? actorMetadataById[actorId] : undefined;
  const actorAffinity = clampInt(
    meta?.preferredInstruments.some((instrument) =>
      familyId.includes(instrument.split("-")[0] ?? instrument),
    ) || meta?.allowedFamilyIds.includes(familyId)
      ? 160
      : actorId
        ? 40
        : 80,
    0,
    200,
  );
  const priorityFit = clampInt(
    family.module === "military" && state.front < 0
      ? 140
      : family.module === "national"
        ? 110
        : 100,
    0,
    200,
  );
  const diversityFit = 50;
  const repetition = clampInt(recent * 60, 0, 300);
  const cooldown = !respectCooldown && cooldownActive ? 1000 : 0;
  const overexposure = clampInt(recent * 30, 0, 200);
  const components: ScoreComponents = {
    relevance,
    continuity,
    novelty,
    actorAffinity,
    priorityFit,
    diversityFit,
    repetition,
    cooldown,
    overexposure,
  };
  const score =
    relevance +
    continuity +
    novelty +
    actorAffinity +
    priorityFit +
    diversityFit -
    repetition -
    cooldown -
    overexposure;
  return {
    cladeId,
    familyId,
    category,
    score,
    components,
    cooldownActive,
  };
};

const coveragePressure = (state: GameState) => {
  const lines = Object.values(state.production ?? {});
  return lines.some((line) => line.stock < line.use * 2);
};

const pickChoices = (
  state: GameState,
  familyId: string,
  ticket: string,
): string[] => {
  const family = familyById(familyId);
  if (!family) return [];
  const eligible = family.choices.filter((choice) => {
    // Keep all authored choices; availability is checked at commit time.
    return Boolean(choice.id);
  });
  const count = eligible.length <= 2 ? eligible.length : eligible.length === 3 ? 3 : 3;
  const ranked = [...eligible].sort((a, b) => {
    const ha = stableHash(`${ticket}:choice:${a.id}`);
    const hb = stableHash(`${ticket}:choice:${b.id}`);
    return hb - ha || a.id.localeCompare(b.id);
  });
  return ranked.slice(0, Math.min(count, Math.max(2, Math.min(3, ranked.length)))).map((c) => c.id);
};

const selectTopDistinctClades = (
  scored: ScoredCandidate[],
  slots: number,
  diversity: boolean,
  ticket: string,
) => {
  const sorted = [...scored].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ha = stableHash(`${ticket}:tie:${a.familyId}`);
    const hb = stableHash(`${ticket}:tie:${b.familyId}`);
    return hb - ha || a.familyId.localeCompare(b.familyId);
  });
  const selected: ScoredCandidate[] = [];
  const usedClades = new Set<string>();
  const usedCategories = new Set<string>();

  for (const candidate of sorted) {
    if (selected.length >= slots) break;
    if (usedClades.has(candidate.cladeId)) continue;
    if (diversity && selected.length === 1) {
      const firstCat = militaryCladeCategory(selected[0].cladeId);
      const nextCat = militaryCladeCategory(candidate.cladeId);
      if (firstCat === nextCat) continue;
    }
    selected.push(candidate);
    usedClades.add(candidate.cladeId);
    usedCategories.add(militaryCladeCategory(candidate.cladeId));
  }

  if (selected.length < slots) {
    for (const candidate of sorted) {
      if (selected.length >= slots) break;
      if (usedClades.has(candidate.cladeId)) continue;
      selected.push(candidate);
      usedClades.add(candidate.cladeId);
    }
  }
  return selected;
};

const compileChannelCandidates = (
  state: GameState,
  channel: Channel,
  actorId: string | undefined,
  respectCooldown: boolean,
) => {
  const forest = buildDirectiveForest().filter((clade) => clade.channel === channel);
  const context = gateContextFor(state, channel, actorId);
  const scored: ScoredCandidate[] = [];
  for (const clade of forest) {
    if (!evaluateGate({ op: "all", gates: clade.gates }, context)) continue;
    for (const family of clade.children ?? []) {
      if (actorId) {
        const meta = actorMetadataById[actorId];
        if (!meta?.allowedFamilyIds.includes(family.id)) continue;
        if (meta.forbiddenClades.includes(clade.id)) continue;
      }
      if (!evaluateGate({ op: "all", gates: family.gates }, context)) continue;
      if (respectCooldown && !familyEligible(state, family.id) && channel !== "diplomacy") {
        // locks still score via cooldown path below
      }
      const candidate = scoreFamily(
        state,
        clade.id,
        family.id,
        clade.category ?? clade.label,
        actorId,
        respectCooldown,
      );
      if (candidate) scored.push(candidate);
    }
  }
  return scored;
};

const recordFromSelection = (
  state: GameState,
  channel: Channel,
  actorId: string | undefined,
  selected: ScoredCandidate[],
  cooldownOverride: boolean,
  degraded: boolean,
  diagnostic: string | undefined,
  allCandidateIds: string[],
): DocketRecord => {
  const ticket = selectionTicketFor([
    state.campaignId,
    String(state.day),
    channel,
    actorId ?? "",
    CONTENT_VERSION,
    candidateSetHash(allCandidateIds),
  ]);
  const selectedFamilyIds = selected.map((item) => item.familyId);
  const selectedCladeIds = selected.map((item) => item.cladeId);
  const selectedChoiceIds = selectedFamilyIds.flatMap((familyId) =>
    pickChoices(state, familyId, `${ticket}:${familyId}`),
  );
  return {
    campaignId: state.campaignId,
    campaignDay: state.day,
    channel,
    actorId,
    contentVersion: CONTENT_VERSION,
    selectedCladeIds,
    selectedFamilyIds,
    selectedChoiceIds,
    realizationIds: selectedChoiceIds.map((id) => `${id}:default`),
    candidateSetHash: candidateSetHash(allCandidateIds),
    selectionTicket: ticket,
    compiledAtRevision: `${state.contentPackVersion}:${state.day}`,
    presentedAt: new Date(0).toISOString(),
    cooldownOverride,
    degraded,
    diagnostic,
  };
};

export const compileDailyDocket = (
  state: GameState,
  channel: Channel,
  actorId?: string,
): { record: DocketRecord; state: GameState } => {
  const existing = getStoredDocket(state, channel, actorId);
  if (existing && existing.contentVersion === CONTENT_VERSION) {
    return { record: existing, state };
  }

  if (channel === "diplomacy") {
    const targetActor = actorId ?? state.actors[0]?.id;
    if (!targetActor) {
      const empty = recordFromSelection(
        state,
        channel,
        undefined,
        [],
        false,
        true,
        "no-diplomacy-actor",
        [],
      );
      return { record: empty, state: upsertDocketRecord(state, empty) };
    }
    let scored = compileChannelCandidates(state, channel, targetActor, true);
    let cooldownOverride = false;
    if (!scored.length) {
      scored = compileChannelCandidates(state, channel, targetActor, false);
      cooldownOverride = scored.some((item) => item.cooldownActive);
    }
    const selected = selectTopDistinctClades(
      scored,
      1,
      false,
      `${state.campaignId}:${state.day}:${targetActor}`,
    );
    const degraded = selected.length === 0;
    const record = recordFromSelection(
      state,
      channel,
      targetActor,
      selected,
      cooldownOverride,
      degraded,
      degraded ? "no-action-docket" : undefined,
      scored.map((item) => item.familyId),
    );
    return { record, state: upsertDocketRecord(state, record) };
  }

  let scored = compileChannelCandidates(state, channel, undefined, true);
  let cooldownOverride = false;
  if (scored.length < 2) {
    const relaxed = compileChannelCandidates(state, channel, undefined, false);
    if (relaxed.length > scored.length) {
      scored = relaxed;
      cooldownOverride = relaxed.some((item) => item.cooldownActive);
    }
  }

  const diversity = channel === "military";
  const selected = selectTopDistinctClades(
    scored,
    2,
    diversity,
    `${state.campaignId}:${state.day}:${channel}`,
  );
  const degraded = selected.length < 2;
  const diagnostic =
    selected.length === 0
      ? "no-action-docket"
      : selected.length === 1
        ? "single-clade-docket"
        : undefined;
  const record = recordFromSelection(
    state,
    channel,
    undefined,
    selected,
    cooldownOverride,
    degraded,
    diagnostic,
    scored.map((item) => item.familyId),
  );
  return { record, state: upsertDocketRecord(state, record) };
};

export const compileAllDailyDockets = (state: GameState): GameState => {
  let next = state;
  for (const channel of ["production", "military"] as Channel[]) {
    next = compileDailyDocket(next, channel).state;
  }
  for (const actor of DIPLOMACY_ACTOR_METADATA) {
    next = compileDailyDocket(next, "diplomacy", actor.actorId).state;
  }
  return next;
};

export const docketFactFromRecord = (
  state: GameState,
  record: DocketRecord,
): DocketFact => {
  const choices: VisibleChoice[] = record.selectedChoiceIds.map((choiceId) => {
    const found = choiceById(choiceId);
    const familyId =
      found?.family.id ??
      record.selectedFamilyIds.find((id) =>
        familyById(id)?.choices.some((choice) => choice.id === choiceId),
      ) ??
      "unknown";
    const cladeId =
      record.selectedCladeIds[
        Math.max(0, record.selectedFamilyIds.indexOf(familyId))
      ] ?? record.selectedCladeIds[0] ?? "unknown";
    const locked = (state.locks?.[familyId] ?? 0) > state.day;
    return {
      choiceId,
      familyId,
      cladeId,
      channel: record.channel,
      actorId: record.actorId,
      title: found?.choice.label ?? choiceId,
      brief: found?.choice.flavor ?? "",
      mechanicId: choiceId,
      orderCost: 1,
      available: !locked && state.actions > 0,
      availability: locked ? "locked" : "available",
    };
  });
  return {
    campaignDay: record.campaignDay,
    channel: record.channel,
    actorId: record.actorId,
    cladeIds: record.selectedCladeIds,
    familyIds: record.selectedFamilyIds,
    choiceIds: record.selectedChoiceIds,
    choices,
    cooldownOverride: record.cooldownOverride,
    degraded: record.degraded,
    diagnostic: record.diagnostic,
    selectionTicket: record.selectionTicket,
    contentVersion: record.contentVersion,
  };
};

export const visibleFamiliesForChannel = (
  state: GameState,
  channel: Channel,
  actorId?: string,
) => {
  const { record } = compileDailyDocket(state, channel, actorId);
  return record.selectedFamilyIds
    .map((id) => familyById(id))
    .filter((family): family is NonNullable<typeof family> => Boolean(family));
};

export { docketKey };
