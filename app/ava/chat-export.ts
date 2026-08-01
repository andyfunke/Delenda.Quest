export type AvaChatExportEntry = {
  who: "AVA" | "YOU";
  text: string;
  messageId?: string;
  timestamp?: string;
  campaignDay?: number;
  stateRevision?: string;
  surface?: "web" | "ssh" | "mcp" | "cli" | "internal";
  activeModule?: string;
  canonicalOperation?: string;
  responseStatus?: string;
  handles?: readonly string[];
  operatorFamilies?: readonly string[];
  proofDigest?: string;
  contentClass?: "player-input" | "canonical-output" | "narrative-realization";
};

export type AvaChatExportInput = {
  campaignId: string;
  day: number;
  exportedAt: Date;
  entries: readonly AvaChatExportEntry[];
};

const normalizeTranscriptText = (text: string) =>
  text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trimEnd();

export const serializeAvaChatLog = ({
  campaignId,
  day,
  exportedAt,
  entries,
}: AvaChatExportInput) =>
  [
    "DELENDA.QUEST // AVA CHAT LOG",
    "# Delenda Quest Ava Transcript",
    `CAMPAIGN: ${campaignId}`,
    `DAY: ${day}`,
    `EXPORTED: ${exportedAt.toISOString()}`,
    "SCOPE: CURRENT LOCAL AVA SESSION",
    "",
    ...entries.flatMap((entry, index) => [
      `${String(index + 1).padStart(3, "0")} // ${entry.who}`,
      ...(entry.timestamp ? [`TIMESTAMP: ${entry.timestamp}`] : []),
      ...(entry.messageId ? [`MESSAGE ID: ${entry.messageId}`] : []),
      ...(entry.campaignDay ? [`CAMPAIGN DAY: ${entry.campaignDay}`] : []),
      ...(entry.stateRevision ? [`STATE REVISION: ${entry.stateRevision}`] : []),
      ...(entry.surface ? [`SURFACE: ${entry.surface}`] : []),
      ...(entry.activeModule ? [`ACTIVE MODULE: ${entry.activeModule}`] : []),
      ...(entry.canonicalOperation ? [`CANONICAL OPERATION: ${entry.canonicalOperation}`] : []),
      ...(entry.responseStatus ? [`RESPONSE STATUS: ${entry.responseStatus}`] : []),
      ...(entry.handles?.length ? [`HANDLES: ${entry.handles.join(", ")}`] : []),
      ...(entry.operatorFamilies?.length ? [`COGNITIVE OPERATORS: ${entry.operatorFamilies.join(", ")}`] : []),
      ...(entry.proofDigest ? [`PROOF RECEIPT: ${entry.proofDigest}`] : []),
      ...(entry.contentClass ? [`CONTENT CLASS: ${entry.contentClass}`] : []),
      normalizeTranscriptText(entry.text),
      "",
    ]),
  ].join("\n");
