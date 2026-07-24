const game = await import(process.env.DELENDA_GAME_BUNDLE);
const {
  ADVERSARY_PERSONALITIES,
  FAMILIES,
  STATE_ARCHETYPES,
  THEATERS,
  commit,
  commitManeuver,
  commitOpportunity,
  directiveRejection,
  initialState,
  maneuverOrderRejection,
  maneuversForState,
  opportunityForState,
  regulatedPathwayForState,
  resolve,
} = game;

const runCount = Math.max(
  2,
  Number.parseInt(process.argv[2] ?? process.env.DELENDA_RUNS ?? "1000", 10),
);
const runOffset = Number.parseInt(process.env.DELENDA_OFFSET ?? "0", 10);
const split = Math.floor(runCount / 2);

const makeRng = (seed) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};
const pick = (items, rng) => items[Math.floor(rng() * items.length)];
const treasuryGain = (choice) => Math.max(0, choice.delta?.treasury ?? 0);

const choiceUtility = (state, choice, mode) => {
  const delta = choice.delta ?? {};
  const tick = choice.tick ?? {};
  const gain = (key) => (delta[key] ?? 0) + (tick[key] ?? 0) * 3;
  const treasuryWeight =
    mode === "revenue"
      ? state.treasury < 80
        ? 1.7
        : 1.1
      : state.treasury < 50
        ? 1.1
        : 0.35;
  return (
    gain("treasury") * treasuryWeight +
    gain("readiness") * 1.1 +
    gain("equipment") * 1.15 +
    gain("materiel") * 1.1 +
    gain("legitimacy") * 1.35 +
    gain("intelligence") * 0.75 +
    gain("deployable") / 6000 +
    gain("reserves") / 6000 -
    gain("resistance") * 0.8 -
    gain("dependency") * 0.6 -
    gain("desertionPressure") * 0.9 -
    gain("maintenanceDebt") * 0.75 -
    gain("atrocityExposure") * 0.25
  );
};

const availableDirectives = (state) =>
  FAMILIES.flatMap((family) =>
    family.choices
      .filter((choice) => !directiveRejection(state, family, choice))
      .map((choice) => ({ family, choice })),
  );

const simulate = (index, mode) => {
  const rng = makeRng(0x9e3779b9 ^ Math.imul(index + 1, 2654435761));
  let state = initialState({
    seed: 10_000 + index * 7919,
    archetype: STATE_ARCHETYPES[index % STATE_ARCHETYPES.length].id,
    adversaryPersonality:
      ADVERSARY_PERSONALITIES[
        Math.floor(index / STATE_ARCHETYPES.length) %
          ADVERSARY_PERSONALITIES.length
      ].id,
    theater:
      THEATERS[
        Math.floor(
          index /
            (STATE_ARCHETYPES.length * ADVERSARY_PERSONALITIES.length),
        ) % THEATERS.length
      ].id,
  });
  const openingFront = state.front;
  const fronts = [openingFront];
  const selected = [];
  let fullyActionableDays = 0;
  let advantageSelections = 0;
  let maneuverSelections = 0;
  let revenueSelections = 0;

  while (state.status === "active" && state.day <= 31) {
    const opportunity = opportunityForState(state);
    if (opportunity && rng() < 0.8) {
      const affordable = opportunity.responses.filter(
        (response) =>
          !Object.entries(response.cost ?? {}).some(
            ([resource, amount]) => state.production[resource].stock < amount,
          ),
      );
      if (affordable.length)
        state = commitOpportunity(state, pick(affordable, rng));
    }

    const maneuvers = maneuversForState(state).filter(
      (maneuver) => !maneuverOrderRejection(state, maneuver),
    );
    if (maneuvers.length === 3) fullyActionableDays += 1;
    if (maneuvers.length) {
      const advantage = maneuvers.find(
        (maneuver) =>
          regulatedPathwayForState(state, maneuver) === "advantage",
      );
      const exposed = maneuvers.filter((maneuver) => maneuver !== advantage);
      const maneuver =
        advantage && rng() < (mode === "revenue" ? 0.74 : 0.78)
          ? advantage
          : pick(exposed.length ? exposed : maneuvers, rng);
      if (regulatedPathwayForState(state, maneuver) === "advantage")
        advantageSelections += 1;
      maneuverSelections += 1;
      state = commitManeuver(state, maneuver);
      selected.push(`M:${maneuver.id}`);
    }

    while (state.actions > 0) {
      const available = availableDirectives(state);
      if (!available.length) break;
      const ranked = available
        .map((entry) => ({
          ...entry,
          score:
            choiceUtility(state, entry.choice, mode) +
            (rng() - 0.5) * (mode === "marble" ? 4 : 2),
        }))
        .sort((left, right) => right.score - left.score);
      const selection = ranked[0];
      const next = commit(state, selection.family, selection.choice);
      if (next === state) break;
      if (treasuryGain(selection.choice) > 0) revenueSelections += 1;
      selected.push(`${selection.family.id}:${selection.choice.id}`);
      state = next;
    }

    state = resolve(state);
    fronts.push(state.front);
  }

  const days = state.day - 1;
  const earlyNadir = Math.min(...fronts.slice(0, Math.min(fronts.length, 11)));
  const recovery =
    Math.max(...fronts.slice(fronts.indexOf(earlyNadir))) >= earlyNadir + 0.5;
  const uniqueChoices = new Set(selected).size;
  const decisionCount = selected.length;
  const actionable = fullyActionableDays === days;
  const engaging =
    actionable && decisionCount >= days * 2.5 && uniqueChoices >= 10;
  const terminal = state.status !== "active" && days <= 30;
  const paced = days >= 24 && days <= 30;
  const openingLoss = openingFront < 0;
  const narrativeArc = openingLoss && recovery;
  const stalemateResolution =
    days === 30 && state.front > -12 && state.front < 12;
  return {
    mode,
    status: state.status,
    days,
    finalFront: state.front,
    earlyNadir,
    openingLoss,
    recovery,
    narrativeArc,
    engaging,
    actionable,
    terminal,
    paced,
    goodShuffle: terminal && paced && engaging,
    stalemateResolution,
    uniqueChoices,
    decisionCount,
    advantageRate: maneuverSelections
      ? advantageSelections / maneuverSelections
      : 0,
    revenueSelections,
  };
};

const results = Array.from({ length: runCount }, (_, index) =>
  simulate(index + runOffset, index < split ? "marble" : "revenue"),
);
const summarize = (subset) => {
  const count = subset.length;
  const countBy = (field) => subset.filter((item) => item[field]).length;
  const average = (field) =>
    subset.reduce((sum, item) => sum + item[field], 0) / count;
  return {
    campaigns: count,
    victories: subset.filter((item) => item.status === "victory").length,
    defeats: subset.filter((item) => item.status === "defeat").length,
    active: subset.filter((item) => item.status === "active").length,
    averageDays: average("days"),
    averageFinalFront: average("finalFront"),
    averageEarlyNadir: average("earlyNadir"),
    averageUniqueChoices: average("uniqueChoices"),
    averageDecisions: average("decisionCount"),
    averageAdvantageSelectionRate: average("advantageRate"),
    averageRevenueSelections: average("revenueSelections"),
    terminalCount: countBy("terminal"),
    pacedCount: countBy("paced"),
    engagingCount: countBy("engaging"),
    openingLossCount: countBy("openingLoss"),
    recoveryCount: countBy("recovery"),
    narrativeArcCount: countBy("narrativeArc"),
    goodShuffleCount: countBy("goodShuffle"),
    stalemateResolutionCount: countBy("stalemateResolution"),
    dayRange: [
      Math.min(...subset.map((item) => item.days)),
      Math.max(...subset.map((item) => item.days)),
    ],
  };
};

const marble = summarize(results.slice(0, split));
const revenue = summarize(results.slice(split));
const total = summarize(results);
const quality = {
  goodShuffleRate: total.goodShuffleCount / total.campaigns,
  engagingRate: total.engagingCount / total.campaigns,
  narrativeArcRate: total.narrativeArcCount / total.campaigns,
  averageDays: total.averageDays,
};
quality.passes =
  quality.goodShuffleRate >= 0.95 &&
  quality.engagingRate >= 0.95 &&
  quality.narrativeArcRate >= 0.95 &&
  quality.averageDays >= 28 &&
  quality.averageDays <= 30;

console.log(
  JSON.stringify(
    {
      runCount,
      split: { marble: split, revenue: runCount - split },
      tolerance: 0.95,
      marble,
      revenue,
      total,
      quality,
      failureSamples: results
        .filter((item) => !item.goodShuffle || !item.narrativeArc)
        .slice(0, 12),
    },
    null,
    2,
  ),
);
