/** §4.2 Deterministic hash and roll contract (ratify@010). Dependency-free. */

export const hashInt = (text: string): number => {
  const nfc = text.normalize("NFC");
  let h = 2166136261;
  for (let i = 0; i < nfc.length; i++) {
    h ^= nfc.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** `stableHash(text) = hashInt(text) / 4294967295 ∈ [0, 1]` */
export const stableHash = (text: string): number => hashInt(text) / 4294967295;

/** `rollPpm(ticket) = min(999_999, floor(stableHash(ticket) × 1_000_000))` */
export const rollPpm = (ticket: string): number =>
  Math.min(999_999, Math.floor(stableHash(ticket) * 1_000_000));

/** Uniform integer in `[lo, hi]` with mandatory boundary clamp. */
export const uniformInt = (ticket: string, lo: number, hi: number): number =>
  lo + Math.min(hi - lo, Math.floor(stableHash(ticket) * (hi - lo + 1)));

export const TICKET_GRAMMARS = {
  enumerationLocalSeed: (globalSeed: string | number, medium: string, productionId: string) =>
    `${globalSeed}:${medium}:${productionId}`,
  attestationSample: (
    globalSeed: string | number,
    recipeId: string,
    classId: string,
    attempt: string | number,
  ) => `${globalSeed}:attest:${recipeId}:${classId}:${attempt}`,
  initialHeat: (campaignSeed: string | number) => `${campaignSeed}:0:initial-heat`,
  slotStartDraw: (campaignSeed: string | number, slotId: string, attempt: string | number) =>
    `${campaignSeed}:slot:${slotId}:${attempt}`,
  slotDurationDraw: (
    campaignSeed: string | number,
    slotId: string,
    attempt: string | number,
  ) => `${campaignSeed}:slot:${slotId}:${attempt}:dur`,
  arcSelectionScore: (
    campaignSeed: string | number,
    slotId: string,
    day: string | number,
    arcId: string,
  ) => `${campaignSeed}:${slotId}:${day}:${arcId}`,
  doomsdayOccurrence: (
    contentVersion: string,
    campaignSeed: string | number,
    day: string | number,
  ) => `${contentVersion}:${campaignSeed}:${day}:doomsday-occurrence`,
  doomsdayTerminal: (
    contentVersion: string,
    campaignSeed: string | number,
    day: string | number,
    eventId: string,
    stateSeal: string,
  ) => `${contentVersion}:${campaignSeed}:${day}:${eventId}:${stateSeal}`,
  auditSampler: (batchSeed: string | number, k: string | number) =>
    `${batchSeed}:audit:${k}`,
  weightedSampler: (batchSeed: string | number, k: string | number) =>
    `${batchSeed}:weighted:${k}`,
  groupSplit: (corpusVersion: string, groupKey: string) =>
    `${corpusVersion}:group-split:${groupKey}`,
} as const;
