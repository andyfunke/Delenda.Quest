import { initialState } from "../../../game";
import { getAuthenticatedUser } from "../../../auth";
import {
  avaNexusStateRevision,
  createAvaNexusSession,
  runAvaNexusLine,
} from "../../../ava/nexus";
import type { AvaCognitiveActivationReceipt } from "../../../ava/request-ir";
import type { PlayerContext } from "../../../substrate/contracts";
import { cognitiveDigest } from "../../../ava/cognitive-types";
import {
  createTerminalSession,
  runTerminalLine,
} from "../../../../packages/terminal-core/src/session";

type ProbeAdapter = "web" | "ssh";
type ActivationProbe =
  | "decision"
  | "directive"
  | "forecast"
  | "constraint"
  | "planning"
  | "causal"
  | "epistemic";

const PROBE_ADAPTERS = new Set<ProbeAdapter>(["web", "ssh"]);
const ACTIVATION_PROBES: Readonly<Record<ActivationProbe, readonly string[]>> =
  Object.freeze({
    decision: ["what should I do"],
    directive: ["advise production"],
    forecast: ["forecast M1"],
    constraint: ["is M1 viable"],
    planning: ["stage M1", "issue plan"],
    causal: ["what caused readiness"],
    epistemic: ["how certain is intelligence"],
  });
const ACTIVATION_CONTRACT = Object.freeze({
  id: "delenda-ava-cognitive-activation",
  version: "5",
  buildMarker: "ava-cognitive-nexus-attestation-2026-07-31.4",
});
const NO_STORE = {
  "Cache-Control": "no-store",
  Vary: "Cookie",
};

const RESULT_SIGNALS: Readonly<
  Record<ActivationProbe, Readonly<{ id: string; evidence: RegExp }>>
> = Object.freeze({
  decision: Object.freeze({
    id: "COMPILED_ROBUST_DECISION",
    evidence: /The compiled strategic-balance model gives it the strongest robust balance/i,
  }),
  directive: Object.freeze({
    id: "COMPILED_DIRECTIVE_DECISION",
    evidence:
      /compiled directive-strategic-posture model owns this ranking/i,
  }),
  forecast: Object.freeze({
    id: "COMPILED_TEMPORAL_PROJECTION",
    evidence: /DECLARED CHANGE \[PROJECTED\]/,
  }),
  constraint: Object.freeze({
    id: "COMPILED_PRECONDITION_RESULT",
    evidence: /COMPILED PRECONDITION CHECK/,
  }),
  planning: Object.freeze({
    id: "PLAN_ONLY_CONFIRMATION_READY",
    evidence: /ORDER AWAITING CONFIRMATION/,
  }),
  causal: Object.freeze({
    id: "OBSERVATIONAL_CAUSAL_DIAGNOSIS",
    evidence: /CAUSAL DIAGNOSIS \/ OBSERVATIONAL ONLY/,
  }),
  epistemic: Object.freeze({
    id: "SINGLE_RECORD_EVIDENCE_BOUND",
    evidence: /EVIDENCE BOUND \/ SINGLE AUTHORITATIVE RECORD/,
  }),
});

type PublicResultMarker = Readonly<{
  version: "1";
  probe: ActivationProbe;
  signal: string;
  activationDigest: string;
  proofDigest: string;
  textDigest: string;
  digest: string;
}>;

type PublicProbeResult = Readonly<{
  activation: AvaCognitiveActivationReceipt;
  proofIdentity: string;
  resultMarker: PublicResultMarker;
}>;

/**
 * The fixture is synthetic and identical for every caller. Cache only its
 * closed public result, never authentication, a request, a session, or game
 * state. A rejected or incomplete probe is removed so failures cannot stick.
 */
const activationProbeCache = new Map<
  string,
  Promise<PublicProbeResult | null>
>();

const probeAdapter = (request: Request): ProbeAdapter | null => {
  const value = new URL(request.url).searchParams.get("adapter") ?? "web";
  return PROBE_ADAPTERS.has(value as ProbeAdapter)
    ? (value as ProbeAdapter)
    : null;
};

const activationProbe = (request: Request): ActivationProbe | null => {
  const value = new URL(request.url).searchParams.get("probe") ?? "decision";
  return Object.hasOwn(ACTIVATION_PROBES, value)
    ? (value as ActivationProbe)
    : null;
};

const publicContract = (
  adapter: ProbeAdapter | null,
  probe: ActivationProbe | null,
) => ({
  ...ACTIVATION_CONTRACT,
  adapter:
    adapter === "web"
      ? "web-core"
      : adapter === "ssh"
        ? "terminal-core"
        : null,
  probe,
});

const publicActivation = (
  activation: AvaCognitiveActivationReceipt,
): AvaCognitiveActivationReceipt => {
  const body: Omit<AvaCognitiveActivationReceipt, "digest"> = {
    version: activation.version,
    runtime: activation.runtime,
    status: activation.status,
    authority: activation.authority,
    operatorFamilies: Object.freeze([...activation.operatorFamilies]),
    domainId: activation.domainId,
    domainVersion: activation.domainVersion,
    domainDigest: activation.domainDigest,
  };
  if (
    !/^[a-f0-9]{64}$/.test(activation.digest) ||
    cognitiveDigest(body) !== activation.digest
  )
    throw new Error("cognitive activation receipt failed public validation");
  return Object.freeze({ ...body, digest: activation.digest });
};

const publicResultMarker = (input: {
  probe: ActivationProbe;
  text: string;
  activationDigest: string;
  proofDigest: string;
}): PublicResultMarker => {
  const signal = RESULT_SIGNALS[input.probe];
  if (!signal.evidence.test(input.text))
    throw new Error(`activation probe ${input.probe} omitted its engine result`);
  const body: Omit<PublicResultMarker, "digest"> = {
    version: "1",
    probe: input.probe,
    signal: signal.id,
    activationDigest: input.activationDigest,
    proofDigest: input.proofDigest,
    textDigest: cognitiveDigest(input.text),
  };
  return Object.freeze({ ...body, digest: cognitiveDigest(body) });
};

const runActivationProbe = (
  adapter: ProbeAdapter,
  probe: ActivationProbe,
): PublicProbeResult | null => {
  let state = initialState({ seed: 9_191, theater: "lowland" });
  const contextFor = (): PlayerContext => ({
    playerId: "ava-activation-probe",
    campaignId: state.campaignId,
    campaignRevision: avaNexusStateRevision(state),
    surface: adapter === "web" ? "web" : "ssh",
    authority: probe === "planning" ? "command" : "observer",
    nowMs: 1_700_010_000_000,
  });
  let result:
    | ReturnType<typeof runAvaNexusLine>
    | ReturnType<typeof runTerminalLine>
    | null = null;
  if (adapter === "web") {
    let session = createAvaNexusSession(true, "campaign");
    for (const line of ACTIVATION_PROBES[probe]) {
      const next = runAvaNexusLine(line, contextFor(), state, session);
      result = next;
      state = next.state;
      session = next.session;
    }
  } else {
    let session = createTerminalSession(true);
    for (const line of ACTIVATION_PROBES[probe]) {
      const next = runTerminalLine(line, contextFor(), state, session);
      result = next;
      state = next.state;
      session = next.session;
    }
  }

  if (!result?.cognitiveActivation) return null;
  if (!/^[a-f0-9]{64}$/.test(result.proofGraph.digest))
    throw new Error("activation probe proof identity is malformed");
  const activation = publicActivation(result.cognitiveActivation);
  const proofIdentity = result.proofGraph.digest;
  return Object.freeze({
    activation,
    proofIdentity,
    resultMarker: publicResultMarker({
      probe,
      text: result.text,
      activationDigest: activation.digest,
      proofDigest: proofIdentity,
    }),
  });
};

const cachedActivationProbe = (
  adapter: ProbeAdapter,
  probe: ActivationProbe,
) => {
  const key = `${adapter}:${probe}`;
  const cached = activationProbeCache.get(key);
  if (cached) return cached;
  const pending = Promise.resolve()
    .then(() => runActivationProbe(adapter, probe))
    .then((result) => {
      if (!result && activationProbeCache.get(key) === pending)
        activationProbeCache.delete(key);
      return result;
    })
    .catch((error: unknown) => {
      if (activationProbeCache.get(key) === pending)
        activationProbeCache.delete(key);
      throw error;
    });
  activationProbeCache.set(key, pending);
  return pending;
};

export async function GET(request: Request) {
  const adapter = probeAdapter(request);
  const probe = activationProbe(request);
  const user = await getAuthenticatedUser();
  if (!user)
    return Response.json(
      {
        contract: publicContract(adapter, probe),
        activation: null,
        proofIdentity: null,
        resultMarker: null,
      },
      { status: 401, headers: NO_STORE },
    );
  if (!adapter || !probe)
    return Response.json(
      {
        contract: publicContract(adapter, probe),
        activation: null,
        proofIdentity: null,
        resultMarker: null,
      },
      { status: 400, headers: NO_STORE },
    );

  const result = await cachedActivationProbe(adapter, probe);
  if (!result)
    return Response.json(
      {
        contract: publicContract(adapter, probe),
        activation: null,
        proofIdentity: null,
        resultMarker: null,
      },
      { status: 503, headers: NO_STORE },
    );

  return Response.json(
    {
      contract: publicContract(adapter, probe),
      ...result,
    },
    { headers: NO_STORE },
  );
}
