import type { GameState } from "../../../app/game";
import type {
  PlayerContext,
  SemanticResponse,
} from "../../../app/substrate/contracts";
import type { ParserDiscourse } from "../../../app/substrate/command-parser";
import type { CanonicalProofGraph } from "../../../app/ava/proof-graph";
import type { AvaCognitiveActivationReceipt } from "../../../app/ava/request-ir";
import type { AvaOperationalSemanticResult } from "../../../app/ava/operational-contracts";
import {
  createAvaNexusSession,
  runAvaNexusLine,
  type AvaNexusSession,
} from "../../../app/ava/nexus";

export type TerminalSessionState = AvaNexusSession & {
  width: number;
  colorDepth: number;
  /** Compatibility projection for exact-command adapters and parity fixtures. */
  discourse: ParserDiscourse;
};

export const createTerminalSession = (
  interactive = true,
  width = 80,
): TerminalSessionState => ({
  ...createAvaNexusSession(interactive),
  width,
  colorDepth: 0,
  discourse: {},
});

export const runTerminalLine = (
  line: string,
  ctx: PlayerContext,
  state: GameState,
  session: TerminalSessionState,
): {
  state: GameState;
  session: TerminalSessionState;
  response: SemanticResponse<unknown>;
  text: string;
  proofGraph: CanonicalProofGraph;
  cognitiveActivation?: AvaCognitiveActivationReceipt;
  operationalSemantics?: AvaOperationalSemanticResult;
} => {
  const result = runAvaNexusLine(line, ctx, state, session);
  return {
    state: result.state,
    session: {
      ...result.session,
      width: session.width,
      colorDepth: session.colorDepth,
      discourse: session.discourse,
    },
    response: result.response,
    text: result.text,
    proofGraph: result.proofGraph,
    cognitiveActivation: result.cognitiveActivation,
    operationalSemantics: result.operationalSemantics,
  };
};

export const bannerFor = (state: GameState) =>
  [
    "DELENDA QUEST",
    "AVA COMMAND CHANNEL / NEXUS",
    "",
    `DAY ${state.day} · ${state.campaignId}`,
    `ORDERS ${state.actions}/3`,
    "The language compiler, command ledger, and campaign state are online.",
    "",
    "Speak naturally, or use `brief`, `production`, `military`, `diplomacy`, and `help`.",
    "AVA>",
  ].join("\n");
