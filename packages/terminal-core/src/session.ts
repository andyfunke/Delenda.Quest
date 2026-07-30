import type { GameState } from "../../../app/game";
import type {
  PlayerContext,
  SemanticResponse,
} from "../../../app/substrate/contracts";
import type { ParserDiscourse } from "../../../app/substrate/command-parser";
import {
  createAvaKernelSession,
  runAvaKernelLine,
  type AvaKernelSession,
} from "../../../app/ava/kernel";

export type TerminalSessionState = AvaKernelSession & {
  width: number;
  colorDepth: number;
  /** Compatibility projection for exact-command adapters and parity fixtures. */
  discourse: ParserDiscourse;
};

export const createTerminalSession = (
  interactive = true,
  width = 80,
): TerminalSessionState => ({
  ...createAvaKernelSession(interactive),
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
} => {
  const canonicalLine = line.trim().toLowerCase() === "brief" ? "daily brief" : line;
  const result = runAvaKernelLine(canonicalLine, ctx, state, session);
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
  };
};

export const bannerFor = (state: GameState) =>
  [
    "DELENDA QUEST",
    "AVA COMMAND CHANNEL / OG KERNEL",
    "",
    `DAY ${state.day} · ${state.campaignId}`,
    `ORDERS ${state.actions}/3`,
    "The language compiler, command ledger, and campaign state are online.",
    "",
    "Speak naturally, or use `brief`, `production`, `military`, `diplomacy`, and `help`.",
    "AVA>",
  ].join("\n");
