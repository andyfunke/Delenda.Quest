import type { GameState } from "../../../app/game";
import type { PlayerContext } from "../../../app/substrate/contracts";
import {
  bannerFor,
  createTerminalSession,
  runTerminalLine,
  type TerminalSessionState,
} from "../../terminal-core/src/session";
import {
  hashRemoteRisk,
  SshCredentialStore,
  type SshSessionAudit,
} from "./auth";
import {
  DEFAULT_SSH_CONTROLS,
  DISABLED_SSH_FEATURES,
  isFeatureDisabled,
  SshControlPlane,
  type SshControls,
} from "./controls";

export type SshServerOptions = {
  controls?: Partial<SshControls>;
  store?: SshCredentialStore;
  loadCampaign: (playerId: string) => GameState;
  saveCampaign?: (playerId: string, state: GameState) => void;
  now?: () => number;
};

export type ActiveSshSession = {
  id: string;
  playerId: string;
  credentialId?: string;
  connectedAt: number;
  lastActiveAt: number;
  interactive: boolean;
  terminal: TerminalSessionState;
  audit: SshSessionAudit;
  state: GameState;
};

export class DelendaSshServer {
  readonly store: SshCredentialStore;
  readonly controls: SshControlPlane;
  private sessions = new Map<string, ActiveSshSession>();
  private loadCampaign: SshServerOptions["loadCampaign"];
  private saveCampaign?: SshServerOptions["saveCampaign"];
  private now: () => number;

  constructor(options: SshServerOptions) {
    this.store = options.store ?? new SshCredentialStore();
    this.controls = new SshControlPlane({
      ...DEFAULT_SSH_CONTROLS,
      ...options.controls,
    });
    this.loadCampaign = options.loadCampaign;
    this.saveCampaign = options.saveCampaign;
    this.now = options.now ?? Date.now;
  }

  health() {
    return {
      ok: this.controls.canAcceptConnection(),
      sessions: this.sessions.size,
      mutationsEnabled: this.controls.canMutate(),
      disabledFeatures: DISABLED_SSH_FEATURES,
    };
  }

  authenticate(publicKey: string, remoteHint = "local") {
    if (!this.controls.canAcceptConnection()) {
      return { ok: false as const, reason: "ssh_disabled" };
    }
    const risk = hashRemoteRisk(remoteHint);
    const result = this.store.authenticatePublicKey(publicKey, this.now());
    if (!result.ok) {
      const delayMs = this.controls.authFailureDelay(risk);
      return { ok: false as const, reason: result.reason, delayMs };
    }
    this.controls.clearAuthFailures(risk);
    return { ok: true as const, credential: result.credential, remoteRiskHash: risk };
  }

  openSession(input: {
    playerId: string;
    credentialId?: string;
    interactive?: boolean;
    remoteRiskHash?: string;
    clientVersion?: string;
  }) {
    if (!this.controls.canAcceptConnection()) {
      return { ok: false as const, reason: "ssh_disabled" };
    }
    const id = `ssh_${this.sessions.size + 1}_${this.now().toString(16)}`;
    const registered = this.controls.registerSession(input.playerId, id);
    if (!registered.ok) return registered;
    const connectedAt = this.now();
    const state = this.loadCampaign(input.playerId);
    const session: ActiveSshSession = {
      id,
      playerId: input.playerId,
      credentialId: input.credentialId,
      connectedAt,
      lastActiveAt: connectedAt,
      interactive: input.interactive !== false,
      terminal: createTerminalSession(input.interactive !== false),
      state,
      audit: {
        id,
        playerId: input.playerId,
        credentialId: input.credentialId,
        connectedAt: new Date(connectedAt).toISOString(),
        remoteRiskHash: input.remoteRiskHash,
        clientVersion: input.clientVersion,
        commandsRead: 0,
        consequentialAttempts: 0,
      },
    };
    this.sessions.set(id, session);
    return {
      ok: true as const,
      sessionId: id,
      banner: bannerFor(state),
    };
  }

  requestSubsystem(name: string) {
    if (isFeatureDisabled(name) || name === "sftp") {
      return { ok: false as const, reason: "subsystem_disabled" };
    }
    return { ok: false as const, reason: "subsystem_disabled" };
  }

  requestForwarding(kind: "port-forwarding" | "agent-forwarding" | "x11-forwarding") {
    return { ok: false as const, reason: `${kind}_disabled` as const };
  }

  handleLine(sessionId: string, line: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return { ok: false as const, reason: "unknown_session" };
    const expired = this.controls.sessionExpired(
      session.connectedAt,
      session.lastActiveAt,
      this.now(),
    );
    if (expired) {
      this.closeSession(sessionId);
      return { ok: false as const, reason: `${expired}_timeout` as const };
    }
    const rate = this.controls.allowCommand(session.playerId, this.now());
    if (!rate.ok) return rate;

    const ctx: PlayerContext = {
      playerId: session.playerId,
      campaignId: session.state.campaignId,
      campaignRevision: `${session.state.day}:${session.state.actions}`,
      surface: "ssh",
      authority: "command",
      nowMs: this.now(),
    };

    const looksConsequential = /^(prepare|confirm|cancel|execute|issue|choose)\b/i.test(
      line.trim(),
    );
    if (looksConsequential && !this.controls.canMutate()) {
      return {
        ok: true as const,
        text: "STATUS=FORBIDDEN\n\nGlobal consequential commands disabled.",
        status: "FORBIDDEN",
      };
    }

    const result = runTerminalLine(line, ctx, session.state, session.terminal);
    session.state = result.state;
    session.terminal = result.session;
    session.lastActiveAt = this.now();
    session.audit.commandsRead = result.session.commandsRead;
    session.audit.consequentialAttempts = result.session.consequentialAttempts;
    this.saveCampaign?.(session.playerId, session.state);
    return {
      ok: true as const,
      text: result.text,
      status: result.response.status,
      response: result.response,
      state: session.state,
    };
  }

  closeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    this.controls.releaseSession(session.playerId, sessionId);
    session.audit.disconnectedAt = new Date(this.now()).toISOString();
    this.sessions.delete(sessionId);
    return session.audit;
  }

  getSession(sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }
}
