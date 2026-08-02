import {
  CONTENT_PACK_VERSION,
  operationalObjectiveForProblemClass,
  operationalTargetForProblemClass,
} from "../campaign-substrate";
import { situationForState, type GameState } from "../game";
import { projectAvaDisclosedState } from "./projection";
import { avaVisibleWorldRevision } from "./world-model";
import {
  sealAvaContextualLanguage,
  normalizeAvaLanguageInput,
  type AvaLanguageEntry,
  type AvaNarrativeSection,
} from "./contextual-language";
import { AVA_CONTEXTUAL_CATALOG } from "./contextual-language-catalog";
import {
  indexAvaAuthoredBriefing,
  type AvaAuthoredBriefingSource,
} from "./contextual-language-references";
import type { AvaEntity } from "./schema";

const sectionText = (
  section: AvaNarrativeSection,
  text: string | undefined,
): AvaAuthoredBriefingSource | null =>
  text?.trim() ? { section, text } : null;

const dynamicSituationEntries = (
  state: GameState,
  entities: readonly AvaEntity[],
): AvaLanguageEntry[] => {
  const situation = situationForState(state);
  const staticAliases = new Set(
    AVA_CONTEXTUAL_CATALOG.flatMap((entry) =>
      entry.aliases.map(normalizeAvaLanguageInput),
    ),
  );
  const entries: AvaLanguageEntry[] = [];
  const add = (entry: AvaLanguageEntry) => {
    const aliases = entry.aliases.filter(
      (alias) => !staticAliases.has(normalizeAvaLanguageInput(alias)),
    );
    if (aliases.length) entries.push({ ...entry, aliases });
  };
  const synopsis = entities.find((entity) => entity.id === "campaign-synopsis");
  if (synopsis) {
    add({
      id: "current.situation",
      route: "OBJECTIVE_EXPLANATION",
      label: `${situation.sector} operational problem`,
      aliases: [situation.sector, `${situation.sector} objective`],
      source: "CURRENT_SITUATION",
      entityId: synopsis.id,
      facet: "meaning",
    });
  }
  for (const [maneuverId, presentation] of Object.entries(
    situation.maneuverPresentations,
  )) {
    const normalized = normalizeAvaLanguageInput(presentation.label);
    if (!normalized || staticAliases.has(normalized)) continue;
    add({
      id: `current-action.${maneuverId}`,
      route: "NARRATIVE_REFERENCE",
      label: presentation.label,
      aliases: [presentation.label],
      source: "CURRENT_ACTION",
      entityId: synopsis?.id,
      facet: "meaning",
      evidence: [
        {
          section: "maneuver-label",
          phrase: presentation.label,
          excerpt: `${presentation.label} — ${presentation.rationale}`.slice(
            0,
            280,
          ),
        },
      ],
    });
  }
  return entries;
};

export const buildAvaContextualLanguage = (
  state: GameState,
  entities: readonly AvaEntity[],
) => {
  const disclosed = projectAvaDisclosedState(state);
  const situation = situationForState(disclosed);
  const sources = [
    sectionText("headline", situation.headline),
    sectionText("briefing", situation.briefing),
    sectionText("question", situation.question),
    sectionText("standing-order", situation.standingOrder),
    ...Object.values(situation.maneuverPresentations).flatMap((presentation) => [
      sectionText("maneuver-label", presentation.label),
      sectionText("maneuver-rationale", presentation.rationale),
    ]),
  ].filter((source): source is AvaAuthoredBriefingSource => !!source);
  const dynamic = dynamicSituationEntries(disclosed, entities);
  const authored = indexAvaAuthoredBriefing(sources, [
    ...AVA_CONTEXTUAL_CATALOG,
    ...dynamic,
  ]);
  const entries = [
    ...AVA_CONTEXTUAL_CATALOG,
    ...dynamic,
    ...authored,
  ];
  return sealAvaContextualLanguage({
    stateRevision: avaVisibleWorldRevision(disclosed),
    contentRevision: CONTENT_PACK_VERSION,
    entries,
  });
};

export const contextualObjectiveProjection = (state: GameState) => {
  const disclosed = projectAvaDisclosedState(state);
  const situation = situationForState(disclosed);
  return {
    stateRevision: avaVisibleWorldRevision(disclosed),
    contentRevision: situation.contentPackVersion,
    objective: operationalObjectiveForProblemClass(situation.problemClass),
    target: operationalTargetForProblemClass(situation.problemClass),
    sector: situation.sector,
    question: situation.question,
    standingOrder: situation.standingOrder,
    visibleManeuvers: Object.values(situation.maneuverPresentations).map(
      (presentation) => ({
        label: presentation.label,
        rationale: presentation.rationale,
      }),
    ),
  };
};
