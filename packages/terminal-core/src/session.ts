import type { GameState } from "../../../app/game";
import type { PlayerContext, SemanticResponse } from "../../../app/substrate/contracts";
import { parseDelendaCommand, type ParserDiscourse } from "../../../app/substrate/command-parser";
import { dispatchCanonicalCommand } from "../../../app/substrate/services";
import { framesToText, renderTerminal } from "./renderer";

export type TerminalSessionState = {
  discourse: ParserDiscourse;
  interactive: boolean;
  width: number;
  colorDepth: number;
  commandsRead: number;
  consequentialAttempts: number;
};

export const createTerminalSession = (
  interactive = true,
  width = 80,
): TerminalSessionState => ({
  discourse: {},
  interactive,
  width,
  colorDepth: 0,
  commandsRead: 0,
  consequentialAttempts: 0,
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
  const nextSession = {
    ...session,
    discourse: { ...session.discourse },
    commandsRead: session.commandsRead + 1,
  };
  const parsed = parseDelendaCommand(line, nextSession.discourse, {
    interactive: nextSession.interactive,
  });
  if (!parsed.ok) {
    const response: SemanticResponse<unknown> = {
      status: parsed.status,
      fact: null,
      rendering: {
        compact: parsed.code,
        brief: parsed.instruction,
      },
      recovery: {
        code: parsed.code,
        instruction: parsed.instruction,
        validExamples: parsed.examples,
      },
      campaignRevision: `${state.campaignId}:${state.day}`,
    };
    return {
      state,
      session: nextSession,
      response,
      text: framesToText(
        renderTerminal(response, {
          width: nextSession.width,
          colorDepth: nextSession.colorDepth,
          unicode: true,
          interactive: nextSession.interactive,
        }),
      ),
    };
  }

  if (
    parsed.command.operation === "PREPARE" ||
    parsed.command.operation === "CONFIRM" ||
    parsed.command.operation === "CANCEL"
  ) {
    nextSession.consequentialAttempts += 1;
  }

  const dispatched = dispatchCanonicalCommand(ctx, state, parsed.command, {
    allowConfirm: nextSession.interactive,
  });

  if (dispatched.response.status === "PREPARED") {
    const fact = dispatched.response.fact as {
      proposalToken?: string;
      expiresAt?: string;
      confirmationPhrase?: string;
    };
    nextSession.discourse.activeProposalToken = fact.proposalToken;
    nextSession.discourse.activeProposalExpiresAt = fact.expiresAt;
    nextSession.discourse.confirmationPhraseRendered = Boolean(fact.confirmationPhrase);
  }
  if (
    dispatched.response.status === "EXECUTED" ||
    (dispatched.response.status === "OK" && parsed.command.operation === "CANCEL")
  ) {
    nextSession.discourse.activeProposalToken = undefined;
    nextSession.discourse.confirmationPhraseRendered = false;
  }
  if (parsed.command.operation === "SHOW_DOCKET") {
    const fact = dispatched.response.fact as { choiceIds?: string[]; channel?: string };
    nextSession.discourse.activeChannel = parsed.command.channel;
    nextSession.discourse.activeActorId = parsed.command.actorId;
    nextSession.discourse.lastVisibleChoiceIds = fact.choiceIds ?? [];
    nextSession.discourse.numericShortcuts = Object.fromEntries(
      (fact.choiceIds ?? []).map((choiceId, index) => [String(index + 1), choiceId]),
    );
  }

  const text = framesToText(
    renderTerminal(dispatched.response, {
      width: nextSession.width,
      colorDepth: nextSession.colorDepth,
      unicode: true,
      interactive: nextSession.interactive,
    }),
  );

  return {
    state: dispatched.state,
    session: nextSession,
    response: dispatched.response,
    text,
  };
};

export const bannerFor = (state: GameState) =>
  [
    "DELENDA QUEST",
    "AUTHENTICATING COMMAND IDENTITY...",
    "",
    `DAY ${state.day} · ${state.campaignId}`,
    `ORDERS ${state.actions}/3`,
    "Front condition recorded in status.",
    "",
    "Type `brief`, `orders`, or `help`.",
    "DELENDA>",
  ].join("\n");
