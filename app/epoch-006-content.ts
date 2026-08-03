import type { Choice, Family, GameState } from "./game";

export type DepartmentSurface = "production" | "military" | "diplomacy";
export type DepartmentPressure = "LOW" | "GUARDED" | "ELEVATED";

export type DepartmentDispatch = {
  id: string; department: DepartmentSurface; dayBand: number;
  pressure: DepartmentPressure; headline: string; body: string; factKeys: string[];
};
export type IssueScenario = {
  id: string; familyId: string; department: DepartmentSurface;
  situation: string; disclosedFacts: string[];
  choices: Array<{ id: string; label: string; story: string; preview: string[] }>;
  grammarExamples: string[];
};

const dispatches: Record<DepartmentSurface, readonly Omit<DepartmentDispatch, "department">[]> = {
  production: [
    { id:"production-rail-01",dayBand:0,pressure:"LOW",headline:"The rail ledger opens cleanly.",body:"Coal, machine tools, and repair crews can still reach the plants before the next dispatch window. The question is which shortage you are willing to make visible.",factKeys:["rail","coal","repair"] },
    { id:"production-repair-02",dayBand:1,pressure:"GUARDED",headline:"Repair is now a production line.",body:"The queues are machines waiting for bearings, crews waiting for parts, and trains waiting for a slot promised twice.",factKeys:["repair","machine-tools","freight"] },
    { id:"production-fuel-03",dayBand:2,pressure:"ELEVATED",headline:"Fuel decides which factory counts.",body:"The daily allocation can protect throughput, civilian heat, or the transport that joins both. No line receives the full request without another line becoming the example.",factKeys:["fuel","throughput","civilian-heat"] },
  ],
  military: [
    { id:"military-front-01",dayBand:0,pressure:"GUARDED",headline:"The frontage is holding by accounting.",body:"Readiness, reserves, and equipment coverage describe what can be sustained before movement becomes a bill. The docket is a choice between tempo and depth.",factKeys:["frontage","readiness","reserves"] },
    { id:"military-reserve-02",dayBand:1,pressure:"ELEVATED",headline:"Reserve depth is today's maneuver.",body:"A formation can move because it is ready, or remain ready because it does not move. The distinction is visible in replacement and repair queues.",factKeys:["reserves","replacement","repair"] },
    { id:"military-weather-03",dayBand:2,pressure:"LOW",headline:"The weather grants a narrow window.",body:"The window is not permission. It is a disclosed opportunity whose cost appears in materiel, readiness, and the distance to the next serviceable depot.",factKeys:["weather","materiel","depot"] },
  ],
  diplomacy: [
    { id:"diplomacy-posture-01",dayBand:0,pressure:"GUARDED",headline:"Posture arrives before promise.",body:"Visible actors have not changed positions for free. Trust, leverage, obligation, and dependency sit beneath every diplomatic option.",factKeys:["posture","trust","leverage"] },
    { id:"diplomacy-envoy-02",dayBand:1,pressure:"ELEVATED",headline:"The envoys are counting concessions.",body:"A guarantee can open a route and close a future. The docket exposes the exchange rate before the state commits another order.",factKeys:["envoys","guarantees","autonomy"] },
    { id:"diplomacy-transit-03",dayBand:2,pressure:"LOW",headline:"Transit is a relationship with a timetable.",body:"Ports, rail corridors, and intelligence exchanges create movement only when the actor accepts the dependency they imply.",factKeys:["transit","dependency","intelligence"] },
  ],
};

const familyStory = (department: DepartmentSurface, family: Family) =>
  department === "production"
    ? `The ${family.label.toLowerCase()} desk has turned a material question into a timetable. ${family.brief}`
    : department === "military"
      ? `The ${family.label.toLowerCase()} desk has turned a force question into a frontage decision. ${family.brief}`
      : `The ${family.label.toLowerCase()} desk has turned a relationship question into a disclosed exchange. ${family.brief}`;

export const departmentDispatchFor = (state: Pick<GameState, "day">, department: DepartmentSurface): DepartmentDispatch => {
  const rows = dispatches[department];
  return { ...rows[state.day % rows.length], department };
};

export const scenarioForFamily = (family: Family, department: DepartmentSurface): IssueScenario => ({
  id: `epoch006:${department}:${family.id}`, familyId: family.id, department,
  situation: familyStory(department, family),
  disclosedFacts: [family.brief, `Family cooldown: ${family.lock} days`, `Visible choices: ${family.choices.length}`],
  choices: family.choices.map((choice: Choice) => ({
    id: choice.id, label: choice.label,
    story: `${choice.flavor} This is a preparation surface; the ledger changes only after the existing confirmation path accepts it.`,
    preview: choice.exact,
  })),
  grammarExamples: [`list ${department}`, `advise ${department}`, `compare ${department}`, `show ${family.id}`],
});

export const validateEpoch006Scenario = (scenario: IssueScenario, family: Family) => {
  if (scenario.familyId !== family.id) throw new Error(`epoch006 family mismatch: ${scenario.id}`);
  if (scenario.choices.length !== family.choices.length) throw new Error(`epoch006 choice drift: ${scenario.id}`);
  for (const choice of scenario.choices)
    if (!family.choices.some((candidate) => candidate.id === choice.id))
      throw new Error(`epoch006 unknown choice: ${scenario.id}/${choice.id}`);
  return scenario;
};
