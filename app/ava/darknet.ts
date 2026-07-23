import { APHORISMS } from "../aphorisms";
import {
  FAMILIES,
  MANEUVERS,
  OPPORTUNITY_TEMPLATES,
  SITUATIONS,
  type GameState,
} from "../game";
import {
  DOMESTIC_SUB_MISSIONS,
  NETWORK_SUB_MISSIONS,
} from "../submission-schema";
import {
  SUB_MISSION_FRAMES,
  SUB_MISSION_REALIZATIONS,
} from "../sub-mission-content";
import { enumerateAvaActions } from "./runtime";

export const AVA_DARK_NET_ROOT = "/darknet";

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
  cwd?: string;
  aphorismViewIds?: string[];
};

export type AvaDarkNetVirtualFile = {
  path: string;
  content: string;
  aphorismId?: string;
};

const darkNetHeader = [
  "DARK NET // RELAY ESTABLISHED",
  "UNINDEXED READ-ONLY MIRROR",
  "No order can be staged, issued, or confirmed through this surface.",
].join("\n");

const resolveChoice = (familyId: string, choiceId: string) => {
  const family = FAMILIES.find((item) => item.id === familyId);
  const choice = family?.choices.find((item) => item.id === choiceId);
  return family && choice ? { family, choice } : null;
};

const secondaryVariantFiles = () =>
  [...DOMESTIC_SUB_MISSIONS, ...NETWORK_SUB_MISSIONS].flatMap((archetype) => {
    const frames = SUB_MISSION_FRAMES.filter(
      (frame) => frame.archetypeId === archetype.id,
    );
    const realizations = SUB_MISSION_REALIZATIONS[archetype.id] ?? [];
    return frames.flatMap((frame) =>
      realizations.map((realization) => {
        const id = `${archetype.domain}.${archetype.id}.${frame.id}.${realization.id}`;
        const options = archetype.options.flatMap((reference, index) => {
          const resolved = resolveChoice(reference.familyId, reference.choiceId);
          if (!resolved) return [];
          return [
            [
              `OPTION ${index + 1} // ${resolved.choice.label}`,
              `FAMILY: ${resolved.family.label}`,
              `CONSEQUENCE: ${resolved.choice.exact.join(" ")}`,
              `RISK: ${resolved.choice.risk.join(" ")}`,
            ].join("\n"),
          ];
        });
        return {
          id,
          domain: archetype.domain,
          title: frame.title,
          optionCount: options.length,
          file: {
            path: `${AVA_DARK_NET_ROOT}/campaign/${archetype.domain}/${id}.txt`,
            content: [
              `CAMPAIGN ARCHIVE // ${archetype.domain.toUpperCase()}`,
              `RECORD: ${id}`,
              `ARCHETYPE: ${archetype.label}`,
              `CATEGORY: ${archetype.category}`,
              `REALIZATION: ${realization.id.toUpperCase()}`,
              "",
              frame.title,
              `${frame.brief} ${realization.coda}`,
              `${frame.question} ${realization.questionCoda}`,
              frame.authority,
              "",
              ...options,
              "",
              `SEARCH ALIASES: ${frame.aliases.join(" // ") || "NONE"}`,
            ].join("\n"),
          } satisfies AvaDarkNetVirtualFile,
        };
      }),
    );
  });

const mainSituationFiles = () =>
  SITUATIONS.map((situation) => {
    const options = situation.maneuvers.flatMap((maneuverId, index) => {
      const maneuver = MANEUVERS.find((item) => item.id === maneuverId);
      if (!maneuver) return [];
      return [
        [
          `OPTION ${index + 1} // ${maneuver.label}`,
          `MANEUVER: ${maneuver.id}`,
          `CONSEQUENCE: ${maneuver.exact.join(" ")}`,
          `RISK: ${maneuver.risk.join(" ")}`,
        ].join("\n"),
      ];
    });
    return {
      id: situation.id,
      title: situation.headline,
      optionCount: options.length,
      file: {
        path: `${AVA_DARK_NET_ROOT}/campaign/main/${situation.id}.txt`,
        content: [
          "CAMPAIGN ARCHIVE // MAIN",
          `RECORD: main.${situation.id}`,
          `THEATER: ${situation.theater.toUpperCase()}`,
          `SECTOR: ${situation.sector}`,
          "",
          situation.headline,
          situation.briefing,
          situation.question,
          "",
          ...options,
        ].join("\n"),
      } satisfies AvaDarkNetVirtualFile,
    };
  });

const opportunityFiles = () =>
  OPPORTUNITY_TEMPLATES.map((opportunity) => {
    const options = opportunity.responses.map((response, index) =>
      [
        `OPTION ${index + 1} // ${response.label}`,
        `CONSEQUENCE: ${response.exact.join(" ")}`,
        `RISK: ${response.contingent.join(" ")}`,
      ].join("\n"),
    );
    return {
      id: opportunity.id,
      title: opportunity.headline,
      optionCount: options.length,
      file: {
        path: `${AVA_DARK_NET_ROOT}/campaign/opportunities/${opportunity.id}.txt`,
        content: [
          "CAMPAIGN ARCHIVE // TARGET OF OPPORTUNITY",
          `RECORD: opportunity.${opportunity.id}`,
          `CATEGORY: ${opportunity.category.replaceAll("-", " ").toUpperCase()}`,
          `INDIVIDUAL: ${opportunity.individual}`,
          "",
          opportunity.headline,
          opportunity.brief,
          "",
          ...options,
        ].join("\n"),
      } satisfies AvaDarkNetVirtualFile,
    };
  });

const buildCampaignCorpus = () => {
  const main = mainSituationFiles();
  const secondary = secondaryVariantFiles();
  const opportunities = opportunityFiles();
  const optionPaths =
    main.reduce((sum, item) => sum + item.optionCount, 0) +
    secondary.reduce((sum, item) => sum + item.optionCount, 0) +
    opportunities.reduce((sum, item) => sum + item.optionCount, 0);
  return {
    main,
    secondary,
    opportunities,
    records: main.length + secondary.length + opportunities.length,
    optionPaths,
  };
};
const CAMPAIGN_CORPUS = buildCampaignCorpus();

export const avaDarkNetCampaignCorpusSummary = () => {
  const corpus = CAMPAIGN_CORPUS;
  return {
    mainSituations: corpus.main.length,
    secondaryVariants: corpus.secondary.length,
    opportunities: corpus.opportunities.length,
    records: corpus.records,
    optionPaths: corpus.optionPaths,
  };
};

const campaignIndexText = () => {
  const corpus = CAMPAIGN_CORPUS;
  return [
    darkNetHeader,
    "",
    `COMPLETE CAMPAIGN REGISTRY // ${corpus.records} RECORDS // ${corpus.optionPaths} RESPONSE PATHS`,
    `${corpus.main.length} MAIN SITUATIONS // ${corpus.secondary.length} DOMESTIC + NETWORK VARIANTS // ${corpus.opportunities.length} TARGETS OF OPPORTUNITY`,
    "This is the complete authored campaign corpus, not a sample and not today's docket.",
    "Inspecting a record never stages or commits its options.",
    "",
    "MAIN",
    ...corpus.main.map(
      (item) =>
        `${item.file.path} // ${item.title} // ${item.optionCount} OPTIONS`,
    ),
    "",
    "DOMESTIC + NETWORK",
    ...corpus.secondary.map(
      (item) =>
        `${item.file.path} // ${item.title} // ${item.optionCount} OPTIONS`,
    ),
    "",
    "TARGETS OF OPPORTUNITY",
    ...corpus.opportunities.map(
      (item) =>
        `${item.file.path} // ${item.title} // ${item.optionCount} OPTIONS`,
    ),
    "",
    "SEARCH",
    "grep -ir reserves .",
    "grep -ir evacuation domestic",
    "grep -ir authentication network",
    "cat current.txt",
  ].join("\n");
};

const currentDocketText = (state: GameState, fraction: number) => {
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
    "This file is today's state-bound docket. The parent campaign directory contains the complete authored registry.",
    "Inspection does not stage or commit an order. The mirror contains no resolution control.",
    "",
    ...(rows.length ? rows : ["NO CAMPAIGN OPTION IS PRESENT IN THE CURRENT DOCKET"]),
  ]
    .join("\n")
    .trimEnd();
};

const telemetryText = (context: AvaDarkNetContext) => {
  const telemetry = context.telemetry;
  if (!telemetry)
    return [
      darkNetHeader,
      "",
      "GLOBAL PRODUCT TELEMETRY",
      "The aggregate relay did not answer. Campaign and quotation mirrors remain available.",
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
    "PRODUCT SIGNALS",
    signals,
  ].join("\n");
};

const quotationIndexText = (context: AvaDarkNetContext) => {
  const seen = new Set(context.seenAphorismIds ?? []);
  const remaining = APHORISMS.filter((quote) => !seen.has(quote.id)).length;
  return [
    darkNetHeader,
    "",
    `QUOTATION INDEX // ${APHORISMS.length} RECORDS // ${remaining} UNSEEN`,
    "The index does not spend a quotation. Opening, catting, or grepping a quotation record does.",
    "",
    ...APHORISMS.map(
      (quote) =>
        `${quote.id} [${seen.has(quote.id) ? "VIEWED" : "UNSEEN"}] // ${quote.source}`,
    ),
  ].join("\n");
};

const quotationRecord = (
  id: string,
  context: AvaDarkNetContext,
): AvaDarkNetVirtualFile | null => {
  const quote = APHORISMS.find((item) => item.id === id);
  if (!quote) return null;
  const seen = new Set(context.seenAphorismIds ?? []);
  const alreadyViewed = seen.has(quote.id);
  const before = APHORISMS.filter((item) => !seen.has(item.id)).length;
  const after = Math.max(0, before - (alreadyViewed ? 0 : 1));
  return {
    path: `${AVA_DARK_NET_ROOT}/quotes/${quote.id}.txt`,
    aphorismId: quote.id,
    content: [
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

const quoteIdFrom = (value: string | undefined) => {
  if (!value) return null;
  const match = value.toUpperCase().match(/^Q?(\d{1,3})$/);
  return match ? `Q${String(Number(match[1])).padStart(3, "0")}` : null;
};

export const avaDarkNetDirectories = [
  AVA_DARK_NET_ROOT,
  `${AVA_DARK_NET_ROOT}/campaign`,
  `${AVA_DARK_NET_ROOT}/campaign/main`,
  `${AVA_DARK_NET_ROOT}/campaign/domestic`,
  `${AVA_DARK_NET_ROOT}/campaign/network`,
  `${AVA_DARK_NET_ROOT}/campaign/opportunities`,
  `${AVA_DARK_NET_ROOT}/quotes`,
];

export const avaDarkNetFiles = (
  state: GameState,
  fraction: number,
  context: AvaDarkNetContext = {},
): AvaDarkNetVirtualFile[] => {
  const corpus = CAMPAIGN_CORPUS;
  return [
    {
      path: `${AVA_DARK_NET_ROOT}/README.txt`,
      content: [
        darkNetHeader,
        "",
        "FILES",
        "telemetry.txt              Aggregate global product telemetry",
        "campaign/index.txt         Complete authored campaign registry",
        "campaign/current.txt       Today's authoritative state-bound docket",
        "campaign/main/             Main situation records",
        "campaign/domestic/         Every Domestic scene variant",
        "campaign/network/          Every Network scene variant",
        "campaign/opportunities/    Every target-of-opportunity record",
        "quotes/index.txt           Free quotation metadata index",
        "quotes/Q001.txt            Quotation content; reading spends the record",
        "",
        "SEARCH",
        "grep -ir reserves campaign",
        "grep -ir claxton quotes",
        "A one-argument grep searches the current Dark Net directory recursively.",
      ].join("\n"),
    },
    {
      path: `${AVA_DARK_NET_ROOT}/telemetry.txt`,
      content: telemetryText(context),
    },
    {
      path: `${AVA_DARK_NET_ROOT}/campaign/index.txt`,
      content: campaignIndexText(),
    },
    {
      path: `${AVA_DARK_NET_ROOT}/campaign/current.txt`,
      content: currentDocketText(state, fraction),
    },
    ...corpus.main.map((item) => item.file),
    ...corpus.secondary.map((item) => item.file),
    ...corpus.opportunities.map((item) => item.file),
    {
      path: `${AVA_DARK_NET_ROOT}/quotes/index.txt`,
      content: quotationIndexText(context),
    },
    ...APHORISMS.flatMap((quote) => {
      const file = quotationRecord(quote.id, context);
      return file ? [file] : [];
    }),
  ];
};

const helpText = () => {
  const summary = avaDarkNetCampaignCorpusSummary();
  return [
    darkNetHeader,
    "",
    `MOUNTED AT ${AVA_DARK_NET_ROOT}`,
    `${summary.records} CAMPAIGN RECORDS // ${summary.optionPaths} RESPONSE PATHS // ${APHORISMS.length} QUOTATIONS`,
    "",
    "ENDPOINTS",
    "tor                  Enter the Dark Net mount",
    "tor telemetry        Open aggregate global product telemetry",
    "tor campaign         Open the complete campaign registry",
    "tor campaign current Open today's authoritative docket",
    "tor quotes           Open the complete quotation index",
    "tor quote Q103       View one quotation and spend its rotation entry",
    "tor help             This endpoint map",
    "",
    "Once mounted, ls, cd, cat, open, find, and grep operate normally.",
  ].join("\n");
};

export const executeAvaDarkNet = (
  state: GameState,
  fraction: number,
  args: string[],
  context: AvaDarkNetContext = {},
): AvaDarkNetExecution => {
  const [rawEndpoint, rawTarget] = args;
  const endpoint = rawEndpoint?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!endpoint)
    return { text: helpText(), cwd: AVA_DARK_NET_ROOT };
  if (["telemetry", "stats", "signals", "global"].includes(endpoint))
    return {
      text: telemetryText(context),
      cwd: AVA_DARK_NET_ROOT,
    };
  if (["help", "man", "manual", "?"].includes(endpoint))
    return { text: helpText(), cwd: AVA_DARK_NET_ROOT };
  if (
    ["campaign", "campaigns", "mission", "missions", "option", "options", "docket"].includes(
      endpoint,
    )
  ) {
    const current = ["current", "today", "docket"].includes(
      rawTarget?.toLowerCase() ?? "",
    );
    return {
      text: current
        ? currentDocketText(state, fraction)
        : campaignIndexText(),
      cwd: `${AVA_DARK_NET_ROOT}/campaign`,
    };
  }
  if (["quotes", "quotations", "aphorisms", "archive", "index"].includes(endpoint)) {
    const target = quoteIdFrom(rawTarget);
    if (!target)
      return {
        text: quotationIndexText(context),
        cwd: `${AVA_DARK_NET_ROOT}/quotes`,
      };
    const file = quotationRecord(target, context);
    return file
      ? {
          text: file.content,
          cwd: `${AVA_DARK_NET_ROOT}/quotes`,
          aphorismViewIds: [target],
        }
      : {
          text: `QUOTATION RECORD NOT FOUND // ${rawTarget}`,
          cwd: `${AVA_DARK_NET_ROOT}/quotes`,
        };
  }
  if (["quote", "quotation", "aphorism"].includes(endpoint)) {
    const target = quoteIdFrom(rawTarget);
    const file = target ? quotationRecord(target, context) : null;
    return file
      ? {
          text: file.content,
          cwd: `${AVA_DARK_NET_ROOT}/quotes`,
          aphorismViewIds: [target!],
        }
      : {
          text: `QUOTATION RECORD NOT FOUND // ${rawTarget ?? "MISSING ID"}`,
          cwd: `${AVA_DARK_NET_ROOT}/quotes`,
        };
  }
  const directQuote = quoteIdFrom(rawEndpoint);
  if (directQuote) {
    const file = quotationRecord(directQuote, context);
    if (file)
      return {
        text: file.content,
        cwd: `${AVA_DARK_NET_ROOT}/quotes`,
        aphorismViewIds: [directQuote],
      };
  }
  return {
    text: [
      darkNetHeader,
      "",
      `ENDPOINT NOT FOUND // ${rawEndpoint}`,
      "",
      helpText().split("\n").slice(4).join("\n"),
    ].join("\n"),
    cwd: AVA_DARK_NET_ROOT,
  };
};
