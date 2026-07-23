import type { GameState } from "../game";
import { avaShellCompletionCandidates } from "./filesystem";
import { AVA_AUTOCOMPLETE_UTTERANCES } from "./grammar";
import { AVA_COMMAND_HELP, type AvaShellSession } from "./schema";
import type { AvaDarkNetContext } from "./darknet";

const longestCommonPrefix = (values: string[]) => {
  if (!values.length) return "";
  let prefix = values[0];
  for (const value of values.slice(1)) {
    while (
      prefix &&
      !value.toLowerCase().startsWith(prefix.toLowerCase())
    )
      prefix = prefix.slice(0, -1);
  }
  return prefix;
};

const commandExamples = AVA_COMMAND_HELP.flatMap((command) => [
  command.command.toLowerCase(),
  ...command.examples,
]);

const semanticCandidates = [
  ...new Set([
    ...commandExamples,
    ...AVA_AUTOCOMPLETE_UTTERANCES,
    "advise me on the missions",
    "advise me on the secondary missions",
    "compare n and d",
    "what else can I do today",
    "report campaign",
    "report production",
    "report military",
    "report diplomacy",
    "show plan",
    "clear plan",
  ]),
];

const prefixMatch = (candidate: string, raw: string) => {
  const input = raw.toLowerCase();
  const target = candidate.toLowerCase();
  if (target.startsWith(input)) return true;
  const inputTokens = input.split(/\s+/).filter(Boolean);
  const targetTokens = target.split(/\s+/).filter(Boolean);
  return (
    inputTokens.length <= targetTokens.length &&
    inputTokens.every(
      (token, index) => targetTokens[index]?.startsWith(token),
    )
  );
};

export type AvaCompletion = {
  value: string;
  candidates: string[];
};

export const completeAvaInput = (
  raw: string,
  state: GameState,
  shell: AvaShellSession,
  fraction = 0,
  darkNetContext: AvaDarkNetContext = {},
): AvaCompletion => {
  const input = raw.trimStart();
  const pool = [
    ...avaShellCompletionCandidates(
      state,
      shell,
      fraction,
      darkNetContext,
    ),
    ...semanticCandidates,
  ];
  const candidates = [
    ...new Set(
      pool.filter((candidate) => prefixMatch(candidate, input)),
    ),
  ].sort((left, right) => {
    const directLeft = left.toLowerCase().startsWith(input.toLowerCase());
    const directRight = right.toLowerCase().startsWith(input.toLowerCase());
    if (directLeft !== directRight) return directLeft ? -1 : 1;
    return left.length - right.length || left.localeCompare(right);
  });
  if (!candidates.length) return { value: raw, candidates: [] };
  if (candidates.length === 1)
    return {
      value: candidates[0],
      candidates,
    };
  const direct = candidates.filter((candidate) =>
    candidate.toLowerCase().startsWith(input.toLowerCase()),
  );
  const prefix = longestCommonPrefix(direct.length ? direct : candidates);
  return {
    value: prefix.length > input.length ? prefix : candidates[0],
    candidates,
  };
};
