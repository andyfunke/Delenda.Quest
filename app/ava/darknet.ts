import { APHORISMS } from "../aphorisms";
import type { GameState } from "../game";
import { enumerateAvaActions } from "./runtime";

export type AvaGlobalProductTelemetry = {
  asOf: number;
  categoryTotals: Array<{ category: string; count: number }>;
  outcomes: Array<{
    outcome: string;
    campaigns: number;
    averageDays: number;
  }>;
  topSignals: Array<{
    category: string;
    subject: string;
    context: string;
    count: number;
  }>;
};

export type AvaDarkNetContext = {
  telemetry?: AvaGlobalProductTelemetry;
  seenAphorismIds?: string[];
};

export type AvaDarkNetExecution = {
  text: string;
  aphorismViewId?: string;
};

const darkNetHeader = [
  "DARK NET // RELAY ESTABLISHED",
  "UNINDEXED READ-ONLY MIRROR",
  "No order can be staged, issued, or confirmed through this surface.",
].join("\n");

const helpText = () =>
  [
    darkNetHeader,
    "",
    "ENDPOINTS",
    "tor telemetry       Global aggregate product signals",
    "tor campaign        Every option in the authoritative current docket",
    "tor quotes          Complete quotation index",
    "tor quote Q103      View one quotation and spend its rotation entry",
    "tor help            This endpoint map",
  ].join("\n");

const telemetryText = (context: AvaDarkNetContext) => {
  const telemetry = context.telemetry;
  if (!telemetry)
    return [
      darkNetHeader,
      "",
      "GLOBAL PRODUCT TELEMETRY",
      "The aggregate relay did not answer. Campaign and quotation mirrors remain available.",
      "",
      "MIRRORS",
      "tor campaign // tor quotes // tor help",
    ].join("\n");
  const categories = telemetry.categoryTotals
    .map(
      (row) =>
        `${row.category.replaceAll("_", " ").toUpperCase()}: ${row.count.toLocaleString()}`,
    )
    .join("\n");
  const outcomes = telemetry.outcomes.length
    ? telemetry.outcomes
        .map(
          (row) =>
            `${row.outcome.toUpperCase()}: ${row.campaigns.toLocaleString()} CAMPAIGNS // ${row.averageDays} AVG DAYS`,
        )
        .join("\n")
    : "NO COMPLETED CAMPAIGNS RECORDED";
  const signals = telemetry.topSignals.length
    ? telemetry.topSignals
        .slice(0, 24)
        .map(
          (row) =>
            `${row.category.toUpperCase()} // ${row.subject} // ${row.context}: ${row.count.toLocaleString()}`,
        )
        .join("\n")
    : "NO PARTICIPATING SIGNALS RECORDED";
  return [
    darkNetHeader,
    "",
    `GLOBAL PRODUCT TELEMETRY // AS OF ${new Date(telemetry.asOf).toISOString()}`,
    "Aggregate counters only. No identities, transcripts, friend graphs, or individual play histories exist in this relay.",
    "",
    "TOTAL SIGNALS",
    categories || "NO PARTICIPATING SIGNALS RECORDED",
    "",
    "CAMPAIGN OUTCOMES",
    outcomes,
    "",
    "HIGHEST-VOLUME SIGNALS",
    signals,
    "",
    "MIRRORS",
    "tor campaign // tor quotes // tor help",
  ].join("\n");
};

const campaignText = (state: GameState, fraction: number) => {
  const actions = enumerateAvaActions(state, fraction).filter(
    (action) =>
      action.domain !== undefined ||
      action.kind === "opportunity-response",
  );
  const rows = actions.flatMap((action) => [
    `[${action.handle}] ${action.parentLabel.toUpperCase()} // ${action.label}`,
    `STATUS: ${action.available ? "AVAILABLE" : `LOCKED // ${action.rejection ?? "UNAVAILABLE"}`}`,
    `CONSEQUENCE: ${action.owned.join(" ") || action.summary}`,
    `RISK: ${action.contingent.join(" ") || "No contingent consequence is declared."}`,
    "",
  ]);
  return [
    darkNetHeader,
    "",
    `AUTHORITATIVE CURRENT DOCKET // DAY ${state.day} // ${actions.length} OPTIONS`,
    "Inspection does not stage or commit an order. The mirror contains no resolution control.",
    "",
    ...(rows.length ? rows : ["NO CAMPAIGN OPTION IS PRESENT IN THE CURRENT DOCKET"]),
  ]
    .join("\n")
    .trimEnd();
};

const quoteIdFrom = (value: string | undefined) => {
  if (!value) return null;
  const match = value.toUpperCase().match(/^Q?(\d{1,3})$/);
  return match ? `Q${String(Number(match[1])).padStart(3, "0")}` : null;
};

const quotationIndexText = (context: AvaDarkNetContext) => {
  const seen = new Set(context.seenAphorismIds ?? []);
  const remaining = APHORISMS.filter((quote) => !seen.has(quote.id)).length;
  return [
    darkNetHeader,
    "",
    `QUOTATION INDEX // ${APHORISMS.length} RECORDS // ${remaining} UNSEEN`,
    "The index does not spend a quotation. Opening a record does.",
    "",
    ...APHORISMS.map(
      (quote) =>
        `${quote.id} [${seen.has(quote.id) ? "VIEWED" : "UNSEEN"}] // ${quote.source}`,
    ),
    "",
    "VIEW RECORD",
    "tor quote Q001",
  ].join("\n");
};

const quotationText = (
  requested: string | undefined,
  context: AvaDarkNetContext,
): AvaDarkNetExecution => {
  const id = quoteIdFrom(requested);
  const quote = APHORISMS.find((item) => item.id === id);
  if (!quote)
    return {
      text: [
        darkNetHeader,
        "",
        `QUOTATION RECORD NOT FOUND // ${requested ?? "MISSING ID"}`,
        "Use tor quotes to inspect the complete index.",
      ].join("\n"),
    };
  const seen = new Set(context.seenAphorismIds ?? []);
  const alreadyViewed = seen.has(quote.id);
  const before = APHORISMS.filter((item) => !seen.has(item.id)).length;
  const after = Math.max(0, before - (alreadyViewed ? 0 : 1));
  return {
    aphorismViewId: quote.id,
    text: [
      darkNetHeader,
      "",
      `QUOTATION RECORD // ${quote.id}`,
      `“${quote.text}”`,
      quote.source,
      "",
      alreadyViewed
        ? `ROTATION LEDGER // ALREADY VIEWED // ${after} UNSEEN REMAIN`
        : `ROTATION LEDGER // RECORD CONSUMED // ${before} → ${after} UNSEEN`,
    ].join("\n"),
  };
};

export const executeAvaDarkNet = (
  state: GameState,
  fraction: number,
  args: string[],
  context: AvaDarkNetContext = {},
): AvaDarkNetExecution => {
  const [rawEndpoint, rawTarget] = args;
  const endpoint = rawEndpoint?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!endpoint || ["telemetry", "stats", "signals", "global"].includes(endpoint))
    return { text: telemetryText(context) };
  if (["help", "man", "manual", "?"].includes(endpoint))
    return { text: helpText() };
  if (
    ["campaign", "campaigns", "mission", "missions", "option", "options", "docket"].includes(
      endpoint,
    )
  )
    return { text: campaignText(state, fraction) };
  if (["quotes", "quotations", "aphorisms", "archive", "index"].includes(endpoint)) {
    const target = quoteIdFrom(rawTarget);
    return target
      ? quotationText(target, context)
      : { text: quotationIndexText(context) };
  }
  if (["quote", "quotation", "aphorism"].includes(endpoint))
    return quotationText(rawTarget, context);
  if (quoteIdFrom(rawEndpoint)) return quotationText(rawEndpoint, context);
  return {
    text: [
      darkNetHeader,
      "",
      `ENDPOINT NOT FOUND // ${rawEndpoint}`,
      "",
      helpText().split("\n").slice(4).join("\n"),
    ].join("\n"),
  };
};
