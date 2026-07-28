import { FAMILIES, type Choice, type Family } from "../game";
import { actorMetadataById } from "./actor-metadata";
import {
  CONTENT_VERSION,
  moduleToChannel,
  type SubstrateNode,
} from "./contracts";
import type { Channel, SubstrateGate } from "./gates";
import { cladeIdForCategory } from "./clades";

const choiceNode = (
  family: Family,
  choice: Choice,
  channel: Channel,
  cladeId: string,
): SubstrateNode => ({
  id: choice.id,
  contentVersion: CONTENT_VERSION,
  channel,
  kind: "choice",
  parentId: family.id,
  mechanicId: choice.id,
  label: choice.label,
  brief: choice.flavor,
  category: family.category,
  gates: [{ op: "always" }],
  exact: choice.exact,
  risk: choice.risk,
  authoredVariants: [
    {
      id: `${choice.id}:default`,
      register: "directive",
      title: choice.label,
      brief: choice.flavor,
      claimIds: [`choice:${choice.id}`],
    },
  ],
  exhaustion: { scope: "campaign", repeat: "never_until_exhausted" },
});

const familyNode = (family: Family, channel: Channel, cladeId: string): SubstrateNode => ({
  id: family.id,
  contentVersion: CONTENT_VERSION,
  channel,
  kind: "family",
  parentId: cladeId,
  label: family.label,
  brief: family.brief,
  category: family.category,
  gates: [{ op: "always" }],
  lockDays: family.lock,
  rotation: {
    cadence: "daily",
    cooldownDays: 2,
    persistAfterPresentation: true,
  },
  selection: { slots: 1, minChoices: 2, maxChoices: 3 },
  children: family.choices.map((choice) => choiceNode(family, choice, channel, cladeId)),
});

export const directiveFamilies = (): Family[] => FAMILIES;

export const inventoryCounts = () => {
  const families = directiveFamilies();
  const byChannel: Record<string, number> = {};
  let choices = 0;
  for (const family of families) {
    const channel = moduleToChannel(family.module);
    byChannel[channel] = (byChannel[channel] ?? 0) + 1;
    choices += family.choices.length;
  }
  return {
    familyCount: families.length,
    choiceCount: choices,
    byChannel,
  };
};

export const buildDirectiveForest = (): SubstrateNode[] => {
  const families = directiveFamilies();
  const clades = new Map<string, SubstrateNode>();

  for (const family of families) {
    const channel = moduleToChannel(family.module);
    if (channel !== "production" && channel !== "military" && channel !== "diplomacy") {
      continue;
    }
    const cladeId = cladeIdForCategory(channel, family.category);
    let clade = clades.get(cladeId);
    if (!clade) {
      clade = {
        id: cladeId,
        contentVersion: CONTENT_VERSION,
        channel,
        kind: "clade",
        label: family.category,
        category: family.category,
        gates: [{ op: "always" }],
        rotation: {
          cadence: "daily",
          cooldownDays: channel === "diplomacy" ? 3 : 2,
          persistAfterPresentation: true,
        },
        selection: {
          slots: 1,
          minChoices: 2,
          maxChoices: 3,
          diversityBy: "family",
        },
        children: [],
      };
      clades.set(cladeId, clade);
    }
    clade.children = clade.children ?? [];
    clade.children.push(familyNode(family, channel, cladeId));
  }

  return [...clades.values()].sort((a, b) => a.id.localeCompare(b.id));
};

export const familyById = (familyId: string) =>
  directiveFamilies().find((family) => family.id === familyId);

export const choiceById = (choiceId: string) => {
  for (const family of directiveFamilies()) {
    const choice = family.choices.find((item) => item.id === choiceId);
    if (choice) return { family, choice };
  }
  return null;
};

export const gatesForActorFamily = (
  actorId: string,
  familyId: string,
): SubstrateGate[] => {
  const meta = actorMetadataById[actorId];
  if (!meta) return [{ op: "none", gates: [] }];
  if (!meta.allowedFamilyIds.includes(familyId)) {
    return [{ op: "none", gates: [] }];
  }
  return [{ op: "actor", values: [actorId] }];
};

export const validateDirectiveForest = (forest = buildDirectiveForest()) => {
  const issues: string[] = [];
  const choiceIds = new Set<string>();
  const inventory = inventoryCounts();
  let seenChoices = 0;
  for (const clade of forest) {
    if (!clade.children?.length) issues.push(`empty clade ${clade.id}`);
    for (const family of clade.children ?? []) {
      const choices = family.children ?? [];
      if (choices.length < 2) issues.push(`family ${family.id} has fewer than two choices`);
      for (const choice of choices) {
        seenChoices += 1;
        if (choiceIds.has(choice.id)) issues.push(`duplicate choice ${choice.id}`);
        choiceIds.add(choice.id);
      }
    }
  }
  if (seenChoices !== inventory.choiceCount) {
    issues.push(
      `adapter choice count ${seenChoices} != inventory ${inventory.choiceCount}`,
    );
  }
  for (const actor of Object.values(actorMetadataById)) {
    const reachable = actor.allowedFamilyIds.filter((id) => familyById(id));
    if (!reachable.length) issues.push(`actor ${actor.actorId} has no valid tree`);
  }
  return issues;
};
