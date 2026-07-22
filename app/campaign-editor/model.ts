export type CampaignAccess = "private" | "friends";

export type CampaignEntry = {
  id: string;
  spineId: string;
  title: string;
  trigger: string;
  flavor: string;
  ruleData: string;
  ownedEffects: string;
  contingentEffects: string;
};

export type QuoteRecord = {
  id: string;
  text: string;
  attribution: string;
  tags: string;
};

export type SourceDocument = {
  name: string;
  type: string;
  addedAt: string;
};

export type CampaignPack = {
  format: "delenda.quest.campaign.v1";
  id: string;
  title: string;
  description: string;
  access: CampaignAccess;
  createdAt: string;
  updatedAt: string;
  entries: CampaignEntry[];
  quoteCanon: QuoteRecord[];
  sourceDocuments: SourceDocument[];
};

export type Spine = {
  id: string;
  label: string;
  contract: string;
  accepts: string;
  schema: string;
};

export const IMMUTABLE_SPINES: readonly Spine[] = [
  { id: "campaign-identity", label: "Campaign Identity", contract: "Names and describes the authored war without changing engine authority.", accepts: "Title, premise, setting, factions, and reader-facing orientation.", schema: '{"slug":"string","factions":["string"],"contentVersion":1}' },
  { id: "opening-state", label: "Opening State", contract: "Populates the fixed opening-state fields consumed by the simulation.", accepts: "State archetypes, opening balances, liabilities, theater context, and explanatory flavor.", schema: '{"archetypeId":"industrial-republic","adversaryPersonality":"adaptive","theater":"lowland","state":{"metric":0},"production":{"munitions":{"allocation":34,"stock":152000,"output":18400,"use":21000}}}' },
  { id: "daily-prompts", label: "Daily Prompt Corpus", contract: "Supplies authored prompt records to the deterministic daily selector.", accepts: "Prompt titles, gates, choices, owned effects, contingent effects, and flavor.", schema: '{"blueprintId":"string","required":[],"forbidden":[],"maneuverIds":[],"standingOrder":"string"}' },
  { id: "production", label: "Production", contract: "Uses the existing production circuit and resource vocabulary.", accepts: "Industrial directives, costs, rotations, thresholds, and explanatory text.", schema: '{"familyId":"string","choiceId":"string","lockDays":0,"target":"metric","delta":0,"tick":0,"delay":0}' },
  { id: "military", label: "Military", contract: "Uses the existing force-generation, sustainment, and operations circuits.", accepts: "Military directives, maneuvers, exact commitments, and bounded outcomes.", schema: '{"kind":"directive|maneuver","id":"string","commitment":0,"success":0,"casualty":0,"supply":0,"successPressure":0,"failurePressure":0,"delta":{}}' },
  { id: "diplomacy", label: "Diplomacy", contract: "Uses the existing actor, obligation, trust, leverage, dependency, and duration model.", accepts: "Actors, diplomatic actions, durations, exact effects, risks, and reports.", schema: '{"kind":"actor|action","id":"string","familyId":"string","actorId":"string","durationDays":0,"lockDays":0,"delta":{}}' },
  { id: "doctrine", label: "Doctrine", contract: "Preserves the verified-win learning path and immutable stage relationships.", accepts: "Doctrine names, descriptions, quotes, flavor, and compatible effects.", schema: '{"vectorId":"string","stageId":"string","cost":0,"prerequisite":{},"effect":{}}' },
  { id: "resolution", label: "Resolution", contract: "Preserves engine order and authoritative arithmetic.", accepts: "Outcome labels, reports, consequence flavor, and transparent explanations.", schema: '{"outcomeId":"string","marginMin":0,"marginMax":0,"modifiers":[],"aftermathFacts":[]}' },
  { id: "wiki", label: "Wiki and Calculus", contract: "Requires every player-facing metric to retain a definition and control path.", accepts: "Concept definitions, normal bands, consequences, relationships, and citations.", schema: '{"conceptId":"string","normal":"string","consequence":"string","control":"string","related":[]}' },
] as const;

const id = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `dq-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createCampaignPack = (): CampaignPack => {
  const now = new Date().toISOString();
  return {
    format: "delenda.quest.campaign.v1",
    id: id(),
    title: "Untitled Campaign",
    description: "",
    access: "private",
    createdAt: now,
    updatedAt: now,
    entries: [],
    quoteCanon: [],
    sourceDocuments: [],
  };
};

export const createEntry = (spineId: string): CampaignEntry => ({
  id: id(),
  spineId,
  title: "Untitled record",
  trigger: "",
  flavor: "",
  ruleData: "{}",
  ownedEffects: "",
  contingentEffects: "",
});

export const createQuote = (): QuoteRecord => ({
  id: id(),
  text: "",
  attribution: "",
  tags: "",
});

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function toPortableCsv(pack: CampaignPack) {
  const header = ["record_type", "spine_id", "record_id", "title", "trigger", "flavor", "owned_effects", "contingent_effects", "rule_data", "attribution", "tags", "contract"];
  const rows = [
    ["campaign", "", pack.id, pack.title, pack.access, pack.description, pack.format, pack.updatedAt, "{}", "", "", "IMMUTABLE SPINES // EDIT RECORDS, NOT SPINE CONTRACTS"],
    ...IMMUTABLE_SPINES.map((spine) => ["spine", spine.id, spine.id, spine.label, "LOCKED", spine.accepts, "", "", spine.schema, "", "", spine.contract]),
    ...pack.entries.map((entry) => ["entry", entry.spineId, entry.id, entry.title, entry.trigger, entry.flavor, entry.ownedEffects, entry.contingentEffects, entry.ruleData, "", "", ""]),
    ...pack.quoteCanon.map((quote) => ["quote", "quote-canon", quote.id, "", "", quote.text, "", "", "{}", quote.attribution, quote.tags, "PERSISTS ACROSS CAMPAIGN RUNS"]),
  ];
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function fromPortableCsv(text: string): CampaignPack {
  const rows = parseCsv(text);
  const header = rows[0] ?? [];
  const position = Object.fromEntries(header.map((name, index) => [name.trim(), index]));
  if (position.record_type === undefined) throw new Error("Campaign CSV is missing record_type.");
  const value = (row: string[], field: string) => row[position[field]] ?? "";
  const campaignRow = rows.slice(1).find((row) => value(row, "record_type") === "campaign");
  const pack = createCampaignPack();
  if (campaignRow) {
    pack.id = value(campaignRow, "record_id") || pack.id;
    pack.title = value(campaignRow, "title") || pack.title;
    pack.description = value(campaignRow, "flavor");
    pack.access = value(campaignRow, "trigger") === "friends" ? "friends" : "private";
  }
  const validSpines = new Set(IMMUTABLE_SPINES.map((spine) => spine.id));
  pack.entries = rows.slice(1).filter((row) => value(row, "record_type") === "entry" && validSpines.has(value(row, "spine_id"))).map((row) => ({
    id: value(row, "record_id") || id(),
    spineId: value(row, "spine_id"),
    title: value(row, "title") || "Untitled record",
    trigger: value(row, "trigger"),
    flavor: value(row, "flavor"),
    ruleData: value(row, "rule_data") || "{}",
    ownedEffects: value(row, "owned_effects"),
    contingentEffects: value(row, "contingent_effects"),
  }));
  pack.quoteCanon = rows.slice(1).filter((row) => value(row, "record_type") === "quote").map((row) => ({
    id: value(row, "record_id") || id(),
    text: value(row, "flavor"),
    attribution: value(row, "attribution"),
    tags: value(row, "tags"),
  }));
  pack.updatedAt = new Date().toISOString();
  return pack;
}

export function normalizeCampaignPack(value: unknown): CampaignPack {
  if (!value || typeof value !== "object") throw new Error("Campaign file does not contain an object.");
  const candidate = value as Partial<CampaignPack>;
  if (candidate.format !== "delenda.quest.campaign.v1") throw new Error("Unsupported campaign format.");
  const base = createCampaignPack();
  const validSpines = new Set(IMMUTABLE_SPINES.map((spine) => spine.id));
  return {
    ...base,
    ...candidate,
    access: candidate.access === "friends" ? "friends" : "private",
    entries: Array.isArray(candidate.entries) ? candidate.entries
      .filter((entry) => entry && validSpines.has(entry.spineId))
      .map((entry) => ({ ...entry, ruleData: entry.ruleData || "{}" })) : [],
    quoteCanon: Array.isArray(candidate.quoteCanon) ? candidate.quoteCanon : [],
    sourceDocuments: Array.isArray(candidate.sourceDocuments) ? candidate.sourceDocuments : [],
    updatedAt: new Date().toISOString(),
  };
}

export function validationIssues(pack: CampaignPack) {
  const issues: string[] = [];
  if (!pack.title.trim() || pack.title === "Untitled Campaign") issues.push("Name the campaign.");
  if (!pack.description.trim()) issues.push("Add a campaign premise.");
  const populated = new Set(pack.entries.map((entry) => entry.spineId));
  IMMUTABLE_SPINES.forEach((spine) => {
    if (!populated.has(spine.id)) issues.push(`${spine.label} has no flavor records.`);
  });
  pack.entries.forEach((entry) => {
    if (!entry.title.trim()) issues.push(`A ${entry.spineId} record is missing its title.`);
    if (!entry.flavor.trim()) issues.push(`${entry.title || "Untitled record"} is missing flavor text.`);
    try {
      const ruleData = JSON.parse(entry.ruleData || "{}");
      if (!ruleData || typeof ruleData !== "object" || Array.isArray(ruleData)) {
        issues.push(`${entry.title || "Untitled record"} rule data must be a JSON object.`);
      }
    } catch {
      issues.push(`${entry.title || "Untitled record"} contains invalid rule data JSON.`);
    }
  });
  return issues;
}

export function llmPopulationBrief(pack: CampaignPack) {
  return `DELENDA.QUEST CAMPAIGN POPULATION INSTRUCTION SET\n\nCAMPAIGN: ${pack.title}\nPREMISE: ${pack.description || "[POPULATE]"}\n\nNON-NEGOTIABLE CONTRACT\n1. Preserve every immutable spine ID exactly.\n2. Do not add a new resolution layer or move authority from deterministic rules into narrative text.\n3. Narrative strings never execute. Put machine-readable parameters in rule_data as valid JSON matching that spine's schema.\n4. Owned effects must be exact. Contingent effects must be bounded.\n5. Return UTF-8 CSV using this header exactly:\nrecord_type,spine_id,record_id,title,trigger,flavor,owned_effects,contingent_effects,rule_data,attribution,tags,contract\n6. Preserve Quote Canon records unless explicitly instructed to rewrite them. Quote Canon persists across campaign runs and is not seed-bound.\n\nIMMUTABLE SPINES\n${IMMUTABLE_SPINES.map((spine) => `${spine.id} // ${spine.label}\nCONTRACT: ${spine.contract}\nPOPULATE: ${spine.accepts}\nRULE_DATA SCHEMA: ${spine.schema}`).join("\n\n")}\n\nCURRENT CSV\n${toPortableCsv(pack)}`;
}
