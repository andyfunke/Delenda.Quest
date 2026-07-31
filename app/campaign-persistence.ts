export type StoredCampaignEnvelope = {
  accountKey?: string;
  state?: unknown;
  clock?: { start?: number; end?: number };
  runToken?: string;
  multiplayerRun?: boolean;
  savedAt?: number;
  updatedAt?: number;
  revision?: number;
  expectedRevision?: number;
};

export type CampaignHydrationDecision = {
  record: StoredCampaignEnvelope | null;
  expectedRevision: number;
  source: "remote" | "device" | "none";
  discardedDeviceBranch: boolean;
  remoteDeleted: boolean;
};

export const campaignRevision = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const belongsToAccount = (
  local: StoredCampaignEnvelope | null,
  accountKey: string,
  migrated: boolean,
) =>
  !!local &&
  (!accountKey ||
    local.accountKey === accountKey ||
    (!local.accountKey && !migrated));

/**
 * Selects a recovery snapshot without ever lending a remote revision to a
 * different device branch. A device snapshot may lead a server snapshot only
 * when both descend from the same acknowledged revision.
 */
export const selectCampaignForHydration = (input: {
  remote: StoredCampaignEnvelope | null;
  local: StoredCampaignEnvelope | null;
  accountKey: string;
  migrated: boolean;
  remoteAvailable: boolean;
}): CampaignHydrationDecision => {
  const { remote, local, accountKey, migrated, remoteAvailable } = input;
  const localBelongs = belongsToAccount(local, accountKey, migrated);
  const localRevision = campaignRevision(local?.revision);
  const remoteRevision = campaignRevision(remote?.revision);

  if (!remoteAvailable) {
    return localBelongs
      ? {
          record: local,
          expectedRevision: localRevision,
          source: "device",
          discardedDeviceBranch: false,
          remoteDeleted: false,
        }
      : {
          record: null,
          expectedRevision: 0,
          source: "none",
          discardedDeviceBranch: false,
          remoteDeleted: false,
        };
  }

  if (!remote) {
    const unsavedDeviceCampaign = localBelongs && localRevision === 0;
    return unsavedDeviceCampaign
      ? {
          record: local,
          expectedRevision: 0,
          source: "device",
          discardedDeviceBranch: false,
          remoteDeleted: false,
        }
      : {
          record: null,
          expectedRevision: 0,
          source: "none",
          discardedDeviceBranch: !!localBelongs,
          remoteDeleted: localBelongs && localRevision > 0,
        };
  }

  const localIsNewer =
    localBelongs &&
    localRevision === remoteRevision &&
    (Number(local?.savedAt) || 0) > (Number(remote.updatedAt) || 0);
  return {
    record: localIsNewer ? local : remote,
    expectedRevision: localIsNewer ? localRevision : remoteRevision,
    source: localIsNewer ? "device" : "remote",
    discardedDeviceBranch:
      !!localBelongs && !localIsNewer && local !== null,
    remoteDeleted: false,
  };
};

const samePayload = (
  submitted: StoredCampaignEnvelope,
  accepted: StoredCampaignEnvelope,
) =>
  accepted.runToken === submitted.runToken &&
  accepted.multiplayerRun === submitted.multiplayerRun &&
  accepted.clock?.start === submitted.clock?.start &&
  accepted.clock?.end === submitted.clock?.end &&
  JSON.stringify(accepted.state) === JSON.stringify(submitted.state);

export const campaignPayloadSeal = (envelope: StoredCampaignEnvelope) =>
  JSON.stringify([
    envelope.runToken ?? "",
    !!envelope.multiplayerRun,
    Number(envelope.clock?.start) || 0,
    Number(envelope.clock?.end) || 0,
    envelope.state ?? null,
  ]);

/**
 * A response advances the live revision only when it proves acceptance of the
 * exact submitted branch. This prevents delayed or cross-branch responses
 * from blessing a different local snapshot.
 */
export const campaignSaveWasAccepted = (
  submitted: StoredCampaignEnvelope,
  accepted: StoredCampaignEnvelope | null | undefined,
) =>
  !!accepted &&
  campaignRevision(accepted.revision) ===
    campaignRevision(submitted.expectedRevision) + 1 &&
  samePayload(submitted, accepted);
