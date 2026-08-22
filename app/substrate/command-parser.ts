/**
 * Legacy deterministic surface parser — reference interpreter only.
 *
 * The production language authority is the Ava grammar compiler behind the
 * canonical Nexus (`app/ava/compiler.ts` via `app/ava/nexus.ts`); no
 * production adapter may parse player language here (enforced by
 * `tests/substrate-architecture.test.mjs`). This module is retained for the
 * Ava Classic differential reference (`./ava-classic.ts`) and its parser
 * parity tests, plus one live export: `isConsequentialCommandAttempt`, the
 * parse-independent lexical kill switch used by the SSH server before a
 * session may mutate.
 */
export const COMMAND_PARSER_REFERENCE_ONLY = true;

import type { CanonicalCommand, CommandOperation } from "./contracts";
import type { Channel } from "./gates";
import {
  DEFAULT_STRATEGIC_POSTURE,
  mergePosture,
  type StrategicPosture,
} from "./posture";

export type ParserDiscourse = {
  activeChannel?: Channel;
  activeActorId?: string;
  lastVisibleChoiceIds?: string[];
  activeProposalToken?: string;
  activeProposalExpiresAt?: string;
  confirmationPhraseRendered?: boolean;
  numericShortcuts?: Record<string, string>;
};

const CHANNELS: Record<string, Channel> = {
  production: "production",
  prod: "production",
  military: "military",
  mil: "military",
  diplomacy: "diplomacy",
  diplo: "diplomacy",
};

const normalize = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/[.?!,]+$/g, "");

/**
 * Security classification is lexical and intentionally independent of parse
 * success. A malformed consequential command must not escape an adapter kill
 * switch merely because the language compiler rejected it first.
 */
export const isConsequentialCommandAttempt = (rawInput: string) => {
  const text = normalize(rawInput);
  return (
    /^(?:prepare|confirm|cancel|execute|issue|choose|commit|stage|unstage|internalize|respond)\b/.test(
      text,
    ) ||
    /^(?:yes|accept|do it|issue it|execute it)$/.test(text) ||
    /^(?:resolve|end|close)\b.*\bday\b/.test(text)
  );
};

const aliasMap: Array<{ pattern: RegExp; rewrite: string }> = [
  { pattern: /^(daily brief|campaign brief)$/i, rewrite: "brief" },
  { pattern: /^(situation|campaign status)$/i, rewrite: "status" },
  { pattern: /^orders$/i, rewrite: "orders" },
  { pattern: /^options$/i, rewrite: "options" },
  { pattern: /^(recommend|recommendation)$/i, rewrite: "advise" },
  { pattern: /^evaluate\s+(.+)$/i, rewrite: "advise $1" },
  { pattern: /^(versus|vs)\s+/i, rewrite: "compare " },
  { pattern: /^(execute|issue|choose)\s+/i, rewrite: "prepare " },
  { pattern: /^(service record|record)$/i, rewrite: "battle log" },
  { pattern: /^history$/i, rewrite: "recent dispatches" },
  { pattern: /^exit$/i, rewrite: "quit" },
];

const rejectUnsafe = (raw: string): string | null => {
  if (raw.length > 2000) return "INPUT_TOO_LONG";
  if ((raw.match(/\n/g) ?? []).length > 20) return "INPUT_TOO_MANY_LINES";
  if (/[\u001b\u009b]|\x1b|\]8;|OSC/i.test(raw)) return "UNSAFE_CONTROL_SEQUENCE";
  return null;
};

const base = (
  operation: CommandOperation,
  rawInput: string,
  confidence: CanonicalCommand["confidence"],
  extra: Partial<CanonicalCommand> = {},
): CanonicalCommand => ({
  operation,
  rawInput,
  parser: "deterministic",
  confidence,
  ...extra,
});

export type ParseResult =
  | { ok: true; command: CanonicalCommand }
  | {
      ok: false;
      status: "AMBIGUOUS" | "REJECTED" | "CONFIRMATION_REQUIRED";
      code: string;
      instruction: string;
      examples?: string[];
    };

export const parseDelendaCommand = (
  rawInput: string,
  discourse: ParserDiscourse = {},
  options: { interactive?: boolean } = {},
): ParseResult => {
  const unsafe = rejectUnsafe(rawInput);
  if (unsafe) {
    return {
      ok: false,
      status: "REJECTED",
      code: unsafe,
      instruction: "Input rejected. Use a single Delenda command line.",
      examples: ["help", "brief", "status"],
    };
  }

  let text = normalize(rawInput);
  for (const alias of aliasMap) {
    if (alias.pattern.test(text)) {
      text = text.replace(alias.pattern, alias.rewrite).trim();
      break;
    }
  }

  if (!text) {
    return {
      ok: false,
      status: "AMBIGUOUS",
      code: "EMPTY",
      instruction: "Enter a command.",
      examples: ["help", "brief"],
    };
  }

  if (text === "help") return { ok: true, command: base("HELP", rawInput, "exact") };
  if (text === "brief") return { ok: true, command: base("BRIEF", rawInput, "exact") };
  if (text === "status") return { ok: true, command: base("STATUS", rawInput, "exact") };
  if (text === "interrupts") return { ok: true, command: base("INTERRUPTS", rawInput, "exact") };
  if (text === "missions") return { ok: true, command: base("MISSIONS", rawInput, "exact") };
  if (text === "battle log") {
    const canonical = /^battle\s+log$/i.test(normalize(rawInput));
    return {
      ok: true,
      command: base(
        "BATTLE_LOG",
        rawInput,
        canonical ? "exact" : "normalized",
      ),
    };
  }
  if (text === "recent dispatches") {
    return { ok: true, command: base("RECENT_DISPATCHES", rawInput, "normalized") };
  }
  if (text === "whoami") return { ok: true, command: base("WHOAMI", rawInput, "exact") };
  if (text === "logout") return { ok: true, command: base("LOGOUT", rawInput, "exact") };
  if (text === "quit") return { ok: true, command: base("QUIT", rawInput, "exact") };

  if (text === "orders") {
    return {
      ok: true,
      command: base("SHOW_DOCKET", rawInput, "normalized", { channel: "production" }),
    };
  }
  if (text === "options") {
    return {
      ok: true,
      command: base("SHOW_DOCKET", rawInput, "normalized", {
        channel: discourse.activeChannel ?? "production",
        actorId: discourse.activeActorId,
      }),
    };
  }

  for (const [alias, channel] of Object.entries(CHANNELS)) {
    if (text === alias) {
      return {
        ok: true,
        command: base("SHOW_DOCKET", rawInput, alias === channel ? "exact" : "normalized", {
          channel,
        }),
      };
    }
    const prefixed = text.match(new RegExp(`^${alias}\\s+(\\S+)$`));
    if (prefixed && channel === "diplomacy") {
      return {
        ok: true,
        command: base("SHOW_DOCKET", rawInput, "exact", {
          channel,
          actorId: prefixed[1],
        }),
      };
    }
  }

  const show = text.match(/^show\s+(\S+)$/);
  if (show) {
    const target = resolveTarget(show[1], discourse);
    if (!target) {
      return {
        ok: false,
        status: "AMBIGUOUS",
        code: "UNKNOWN_TARGET",
        instruction: "Unknown choice id or shortcut.",
        examples: ["show <choice-id>", "1"],
      };
    }
    return {
      ok: true,
      command: base("SHOW_CHOICE", rawInput, "exact", { targetIds: [target] }),
    };
  }

  const ask = text.match(/^ask ava\s+(.+)$/);
  if (ask) {
    return {
      ok: true,
      command: base("ASK_AVA", rawInput, "exact", { question: ask[1] }),
    };
  }

  if (text === "advise" || text.startsWith("advise ")) {
    const rest = text.slice("advise".length).trim();
    if (!rest) return { ok: true, command: base("ADVISE", rawInput, "exact") };
    const [channelAlias, actorId] = rest.split(/\s+/);
    const channel = CHANNELS[channelAlias];
    if (!channel) {
      return {
        ok: false,
        status: "AMBIGUOUS",
        code: "BAD_ADVISE_CHANNEL",
        instruction: "advise [production|military|diplomacy <actor>]",
      };
    }
    return {
      ok: true,
      command: base("ADVISE", rawInput, "exact", { channel, actorId }),
    };
  }

  if (text.startsWith("rank ")) {
    const rest = text.slice(5).trim();
    const [channelAlias, actorId] = rest.split(/\s+/);
    const channel = CHANNELS[channelAlias];
    if (!channel) {
      return {
        ok: false,
        status: "AMBIGUOUS",
        code: "BAD_RANK_CHANNEL",
        instruction: "rank production|military|diplomacy <actor>",
      };
    }
    return {
      ok: true,
      command: base("RANK", rawInput, "exact", { channel, actorId }),
    };
  }

  if (text.startsWith("compare ")) {
    const ids = text
      .slice(8)
      .trim()
      .split(/\s+/)
      .map((item) => resolveTarget(item, discourse))
      .filter((item): item is string => Boolean(item));
    if (ids.length < 2) {
      return {
        ok: false,
        status: "AMBIGUOUS",
        code: "COMPARE_NEEDS_TARGETS",
        instruction: "compare <choice-id> <choice-id> [<choice-id>]",
      };
    }
    return {
      ok: true,
      command: base("COMPARE", rawInput, "exact", { targetIds: ids }),
    };
  }

  if (text.startsWith("prepare ")) {
    const target = resolveTarget(text.slice(8).trim(), discourse);
    if (!target) {
      return {
        ok: false,
        status: "AMBIGUOUS",
        code: "PREPARE_TARGET",
        instruction: "prepare <choice-id>",
      };
    }
    return {
      ok: true,
      command: base("PREPARE", rawInput, "exact", { targetIds: [target] }),
    };
  }

  if (text.startsWith("confirm ")) {
    const proposalToken = text.slice(8).trim();
    return {
      ok: true,
      command: base("CONFIRM", rawInput, "exact", { proposalToken }),
    };
  }

  if (text.startsWith("cancel ")) {
    const proposalToken = text.slice(7).trim();
    return {
      ok: true,
      command: base("CANCEL", rawInput, "exact", { proposalToken }),
    };
  }

  if (text === "accept") {
    if (discourse.activeProposalToken) {
      return {
        ok: true,
        command: base("CONFIRM", rawInput, "normalized", {
          proposalToken: discourse.activeProposalToken,
        }),
      };
    }
    return {
      ok: false,
      status: "CONFIRMATION_REQUIRED",
      code: "ACCEPT_NEEDS_TOKEN",
      instruction: "accept only works when a proposal token is active. Use confirm <token>.",
      examples: ["confirm prp_..."],
    };
  }

  if (text === "yes" || text === "no") {
    const single =
      discourse.activeProposalToken &&
      discourse.confirmationPhraseRendered &&
      (!discourse.activeProposalExpiresAt ||
        Date.parse(discourse.activeProposalExpiresAt) > Date.now());
    if (!single || options.interactive === false) {
      return {
        ok: false,
        status: "CONFIRMATION_REQUIRED",
        code: "BARE_AFFIRMATIVE_BLOCKED",
        instruction:
          "Bare yes/no cannot mutate state unless exactly one prepared proposal is active and its confirmation phrase was rendered. Use confirm <token> or cancel <token>.",
        examples: ["confirm prp_...", "cancel prp_..."],
      };
    }
    return {
      ok: true,
      command: base(text === "yes" ? "CONFIRM" : "CANCEL", rawInput, "normalized", {
        proposalToken: discourse.activeProposalToken,
      }),
    };
  }

  // posture shorthand used by Ava fixtures
  const posture = inferPosturePatch(text);
  if (posture) {
    return {
      ok: true,
      command: base("ADVISE", rawInput, "normalized", { posture }),
    };
  }

  return {
    ok: false,
    status: "AMBIGUOUS",
    code: "UNKNOWN_COMMAND",
    instruction: "Unrecognized command. Nearby valid forms:",
    examples: ["help", "brief", "production", "prepare <choice-id>", "advise military"],
  };
};

const resolveTarget = (token: string, discourse: ParserDiscourse) => {
  if (!token) return null;
  if (discourse.numericShortcuts?.[token]) return discourse.numericShortcuts[token];
  if (/^\d+$/.test(token) && discourse.lastVisibleChoiceIds) {
    const index = Number(token) - 1;
    return discourse.lastVisibleChoiceIds[index] ?? null;
  }
  return token;
};

const inferPosturePatch = (text: string): StrategicPosture | null => {
  if (text.includes("care most about production") || text.includes("prioritize production")) {
    return mergePosture(DEFAULT_STRATEGIC_POSTURE, {
      objective: "preserve_industrial_capacity",
      priorities: { production_integrity: "critical" },
      confirmation: "inferred",
    });
  }
  if (text.includes("preserve the veterans") || text.includes("preserve veterans")) {
    return mergePosture(DEFAULT_STRATEGIC_POSTURE, {
      objective: "preserve_experienced_forces",
      priorities: { veteran_preservation: "critical" },
      tolerances: { veteran_attrition: "none", territorial_loss: "high" },
      confirmation: "inferred",
    });
  }
  if (text.includes("prioritize civil stability") || text.includes("civil stability")) {
    return mergePosture(DEFAULT_STRATEGIC_POSTURE, {
      priorities: { civil_stability: "critical" },
      tolerances: { civil_unrest: "none" },
      confirmation: "inferred",
    });
  }
  if (text.includes("preserve territory")) {
    return mergePosture(DEFAULT_STRATEGIC_POSTURE, {
      priorities: { territorial_control: "critical" },
      tolerances: { territorial_loss: "none" },
      confirmation: "confirmed_by_player",
    });
  }
  return null;
};
