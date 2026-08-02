import type { GameState } from "../../../app/game";
import {
  runAvaNexusLine,
  type AvaNexusSession,
} from "../../../app/ava/nexus";
import type { AvaCognitiveActivationReceipt } from "../../../app/ava/request-ir";
import type { AvaOperationalSemanticResult } from "../../../app/ava/operational-contracts";
import {
  canonicalJson,
  cognitiveDigest,
  isRecord,
} from "../../../app/ava/cognitive-types";
import type { PlayerContext, SemanticResponse } from "../../../app/substrate/contracts";
import { GatewayRequestError } from "./remote-store";

export { GatewayRequestError } from "./remote-store";

export type NativeSshGatewayCognitiveAttestation = {
  version: "1";
  cognitiveActivation: AvaCognitiveActivationReceipt;
  proofDigest: string;
  digest: string;
};

export type NativeSshGatewayPublicResult = {
  status: SemanticResponse<unknown>["status"];
  text: string;
  operationalSemantics?: AvaOperationalSemanticResult;
  cognitiveAttestation?: NativeSshGatewayCognitiveAttestation;
  archiveRequest?: {
    operation: "search" | "maps" | "photos" | "open" | "cite" | "save" | "analog";
    query: string;
  };
};

export type NativeSshGatewayLineExecution = {
  state: GameState;
  session: AvaNexusSession;
  changed: boolean;
  publicResult: NativeSshGatewayPublicResult;
};

const RECEIPT_KEYS = [
  "authority",
  "digest",
  "domainDigest",
  "domainId",
  "domainVersion",
  "operatorFamilies",
  "runtime",
  "status",
  "version",
] as const;
const ATTESTATION_KEYS = [
  "cognitiveActivation",
  "digest",
  "proofDigest",
  "version",
] as const;
const ATTESTATION_INPUT_KEYS = ["cognitiveActivation", "proofDigest"] as const;
const RECEIPT_STATUSES = new Set(["COMPLETED", "BLOCKED", "REJECTED"]);
const RECEIPT_AUTHORITIES = new Set([
  "READ_ONLY",
  "PLAN_ONLY",
  "PREPARE",
  "MUTATE",
]);
const RECEIPT_FAMILIES = new Set([
  "RELATIONAL",
  "NUMERIC",
  "CONSTRAINT",
  "TEMPORAL",
  "CAUSAL",
  "EPISTEMIC",
  "DECISION",
  "PLANNING",
  "REALIZATION",
]);
const SHA256 = /^[a-f0-9]{64}$/;

const assertExactKeys: (
  value: unknown,
  expected: readonly string[],
  label: string,
) => asserts value is Record<string, unknown> = (value, expected, label) => {
  if (!isRecord(value)) throw new Error(`${label} is not an object`);
  const actual = Object.keys(value).sort();
  if (canonicalJson(actual) !== canonicalJson([...expected].sort()))
    throw new Error(`${label} has an open or incomplete shape`);
};

const safeActivationReceipt = (
  input: unknown,
): AvaCognitiveActivationReceipt => {
  assertExactKeys(input, RECEIPT_KEYS, "native SSH cognitive activation");
  const receipt = input as AvaCognitiveActivationReceipt;
  if (
    receipt.runtime !== "AVA_COGNITIVE_NEXUS" ||
    receipt.version !== "1" ||
    !RECEIPT_STATUSES.has(receipt.status) ||
    !RECEIPT_AUTHORITIES.has(receipt.authority) ||
    typeof receipt.domainId !== "string" ||
    !receipt.domainId ||
    receipt.domainId.length > 128 ||
    typeof receipt.domainVersion !== "string" ||
    !receipt.domainVersion ||
    receipt.domainVersion.length > 64 ||
    !SHA256.test(receipt.domainDigest) ||
    !SHA256.test(receipt.digest) ||
    !Array.isArray(receipt.operatorFamilies) ||
    !receipt.operatorFamilies.length ||
    receipt.operatorFamilies.some(
      (family) => typeof family !== "string" || !RECEIPT_FAMILIES.has(family),
    ) ||
    canonicalJson(receipt.operatorFamilies) !==
      canonicalJson([...new Set(receipt.operatorFamilies)].sort())
  )
    throw new Error("native SSH cognitive activation is malformed");
  const body: Omit<AvaCognitiveActivationReceipt, "digest"> = {
    runtime: receipt.runtime,
    version: receipt.version,
    status: receipt.status,
    authority: receipt.authority,
    operatorFamilies: Object.freeze([...receipt.operatorFamilies]),
    domainId: receipt.domainId,
    domainVersion: receipt.domainVersion,
    domainDigest: receipt.domainDigest,
  };
  if (cognitiveDigest(body) !== receipt.digest)
    throw new Error("native SSH cognitive activation digest does not match");
  return Object.freeze({ ...body, digest: receipt.digest });
};

export const validateNativeSshGatewayCognitiveAttestation = (
  input: unknown,
): NativeSshGatewayCognitiveAttestation => {
  assertExactKeys(input, ATTESTATION_KEYS, "native SSH cognitive attestation");
  if (
    input.version !== "1" ||
    typeof input.proofDigest !== "string" ||
    !SHA256.test(input.proofDigest) ||
    typeof input.digest !== "string" ||
    !SHA256.test(input.digest)
  )
    throw new Error("native SSH cognitive attestation is malformed");
  const body: Omit<NativeSshGatewayCognitiveAttestation, "digest"> = {
    version: "1",
    cognitiveActivation: safeActivationReceipt(input.cognitiveActivation),
    proofDigest: input.proofDigest,
  };
  if (cognitiveDigest(body) !== input.digest)
    throw new Error("native SSH cognitive attestation digest does not match");
  return Object.freeze({ ...body, digest: input.digest });
};

export const nativeSshGatewayAttestationFor = (input: {
  cognitiveActivation?: AvaCognitiveActivationReceipt;
  proofDigest: string;
}): NativeSshGatewayCognitiveAttestation | undefined => {
  assertExactKeys(input, ATTESTATION_INPUT_KEYS, "native SSH attestation input");
  if (!input.cognitiveActivation) return undefined;
  if (!SHA256.test(input.proofDigest))
    throw new Error("native SSH proof attestation is malformed");
  const body: Omit<NativeSshGatewayCognitiveAttestation, "digest"> = {
    version: "1",
    cognitiveActivation: safeActivationReceipt(input.cognitiveActivation),
    proofDigest: input.proofDigest,
  };
  return Object.freeze({ ...body, digest: cognitiveDigest(body) });
};

export const executeNativeSshGatewayLine = (input: {
  raw: string;
  state: GameState;
  session: AvaNexusSession;
  playerId: string;
  nowMs: number;
  opportunityFraction?: number;
}): NativeSshGatewayLineExecution => {
  const before = JSON.stringify(input.state);
  const context: PlayerContext = {
    playerId: input.playerId,
    campaignId: input.state.campaignId,
    campaignRevision: `${input.state.day}:${input.state.actions}:${input.state.contentPackVersion}`,
    surface: "ssh",
    authority: "command",
    nowMs: input.nowMs,
  };
  const result = runAvaNexusLine(
    input.raw,
    context,
    input.state,
    input.session,
    input.opportunityFraction ?? 0,
  );
  const cognitiveAttestation = nativeSshGatewayAttestationFor({
    cognitiveActivation: result.cognitiveActivation,
    proofDigest: result.proofGraph.digest,
  });
  return {
    state: result.state,
    session: result.session,
    changed: JSON.stringify(result.state) !== before,
    publicResult: Object.freeze({
      status: result.response.status,
      text: result.text,
      ...(result.operationalSemantics
        ? { operationalSemantics: result.operationalSemantics }
        : {}),
      ...(result.envelope.presentation.archiveRequest
        ? { archiveRequest: result.envelope.presentation.archiveRequest }
        : {}),
      ...(cognitiveAttestation ? { cognitiveAttestation } : {}),
    }),
  };
};

export type NativeSshGatewayFailurePhase =
  | "CONFIGURATION"
  | "AUDIT"
  | "CAMPAIGN_LOAD"
  | "CAMPAIGN_INITIALIZATION"
  | "CAMPAIGN_PERSISTENCE"
  | "SESSION";

export type NativeSshGatewayPublicFailure = {
  code:
    | "SSH_GATEWAY_CONFIGURATION_INVALID"
    | "SSH_GATEWAY_AUTHENTICATION_FAILED"
    | "SSH_AUDIT_UNAVAILABLE"
    | "SSH_CAMPAIGN_LOAD_FAILED"
    | "SSH_CAMPAIGN_STATE_INVALID"
    | "SSH_CAMPAIGN_REVISION_CONFLICT"
    | "SSH_CAMPAIGN_TOO_LARGE"
    | "SSH_CAMPAIGN_PERSISTENCE_FAILED"
    | "SSH_SESSION_FAILED";
  message: string;
};

const phaseFailure = (
  phase: NativeSshGatewayFailurePhase,
): NativeSshGatewayPublicFailure => {
  switch (phase) {
    case "CONFIGURATION":
      return {
        code: "SSH_GATEWAY_CONFIGURATION_INVALID",
        message: "The SSH gateway is not configured for a command session.",
      };
    case "AUDIT":
      return {
        code: "SSH_AUDIT_UNAVAILABLE",
        message: "The SSH command audit could not be opened.",
      };
    case "CAMPAIGN_LOAD":
      return {
        code: "SSH_CAMPAIGN_LOAD_FAILED",
        message: "The authoritative campaign could not be loaded.",
      };
    case "CAMPAIGN_INITIALIZATION":
      return {
        code: "SSH_CAMPAIGN_STATE_INVALID",
        message: "The authoritative campaign state is unavailable.",
      };
    case "CAMPAIGN_PERSISTENCE":
      return {
        code: "SSH_CAMPAIGN_PERSISTENCE_FAILED",
        message: "The authoritative campaign could not be persisted.",
      };
    case "SESSION":
      return {
        code: "SSH_SESSION_FAILED",
        message: "The Ava command session terminated safely.",
      };
  }
};

export const publicNativeSshGatewayFailure = (
  error: unknown,
  phase: NativeSshGatewayFailurePhase,
): NativeSshGatewayPublicFailure => {
  if (error instanceof GatewayRequestError) {
    if (error.status === 401 || error.status === 403)
      return Object.freeze({
        code: "SSH_GATEWAY_AUTHENTICATION_FAILED",
        message: "The SSH gateway could not authenticate to the command service.",
      });
    if (error.status === 409)
      return Object.freeze({
        code: "SSH_CAMPAIGN_REVISION_CONFLICT",
        message: "Another command session advanced the authoritative campaign.",
      });
    if (error.status === 413)
      return Object.freeze({
        code: "SSH_CAMPAIGN_TOO_LARGE",
        message: "The campaign state exceeded the gateway persistence limit.",
      });
  }
  return Object.freeze(phaseFailure(phase));
};
