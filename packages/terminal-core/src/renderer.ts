import type { SemanticResponse } from "../../../app/substrate/contracts";

export type TerminalRenderOptions = {
  width: number;
  colorDepth: number;
  unicode: boolean;
  interactive: boolean;
};

export type TerminalFrame = {
  kind: "heading" | "table" | "prose" | "choices" | "recovery" | "status";
  text: string;
};

const wrap = (text: string, width: number) => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.join("\n");
};

const sanitize = (text: string) =>
  text
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

export const renderTerminal = <T>(
  response: SemanticResponse<T>,
  options: TerminalRenderOptions,
): TerminalFrame[] => {
  const width = Math.max(40, Math.min(options.width || 80, 120));
  const color = options.colorDepth > 1;
  const paint = (text: string, code: string) =>
    color ? `\u001b[${code}m${text}\u001b[0m` : text;
  const frames: TerminalFrame[] = [];

  frames.push({
    kind: "status",
    text: paint(sanitize(response.status), response.status === "EXECUTED" ? "32" : "1"),
  });
  frames.push({
    kind: "heading",
    text: paint(sanitize(response.rendering.compact), "1"),
  });
  frames.push({
    kind: "prose",
    text: wrap(sanitize(response.rendering.brief), width),
  });

  const fact = response.fact as {
    choices?: Array<{ choiceId: string; title: string; orderCost?: number }>;
    proposalToken?: string;
    confirmationPhrase?: string;
    normalizedAction?: { title: string };
    orderCost?: number;
    ordersBefore?: number;
    ordersAfter?: number;
    knownConsequences?: Array<{ claim: string }>;
    reversible?: boolean;
    expiresAt?: string;
    auditId?: string;
  } | null;

  if (fact?.choices?.length) {
    const lines = fact.choices.map(
      (choice, index) =>
        `${index + 1}. ${choice.title} [${choice.choiceId}]` +
        (choice.orderCost ? ` · cost ${choice.orderCost}` : ""),
    );
    frames.push({ kind: "choices", text: sanitize(lines.join("\n")) });
  }

  if (response.status === "PREPARED" && fact?.proposalToken) {
    frames.push({
      kind: "prose",
      text: sanitize(
        [
          "ORDER PREPARED",
          fact.normalizedAction?.title ?? "",
          `Cost: ${fact.orderCost ?? 1} order`,
          `Orders: ${fact.ordersBefore} → ${fact.ordersAfter}`,
          `Known consequence: ${(fact.knownConsequences ?? []).map((item) => item.claim).join("; ") || "none disclosed"}`,
          `Reversible: ${fact.reversible ? "yes" : "no"}`,
          `Expires: ${fact.expiresAt ?? ""}`,
          "",
          "Confirm with:",
          fact.confirmationPhrase ?? `confirm ${fact.proposalToken}`,
        ].join("\n"),
      ),
    });
  }

  if (response.status === "EXECUTED") {
    frames.push({
      kind: "prose",
      text: sanitize(`ORDER EXECUTED\nAudit: ${response.auditId ?? fact?.auditId ?? "n/a"}`),
    });
  }

  if (response.recovery) {
    frames.push({
      kind: "recovery",
      text: sanitize(
        [
          response.recovery.instruction,
          ...(response.recovery.validExamples ?? []).map((example) => `  · ${example}`),
        ].join("\n"),
      ),
    });
  }

  // Never hide execution status behind pagination metadata.
  frames.push({
    kind: "status",
    text: `STATUS=${response.status}`,
  });

  return frames;
};

export const framesToText = (frames: TerminalFrame[]) =>
  frames.map((frame) => frame.text).join("\n\n");
