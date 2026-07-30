import type { GameState } from "../../../app/game";
import type {
  PlayerContext,
  SemanticResponse,
} from "../../../app/substrate/contracts";
import {
  createAvaKernelSession,
  runAvaKernelLine,
  type AvaKernelSession,
} from "../../../app/ava/kernel";

export type TerminalSessionState = AvaKernelSession & {
  width: number;
  colorDepth: number;
};

export const createTerminalSession = (
  interactive = true,
  width = 80,
): TerminalSessionState => ({
  ...createAvaKernelSession(interactive),
  width,
  colorDepth: 0,
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
