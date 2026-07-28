export type SshControls = {
  idleTimeoutMs: number;
  absoluteSessionMs: number;
  maxConcurrentSessionsPerAccount: number;
  commandBurstPerMinute: number;
  failedAuthDelayMs: number;
  globalSshEnabled: boolean;
  globalMutationsEnabled: boolean;
};

export const DEFAULT_SSH_CONTROLS: SshControls = {
  idleTimeoutMs: 15 * 60 * 1000,
  absoluteSessionMs: 4 * 60 * 60 * 1000,
  maxConcurrentSessionsPerAccount: 3,
  commandBurstPerMinute: 60,
  failedAuthDelayMs: 250,
  globalSshEnabled: true,
  globalMutationsEnabled: true,
};

export class SshControlPlane {
  private sessionsByPlayer = new Map<string, Set<string>>();
  private commandTimestamps = new Map<string, number[]>();
  private failedAuth = new Map<string, number>();

  constructor(public controls: SshControls = { ...DEFAULT_SSH_CONTROLS }) {}

  canAcceptConnection() {
    return this.controls.globalSshEnabled;
  }

  canMutate() {
    return this.controls.globalMutationsEnabled;
  }

  registerSession(playerId: string, sessionId: string) {
    const set = this.sessionsByPlayer.get(playerId) ?? new Set();
    if (set.size >= this.controls.maxConcurrentSessionsPerAccount) {
      return { ok: false as const, reason: "concurrent_limit" };
    }
    set.add(sessionId);
    this.sessionsByPlayer.set(playerId, set);
    return { ok: true as const };
  }

  releaseSession(playerId: string, sessionId: string) {
    const set = this.sessionsByPlayer.get(playerId);
    if (!set) return;
    set.delete(sessionId);
    if (!set.size) this.sessionsByPlayer.delete(playerId);
  }

  allowCommand(playerId: string, now = Date.now()) {
    const windowStart = now - 60_000;
    const stamps = (this.commandTimestamps.get(playerId) ?? []).filter(
      (stamp) => stamp >= windowStart,
    );
    if (stamps.length >= this.controls.commandBurstPerMinute) {
      this.commandTimestamps.set(playerId, stamps);
      return { ok: false as const, reason: "rate_limited" };
    }
    stamps.push(now);
    this.commandTimestamps.set(playerId, stamps);
    return { ok: true as const };
  }

  authFailureDelay(remoteRiskHash: string) {
    const count = (this.failedAuth.get(remoteRiskHash) ?? 0) + 1;
    this.failedAuth.set(remoteRiskHash, count);
    return this.controls.failedAuthDelayMs * Math.min(count, 8);
  }

  clearAuthFailures(remoteRiskHash: string) {
    this.failedAuth.delete(remoteRiskHash);
  }

  sessionExpired(connectedAt: number, lastActiveAt: number, now = Date.now()) {
    if (now - connectedAt > this.controls.absoluteSessionMs) return "absolute";
    if (now - lastActiveAt > this.controls.idleTimeoutMs) return "idle";
    return null;
  }
}

export const DISABLED_SSH_FEATURES = [
  "port-forwarding",
  "agent-forwarding",
  "x11-forwarding",
  "scp",
  "sftp",
  "arbitrary-subsystem",
  "host-shell",
] as const;

export const isFeatureDisabled = (feature: string) =>
  (DISABLED_SSH_FEATURES as readonly string[]).includes(feature);
