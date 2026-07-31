export type SshCredential = {
  id: string;
  playerId: string;
  label: string;
  algorithm: string;
  publicKey: string;
  fingerprint: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
};

export type SshSessionAudit = {
  id: string;
  playerId?: string;
  credentialId?: string;
  connectedAt: string;
  disconnectedAt?: string;
  remoteRiskHash?: string;
  clientVersion?: string;
  commandsRead: number;
  consequentialAttempts: number;
};

export type DeviceLinkChallenge = {
  code: string;
  playerId?: string;
  createdAt: number;
  expiresAt: number;
  completedAt?: number;
};

const fingerprintKey = (publicKey: string) => {
  let h = 2166136261;
  for (let i = 0; i < publicKey.length; i++) {
    h ^= publicKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `SHA256:${hex}`;
};

export class SshCredentialStore {
  private credentials = new Map<string, SshCredential>();
  private byFingerprint = new Map<string, string>();
  private deviceLinks = new Map<string, DeviceLinkChallenge>();

  addKey(input: {
    id: string;
    playerId: string;
    label: string;
    algorithm: string;
    publicKey: string;
    createdAt?: string;
  }) {
    const fingerprint = fingerprintKey(input.publicKey);
    const credential: SshCredential = {
      id: input.id,
      playerId: input.playerId,
      label: input.label,
      algorithm: input.algorithm,
      publicKey: input.publicKey,
      fingerprint,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    this.credentials.set(credential.id, credential);
    this.byFingerprint.set(fingerprint, credential.id);
    return credential;
  }

  revoke(id: string, at = new Date().toISOString()) {
    const credential = this.credentials.get(id);
    if (!credential) return null;
    const next = { ...credential, revokedAt: at };
    this.credentials.set(id, next);
    return next;
  }

  authenticatePublicKey(publicKey: string, at = Date.now()) {
    const fingerprint = fingerprintKey(publicKey);
    const id = this.byFingerprint.get(fingerprint);
    if (!id) return { ok: false as const, reason: "unknown_key" };
    const credential = this.credentials.get(id);
    if (!credential) return { ok: false as const, reason: "unknown_key" };
    if (credential.revokedAt) return { ok: false as const, reason: "revoked_key" };
    const next = { ...credential, lastUsedAt: new Date(at).toISOString() };
    this.credentials.set(id, next);
    return { ok: true as const, credential: next };
  }

  listForPlayer(playerId: string) {
    return [...this.credentials.values()].filter((item) => item.playerId === playerId);
  }

  startDeviceLink(code: string, ttlMs = 5 * 60 * 1000, now = Date.now()) {
    const challenge: DeviceLinkChallenge = {
      code,
      createdAt: now,
      expiresAt: now + ttlMs,
    };
    this.deviceLinks.set(code, challenge);
    return challenge;
  }

  completeDeviceLink(code: string, playerId: string, now = Date.now()) {
    const challenge = this.deviceLinks.get(code);
    if (!challenge) return { ok: false as const, reason: "unknown_code" };
    if (challenge.expiresAt < now) return { ok: false as const, reason: "expired" };
    const next = { ...challenge, playerId, completedAt: now };
    this.deviceLinks.set(code, next);
    return { ok: true as const, challenge: next };
  }

  consumeDeviceLink(code: string, now = Date.now()) {
    const challenge = this.deviceLinks.get(code);
    if (!challenge) return { ok: false as const, reason: "unknown_code" };
    if (challenge.expiresAt < now) return { ok: false as const, reason: "expired" };
    if (!challenge.playerId || !challenge.completedAt) {
      return { ok: false as const, reason: "incomplete" };
    }
    this.deviceLinks.delete(code);
    return { ok: true as const, playerId: challenge.playerId };
  }
}

export const hashRemoteRisk = (value: string) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
};
