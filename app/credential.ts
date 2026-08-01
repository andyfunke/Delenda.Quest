export type CampaignCredentialPayload = {
  schemaVersion: 1;
  credentialId: string;
  publicSlug: string;
  campaignId: string;
  outcome: string;
  theater: string;
  resolvedDays: number;
  campaignScore: number;
  scoringModelVersion: string;
  completedAt: string;
  issuer: "DELENDA.QUEST";
};

type CampaignCredentialRecord = {
  publicSlug: string;
  campaignId: string;
  outcome: string;
  theater: string;
  days: number;
  campaignScore: number;
  scoringVersion: string;
  completedAt: number;
};

export const campaignCredentialPayload = (
  record: CampaignCredentialRecord,
): CampaignCredentialPayload => ({
  schemaVersion: 1,
  credentialId: `DQ-${record.publicSlug}`,
  publicSlug: record.publicSlug,
  campaignId: record.campaignId,
  outcome: record.outcome,
  theater: record.theater,
  resolvedDays: record.days,
  campaignScore: record.campaignScore,
  scoringModelVersion: record.scoringVersion,
  completedAt: new Date(record.completedAt).toISOString(),
  issuer: "DELENDA.QUEST",
});

export const canonicalCredentialJson = (payload: CampaignCredentialPayload) =>
  JSON.stringify(payload);

export const campaignCredentialDigest = async (
  payload: CampaignCredentialPayload,
) => {
  const bytes = new TextEncoder().encode(canonicalCredentialJson(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};

export const campaignCredential = async (record: CampaignCredentialRecord) => {
  const payload = campaignCredentialPayload(record);
  return { payload, digest: await campaignCredentialDigest(payload) };
};
