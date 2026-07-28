import type { Family, GameState } from "../game";
import { moduleToChannel } from "./contracts";
import {
  compileDailyDocket,
  docketFactFromRecord,
  getStoredDocket,
} from "./docket";
import type { Channel } from "./gates";
import { familyById } from "./content-adapters";

export const visibleDirectiveView = (
  state: GameState,
  module: "national" | "military" | "diplomacy",
  actorId?: string,
) => {
  const channel = moduleToChannel(module) as Channel;
  const actor = module === "diplomacy" ? actorId : undefined;
  const existing = getStoredDocket(state, channel, actor);
  const record = existing ?? compileDailyDocket(state, channel, actor).record;
  const fact = docketFactFromRecord(state, record);
  const families = record.selectedFamilyIds
    .map((id) => familyById(id))
    .filter((family): family is Family => Boolean(family));
  const choiceIds = new Set(record.selectedChoiceIds);
  const familiesWithVisibleChoices = families.map((family) => ({
    ...family,
    choices: family.choices.filter((choice) => choiceIds.has(choice.id)),
  }));
  return {
    channel,
    record,
    fact,
    families: familiesWithVisibleChoices,
    choiceIds,
  };
};
