import {
  DOCTRINES,
  FAMILIES,
  liveProjection,
  projectDiplomacy,
  projectForceGeneration,
  projectProduction,
  type GameState,
} from "../game";
import {
  campaignScoreForState,
  campaignScoreInputForState,
} from "../campaign-score-state";
import { buildAvaReport } from "./reports";
import { evaluateAvaCampaignChoices } from "./advisory";
import { projectAvaEnvelope } from "./projection";
import type { AvaReportTopic } from "./schema";

type WorkbookTopic = AvaReportTopic | "command-dashboard";
type Cell =
  | { kind: "text"; value: string; style?: number }
  | { kind: "number"; value: number; style?: number }
  | { kind: "formula"; formula: string; value: number; style?: number };
type Sheet = { name: string; widths: number[]; rows: Cell[][] };

const text = (value: unknown, style = 0): Cell => ({
  kind: "text",
  value: String(value ?? ""),
  style,
});
const number = (value: number, style = 2): Cell => ({
  kind: "number",
  value: Number.isFinite(value) ? value : 0,
  style,
});
const formula = (
  expression: string,
  value: number,
  style = 2,
): Cell => ({
  kind: "formula",
  formula: expression.replace(/^=/, ""),
  value: Number.isFinite(value) ? value : 0,
  style,
});

const xmlEscape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const columnName = (index: number) => {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
};

const worksheetXml = (sheet: Sheet) => {
  const rows = sheet.rows
    .map(
      (cells, rowIndex) =>
        `<row r="${rowIndex + 1}">${cells
          .map((cell, columnIndex) => {
            const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
            const style = cell.style ?? 0;
            if (cell.kind === "text")
              return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(cell.value)}</t></is></c>`;
            if (cell.kind === "formula")
              return `<c r="${reference}" s="${style}"><f>${xmlEscape(cell.formula)}</f><v>${cell.value}</v></c>`;
            return `<c r="${reference}" s="${style}"><v>${cell.value}</v></c>`;
          })
          .join("")}</row>`,
    )
    .join("");
  const columns = sheet.widths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${columns}</cols>
  <sheetData>${rows}</sheetData>
  <autoFilter ref="A1:${columnName(Math.max(0, sheet.widths.length - 1))}1"/>
</worksheet>`;
};

const header = (...labels: string[]) => labels.map((label) => text(label, 1));

const summarySheet = (
  state: GameState,
  topic: WorkbookTopic,
  fraction: number,
): Sheet => {
  const reportTopic: AvaReportTopic =
    topic === "command-dashboard" ? "overview" : topic;
  const report = buildAvaReport(
    { kind: "REPORT", topic: reportTopic, scope: "current" },
    state,
  );
  return {
    name: "Command Summary",
    widths: [24, 92],
    rows: [
      header("FIELD", "DISCLOSED VALUE"),
      [text("Workbook"), text(topic)],
      [text("Campaign Day"), number(state.day)],
      [text("Day Progress"), number(fraction, 4)],
      [text("Campaign Status"), text(state.status.toUpperCase())],
      [text("Snapshot"), text(`Day ${state.day} · ${(fraction * 100).toFixed(1)}% elapsed`)],
      [text("Report"), text(report.title)],
      [text("Ava"), text(report.flavor)],
      [text("Situation"), text(report.direct)],
      [text("Judgment"), text(report.recommendation)],
      [
        text("Disclosure"),
        text(
          "Forecasts use disclosed state and reported estimates. The unresolved outcome is excluded.",
        ),
      ],
    ],
  };
};

const industrialSheet = (state: GameState, fraction: number): Sheet => {
  const projection = projectProduction(state);
  const live = liveProjection(state, fraction);
  const rows: Cell[][] = [
    header(
      "ALLOCATION",
      "PRODUCTION",
      "CURRENT",
      "REQUIRED",
      "LIVE STOCK",
      "BALANCE",
    ),
  ];
  projection.lines.forEach((line, index) => {
    const excelRow = index + 2;
    rows.push([
      number(line.allocation / 100, 4),
      text(line.resource.toUpperCase()),
      formula(
        `'Calculation Inputs'!O${excelRow}`,
        line.output,
      ),
      formula(`'Calculation Inputs'!P${excelRow}`, line.requestedUse),
      formula(
        `MAX(0,ROUND('Calculation Inputs'!M${excelRow}+(C${excelRow}-MIN(D${excelRow},'Calculation Inputs'!M${excelRow}+C${excelRow}))*'Calculation Inputs'!N${excelRow},0))`,
        live.production[line.resource],
      ),
      formula(`C${excelRow}-D${excelRow}`, line.net),
    ]);
  });
  return {
    name: "Industrial Throughput",
    widths: [14, 18, 16, 16, 18, 16],
    rows,
  };
};

const calculationInputsSheet = (
  state: GameState,
  fraction: number,
): Sheet => {
  const projection = projectProduction(state);
  return {
    name: "Calculation Inputs",
    widths: [
      16, 14, 14, 14, 14, 18, 16, 18, 14, 14, 16, 16, 18, 16, 18, 18,
      18,
    ],
    rows: [
      header(
        "RESOURCE",
        "BASE OUTPUT",
        "ALLOCATION",
        "WORKFORCE",
        "CONDITION",
        "POLICY / RETOOL",
        "SPECIALIZATION",
        "COMMAND OUTPUT",
        "BASE USE",
        "SUPPLY",
        "MANEUVER USE",
        "COMMAND USE",
        "OPENING STOCK",
        "DAY PROGRESS",
        "CURRENT OUTPUT",
        "REQUIRED USE",
        "FULFILLED USE",
      ),
      ...projection.lines.map((line, index) => {
        const row = index + 2;
        return [
          text(line.resource.toUpperCase()),
          number(line.baseOutput),
          number(line.allocation / 100, 4),
          number(projection.workforceFactor, 4),
          number(projection.conditionFactor, 4),
          number(projection.policyFactor, 4),
          number(line.specializationFactor, 4),
          number(line.directorOutputFactor, 4),
          number(line.baseUse),
          number(line.supplyMultiplier, 4),
          number(line.resourceUseFactor, 4),
          number(line.directorUseFactor, 4),
          number(line.opening),
          number(fraction, 4),
          formula(
            `MAX(0,ROUND(B${row}*C${row}*100*D${row}*E${row}*F${row}*G${row}*H${row},0))`,
            line.output,
          ),
          formula(
            `MAX(0,ROUND(I${row}*J${row}*K${row}*L${row},0))`,
            line.requestedUse,
          ),
          formula(
            `MIN(P${row},M${row}+O${row})`,
            line.fulfilledUse,
          ),
        ];
      }),
    ],
  };
};

const personnelSheet = (state: GameState): Sheet => {
  const personnel = projectAvaEnvelope(state).personnel;
  const force = projectForceGeneration(state);
  const replacementBalance =
    force.effectiveGraduates - personnel.casualty - personnel.netDesertion;
  return {
    name: "Personnel",
    widths: [34, 20, 60],
    rows: [
      header("METRIC", "VALUE", "FORMULA OR BASIS"),
      [
        text("Desertion Attempts"),
        number(personnel.desertion),
        text("Projected attempts from current disclosed personnel pressure"),
      ],
      [
        text("Retention Rate"),
        number(personnel.retentionRate, 4),
        text("Active retention policy"),
      ],
      [
        text("Retained"),
        formula(
          "MIN(B2,ROUND(B2*B3,0))",
          personnel.retained,
        ),
        text("MIN(Attempts, ROUND(Attempts × Retention Rate, 0))"),
      ],
      [
        text("Patrol Rate"),
        number(personnel.patrolRate, 4),
        text("MIN(65%, Patrol Commitment ÷ 7,200)"),
      ],
      [
        text("Intercepted"),
        formula(
          "MIN(B2-B4,ROUND(B2*B5,0))",
          personnel.intercepted,
        ),
        text(
          "MIN(Attempts − Retained, ROUND(Attempts × Patrol Rate, 0))",
        ),
      ],
      [
        text("Net Flight"),
        formula("MAX(0,B2-B4-B6)", personnel.netDesertion),
        text("MAX(0, Attempts − Retained − Intercepted)"),
      ],
      [text("Deployable Force"), number(state.deployable), text("Current")],
      [
        text("Patrol Commitment"),
        number(state.patrolCommitment),
        text("Removed from useful frontline employment"),
      ],
      [
        text("Operationally Available"),
        formula(
          "MAX(0,B8-B9)",
          Math.max(0, state.deployable - state.patrolCommitment),
        ),
        text("MAX(0, Deployable Force − Patrol Commitment)"),
      ],
      [
        text("Projected Combat Loss"),
        number(personnel.casualty),
        text("Authoritative operational projection"),
      ],
      [
        text("Effective Graduates"),
        number(force.effectiveGraduates),
        text("Graduates adjusted for training quality"),
      ],
      [
        text("Replacement Balance"),
        formula("B12-B11-B7", replacementBalance),
        text("Graduates − Combat Loss − Net Flight"),
      ],
    ],
  };
};

const forceGenerationSheet = (state: GameState): Sheet => {
  const force = projectForceGeneration(state);
  const graduating = state.trainingCohorts.filter(
    (cohort) => cohort.daysRemaining <= 1,
  );
  const cohortRows = graduating.length
    ? graduating
    : [
        {
          id: "NO COHORT DUE",
          headcount: 0,
          daysRemaining: 0,
          quality: 0,
        },
      ];
  const cohortStart = 31;
  const cohortEnd = cohortStart + cohortRows.length - 1;
  return {
    name: "Force Generation",
    widths: [34, 20, 68, 18, 18, 18, 18],
    rows: [
      header(
        "PIPELINE METRIC",
        "VALUE",
        "EXCEL FORMULA OR BASIS",
      ),
      [text("Population"), number(state.population), text("Current")],
      [text("Armed Population"), number(state.armed), text("Current")],
      [text("Opening Workforce"), number(state.workforce), text("Current")],
      [text("Voluntary Intake"), number(force.voluntaryIntake), text("Current daily intake")],
      [text("Forced Intake"), number(force.forcedIntake), text("Current daily intake")],
      [
        text("Gross Intake"),
        formula("SUM(B5:B6)", force.grossIntake),
        text("Voluntary + Forced"),
      ],
      [
        text("Eligible Population"),
        formula(
          "MAX(0,B2-B3-(B4-B7*0.64))",
          force.eligiblePopulation,
        ),
        text("Population − Armed − workforce after 64% intake conversion"),
      ],
      [text("Queue Opening"), number(force.queueOpening), text("Current")],
      [
        text("Queue Available"),
        formula("B9+B7", force.queueOpening + force.grossIntake),
        text("Opening queue + Gross intake"),
      ],
      [text("Training Capacity"), number(force.capacity), text("Current")],
      [
        text("Admitted"),
        formula("MIN(B10,B11)", force.admitted),
        text("MIN(Queue available, Capacity)"),
      ],
      [
        text("Queue Closing"),
        formula("B10-B12", force.queueClosing),
        text("Queue available − Admitted"),
      ],
      [text("Equipment Condition"), number(state.equipment), text("Percent")],
      [
        text("Equipment Factor"),
        formula(
          "MAX(0.25,MIN(1,B14/100))",
          Math.max(0.25, Math.min(1, state.equipment / 100)),
          4,
        ),
        text("CLAMP(Equipment ÷ 100, 0.25, 1.00)"),
      ],
      [text("Readiness"), number(state.readiness), text("Percent")],
      [
        text("Readiness Gate"),
        formula(
          "MAX(0.35,MIN(1,(B16-30)/55))",
          Math.max(0.35, Math.min(1, (state.readiness - 30) / 55)),
          4,
        ),
        text("CLAMP((Readiness − 30) ÷ 55, 0.35, 1.00)"),
      ],
      [
        text("Raw Graduates"),
        formula(`SUM(E${cohortStart}:E${cohortEnd})`, force.rawGraduates),
        text("Headcount in cohorts due today"),
      ],
      [
        text("Effective Graduates"),
        formula(
          `ROUND(SUM(G${cohortStart}:G${cohortEnd}),0)`,
          force.effectiveGraduates,
        ),
        text("Quality-adjusted graduating headcount"),
      ],
      [
        text("Equipment Demand"),
        formula("B19", force.equipmentDemand),
        text("Effective Graduates"),
      ],
      [
        text("Equipment Assigned"),
        formula(
          "MIN(B19,ROUND(B19*B15,0))",
          force.equipmentAssigned,
        ),
        text("Graduates constrained by Equipment Factor"),
      ],
      [
        text("Reserve Assigned"),
        formula("MAX(0,B19-B21)", force.reserveAssigned),
        text("Effective Graduates − Equipment Assigned"),
      ],
      [text("Opening Reserves"), number(force.reservesOpening), text("Current")],
      [
        text("Reserve Released"),
        formula(
          "MIN(B23,ROUND(B23*0.08*B15*B17,0))",
          force.reserveReleased,
        ),
        text("Opening Reserves × 8% × Equipment Factor × Readiness Gate"),
      ],
      [
        text("Deployed Graduates"),
        formula(
          "ROUND(B21*B17,0)",
          force.deployableAssigned - force.reserveReleased,
        ),
        text("Equipment Assigned × Readiness Gate"),
      ],
      [
        text("Deployable Assigned"),
        formula("B24+B25", force.deployableAssigned),
        text("Reserve Released + Deployed Graduates"),
      ],
      [
        text("Closing Reserves"),
        formula(
          "MAX(0,B23-B24)+B22+(B21-B25)",
          force.reservesClosing,
        ),
        text("Unreleased reserves + unequipped and not-yet-ready graduates"),
      ],
      [text("Opening Deployable"), number(force.deployableOpening), text("Current")],
      [
        text("Closing Deployable"),
        formula("B28+B26", force.deployableClosing),
        text("Opening Deployable + Deployable Assigned"),
      ],
      header(
        "GRADUATING COHORT",
        "HEADCOUNT",
        "DAYS REMAINING",
        "QUALITY",
        "GRADUATES TODAY",
        "QUALITY FACTOR",
        "EFFECTIVE",
      ),
      ...cohortRows.map((cohort, index) => {
        const row = cohortStart + index;
        const graduates =
          cohort.daysRemaining <= 1 ? cohort.headcount : 0;
        const qualityFactor =
          cohort.headcount > 0
            ? Math.max(
                0.35,
                Math.min(1.05, (cohort.quality - 20) / 80),
              )
            : 0;
        return [
          text(cohort.id),
          number(cohort.headcount),
          number(cohort.daysRemaining),
          number(cohort.quality),
          formula(`IF(C${row}<=1,B${row},0)`, graduates),
          formula(
            `IF(B${row}=0,0,MAX(0.35,MIN(1.05,(D${row}-20)/80)))`,
            qualityFactor,
            4,
          ),
          formula(`E${row}*F${row}`, graduates * qualityFactor),
        ];
      }),
    ],
  };
};

const diplomacySheet = (state: GameState): Sheet => {
  const diplomacy = projectDiplomacy(state);
  const actorStart = 2;
  const actorEnd = actorStart + Math.max(1, diplomacy.actors.length) - 1;
  const actorRows = diplomacy.actors.length
    ? diplomacy.actors
    : [];
  const rows: Cell[][] = [
    header(
      "ACTOR",
      "ROLE",
      "OPEN TRUST",
      "TRUST CHANGE",
      "CLOSE TRUST",
      "OPEN LEVERAGE",
      "LEVERAGE CHANGE",
      "CLOSE LEVERAGE",
      "OPEN DEPENDENCY",
      "DEPENDENCY CHANGE",
      "CLOSE DEPENDENCY",
      "AID PIPELINE",
      "SANCTIONS",
      "BROKER BONUS",
      "BETRAYAL RISK",
      "DELIVERY FACTOR",
      "MUNITIONS",
      "TREASURY",
      "INTELLIGENCE",
    ),
    ...actorRows.map((actor, index) => {
      const row = actorStart + index;
      const deliveryFactor =
        actor.role === "rival"
          ? 0
          : actor.aidPipeline *
            (actor.trust / 100) *
            (1 - actor.betrayalRisk);
      return [
        text(actor.name),
        text(actor.role.toUpperCase()),
        number(actor.trust - actor.trustChange, 3),
        number(actor.trustChange, 3),
        formula(`C${row}+D${row}`, actor.trust, 3),
        number(actor.leverage - actor.leverageChange, 3),
        number(actor.leverageChange, 3),
        formula(`F${row}+G${row}`, actor.leverage, 3),
        number(actor.dependency - actor.dependencyChange, 3),
        number(actor.dependencyChange, 3),
        formula(`I${row}+J${row}`, actor.dependency, 3),
        number(actor.aidPipeline, 3),
        number(actor.sanctionsExposure, 3),
        number(actor.role === "broker" ? 12 : 0),
        formula(
          `MAX(0,MIN(0.95,(K${row}*0.45+H${row}*0.3+(100-E${row})*0.35+N${row})/100))`,
          actor.betrayalRisk,
          4,
        ),
        formula(
          `IF(B${row}="RIVAL",0,L${row}*(E${row}/100)*(1-O${row}))`,
          deliveryFactor,
          4,
        ),
        formula(`ROUND(P${row}*145,0)`, actor.munitionsDelivered),
        formula(`P${row}*0.035`, actor.treasuryDelivered, 3),
        formula(`ROUND(P${row}/18,0)`, actor.intelligenceDelivered),
      ];
    }),
  ];
  rows.push([
    text("TOTAL / HIGH"),
    text(""),
    text(""),
    text(""),
    text(""),
    text(""),
    text(""),
    text(""),
    text(""),
    text(""),
    text(""),
    text(""),
    formula(
      `SUM(M${actorStart}:M${actorEnd})/250`,
      diplomacy.totalSanctionsDrag,
      4,
    ),
    text(""),
    formula(
      `MAX(O${actorStart}:O${actorEnd})`,
      diplomacy.highestBetrayalRisk,
      4,
    ),
    text(""),
    formula(
      `SUM(Q${actorStart}:Q${actorEnd})`,
      diplomacy.totalMunitions,
    ),
    formula(
      `SUM(R${actorStart}:R${actorEnd})`,
      diplomacy.totalTreasury,
      3,
    ),
    formula(
      `SUM(S${actorStart}:S${actorEnd})`,
      diplomacy.totalIntelligence,
    ),
  ]);
  if (!actorRows.length)
    rows.splice(1, 0, [
      text("NO ACTIVE ACTORS"),
      ...Array.from({ length: 18 }, () => number(0)),
    ]);
  return {
    name: "Diplomatic Calculus",
    widths: [
      24, 14, 16, 16, 16, 18, 18, 18, 20, 20, 20, 18, 16, 18, 18, 18,
      16, 16, 16,
    ],
    rows,
  };
};

const humanField = (field: string) =>
  field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const directiveCalculusSheet = (state: GameState): Sheet => {
  const rows: Cell[][] = [
    header(
      "DOMAIN",
      "ISSUE",
      "CHOICE",
      "TIMING",
      "VARIABLE",
      "CHANGE",
      "COOLDOWN",
      "LOCKED UNTIL",
      "DAYS REMAINING",
      "DISCLOSED CONSEQUENCE",
    ),
  ];
  for (const family of FAMILIES) {
    for (const choice of family.choices) {
      const effects = [
        ...Object.entries(choice.delta ?? {}).map(
          ([field, value]) =>
            ["ISSUE", field, Number(value)] as const,
        ),
        ...Object.entries(choice.tick ?? {}).map(
          ([field, value]) =>
            ["DAILY", field, Number(value)] as const,
        ),
        ...Object.entries(choice.delay?.delta ?? {}).map(
          ([field, value]) =>
            [
              `DAY +${choice.delay?.days ?? 0}`,
              field,
              Number(value),
            ] as const,
        ),
      ];
      const disclosed = [...choice.exact, ...choice.risk].join(" · ");
      for (const effect of effects.length
        ? effects
        : [["RULE", "non-numeric condition", 0] as const]) {
        const row = rows.length + 1;
        const lockedUntil = state.locks[family.id] ?? state.day;
        rows.push([
          text(family.module.toUpperCase()),
          text(family.label),
          text(choice.label),
          text(effect[0]),
          text(humanField(effect[1])),
          number(effect[2], 3),
          number(family.lock),
          number(lockedUntil),
          formula(`MAX(0,H${row}-${state.day})`, Math.max(0, lockedUntil - state.day)),
          text(disclosed),
        ]);
      }
    }
  }
  return {
    name: "Directive Calculus",
    widths: [16, 32, 34, 16, 24, 14, 14, 16, 18, 72],
    rows,
  };
};

const doctrineCalculusSheet = (state: GameState): Sheet => {
  const rows: Cell[][] = [
    header(
      "VECTOR",
      "PRINCIPLE",
      "INSIGHT COST",
      "CURRENT INSIGHT",
      "BALANCE AFTER",
      "INTERNALIZED",
      "VARIABLE",
      "IMMEDIATE CHANGE",
      "DISCLOSED EFFECT",
    ),
  ];
  for (const vector of DOCTRINES) {
    for (const stage of vector.stages) {
      const effects = Object.entries(stage.delta ?? {});
      for (const [field, value] of effects.length
        ? effects
        : [["rule", 0] as [string, number]]) {
        const row = rows.length + 1;
        rows.push([
          text(vector.label),
          text(stage.label),
          number(stage.cost),
          number(state.doctrine),
          formula(`D${row}-C${row}`, state.doctrine - stage.cost),
          number(state.unlocked.includes(stage.id) ? 1 : 0),
          text(humanField(field)),
          number(Number(value), 3),
          text(stage.effect),
        ]);
      }
    }
  }
  return {
    name: "Doctrine Calculus",
    widths: [28, 34, 16, 18, 18, 16, 24, 18, 70],
    rows,
  };
};

const operationsSheet = (state: GameState): Sheet => {
  const operations = projectAvaEnvelope(state);
  const disclosedRatio =
    operations.friendlyPower / Math.max(1, operations.assessedEnemyPower);
  return {
    name: "Operations",
    widths: [34, 20, 66],
    rows: [
      header("METRIC", "VALUE", "DISCLOSED BASIS"),
      [
        text("Committed Force"),
        number(operations.committed),
        text("Current issued maneuver and operational availability"),
      ],
      [
        text("Useful Frontage"),
        number(operations.frontageDemand),
        text("Current sector terrain"),
      ],
      [
        text("Frontage Saturation"),
        formula("B2/MAX(1,B3)", operations.frontageSaturation, 3),
        text("Committed Force ÷ Useful Frontage"),
      ],
      [
        text("Friendly Power"),
        number(operations.friendlyPower),
        text("Committed force converted by disclosed conditions"),
      ],
      [
        text("Assessed Enemy Power"),
        number(operations.assessedEnemyPower),
        text("Player-facing estimate, not hidden enemy state"),
      ],
      [
        text("Force Ratio"),
        formula("B5/MAX(1,B6)", disclosedRatio, 3),
        text("Friendly Power ÷ Assessed Enemy Power"),
      ],
      [
        text("Friendly Loss Low"),
        number(operations.friendlyLossLow),
        text("Controlled disclosed envelope"),
      ],
      [
        text("Friendly Loss High"),
        number(operations.friendlyLossHigh),
        text("Controlled disclosed envelope"),
      ],
      [
        text("Projected Friendly Loss"),
        formula(
          "ROUND(AVERAGE(B8:B9),0)",
          operations.friendlyLoss,
        ),
        text("Midpoint of the disclosed loss envelope"),
      ],
      [
        text("Ground Movement Low"),
        number(operations.groundLow, 3),
        text("Controlled disclosed envelope"),
      ],
      [
        text("Ground Movement High"),
        number(operations.groundHigh, 3),
        text("Controlled disclosed envelope"),
      ],
      [
        text("Projected Ground Movement"),
        formula(
          "AVERAGE(B11:B12)",
          operations.groundMovement,
          3,
        ),
        text("Midpoint of the disclosed movement envelope"),
      ],
      [text("Disclosure Boundary"), text(operations.disclosure), text("")],
    ],
  };
};

const domesticSheet = (state: GameState): Sheet => {
  const domestic = projectAvaEnvelope(state).domestic;
  const directorLegitimacy =
    domestic.legitimacyChange -
    domestic.policyLegitimacy +
    domestic.casualtyBurden +
    domestic.shortageBurden +
    domestic.atrocityBurden +
    domestic.fiscalBurden;
  const legitimacyRelief = Math.max(
    0,
    domestic.legitimacyOpening - 45,
  ) / 180;
  const directorResistance =
    domestic.resistanceChange -
    domestic.policyResistance -
    domestic.forcedIntakeBurden -
    domestic.casualtyBurden * 0.35 -
    domestic.shortageBurden * 0.7 +
    legitimacyRelief;
  const shortages = domestic.shortageBurden / 0.65;
  return {
    name: "Domestic State",
    widths: [34, 20, 62],
    rows: [
      header("METRIC", "VALUE", "FORMULA OR BASIS"),
      [text("Opening Legitimacy"), number(domestic.legitimacyOpening), text("Current")],
      [text("Policy Legitimacy"), number(domestic.policyLegitimacy, 3), text("Active domestic policy")],
      [text("Casualty Burden"), number(domestic.casualtyBurden, 3), text("Projected friendly loss ÷ 8,500")],
      [text("Shortage Burden"), number(domestic.shortageBurden, 3), text("Critical shortages × 0.65")],
      [text("Atrocity Burden"), number(domestic.atrocityBurden, 3), text("Exposure ÷ 180")],
      [text("Fiscal Burden"), number(domestic.fiscalBurden, 3), text("Treasury shortfall below 40")],
      [text("Command Legitimacy Modifier"), number(directorLegitimacy, 3), text("Current command profile")],
      [
        text("Legitimacy Change"),
        formula("B3-B4-B5-B6-B7+B8", domestic.legitimacyChange, 3),
        text("Policy − burdens + command modifier"),
      ],
      [
        text("Closing Legitimacy"),
        formula("B2+B9", domestic.legitimacyClosing, 3),
        text("Opening Legitimacy + Change"),
      ],
      [text("Opening Resistance"), number(domestic.resistanceOpening), text("Current")],
      [text("Policy Resistance"), number(domestic.policyResistance, 3), text("Active domestic policy")],
      [text("Forced Intake Burden"), number(domestic.forcedIntakeBurden, 3), text("Forced intake ÷ 28,000")],
      [text("Casualty Resistance Burden"), formula("B4*0.35", domestic.casualtyBurden * 0.35, 3), text("Casualty Burden × 0.35")],
      [text("Shortage Resistance Burden"), formula("B5*0.7", domestic.shortageBurden * 0.7, 3), text("Shortage Burden × 0.7")],
      [text("Legitimacy Relief"), formula("MAX(0,B2-45)/180", legitimacyRelief, 3), text("Resistance relief above 45 Legitimacy")],
      [text("Command Resistance Modifier"), number(directorResistance, 3), text("Current command profile")],
      [
        text("Resistance Change"),
        formula("B12+B13+B14+B15-B16+B17", domestic.resistanceChange, 3),
        text("Policy + burdens − legitimacy relief + command modifier"),
      ],
      [
        text("Closing Resistance"),
        formula("B11+B18", domestic.resistanceClosing, 3),
        text("Opening Resistance + Change"),
      ],
      [text("Critical Shortages"), number(shortages), text("Shortage Burden ÷ 0.65")],
      [
        text("Strike Risk"),
        formula(
          "MAX(0,MIN(0.95,(B19*1.15+(100-B10)*0.55+B20*8)/150))",
          domestic.strikeRisk,
          4,
        ),
        text("Closing Resistance + Legitimacy deficit + shortages"),
      ],
      [text("Treasury"), number(state.treasury), text("Current")],
      [
        text("Collapse Risk"),
        formula(
          "MAX(0,MIN(0.95,((25-B10)*2+MAX(0,B19-60)*1.4+MAX(0,-B22))/100))",
          domestic.collapseRisk,
          4,
        ),
        text("Legitimacy collapse + excess resistance + treasury deficit"),
      ],
    ],
  };
};

const decisionLedgerSheet = (
  state: GameState,
  fraction: number,
): Sheet => {
  const evaluated = evaluateAvaCampaignChoices(state, {
    operation: "RANK",
    subject: { type: "CAMPAIGN_CHOICE", entityIds: [] },
    scope: {
      group: "ALL",
      domains: ["MAIN", "DOMESTIC", "NETWORK"],
      excludedDomains: [],
    },
    timeframe: "CURRENT_DOCKET",
    comparisonMode: "RANK",
    criteria: ["OVERALL_VALUE"],
    polarity: "AFFIRMATIVE",
    requestedDetail: "CALCULUS",
    perspective: "PLAYER",
    outputForm: "SPREADSHEET",
    overlays: [],
    confidence: 1,
    sourceSpans: {},
  }, fraction);
  return {
    name: "Ava Decision Ledger",
    widths: [12, 14, 34, 14, 16, 14, 16, 18, 16, 16, 16, 16],
    rows: [
      header(
        "HANDLE",
        "SCOPE",
        "OPTION",
        "RISK",
        "INDUSTRIAL",
        "PRESSURE",
        "STOCK COST",
        "OVERALL VALUE",
        "LOWEST RISK",
        "PRODUCTION",
        "FRONT",
        "CHEAPEST",
      ),
      ...evaluated.map((entry, index) => {
        const excelRow = index + 2;
        const overall =
          entry.pressure * 0.5 +
          entry.production * 0.35 -
          entry.risk * 0.55 -
          entry.stockCost * 0.00025;
        return [
          text(entry.descriptor.handle),
          text((entry.descriptor.domain ?? "command").toUpperCase()),
          text(entry.descriptor.label),
          number(entry.risk, 3),
          number(entry.production, 3),
          number(entry.pressure, 3),
          number(entry.stockCost),
          formula(
            `F${excelRow}*0.5+E${excelRow}*0.35-D${excelRow}*0.55-G${excelRow}*0.00025`,
            overall,
            3,
          ),
          formula(`-D${excelRow}`, -entry.risk, 3),
          formula(`E${excelRow}`, entry.production, 3),
          formula(`F${excelRow}`, entry.pressure, 3),
          formula(`-G${excelRow}`, -entry.stockCost, 3),
        ];
      }),
    ],
  };
};

const resolutionHistorySheet = (state: GameState): Sheet => ({
  name: "Resolution History",
  widths: [16, 22, 22, 22],
  rows: [
    header(
      "RESOLVED DAY",
      "NET PRODUCTION",
      "FRIENDLY LOSSES",
      "ENEMY LOSSES",
    ),
    ...[...state.resolutionHistory]
      .sort((left, right) => left.resolvedDay - right.resolvedDay)
      .map((record) => [
        number(record.resolvedDay),
        formula(
          `SUM(${record.production.lines
            .map((line) => String(line.net))
            .join(",") || "0"})`,
          record.production.lines.reduce(
            (sum, line) => sum + line.net,
            0,
          ),
        ),
        number(record.personnel.combatLosses),
        number(record.operations.enemyLosses),
      ]),
  ],
});

const scoreSheet = (state: GameState): Sheet => {
  const input = campaignScoreInputForState(state);
  const score = campaignScoreForState(state);
  const outcomeCode =
    input.outcome === "victory" ? 2 : input.outcome === "defeat" ? 1 : 0;
  return {
    name: "Campaign Score",
    widths: [34, 22, 76],
    rows: [
      header("COMPONENT", "VALUE", "EXCEL FORMULA OR BASIS"),
      [text("Outcome Code"), number(outcomeCode), text("2 victory · 1 defeat · 0 abandoned")],
      [
        text("Days"),
        formula(
          "MAX(1,COUNTA('Resolution History'!A2:A1000))",
          input.days,
        ),
        text("Count of resolved campaign days"),
      ],
      [
        text("Production Minimum"),
        formula(
          "IF(COUNTA('Resolution History'!B2:B1000)=0,0,MIN('Resolution History'!B2:B1000))",
          input.productionMin,
        ),
        text("Resolved daily range"),
      ],
      [
        text("Production Maximum"),
        formula(
          "IF(COUNTA('Resolution History'!B2:B1000)=0,0,MAX('Resolution History'!B2:B1000))",
          input.productionMax,
        ),
        text("Resolved daily range"),
      ],
      [
        text("Suffered Minimum"),
        formula(
          "IF(COUNTA('Resolution History'!C2:C1000)=0,0,MIN('Resolution History'!C2:C1000))",
          input.sufferedMin,
        ),
        text("Resolved daily range"),
      ],
      [
        text("Suffered Maximum"),
        formula(
          "IF(COUNTA('Resolution History'!C2:C1000)=0,0,MAX('Resolution History'!C2:C1000))",
          input.sufferedMax,
        ),
        text("Resolved daily range"),
      ],
      [
        text("Inflicted Minimum"),
        formula(
          "IF(COUNTA('Resolution History'!D2:D1000)=0,0,MIN('Resolution History'!D2:D1000))",
          input.inflictedMin,
        ),
        text("Resolved daily range"),
      ],
      [
        text("Inflicted Maximum"),
        formula(
          "IF(COUNTA('Resolution History'!D2:D1000)=0,0,MAX('Resolution History'!D2:D1000))",
          input.inflictedMax,
        ),
        text("Resolved daily range"),
      ],
      [
        text("Completion"),
        formula("IF(B2=2,3200,IF(B2=1,1600,MIN(900,B3*35)))", score.completion),
        text("Outcome completion value"),
      ],
      [
        text("Production Range"),
        formula("MAX(-500,MIN(1800,ROUND((B4+B5)*0.012,0)))", score.production),
        text("Clamped production contribution"),
      ],
      [
        text("Casualty Control"),
        formula("MAX(0,MIN(2600,ROUND(2600-(MAX(0,B6)+MAX(0,B7))*0.018,0)))", score.casualtyControl),
        text("Clamped suffered-loss control"),
      ],
      [
        text("Inflicted Losses"),
        formula("MAX(0,MIN(2200,ROUND((MAX(0,B8)+MAX(0,B9))*0.018,0)))", score.inflictedLosses),
        text("Clamped inflicted-loss contribution"),
      ],
      [
        text("Early Victory"),
        formula(
          'IF(B2<>2,0,IF(B3>=28,0,ROUND(((EXP((28-B3)/5.2)-1)/(EXP(13/5.2)-1))*2600,0)))',
          score.earlyVictory,
        ),
        text("Exponential acceleration between Days 28 and 15"),
      ],
      [
        text("TOTAL"),
        formula("MAX(0,MIN(10000,SUM(B10:B14)))", score.total),
        text("Completion + Production + Casualty Control + Inflicted Losses + Early Victory"),
      ],
    ],
  };
};

const reportEvidenceSheet = (
  state: GameState,
  topic: WorkbookTopic,
): Sheet => {
  const report = buildAvaReport(
    {
      kind: "REPORT",
      topic: topic === "command-dashboard" ? "overview" : topic,
      scope: "current",
    },
    state,
  );
  return {
    name: "Report Evidence",
    widths: [34, 76],
    rows: [
      header("DISCLOSED FIELD", "VALUE"),
      [text("Equation"), text(report.calculation.equation)],
      ...report.calculation.rows.map((row) => [
        text(row.label),
        text(row.value),
      ]),
      [text("Resolved Days"), number(report.history.resolvedDays)],
      [text("Observed Enemy Orders"), number(report.history.observedOrders)],
      ...report.history.observations.map((observation, index) => [
        text(`Observation ${index + 1}`),
        text(observation),
      ]),
    ],
  };
};

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Arial"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF191B18"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const uint16 = (value: number) => {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
};
const uint32 = (value: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
};
const concat = (...arrays: Uint8Array[]) => {
  const output = new Uint8Array(
    arrays.reduce((sum, array) => sum + array.length, 0),
  );
  let offset = 0;
  for (const array of arrays) {
    output.set(array, offset);
    offset += array.length;
  }
  return output;
};

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const storedZip = (entries: Array<{ name: string; content: string }>) => {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = encoder.encode(entry.content);
    const crc = crc32(data);
    const local = concat(
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(crc),
      uint32(data.length),
      uint32(data.length),
      uint16(name.length),
      uint16(0),
      name,
      data,
    );
    localParts.push(local);
    centralParts.push(
      concat(
        uint32(0x02014b50),
        uint16(20),
        uint16(20),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(crc),
        uint32(data.length),
        uint32(data.length),
        uint16(name.length),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(offset),
        name,
      ),
    );
    offset += local.length;
  }
  const locals = concat(...localParts);
  const central = concat(...centralParts);
  const end = concat(
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(entries.length),
    uint16(entries.length),
    uint32(central.length),
    uint32(locals.length),
    uint16(0),
  );
  return concat(locals, central, end);
};

export const buildAvaWorkbook = (
  state: GameState,
  topic: WorkbookTopic = "command-dashboard",
  fraction = 0,
) => {
  const asOfFraction = Math.max(
    0,
    Math.min(1, Number.isFinite(fraction) ? fraction : 0),
  );
  const sheets = [
    summarySheet(state, topic, asOfFraction),
    industrialSheet(state, asOfFraction),
    calculationInputsSheet(state, asOfFraction),
    personnelSheet(state),
    forceGenerationSheet(state),
    operationsSheet(state),
    domesticSheet(state),
    diplomacySheet(state),
    directiveCalculusSheet(state),
    doctrineCalculusSheet(state),
    decisionLedgerSheet(state, asOfFraction),
    resolutionHistorySheet(state),
    scoreSheet(state),
    reportEvidenceSheet(state, topic),
  ];
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheets
    .map(
      (sheet, index) =>
        `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join("")}</sheets>
  <calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/>
</workbook>`;
  const relationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join("")}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("")}
</Types>`;
  return storedZip([
    { name: "[Content_Types].xml", content: contentTypes },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    { name: "xl/workbook.xml", content: workbook },
    { name: "xl/_rels/workbook.xml.rels", content: relationships },
    { name: "xl/styles.xml", content: stylesXml },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: worksheetXml(sheet),
    })),
  ]);
};

export const avaWorkbookFilename = (
  state: GameState,
  topic: WorkbookTopic,
) =>
  `delenda-day-${String(state.day).padStart(3, "0")}-${topic}.xlsx`;
