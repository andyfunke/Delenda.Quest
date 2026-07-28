import { FAMILIES } from "../game";
import { DIPLOMACY_ACTOR_METADATA } from "./actor-metadata";
import type { CommandOperation } from "./contracts";
import { CHANNELS } from "./contracts";
import {
  HORIZONS,
  OBJECTIVES,
  STRATEGIC_DIMENSIONS,
  STRATEGIC_WEIGHTS,
  TOLERANCE_DIMENSIONS,
  TOLERANCE_LEVELS,
} from "./posture";

export type SemanticIndexEntry = {
  canonicalId: string;
  entityType:
    | "operation"
    | "channel"
    | "actor"
    | "clade"
    | "family"
    | "choice"
    | "mechanic"
    | "metric"
    | "fact"
    | "priority"
    | "tolerance"
    | "timeframe"
    | "scope";
  canonicalLabel: string;
  aliases: string[];
  phrasePatterns: string[];
  validOperations: CommandOperation[];
  visibility: "public" | "player_visible" | "internal";
  contentVersion: string;
};

const CONTENT_VERSION = "semantic-index-v1";

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const OPERATIONS: Array<{
  id: CommandOperation;
  label: string;
  aliases: string[];
  patterns: string[];
}> = [
  { id: "HELP", label: "help", aliases: ["commands"], patterns: ["help", "what can i say"] },
  { id: "BRIEF", label: "brief", aliases: ["daily brief", "campaign brief"], patterns: ["brief me", "daily brief"] },
  { id: "STATUS", label: "status", aliases: ["situation", "campaign status"], patterns: ["status", "campaign status"] },
  { id: "SHOW_DOCKET", label: "show docket", aliases: ["orders", "options"], patterns: ["show orders", "options"] },
  { id: "ADVISE", label: "advise", aliases: ["recommend", "recommendation"], patterns: ["what should i do", "advise"] },
  { id: "COMPARE", label: "compare", aliases: ["versus", "vs"], patterns: ["compare * and *", "* versus *"] },
  { id: "RANK", label: "rank", aliases: [], patterns: ["rank *", "which option is cheapest"] },
  { id: "PREPARE", label: "prepare", aliases: ["execute", "issue", "choose"], patterns: ["prepare *", "choose *"] },
  { id: "CONFIRM", label: "confirm", aliases: ["accept"], patterns: ["confirm *", "yes"] },
  { id: "CANCEL", label: "cancel", aliases: ["no"], patterns: ["cancel *"] },
];

export const buildSemanticIndex = (): SemanticIndexEntry[] => {
  const entries: SemanticIndexEntry[] = [];

  for (const operation of OPERATIONS) {
    entries.push({
      canonicalId: operation.id,
      entityType: "operation",
      canonicalLabel: operation.label,
      aliases: operation.aliases,
      phrasePatterns: operation.patterns,
      validOperations: [operation.id],
      visibility: "player_visible",
      contentVersion: CONTENT_VERSION,
    });
  }

  for (const channel of CHANNELS) {
    entries.push({
      canonicalId: channel,
      entityType: "channel",
      canonicalLabel: channel,
      aliases: channel === "production" ? ["prod", "national"] : channel === "military" ? ["mil"] : channel === "diplomacy" ? ["diplo"] : [],
      phrasePatterns: [`${channel}`, `advise ${channel}`, `rank ${channel}`],
      validOperations: ["SHOW_DOCKET", "ADVISE", "RANK"],
      visibility: "player_visible",
      contentVersion: CONTENT_VERSION,
    });
  }

  for (const actor of DIPLOMACY_ACTOR_METADATA) {
    entries.push({
      canonicalId: actor.actorId,
      entityType: "actor",
      canonicalLabel: actor.name,
      aliases: [actor.actorId, actor.name.split(" ")[0]!.toLowerCase()],
      phrasePatterns: [`diplomacy ${actor.actorId}`, `with ${actor.name.toLowerCase()}`],
      validOperations: ["SHOW_DOCKET", "ADVISE", "RANK"],
      visibility: "player_visible",
      contentVersion: CONTENT_VERSION,
    });
  }

  for (const family of FAMILIES) {
    entries.push({
      canonicalId: family.id,
      entityType: "family",
      canonicalLabel: family.label,
      aliases: [family.id, normalizeKey(family.label)],
      phrasePatterns: [normalizeKey(family.label), family.id],
      validOperations: ["SHOW_DOCKET", "SHOW_CHOICE", "ADVISE"],
      visibility: "player_visible",
      contentVersion: CONTENT_VERSION,
    });
    for (const choice of family.choices) {
      entries.push({
        canonicalId: choice.id,
        entityType: "choice",
        canonicalLabel: choice.label,
        aliases: [choice.id, normalizeKey(choice.label)],
        phrasePatterns: [choice.id, normalizeKey(choice.label), `prepare ${choice.id}`],
        validOperations: ["SHOW_CHOICE", "PREPARE", "COMPARE", "ADVISE", "RANK"],
        visibility: "player_visible",
        contentVersion: CONTENT_VERSION,
      });
      entries.push({
        canonicalId: `mechanic:${choice.id}`,
        entityType: "mechanic",
        canonicalLabel: choice.label,
        aliases: [choice.id],
        phrasePatterns: [choice.id],
        validOperations: ["PREPARE", "SHOW_CHOICE"],
        visibility: "player_visible",
        contentVersion: CONTENT_VERSION,
      });
    }
  }

  for (const dimension of STRATEGIC_DIMENSIONS) {
    entries.push({
      canonicalId: dimension,
      entityType: "priority",
      canonicalLabel: dimension.replaceAll("_", " "),
      aliases: [dimension.replaceAll("_", " ")],
      phrasePatterns: [`prioritize ${dimension.replaceAll("_", " ")}`, `care about ${dimension.replaceAll("_", " ")}`],
      validOperations: ["ADVISE", "RANK"],
      visibility: "player_visible",
      contentVersion: CONTENT_VERSION,
    });
  }
  for (const dimension of TOLERANCE_DIMENSIONS) {
    entries.push({
      canonicalId: dimension,
      entityType: "tolerance",
      canonicalLabel: dimension.replaceAll("_", " "),
      aliases: [dimension.replaceAll("_", " ")],
      phrasePatterns: [`tolerate ${dimension.replaceAll("_", " ")}`, `can accept ${dimension.replaceAll("_", " ")}`],
      validOperations: ["ADVISE"],
      visibility: "player_visible",
      contentVersion: CONTENT_VERSION,
    });
  }
  for (const horizon of HORIZONS) {
    entries.push({
      canonicalId: horizon,
      entityType: "timeframe",
      canonicalLabel: horizon,
      aliases: [horizon],
      phrasePatterns: [`${horizon} term`, `${horizon}-term`],
      validOperations: ["ADVISE", "RANK"],
      visibility: "player_visible",
      contentVersion: CONTENT_VERSION,
    });
  }
  for (const objective of OBJECTIVES) {
    entries.push({
      canonicalId: objective,
      entityType: "scope",
      canonicalLabel: objective.replaceAll("_", " "),
      aliases: [objective.replaceAll("_", " ")],
      phrasePatterns: [objective.replaceAll("_", " ")],
      validOperations: ["ADVISE"],
      visibility: "player_visible",
      contentVersion: CONTENT_VERSION,
    });
  }

  // silence unused enum exports in tree-shaking edge cases
  void STRATEGIC_WEIGHTS;
  void TOLERANCE_LEVELS;

  return entries;
};

export const validateSemanticIndex = (entries = buildSemanticIndex()) => {
  const issues: string[] = [];
  const aliasContext = new Map<string, string>();
  const patternContext = new Map<string, string>();

  for (const entry of entries) {
    if (entry.visibility === "internal") continue;
    for (const alias of [entry.canonicalLabel, ...entry.aliases].map(normalizeKey)) {
      if (!alias) continue;
      const key = `${entry.entityType}:${alias}`;
      const prior = aliasContext.get(key);
      if (prior && prior !== entry.canonicalId) {
        issues.push(`alias collision ${alias} => ${prior} vs ${entry.canonicalId}`);
      }
      aliasContext.set(key, entry.canonicalId);
    }
    for (const pattern of entry.phrasePatterns.map(normalizeKey)) {
      const key = `${entry.entityType}:${pattern}`;
      const prior = patternContext.get(key);
      if (prior && prior !== entry.canonicalId) {
        issues.push(`phrase collision ${pattern} => ${prior} vs ${entry.canonicalId}`);
      }
      patternContext.set(key, entry.canonicalId);
    }
    if (entry.entityType === "choice" && !entry.phrasePatterns.some((pattern) => pattern.includes(entry.canonicalId))) {
      issues.push(`choice ${entry.canonicalId} missing stable command form`);
    }
  }

  const choiceCount = entries.filter((entry) => entry.entityType === "choice").length;
  const familyChoices = FAMILIES.reduce((n, family) => n + family.choices.length, 0);
  if (choiceCount !== familyChoices) {
    issues.push(`index choices ${choiceCount} != catalog ${familyChoices}`);
  }
  return issues;
};
