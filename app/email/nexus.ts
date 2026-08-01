export const EMAIL_NEXUS_VERSION = "1" as const;

export const EMAIL_NEXUS_POLICY = Object.freeze({
  tokenTtlSeconds: 15 * 60,
  confirmationTtlSeconds: 10 * 60,
  maximumInboundBytes: 256_000,
  maximumCommandsPerMessage: 1,
  allowedRedirects: ["/game", "/account", "/ssh"] as const,
  consequentialReplyMode: "PREPARE_THEN_CONFIRM" as const,
  senderPolicy: "VERIFIED_ACCOUNT_ADDRESS" as const,
});

export type EmailNexusOperation =
  | "REQUEST_SIGN_IN"
  | "REDEEM_SIGN_IN"
  | "CHANGE_ACCOUNT_EMAIL"
  | "ENABLE_EMAIL_PLAY"
  | "DISABLE_EMAIL_PLAY"
  | "INGEST_PLAYER_COMMAND"
  | "CONFIRM_EMAIL_ORDER"
  | "SEND_DAILY_BRIEF"
  | "SEND_CAMPAIGN_RECORD";

export type EmailNexusRequest = {
  version: typeof EMAIL_NEXUS_VERSION;
  operation: EmailNexusOperation;
  email?: string;
  accountId?: string;
  campaignId?: string;
  token?: string;
  command?: string;
  messageId?: string;
  redirectPath?: string;
  idempotencyKey: string;
};

export type EmailNexusDecision =
  | { ok: true; request: EmailNexusRequest; authority: "EMAIL_NEXUS" }
  | { ok: false; code: string; instruction: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const safeId = /^[A-Za-z0-9._:#-]{1,160}$/;
const opaqueToken = /^[A-Za-z0-9_-]{24,256}$/;

export const normalizeAccountEmail = (value: string) =>
  value.trim().toLowerCase();

export const validateEmailNexusRequest = (
  candidate: EmailNexusRequest,
): EmailNexusDecision => {
  if (candidate.version !== EMAIL_NEXUS_VERSION)
    return { ok: false, code: "EMAIL_VERSION_REJECTED", instruction: "Use the current Email Nexus contract." };
  if (!/^[A-Za-z0-9:_-]{8,200}$/.test(candidate.idempotencyKey))
    return { ok: false, code: "EMAIL_IDEMPOTENCY_REQUIRED", instruction: "Supply one bounded idempotency key." };
  if (candidate.email && !emailPattern.test(normalizeAccountEmail(candidate.email)))
    return { ok: false, code: "EMAIL_ADDRESS_INVALID", instruction: "Supply one syntactically valid email address." };
  for (const value of [candidate.accountId, candidate.campaignId, candidate.messageId])
    if (value && !safeId.test(value))
      return { ok: false, code: "EMAIL_IDENTITY_INVALID", instruction: "Use canonical account, campaign, and message identities." };
  if (candidate.redirectPath && !EMAIL_NEXUS_POLICY.allowedRedirects.includes(candidate.redirectPath as typeof EMAIL_NEXUS_POLICY.allowedRedirects[number]))
    return { ok: false, code: "EMAIL_REDIRECT_REJECTED", instruction: "Use an allowlisted same-origin redirect." };
  if (candidate.token && !opaqueToken.test(candidate.token))
    return { ok: false, code: "EMAIL_TOKEN_INVALID", instruction: "Supply the complete opaque one-use token." };
  if (candidate.command && (candidate.command.length > 512 || /[\u0000\r]/.test(candidate.command)))
    return { ok: false, code: "EMAIL_COMMAND_INVALID", instruction: "Supply one bounded plain-text Ava command." };

  const required: Partial<Record<EmailNexusOperation, Array<keyof EmailNexusRequest>>> = {
    REQUEST_SIGN_IN: ["email"],
    REDEEM_SIGN_IN: ["token"],
    CHANGE_ACCOUNT_EMAIL: ["accountId", "email", "token"],
    ENABLE_EMAIL_PLAY: ["accountId", "campaignId", "email"],
    DISABLE_EMAIL_PLAY: ["accountId", "campaignId"],
    INGEST_PLAYER_COMMAND: ["accountId", "campaignId", "email", "messageId", "command"],
    CONFIRM_EMAIL_ORDER: ["accountId", "campaignId", "token"],
    SEND_DAILY_BRIEF: ["accountId", "campaignId", "email"],
    SEND_CAMPAIGN_RECORD: ["accountId", "campaignId", "email"],
  };
  const missing = (required[candidate.operation] ?? []).filter((field) => !candidate[field]);
  if (missing.length)
    return { ok: false, code: "EMAIL_FIELDS_REQUIRED", instruction: `Missing: ${missing.join(", ")}.` };
  return { ok: true, request: { ...candidate, email: candidate.email ? normalizeAccountEmail(candidate.email) : undefined }, authority: "EMAIL_NEXUS" };
};

