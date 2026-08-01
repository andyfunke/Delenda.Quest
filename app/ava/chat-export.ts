export type AvaChatExportEntry = {
  who: "AVA" | "YOU";
  text: string;
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
    `CAMPAIGN: ${campaignId}`,
    `DAY: ${day}`,
    `EXPORTED: ${exportedAt.toISOString()}`,
    "SCOPE: CURRENT LOCAL AVA SESSION",
    "",
    ...entries.flatMap((entry, index) => [
      `${String(index + 1).padStart(3, "0")} // ${entry.who}`,
      normalizeTranscriptText(entry.text),
      "",
    ]),
  ].join("\n");
