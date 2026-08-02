import {
  CONTENT_PACK_VERSION,
  operationalObjectiveForProblemClass,
  operationalTargetForProblemClass,
} from "../campaign-substrate";
import { maneuverById, situationForState, type GameState } from "../game";
import { projectAvaDisclosedState } from "./projection";
import { avaVisibleWorldRevision } from "./world-model";
import {
  sealAvaContextualLanguage,
  normalizeAvaLanguageInput,
  type AvaAuthoredManeuverEvidence,
  type AvaLanguageEntry,
  type AvaLanguageEvidence,
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
  sourcePath: string,
  sourceOrder: number,
): AvaAuthoredBriefingSource | null =>
  text?.trim()
    ? {
        section,
        text,
        sourcePath,
        sourceOrder,
        provenance: [sourcePath],
      }
    : null;

const evidence = (
  section: AvaLanguageEvidence["section"],
  phrase: string | undefined,
  sourcePath: string,
  sourceOrder: number,
): AvaLanguageEvidence | undefined =>
  phrase?.trim()
    ? {
        section,
        phrase,
        excerpt: phrase,
        sourcePath,
        sourceOrder,
      }
    : undefined;

/**
 * Project only the disclosed maneuver docket. The returned record deliberately
 * has no action handler, resolution ticket, outcome, risk, cost, seed, or
 * private calculus field.
 */
export const projectAvaAuthoredManeuverEvidence = (
  state: GameState,
): AvaAuthoredManeuverEvidence[] => {
  const disclosed = projectAvaDisclosedState(state);
  const situation =
    disclosed.currentSituation?.day === disclosed.day &&
    disclosed.currentSituation.contentPackVersion === CONTENT_PACK_VERSION &&
    disclosed.currentSituation.maneuverPresentations
      ? disclosed.currentSituation
      : null;
  if (!situation) return [];

  return situation.maneuvers.flatMap((maneuverId, index) => {
    const presentation = situation.maneuverPresentations[maneuverId];
    const owner = maneuverById(maneuverId);
    const label = owner?.label ?? presentation?.label;
    if (!label) return [];

    const labelPath = owner
      ? `app/game.ts::MANEUVERS[${maneuverId}].label`
      : `currentSituation.maneuverPresentations.${maneuverId}.label`;
    const presentationPath = `currentSituation.maneuverPresentations.${maneuverId}.label`;
    const rationalePath = `currentSituation.maneuverPresentations.${maneuverId}.rationale`;
    const labelEvidence = evidence(
      "maneuver-label",
      label,
      labelPath,
      index * 3,
    );
    const rationaleEvidence = evidence(
      "maneuver-rationale",
      presentation?.rationale,
      rationalePath,
      index * 3 + 2,
    );
    const presentationEvidence = evidence(
      "maneuver-presentation",
      presentation?.label,
      presentationPath,
      index * 3 + 1,
    );
    return [
      {
        maneuverId,
        label,
        labelEvidence,
        rationaleEvidence,
        presentationEvidence,
        provenance: [
          ...(labelEvidence?.sourcePath ? [labelEvidence.sourcePath] : []),
          ...(presentationEvidence?.sourcePath
            ? [presentationEvidence.sourcePath]
            : []),
          ...(rationaleEvidence?.sourcePath
            ? [rationaleEvidence.sourcePath]
            : []),
        ],
      },
    ];
  });
};

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
  return entries;
};

export const buildAvaContextualLanguage = (
  state: GameState,
  entities: readonly AvaEntity[],
) => {
  const disclosed = projectAvaDisclosedState(state);
  const situation =
    disclosed.currentSituation?.day === disclosed.day &&
    disclosed.currentSituation.contentPackVersion === CONTENT_PACK_VERSION &&
    disclosed.currentSituation.maneuverPresentations
      ? disclosed.currentSituation
      : null;
  const maneuverEvidence = projectAvaAuthoredManeuverEvidence(disclosed);
  const sources = situation
    ? [
        sectionText(
          "headline",
          situation.headline,
          "currentSituation.headline",
          0,
        ),
        sectionText(
          "briefing",
          situation.briefing,
          "currentSituation.briefing",
          1,
        ),
        sectionText(
          "question",
          situation.question,
          "currentSituation.question",
          2,
        ),
        sectionText(
          "standing-order",
          situation.standingOrder,
          "currentSituation.standingOrder",
          3,
        ),
        ...maneuverEvidence.flatMap((record, index) =>
          [
            record.labelEvidence,
            record.presentationEvidence,
            record.rationaleEvidence,
          ].flatMap((item) =>
            item
              ? [
                  {
                    section: item.section,
                    text: item.phrase,
                    sourcePath: item.sourcePath,
                    sourceOrder: item.sourceOrder ?? 4 + index,
                    maneuverId: record.maneuverId,
                    evidenceKind:
                      item.section === "maneuver-label"
                        ? ("maneuver-label" as const)
                        : item.section === "maneuver-rationale"
                          ? ("maneuver-rationale" as const)
                          : ("maneuver-presentation" as const),
                    maneuverLabel: record.label,
                    provenance: record.provenance,
                    exactTypedLabel:
                      item.section !== "maneuver-rationale",
                  },
                ]
              : [],
          ),
        ),
      ].filter((source): source is AvaAuthoredBriefingSource => !!source)
    : [];
  const dynamic = situation
    ? dynamicSituationEntries(disclosed, entities)
    : [];
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
