"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CAMPAIGN_EVENTS,
  CAMPAIGN_PHASES,
  CampaignConfig,
  Choice,
  DAILY_ORDERS,
  DOCTRINES,
  DoctrineStage,
  DoctrineVector,
  FACT_CATALOG,
  FAMILIES,
  Family,
  GameState,
  MANEUVERS,
  OPPORTUNITY_TEMPLATES,
  OpportunityPacket,
  SITUATIONS,
  THEATERS,
  Maneuver,
  Module,
  Resource,
  assessment,
  coverage,
  directorForState,
  directiveRejection,
  estimateDay,
  explainManeuverChance,
  fmt,
  fmtStrategic,
  initialState,
  liveProjection,
  maneuverForState,
  maneuversForState,
  opportunityResponseRejection,
  opportunityStatusForFraction,
  projectAdversary,
  projectDomestic,
  projectForceGeneration,
  projectOperations,
  projectProduction,
  restoreCampaignState,
  situationForState,
} from "./game";
import {
  CONCEPTS,
  calculationFor,
  replacementReserveForProjection,
} from "./concepts";
import { CampaignSetup } from "./CampaignSetup";
import { AccountPage } from "./AccountPage";
import { AdminPage } from "./AdminPage";
import { BugReporter } from "./BugReporter";
import { THEATER_SECTORS } from "./campaign-substrate";
import { openWikiApplet } from "./wiki-events";
import {
  compileAvaGodModeIntent,
  compileAvaTurnModeIntent,
  isAvaConfirmationInput,
} from "./ava/compiler";
import { serializeAvaChatLog } from "./ava/chat-export";
import { avaEntitiesForState } from "./ava/game-context";
import { type AvaActionRef } from "./ava/schema";
import type { AvaCognitiveActivationReceipt } from "./ava/request-ir";
import type {
  AvaDarkNetContext,
  AvaGlobalProductTelemetry,
} from "./ava/darknet";
import {
  actionKey,
  projectAvaAction,
} from "./ava/runtime";
import {
  initialAvaTerminalSession,
  resetAvaDiscourseForNewDay,
} from "./ava/terminal";
import {
  avaNexusStateRevision,
  createAvaNexusSession,
  runAvaNexusLine,
  runAvaNexusRequest,
  type AvaNexusSession,
} from "./ava/nexus";
import {
  restoreAvaShellSession,
} from "./ava/filesystem";
import { completeAvaInput } from "./ava/completion";
import {
  deleteAvaShellArchive,
  loadAvaShellArchive,
  saveAvaShellArchive,
} from "./ava/storage";
import {
  installInteractionTelemetry,
  recordAvaTelemetry,
  recordCampaignOutcome,
  recordModuleDwell,
  recordModuleSwitch,
  recordPageView,
  submitCampaignRecord,
} from "./telemetry";
import { BriefingInterface } from "./BriefingInterface";
import {
  compileConvergence,
  convergenceFrontIssued,
  convergenceFrontStatus,
  convergenceOptionAvailable,
  convergenceOptionCooldown,
  convergenceOptionRejection,
  type ConvergenceOption,
  type ConvergencePrompt,
} from "./convergence";
import { Bubblette, type BubbletteDetail } from "./Bubblette";
import { TheaterGeometry } from "./TheaterGeometry";
import { FieldManual } from "./FieldManual";
import { AvaTextRenderer } from "./AvaTextRenderer";
import {
  APHORISMS,
  aphorismForDay,
  campaignAphorismDayKey,
  type Aphorism,
} from "./aphorisms";
import { campaignScoreForState } from "./campaign-score-state";
import { scoreBreakdownLines } from "./campaign-balance";
import { publicErrorMessage } from "./public-error";
import {
  accountDayBounds,
  browserTimeZone,
} from "./account-time";
import { avaInterfaceIntent } from "./ava/interface-intent";
import { warFeedForInvocation } from "./war-feed";
import { visibleDirectiveView } from "./substrate/visible-directives";
import { getVisibleChoice } from "./substrate/services";
import {
  campaignPayloadSeal,
  campaignRevision,
  campaignSaveWasAccepted,
  selectCampaignForHydration,
  type StoredCampaignEnvelope,
} from "./campaign-persistence";
import type {
  AvaRequestIR,
  AvaResolutionGrant,
} from "./ava/request-ir";
import {
  avaRequestStateSeal,
  executeAvaActionRequest,
  executeAvaPlanRequest,
  prepareAvaActionRequest,
} from "./ava/request-ir";

type TurnAccess = {
  godMode: boolean;
  dayKey: string;
  lastResolvedDayKey: string | null;
  canResolve: boolean;
  nextTurnAt: number;
  timeZone: string;
  resolutionGrant?: AvaResolutionGrant;
};
type TurnRedemption = {
  allowed?:boolean;
  accountKey?:string;
  campaign?:StoredCampaignEnvelope|null;
  turn?:TurnAccess;
  nexus?:{
    response?:{status?:string};
    text?:string;
  };
  error?:string;
  code?:string;
};
type AccountBootstrap = {
  isAdmin?: boolean;
  timeZone?: string;
  timeZoneConfigured?: boolean;
  turn?: TurnAccess;
};
const isAccountBootstrap = (value: unknown): value is AccountBootstrap => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.isAdmin === undefined || typeof candidate.isAdmin === "boolean") &&
    (candidate.timeZone === undefined ||
      typeof candidate.timeZone === "string") &&
    (candidate.timeZoneConfigured === undefined ||
      typeof candidate.timeZoneConfigured === "boolean") &&
    (candidate.turn === undefined ||
      (candidate.turn !== null && typeof candidate.turn === "object"))
  );
};

type CommandPage = Module | "storyboard";

const modules: { id: CommandPage; label: string; n: string }[] = [
  { id: "storyboard", label: "Dashboard", n: "00" },
  { id: "campaign", label: "Campaign", n: "01" },
  { id: "national", label: "Production", n: "02" },
  { id: "military", label: "Military", n: "03" },
  { id: "diplomacy", label: "Diplomacy", n: "04" },
  { id: "doctrine", label: "Doctrine", n: "05" },
];
const resourceLabel: Record<Resource, string> = {
  munitions: "Munitions",
  armor: "Armor",
  flight: "Flight",
  drones: "Drones",
};
const moduleName = (module: CommandPage) =>
  module === "national"
    ? "PRODUCTION"
    : module === "storyboard"
      ? "DASHBOARD"
      : module.toUpperCase();
const directiveEffectTone = (line: string) => {
  if (
    /(?:^|\s)\+\s*\d|↑|\b(?:increase|gain|restore|improve|add|recover)\b/i.test(
      line,
    )
  )
    return "gain";
  if (
    /(?:^|\s)[−-]\s*\d|↓|\b(?:decrease|loss|cost|spend|consume|reduce)\b/i.test(
      line,
    )
  )
    return "loss";
  return "neutral";
};
type Metric =
  | "population"
  | "armed"
  | "enlistment"
  | "training"
  | "readiness"
  | "equipment"
  | "materiel"
  | "treasury"
  | "legitimacy"
  | "resistance"
  | "front"
  | "desertion"
  | "doctrine";
type Message = {
  who: "AVA" | "YOU";
  text: string;
  kind?: "ava" | "shell";
  cognitiveActivation?: AvaCognitiveActivationReceipt;
};
type Page = CommandPage | "admin";
type Live = ReturnType<typeof liveProjection>;

const gameModuleForPage = (page: Page): Module =>
  page === "admin" ? "account" : page === "storyboard" ? "campaign" : page;

const DAY_MS = 86_400_000;
const initialClock = () => accountDayBounds("UTC");
const clockText = (ms: number) => {
  const x = Math.max(0, ms);
  const h = Math.floor(x / 3_600_000);
  const m = Math.floor((x % 3_600_000) / 60_000);
  const s = Math.floor((x % 60_000) / 1000);
  const milli = Math.floor(x % 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(milli).padStart(3, "0")}`;
};

const metricInfo = (metric: Metric, s: GameState, live: Live) =>
  ({
    population: [
      "Population",
      fmt(s.population, true),
      `${fmt(s.workforce, true)} workers`,
      `The living base from which labor, tax, military eligibility, and political tolerance are drawn.`,
      [
        `Workforce: ${fmt(s.workforce, true)}`,
        `Recorded war deaths: ${fmt(18420000 - s.population, true)}`,
      ],
    ],
    armed: [
      "Armed Forces",
      fmt(live.armed, true),
      `${Math.round((live.deployable / Math.max(1, live.armed)) * 100)}% deployable`,
      `The force is not waiting for resolution. Combat and desertion continue to spend it while the order remains active.`,
      [
        `Authoritative opening force: ${fmt(s.armed, true)}`,
        `Projected deployable now: ${fmt(live.deployable, true)}`,
        `Combat losses today: ${fmt(live.losses, true)}`,
      ],
    ],
    enlistment: [
      "Enlistment",
      `${fmt(s.voluntary + s.forced, true)}/day`,
      "gross intake",
      "People entering the training system. Intake without capacity becomes a political queue, not an army.",
      [
        `Voluntary: ${fmt(s.voluntary, true)}`,
        `Forced: ${fmt(s.forced, true)}`,
      ],
    ],
    training: [
      "Training Pipeline",
      `${fmt(s.queue, true)} queued`,
      `${fmt(s.training)} capacity/day`,
      `The conversion layer between recruitment policy and fielded power.`,
      [
        `Active cohorts: ${s.trainingCohorts?.length ?? 0}`,
        `Duration: ${s.duration} days`,
        `Quality: ${s.quality.toFixed(0)}%`,
        `Reserves: ${fmt(s.reserves ?? 0, true)}`,
        `Capacity: ${fmt(s.training, true)}`,
      ],
    ],
    readiness: [
      "Soldier Readiness",
      `${s.readiness.toFixed(0)}%`,
      s.readiness > 65 ? "combat effective" : "degraded",
      "Readiness is attrition without contact. It decays under shortage, excessive tempo, and poor replacements.",
      [
        `Training quality: ${s.quality.toFixed(0)}%`,
        `Operational tempo: ${s.tempo}`,
      ],
    ],
    equipment: [
      "Equipment Coverage",
      `${s.equipment.toFixed(0)}%`,
      "field requirement equipped",
      "The share of weapons, vehicles, radios, and support equipment assigned and serviceable.",
      [
        `Armor stock: ${fmt(live.production.armor, true)}`,
        `Flight stock: ${fmt(live.production.flight, true)}`,
      ],
    ],
    materiel: [
      "Materiel Condition",
      `${s.materiel.toFixed(0)}%`,
      s.materiel >= 85 ? "nominal" : s.materiel >= 50 ? "strained" : "critical",
      "Factory uptime, vehicle serviceability, rail throughput, and maintenance debt.",
      [
        `Daily condition change: ${projectProduction(s).materielChange >= 0 ? "+" : ""}${projectProduction(s).materielChange.toFixed(1)}`,
        `Maintenance debt: ${projectProduction(s).maintenanceDebtAfter.toFixed(0)} / 100`,
      ],
    ],
    treasury: [
      "Treasury",
      `${s.treasury.toFixed(1)} B`,
      s.treasury > 80 ? "liquid" : "constrained",
      "Immediately spendable fiscal capacity. Recurring policies are charged at resolution.",
      [
        `Baseline revenue: 3.4 B/day`,
        `Army burden: ${(s.armed / 185000).toFixed(1)} B/day`,
      ],
    ],
    legitimacy: [
      "Legitimacy",
      `${s.legitimacy.toFixed(0)}%`,
      s.legitimacy > 50 ? "governable" : "brittle",
      "Public willingness to accept losses, taxes, shortages, and the state's account of why they remain necessary.",
      [
        `Resistance: ${s.resistance.toFixed(0)}%`,
        `Atrocity Exposure: ${s.atrocityExposure.toFixed(0)}%`,
      ],
    ],
    resistance: [
      "Resistance",
      `${s.resistance.toFixed(0)}%`,
      s.resistance < 30 ? "contained" : "organized",
      "Draft evasion, sabotage, noncompliance, capital flight, and other friction created by coercive policy.",
      [
        `Legitimacy: ${s.legitimacy.toFixed(0)}%`,
        `Dependency: ${s.dependency.toFixed(0)}%`,
      ],
    ],
    front: [
      "Campaign Front",
      `${s.front >= 0 ? "+" : ""}${s.front.toFixed(1)} km`,
      s.front >= 0 ? "beyond prewar line" : "inside prewar line",
      "Reach +12 km to win. Fall to -12 km and the operational system collapses.",
      [
        `Enemy strength: ${fmt(s.enemy, true)}`,
        `Days remaining: ${Math.max(0, 30 - s.day + 1)}`,
      ],
    ],
    desertion: [
      "Desertions",
      fmt(live.netDesertion, true),
      "actual net flight today",
      `Desertion is a continuous personnel flow distinct from casualties. Retention policy can persuade soldiers to remain; patrols intercept a further share by removing personnel from the front. Zero net flight is attainable only when those disclosed controls cover every attempt.`,
      [
        `Actual net desertions today: ${fmt(live.netDesertion, true)}`,
        `Attempted flight today: ${fmt(live.deserted, true)}`,
        `Prevented by policy and patrols: ${fmt(live.retained + live.intercepted, true)}`,
      ],
    ],
    doctrine: [
      "Doctrine",
      `${s.doctrine} insight`,
      `${s.unlocked.length} principles internalized`,
      `Doctrine is extracted from novel exposure when observers, telemetry, or surviving officers make the lesson transmissible.`,
      [
        `Current situation: ${situationForState(s).sector}`,
        `Atrocity Exposure: ${s.atrocityExposure.toFixed(0)}%`,
        `Reciprocity: ${s.reciprocity.toFixed(0)}%`,
      ],
    ],
  })[metric] as [string, string, string, string, string[]];

function Dot({ tone }: { tone: string }) {
  return <i className={`dot ${tone}`} />;
}
function Heading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="heading">
      <div>
        <h2>{title}</h2>
      </div>
      {note && <span>{note}</span>}
    </div>
  );
}
function MetricCard({
  label,
  value,
  note,
  tone = "",
  open,
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
  open: () => void;
}) {
  return (
    <button className="metric" data-semantic="INSPECT" onClick={open}>
      <span>
        <Dot tone={tone} />
        {label}
      </span>
      <b>{value}</b>
      <small>{note}</small>
      <em>Inspect →</em>
    </button>
  );
}
function Epigraph({
  quote,
  source,
  skin = "paper",
}: {
  quote: string;
  source: string;
  skin?: "paper" | "ink";
}) {
  return (
    <blockquote className={`epigraph epigraph--${skin}`}>
      <span>“{quote}”</span>
      <cite className="epigraph__source">— {source}</cite>
    </blockquote>
  );
}

function DoctrineControlPanel({
  s,
  select,
  epigraph,
}: {
  s: GameState;
  select: (v: DoctrineVector, stage: DoctrineStage) => void;
  epigraph: Aphorism | null;
}) {
  const [first] = DOCTRINES;
  const [selectedVector, setSelectedVector] = useState(first.id);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const vector = DOCTRINES.find((v) => v.id === selectedVector) ?? first;
  const stage = vector.stages.find((x) => x.id === selectedStage) ?? null;
  const index = stage ? vector.stages.findIndex((x) => x.id === stage.id) : -1;
  const unlocked = stage ? s.unlocked.includes(stage.id) : false;
  const prereq = stage
    ? index === 0 || s.unlocked.includes(vector.stages[index - 1].id)
    : false;
  const available = !!stage && !unlocked && prereq && s.doctrine >= stage.cost;
  return (
    <div className="module doctrine-page" data-module="DOCTRINE">
      <header>
        {epigraph && <Epigraph quote={epigraph.text} source={epigraph.source} />}
        <span className="eyebrow">
          Vectors of war // {s.doctrine} Insight Points available
        </span>
        <h1>Doctrine</h1>
        <p>
          Select a vector and principle from the same command hierarchy used
          throughout the campaign.
        </p>
      </header>
      <section className="os-window">
        <div className="os-titlebar">
          <span>DOCTRINE CONTROL PANEL</span>
          <b>
            {s.doctrine} INSIGHT POINTS // DAY {s.day}
          </b>
        </div>
        <div className="os-layout">
          <nav className="tree-menu doctrine-tree">
            {DOCTRINES.map((v) => (
              <section
                key={v.id}
                className={`tree-group ${v.forbidden ? "prohibited" : ""}`}
              >
                <button
                  className="tree-group-heading"
                  onClick={() => {
                    setSelectedVector(v.id);
                    setSelectedStage(null);
                  }}
                >
                  {v.forbidden ? "! " : "▦ "}
                  {v.label}
                  <small>
                    {v.stages.filter((x) => s.unlocked.includes(x.id)).length}/
                    {v.stages.length}
                  </small>
                </button>
                {v.stages.map((x, i) => {
                  const prior =
                    i === 0 || s.unlocked.includes(v.stages[i - 1].id);
                  const has = s.unlocked.includes(x.id);
                  const selected =
                    selectedVector === v.id && selectedStage === x.id;
                  return (
                    <button
                      aria-pressed={selected}
                      className={`${selected ? "selected" : ""} ${!prior ? "unresearchable" : ""}`}
                      onClick={() => {
                        setSelectedVector(v.id);
                        setSelectedStage((current) =>
                          current === x.id ? null : x.id,
                        );
                      }}
                      key={x.id}
                    >
                      <span>{has ? "☒" : prior ? "☐" : "⊘"}</span>
                      {x.label}
                      <small>
                        {has
                          ? "INTERNALIZED"
                          : prior
                            ? `${x.cost} IP`
                            : "LOCKED"}
                      </small>
                    </button>
                  );
                })}
              </section>
            ))}
          </nav>
          {stage ? (
            <article className="menu-inspector doctrine-inspector">
              <section className="selection-dossier doctrine-selection-dossier">
                <div className="menu-path">
                  DOCTRINE // {vector.label.toUpperCase()} //{" "}
                  {stage.label.toUpperCase()}
                </div>
                <h2>{stage.label}</h2>
                <div className="selection-classification">
                  <small>DOCTRINE LEARNING PATH</small>
                  <b>{vector.label}</b>
                </div>
                <p>{stage.description}</p>
              </section>
              <dl>
                <div>
                  <dt>VECTOR</dt>
                  <dd>{vector.label}</dd>
                </div>
                <div>
                  <dt>COST</dt>
                  <dd>{stage.cost} IP</dd>
                </div>
                <div>
                  <dt>STATUS</dt>
                  <dd>
                    {unlocked
                      ? "INTERNALIZED"
                      : available
                        ? "AVAILABLE"
                        : prereq
                          ? "INSUFFICIENT POINTS"
                          : "PREREQUISITE LOCKED"}
                  </dd>
                </div>
                <div>
                  <dt>AUTHORITY</dt>
                  <dd>{vector.authority}</dd>
                </div>
              </dl>
              <section className="doctrine-effect">
                <b>BATTLEFIELD EFFECT</b>
                <p>{stage.effect}</p>
                <small>
                  OUTPUT // {stage.output ?? "Operational Procedure"}
                </small>
                <small>
                  AFFECTS // {stage.affects ?? "Eligible formations"}
                </small>
              </section>
              <button
                className="os-primary"
                disabled={!available}
                onClick={() => select(vector, stage)}
              >
                {unlocked
                  ? "ALREADY INTERNALIZED"
                  : !prereq
                    ? `INTERNALIZE ${vector.stages[index - 1]?.label.toUpperCase()} FIRST`
                    : s.doctrine < stage.cost
                      ? `${stage.cost - s.doctrine} MORE INSIGHT REQUIRED`
                      : "REVIEW AND INTERNALIZE →"}
              </button>
              <div className="win-ledger">
                <h3>VERIFIED WIN INSIGHT LEDGER</h3>
                {s.doctrineWinAwards.length ? (
                  s.doctrineWinAwards.slice(0, 4).map((a) => (
                    <div key={`${a.day}-${a.action}`}>
                      <span>DAY {a.day}</span>
                      <b>{a.action}</b>
                      <small>{a.verified}</small>
                      <strong>+{a.reward} IP</strong>
                    </div>
                  ))
                ) : (
                  <p>NO VERIFIED WINS // MILITARY SUCCESS FUNDS DOCTRINE</p>
                )}
              </div>
            </article>
          ) : (
            <article className="menu-inspector doctrine-inspector doctrine-empty-state">
              <small>DOCTRINE // AWAITING PRINCIPLE</small>
              <b>NO PRINCIPLE SELECTED</b>
              <p>
                Select a principle to inspect its authority, cost, and
                battlefield effect. Select it again to clear the inspection.
              </p>
            </article>
          )}
        </div>
        <footer className="os-status">
          SELECT VECTOR → SELECT PRINCIPLE // SELECT AGAIN TO CLEAR → REVIEW
          EFFECT → CONFIRM
        </footer>
      </section>
    </div>
  );
}
const GLOSSARY: Record<
  string,
  { summary: string; body: string; related: string[] }
> = {
  "ava-command-interface": {
    summary:
      "Ava's command channel for reports, explanation, planning, and validated orders.",
    body: "Ava recognizes the campaign's named systems, current order handles, reports, comparisons, projections, and confirmation phrases. She asks for clarification when a command could touch more than one target and never enters an order without preserving its exact terms for confirmation. Raw Ava prompts are not retained in telemetry.",
    related: ["Ava Telemetry", "Actions", "Campaign Autosave"],
  },
  "ava-telemetry": {
    summary:
      "Aggregate evidence about how Ava's command interpretation performs.",
    body: "Ava telemetry records the compiled intent, execution or clarification outcome, failure class, parser rule, module, token-count band, and unresolved-token count. It does not store the player's raw command, account identity, cookies, advertising identifiers, or cross-site history.",
    related: ["Ava Command Interface", "Site Telemetry", "Privacy"],
  },
  "site-telemetry": {
    summary:
      "Minimal first-party aggregate measurement used to improve DELENDA.QUEST.",
    body: "The game directly counts module and wiki views, stable interface-element interactions, Ava compiler outcomes, and one terminal campaign outcome joined to cumulative decision counts. It uses no third-party analytics SDK, tracking cookie, fingerprint, ad profile, or raw Ava transcript.",
    related: ["Ava Telemetry", "Privacy", "Campaign Autosave"],
  },
  "daily-brief-interface": {
    summary:
      "ALT UX is an alternate renderer over the same authoritative campaign state.",
    body: "ALT UX changes information hierarchy, not game logic. Its Main Campaign and active alternate-front selections call the same command functions, consume the same three-order budget, enter the same decision ledger, and resolve through the same campaign circuits as Command Windows. Interface preference is stored locally and may be changed at any time.",
    related: ["Campaign Docket", "Actions", "Campaign Situation Substrate"],
  },
  "three-front-command-docket": {
    summary:
      "The daily command plan for the Main Campaign plus Domestic, Network, or both alternate fronts.",
    body: "The Main Campaign is always accompanied by at least one alternate front. Domestic only, Network only, and both occur at equal probability. The alternate-front corpus contains twelve Domestic and twelve Network mission families. Ninety-six authored incidents each have three campaign-time realizations, producing 288 distinct situations before current field evidence is bound.",
    related: ["Alt UX Interface", "Network Posture", "Owned Effects"],
  },
  "network-posture": {
    summary:
      "The current trade between command speed, transmission secrecy, and relay redundancy.",
    body: "Broadcast restores the most command tempo while reducing Intelligence security. Going dark increases Intelligence and preserves equipment while lowering network conversion and operational tempo. Distributed relays spend Equipment for moderate conversion and resilience. Each posture remains active until replaced and affects the Operations Circuit directly.",
    related: ["Command Network", "Campaign Docket", "Intelligence"],
  },
  "foreign-intelligence": {
    summary:
      "A diplomatic exchange in which classification is purchased with dependence, treasury, or political exposure.",
    body: "Fused exchange yields the broadest Intelligence increase and the largest Dependency. Compartmented liaison produces a narrower gain for modest Dependency and Treasury. Unilateral collection preserves foreign autonomy at substantially higher Treasury and Legitimacy cost. None is a scalar upgrade over another.",
    related: ["Diplomacy", "Dependency", "Intelligence"],
  },
  privacy: {
    summary: "The data-minimization boundary for game measurement.",
    body: "DELENDA.QUEST collects aggregate first-party product telemetry for game improvement. It does not sell or share telemetry for advertising, does not use cross-site identifiers, and does not retain raw Ava prompts. Account and friend data remain separate from telemetry. The public privacy notice must describe these categories and purposes.",
    related: ["Site Telemetry", "Ava Telemetry", "Account"],
  },
  uberscore: {
    summary: "Cumulative Player Rating earned when campaigns close.",
    body: "Each run produces a Campaign Score from completion, campaign minimum and maximum production, casualty control, inflicted casualties, and an exponential early-victory term. Day 28 is the acceleration pivot; only victories earn acceleration, and the bonus rises increasingly quickly toward the near-asymptotic Day 15 tail. Completion always earns credit; abandoned campaigns earn partial credit for played days. Base Player Rating is Campaign Score divided by ten, then friend and asynchronous same-seed match multipliers apply once at campaign close. Player Rating ranks the account and never changes campaign power.",
    related: ["Campaign Record", "Friend Multiplier", "Service Record"],
  },
  "friend-multiplier": {
    summary: "A social multiplier applied to Player Rating at campaign close.",
    body: "Each reciprocal connected friend adds 5% to Player Rating earned, up to ten friends and a maximum multiplier of ×1.50. Pending invitations do not count until the friendship activates. The multiplier never alters forces, kilometers, production, combat, or difficulty.",
    related: ["Player Rating", "Friends", "Campaign Record"],
  },
  "service-record": {
    summary: "The private profile ledger of every completed campaign.",
    body: "The Service Record lists every victory, defeat, and abandoned run, Campaign Score, Player Rating earned, multiplier at completion, exact-campaign rank, and the outward link to its public Campaign Record. The private Service Record contains account identity. Public artifacts use the player alias and never link back to private identity.",
    related: ["Campaign Record", "Player Rating", "Privacy"],
  },
  "campaign-record": {
    summary: "The canonical hosted artifact issued for one completed run.",
    body: "A Campaign Record contains the immutable result, score, decision ledger, completion-time multiplier, and scoring version. Its opaque public page shows a pseudonym, current cohort rank, post-campaign decision comparisons, portable copy controls, certificate fields, and the sealed link needed to play the same campaign. Score and orders never change; rank and aggregate choice percentages may update as the cohort grows.",
    related: [
      "Service Record",
      "Exact Campaign Challenge",
      "LinkedIn Certificate",
    ],
  },
  "exact-campaign-challenge": {
    summary: "A friend link that issues the same sealed campaign conditions.",
    body: "The challenge reuses the opening state, campaign seed, theater, adversary system, hidden opportunity schedule, reinforcement sequence, and fixed resolution law of the originating record. The challenger receives no technical seed or construction controls. Their own decisions create the divergence, and comparisons remain hidden until completion.",
    related: ["Campaign Record", "Campaign Seed", "Decision Comparison"],
  },
  "linkedin-certificate": {
    summary:
      "A literal LinkedIn credential shell backed by a public Campaign Record.",
    body: "The shell prepares the certificate name, DELENDA.QUEST issuer, issue date, credential ID, and canonical verification URL. It explicitly identifies a simulation accomplishment rather than military or professional accreditation. The official Add to Profile control remains dormant until a DELENDA.QUEST LinkedIn Page supplies the issuer identity; the hosted certificate and copy fields work independently.",
    related: ["Campaign Record", "Service Record", "Privacy"],
  },
  "net-flight": {
    summary:
      "Soldiers removed from Active Force after retention policy and patrol interception.",
    body: "Net Flight Today equals attempted desertions minus soldiers retained by policy minus soldiers intercepted by rear-area patrols. It is deducted from Armed Forces and Deployable Force continuously during the day. It is not a casualty and does not reduce Population.",
    related: ["Desertion Pressure", "Patrol Commitment", "Deployable Force"],
  },
  "desertion-pressure": {
    summary: "The daily rate driver for attempted desertion.",
    body: "Desertion Pressure is a 0–100 index. Casualties, low readiness, forced intake, poor legitimacy, and denied quarter increase it. Family rations, amnesty, and selected personnel policies reduce it. Each point raises the number of attempted desertions generated at resolution.",
    related: ["Net Flight Today", "Legitimacy", "Readiness"],
  },
  "patrol-commitment": {
    summary: "Rear-area personnel assigned to intercept deserters.",
    body: "Patrol Commitment removes soldiers from useful frontline employment in exchange for intercepting a share of attempted desertions. Establish Desertion Patrols under MILITARY // PERSONNEL SUSTAINMENT // PROCESS DESERTION to increase it.",
    related: ["Process Desertion", "Net Flight Today", "Resistance"],
  },
  doctrine: {
    summary: "Institutional insight extracted from observed risk and failure.",
    body: "Doctrine is spent to internalize principles along Doctrine vectors. Risky directives and maneuvers generate insight when observation survives. Doctrine changes battlefield rules and unlocks further stages.",
    related: ["Doctrine Vector", "Observation Survival", "Risk Class"],
  },
  readiness: {
    summary:
      "The fraction of a force able to perform its assigned mission now.",
    body: "Readiness multiplies deployable manpower when combat power is calculated. Tempo, shortages, weak replacements, and losses reduce it. Rest, training quality, and selected policies restore it.",
    related: ["Deployable Force", "Equipment Coverage", "Operational Tempo"],
  },
  resolution: {
    summary: "The authoritative end-of-day reckoning.",
    body: "Resolution applies scheduled arrivals, active policies, production, recruitment, combat, desertion, Doctrine observation, public reaction, and front movement in a fixed order. Seeded contingent events are resolved here, never by narrative text.",
    related: ["Owned Effects", "Contingent Effects", "Butcher's Bill"],
  },
  "campaign-situation-substrate": {
    summary:
      "The campaign process that turns persistent theater state into one stored daily operational problem.",
    body: "Headquarters weighs authored battlefield conditions against theater geometry, active facts, recent history, and the day's Strategic Condition. The chosen Situation Packet is stored for the entire day so inspection and preparatory orders cannot change it.",
    related: [
      "Situation Gate",
      "Operational Fact",
      "Theater Sector",
      "Resolution Ticket",
      "Outcome Margin",
    ],
  },
  "situation-gate": {
    summary: "A typed eligibility rule attached to a Situation Blueprint.",
    body: "Gates may test theater, campaign phase, operational bands, scalar thresholds, active facts, or recent history. A blueprint can be selected only when its required gate passes and its forbidden gate does not. Gates select problems; they never resolve outcomes.",
    related: [
      "Campaign Situation Substrate",
      "Situation Blueprint",
      "Operational Band",
    ],
  },
  "resolution-ticket": {
    summary:
      "The sealed identity used to resolve one daily Situation Packet.",
    body: "The ticket is derived from content-pack version, campaign seed, day, blueprint, and target sector. Maneuver identity is added when the result is calculated. Preview and final resolution use the same ticket, preventing reloads, screen changes, or Ava from rerolling the day.",
    related: ["Campaign Seed", "Outcome Margin", "Resolution"],
  },
  "standing-order": {
    summary:
      "The disclosed action prosecuted when no campaign maneuver is issued.",
    body: "Every Situation Blueprint defines a Standing Order. If the player spends all three daily orders elsewhere, the operation resolves under standing tempo and produces no verified-win Insight Points.",
    related: ["Campaign Maneuver", "Actions", "Resolution"],
  },
  "operational-fact": {
    summary:
      "A persistent, typed battlefield consequence that can alter future situation eligibility.",
    body: "Operational Facts belong to the theater or a specific sector, record their source and creation day, and may expire. Results such as a restored command net, spent reserve, breached obstacle, or exposed crossing remain in state and become inputs to future gates.",
    related: [
      "Theater Sector",
      "Situation Gate",
      "Campaign Situation Substrate",
    ],
  },
  "theater-sector": {
    summary: "A persistent node in the campaign theater graph.",
    body: "Each theater contains six connected sectors. A sector records terrain, ground, network condition, supply access, infrastructure, fortification, local control, and estimated friendly and enemy force. Maneuver aftermath changes the target sector instead of merely changing a global front number.",
    related: ["Operational Fact", "Campaign Theater", "Front Movement"],
  },
  "operational-band": {
    summary:
      "A named state bucket used to make situation gates readable and testable.",
    body: "The compiler derives bands for front posture, force ratio, readiness, supply, reserve depth, network, intelligence, enemy posture, domestic state, and infrastructure. Bands summarize exact state without replacing it; the exact numbers remain authoritative in resolution circuits.",
    related: [
      "Situation Gate",
      "Campaign Situation Substrate",
      "Execution Confidence",
    ],
  },
  "outcome-margin": {
    summary:
      "Execution Confidence minus sealed field friction.",
    body: "Margin selects one of four result bands: Clean Execution at +20 points or better; Executed With Friction from 0 through +19.9; Disrupted below 0 through −20; Operational Collapse worse than −20. The band scales pressure, losses, and persistent aftermath. Positive bands count as verified wins.",
    related: ["Execution Confidence", "Resolution Ticket", "Operational Fact"],
  },
  pressure: {
    summary: "A directional modifier to battlefield front movement.",
    body: "Battlefield Pressure is the combined push or retreat contribution from Operational Tempo, the selected Maneuver, force ratio, intelligence, shortages, and active methods. Positive Pressure tends to move the front forward; negative Pressure tends to concede ground. It is not Desertion Pressure.",
    related: ["Front Movement", "Operational Tempo", "Force Ratio"],
  },
  "insight-points": {
    summary:
      "Verified battlefield insight spent to internalize Doctrine Techs.",
    body: "Insight Points are awarded only when a committed military maneuver succeeds. Award = max(10, rounded verified enemy losses ÷ 1,000 × 8 + positive front movement × 20). Failed maneuvers and standing tempo earn zero. Points remain available until spent.",
    related: ["Doctrine", "Verified Win", "Enemy Losses"],
  },
  "verified-win": {
    summary:
      "A committed maneuver whose outcome margin resolves at zero or better.",
    body: "Clean Execution and Executed With Friction are Verified Wins. Disrupted and Operational Collapse are not. Standing tempo alone cannot earn Insight Points. The result packet records the margin band, maneuver, enemy losses, ground movement, and award.",
    related: ["Insight Points", "Outcome Margin", "Campaign Maneuver"],
  },
  "deployable-force": {
    summary:
      "Armed personnel currently available to produce battlefield power.",
    body: "Deployable Force starts from trained Armed Forces and loses casualties, net desertion, and rear-area commitments. It is multiplied by Readiness and Equipment Coverage to calculate Effective Force.",
    related: ["Readiness", "Equipment Coverage", "Net Flight Today"],
  },
  "equipment-coverage": {
    summary: "Share of the field requirement covered by serviceable assigned equipment.",
    body: "Equipment Coverage multiplies Deployable Force in effective-force calculation. Casualties and shortages reduce it; industrial and external-supply directives can restore it.",
    related: ["Deployable Force", "Materiel Condition", "Production"],
  },
  "materiel-condition": {
    summary:
      "Industrial uptime, maintenance health, rail throughput, and repair debt.",
    body: "Materiel Condition modifies production output. High tempo and deferred maintenance reduce it. Maintenance, dispersal, and external support restore it.",
    related: ["Production", "Equipment Coverage", "Supply"],
  },
  "operational-tempo": {
    summary:
      "Standing rate at which the army exchanges supply and casualties for pressure.",
    body: "Hold, Methodical, Surge, and Human Wave set casualty, supply-use, and battlefield-pressure multipliers. Tempo remains active until replaced and resolves every day.",
    related: ["Pressure", "Casualties", "Supply"],
  },
  "owned-effects": {
    summary: "Immediate state changes guaranteed when an order is confirmed.",
    body: "Owned Effects are exact, player-controlled changes applied at commitment or on a declared schedule. They do not depend on enemy response or a probability check.",
    related: ["Contingent Effects", "Resolution", "Rotation Lock"],
  },
  "contingent-effects": {
    summary: "Bounded outcomes not known until day resolution.",
    body: "Contingent Effects disclose their range or success probability before commitment. Campaign seed and authoritative state resolve them; Ava never chooses the result.",
    related: ["Owned Effects", "Success Estimate", "Resolution"],
  },
  "rotation-lock": {
    summary:
      "Number of days before an issue family may receive another directive.",
    body: "Issuing a directive locks its whole issue family for the displayed duration. Inspection remains available while locked; standing policy continues.",
    related: ["Directive", "Actions", "Standing Policy"],
  },
  actions: {
    summary: "The three shared command orders available each campaign day.",
    body: "The campaign exposes five command categories. Production directives, Military directives, Diplomacy directives, and campaign maneuvers draw from one three-order budget; Doctrine uses earned Insight Points instead. Orders are freely allocated and unspent orders do not carry forward.",
    related: ["Directive", "Campaign Maneuver", "Resolution"],
  },
  "front-movement": {
    summary:
      "Daily change in controlled ground on the selected campaign theater axis.",
    body: "Front Movement is produced by Pressure, force ratio, intelligence, shortages, Doctrine effects, and the selected maneuver. Reach +12 km to win; fall to −12 km to lose operationally.",
    related: ["Pressure", "Effective Force", "Victory"],
  },
  "success-estimate": {
    summary:
      "Displayed Execution Confidence used to calculate a maneuver's four-band outcome margin.",
    body: "The percentage is known before confirmation. At resolution the sealed field-friction draw is subtracted from Execution Confidence. The resulting margin selects Clean Execution, Executed With Friction, Disrupted, or Operational Collapse; it is not a promise about strategic payoff.",
    related: ["Outcome Margin", "Contingent Effects", "Insight Points"],
  },
  "campaign-seed": {
    summary:
      "The reproducible numeric key for a campaign's hidden event sequence.",
    body: "The Campaign Seed selects the daily situation rotation and every contingent resolution roll. The same seed, theater, state archetype, adversary system, orders, and authoritative state reproduce the same outcomes. The seed does not replace player choice; it makes uncertainty auditable.",
    related: ["Resolution", "Contingent Effects", "Campaign Theater"],
  },
  "campaign-theater": {
    summary:
      "The situation corpus and battlefield conversion profile used by a campaign.",
    body: "Theater determines which daily strategic situations may appear. Lowland, Ridge, Industrial, and River theaters use different terrain, ground, frontage, network, and supply constraints in Operations resolution.",
    related: ["Campaign Seed", "Pressure", "Operations"],
  },
  "state-archetype": {
    summary:
      "A fixed opening-state package with explicit strengths and inherited liabilities.",
    body: "State Archetype changes opening population, force, production, treasury, legitimacy, dependency, or doctrine. Its listed effects are owned and exact. It does not alter the three-order daily budget.",
    related: ["Owned Effects", "Campaign Seed", "Actions"],
  },
  "adversary-personality": {
    summary:
      "The persistent rule set governing how the enemy learns, preserves force, and applies pressure.",
    body: "Adversary Personality changes starting enemy authority and ongoing adversary-circuit behavior. Attritional, Adaptive, Opportunist, and Cautious systems use different reinforcement, adaptation, pressure, and reconstitution rules.",
    related: ["Enemy Orders", "Enemy Adaptation", "Execution Confidence"],
  },
  "campaign-autosave": {
    summary:
      "An account-owned command record written whenever authoritative campaign state changes.",
    body: "Autosave preserves the active campaign state and current day clock under the signed-in account, with a device copy retained only as a recovery layer. Reloading or changing devices resumes the account record. A newly generated campaign replaces the prior active account campaign after confirmation.",
    related: ["Command Continuity", "Campaign Seed", "Resolution"],
  },
  "campaign-event-director": {
    summary:
      "The campaign authority that assigns every day a war phase and one strategic condition.",
    body: "The Director combines the current day band with a seed-selected condition. Phase and event modifiers are disclosed before orders and then applied to industrial output, supply use, casualties, desertion, execution confidence, front pressure, maintenance, treasury, legitimacy, or resistance. Critical state thresholds can replace the regular seeded condition with a Reactive Crisis.",
    related: [
      "Campaign Phase",
      "Strategic Condition",
      "Reactive Crisis",
      "Resolution",
    ],
  },
  "campaign-phase": {
    summary:
      "A named campaign interval that changes the baseline cost of continuing the war.",
    body: "Days 1–5 are Contact and Classification; 6–12 Operational Compression; 13–20 The Exhaustion Season; 21–30 Terminal Operations. Phase modifiers combine with the day's Strategic Condition and apply to the campaign ledgers at resolution.",
    related: ["Campaign Event Director", "Strategic Condition", "Resolution"],
  },
  "strategic-condition": {
    summary:
      "The disclosed daily event that changes one or more authoritative resolution factors.",
    body: "A Strategic Condition is selected reproducibly from the active Campaign Phase and Campaign Seed unless an eligible Reactive Crisis is active. The condition remains fixed for the day, its exact modifiers are visible before commitment, and the resolved event enters the Condition Ledger.",
    related: ["Campaign Event Director", "Campaign Phase", "Reactive Crisis"],
  },
  "reactive-crisis": {
    summary:
      "A strategic condition selected by an authoritative state threshold instead of the regular seed deck.",
    body: "Reactive Crises currently trigger when Munitions coverage falls below 2 days, Resistance reaches 55, Readiness falls below 42, or Dependency reaches 55. The same crisis cannot replace itself on immediately consecutive days, but may recur after an intervening condition while its threshold remains active.",
    related: [
      "Strategic Condition",
      "Munitions Coverage",
      "Resistance",
      "Readiness",
      "Dependency",
    ],
  },
  "atrocity-exposure": {
    summary: "Accumulated evidence that prohibited methods were authorized.",
    body: "Exposure reduces legitimacy and enables diplomatic and reciprocal consequences. It persists beyond the immediate tactical benefit.",
    related: ["Reciprocity", "Legitimacy", "Prohibited Methods"],
  },
  reciprocity: {
    summary:
      "Expectation that surrender, custody, and restraint remain mutually available.",
    body: "Low Reciprocity increases desertion pressure and hardens later violence. Prohibited methods reduce it; selected diplomatic and custody policies may preserve it.",
    related: ["Atrocity Exposure", "Desertion Pressure", "Legitimacy"],
  },
  intelligence: {
    summary:
      "Quality of classification used in battlefield conversion and estimates.",
    body: "Intelligence improves pressure conversion and the reliability of displayed battlefield estimates. It is gained through reconnaissance, statecraft, networks, and Doctrine.",
    related: ["Success Estimate", "Pressure", "Drone War"],
  },
  production: {
    summary: "Daily conversion of industrial allocation into war stocks.",
    body: "Each line has allocation, output, use, stock, and days of coverage. Materiel Condition and production focus affect output; tempo and maneuvers affect use.",
    related: ["Materiel Condition", "Supply", "Coverage"],
  },
  legitimacy: {
    summary:
      "Public willingness to accept the state's losses, coercion, and account of the war.",
    body: "Casualties, atrocities, shortages, and coercive policies reduce Legitimacy. Low Legitimacy raises resistance and desertion pressure and can end the campaign.",
    related: ["Resistance", "Desertion Pressure", "Atrocity Exposure"],
  },
  "force-reconstitution": {
    summary:
      "Doctrine affinity concerned with preserving, rebuilding, and returning formations to usefulness.",
    body: "Force Reconstitution is the Doctrine category associated with withdrawal, reserve preservation, casualty control, equipment recovery, and rebuilding combat power. A maneuver carrying this label can generate Doctrine evidence for that category when its battlefield result is verified. It is a classification, not an immediate bonus.",
    related: ["Insight Points", "Deployable Force", "Readiness"],
  },
  "training-queue": {
    summary: "Recruits waiting to be admitted into active training cohorts.",
    body: "The Training Queue receives daily voluntary plus forced intake and loses the number admitted up to Training Capacity. It does not add directly to Armed Forces. Recruits become soldiers only after admission, training duration, and quality-adjusted graduation.",
    related: ["Training Capacity", "Training Duration", "Armed Forces"],
  },
  "training-capacity": {
    summary:
      "Maximum recruits the induction system can admit into training per day.",
    body: "Capacity removes recruits from the queue and places them into the conversion pipeline. Capacity above intake reduces backlog. Capacity below intake causes the queue and estimated wait to grow.",
    related: ["Training Queue", "Enlistment", "Graduates"],
  },
  "training-duration": {
    summary:
      "Nominal number of days required to convert an admitted recruit into a graduate.",
    body: "Shorter standards produce graduates sooner but generally reduce quality. Daily graduates equal admitted recruits divided by duration, adjusted by training quality.",
    related: ["Training Capacity", "Training Quality", "Graduates"],
  },
  "training-quality": {
    summary:
      "Quality modifier applied when admitted recruits become usable soldiers.",
    body: "Training Quality reduces or preserves the share of a cohort that becomes effective graduates. Compressed standards and emergency field training reduce it; academies and full standards improve it.",
    related: ["Training Duration", "Graduates", "Readiness"],
  },
  graduates: {
    summary:
      "Quality-adjusted trained personnel added to Armed Forces at resolution.",
    body: "Graduates are calculated from the admitted cohort divided by Training Duration and multiplied by the quality conversion factor. They replenish Armed Forces and partly replenish Deployable Force.",
    related: ["Training Queue", "Training Capacity", "Armed Forces"],
  },
};
function Term({
  id,
  children,
}: {
  id: keyof typeof GLOSSARY;
  children: React.ReactNode;
}) {
  const g = GLOSSARY[id];
  return (
    <Bubblette
      id={id}
      title={String(children)}
      summary={g.summary}
      className="term inline-concept-bubblette"
      details={[{ label: "FIELD CONSEQUENCE", value: g.body }]}
    >
      {children}
    </Bubblette>
  );
}
function RegistryConcept({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const c = CONCEPTS[id];
  if (!c) return <span>{children}</span>;
  return (
    <Bubblette
      id={id}
      title={c.label}
      summary={c.definition}
      className="term inline-concept-bubblette"
      details={[
        ...(c.normal
          ? [{ label: "NORMAL", value: c.normal, conceptId: id }]
          : []),
        { label: "CONSEQUENCE", value: c.consequence, conceptId: id },
      ]}
    >
      {children}
    </Bubblette>
  );
}
const conceptSlug = (x: string) =>
  x
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
function WikiConcept({
  id,
  label,
  qualifier,
}: {
  id: string;
  label: string;
  qualifier?: string;
}) {
  const concept = CONCEPTS[id],
    glossary = GLOSSARY[id];
  return (
    <Bubblette
      id={id}
      title={label}
      summary={
        concept?.definition ??
        glossary?.summary ??
        `Doctrine classification associated with ${label}.`
      }
      className="concept-link inline-concept-bubblette"
      details={[
        ...(qualifier ? [{ label: "CLASS", value: qualifier }] : []),
        ...(concept
          ? [
              {
                label: "CONSEQUENCE",
                value: concept.consequence,
                conceptId: id,
              },
            ]
          : glossary
            ? [{ label: "FIELD CONSEQUENCE", value: glossary.body }]
            : []),
      ]}
    >
      <span>
        {qualifier && <small>{qualifier}</small>}
        {label}
      </span>
    </Bubblette>
  );
}
function ReportDatum({
  id,
  label,
  value,
  summary,
  details = [],
}: {
  id: string;
  label: string;
  value: string;
  summary: string;
  details?: Array<string | BubbletteDetail>;
}) {
  const parsed: BubbletteDetail[] = details.flatMap((detail) => {
    if (typeof detail !== "string") return [detail];
    const [name, ...rest] = detail.split(" // "),
      value = rest.join(" // ");
    if (name === "LEVERS")
      return value.split(/,\s*/).map((lever) =>
        lever === "STATECRAFT"
          ? {
              label: lever,
              value: "FOREIGN CLASSIFICATION",
              conceptId: "intelligence",
              control: {
                label: "Conduct Statecraft",
                module: "diplomacy",
                family: "statecraft",
              },
            }
          : lever === "NETWORK OPERATIONS"
            ? {
                label: lever,
                value: "COMMAND CONVERSION",
                conceptId: "command-network",
                control: {
                  label: "Authenticate Orders",
                  module: "military",
                  family: "network-authentication",
                },
              }
            : {
                label: lever,
                value: "CAMPAIGN INTELLIGENCE",
                conceptId: "target-of-opportunity",
                control: { label: "Open Campaign", module: "campaign" },
              },
      );
    const inferred: Record<string, string> = {
      "POWER CONVERSION": "intelligence",
      "CONFIDENCE CONTRIBUTION": "execution-confidence",
      "ORDERS CLASSIFIED": "enemy-orders",
    };
    return [{ label: name, value, conceptId: inferred[name] }];
  });
  return (
    <Bubblette
      id={id}
      title={label}
      summary={summary}
      details={parsed}
      className="report-datum"
    >
      <small>{label}</small>
      <b>{value}</b>
    </Bubblette>
  );
}
function EffectLine({ text, s }: { text: string; s: GameState }) {
  const commit = text.match(/Commit ([\d,]+) deployable soldiers/i);
  const exposure = text.match(/Loss exposure: ([\d,]+) to ([\d,]+)/i);
  if (commit) {
    const n = Number(commit[1].replaceAll(",", ""));
    return (
      <li>
        <Bubblette
          id="force-commitment"
          title="Force Commitment"
          summary="The portion of operationally available force assigned to this maneuver."
          details={[
            {
              label: "ARMED FORCES NOW",
              value: fmt(s.armed, true),
              conceptId: "deployable-force",
            },
            {
              label: "DEPLOYABLE NOW",
              value: fmt(s.deployable, true),
              conceptId: "deployable-force",
            },
            {
              label: "PROPOSED COMMITMENT",
              value: `${fmt(n, true)} // ${((n / s.deployable) * 100).toFixed(1)}%`,
              conceptId: "force-commitment",
            },
            {
              label: "UNCOMMITTED DEPLOYABLE",
              value: fmt(s.deployable - n, true),
              conceptId: "deployable-force",
            },
          ]}
          className="effect-info"
        >
          {text}
        </Bubblette>
      </li>
    );
  }
  if (exposure) {
    const low = Number(exposure[1].replaceAll(",", "")),
      high = Number(exposure[2].replaceAll(",", ""));
    return (
      <li>
        <Bubblette
          id="casualty-exposure"
          title="Loss Exposure"
          summary="The disclosed friendly-loss envelope across possible result bands."
          details={[
            {
              label: "LOW",
              value: `${fmt(low, true)} // ${((low / s.deployable) * 100).toFixed(1)}%`,
              conceptId: "casualty-exposure",
            },
            {
              label: "HIGH",
              value: `${fmt(high, true)} // ${((high / s.deployable) * 100).toFixed(1)}%`,
              conceptId: "casualty-exposure",
            },
            {
              label: "DEPLOYABLE BASIS",
              value: fmt(s.deployable, true),
              conceptId: "deployable-force",
            },
          ]}
          className="effect-info"
        >
          {text}
        </Bubblette>
      </li>
    );
  }
  return (
    <li title="This effect is applied when the operational order is issued.">
      {text}
    </li>
  );
}
function SignalStream({ s, live }: { s: GameState; live: Live }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1800);
    return () => window.clearInterval(id);
  }, []);
  const director = directorForState(s);
  const feed = [
    `FIELD CONDITION // ${director.event.label.toUpperCase()}`,
    `${s.theater.toUpperCase()} THEATER // ${fmtStrategic(live.losses)} LOSSES ENTERED IN CURRENT BILL`,
    `INDUCTION BUREAU // ${fmt(s.queue, true)} PERSONS AWAITING TRAINING DISPOSITION`,
    `COUNTERBATTERY // UNCLASSIFIED EMITTER MOVED BEYOND GRID REFERENCE`,
    `18TH FORMATION // EQUIPMENT COVERAGE ${s.equipment.toFixed(0)} PERCENT`,
    `RAIL AUTHORITY // PRIORITY MUNITIONS CONSIST CLEARED JUNCTION`,
    `PERSONNEL CONTROL // ${fmtStrategic(live.deserted)} ATTEMPTS // ${fmtStrategic(live.retained)} RETAINED // ${fmtStrategic(live.intercepted)} INTERCEPTED // ${fmtStrategic(live.netDesertion)} NET FLIGHT`,
    `PATTERN ANALYSIS // ${s.doctrine} INSIGHT POINTS AVAILABLE`,
    `FIELD WEATHER // LOW CLOUD BASE // ROTARY FLIGHT RESTRICTED`,
    `SIGNAL COMPANY // RELAY HANDSHAKE RESTORED FOR FORTY-SEVEN SECONDS`,
    `SUPPLY DIRECTORATE // MUNITIONS COVERAGE ${coverage(s, "munitions").toFixed(1)} DAYS`,
  ];
  const ordered = [
    ...feed.slice(tick % feed.length),
    ...feed.slice(0, tick % feed.length),
  ];
  return (
    <section className="signals-live">
      <div className="signals-head">
        <span>SIGNALS TRAFFIC // CONTINUOUS</span>
        <b>LIVE</b>
      </div>
      <div className="signals-crawl">
        <div>
          {[...ordered, ...ordered].map((x, i) => (
            <span key={`${tick}-${i}`}>
              <time suppressHydrationWarning>
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
              {x}
            </span>
          ))}
        </div>
      </div>
      <div className="signals-stack">
        {ordered.slice(0, 4).map((x, i) => (
          <button
            title="Signals traffic reports current campaign conditions."
            key={x}
          >
            <time>T+{String(i * 18).padStart(3, "0")}</time>
            <span>{x}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function WarClock({ remaining }: { remaining: number }) {
  return (
    <div
      className="war-clock"
      data-semantic="STATUS"
      aria-label="Day resolution clock"
    >
      <span>DAY RESOLUTION</span>
      <b aria-hidden="true" suppressHydrationWarning>
        {clockText(remaining)}
      </b>
      <small>
        {remaining <= 0 ? "RESOLUTION DUE" : "standing orders remain active"}
      </small>
    </div>
  );
}

function SituationNarrative({
  situation,
  preserveOperationalBlock = false,
}: {
  situation: ReturnType<typeof situationForState>;
  preserveOperationalBlock?: boolean;
}) {
  const operationalBlock = (
    <>
      <h2>{situation.headline}</h2>
      <p>{situation.briefing}</p>
      <div className="conditions">
        <span>
          Terrain <b>{situation.terrain}</b>
        </span>
        <span>
          Ground <b>{situation.ground}</b>
        </span>
        <span>
          Network <b>{situation.network}</b>
        </span>
        <span>
          Supply <b>{situation.supply}</b>
        </span>
        <span>
          Intel <b>{situation.intelligence}</b>
        </span>
      </div>
    </>
  );
  return (
    <div className="situation-body">
      <Epigraph
        quote={situation.quote}
        source={situation.attribution}
        skin="ink"
      />
      {preserveOperationalBlock ? (
        <div className="campaign-operational-block">{operationalBlock}</div>
      ) : (
        operationalBlock
      )}
    </div>
  );
}

function SituationCard({
  s,
  openCampaign,
}: {
  s: GameState;
  openCampaign: () => void;
}) {
  const situation = situationForState(s);
  const order = maneuverForState(s,s.maneuver);
  return (
    <section
      className={`situation-card ${order ? "ordered" : ""}`}
      data-overprint={situation.sector.toUpperCase()}
    >
      <div className="situation-index">
        <span>DAILY STRATEGIC SITUATION</span>
        <b>{situation.sector}</b>
        <small>{situation.windowHours} HOUR OPPORTUNITY WINDOW</small>
      </div>
      <SituationNarrative situation={situation} />
      <div className="situation-order">
        <h3>{situation.question}</h3>
        {order ? (
          <>
            <small>ORDER ISSUED</small>
            <b>{order.label}</b>
            <p>{order.flavor}</p>
            <button onClick={openCampaign}>Open Campaign →</button>
          </>
        ) : (
          <>
            <p>
              No maneuver has been issued. The standing operational tempo will
              prosecute the day by default.
            </p>
            <button onClick={openCampaign}>Open Campaign →</button>
          </>
        )}
      </div>
    </section>
  );
}

function LiveLedger({
  s,
  live,
  inspect,
}: {
  s: GameState;
  live: Live;
  inspect: (m: Metric) => void;
}) {
  const estimate = estimateDay(s);
  return (
    <section>
      <Heading
        title="Live Expenditure"
        note="Projected from authoritative daily rates"
      />
      <div className="live-ledger">
        <button onClick={() => inspect("armed")}>
          <span>Deployable Force</span>
          <b>{fmtStrategic(live.deployable)}</b>
          <small>
            {live.losses + live.netDesertion >= 50
              ? `-${fmtStrategic(live.losses + live.netDesertion)}`
              : "0"}{" "}
            today
          </small>
        </button>
        <button onClick={() => inspect("armed")}>
          <span>Combat Losses</span>
          <b className="red-number">{fmtStrategic(live.losses)}</b>
          <small>{fmtStrategic(estimate.casualty)} projected by dusk</small>
        </button>
        <button
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("open-family", { detail: "desertion" }),
            )
          }
        >
          <span>Desertions</span>
          <b>{fmtStrategic(live.netDesertion)}</b>
          <small>Actual Net Flight Today</small>
        </button>
        <button onClick={() => inspect("materiel")}>
          <span>Munitions</span>
          <b>{fmt(live.production.munitions, true)}</b>
          <small>Stockpile</small>
        </button>
        <button onClick={() => inspect("doctrine")}>
          <span>Doctrine</span>
          <b>{s.doctrine}</b>
          <small>institutional insight</small>
        </button>
      </div>
    </section>
  );
}

function CommandStoryboard({
  s,
  live,
  inspect,
  openCampaign,
}: {
  s: GameState;
  live: Live;
  inspect: (m: Metric) => void;
  openCampaign: () => void;
}) {
  const latest = s.reports[0];
  const [balance, tone] = assessment(s);
  const production = projectProduction(s),
    force = projectForceGeneration(s),
    operation = projectOperations(s),
    shortages = production.lines.filter(
      (line) => line.status === "critical",
    ).length,
    readinessChange =
      (force.effectiveGraduates > operation.friendlyLosses ? 0.7 : -1.2) -
      shortages * 0.55;
  const attr: [
    [Metric, string, number, string],
    [Metric, string, number, string],
    [Metric, string, number, string],
  ] = [
    [
      "readiness",
      "Soldiers",
      s.readiness,
      `${readinessChange >= 0 ? "+" : ""}${readinessChange.toFixed(1)} / DAY`,
    ],
    [
      "materiel",
      "Industrial Condition",
      s.materiel,
      `${production.materielChange >= 0 ? "+" : ""}${production.materielChange.toFixed(1)} / DAY`,
    ],
    [
      "equipment",
      "Equipment",
      s.equipment,
      `+${production.equipmentRecovery.toFixed(2)} POINTS / DAY`,
    ],
  ];
  return (
    <div className="dash" data-command-storyboard="restored">
      <div className="dash-main">
        <SituationCard s={s} openCampaign={openCampaign} />
        <section className="command-geometry">
          <Heading title={`${s.theater.toUpperCase()} Theater Geometry`} />
          <TheaterGeometry s={s} variant="command" />
        </section>
        <section className={`morning ${latest.tone}`}>
          <Epigraph
            quote={
              latest.epigraph ??
              "The report is complete when the missing figures stop being requested."
            }
            source={
              latest.day === 1
                ? "COMM. HET CLAXTON, Praetor Corps, Third Division"
                : "CAMPAIGN ARCHIVE"
            }
          />
          <div className="morning-copy">
            <span className="eyebrow">Morning report // Day {latest.day}</span>
            <h1>{latest.title}</h1>
            <div className="morning-prose">
              {latest.body.split(/\n{2,}/).map((paragraph, index) => (
                <p key={`${latest.day}-${index}`}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
        <LiveLedger s={s} live={live} inspect={inspect} />
        <section>
          <Heading
            title="Production Capacity"
            note="What the state can still convert"
          />
          <div className="metrics">
            <MetricCard
              label="Population"
              value={fmt(s.population)}
              note={`${fmt(s.workforce)} workforce`}
              open={() => inspect("population")}
            />
            <MetricCard
              label="Armed Forces"
              value={fmt(live.armed)}
              note={`${fmt(live.deployable)} deployable`}
              tone={s.readiness < 50 ? "bad" : "warn"}
              open={() => inspect("armed")}
            />
            <MetricCard
              label="Enlistment"
              value={`${fmt(s.voluntary + s.forced)}/d`}
              note={`${fmt(s.queue)} awaiting induction`}
              tone={s.queue > s.training * 2 ? "bad" : "warn"}
              open={() => inspect("enlistment")}
            />
            <MetricCard
              label="Training"
              value={`${fmt(s.training)}/d`}
              note={`${s.duration} days at ${s.quality.toFixed(0)}% quality`}
              open={() => inspect("training")}
            />
          </div>
        </section>
        <section>
          <Heading
            title="Industrial Throughput"
            note="Current industrial position"
          />
          <div className="production">
            <div className="prod-row head">
              <span>Allocation</span>
              <span>Production</span>
              <span>Current</span>
              <span>Required</span>
              <span>Live Stock</span>
              <span>Balance</span>
            </div>
            {(Object.keys(s.production) as Resource[]).map((resource) => {
              const allocation = s.production[resource];
              const projected = production.lines.find(
                (line) => line.resource === resource,
              )!;
              return (
                <button
                  className="prod-row"
                  key={resource}
                  onClick={() =>
                    inspect(resource === "munitions" ? "materiel" : "equipment")
                  }
                >
                  <span>{allocation.allocation}%</span>
                  <strong>
                    <i className={resource} />
                    {resourceLabel[resource]}
                  </strong>
                  <span>
                    <b>{fmt(projected.output)}</b>
                  </span>
                  <span>{fmt(projected.desiredOutput)}</span>
                  <span>{fmt(live.production[resource])}</span>
                  <span
                    className={
                      projected.equilibrium < 0
                        ? "bad-text"
                        : projected.equilibrium > 0
                          ? "good-text"
                          : "warn-text"
                    }
                  >
                    {projected.equilibrium > 0 ? "+" : ""}
                    {fmt(projected.equilibrium)}{" "}
                    {projected.equilibrium === 0
                      ? "EQUILIBRIUM"
                      : projected.equilibrium > 0
                        ? "SURPLUS"
                        : "DEFICIT"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <Heading
            title="Systemic Attrition"
            note="0 is failure // 100 is nominal"
          />
          <div className="attrition">
            {attr.map(([id, label, value, note]) => (
              <button key={id} onClick={() => inspect(id)}>
                <div>
                  <span>{label}</span>
                  <b>{value.toFixed(0)}%</b>
                </div>
                <i>
                  <em style={{ width: `${value}%` }} />
                </i>
                <small>{note}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
      <aside className="rail">
        <section>
          <span className="eyebrow">Strategic balance</span>
          <h2>
            <Dot tone={tone} />
            {balance}
          </h2>
          <div className="forces">
            <div>
              <small>Your local effective force</small>
              <b>{fmt(operation.friendlyPower)}</b>
            </div>
            <span>vs</span>
            <div>
              <small>Enemy local effective force</small>
              <b>{fmt(operation.enemyPower)}</b>
            </div>
          </div>
          <button className="frontline" onClick={() => inspect("front")}>
            <i
              style={{
                left: `${Math.max(2, Math.min(98, ((s.front + 12) / 24) * 100))}%`,
              }}
            />
          </button>
          <div className="ends">
            <span>-12 defeat</span>
            <b>
              {s.front >= 0 ? "+" : ""}
              {s.front.toFixed(1)} km
            </b>
            <span>+12 victory</span>
          </div>
          <small className="force-ratio-audit">
            LITERAL RATIO {operation.forceRatio.toFixed(2)} // ATTRITION
            CALCULUS {operation.boundedForceRatio.toFixed(2)}
          </small>
        </section>
        <section>
          <span className="eyebrow">Personnel leakage</span>
          <button
            className="railstat"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-family", { detail: "desertion" }),
              )
            }
          >
            <span>Attempted flight</span>
            <b>{fmtStrategic(live.deserted)}</b>
          </button>
          <button
            className="railstat"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-family", { detail: "desertion" }),
              )
            }
          >
            <span>Retained by policy</span>
            <b>{fmtStrategic(live.retained)}</b>
          </button>
          <button
            className="railstat"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-family", { detail: "desertion" }),
              )
            }
          >
            <span>Intercepted</span>
            <b>{fmtStrategic(live.intercepted)}</b>
          </button>
          <button
            className="railstat"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-family", { detail: "desertion" }),
              )
            }
          >
            <span>Net flight</span>
            <b>{fmtStrategic(live.netDesertion)}</b>
          </button>
          <button
            className="railstat"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-family", { detail: "desertion" }),
              )
            }
          >
            <span>Patrol commitment</span>
            <b>{fmt(s.patrolCommitment)}</b>
          </button>
          <button
            className="railstat"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-family", { detail: "desertion" }),
              )
            }
          >
            <span>Desertion pressure</span>
            <b>{s.desertionPressure.toFixed(0)}%</b>
          </button>
        </section>
        <section>
          <span className="eyebrow">State tolerance</span>
          {[
            ["Treasury", `${s.treasury.toFixed(1)} B`, "treasury"],
            ["Legitimacy", `${s.legitimacy.toFixed(0)}%`, "legitimacy"],
            ["Resistance", `${s.resistance.toFixed(0)}%`, "resistance"],
            ["Reciprocity", `${s.reciprocity.toFixed(0)}%`, "doctrine"],
          ].map(([label, value, id]) => (
            <button
              className="railstat"
              key={label}
              onClick={() => inspect(id as Metric)}
            >
              <span>{label}</span>
              <b>{value}</b>
            </button>
          ))}
        </section>
        <SignalStream s={s} live={live} />
        <section>
          <span className="eyebrow">Recent decisions</span>
          {s.decisions.length ? (
            s.decisions.slice(0, 3).map((decision, index) => (
              <div className="arrival" key={index}>
                <span>D{decision.day}</span>
                <div>
                  <b>{decision.choice}</b>
                  <small>{decision.family}</small>
                </div>
              </div>
            ))
          ) : (
            <p className="empty">
              Three orders remain. Inaction is also a daily policy.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}

function ProductionCircuit({ s }: { s: GameState }) {
  const p = projectProduction(s),
    director = directorForState(s);
  return (
    <section className="production-circuit">
      <header>
        <div>
          <small>DAILY CIRCUIT PROJECTION</small>
          <b>{p.target.toUpperCase()}</b>
        </div>
        <div>
          <small>WORKFORCE FACTOR</small>
          <b>{Math.round(p.workforceFactor * 100)}%</b>
        </div>
        <div>
          <small>CONDITION FACTOR</small>
          <b>{Math.round(p.conditionFactor * 100)}%</b>
        </div>
        <div>
          <small>MAINTENANCE DEBT</small>
          <b>{p.maintenanceDebtAfter.toFixed(0)} / 100</b>
        </div>
      </header>
      <div className="circuit-lines">
        {p.lines.map((line) => (
          <div className={line.status} key={line.resource}>
            <strong>{line.resource.toUpperCase()}</strong>
            <span>{line.allocation}% ALLOCATION</span>
            <b>
              {line.net >= 0 ? "+" : ""}
              {fmt(line.net, true)} NET
            </b>
            <small>
              {line.coverage.toFixed(1)} DAYS // {line.status.toUpperCase()}
            </small>
          </div>
        ))}
      </div>
      <footer>
        <span>
          {s.pendingTarget
            ? `RETOOLING TO ${s.pendingTarget.toUpperCase()} AT RESOLUTION // OUTPUT −28%`
            : p.shortages
              ? `${p.shortages} CRITICAL BOTTLENECK${p.shortages === 1 ? "" : "S"}`
              : "NO CRITICAL BOTTLENECKS"}
        </span>
        <span>
          CAMPAIGN CONDITION // {director.event.label.toUpperCase()} // OUTPUT ×
          {director.modifiers.productionOutput.toFixed(2)} // USE ×
          {director.modifiers.supplyUse.toFixed(2)}
        </span>
      </footer>
    </section>
  );
}

function ForceGenerationCircuit({ s }: { s: GameState }) {
  const f = projectForceGeneration(s),
    replacementReserve = replacementReserveForProjection(f);
  return (
    <section className="force-circuit">
      <header>
        <div>
          <small>FORCE GENERATION // NEXT RESOLUTION</small>
          <b>{fmt(f.grossIntake, true)} GROSS INTAKE</b>
        </div>
        <div>
          <small>INDUCTION WAIT</small>
          <b>{f.estimatedWaitDays.toFixed(1)} DAYS</b>
        </div>
        <div>
          <small>ACTIVE COHORTS</small>
          <b>{f.cohortsClosing}</b>
        </div>
        <div>
          <small>RESERVE AFTER ASSIGNMENT</small>
          <b>{fmt(f.reservesClosing, true)}</b>
        </div>
      </header>
      <div className="force-human-flow">
        <div className="force-stage">
          <Term id="training-queue">RECRUITMENT</Term>
          <b>+{fmt(f.grossIntake, true)}</b>
          <small>
            {fmt(f.voluntaryIntake, true)} voluntary //{" "}
            {fmt(f.forcedIntake, true)} forced
          </small>
        </div>
        <i>→</i>
        <div className="force-stage">
          <Term id="training-capacity">INDUCTION</Term>
          <b>{fmt(f.admitted, true)}</b>
          <small>{fmt(f.queueClosing, true)} remain queued</small>
        </div>
        <i>→</i>
        <div className="force-stage">
          <RegistryConcept id="training-cohort">
            TRAINING COHORTS
          </RegistryConcept>
          <b>{f.cohortsClosing}</b>
          <small>{f.graduatingCohorts} mature today</small>
        </div>
        <i>→</i>
        <div className="force-stage">
          <RegistryConcept id="graduates">
            EFFECTIVE GRADUATES
          </RegistryConcept>
          <b>{fmt(f.effectiveGraduates, true)}</b>
          <small>
            {fmt(f.rawGraduates, true)} raw at {s.quality.toFixed(0)}% standard
          </small>
        </div>
      </div>
      <div className="force-assignment">
        <header>
          <small>GRADUATE ASSIGNMENT</small>
          <b>FIELD-EQUIPPED, FIELD-READY GRADUATES JOIN THE DEPLOYABLE FORCE. ALL OTHER EFFECTIVE GRADUATES ENTER THE REPLACEMENT RESERVE.</b>
        </header>
        <div className="force-assignment-branches">
          <div>
            <RegistryConcept id="equipment-assignment">
              FIELD-EQUIPPED GRADUATES
            </RegistryConcept>
            <b>{fmt(f.equipmentAssigned, true)}</b>
            <small>PERSONNEL ISSUED SERVICEABLE FIELD KIT</small>
          </div>
          <div>
            <RegistryConcept id="replacement-reserve">
              HELD IN REPLACEMENT RESERVE
            </RegistryConcept>
            <b>{fmt(replacementReserve, true)}</b>
            <small>ALL EFFECTIVE GRADUATES NOT DEPLOYED TODAY</small>
          </div>
          <div>
            <RegistryConcept id="readiness">FIELD-READY SHARE</RegistryConcept>
            <b>{s.readiness.toFixed(0)}%</b>
            <small>SHARE OF EQUIPPED GRADUATES READY FOR FIELD DUTY</small>
          </div>
          <div>
            <Term id="deployable-force">RESERVE RECALLED</Term>
            <b>+{fmt(f.reserveReleased, true)}</b>
            <small>EXPERIENCED PERSONNEL RETURNED TO FIELD DUTY</small>
          </div>
        </div>
        <div className="force-assignment-result">
          <span>→</span>
          <div>
            <Term id="deployable-force">DEPLOYABLE REINFORCEMENTS</Term>
            <b>+{fmt(f.deployableAssigned, true)}</b>
            <small>{fmt(f.deployableClosing, true)} TOTAL DEPLOYABLE AFTER ASSIGNMENT</small>
          </div>
        </div>
      </div>
      <footer>
        <span>OPENING QUEUE {fmt(f.queueOpening, true)}</span>
        <span>CAPACITY {fmt(f.capacity, true)}/DAY</span>
        <span>ELIGIBLE POOL {fmt(f.eligiblePopulation, true)}</span>
      </footer>
    </section>
  );
}

function ModulePage({
  page,
  s,
  issue,
  focus,
  epigraph,
}: {
  page: Exclude<
    Module,
    "campaign" | "doctrine" | "wiki" | "account"
  >;
  s: GameState;
  issue: (f: Family, c: Choice) => void;
  focus?: string;
  epigraph: Aphorism | null;
}) {
  const descriptions: Record<
    "national" | "military" | "diplomacy",
    [string, string, string]
  > = {
    national: [
      "Production command",
      "Convert society into throughput",
      "Control production, fiscal capacity, public burden, and industrial decisions.",
    ],
    military: [
      "Military command",
      "Feed and govern the force",
      "Recruitment creates pressure. Training converts pressure into soldiers. Operations consume them.",
    ],
    diplomacy: [
      "External command",
      "Trade autonomy for leverage",
      "Move equipment, intelligence, legitimacy, and violence across borders.",
    ],
  };
  const desc = descriptions[page],
    isProduction = page === "national";
  const [previewChoice, setPreviewChoice] = useState<Choice | null>(null);
  const [selectedActor, setSelectedActor] = useState(s.actors[0]?.id ?? "");
  const families = useMemo(
    () =>
      visibleDirectiveView(
        s,
        page,
        page === "diplomacy" ? selectedActor : undefined,
      ).families,
    [s, page, selectedActor],
  );
  const groups = [...new Set(families.map((f) => f.category))];
  const [selected, setSelected] = useState(focus ?? families[0]?.id ?? "");
  const selectedFamily = families.find((f) => f.id === selected) ?? families[0];
  useEffect(() => {
    if (focus && families.some((f) => f.id === focus)) setSelected(focus);
    else if (!families.some((f) => f.id === selected))
      setSelected(families[0]?.id ?? "");
  }, [focus, page, families, selected]);
  useEffect(() => setPreviewChoice(null), [selected, page, s.day, selectedActor]);
  const previewRejection =
    selectedFamily && previewChoice
      ? directiveRejection(s, selectedFamily, previewChoice)
      : null;
  return (
    <div
      className="module desktop-module"
      data-module={moduleName(page)}
      data-report-owner="ava"
    >
      <header>
        {epigraph && <Epigraph quote={epigraph.text} source={epigraph.source} />}
        <span className="eyebrow">{desc[0]}</span>
        <h1>{desc[1]}</h1>
        <p>{desc[2]}</p>
      </header>
      <section
        className={`os-window ${isProduction ? "production-command-window" : ""}`}
      >
        <div className="os-titlebar">
          <span>
            {isProduction ? "SET PRODUCTION TARGET" : "DIRECTIVE CONTROL PANEL"}
          </span>
          <b>
            {moduleName(page)} // DAY {s.day}
          </b>
        </div>
        <div
          className={`os-layout ${page === "diplomacy" ? "diplomacy-menu-layout" : ""}`}
        >
          {page === "diplomacy" ? (
            <aside className="diplomacy-command-rail">
              <nav
                className="tree-menu foreign-actor-menu"
                aria-label="Foreign actors"
              >
                <section className="tree-group">
                  <header className="tree-group-heading">
                    FOREIGN ACTORS <small>{s.actors.length} NEIGHBORS</small>
                  </header>
                  {s.actors.map((actor) => (
                    <button
                      aria-pressed={selectedActor === actor.id}
                      className={selectedActor === actor.id ? "selected" : ""}
                      onClick={() => setSelectedActor(actor.id)}
                      key={actor.id}
                    >
                      <span>◎</span>
                      <b>{actor.name}</b>
                      <small>
                        {actor.role.toUpperCase()} // TRUST{" "}
                        {actor.trust.toFixed(0)} // LEVERAGE{" "}
                        {actor.leverage.toFixed(0)}
                      </small>
                    </button>
                  ))}
                </section>
              </nav>
              <nav
                className="tree-menu directive-family-menu"
                aria-label="Diplomatic actions"
              >
                {groups.map((group) => (
                  <section className="tree-group" key={group}>
                    <header className="tree-group-heading">{group}</header>
                    {families
                      .filter((f) => f.category === group)
                      .map((f) => {
                        const remaining = Math.max(
                          0,
                          (s.locks[f.id] ?? 0) - s.day,
                        );
                        return (
                          <button
                            className={selected === f.id ? "selected" : ""}
                            onClick={() => setSelected(f.id)}
                            key={f.id}
                          >
                            <span>▣</span>
                            {f.label}
                            <small>
                              {remaining ? `LOCKED ${remaining}D` : "AVAILABLE"}
                            </small>
                          </button>
                        );
                      })}
                  </section>
                ))}
              </nav>
            </aside>
          ) : (
            <nav className="tree-menu">
              {groups.map((group) => (
                <section className="tree-group" key={group}>
                  <header className="tree-group-heading">{group}</header>
                  {families
                    .filter((f) => f.category === group)
                    .map((f) => {
                      const remaining = Math.max(
                        0,
                        (s.locks[f.id] ?? 0) - s.day,
                      );
                      return (
                        <button
                          className={selected === f.id ? "selected" : ""}
                          onClick={() => setSelected(f.id)}
                          key={f.id}
                        >
                          <span>▣</span>
                          {f.label}
                          <small>
                            {remaining ? `LOCKED ${remaining}D` : "AVAILABLE"}
                          </small>
                        </button>
                      );
                    })}
                </section>
              ))}
            </nav>
          )}
          {selectedFamily && (
            <article
              className={`menu-inspector directive-menu-inspector ${isProduction ? "production-target-inspector" : ""}`}
            >
              <section className="selection-dossier directive-selection-dossier">
                <div className="menu-path">
                  {moduleName(page)} // {selectedFamily.category.toUpperCase()} //{" "}
                  {selectedFamily.label.toUpperCase()}
                  {previewChoice
                    ? ` // ${previewChoice.label.toUpperCase()}`
                    : ""}
                </div>
                <h2>{previewChoice?.label ?? selectedFamily.label}</h2>
                <div className="selection-classification">
                  <small>
                    {previewChoice ? "SELECTED DIRECTIVE" : "DIRECTIVE FAMILY"}
                  </small>
                  <b>
                    {previewChoice
                      ? selectedFamily.label
                      : `${selectedFamily.lock} DAY FAMILY COOLDOWN`}
                  </b>
                </div>
                <p>{previewChoice?.flavor ?? selectedFamily.brief}</p>
              </section>
              <div className="menu-choice-list expanded single-surface">
                {selectedFamily.choices.map((c) => {
                  const rejection = directiveRejection(s, selectedFamily, c);
                  return (
                    <button
                      key={c.id}
                      disabled={!!rejection}
                      className={previewChoice?.id === c.id ? "selected" : ""}
                      onClick={() =>
                        setPreviewChoice(previewChoice?.id === c.id ? null : c)
                      }
                      aria-pressed={previewChoice?.id === c.id}
                    >
                      <div className="directive-glance">
                        <h3>{c.label}</h3>
                        <p>{c.flavor}</p>
                        {rejection && <span>{rejection.toUpperCase()}</span>}
                      </div>
                      <ul>
                        {c.exact.map((x) => (
                          <li className={directiveEffectTone(x)} key={x}>
                            {x}
                          </li>
                        ))}
                      </ul>
                      <div className="directive-risk">
                        <small>TRADEOFF</small>
                        {c.risk.length ? (
                          c.risk.map((risk) => <b key={risk}>{risk}</b>)
                        ) : (
                          <b className="neutral">NO CONTINGENT EFFECT</b>
                        )}
                      </div>
                      <strong>
                        {previewChoice?.id === c.id ? "SELECTED" : "INSPECT"} →
                      </strong>
                    </button>
                  );
                })}
              </div>
              {previewChoice && (
                <section className="inline-issue">
                  <div>
                    <small>SELECTED DIRECTIVE</small>
                    <b>{previewChoice.label}</b>
                    <span>
                      {previewRejection ??
                        `1 OF ${s.actions} ORDERS // ${selectedFamily.lock} DAY COOLDOWN`}
                    </span>
                  </div>
                  <button
                    disabled={!!previewRejection}
                    onClick={() => issue(selectedFamily, previewChoice)}
                  >
                    ISSUE{" "}
                    {page === "diplomacy" ? "DIPLOMATIC ACTION" : "DIRECTIVE"} →
                  </button>
                </section>
              )}
            </article>
          )}
        </div>
      </section>
    </div>
  );
}

function WikiApplet({
  article,
  close,
}: {
  article: string;
  close: () => void;
}) {
  return (
    <Overlay close={close} kind="center wiki-applet-overlay">
      <section
        className="wiki-applet os-window"
        role="dialog"
        aria-modal="true"
        aria-label="Field Manual"
      >
        <div className="os-titlebar">
          <span>FIELD MANUAL APPLETTE</span>
          <b>{article.replaceAll("-", " ").toUpperCase()}</b>
        </div>
        <Close onClick={close} />
        <div className="wiki-applet-body">
          <FieldManual key={article} article={article} />
        </div>
        <footer>
          <button onClick={close}>RETURN TO COMMAND</button>
          <a href={`/manual/${article}`} target="_blank" rel="noreferrer">
            OPEN FULL WIKI EXTERNALLY ↗
          </a>
        </footer>
      </section>
    </Overlay>
  );
}

function OpportunityModal({
  s,
  packet,
  closesAt,
  commit,
  close,
}: {
  s: GameState;
  packet: OpportunityPacket;
  closesAt: string;
  commit: (id: string) => void;
  close: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const response = packet.responses.find((item) => item.id === selected);
  const rejection = response ? opportunityResponseRejection(s, response) : null;
  const resolved = s.opportunityHistory.find(
    (record) => record.day === s.day && record.opportunityId === packet.id,
  );
  return (
    <Overlay close={close} kind="center">
      <section
        className="opportunity-applet os-window"
        role="dialog"
        aria-modal="true"
      >
        <div className="os-titlebar">
          <span>
            TARGET OF OPPORTUNITY // {packet.categoryLabel.toUpperCase()}
          </span>
          <b>{packet.sector.toUpperCase()} // AVAILABLE THROUGH DAY RESOLUTION</b>
        </div>
        <Close onClick={close} />
        <header>
          <span className="eyebrow">
            PERSONNEL SPOTLIGHT // {packet.individual} // OCCURRENCE{" "}
            {packet.occurrence}
          </span>
          <h2>{packet.headline}</h2>
          <p>{packet.brief}</p>
          <button
            className="opportunity-manual"
            onClick={() => openWikiApplet(`opportunity-${packet.id}`)}
          >
            BUBBLETTE + FIELD MANUAL // THIS OPERATION →
          </button>
        </header>
        {resolved ? (
          <div className="opportunity-committed">
            <b>
              {resolved.outcome === "exploited"
                ? "OPPORTUNITY EXPLOITED"
                : "OPPORTUNITY MISSED"}
            </b>
            <p>{resolved.report}</p>
          </div>
        ) : (
          <div className="opportunity-layout">
            <nav>
              {packet.responses.map((item) => (
                <button
                  aria-pressed={selected === item.id}
                  className={selected === item.id ? "selected" : ""}
                  onClick={() =>
                    setSelected((current) =>
                      current === item.id ? null : item.id,
                    )
                  }
                  key={item.id}
                >
                  <small>
                    {Math.round(item.chance * 100)}% EXPLOITATION CONFIDENCE
                  </small>
                  <b>{item.label}</b>
                  <span>
                    {item.cost
                      ? Object.entries(item.cost)
                          .map(
                            ([resource, amount]) =>
                              `${resource.toUpperCase()} −${fmt(Number(amount), true)}`,
                          )
                          .join(" // ")
                      : "NO STOCK COST"}
                  </span>
                </button>
              ))}
            </nav>
            {response ? (
              <article>
                <span className="eyebrow">
                  SELECTED RESPONSE // RESOLVES NOW
                </span>
                <h3>{response.label}</h3>
                <p>{response.flavor}</p>
                <div className="opportunity-effects">
                  <section>
                    <b>OWNED COMMITMENT</b>
                    {response.exact.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </section>
                  <section>
                    <b>CONTINGENT RESULT</b>
                    {response.contingent.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </section>
                </div>
                {rejection && <p className="locked">{rejection}</p>}
                <button
                  className="os-primary"
                  disabled={!!rejection}
                  onClick={() => commit(response.id)}
                >
                  EXECUTE NOW →
                </button>
              </article>
            ) : (
              <article className="no-decision">
                <b>NO RESPONSE SELECTED</b>
                <p>
                  Select a response to inspect it. Select the same response
                  again to clear it. Closing the window declines the
                  opportunity. Closing this window preserves the opportunity.
                </p>
              </article>
            )}
          </div>
        )}
        <footer>
          RANDOM EVENT // 1-IN-3 DAILY ROLL // UNIQUE WITHIN THIS CAMPAIGN //
          AVAILABLE ALL PLAYER DAY // IMMEDIATE SAME-DAY EFFECT
        </footer>
      </section>
    </Overlay>
  );
}

function Overlay({
  children,
  close,
  kind = "",
}: {
  children: React.ReactNode;
  close: () => void;
  kind?: string;
}) {
  return (
    <div
      className={`overlay ${kind}`}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      {children}
    </div>
  );
}
function Close({ onClick }: { onClick: () => void }) {
  return (
    <button className="close" aria-label="Close" onClick={onClick}>
      ×
    </button>
  );
}
function Actions({
  cancel,
  action,
  label,
  danger = false,
  disabled = false,
}: {
  cancel: () => void;
  action: () => void;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="actions">
      <button onClick={cancel}>Cancel</button>
      <button
        disabled={disabled}
        className={danger ? "danger" : "primary"}
        onClick={action}
      >
        {label}
      </button>
    </div>
  );
}

function CampaignInspectCell({
  id,
  label,
  value,
  note,
  details,
  className = "",
  control,
}: {
  id: string;
  label: string;
  value: string;
  note: string;
  details: BubbletteDetail[];
  className?: string;
  control?: { label: string; module: string; family?: string };
}) {
  const concept = CONCEPTS[id];
  return (
    <Bubblette
      id={id}
      title={concept?.label ?? label}
      summary={concept?.definition ?? note}
      details={details}
      control={control}
      className={`operation-inspect ${className}`}
      panelClassName="operation-bubblette"
    >
      <small>{label}</small>
      <b>{value}</b>
      <span>{note}</span>
    </Bubblette>
  );
}

const campaignDelta = (value: number, digits = 1) =>
  `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;

const MANEUVER_CONSEQUENCES: Record<
  Maneuver["id"],
  { immediate: string[]; outcome: string[] }
> = {
  reinforce: {
    immediate: [
      "The reserve enters the threatened sector.",
      "Munitions consumption rises sharply.",
      "Force readiness declines.",
    ],
    outcome: [
      "A clean execution stabilizes the salient.",
      "Failure traps the reserve inside the enemy’s chosen fires.",
    ],
  },
  interdict: {
    immediate: [
      "A counterbattery package enters the interdiction zone.",
      "Munitions and drone consumption rise sharply.",
    ],
    outcome: [
      "Success suppresses the batteries and releases the sector.",
      "Failure leaves the salient understrength while the enemy fires remain active.",
    ],
  },
  route: {
    immediate: [
      "Engineers attempt a second line of movement.",
      "Materiel condition declines.",
      "A completed route eases the local supply burden.",
    ],
    outcome: [
      "Success establishes a durable southern route.",
      "Failure spends the engineers before the route becomes usable.",
    ],
  },
  abandon: {
    immediate: [
      "The formation disengages from the salient.",
      "Casualty exposure and supply demand fall sharply.",
      "Equipment is recovered during the withdrawal.",
    ],
    outcome: [
      "Success preserves the force for later operations.",
      "Failure catches the withdrawing reserve in motion.",
    ],
  },
  exploit: {
    immediate: [
      "The mobile reserve attacks the enemy concentration.",
      "Readiness falls and supply demand rises.",
    ],
    outcome: [
      "Success opens a breakthrough window.",
      "Failure spends the mobile reserve against a prepared defense.",
    ],
  },
  breach: {
    immediate: [
      "The assault force enters the obstacle belt.",
      "Munitions and supply demand rise sharply.",
    ],
    outcome: [
      "Success breaches the wire and opens the passage.",
      "Failure reveals the assault sequence to the enemy.",
    ],
  },
  network: {
    immediate: [
      "A relay package enters the broken command zone.",
      "Drone consumption rises while local supply demand eases.",
    ],
    outcome: [
      "Success restores command and improves intelligence.",
      "Failure compromises the relay package and leaves the network degraded.",
    ],
  },
};

function qualitativeConsequence(text: string) {
  const allocation = text.match(/^(.+?) allocation becomes/i);
  if (allocation)
    return `${allocation[1]} becomes the production priority.`;
  if (/^Other production lines become/i.test(text))
    return "All other production lines lose priority.";
  if (/^All production allocations become/i.test(text))
    return "Production is distributed evenly.";
  if (/^Retooling output:/i.test(text))
    return "Retooling reduces output during the conversion.";

  const directional = text.match(/^([^:]+):\s*([+−-])/);
  if (directional) {
    const subject = directional[1]
      .replace(/^Daily\s+/i, "")
      .replace(/\s+support$/i, "");
    return `${subject} ${directional[2] === "+" ? "increases" : "decreases"}.`;
  }

  const multiplier = text.match(/^([^:]+) multiplier:\s*(\d+(?:\.\d+)?)/i);
  if (multiplier)
    return `${multiplier[1]} ${Number(multiplier[2]) > 1 ? "rises" : "falls"}.`;

  const reset = text.match(/^(.+?) becomes\s+0\b/i);
  if (reset) return `${reset[1]} is eliminated.`;
  const becomes = text.match(/^(.+?) becomes\b/i);
  if (becomes) return `${becomes[1]} changes immediately.`;

  const range = text.match(/^([^:]+):\s*.*\bto\b/i);
  if (range) return `${range[1]} remains a contingent risk.`;

  return text
    .replace(/\b(?:on\s+)?Day\s+\+\d+\b/gi, "later")
    .replace(/[+−-]?\d[\d,.]*(?:\s*(?:B|%|km|days?))?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .replace(/:\s*$/, "")
    .trim();
}

function SubMissionReadout({
  s,
  prompt,
  option,
}: {
  s: GameState;
  prompt: ConvergencePrompt;
  option: ConvergenceOption;
}) {
  const previewAction:AvaActionRef={
    kind:"sub-mission",
    domain:option.domain,
    missionId:prompt.id,
    optionId:option.id,
    resolutionTicket:prompt.resolutionTicket,
  };
  const preview=projectAvaAction(s,previewAction);
  const previewExecuted=preview.executed;
  const previewRejection=preview.rejection;
  const projected=previewExecuted?preview.state:s;
  const beforeDomestic = projectDomestic(s);
  const afterDomestic = projectDomestic(projected);
  const beforeOperations = projectOperations(s);
  const afterOperations = projectOperations(projected);
  const adversary = projectAdversary(projected);
  const afterPersonnel = estimateDay(projected);
  const isDomestic = option.domain === "domestic";
  const issued = s.decisions.some(
    (decision) =>
      decision.day === s.day &&
      decision.domain === option.domain &&
      decision.missionId === prompt.id &&
      decision.choiceId === option.choice.id,
  );
  const factors = isDomestic
    ? [
        {
          id: "legitimacy",
          label: "LEGITIMACY",
          value: `${beforeDomestic.legitimacyClosing.toFixed(1)} → ${afterDomestic.legitimacyClosing.toFixed(1)}`,
          note: `${campaignDelta(afterDomestic.legitimacyClosing - beforeDomestic.legitimacyClosing)} AT RESOLUTION`,
          details: [
            {
              label: "OPENING",
              value: beforeDomestic.legitimacyOpening.toFixed(1),
              conceptId: "legitimacy",
            },
            {
              label: "BEFORE RESPONSE",
              value: beforeDomestic.legitimacyClosing.toFixed(1),
              conceptId: "legitimacy",
            },
            {
              label: "AFTER RESPONSE",
              value: afterDomestic.legitimacyClosing.toFixed(1),
              conceptId: "legitimacy",
            },
          ],
        },
        {
          id: "resistance",
          label: "RESISTANCE",
          value: `${beforeDomestic.resistanceClosing.toFixed(1)} → ${afterDomestic.resistanceClosing.toFixed(1)}`,
          note: `${campaignDelta(afterDomestic.resistanceClosing - beforeDomestic.resistanceClosing)} AT RESOLUTION`,
          details: [
            {
              label: "OPENING",
              value: beforeDomestic.resistanceOpening.toFixed(1),
              conceptId: "resistance",
            },
            {
              label: "BEFORE RESPONSE",
              value: beforeDomestic.resistanceClosing.toFixed(1),
              conceptId: "resistance",
            },
            {
              label: "AFTER RESPONSE",
              value: afterDomestic.resistanceClosing.toFixed(1),
              conceptId: "resistance",
            },
          ],
        },
        {
          id: "legitimacy",
          label: "STRIKE RISK",
          value: `${Math.round(beforeDomestic.strikeRisk * 100)}% → ${Math.round(afterDomestic.strikeRisk * 100)}%`,
          note: `${campaignDelta((afterDomestic.strikeRisk - beforeDomestic.strikeRisk) * 100, 0)} POINTS`,
          details: [
            {
              label: "CASUALTY BURDEN",
              value: afterDomestic.casualtyBurden.toFixed(2),
              conceptId: "casualty-burden",
            },
            {
              label: "SHORTAGE BURDEN",
              value: afterDomestic.shortageBurden.toFixed(2),
              conceptId: "shortage-burden",
            },
          ],
        },
        {
          id: "resistance",
          label: "COLLAPSE RISK",
          value: `${Math.round(beforeDomestic.collapseRisk * 100)}% → ${Math.round(afterDomestic.collapseRisk * 100)}%`,
          note: `${campaignDelta((afterDomestic.collapseRisk - beforeDomestic.collapseRisk) * 100, 0)} POINTS`,
          details: [
            {
              label: "FISCAL BURDEN",
              value: afterDomestic.fiscalBurden.toFixed(2),
              conceptId: "fiscal-stress",
            },
            {
              label: "ATROCITY BURDEN",
              value: afterDomestic.atrocityBurden.toFixed(2),
              conceptId: "atrocity-exposure",
            },
          ],
        },
        {
          id: "desertion-pressure",
          label: "DESERTION PRESSURE",
          value: `${campaignDelta(beforeDomestic.desertionPressureChange)} → ${campaignDelta(afterDomestic.desertionPressureChange)}`,
          note: `${afterPersonnel.netDesertion.toLocaleString()} PROJECTED NET FLIGHT`,
          details: [
            {
              label: "ATTEMPTED FLIGHT",
              value: afterPersonnel.desertion.toLocaleString(),
              conceptId: "desertion-pressure",
            },
            {
              label: "RETAINED",
              value: afterPersonnel.retained.toLocaleString(),
              conceptId: "desertion-pressure",
            },
            {
              label: "INTERCEPTED",
              value: afterPersonnel.intercepted.toLocaleString(),
              conceptId: "desertion-pressure",
            },
            {
              label: "NET FLIGHT",
              value: afterPersonnel.netDesertion.toLocaleString(),
              conceptId: "desertion-pressure",
            },
          ],
        },
      ]
    : [
        {
          id: "command-network",
          label: "NETWORK POSTURE",
          value: `${s.networkPosture.toUpperCase()} → ${projected.networkPosture.toUpperCase()}`,
          note: "SPEED // SECRECY // REDUNDANCY",
          details: [
            {
              label: "CURRENT",
              value: s.networkPosture.toUpperCase(),
              conceptId: "command-network",
            },
            {
              label: "PROJECTED",
              value: projected.networkPosture.toUpperCase(),
              conceptId: "command-network",
            },
          ],
        },
        {
          id: "command-network",
          label: "LOCAL CONVERSION",
          value: `×${beforeOperations.networkFactor.toFixed(2)} → ×${afterOperations.networkFactor.toFixed(2)}`,
          note: `${campaignDelta(afterOperations.networkFactor - beforeOperations.networkFactor, 2)} EFFECTIVE FORCE`,
          details: [
            {
              label: "SECTOR NETWORK",
              value: situationForState(s).network.toUpperCase(),
              conceptId: "command-network",
            },
            {
              label: "HOSTILE INTERFERENCE",
              value: `−${Math.round(adversary.networkInterference * 100)} POINTS`,
              conceptId: "enemy-countermeasure",
            },
          ],
        },
        {
          id: "intelligence",
          label: "INTELLIGENCE",
          value: `${s.intelligence.toFixed(0)} → ${projected.intelligence.toFixed(0)}`,
          note: `${campaignDelta(projected.intelligence - s.intelligence, 0)} CLASSIFICATION`,
          details: [
            {
              label: "ENEMY ORDERS CLASSIFIED",
              value: `${adversary.observedOrders.length} / 3`,
              conceptId: "enemy-orders",
            },
            {
              label: "DECEPTION PENALTY",
              value: `−${Math.round(adversary.deceptionPenalty * 100)} POINTS`,
              conceptId: "intelligence",
            },
          ],
        },
        {
          id: "readiness",
          label: "READINESS",
          value: `${s.readiness.toFixed(0)} → ${projected.readiness.toFixed(0)}`,
          note: `${campaignDelta(projected.readiness - s.readiness, 0)} POINTS`,
          details: [
            {
              label: "LOCAL POWER WEIGHT",
              value: "20%",
              conceptId: "effective-committed-force",
            },
          ],
        },
        {
          id: "equipment-coverage",
          label: "EQUIPMENT",
          value: `${s.equipment.toFixed(0)} → ${projected.equipment.toFixed(0)}`,
          note: `${campaignDelta(projected.equipment - s.equipment, 0)} POINTS`,
          details: [
            {
              label: "LOCAL POWER WEIGHT",
              value: "18%",
              conceptId: "effective-committed-force",
            },
            {
              label: "DEPENDENCY",
              value: `${s.dependency.toFixed(0)} → ${projected.dependency.toFixed(0)}`,
              conceptId: "foreign-dependency",
            },
          ],
        },
      ];
  const burdenOrTrade = isDomestic
    ? [
        ["CASUALTY BURDEN", afterDomestic.casualtyBurden.toFixed(2), "casualty-burden"],
        ["FORCED INTAKE", afterDomestic.forcedIntakeBurden.toFixed(2), "forced-intake-burden"],
        ["SHORTAGES", afterDomestic.shortageBurden.toFixed(2), "shortage-burden"],
        ["FISCAL STRESS", afterDomestic.fiscalBurden.toFixed(2), "fiscal-stress"],
      ]
    : [
        ["READINESS", campaignDelta(projected.readiness - s.readiness, 0), "readiness"],
        ["EQUIPMENT", campaignDelta(projected.equipment - s.equipment, 0), "equipment-coverage"],
        ["TREASURY", `${campaignDelta(projected.treasury - s.treasury)} B`, "fiscal-stress"],
        ["DEPENDENCY", campaignDelta(projected.dependency - s.dependency, 0), "foreign-dependency"],
      ];
  return (
    <section className="operations-packet sub-mission-packet">
      <header>
        <div>
          <small>CAMPAIGN ESTIMATE // ONE AUTHORITATIVE REPORT</small>
          <b>
            {option.domain === "domestic"
              ? "DOMESTIC FRONT"
              : "COMMAND NETWORK"}{" "}
            // {option.choice.label.toUpperCase()}
          </b>
        </div>
        <span>SELECT ANY FIELD TO TRACE ITS CAUSE</span>
      </header>
      <section className="operations-brief">
        <div>
          <small>ACTIVE SUB-MISSION</small>
          <h3>{prompt.title}</h3>
          <p>{prompt.brief}</p>
        </div>
        <Bubblette
          id={prompt.id}
          title={prompt.title}
          summary={prompt.brief}
          control={{ label: "Open Campaign", module: "campaign" }}
          details={[
            {
              label: "COMMANDER'S QUESTION",
              value: prompt.question,
              conceptId: prompt.id,
            },
            {
              label: "WHY TODAY",
              value: prompt.evidence.join(" // "),
              conceptId: prompt.archetypeId,
            },
            {
              label: "OPERATIONAL ANCHOR",
              value: prompt.operationalAnchor.headline,
              conceptId: `situation-${conceptSlug(situationForState(s).blueprintId)}`,
            },
          ]}
          className="operations-synopsis"
        >
          <span>CAMPAIGN SYNOPSIS</span>
          <b>{prompt.category.toUpperCase()}</b>
          <small>{prompt.question}</small>
        </Bubblette>
      </section>
      <div className="operations-factors">
        {factors.map((factor) => (
          <CampaignInspectCell
            key={`${factor.id}-${factor.label}`}
            {...factor}
          />
        ))}
      </div>
      <CampaignInspectCell
        id={prompt.archetypeId}
        label="SELECTED RESPONSE"
        value={option.choice.label.toUpperCase()}
        note={
          previewExecuted
            ? "ESTIMATED FROM CURRENT POSITION"
            : "CURRENTLY UNAVAILABLE"
        }
        details={[
          ...option.choice.exact.map((line) => ({
            label: "OWNED",
            value: line,
            conceptId: prompt.archetypeId,
            tone: "gain" as const,
          })),
          ...option.choice.risk.map((line) => ({
            label: "CONTINGENT",
            value: line,
            conceptId: prompt.archetypeId,
            tone: "loss" as const,
          })),
        ]}
        control={{ label: "Open Campaign", module: "campaign" }}
        className="observed-intent"
      />
      <div className="operations-summary">
        {burdenOrTrade.map(([label, value, conceptId]) => (
          <CampaignInspectCell
            key={label}
            id={conceptId}
            label={label}
            value={value}
            note={isDomestic ? "PROJECTED BURDEN" : "OWNED TRADEOFF"}
            details={[
              {
                label: "RESPONSE",
                value: option.choice.label,
                conceptId: prompt.archetypeId,
              },
            ]}
          />
        ))}
      </div>
      <div className="operations-conclusions">
        <CampaignInspectCell
          id="actions"
          label="ORDER STATUS"
          value={issued ? "ISSUED" : previewExecuted ? "AVAILABLE" : "LOCKED"}
          note={previewRejection ?? "1 ORDER FROM THE SHARED DAILY POOL"}
          details={[
            {
              label: "ORDERS REMAINING",
              value: String(s.actions),
              conceptId: "actions",
            },
          ]}
          control={{ label: "Open Campaign", module: "campaign" }}
        />
        <CampaignInspectCell
          id={isDomestic ? "legitimacy" : "command-network"}
          label="FRONT-LINE CONSEQUENCE"
          value={prompt.operationalAnchor.sector.toUpperCase()}
          note={
            prompt.convergence[0]?.summary ?? prompt.operationalAnchor.headline
          }
          details={prompt.convergence.map((edge, index) => ({
            label: `CONSEQUENCE ${index + 1}`,
            value: edge.summary,
            conceptId: edge.target,
          }))}
          control={{ label: "Open Campaign", module: "campaign" }}
        />
        <CampaignInspectCell
          id="resolution"
          label="WHY THIS ORDER EXISTS TODAY"
          value={prompt.pressureBand.toUpperCase()}
          note={prompt.evidence[0] ?? prompt.operationalAnchor.headline}
          details={prompt.evidence.map((line, index) => ({
            label: `FIELD EVIDENCE ${index + 1}`,
            value: line,
            conceptId: prompt.id,
          }))}
          control={{ label: "Open Campaign", module: "campaign" }}
        />
      </div>
    </section>
  );
}

function CampaignPage({
  s,
  epigraph,
  selected,
  setSelected,
  inspectorSelection,
  setInspectorSelection,
  introConsumed,
  consumeIntro,
  issue,
  issueConvergence,
}: {
  s: GameState;
  epigraph: Aphorism | null;
  selected: Maneuver | null;
  setSelected: (m: Maneuver | null) => void;
  inspectorSelection: CampaignInspectorSelection | null;
  setInspectorSelection: (selection: CampaignInspectorSelection | null) => void;
  introConsumed: boolean;
  consumeIntro: () => void;
  issue: (m: Maneuver) => void;
  issueConvergence: (selection: {
    domesticId?: string;
    networkId?: string;
  }) => void;
}) {
  const situation = situationForState(s);
  const packet = compileConvergence(s);
  const options = maneuversForState(s);
  const [showIntro, setShowIntro] = useState(() => !introConsumed);
  useEffect(() => {
    if (!introConsumed) consumeIntro();
  }, [consumeIntro, introConsumed]);
  const rememberedMain =
    inspectorSelection?.kind === "main"
      ? options.find((x) => x.id === inspectorSelection.id) ?? null
      : null;
  const allSubOptions = [
    ...(packet.activeDomains.includes("domestic") ? packet.domestic.options : []),
    ...(packet.activeDomains.includes("network") ? packet.network.options : []),
  ];
  const subOption =
    inspectorSelection?.kind === "sub"
      ? allSubOptions.find((option) => option.id === inspectorSelection.id) ??
        null
      : null;
  const current =
    rememberedMain ??
    (!showIntro && !subOption ? options[0] ?? null : null);
  const currentConsequences = current
    ? MANEUVER_CONSEQUENCES[current.id]
    : null;
  const subPrompt =
    subOption?.domain === "domestic"
      ? packet.domestic
      : subOption?.domain === "network"
        ? packet.network
        : null;
  const selectedSubIssued = !!(
    subOption && convergenceFrontIssued(s, subOption.domain)
  );
  useEffect(() => {
    if (showIntro || current || subOption || !options[0]) return;
    setInspectorSelection({ kind: "main", id: options[0].id });
  }, [
    current,
    options,
    setInspectorSelection,
    showIntro,
    subOption,
  ]);
  useEffect(() => {
    if (
      selected &&
      options.some((x) => x.id === selected.id) &&
      (inspectorSelection?.kind !== "main" ||
        inspectorSelection.id !== selected.id)
    )
      setInspectorSelection({ kind: "main", id: selected.id });
  }, [inspectorSelection, options, selected, setInspectorSelection]);
  const chooseMain = (maneuver: Maneuver) => {
    setShowIntro(false);
    setInspectorSelection({ kind: "main", id: maneuver.id });
    setSelected(maneuver);
  };
  const chooseSub = (option: ConvergenceOption) => {
    setShowIntro(false);
    setSelected(null);
    setInspectorSelection({ kind: "sub", id: option.id });
  };
  const renderSubMenu = (prompt: typeof packet.domestic, label: string) => {
    const status = convergenceFrontStatus(s, prompt);
    return (
      <section
        className={`tree-group campaign-submenu ${prompt.domain} ${status.cooling ? "cooling" : ""}`}
      >
        <header className="tree-group-heading">
          <span>{label}</span>
          <small>{status.cooling ? "COOLING" : "RESPONSES"}</small>
        </header>
        {prompt.options.map((option) => {
          const cooldown = convergenceOptionCooldown(s, option),
            rejection = convergenceOptionRejection(s, option),
            cooling = status.cooling || cooldown > 0;
          return (
            <button
              aria-pressed={subOption?.id === option.id}
              className={`${subOption?.id === option.id ? "selected" : ""} ${cooling ? "cooling-option" : ""}`}
              onClick={() => chooseSub(option)}
              key={option.id}
            >
              <span>▣</span>
              <b>{option.choice.label}</b>
              <small>
                {convergenceFrontIssued(s, option.domain)
                  ? "COOLING // REOPENS AFTER RESOLUTION"
                  : cooldown
                    ? "COOLING"
                    : rejection
                      ? rejection.toUpperCase()
                      : "AVAILABLE"}
              </small>
            </button>
          );
        })}
      </section>
    );
  };
  return (
    <div className="module campaign-page" data-module="CAMPAIGN">
      <header>
        {epigraph && <Epigraph quote={epigraph.text} source={epigraph.source} />}
        <span className="eyebrow">
          {situation.theater.toUpperCase()} THEATER // {situation.sector}
        </span>
        <h1>Campaign</h1>
        <p>{situation.question}</p>
      </header>
      <section className="os-window campaign-workspace">
        <div className="os-titlebar">
          <span>CAMPAIGN ORDERS // ACTIVE FRONTS</span>
          <b>DAY {s.day} // {s.actions} ORDERS REMAIN</b>
        </div>
        <div className="os-layout campaign-menu-layout">
          <nav className="tree-menu maneuver-list campaign-fronts">
            <section className="tree-group campaign-submenu main">
              <header className="tree-group-heading">
                <span>MAIN CAMPAIGN</span>
                <small>PRIMARY ORDERS</small>
              </header>
              {options.map((m) => (
                <button
                  aria-pressed={current?.id === m.id}
                  className={current?.id === m.id ? "selected" : ""}
                  key={m.id}
                  onClick={() => chooseMain(m)}
                >
                  <span>▣</span>
                  <b>{m.label}</b>
                  <small>{s.maneuver === m.id ? "ISSUED" : "AVAILABLE"}</small>
                </button>
              ))}
            </section>
            {packet.activeDomains.includes("domestic") &&
              renderSubMenu(packet.domestic, "DOMESTIC FRONT")}
            {packet.activeDomains.includes("network") &&
              renderSubMenu(packet.network, "COMMAND NETWORK")}
          </nav>
          {current ? (
            <article className="menu-inspector maneuver-detail">
              <div className="menu-path">
                CAMPAIGN // MAIN CAMPAIGN // {situation.sector.toUpperCase()} //{" "}
                {current.label.toUpperCase()}
              </div>
              <h2>{current.label}</h2>
              <WikiConcept
                id={
                  GLOSSARY[conceptSlug(current.vector)]
                    ? conceptSlug(current.vector)
                    : `vector-${conceptSlug(current.vector)}`
                }
                label={current.vector}
                qualifier="DOCTRINE LEARNING PATH"
              />
              <p>{current.flavor}</p>
              <div className="maneuver-contract campaign-consequences">
                <section className="immediate">
                  <h3>Immediate consequence</h3>
                  <ul>
                    {currentConsequences?.immediate.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
                <section className="outcome">
                  <h3>What follows</h3>
                  <ul>
                    {currentConsequences?.outcome.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              </div>
              <button
                className="os-primary campaign-review"
                disabled={!!s.maneuver || s.actions < 1}
                onClick={() => issue(current)}
              >
                {s.maneuver ? "ORDER ALREADY ISSUED" : "ISSUE ORDER →"}
              </button>
            </article>
          ) : subOption && subPrompt ? (
            <article className="menu-inspector maneuver-detail sub-mission-detail">
              <div className="menu-path">
                CAMPAIGN //{" "}
                {subOption.domain === "domestic"
                  ? "DOMESTIC FRONT"
                  : "COMMAND NETWORK"}{" "}
                // {subPrompt.category.toUpperCase()} // {subOption.choice.label.toUpperCase()}
              </div>
              <h2>{subOption.choice.label}</h2>
              <WikiConcept
                id={subPrompt.archetypeId}
                label={subPrompt.authority}
                qualifier={`${subPrompt.pressureBand.toUpperCase()} PRESSURE // TODAY'S ORDER`}
              />
              <p>{subOption.choice.flavor}</p>
              <div className="maneuver-contract campaign-consequences">
                <section className="immediate">
                  <h3>Immediate consequence</h3>
                  <ul>
                    {subOption.choice.exact.map((line) => (
                      <li key={line}>{qualitativeConsequence(line)}</li>
                    ))}
                  </ul>
                </section>
                <section className="outcome">
                  <h3>What this risks</h3>
                  <ul>
                    {subOption.choice.risk.map((line) => (
                      <li key={line}>{qualitativeConsequence(line)}</li>
                    ))}
                  </ul>
                </section>
              </div>
              <button
                className="os-primary campaign-review"
                disabled={
                  selectedSubIssued || !convergenceOptionAvailable(s, subOption)
                }
                onClick={() =>
                  issueConvergence(
                    subOption.domain === "domestic"
                      ? { domesticId: subOption.id }
                      : { networkId: subOption.id },
                  )
                }
              >
                {selectedSubIssued
                  ? "FRONT COOLING // INSPECT ONLY"
                  : `ISSUE ${subOption.domain.toUpperCase()} ORDER →`}
              </button>
            </article>
          ) : showIntro ? (
            <article
              className="menu-inspector maneuver-detail campaign-empty-state"
              aria-labelledby="campaign-empty-state-title"
            >
              <section
                className="situation-card campaign-empty-card"
              >
                <div
                  className="situation-index campaign-intro-index"
                  aria-hidden="true"
                />
                <div
                  className="campaign-sector-lane"
                  data-sector={situation.sector}
                >
                  <span
                    style={
                      {
                        "--campaign-sector-fit": `${Math.min(
                          10,
                          92 / Math.max(1, situation.sector.length * 0.62),
                        )}cqw`,
                      } as React.CSSProperties
                    }
                  >
                    {situation.sector}
                  </span>
                </div>
                <SituationNarrative
                  situation={situation}
                  preserveOperationalBlock
                />
                <section className="situation-order campaign-intro-order">
                  <h3 id="campaign-empty-state-title">
                    {situation.question}
                  </h3>
                  <div className="campaign-intro-order-state">
                    {maneuverForState(s,s.maneuver) ? (
                      <>
                        <small>ORDER ISSUED</small>
                        <b>{maneuverForState(s,s.maneuver)?.label}</b>
                        <p>{maneuverForState(s,s.maneuver)?.flavor}</p>
                      </>
                    ) : (
                      <p>
                        No maneuver has been issued. The standing operational
                        tempo will prosecute the day by default.
                      </p>
                    )}
                  </div>
                </section>
              </section>
            </article>
          ) : null}
        </div>
        <footer className="os-status">
          SELECT A FRONT // INSPECT A RESPONSE // ISSUE FROM ONE DAILY ORDER POOL
        </footer>
      </section>
    </div>
  );
}

function DoctrineConfirm({
  vector,
  stage,
  s,
  yes,
  no,
}: {
  vector: DoctrineVector;
  stage: DoctrineStage;
  s: GameState;
  yes: () => void;
  no: () => void;
}) {
  return (
    <Overlay close={no} kind="center">
      <div
        className={`modal doctrine-confirm ${vector.forbidden ? "atrocity-confirm" : ""}`}
      >
        <Close onClick={no} />
        <span className="eyebrow">
          {vector.forbidden ? "Institutional atrocity" : "Internalize doctrine"}{" "}
          // {vector.label}
        </span>
        <h2>{stage.label}</h2>
        <blockquote>
          “{stage.quote ?? vector.quote}”
          {stage.attribution && <cite>— {stage.attribution}</cite>}
        </blockquote>
        {vector.forbidden && stage.severity && (
          <div className={`atrocity-severity ${stage.severity}`}>
            DECISION SEVERITY // {stage.severity.toUpperCase()}
          </div>
        )}
        <div className="effects">
          <section>
            <h3>Institutional change // exact</h3>
            <p>{stage.description}</p>
            <b>{stage.effect}</b>
          </section>
          <section>
            <h3>
              {vector.forbidden ? "Irreversible exposure" : "Acquisition cost"}
            </h3>
            <p>{stage.cost} Doctrine insight will be consumed.</p>
            <b>{s.doctrine - stage.cost} insight remains</b>
          </section>
        </div>
        <Actions
          cancel={no}
          action={yes}
          label={
            vector.forbidden
              ? "Authorize prohibited method"
              : "Internalize doctrine"
          }
          danger={vector.forbidden}
        />
      </div>
    </Overlay>
  );
}

function MetricDrawer({
  metric,
  s,
  live,
  close,
}: {
  metric: Metric;
  s: GameState;
  live: Live;
  close: () => void;
}) {
  const [label, value, status, body, factors] = metricInfo(metric, s, live);
  const calc = calculationFor(metric, s);
  return (
    <Overlay close={close}>
      <aside className="drawer metric-drawer">
        <Close onClick={close} />
        <span className="eyebrow">Authoritative state inspection</span>
        <h2>{label}</h2>
        <strong className="bigvalue">{value}</strong>
        <em className="status">{status}</em>
        <p>{body}</p>
        {metric === "training" &&
          (() => {
            const intake = s.voluntary + s.forced;
            const admitted = Math.min(s.queue, s.training);
            const graduates = Math.round(
              (admitted / s.duration) * Math.max(0.35, (s.quality - 20) / 80),
            );
            const wait = s.queue / Math.max(1, s.training);
            const nextQueue = Math.max(0, s.queue + intake - admitted);
            return (
              <section className="training-ledger">
                <div className="pipeline-verdict">
                  <b>
                    {wait < 1 ? "NORMAL" : wait < 2 ? "ELEVATED" : "CONGESTED"}
                  </b>
                  <span>
                    {wait.toFixed(2)} CAPACITY-DAYS OF BACKLOG // NORMAL BAND
                    0.50–1.50
                  </span>
                </div>
                <div className="pipeline-flow">
                  <div>
                    <Term id="training-queue">QUEUE NOW</Term>
                    <strong>{fmt(s.queue, true)}</strong>
                    <small>
                      Inherited opening backlog plus unresolved intake. It is
                      waiting, not training.
                    </small>
                  </div>
                  <i>+</i>
                  <div>
                    <Term id="training-capacity">DAILY INTAKE</Term>
                    <strong>{fmt(intake, true)}</strong>
                    <small>
                      {fmt(s.voluntary, true)} voluntary + {fmt(s.forced, true)}{" "}
                      forced
                    </small>
                  </div>
                  <i>−</i>
                  <div>
                    <Term id="training-capacity">ADMITTED TODAY</Term>
                    <strong>{fmt(admitted, true)}</strong>
                    <small>
                      Minimum of queue and {fmt(s.training, true)} daily
                      capacity
                    </small>
                  </div>
                  <i>=</i>
                  <div>
                    <Term id="training-queue">QUEUE AT RESOLUTION</Term>
                    <strong>{fmt(nextQueue, true)}</strong>
                    <small>
                      {nextQueue < s.queue
                        ? "Backlog contracts"
                        : "Backlog grows"}
                    </small>
                  </div>
                </div>
                <div className="training-output">
                  <button>
                    <Term id="training-duration">TRAINING DURATION</Term>
                    <b>{s.duration} DAYS</b>
                    <small>Nominal conversion time after admission</small>
                  </button>
                  <button>
                    <Term id="training-quality">TRAINING QUALITY</Term>
                    <b>{s.quality.toFixed(0)}%</b>
                    <small>Quality-adjusted graduation conversion</small>
                  </button>
                  <button>
                    <Term id="graduates">PROJECTED GRADUATES</Term>
                    <b>{fmt(graduates, true)}</b>
                    <small>Added to Armed Forces at resolution</small>
                  </button>
                  <button>
                    <Term id="training-queue">QUEUE PROVENANCE</Term>
                    <b>CAMPAIGN OPENING STATE</b>
                    <small>
                      The initial 76,000 did not accumulate during played days;
                      it is inherited war-state debt.
                    </small>
                  </button>
                </div>
                <button
                  className="pipeline-control"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("open-family", {
                        detail: "training-capacity",
                      }),
                    )
                  }
                >
                  OPEN PROVISION TRAINING CAPACITY CONTROLS →
                </button>
              </section>
            );
          })()}
        {metric === "desertion" && (
          <section className="definition-grid desertion-definition">
            <div>
              <Term id="net-flight">ATTEMPTED FLIGHT</Term>
              <b>{fmt(live.deserted, true)}</b>
            </div>
            <div>
              <Term id="net-flight">RETAINED BY POLICY</Term>
              <b>{fmt(live.retained, true)}</b>
            </div>
            <div>
              <Term id="patrol-commitment">INTERCEPTED</Term>
              <b>{fmt(live.intercepted, true)}</b>
            </div>
            <div>
              <Term id="net-flight">NET FLIGHT TODAY</Term>
              <b>{fmt(live.netDesertion, true)}</b>
            </div>
            <div>
              <Term id="net-flight">CAMPAIGN NET DESERTIONS</Term>
              <b>
                {fmt(
                  Math.max(0, s.deserters - s.retained - s.intercepted),
                  true,
                )}
              </b>
            </div>
            <div>
              <Term id="patrol-commitment">PATROL COMMITMENT</Term>
              <b>{fmt(s.patrolCommitment, true)}</b>
            </div>
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("open-family", { detail: "desertion" }),
                )
              }
            >
              OPEN PROCESS DESERTION CONTROLS →
            </button>
          </section>
        )}
        <section className="factors">
          <h3>Current factors</h3>
          {factors.map((x) => (
            <div key={x}>{x}</div>
          ))}
        </section>
        <section className="formula metric-calculation" data-semantic="INSPECT">
          <span>{calc.title}</span>
          <code>{calc.equation}</code>
          <small>{calc.basis}</small>
          <div>
            {calc.rows.map((row) => (
              <button className={row.tone ?? "neutral"} key={row.label}>
                {row.concept ? (
                  <RegistryConcept id={row.concept}>
                    {row.label}
                  </RegistryConcept>
                ) : (
                  row.label
                )}
                <b>{row.value}</b>
              </button>
            ))}
          </div>
          <strong>{calc.result}</strong>
          {calc.uncertainties?.map((x) => (
            <p className="audit-gap" key={x}>
              {x}
            </p>
          ))}
        </section>
      </aside>
    </Overlay>
  );
}

const SAVE_KEY = "delenda.quest.campaign.v1";
const SERVER_MIGRATION_KEY = "delenda.quest.campaign-account-migrated.v1";
const OPPORTUNITY_LEDGER_KEY = "delenda.quest.opportunity-ledger.v1";
const APHORISM_LEDGER_KEY = "delenda.quest.aphorism-ledger.v1";
const APHORISM_ASSIGNMENT_KEY = "delenda.quest.aphorism-assignments.v2";
const APHORISM_LAST_KEY = "delenda.quest.aphorism-last.v1";
const DEVICE_KEY = "delenda.quest.device-key.v1";
type CampaignInspectorSelection = {
  kind: "main" | "sub";
  id: string;
};
const portableId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `dq-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff)
    .toString(36)
    .padStart(7, "0")}`;

function WarTicker() {
  const [invokedAt, setInvokedAt] = useState(0);
  const [crawlSeconds, setCrawlSeconds] = useState(3600);
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => setInvokedAt(Date.now()), []);
  const items = useMemo(
    () => (invokedAt ? warFeedForInvocation(invokedAt) : []),
    [invokedAt],
  );
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !items.length) return;
    const measure = () => {
      const oneLoopWidth = track.scrollWidth / 2;
      setCrawlSeconds(Math.max(1, oneLoopWidth / 12.5));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [items]);
  const time = (timestamp: number) =>
    new Intl.DateTimeFormat(undefined, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(timestamp);
  return (
    <aside className="war-ticker" aria-label="Rolling 24-hour theater event feed">
      <strong>THEATER WIRE // LAST 24H</strong>
      <div>
        {items.length ? (
          <div
            className="war-ticker-track"
            ref={trackRef}
            style={
              {
                "--war-wire-duration": `${crawlSeconds}s`,
              } as React.CSSProperties
            }
          >
            {[...items, ...items].map((item, index) => (
              <span key={`${item.timestamp}-${index}`}>
                <time dateTime={new Date(item.timestamp).toISOString()}>
                  {time(item.timestamp)}
                </time>
                {item.artifact}
              </span>
            ))}
          </div>
        ) : (
          <span className="war-ticker-loading">SYNCHRONIZING THEATER FEED</span>
        )}
      </div>
    </aside>
  );
}

export default function Home({ logoutPath }: { logoutPath: string }) {
  const [s, setS] = useState<GameState>(initialState);
  const [page, setPage] = useState<Page>("campaign");
  const [interfaceMode, setInterfaceMode] = useState<"command" | "briefing">(
    "briefing",
  );
  const [briefingModule, setBriefingModule] = useState<Module>("campaign");
  const [focusFamily, setFocusFamily] = useState<string | undefined>();
  const [metric, setMetric] = useState<Metric | null>(null);
  const [dayModal, setDayModal] = useState(false);
  const [reset, setReset] = useState(false);
  const [ava, setAva] = useState(false);
  const [pendingInterfaceSwitch, setPendingInterfaceSwitch] = useState(false);
  const [avaFullscreen, setAvaFullscreen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingManeuver, setPendingManeuver] = useState<Maneuver | null>(null);
  const [campaignInspectorSelection, setCampaignInspectorSelection] =
    useState<CampaignInspectorSelection | null>(null);
  const [campaignIntroConsumed, setCampaignIntroConsumed] = useState(false);
  const [pendingDoctrine, setPendingDoctrine] = useState<{
    vector: DoctrineVector;
    stage: DoctrineStage;
  } | null>(null);
  const [clock, setClock] = useState(initialClock);
  const [now, setNow] = useState(() => Date.now());
  const [ledgerNow, setLedgerNow] = useState(() => Date.now());
  const [turnBlackout, setTurnBlackout] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [seedOverride, setSeedOverride] = useState<number | null>(null);
  const [challengeConfig, setChallengeConfig] = useState<CampaignConfig | null>(
    null,
  );
  const [runToken, setRunToken] = useState("");
  const [multiplayerRun, setMultiplayerRun] = useState(false);
  const [issuedRecordSlug, setIssuedRecordSlug] = useState<string | null>(null);
  const [issuedCampaignScore, setIssuedCampaignScore] = useState<number | null>(null);
  const [wikiApplet, setWikiApplet] = useState<string | null>(null);
  const [opportunityOpen, setOpportunityOpen] = useState(false);
  const [opportunityInterruptAcknowledged, setOpportunityInterruptAcknowledged] =
    useState(false);
  const [alertMenuOpen, setAlertMenuOpen] = useState(false);
  const [rotationReady, setRotationReady] = useState(false);
  const [adminAccess, setAdminAccess] = useState(false);
  const [dailyAphorismAssignment, setDailyAphorismAssignment] = useState<{
    dayKey: string;
    aphorism: Aphorism;
  } | null>(null);
  const [accountTimeZone, setAccountTimeZone] = useState("UTC");
  const [turnAccess, setTurnAccess] = useState<TurnAccess | null>(null);
  const [turnBusy, setTurnBusy] = useState(false);
  const [commandAccountMenuOpen, setCommandAccountMenuOpen] = useState(false);
  const [systemNotice, setSystemNotice] = useState<string | null>(null);
  const [avaSession, setAvaSession] = useState<AvaNexusSession>(() =>
    createAvaNexusSession(true,"campaign"),
  );
  const [avaArchiveHydrated, setAvaArchiveHydrated] = useState(false);
  const [avaArchiveWritable, setAvaArchiveWritable] = useState(false);
  const avaArchiveShell = useMemo(
    () => ({
      cwd: avaSession.terminal.shell.cwd,
      history: [],
      files: avaSession.terminal.shell.files,
      darkNetUnlocked: avaSession.terminal.shell.darkNetUnlocked,
    }),
    [
      avaSession.terminal.shell.cwd,
      avaSession.terminal.shell.darkNetUnlocked,
      avaSession.terminal.shell.files,
    ],
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const activeAphorismDay = runToken
    ? campaignAphorismDayKey(runToken, s.day)
    : "";
  const previousAphorismDay =
    runToken && s.day > 1 ? campaignAphorismDayKey(runToken, s.day - 1) : "";
  const dailyAphorism =
    dailyAphorismAssignment?.dayKey === activeAphorismDay
      ? dailyAphorismAssignment.aphorism
      : null;
  const avaMessagesRef = useRef<HTMLDivElement>(null);
  const avaCompletionRef = useRef<{
    candidates: string[];
    index: number;
    value: string;
  } | null>(null);
  const [wikiArticle, setWikiArticle] = useState("resolution");
  const priorDay = useRef(s.day);
  const activeArchiveKey = useRef("");
  const campaignAccountKey = useRef("");
  const campaignRevisionRef = useRef(0);
  const lastPersistedCampaignSeal = useRef("");
  const campaignPersistenceEpoch = useRef(0);
  const campaignSaveChain = useRef<Promise<void>>(Promise.resolve());
  const campaignSyncSuppressed = useRef(false);
  const remoteSaveFailureNotified = useRef(false);
  const localSaveFailureNotified = useRef(false);
  const overdueTurnCount = useRef(0);
  const overdueTurnsApplied = useRef(false);
  const turnClaimInFlight = useRef(false);
  const campaignMutationsHeld = useRef(false);
  const liveStateRef = useRef(s);
  liveStateRef.current = s;
  const liveClockRef=useRef(clock);
  liveClockRef.current=clock;
  const liveRunTokenRef=useRef(runToken);
  liveRunTokenRef.current=runToken;
  const liveMultiplayerRunRef=useRef(multiplayerRun);
  liveMultiplayerRunRef.current=multiplayerRun;
  const liveAvaSessionRef=useRef(avaSession);
  liveAvaSessionRef.current=avaSession;
  const priorTelemetryModule = useRef<Page>("campaign");
  const [initialModuleEnteredAt] = useState(Date.now);
  const moduleEnteredAt = useRef(initialModuleEnteredAt);
  useEffect(() => {
    if (priorDay.current === s.day) return;
    priorDay.current = s.day;
    setPage("campaign");
    setBriefingModule("campaign");
    setCampaignInspectorSelection(null);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [s.day]);
  useEffect(() => {
    if (!ava) return;
    const frame = window.requestAnimationFrame(() => {
      const element = avaMessagesRef.current;
      if (element) element.scrollTop = element.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [ava, messages.length]);
  useEffect(() => {
    let live=true;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("wiki"),
      challenge = params.get("challenge"),
      requestedSeed = Number(params.get("seed"));
    if (requested) {
      setWikiArticle(requested);
      setPage("wiki");
    } else if (params.get("account") === "1") setPage("account");
    else if (challenge) {
      void fetch(
        `/api/campaign-records/${encodeURIComponent(challenge)}/challenge`,
        { cache: "no-store" },
      )
        .then(async (response) => {
          if (!response.ok) throw new Error("Challenge not found.");
          const data = (await response.json()) as {
            campaignSeed: number;
            theater: CampaignConfig["theater"];
            archetype: string;
            adversary: string;
          };
          setChallengeConfig({
            seed: data.campaignSeed,
            theater: data.theater,
            archetype: data.archetype,
            adversaryPersonality: data.adversary,
          });
          setMultiplayerRun(true);
          setReset(true);
        })
        .catch(() =>
          setSystemNotice(
            "CHALLENGE UNAVAILABLE // THE SEALED CAMPAIGN RECORD COULD NOT BE LOCATED",
          ),
        );
    } else if (Number.isFinite(requestedSeed) && requestedSeed > 0) {
      setSeedOverride(requestedSeed);
      setReset(true);
    }
    const fresh=()=>{
      if(!live)return;
      const nextRunToken=portableId();
      activeArchiveKey.current=nextRunToken;
      setRunToken(nextRunToken);
      setAvaArchiveWritable(true);
      setAvaArchiveHydrated(true);
    };
    const hydrateCampaign=async()=>{
      let remoteRecord:StoredCampaignEnvelope|null=null;
      let accountKey="";
      let remoteAvailable=false;
      try{
        const response=await fetch("/api/campaign",{cache:"no-store"});
        if(!response.ok)throw new Error("Account campaign state is unavailable.");
        const payload=await response.json() as {accountKey?:string;campaign?:StoredCampaignEnvelope|null};
        accountKey=typeof payload.accountKey==="string"?payload.accountKey:"";
        campaignAccountKey.current=accountKey;
        remoteRecord=payload.campaign??null;
        remoteAvailable=true;
      }catch{
        if(live)setSystemNotice("ACCOUNT CAMPAIGN SYNC UNAVAILABLE // DEVICE SAVE REMAINS AVAILABLE // RELOAD TO RETRY");
      }
      let localRecord:StoredCampaignEnvelope|null=null;
      let migrated=false;
      try{
        const raw=window.localStorage.getItem(SAVE_KEY);
        localRecord=raw?JSON.parse(raw) as StoredCampaignEnvelope:null;
        migrated=window.localStorage.getItem(SERVER_MIGRATION_KEY)==="1";
      }catch{}
      if(!live)return;
      const hydration=selectCampaignForHydration({
        remote:remoteRecord,
        local:localRecord,
        accountKey,
        migrated,
        remoteAvailable,
      });
      const record=hydration.record;
      campaignRevisionRef.current=hydration.expectedRevision;
      campaignSyncSuppressed.current=hydration.remoteDeleted;
      if(
        hydration.source==="device"&&
        accountKey&&
        !record?.accountKey
      )
        try{window.localStorage.setItem(SERVER_MIGRATION_KEY,"1");}catch{}
      if(hydration.discardedDeviceBranch)
        try{window.localStorage.removeItem(SAVE_KEY);}catch{}
      const restored=restoreCampaignState(record?.state);
      if(!restored){
        fresh();
        if(hydration.remoteDeleted)
          setSystemNotice(
            "ACCOUNT CAMPAIGN REMOVED IN ANOTHER SESSION // STALE DEVICE STATE WAS RETIRED // START A NEW CAMPAIGN TO CREATE A NEW RECORD",
          );
        setHydrated(true);
        return;
      }
      if(hydration.source==="remote"&&record)
        lastPersistedCampaignSeal.current=campaignPayloadSeal(record);
      const savedEnd=record?.clock?.end;
      if(typeof savedEnd==="number"&&savedEnd<Date.now())
        overdueTurnCount.current=Math.min(
          31,
          Math.max(1,Math.floor((Date.now()-savedEnd)/DAY_MS)+1),
        );
      const restoredRunToken=
        typeof record?.runToken==="string"&&record.runToken
          ? record.runToken
          : portableId();
      setS(restored);
      setHasSave(true);
      activeArchiveKey.current=restoredRunToken;
      setRunToken(restoredRunToken);
      setMultiplayerRun(!!record?.multiplayerRun);
      if(
        record?.clock&&
        typeof record.clock.start==="number"&&
        typeof record.clock.end==="number"
      )
        if(record.clock.end>Date.now())setClock({start:record.clock.start,end:record.clock.end});
        else setClock(accountDayBounds(browserTimeZone()));
      void loadAvaShellArchive(restoredRunToken,restored.campaignId)
        .then((archive)=>{
          if(!live||activeArchiveKey.current!==restoredRunToken)return;
          const archived=restoreAvaShellSession(archive,restored);
          setAvaSession((current)=>{
            const byPath=new Map(
              [...archived.files,...current.terminal.shell.files].map((file)=>[file.path,file]),
            );
            const interacted=
              current.terminal.shell.history.length>0||
              current.terminal.shell.files.length>0||
              current.terminal.shell.cwd!==initialAvaTerminalSession().shell.cwd;
            return{
              ...current,
              terminal:{
                ...current.terminal,
                shell:{
                  cwd:interacted?current.terminal.shell.cwd:archived.cwd,
                  history:current.terminal.shell.history,
                  files:[...byPath.values()],
                  darkNetUnlocked:
                    current.terminal.shell.darkNetUnlocked||
                    archived.darkNetUnlocked,
                },
              },
            };
          });
          setAvaArchiveWritable(true);
          setAvaArchiveHydrated(true);
        })
        .catch(()=>{
          if(!live||activeArchiveKey.current!==restoredRunToken)return;
          setAvaArchiveWritable(false);
          setAvaArchiveHydrated(true);
          setSystemNotice("AVA ARCHIVE READ FAILED // SAVED REPORTS WERE NOT MODIFIED; RELOAD TO RETRY");
        });
      setHydrated(true);
    };
    void hydrateCampaign();
    return()=>{
      live=false;
    };
  }, []);
  useEffect(() => {
    const detected=browserTimeZone();
    setAccountTimeZone(detected);
    setClock(accountDayBounds(detected));
    void fetch("/api/account", { cache: "no-store" })
      .then(async response=>{
        if(!response.ok)return null;
        const value:unknown=await response.json();
        return isAccountBootstrap(value)?value:null;
      })
      .then(async(account)=>{
        setAdminAccess(!!account?.isAdmin);
        if(account?.turn)setTurnAccess(account.turn);
        if(account&&!account.timeZoneConfigured){
          const response=await fetch("/api/account",{
            method:"PATCH",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({timeZone:detected}),
          });
          if(response.ok){
            const initialized=await response.json() as {timeZone?:string};
            if(initialized.timeZone){
              setAccountTimeZone(initialized.timeZone);
              setClock(accountDayBounds(initialized.timeZone));
              return;
            }
          }
        }
        if(account?.timeZone){
          setAccountTimeZone(account.timeZone);
          setClock(accountDayBounds(account.timeZone));
        }
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const updateBoundary = (event: Event) => {
      const timeZone = (event as CustomEvent<string>).detail;
      if (typeof timeZone !== "string") return;
      setAccountTimeZone(timeZone);
      setClock(accountDayBounds(timeZone, Date.now()));
      void fetch("/api/turn", { cache: "no-store" })
        .then(async (response) =>
          response.ok ? ((await response.json()) as TurnAccess) : null,
        )
        .then((turn) => {
          if (turn) setTurnAccess(turn);
        })
        .catch(() => undefined);
    };
    window.addEventListener("account-time-zone-changed", updateBoundary);
    return () =>
      window.removeEventListener("account-time-zone-changed", updateBoundary);
  }, []);
  useEffect(() => {
    let live = true;
    let localIds: string[] = [];
    try {
      const value = JSON.parse(
        window.localStorage.getItem(OPPORTUNITY_LEDGER_KEY) ?? "[]",
      ) as unknown;
      if (Array.isArray(value))
        localIds = value.filter((item): item is string => typeof item === "string");
    } catch {}
    setS((current) => ({
      ...current,
      accountOpportunityIds: [
        ...new Set([...current.accountOpportunityIds, ...localIds]),
      ],
    }));
    void fetch("/api/rotation/opportunities", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return { ids: [] as string[] };
        return (await response.json()) as { ids?: string[] };
      })
      .then((payload) => {
        if (!live) return;
        const remoteIds = Array.isArray(payload.ids)
          ? payload.ids.filter((item): item is string => typeof item === "string")
          : [];
        setS((current) => ({
          ...current,
          accountOpportunityIds: [
            ...new Set([
              ...current.accountOpportunityIds,
              ...localIds,
              ...remoteIds,
            ]),
          ],
        }));
      })
      .catch(() => undefined)
      .finally(() => {
        if (live) setRotationReady(true);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if(!activeAphorismDay)return;
    let live = true;
    const dayKey = activeAphorismDay;
    let deviceKey = "";
    let localSeen: string[] = [];
    let localDays: Record<string, string> = {};
    let localLastId: string | undefined;
    try {
      deviceKey = window.localStorage.getItem(DEVICE_KEY) ?? portableId();
      window.localStorage.setItem(DEVICE_KEY, deviceKey);
      localLastId =
        window.localStorage.getItem(APHORISM_LAST_KEY) ?? undefined;
      const seen = JSON.parse(
        window.localStorage.getItem(APHORISM_LEDGER_KEY) ?? "[]",
      ) as unknown;
      if (Array.isArray(seen))
        localSeen = seen.filter(
          (item): item is string => typeof item === "string",
        );
      const days = JSON.parse(
        window.localStorage.getItem(APHORISM_ASSIGNMENT_KEY) ?? "{}",
      ) as unknown;
      if (days && typeof days === "object")
        localDays = Object.fromEntries(
          Object.entries(days as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        );
    } catch {}
    void fetch("/api/rotation/aphorisms", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok)
          return {
            ids: [] as string[],
            entries: [] as Array<{
              itemId: string;
              context: string;
              updatedAt?: number;
            }>,
            accountKey: null as string | null,
          };
        return (await response.json()) as {
          ids?: string[];
          entries?: Array<{
            itemId: string;
            context: string;
            updatedAt?: number;
          }>;
          accountKey?: string | null;
        };
      })
      .then((payload) => {
        if (!live) return;
        const remoteIds = Array.isArray(payload.ids)
          ? payload.ids.filter((item): item is string => typeof item === "string")
          : [];
        const remoteToday = payload.entries?.find(
          (entry) => entry.context === dayKey,
        )?.itemId;
        const remotePrevious = previousAphorismDay
          ? payload.entries?.find(
              (entry) => entry.context === previousAphorismDay,
            )?.itemId
          : undefined;
        const remoteLast = payload.entries
          ?.filter((entry) => typeof entry.updatedAt === "number")
          .sort(
            (left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0),
          )[0]?.itemId;
        const assignedId = remoteToday ?? localDays[dayKey];
        const assigned = APHORISMS.find((item) => item.id === assignedId);
        const selected =
          assigned ??
          aphorismForDay(
            payload.accountKey ?? deviceKey,
            dayKey,
            [...new Set([...localSeen, ...remoteIds])],
            localDays[previousAphorismDay] ??
              remotePrevious ??
              localLastId ??
              remoteLast,
          );
        if (!selected) return;
        setDailyAphorismAssignment({ dayKey, aphorism: selected });
        const seen = [...new Set([...localSeen, ...remoteIds, selected.id])];
        try {
          window.localStorage.setItem(APHORISM_LEDGER_KEY, JSON.stringify(seen));
          window.localStorage.setItem(APHORISM_LAST_KEY, selected.id);
          window.localStorage.setItem(
            APHORISM_ASSIGNMENT_KEY,
            JSON.stringify({ ...localDays, [dayKey]: selected.id }),
          );
        } catch {}
        void fetch("/api/rotation/aphorisms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: selected.id, dayKey }),
          keepalive: true,
        }).catch(() => undefined);
      })
      .catch(() => {
        const assigned = APHORISMS.find(
          (item) => item.id === localDays[dayKey],
        );
        const selected =
          assigned ??
          aphorismForDay(
            deviceKey,
            dayKey,
            localSeen,
            localDays[previousAphorismDay] ?? localLastId,
          );
        if (!live || !selected) return;
        setDailyAphorismAssignment({ dayKey, aphorism: selected });
        try {
          window.localStorage.setItem(
            APHORISM_LEDGER_KEY,
            JSON.stringify([...new Set([...localSeen,selected.id])]),
          );
          window.localStorage.setItem(APHORISM_LAST_KEY, selected.id);
          window.localStorage.setItem(
            APHORISM_ASSIGNMENT_KEY,
            JSON.stringify({...localDays,[dayKey]:selected.id}),
          );
        } catch {}
      });
    return () => {
      live = false;
    };
  }, [activeAphorismDay, previousAphorismDay]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("wiki") || params.get("standalone") === "1") {
      setInterfaceMode("command");
      return;
    }
    const saved = window.localStorage.getItem("delenda.quest.interface.v1");
    if (saved === "briefing" || saved === "command") setInterfaceMode(saved);
  }, []);
  useEffect(() => {
    if (!hydrated || !runToken) return;
    const envelope:StoredCampaignEnvelope={
      accountKey:campaignAccountKey.current||undefined,
      state:s,
      clock,
      runToken,
      multiplayerRun,
      savedAt:Date.now(),
      revision:campaignRevisionRef.current,
    };
    try {
      window.localStorage.setItem(SAVE_KEY,JSON.stringify(envelope));
      setHasSave(true);
      localSaveFailureNotified.current=false;
    } catch {
      if(!localSaveFailureNotified.current){
        localSaveFailureNotified.current=true;
        setSystemNotice(
          "DEVICE SAVE FAILED // ACCOUNT SYNC WILL CONTINUE // FREE DEVICE STORAGE AND MAKE ANOTHER CHANGE TO RETRY",
        );
      }
    }
    if(
      !campaignAccountKey.current||
      campaignSyncSuppressed.current||
      campaignPayloadSeal(envelope)===lastPersistedCampaignSeal.current
    )return;
    const epoch=campaignPersistenceEpoch.current;
    const timer=window.setTimeout(()=>{
      campaignSaveChain.current=campaignSaveChain.current.then(async()=>{
        if(epoch!==campaignPersistenceEpoch.current)return;
        const submission:StoredCampaignEnvelope={
          ...envelope,
          expectedRevision:campaignRevisionRef.current,
        };
        try{
          const response=await fetch("/api/campaign",{
            method:"PUT",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify(submission),
          });
          const payload=await response.json().catch(()=>({})) as {
            accountKey?:string;
            error?:string;
            code?:string;
            conflict?:"modified"|"deleted";
            campaign?:StoredCampaignEnvelope|null;
          };
          if(epoch!==campaignPersistenceEpoch.current)return;
          if(response.status===409&&payload.code==="CAMPAIGN_REVISION_CONFLICT"){
            campaignPersistenceEpoch.current+=1;
            if(payload.campaign){
              const restored=restoreCampaignState(payload.campaign.state);
              if(!restored)
                throw new Error("The authoritative campaign could not be restored.");
              campaignRevisionRef.current=campaignRevision(payload.campaign.revision);
              campaignSyncSuppressed.current=false;
              lastPersistedCampaignSeal.current=campaignPayloadSeal(payload.campaign);
              const restoredRunToken=
                typeof payload.campaign.runToken==="string"&&payload.campaign.runToken
                  ? payload.campaign.runToken
                  : portableId();
              liveStateRef.current=restored;
              setS(restored);
              setRunToken(restoredRunToken);
              activeArchiveKey.current=restoredRunToken;
              setMultiplayerRun(!!payload.campaign.multiplayerRun);
              if(
                typeof payload.campaign.clock?.start==="number"&&
                typeof payload.campaign.clock.end==="number"
              )
                setClock({
                  start:payload.campaign.clock.start,
                  end:payload.campaign.clock.end,
                });
              const authoritativeDeviceCopy:StoredCampaignEnvelope={
                ...payload.campaign,
                accountKey:campaignAccountKey.current||undefined,
                savedAt:Date.now(),
              };
              try{
                window.localStorage.setItem(
                  SAVE_KEY,
                  JSON.stringify(authoritativeDeviceCopy),
                );
              }catch{}
              setSystemNotice(
                "CAMPAIGN RECONCILED // ANOTHER SESSION SAVED FIRST // THE AUTHORITATIVE ACCOUNT STATE IS NOW LOADED",
              );
            }else{
              campaignRevisionRef.current=0;
              campaignSyncSuppressed.current=true;
              lastPersistedCampaignSeal.current="";
              try{window.localStorage.removeItem(SAVE_KEY);}catch{}
              setSystemNotice(
                "ACCOUNT CAMPAIGN REMOVED IN ANOTHER SESSION // STALE DEVICE STATE WILL NOT BE RECREATED // START A NEW CAMPAIGN TO CONTINUE",
              );
            }
            return;
          }
          if(!response.ok)
            throw new Error(
              publicErrorMessage(
                payload.error,
                "Campaign save was not accepted.",
              ),
            );
          if(!campaignSaveWasAccepted(submission,payload.campaign))
            throw new Error("Campaign save acknowledgment did not match the submitted state.");
          campaignRevisionRef.current=campaignRevision(payload.campaign?.revision);
          lastPersistedCampaignSeal.current=campaignPayloadSeal(submission);
          if(payload.accountKey)campaignAccountKey.current=payload.accountKey;
          try{
            const currentRaw=window.localStorage.getItem(SAVE_KEY);
            const current=currentRaw
              ? JSON.parse(currentRaw) as StoredCampaignEnvelope
              : null;
            if(current&&campaignPayloadSeal(current)===campaignPayloadSeal(submission))
              window.localStorage.setItem(
                SAVE_KEY,
                JSON.stringify({
                  ...current,
                  revision:campaignRevisionRef.current,
                }),
              );
            window.localStorage.setItem(SERVER_MIGRATION_KEY,"1");
          }catch{}
          remoteSaveFailureNotified.current=false;
        }catch(error){
          if(remoteSaveFailureNotified.current)return;
          remoteSaveFailureNotified.current=true;
          setSystemNotice(
            error instanceof Error
              ? `ACCOUNT SAVE DELAYED // DEVICE SAVE IS CURRENT // ${error.message.toUpperCase()}`
              : "ACCOUNT SAVE DELAYED // DEVICE SAVE IS CURRENT // RETRYING AFTER THE NEXT CHANGE",
          );
        }
      });
    },450);
    return()=>{
      window.clearTimeout(timer);
    };
  }, [s, clock, runToken, multiplayerRun, hydrated]);
  useEffect(() => {
    if (
      !hydrated ||
      !avaArchiveHydrated ||
      !avaArchiveWritable ||
      !runToken ||
      activeArchiveKey.current !== runToken
    )
      return;
    void saveAvaShellArchive(
      runToken,
      s.campaignId,
      avaArchiveShell,
    ).catch(() => {
      if (activeArchiveKey.current !== runToken) return;
      setAvaArchiveWritable(false);
      setSystemNotice(
        "AVA ARCHIVE WRITE FAILED // SAVED REPORTS WERE NOT MODIFIED; CURRENT REPORTS REMAIN DOWNLOADABLE",
      );
    });
  }, [
    hydrated,
    avaArchiveHydrated,
    avaArchiveWritable,
    runToken,
    s.campaignId,
    avaArchiveShell,
  ]);
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const clockId = window.setInterval(
      () => setNow(Date.now()),
      reduced ? 1000 : 47,
    );
    const ledgerId = window.setInterval(() => setLedgerNow(Date.now()), 1700);
    return () => {
      window.clearInterval(clockId);
      window.clearInterval(ledgerId);
    };
  }, []);
  useEffect(() => {
    const closeTop = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (wikiApplet) setWikiApplet(null);
      else if (opportunityOpen) setOpportunityOpen(false);
      else if (pendingDoctrine) setPendingDoctrine(null);
      else if (metric) setMetric(null);
      else if (dayModal) setDayModal(false);
      else if (reset) setReset(false);
      else if (avaFullscreen) setAvaFullscreen(false);
      else if (ava) setAva(false);
      else if (commandAccountMenuOpen) setCommandAccountMenuOpen(false);
    };
    window.addEventListener("keydown", closeTop);
    return () => window.removeEventListener("keydown", closeTop);
  }, [
    wikiApplet,
    opportunityOpen,
    pendingDoctrine,
    metric,
    dayModal,
    reset,
    ava,
    avaFullscreen,
    commandAccountMenuOpen,
  ]);
  useEffect(() => {
    const openBriefingSurface = (module: string, family?: string) =>
      window.dispatchEvent(
        new CustomEvent("briefing-open-surface", {
          detail: family ? { module, family } : module,
        }),
      );
    const openManualApplet = (article: string) => setWikiApplet(article);
    const wiki = (e: Event) => {
      const article = (e as CustomEvent<string>).detail;
      if (interfaceMode === "briefing")
        window.dispatchEvent(
          new CustomEvent("briefing-open-manual", { detail: article }),
        );
      else {
        setWikiArticle(article);
        setPage("wiki");
      }
    };
    const wikiAppletEvent = (e: Event) => {
      const article = (e as CustomEvent<string>).detail;
      openManualApplet(article);
    };
    const familyEvent = (e: Event) => {
      const hit = FAMILIES.find(
        (f) => f.id === (e as CustomEvent<string>).detail,
      );
      if (hit) {
        setMetric(null);
        setWikiApplet(null);
        setFocusFamily(hit.id);
        if (interfaceMode === "briefing")
          openBriefingSurface(hit.module, hit.id);
        else setPage(hit.module);
      }
    };
    const moduleEvent = (e: Event) => {
      const targetModule = (e as CustomEvent<Module>).detail;
      if (
        modules.some((item) => item.id === targetModule) ||
        targetModule === "wiki" ||
        targetModule === "account"
      ) {
        setWikiApplet(null);
        if (interfaceMode === "briefing") openBriefingSurface(targetModule);
        else setPage(targetModule);
      }
    };
    window.addEventListener("open-wiki", wiki);
    window.addEventListener("open-wiki-applet", wikiAppletEvent);
    window.addEventListener("open-family", familyEvent);
    window.addEventListener("open-module", moduleEvent);
    return () => {
      window.removeEventListener("open-wiki", wiki);
      window.removeEventListener("open-wiki-applet", wikiAppletEvent);
      window.removeEventListener("open-family", familyEvent);
      window.removeEventListener("open-module", moduleEvent);
    };
  }, [interfaceMode]);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [page]);
  useEffect(() => installInteractionTelemetry(() => page), [page]);
  useEffect(() => {
    if (hydrated) recordPageView(`module:${page}`);
    if(hydrated&&priorTelemetryModule.current!==page){
      recordModuleDwell(priorTelemetryModule.current,(Date.now()-moduleEnteredAt.current)/1000);
      recordModuleSwitch(priorTelemetryModule.current,page);
      priorTelemetryModule.current=page;moduleEnteredAt.current=Date.now();
    }
  }, [page, hydrated]);
  useEffect(() => {
    if (hydrated && page === "wiki")
      recordPageView(`wiki:${wikiArticle}`, "wiki");
  }, [page, wikiArticle, hydrated]);
  useEffect(() => {
    if (hydrated && wikiApplet) recordPageView(`wiki:${wikiApplet}`, "applet");
  }, [wikiApplet, hydrated]);
  useEffect(() => {
    if (hydrated && s.status !== "active") recordCampaignOutcome(s);
  }, [s, hydrated]);
  useEffect(() => {
    if (!hydrated || s.status === "active" || !runToken) return;
    let live = true;
    void submitCampaignRecord(s, runToken,{multiplayer:multiplayerRun})
      .then((record: unknown) => {
        const issued=record as {publicSlug?:string;campaignScore?:number}|null;
        if (live && issued?.publicSlug) {
          setIssuedRecordSlug(issued.publicSlug);
          setIssuedCampaignScore(issued.campaignScore??null);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [s, runToken, multiplayerRun, hydrated]);
  const terminalScore = useMemo(
    () => campaignScoreForState(s),
    [s],
  );
  const fraction = hydrated
    ? Math.max(
        0,
        Math.min(1, (ledgerNow - clock.start) / (clock.end - clock.start)),
      )
    : 0;
  const live = useMemo(() => liveProjection(s, fraction), [s, fraction]);
  const [balance, tone] = useMemo(() => assessment(s), [s]);
  const remaining = clock.end - now;
  const canResolveDay =
    s.status === "active" &&
    !!turnAccess &&
    (turnAccess.godMode || turnAccess.canResolve) &&
    !turnBusy;
  const opportunityWindow = opportunityStatusForFraction(s, fraction);
  const opportunityClosesAt = opportunityWindow.packet
    ? new Date(
        clock.start +
          opportunityWindow.packet.closesAtFraction * (clock.end - clock.start),
      ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const opportunityRemaining =
    opportunityWindow.packet
      ? Math.max(
          0,
          clock.start +
            opportunityWindow.packet.closesAtFraction *
              (clock.end - clock.start) -
            ledgerNow,
        )
      : 0;
  useEffect(() => {
    if (opportunityOpen && opportunityWindow.status !== "active")
      setOpportunityOpen(false);
  }, [opportunityOpen, opportunityWindow.status]);
  useEffect(() => {
    const packet = opportunityWindow.packet;
    if (
      !hydrated ||
      !rotationReady ||
      !packet ||
      campaignMutationsHeld.current
    ) return;
    const assignment = s.opportunityAssignments.find(
      (item) =>
        item.campaignId === s.campaignId &&
        item.day === s.day &&
        item.opportunityId === packet.id,
    );
    if(
      (opportunityWindow.status!=="active"||assignment)&&
      (
        opportunityWindow.status!=="expired"||
        s.opportunityHistory.some(
          (record)=>
            record.day===s.day&&record.opportunityId===packet.id,
        )
      )
    )return;
    const result=runAvaNexusRequest(
      {
        kind:"internal",
        origin:"internal",
        operation:"reconcile-opportunity",
        opportunityFraction:fraction,
        expectedStateSeal:avaRequestStateSeal(s),
      },
      {
        playerId:"browser-internal",
        campaignId:s.campaignId,
        campaignRevision:avaNexusStateRevision(s),
        surface:"internal",
        authority:"command",
        nowMs:Date.now(),
      },
      s,
      liveAvaSessionRef.current,
      fraction,
    );
    liveAvaSessionRef.current=result.session;
    setAvaSession(result.session);
    const fact=result.response.fact as {
      status?:"opened"|"expired"|"unchanged";
    };
    const status=
      fact.status==="opened"||fact.status==="expired"
        ? fact.status
        : null;
    const next=result.state;
    if(!status||next===s)return;
    liveStateRef.current=next;
    setS(next);
    try {
      window.localStorage.setItem(
        OPPORTUNITY_LEDGER_KEY,
        JSON.stringify(next.accountOpportunityIds),
      );
    } catch {}
    void fetch("/api/rotation/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: packet.id,
        status,
        campaignId: s.campaignId,
        day: s.day,
      }),
      keepalive: true,
    }).catch(() => undefined);
    if (status === "opened") setOpportunityInterruptAcknowledged(false);
    if (status === "expired")
      setSystemNotice(
        `TARGET MISSED // ${packet.label.toUpperCase()} // PERMANENT LEDGER UPDATED`,
      );
  }, [
    hydrated,
    rotationReady,
    opportunityWindow.status,
    opportunityWindow.packet?.id,
    s,
    turnBusy,
  ]);
  const theater = THEATERS.find((x) => x.id === s.theater) ?? THEATERS[0];
  const projectedProduction = useMemo(() => projectProduction(s), [s]);
  const majorAlerts = useMemo(() => {
    const alerts: {
      id: string;
      title: string;
      body: string;
      urgent: boolean;
      opportunity?: boolean;
    }[] = [];
    if (s.status !== "active") return alerts;
    const packet = opportunityWindow.packet;
    if (opportunityWindow.status === "active" && packet) {
      const legalResponses = packet.responses.filter(
        (response) => !opportunityResponseRejection(s, response),
      ).length;
      alerts.push({
        id: `opportunity-${packet.id}`,
        title: `TARGET OF OPPORTUNITY // ${packet.headline}`,
        body: legalResponses
          ? `${legalResponses} mitigating response${legalResponses === 1 ? "" : "s"} remain available through day resolution.`
          : "The intervention window remains open, but no response is currently executable. AVA records the exposure as fact; only mitigation is possible if conditions change.",
        urgent: true,
        opportunity: true,
      });
    }
    for (const line of projectedProduction.lines) {
      if (line.closing > 0 && line.coverage >= 2) continue;
      const label = resourceLabel[line.resource].toUpperCase();
      alerts.push({
        id: `supply-${line.resource}`,
        title:
          line.opening <= 0
            ? `${label} STOCKPILE DEPLETED`
            : `${label} STOCKPILE BELOW SUSTAINMENT`,
        body:
          `Production continues at ${fmt(line.output, true)} against desired output ` +
          `${fmt(line.desiredOutput, true)}. ` +
          (line.unmetUse > 0
            ? `Only ${fmt(line.fulfilledUse, true)} of ${fmt(line.requestedUse, true)} demand can be supplied; ${fmt(line.unmetUse, true)} remains unmet. `
            : `${fmt(Math.abs(line.equilibrium), true)} ${line.equilibrium >= 0 ? "surplus" : "deficit"} at equilibrium. `) +
          "Loss exposure increases below target; depletion does not reduce industrial output to zero.",
        urgent: true,
      });
    }
    return alerts;
  }, [opportunityWindow.status, opportunityWindow.packet, projectedProduction, s]);
  const runBrowserNexusRequest = (
    request:AvaRequestIR,
    state=liveStateRef.current,
    opportunityFraction=fraction,
  ) => {
    const result=runAvaNexusRequest(
      request,
      {
        playerId:"web",
        campaignId:state.campaignId,
        campaignRevision:avaNexusStateRevision(state),
        surface:"web",
        authority:"command",
        nowMs:Date.now(),
      },
      state,
      liveAvaSessionRef.current,
      opportunityFraction,
    );
    liveAvaSessionRef.current=result.session;
    setAvaSession(result.session);
    return result;
  };
  const rejectMutationDuringTurnClaim = () => {
    if (!campaignMutationsHeld.current) return false;
    setSystemNotice(
      "CAMPAIGN MUTATION HELD // DAILY TURN AUTHORITY IS BEING VERIFIED",
    );
    return true;
  };
  const startCampaign = async (config: CampaignConfig) => {
    if(rejectMutationDuringTurnClaim())return;
    campaignMutationsHeld.current=true;
    setTurnBusy(true);
    try{
      let drained=campaignSaveChain.current;
      await drained;
      while(drained!==campaignSaveChain.current){
        drained=campaignSaveChain.current;
        await drained;
      }
      campaignPersistenceEpoch.current+=1;
      if(s.status==="active"&&s.resolutionHistory.length>0&&runToken)
        void submitCampaignRecord(s,`${runToken}-abandoned`,{abandoned:true,multiplayer:multiplayerRun}).catch(()=>undefined);
      const next = initialState(config);
      const n = Date.now();
      const nextRunToken = portableId();
      if(campaignSyncSuppressed.current)campaignRevisionRef.current=0;
      campaignSyncSuppressed.current=false;
      lastPersistedCampaignSeal.current="";
      if (runToken) void deleteAvaShellArchive(runToken).catch(() => undefined);
      liveStateRef.current=next;
      setS(next);
      activeArchiveKey.current = nextRunToken;
      liveRunTokenRef.current=nextRunToken;
      setRunToken(nextRunToken);
      setAvaArchiveWritable(true);
      setAvaArchiveHydrated(true);
      setIssuedRecordSlug(null);
      setIssuedCampaignScore(null);
      setPage("campaign");
      setFocusFamily(undefined);
      setMetric(null);
      setPendingManeuver(null);
      setCampaignInspectorSelection(null);
      setCampaignIntroConsumed(false);
      setPendingDoctrine(null);
      const nextAvaSession=createAvaNexusSession(true,"campaign");
      liveAvaSessionRef.current=nextAvaSession;
      setAvaSession(nextAvaSession);
      const nextClock=accountDayBounds(accountTimeZone,n);
      liveClockRef.current=nextClock;
      setClock(nextClock);
      setNow(n);
      setLedgerNow(n);
      setReset(false);
      setSeedOverride(null);
      liveMultiplayerRunRef.current=!!challengeConfig;
      setMultiplayerRun(!!challengeConfig);
      setChallengeConfig(null);
      setMessages([]);
      setSystemNotice(null);
      setOpportunityInterruptAcknowledged(false);
      setAlertMenuOpen(false);
      window.history.replaceState({}, "", window.location.pathname);
    }finally{
      campaignMutationsHeld.current=false;
      setTurnBusy(false);
    }
  };
  const announceOpenDay = (next: GameState) => {
    if (next.actions === 0)
      setSystemNotice(
        `ORDER BUDGET EXHAUSTED // DAY ${next.day} REMAINS OPEN // RESOLVE MANUALLY`,
      );
  };
  const issueDirective = (selectedFamily: Family, choice: Choice) => {
    if(rejectMutationDuringTurnClaim())return;
    const visibility = getVisibleChoice(
      {
        playerId: "web",
        campaignId: s.campaignId,
        campaignRevision: `${s.day}:${s.actions}`,
        surface: "web",
        authority: "command",
        nowMs: Date.now(),
      },
      s,
      choice.id,
    );
    if (visibility.status !== "OK" || !visibility.fact.visible) {
      setSystemNotice(
        `ORDER UNAVAILABLE // ${visibility.recovery?.instruction ?? "Not on today's docket."}`,
      );
      return;
    }
    const action:AvaActionRef={
      kind:"directive",
      familyId:selectedFamily.id,
      choiceId:choice.id,
    };
    const prepared=runBrowserNexusRequest(
      prepareAvaActionRequest(s,action,{
        origin:"browser-ui",
        idempotencyKey:`web:${s.campaignId}:${s.day}:directive:${choice.id}:prepare`,
      }),
      s,
    );
    if(
      prepared.response.status!=="PREPARED"||
      !prepared.session.proposalToken
    ){
      setSystemNotice(
        `ORDER NOT PREPARED // ${prepared.response.recovery?.instruction??prepared.response.rendering.brief}`,
      );
      return;
    }
    liveStateRef.current=prepared.state;
    setS(prepared.state);
    const result=runBrowserNexusRequest(
      {
        kind:"confirmation",
        origin:"browser-ui",
        token:prepared.session.proposalToken,
        expectedStateSeal:avaRequestStateSeal(prepared.state),
        idempotencyKey:`web:${s.campaignId}:${s.day}:directive:${choice.id}:confirm`,
      },
      prepared.state,
    );
    if(
      result.response.status!=="EXECUTED"&&
      result.response.status!=="ALREADY_EXECUTED"
    ){
      setSystemNotice(
        `ORDER PREPARED BUT NOT CONFIRMED // ${result.response.recovery?.instruction??result.response.rendering.brief}`,
      );
      return;
    }
    liveStateRef.current=result.state;
    setS(result.state);
    announceOpenDay(result.state);
  };
  const switchInterface = (mode: "command" | "briefing") => {
    if (mode === interfaceMode) return;
    if (mode === "command") setPage(briefingModule);
    else setBriefingModule(gameModuleForPage(page));
    setInterfaceMode(mode);
    try {
      window.localStorage.setItem("delenda.quest.interface.v1", mode);
    } catch {}
  };
  const issueConverged = (selection: {
    maneuverId?: string;
    domesticId?: string;
    networkId?: string;
  }) => {
    if(rejectMutationDuringTurnClaim())return;
    const packet = compileConvergence(s),
      actions: AvaActionRef[] = [];
    if (selection.maneuverId)
      actions.push({ kind: "maneuver", maneuverId: selection.maneuverId });
    if (selection.domesticId)
      actions.push({
        kind: "sub-mission",
        domain: "domestic",
        missionId: packet.domestic.id,
        optionId: selection.domesticId,
        resolutionTicket: packet.domestic.resolutionTicket,
      });
    if (selection.networkId)
      actions.push({
        kind: "sub-mission",
        domain: "network",
        missionId: packet.network.id,
        optionId: selection.networkId,
        resolutionTicket: packet.network.resolutionTicket,
      });
    if (!actions.length) return;
    const result=runBrowserNexusRequest(
      executeAvaPlanRequest(s,actions,{
        origin:"browser-ui",
        idempotencyKey:`web:${s.campaignId}:${s.day}:converged:${actions.map(actionKey).join("+")}`,
      }),
      s,
    );
    if(result.response.status!=="EXECUTED"){
      setSystemNotice(
        `ORDERS NOT EXECUTED // ${result.response.recovery?.instruction??result.response.rendering.brief}`,
      );
      return;
    }
    liveStateRef.current=result.state;
    setS(result.state);
    announceOpenDay(result.state);
  };
  const issueManeuver = (selection?: Maneuver) => {
    if(rejectMutationDuringTurnClaim())return;
    const maneuver = selection ?? pendingManeuver;
    if (!maneuver) return;
    const action:AvaActionRef={kind:"maneuver",maneuverId:maneuver.id};
    const result=runBrowserNexusRequest(
      executeAvaActionRequest(s,action,{
        origin:"browser-ui",
        idempotencyKey:`web:${s.campaignId}:${s.day}:maneuver:${maneuver.id}`,
      }),
      s,
    );
    if(result.response.status!=="EXECUTED"){
      setSystemNotice(
        `ORDER REJECTED // ${result.response.recovery?.instruction??result.response.rendering.brief}`,
      );
      return;
    }
    liveStateRef.current=result.state;
    setS(result.state);
    announceOpenDay(result.state);
    setPendingManeuver(null);
  };
  const issueOpportunity = (responseId: string) => {
    if(rejectMutationDuringTurnClaim())return;
    const state=liveStateRef.current;
    const liveWindow=opportunityStatusForFraction(state,fraction);
    const packet=liveWindow.status==="active"?liveWindow.packet:null;
    if(
      !packet||
      packet.id!==opportunityWindow.packet?.id
    ){
      setSystemNotice(
        "OPPORTUNITY RESPONSE NOT EXECUTED // THE ACTIVE WINDOW CHANGED // REOPEN THE CURRENT ALERT",
      );
      setOpportunityOpen(false);
      return;
    }
    const action:AvaActionRef={
      kind:"opportunity-response",
      opportunityId:packet.id,
      responseId,
    };
    const result=runBrowserNexusRequest(
      executeAvaActionRequest(state,action,{
        origin:"browser-ui",
        idempotencyKey:`web:${state.campaignId}:${state.day}:opportunity:${packet.id}:${responseId}`,
      }),
      state,
      fraction,
    );
    if(result.response.status!=="EXECUTED"){
      setSystemNotice(
        `OPPORTUNITY RESPONSE REJECTED // ${result.response.recovery?.instruction??result.response.rendering.brief}`,
      );
      return;
    }
    const record = result.state.opportunityHistory.find(
      (item) => item.day === state.day && item.opportunityId === packet.id,
    );
    liveStateRef.current=result.state;
    setS(result.state);
    try {
      window.localStorage.setItem(
        OPPORTUNITY_LEDGER_KEY,
        JSON.stringify(result.state.accountOpportunityIds),
      );
    } catch {}
    void fetch("/api/rotation/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: packet.id,
        status: record?.outcome ?? "acted",
        campaignId: state.campaignId,
        day: state.day,
      }),
      keepalive: true,
    }).catch(() => undefined);
    setSystemNotice(record?.report ?? "OPPORTUNITY RESPONSE EXECUTED");
    setOpportunityOpen(false);
  };
  const applyDoctrine = (vector: DoctrineVector, stage: DoctrineStage) => {
    if(rejectMutationDuringTurnClaim())return;
    const action:AvaActionRef={
      kind:"doctrine-stage",
      vectorId:vector.id,
      stageId:stage.id,
    };
    const result=runBrowserNexusRequest(
      executeAvaActionRequest(s,action,{
        origin:"browser-ui",
        idempotencyKey:`web:${s.campaignId}:${s.day}:doctrine:${vector.id}:${stage.id}`,
      }),
      s,
    );
    if(result.response.status!=="EXECUTED"){
      setSystemNotice(
        `DOCTRINE NOT INTERNALIZED // ${result.response.recovery?.instruction??result.response.rendering.brief}`,
      );
      return;
    }
    liveStateRef.current=result.state;
    setS(result.state);
    setSystemNotice(
      `${stage.label.toUpperCase()} INTERNALIZED // ${stage.effect}`,
    );
  };
  const internalize = () => {
    if (!pendingDoctrine) return;
    applyDoctrine(pendingDoctrine.vector, pendingDoctrine.stage);
    setPendingDoctrine(null);
  };
  const persistCampaignSnapshotNow=useCallback(async()=>{
    let drained=campaignSaveChain.current;
    await drained;
    while(drained!==campaignSaveChain.current){
      drained=campaignSaveChain.current;
      await drained;
    }
    campaignPersistenceEpoch.current+=1;
    if(!campaignAccountKey.current)
      throw new Error("Sign in before resolving a campaign day.");
    if(campaignSyncSuppressed.current)
      throw new Error(
        "The account campaign was removed elsewhere. Start a new campaign before resolving a day.",
      );
    const state=liveStateRef.current;
    const envelope:StoredCampaignEnvelope={
      accountKey:campaignAccountKey.current,
      state,
      clock:liveClockRef.current,
      runToken:liveRunTokenRef.current,
      multiplayerRun:liveMultiplayerRunRef.current,
      savedAt:Date.now(),
      revision:campaignRevisionRef.current,
    };
    const seal=campaignPayloadSeal(envelope);
    if(
      campaignRevisionRef.current>0&&
      seal===lastPersistedCampaignSeal.current
    )return envelope;
    const submission:StoredCampaignEnvelope={
      ...envelope,
      expectedRevision:campaignRevisionRef.current,
    };
    const response=await fetch("/api/campaign",{
      method:"PUT",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(submission),
    });
    const payload=await response.json().catch(()=>({})) as {
      accountKey?:string;
      campaign?:StoredCampaignEnvelope|null;
      error?:string;
      code?:string;
    };
    if(response.status===409&&payload.code==="CAMPAIGN_REVISION_CONFLICT"){
      campaignPersistenceEpoch.current+=1;
      if(!payload.campaign){
        campaignRevisionRef.current=0;
        campaignSyncSuppressed.current=true;
        lastPersistedCampaignSeal.current="";
        try{window.localStorage.removeItem(SAVE_KEY);}catch{}
        throw new Error(
          "The account campaign was removed by another session.",
        );
      }
      const restored=restoreCampaignState(payload.campaign.state);
      if(!restored)
        throw new Error("The authoritative campaign could not be restored.");
      const remoteSeal=campaignPayloadSeal(payload.campaign);
      campaignRevisionRef.current=campaignRevision(payload.campaign.revision);
      campaignSyncSuppressed.current=false;
      lastPersistedCampaignSeal.current=remoteSeal;
      const restoredRunToken=
        typeof payload.campaign.runToken==="string"&&payload.campaign.runToken
          ?payload.campaign.runToken
          :portableId();
      liveStateRef.current=restored;
      setS(restored);
      liveRunTokenRef.current=restoredRunToken;
      setRunToken(restoredRunToken);
      activeArchiveKey.current=restoredRunToken;
      liveMultiplayerRunRef.current=!!payload.campaign.multiplayerRun;
      setMultiplayerRun(!!payload.campaign.multiplayerRun);
      if(
        typeof payload.campaign.clock?.start==="number"&&
        typeof payload.campaign.clock.end==="number"
      ){
        liveClockRef.current={
          start:payload.campaign.clock.start,
          end:payload.campaign.clock.end,
        };
        setClock(liveClockRef.current);
      }
      try{
        window.localStorage.setItem(
          SAVE_KEY,
          JSON.stringify({
            ...payload.campaign,
            accountKey:campaignAccountKey.current,
            savedAt:Date.now(),
          }),
        );
      }catch{}
      if(remoteSeal===seal)return payload.campaign;
      throw new Error(
        "Another session changed the campaign. Its authoritative state is now loaded; review it before resolving the day.",
      );
    }
    if(!response.ok)
      throw new Error(
        publicErrorMessage(
          payload.error,
          "Campaign preflight save was not accepted.",
        ),
      );
    if(!campaignSaveWasAccepted(submission,payload.campaign))
      throw new Error(
        "Campaign preflight acknowledgment did not match the submitted state.",
      );
    campaignRevisionRef.current=campaignRevision(payload.campaign?.revision);
    lastPersistedCampaignSeal.current=seal;
    campaignSyncSuppressed.current=false;
    if(payload.accountKey)campaignAccountKey.current=payload.accountKey;
    try{
      window.localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          ...envelope,
          accountKey:campaignAccountKey.current,
          revision:campaignRevisionRef.current,
        }),
      );
      window.localStorage.setItem(SERVER_MIGRATION_KEY,"1");
    }catch{}
    remoteSaveFailureNotified.current=false;
    return payload.campaign!;
  },[]);
  const claimTurn = useCallback(async () => {
    if (turnClaimInFlight.current || campaignMutationsHeld.current) return null;
    turnClaimInFlight.current = true;
    campaignMutationsHeld.current = true;
    setTurnBusy(true);
    let granted=false;
    try {
      await persistCampaignSnapshotNow();
      const target=liveStateRef.current;
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:JSON.stringify({
          campaignId:target.campaignId,
          campaignDay:target.day,
          expectedRevision:campaignRevisionRef.current,
          expectedStateSeal:avaRequestStateSeal(target),
        }),
      });
      const payload = (await response.json()) as TurnAccess & {
        allowed?: boolean;
        error?: string;
      };
      if (
        typeof payload.godMode === "boolean" &&
        typeof payload.canResolve === "boolean"
      ) {
        setTurnAccess(payload);
        setAccountTimeZone(payload.timeZone);
      }
      if (!response.ok && payload.allowed !== false)
        throw new Error(
          publicErrorMessage(
            payload.error,
            "Campaign turnover is unavailable.",
          ),
        );
      const claimed={
        ...payload,
        allowed: response.ok && payload.allowed !== false,
      };
      if(claimed.allowed){
        if(
          !claimed.resolutionGrant||
          claimed.resolutionGrant.campaignId!==target.campaignId||
          claimed.resolutionGrant.campaignDay!==target.day
        )
          throw new Error("Campaign turnover returned an invalid resolution grant.");
        granted=true;
      }
      return claimed;
    } catch (error) {
      setSystemNotice(
        error instanceof Error
          ? `TURNOVER UNAVAILABLE // ${error.message}`
          : "TURNOVER UNAVAILABLE // ACCOUNT STATE COULD NOT BE VERIFIED",
      );
      return null;
    } finally {
      turnClaimInFlight.current = false;
      if(!granted){
        campaignMutationsHeld.current=false;
        setTurnBusy(false);
      }
    }
  }, [persistCampaignSnapshotNow]);
  const releaseTurnClaim = useCallback(() => {
    campaignMutationsHeld.current=false;
    setTurnBusy(false);
  }, []);
  const redeemTurnGrant=useCallback(async(grant:AvaResolutionGrant)=>{
    const prior=liveStateRef.current;
    const priorRevision=campaignRevisionRef.current;
    if(
      grant.campaignId!==prior.campaignId||
      grant.campaignDay!==prior.day||
      priorRevision<1
    )throw new Error("The resolution grant no longer matches this campaign.");
    const response=await fetch("/api/turn",{
      method:"PUT",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({grantId:grant.grantId}),
    });
    const payload=await response.json().catch(()=>({})) as TurnRedemption;
    if(
      !response.ok&&
      response.status===409&&
      payload.code==="DAILY_RESOLUTION_STATE_CHANGED"
    ){
      if(payload.campaign){
        const winner=restoreCampaignState(payload.campaign.state);
        const winnerRevision=campaignRevision(payload.campaign.revision);
        if(
          !winner||
          winnerRevision<priorRevision||
          typeof payload.campaign.runToken!=="string"||
          !payload.campaign.runToken||
          typeof payload.campaign.clock?.start!=="number"||
          typeof payload.campaign.clock.end!=="number"||
          (
            winner.campaignId===prior.campaignId&&
            winner.day<prior.day
          )
        )throw new Error(
          "The authoritative campaign returned after the conflict was invalid.",
        );
        campaignPersistenceEpoch.current+=1;
        campaignRevisionRef.current=winnerRevision;
        campaignSyncSuppressed.current=false;
        lastPersistedCampaignSeal.current=campaignPayloadSeal(payload.campaign);
        if(payload.accountKey)campaignAccountKey.current=payload.accountKey;
        liveStateRef.current=winner;
        setS(winner);
        liveRunTokenRef.current=payload.campaign.runToken;
        setRunToken(payload.campaign.runToken);
        activeArchiveKey.current=payload.campaign.runToken;
        liveMultiplayerRunRef.current=!!payload.campaign.multiplayerRun;
        setMultiplayerRun(!!payload.campaign.multiplayerRun);
        liveClockRef.current={
          start:payload.campaign.clock.start,
          end:payload.campaign.clock.end,
        };
        setClock(liveClockRef.current);
        if(payload.turn){
          setTurnAccess(payload.turn);
          setAccountTimeZone(payload.turn.timeZone);
        }
        try{
          window.localStorage.setItem(
            SAVE_KEY,
            JSON.stringify({
              ...payload.campaign,
              accountKey:campaignAccountKey.current||undefined,
              savedAt:Date.now(),
            }),
          );
        }catch{}
        throw new Error(
          "Another session completed or changed the campaign first. Its authoritative state is now loaded.",
        );
      }
      if(payload.campaign===null){
        campaignPersistenceEpoch.current+=1;
        campaignRevisionRef.current=0;
        campaignSyncSuppressed.current=true;
        lastPersistedCampaignSeal.current="";
        if(payload.turn){
          setTurnAccess(payload.turn);
          setAccountTimeZone(payload.turn.timeZone);
        }
        try{window.localStorage.removeItem(SAVE_KEY);}catch{}
        throw new Error(
          "The account campaign was removed by another session.",
        );
      }
    }
    if(!response.ok)
      throw new Error(
        publicErrorMessage(
          payload.error,
          "Campaign turnover was not redeemed.",
        ),
      );
    const accepted=payload.campaign;
    const next=restoreCampaignState(accepted?.state);
    if(
      !accepted||
      !next||
      payload.allowed!==true||
      payload.nexus?.response?.status!=="EXECUTED"||
      next.campaignId!==prior.campaignId||
      next.day!==prior.day+1||
      next.resolutionHistory.length!==prior.resolutionHistory.length+1||
      campaignRevision(accepted.revision)!==priorRevision+1||
      typeof accepted.runToken!=="string"||
      !accepted.runToken||
      typeof accepted.clock?.start!=="number"||
      typeof accepted.clock.end!=="number"||
      !payload.turn||
      typeof payload.turn.timeZone!=="string"
    )throw new Error(
      "Campaign turnover returned an invalid authoritative transition.",
    );
    campaignPersistenceEpoch.current+=1;
    campaignRevisionRef.current=campaignRevision(accepted.revision);
    campaignSyncSuppressed.current=false;
    lastPersistedCampaignSeal.current=campaignPayloadSeal(accepted);
    if(payload.accountKey)campaignAccountKey.current=payload.accountKey;
    liveStateRef.current=next;
    setS(next);
    liveRunTokenRef.current=accepted.runToken;
    setRunToken(accepted.runToken);
    activeArchiveKey.current=accepted.runToken;
    liveMultiplayerRunRef.current=!!accepted.multiplayerRun;
    setMultiplayerRun(!!accepted.multiplayerRun);
    liveClockRef.current={
      start:accepted.clock.start,
      end:accepted.clock.end,
    };
    setClock(liveClockRef.current);
    setTurnAccess(payload.turn);
    setAccountTimeZone(payload.turn.timeZone);
    const now=Date.now();
    setNow(now);
    setLedgerNow(now);
    try{
      window.localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          ...accepted,
          accountKey:campaignAccountKey.current||undefined,
          savedAt:now,
        }),
      );
      window.localStorage.setItem(SERVER_MIGRATION_KEY,"1");
    }catch{}
    return{
      state:next,
      text:payload.nexus?.text??"",
      turn:payload.turn,
    };
  },[]);
  const advance = useCallback(async (
    source: "manual" | "automatic" = "manual",
  ) => {
    if(campaignMutationsHeld.current)return false;
    const claim = await claimTurn();
    if (!claim) {
      setDayModal(false);
      return false;
    }
    if (!claim.allowed) {
      const zone = claim?.timeZone ?? accountTimeZone;
      setClock(accountDayBounds(zone, Date.now()));
      setDayModal(false);
      setSystemNotice(
        "DAILY TURN ALREADY USED // ACTUAL-TIME TURNOVER RESUMES AT YOUR NEXT ACCOUNT MIDNIGHT",
      );
      return false;
    }
    try{
      const redeemed=await redeemTurnGrant(claim.resolutionGrant!);
      const next=redeemed.state;
      if(!next){
        setSystemNotice(
          "DAY NOT RESOLVED // THE SERVER DID NOT RETURN A CANONICAL CAMPAIGN DAY",
        );
        return false;
      }
      const nextAvaSession:AvaNexusSession={
        ...liveAvaSessionRef.current,
        consumedResolutionGrantIds:[],
        terminal:{
          ...initialAvaTerminalSession(),
          shell:liveAvaSessionRef.current.terminal.shell,
          discourse:resetAvaDiscourseForNewDay(
            liveAvaSessionRef.current.terminal.discourse,
          ),
          voiceCursor:liveAvaSessionRef.current.terminal.voiceCursor,
        },
      };
      liveAvaSessionRef.current=nextAvaSession;
      setAvaSession(nextAvaSession);
      setPendingManeuver(null);
      setDayModal(false);
      setTurnBlackout(true);
      window.setTimeout(() => setTurnBlackout(false), 240);
      setOpportunityInterruptAcknowledged(false);
      setAlertMenuOpen(false);
      setSystemNotice(
        redeemed.turn.godMode
          ? `GODMODE TURN RESOLVED // DAY ${next.day} IS OPEN // UNLIMITED PROGRESSION REMAINS ENABLED`
          : source === "automatic"
            ? `DAILY TURNOVER COMPLETE // DAY ${next.day} IS OPEN`
            : `DAY RESOLVED // DAY ${next.day} IS OPEN // NEXT TURNOVER AT ACCOUNT MIDNIGHT`,
      );
      return true;
    }catch(error){
      setSystemNotice(
        error instanceof Error
          ?`DAY NOT RESOLVED // ${error.message.toUpperCase()}`
          :"DAY NOT RESOLVED // PERSISTED TURNOVER REDEMPTION FAILED",
      );
      return false;
    }finally{
      releaseTurnClaim();
    }
  }, [accountTimeZone, claimTurn, fraction, redeemTurnGrant, releaseTurnClaim]);
  useEffect(() => {
    if (!hydrated || !turnAccess || overdueTurnsApplied.current) return;
    overdueTurnsApplied.current = true;
    const elapsed = overdueTurnCount.current;
    overdueTurnCount.current = 0;
    if (!elapsed || turnAccess.godMode) return;
    void advance("automatic");
  }, [advance, hydrated, turnAccess]);
  useEffect(() => {
    if (
      !hydrated ||
      !turnAccess ||
      turnAccess.godMode ||
      turnBusy ||
      remaining > 0 ||
      s.status !== "active"
    )
      return;
    void advance("automatic");
  }, [
    advance,
    hydrated,
    remaining,
    s.status,
    turnAccess,
    turnBusy,
  ]);
  const openAvaConsole = () => setAva(true);
  const avaEntities = useMemo(
    () => avaEntitiesForState(s, fraction),
    [s, fraction],
  );
  const selectedAvaEntity = useMemo(() => {
    const action =
      avaSession.terminal.plan.at(-1) ??
      (pendingManeuver
        ? { kind: "maneuver" as const, maneuverId: pendingManeuver.id }
        : null);
    return action
      ? (avaEntities.find(
          (entity) =>
            entity.action && actionKey(entity.action) === actionKey(action),
        ) ?? null)
      : null;
  }, [avaSession.terminal.plan, pendingManeuver, avaEntities]);
  const submitAvaCommand = async (command: string) => {
    const raw = command.trim();
    if (!raw) return;
    if (!avaArchiveHydrated) {
      setMessages((current) => [
        ...current,
        {
          who: "AVA",
          text:
            "ARCHIVE SYNC\nThe campaign report archive is still being verified. Hold the command for a moment; no input was executed.",
        },
      ]);
      return;
    }
    setMessages((m) => [...m, { who: "YOU", text: raw }]);
    const turnModeIntent = compileAvaTurnModeIntent(raw);
    const godModeIntent = compileAvaGodModeIntent(raw);
    if (godModeIntent?.kind === "force-random-event") {
      if (!turnAccess?.godMode) {
        setMessages((current) => [
          ...current,
          {
            who: "AVA",
            text:
              "RANDOM EVENT OVERRIDE REJECTED\nThis command is available only while godmode is enabled.",
          },
        ]);
        return;
      }
      if(rejectMutationDuringTurnClaim())return;
      const current=liveStateRef.current;
      const forced=runAvaNexusRequest(
        {
          kind:"internal",
          origin:"internal",
          operation:"force-opportunity",
          expectedStateSeal:avaRequestStateSeal(current),
        },
        {
          playerId:"browser-internal",
          campaignId:current.campaignId,
          campaignRevision:avaNexusStateRevision(current),
          surface:"internal",
          authority:"command",
          nowMs:Date.now(),
        },
        current,
        liveAvaSessionRef.current,
        fraction,
      );
      liveAvaSessionRef.current=forced.session;
      setAvaSession(forced.session);
      const next=forced.state;
      liveStateRef.current=next;
      setS(next);
      if(forced.response.status==="OK")
        setOpportunityInterruptAcknowledged(false);
      setMessages((current) => [
        ...current,
        {
          who: "AVA",
          text: forced.text,
        },
      ]);
      return;
    }
    if (turnModeIntent) {
      const enabled = turnModeIntent.enabled;
      try {
        const response = await fetch("/api/turn", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ godMode: enabled }),
        });
        const payload = (await response.json()) as TurnAccess & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(
            publicErrorMessage(payload.error, "Turn mode did not change."),
          );
        setTurnAccess(payload);
        setAccountTimeZone(payload.timeZone);
        setClock(accountDayBounds(payload.timeZone, Date.now()));
        setMessages((current) => [
          ...current,
          {
            who: "AVA",
            text:
              turnModeIntent.vocabulary === "daily-unlock"
                ? enabled
                  ? "DAILY UNLOCK ON\nDaily mission reset is unlocked for debugging. Resolve Day can advance the campaign repeatedly without waiting for account midnight."
                  : "DAILY UNLOCK OFF\nThe daily mission reset is locked to actual time. Resolve Day is limited to once per account day and resets at account midnight."
                : enabled
                  ? "GODMODE ENABLED\nActual-time daily turnover is disabled. Resolve Day can advance the campaign without a daily limit."
                  : "GODMODE DISABLED\nActual-time daily turnover is restored. Resolve Day is limited to once per account day and resets at account midnight.",
          },
        ]);
      } catch (error) {
        setMessages((current) => [
          ...current,
          {
            who: "AVA",
            text: `TURN MODE UNCHANGED\n${error instanceof Error ? error.message : "The account setting could not be reached."}`,
          },
        ]);
      }
      return;
    }
    if (pendingInterfaceSwitch && /^(?:yes|y|confirm|do it|switch)$/i.test(raw)) {
      const next = interfaceMode === "briefing" ? "command" : "briefing";
      switchInterface(next);
      setPendingInterfaceSwitch(false);
      setMessages((m) => [
        ...m,
        {
          who: "AVA",
          text: `GRAPHICAL INTERFACE SWITCHED\n${next === "briefing" ? "ALT UX" : "COMMAND WINDOWS"} is now active.`,
        },
      ]);
      return;
    }
    if (pendingInterfaceSwitch && /^(?:no|n|cancel|never mind|nevermind)$/i.test(raw)) {
      setPendingInterfaceSwitch(false);
      setMessages((m) => [
        ...m,
        { who: "AVA", text: "INTERFACE SWITCH CANCELLED\nNo display state changed." },
      ]);
      return;
    }
    const interfaceIntent = avaInterfaceIntent(raw);
    if (interfaceIntent === "switch") {
      const next = interfaceMode === "briefing" ? "command" : "briefing";
      switchInterface(next);
      setPendingInterfaceSwitch(false);
      setMessages((m) => [
        ...m,
        {
          who: "AVA",
          text: `GRAPHICAL INTERFACE SWITCHED\n${next === "briefing" ? "ALT UX" : "COMMAND WINDOWS"} is now active.`,
        },
      ]);
      return;
    }
    if (interfaceIntent === "confirm") {
      setPendingInterfaceSwitch(true);
      setMessages((m) => [
        ...m,
        {
          who: "AVA",
          text:
            "GRAPHICAL INTERFACE\nWould you like to switch the graphical interface?",
        },
      ]);
      return;
    }
    const currentModule =
      interfaceMode === "briefing" ? briefingModule : gameModuleForPage(page);
    const currentNexusSession:AvaNexusSession={
      ...liveAvaSessionRef.current,
      currentModule,
      terminal:{
        ...liveAvaSessionRef.current.terminal,
        discourse:{
          ...liveAvaSessionRef.current.terminal.discourse,
          currentScreen:currentModule,
          selectedObject:selectedAvaEntity?.id,
          openApplet:wikiApplet??undefined,
        },
      },
    };
    liveAvaSessionRef.current=currentNexusSession;
    const confirmationInput=isAvaConfirmationInput(raw);
    const pendingConfirmation=currentNexusSession.terminal.confirmation;
    const confirmingDayResolution =
      confirmationInput &&
      !!pendingConfirmation?.plan.actions.some(
        (action) => action.kind === "resolve-day",
      );
    if(
      confirmingDayResolution&&
      pendingConfirmation?.stateRevision!==
        avaRequestStateSeal(liveStateRef.current)
    ){
      const clearedSession:AvaNexusSession={
        ...currentNexusSession,
        terminal:{
          ...currentNexusSession.terminal,
          confirmation:null,
          plan:[],
        },
      };
      liveAvaSessionRef.current=clearedSession;
      setAvaSession(clearedSession);
      setMessages((current)=>[
        ...current,
        {
          who:"AVA",
          text:
            "CONFIRMATION EXPIRED\nThe command position changed after this day resolution was staged. Stage it again against the current campaign state.",
        },
      ]);
      return;
    }
    if (confirmingDayResolution) {
      const claim = await claimTurn();
      if (!claim?.allowed) {
        setMessages((current) => [
          ...current,
          {
            who: "AVA",
            text:
              "DAILY TURN ALREADY USED\nActual-time turnover is enabled. The next campaign day becomes available at your account midnight.",
          },
        ]);
        return;
      }
      try{
        const redeemed=await redeemTurnGrant(claim.resolutionGrant!);
        const nextAvaSession:AvaNexusSession={
          ...currentNexusSession,
          consumedResolutionGrantIds:[],
          terminal:{
            ...initialAvaTerminalSession(),
            shell:currentNexusSession.terminal.shell,
            discourse:resetAvaDiscourseForNewDay(
              currentNexusSession.terminal.discourse,
            ),
            voiceCursor:currentNexusSession.terminal.voiceCursor,
          },
        };
        liveAvaSessionRef.current=nextAvaSession;
        setAvaSession(nextAvaSession);
        announceOpenDay(redeemed.state);
        setPendingManeuver(null);
        setDayModal(false);
        setTurnBlackout(true);
        window.setTimeout(()=>setTurnBlackout(false),240);
        setOpportunityInterruptAcknowledged(false);
        setAlertMenuOpen(false);
        setMessages((current)=>[
          ...current,
          {
            who:"AVA",
            text:redeemed.text||
              `DAY RESOLVED\nDay ${redeemed.state.day} is open.`,
          },
        ]);
      }catch(error){
        setMessages((current)=>[
          ...current,
          {
            who:"AVA",
            text:
              `DAY NOT RESOLVED\n${
                error instanceof Error
                  ?error.message
                  :"Persisted turnover redemption failed."
              }`,
          },
        ]);
      }finally{
        releaseTurnClaim();
      }
      return;
    }
    let darkNetContext: AvaDarkNetContext = {};
    if (
      currentNexusSession.terminal.shell.darkNetUnlocked||
      /^(?:darknet|dark net)(?:\s|$)/i.test(raw)
    ) {
      let localIds: string[] = [];
      try {
        const stored = JSON.parse(
          window.localStorage.getItem(APHORISM_LEDGER_KEY) ?? "[]",
        ) as unknown;
        if (Array.isArray(stored))
          localIds = stored.filter(
            (item): item is string => typeof item === "string",
          );
      } catch {}
      const [telemetry, rotation] = await Promise.all([
        fetch("/api/darknet", { cache: "no-store" })
          .then(async (response) =>
            response.ok
              ? ((await response.json()) as AvaGlobalProductTelemetry)
              : undefined,
          )
          .catch(() => undefined),
        fetch("/api/rotation/aphorisms", { cache: "no-store" })
          .then(async (response) =>
            response.ok
              ? ((await response.json()) as { ids?: string[] })
              : undefined,
          )
          .catch(() => undefined),
      ]);
      const remoteIds = Array.isArray(rotation?.ids)
        ? rotation.ids.filter(
            (item): item is string => typeof item === "string",
          )
        : [];
      const seenAphorismIds = [...new Set([...localIds, ...remoteIds])];
      try {
        window.localStorage.setItem(
          APHORISM_LEDGER_KEY,
          JSON.stringify(seenAphorismIds),
        );
      } catch {}
      darkNetContext = { telemetry, seenAphorismIds };
    }
    const stateAtExecution=liveStateRef.current;
    const nexusContext={
      playerId:"web",
      campaignId:stateAtExecution.campaignId,
      campaignRevision:avaNexusStateRevision(stateAtExecution),
      surface:"web" as const,
      authority:"command" as const,
      nowMs:Date.now(),
    };
    const terminal=runAvaNexusLine(
      raw,
      nexusContext,
      stateAtExecution,
      currentNexusSession,
      fraction,
      darkNetContext,
    );
    const presentation=terminal.envelope.presentation;
    const terminalText =
      presentation.report && !avaArchiveWritable
        ? `${terminal.text}\n\nSESSION-ONLY FILE // DOWNLOAD BEFORE RELOAD`
        : terminal.text;
    liveAvaSessionRef.current=terminal.session;
    setAvaSession(terminal.session);
    if (presentation.aphorismViewIds?.length) {
      const seen = new Set(darkNetContext.seenAphorismIds ?? []);
      const newlyViewed = presentation.aphorismViewIds.filter(
        (itemId) => !seen.has(itemId),
      );
      presentation.aphorismViewIds.forEach((itemId) => seen.add(itemId));
      try {
        window.localStorage.setItem(
          APHORISM_LEDGER_KEY,
          JSON.stringify([...seen]),
        );
      } catch {}
      for (const itemId of newlyViewed)
        void fetch("/api/rotation/aphorisms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId,
            dayKey: `darknet:${s.campaignId}:day-${s.day}`,
          }),
          keepalive: true,
        }).catch(() => undefined);
    }
    if (presentation.download) {
      const bytes = presentation.download.bytes;
      const data = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      const url = window.URL.createObjectURL(
        new Blob([data], { type: presentation.download.mime }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = presentation.download.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    }
    if (presentation.chatExport) {
      const transcript = serializeAvaChatLog({
        campaignId: stateAtExecution.campaignId,
        day: stateAtExecution.day,
        exportedAt: new Date(),
        entries: [
          ...messages,
          { who: "YOU", text: raw },
          { who: "AVA", text: terminalText },
        ],
      });
      const url = window.URL.createObjectURL(
        new Blob([transcript], { type: presentation.chatExport.mime }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = presentation.chatExport.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    }
    if (presentation.navigate) {
      const target =
        presentation.navigate === "dashboard"
          ? "campaign"
          : presentation.navigate;
      if (interfaceMode === "briefing")
        window.dispatchEvent(
          new CustomEvent("briefing-open-surface", {
            detail: target,
          }),
        );
      else setPage(target as Module);
    }
    if (terminal.state !== stateAtExecution) {
      liveStateRef.current=terminal.state;
      setS(terminal.state);
      announceOpenDay(terminal.state);
      setPendingManeuver(null);
      if (terminal.state.day !== stateAtExecution.day) {
        setTurnBlackout(true);
        window.setTimeout(() => setTurnBlackout(false), 240);
        const n = Date.now();
        setClock(accountDayBounds(accountTimeZone,n));
        setNow(n);
        setLedgerNow(n);
      }
    }
    if(terminal.compile)
      recordAvaTelemetry(
        terminal.compile,
        gameModuleForPage(page),
        terminal.response.status==="AMBIGUOUS"
          ?"clarification"
          :terminal.response.status==="REJECTED"||
              terminal.response.status==="FORBIDDEN"
            ?"rejected"
            :"executed",
        terminal.cognitiveActivation,
      );
    setMessages((m) => [
      ...(presentation.clearScreen ? [] : m),
      ...(terminalText
        ? [
            {
              who: "AVA" as const,
              text: terminalText,
              kind: presentation.outputKind ?? "ava",
              cognitiveActivation: terminal.cognitiveActivation,
            },
          ]
        : []),
    ]);
  };
  const run = (e: FormEvent) => {
    e.preventDefault();
    void submitAvaCommand(input);
    setInput("");
    avaCompletionRef.current = null;
  };
  const completeAvaCommand = () => {
    const prior = avaCompletionRef.current;
    if (
      prior &&
      prior.value === input &&
      prior.candidates.length > 1
    ) {
      const index = (prior.index + 1) % prior.candidates.length;
      const value = prior.candidates[index];
      avaCompletionRef.current = {
        candidates: prior.candidates,
        index,
        value,
      };
      setInput(value);
      return;
    }
    const completion = completeAvaInput(
      input,
      s,
      avaSession.terminal.shell,
      fraction,
    );
    if (!completion.candidates.length) return;
    const index = Math.max(
      0,
      completion.candidates.indexOf(completion.value),
    );
    avaCompletionRef.current = {
      candidates: completion.candidates,
      index,
      value: completion.value,
    };
    setInput(completion.value);
  };
  return (
    <main
      className={interfaceMode === "briefing" ? "briefing-main" : undefined}
      data-game-entry-contract="daily-campaign"
    >
      {turnBlackout && <div className="turn-blackout" aria-hidden="true" />}
      <BugReporter
        module={
          interfaceMode === "briefing" ? briefingModule : gameModuleForPage(page)
        }
        interfaceMode={interfaceMode}
      />
      <WarTicker />
      {s.status === "active" &&
        opportunityWindow.status === "active" &&
        opportunityWindow.packet &&
        !opportunityInterruptAcknowledged && (
          <section
            className={`global-opportunity-interrupt ${interfaceMode}`}
            role="alertdialog"
            aria-modal="false"
            aria-label="Target of Opportunity"
          >
            <button
              className="interrupt-close"
              aria-label="Close target alert"
              onClick={() => setOpportunityInterruptAcknowledged(true)}
            >
              ×
            </button>
            <span>TARGET OF OPPORTUNITY // WINDOW OPEN</span>
            <b>{opportunityWindow.packet.headline}</b>
            <em>
              {opportunityWindow.packet.categoryLabel.toUpperCase()} //{" "}
              {opportunityWindow.packet.sector.toUpperCase()} // AVAILABLE UNTIL
              DAY RESOLUTION
            </em>
            <button
              className="interrupt-review"
              onClick={() => {
                setOpportunityInterruptAcknowledged(true);
                setOpportunityOpen(true);
              }}
            >
              REVIEW OPTIONS →
            </button>
          </section>
        )}
      {s.status === "active" &&
        opportunityWindow.status === "expired" &&
        opportunityWindow.packet && (
          <div className={`global-opportunity-missed ${interfaceMode}`}>
            <span>TARGET MISSED // PERMANENT LEDGER</span>
            <b>{opportunityWindow.packet.headline}</b>
          </div>
        )}
      {interfaceMode === "briefing" ? (
        <BriefingInterface
          s={s}
          epigraph={dailyAphorism}
          remaining={clockText(remaining)}
          canResolve={canResolveDay}
          initialModule={gameModuleForPage(page)}
          issue={issueConverged}
          issueDirective={issueDirective}
          resolveDay={advance}
          openAva={openAvaConsole}
          selectDoctrine={applyDoctrine}
          useCommandInterface={() => switchInterface("command")}
          onNewCampaign={() => {
            setSeedOverride(null);
            setReset(true);
          }}
          onSurfaceChange={setBriefingModule}
          logoutPath={logoutPath}
        />
      ) : (
        <>
          <header className="top">
            <Link
              className="logo"
              href="/"
              aria-label="Return to the Delenda Quest splash page"
            >
              <span>DELENDA</span>
              <i>.</i>QUEST
            </Link>
            <nav>
              {modules.map((m) => (
                <button
                  className={page === m.id ? "active" : ""}
                  key={m.id}
                  onClick={() => {
                    setPage(m.id);
                    window.scrollTo({ top: 0, left: 0 });
                  }}
                >
                  <span>{m.n}</span>
                  {m.label}
                </button>
              ))}
            </nav>
            <div className="continuity">
              <span>COMMAND CONTINUITY</span>
              <b>DAY {s.day}</b>
              <small>ACTIVE CAMPAIGN</small>
            </div>
            <div className="day">
              <WarClock remaining={remaining} />
              <div>
                <span>ORDERS</span>
                <b>
                  {DAILY_ORDERS - s.actions} / {DAILY_ORDERS}
                </b>
              </div>
              <button
                aria-label={`Resolve Day ${s.day}`}
                className="classic-resolve-day"
                disabled={!canResolveDay}
                onClick={() => setDayModal(true)}
              >
                RESOLVE DAY {s.day} →
              </button>
              <button
                aria-label="Switch to Alt UX"
                className="command-ux-toggle"
                onClick={() => switchInterface("briefing")}
              >
                SWITCH UX
              </button>
            </div>
          </header>
          <div className="strip" aria-live="polite">
            <span>
              <Dot tone={tone} />
              {theater.label.toUpperCase()} // {balance.toUpperCase()}
            </span>
            <span>LIVE FORCE {fmtStrategic(live.deployable)}</span>
            <span>LOSSES {fmtStrategic(live.losses)}</span>
            <span>
              NET FLIGHT {fmtStrategic(live.netDesertion)} /{" "}
              {fmtStrategic(live.deserted)} ATTEMPTS
            </span>
            <span>DOCTRINE {s.doctrine}</span>
            {opportunityWindow.status === "resolved" && (
              <button className="early committed" disabled>
                TARGET OF OPPORTUNITY // RESOLVED
              </button>
            )}
            <div className="strip-tools">
              <button
                onClick={() => {
                  setAva(true);
                  setAvaFullscreen(true);
                }}
              >
                AVA TERMINAL
              </button>
              <button
                className={page === "wiki" ? "active" : ""}
                onClick={() => setPage("wiki")}
              >
                WIKI
              </button>
              <div className={`command-account-menu ${commandAccountMenuOpen ? "open" : ""}`}>
                <button
                  aria-expanded={commandAccountMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setCommandAccountMenuOpen((open) => !open)}
                >
                  ACCOUNT
                </button>
                {commandAccountMenuOpen && (
                  <div role="menu">
                    <button
                      className={page === "account" ? "active" : ""}
                      role="menuitem"
                      onClick={() => {
                        setCommandAccountMenuOpen(false);
                        setPage("account");
                      }}
                    >
                      SETTINGS
                    </button>
                    <a role="menuitem" href={logoutPath}>
                      LOG OUT
                    </a>
                  </div>
                )}
              </div>
              {adminAccess && <button
                className={page === "admin" ? "active" : ""}
                onClick={() => setPage("admin")}
              >
                ADMIN
              </button>}
            </div>
          </div>
          <div className="frame">
            {page === "storyboard" ? (
              <CommandStoryboard
                s={s}
                live={live}
                inspect={setMetric}
                openCampaign={() => setPage("campaign")}
              />
            ) : page === "campaign" ? (
              <CampaignPage
                s={s}
                epigraph={dailyAphorism}
                selected={pendingManeuver}
                setSelected={setPendingManeuver}
                inspectorSelection={campaignInspectorSelection}
                setInspectorSelection={setCampaignInspectorSelection}
                introConsumed={campaignIntroConsumed}
                consumeIntro={() => setCampaignIntroConsumed(true)}
                issue={issueManeuver}
                issueConvergence={issueConverged}
              />
            ) : page === "doctrine" ? (
              <DoctrineControlPanel
                s={s}
                epigraph={dailyAphorism}
                select={(vector, stage) =>
                  setPendingDoctrine({ vector, stage })
                }
              />
            ) : page === "wiki" ? (
              <FieldManual article={wikiArticle} />
            ) : page === "account" ? (
              <AccountPage
                onNewCampaign={() => {
                  setSeedOverride(null);
                  setReset(true);
                }}
              />
            ) : page === "admin" ? (
              <AdminPage />
            ) : (
              <ModulePage
                page={page}
                s={s}
                epigraph={dailyAphorism}
                focus={focusFamily}
                issue={issueDirective}
              />
            )}
          </div>
        </>
      )}
      {s.status !== "active" && (
        <div className={`end ${s.status}`}>
          <span>CAMPAIGN {s.status.toUpperCase()}</span>
          <p>
            {s.status === "victory"
              ? "The enemy operational system has broken beyond the prewar line."
              : "The state can no longer convert its remaining capacity into a viable front."}
          </p>
          <div className="end-score" tabIndex={0}>
            <small>CAMPAIGN SCORE ⓘ</small>
            <b>{(issuedCampaignScore??terminalScore.total).toLocaleString()}</b>
            <span>{scoreBreakdownLines(terminalScore).map(line=><i key={line}>{line}</i>)}</span>
          </div>
          {issuedRecordSlug ? (
            <a className="end-record" href={`/record/${issuedRecordSlug}`}>
              OPEN CAMPAIGN RECORD →
            </a>
          ) : (
            <small>SIGN IN TO ISSUE A PERMANENT CAMPAIGN RECORD</small>
          )}
          <div className="end-actions">
            <button
              className="secondary"
              onClick={() => {
                setPage("campaign");
                window.scrollTo({ top: 0, left: 0 });
              }}
            >
              Daily Campaign
            </button>
            <button onClick={() => setReset(true)}>Begin new campaign</button>
          </div>
        </div>
      )}
      {systemNotice && (
        <button
          className="system-notice"
          role="status"
          onClick={() => setSystemNotice(null)}
        >
          <span className="system-notice-message">{systemNotice}</span>
          <span className="system-notice-dismiss">DISMISS ×</span>
        </button>
      )}
      {interfaceMode === "command" && !ava && (
        <div className="ava-command-dock">
          {majorAlerts.length > 0 && (
            <div className="ava-alert-cluster">
          {alertMenuOpen && (
            <section className="ava-alert-menu" role="dialog" aria-label="AVA alerts">
              <header>
                <span>AVA // MAJOR ALERTS</span>
                <button onClick={() => setAlertMenuOpen(false)}>×</button>
              </header>
              {majorAlerts.map((alert) => (
                <article key={alert.id}>
                  <b>{alert.title}</b>
                  <p>{alert.body}</p>
                  {alert.opportunity && (
                    <button
                      onClick={() => {
                        setOpportunityOpen(true);
                        setOpportunityInterruptAcknowledged(true);
                        setAlertMenuOpen(false);
                      }}
                    >
                      REVIEW OPTIONS →
                    </button>
                  )}
                </article>
              ))}
            </section>
          )}
          <button
            className="ava-urgent-icon"
            aria-label={`${majorAlerts.length} urgent AVA alert${majorAlerts.length === 1 ? "" : "s"}`}
            aria-expanded={alertMenuOpen}
            onClick={() => setAlertMenuOpen((open) => !open)}
          >
            <span>!</span>
            <b>{majorAlerts.length}</b>
          </button>
            </div>
          )}
          <button
          className="ava-button"
          data-telemetry="ava.open-console"
          onClick={openAvaConsole}
        >
          <span>AM</span>
          <div>
            <b>AVA</b>
            <small>
              {fmtStrategic(live.losses)} LOSSES //{" "}
              {fmtStrategic(live.netDesertion)} NET FLIGHT // ASK WHAT TO DO
            </small>
          </div>
          <i>&gt;</i>
          </button>
        </div>
      )}
      {ava && (
        <aside
          className={`ava ava-${interfaceMode} ${avaFullscreen ? "terminal-full" : ""}`}
          data-telemetry-surface="ava"
        >
          <header>
            <div>
              <span>AM</span>
              <p>
                <b>AVA</b>
                <small>
                  PATTERN ANALYSIS DIRECTORATE //{" "}
                  {moduleName(
                    interfaceMode === "briefing"
                      ? briefingModule
                      : page === "admin"
                        ? "account"
                        : page,
                  )}
                </small>
              </p>
            </div>
            <nav className="ava-window-controls">
              <button onClick={() => setAvaFullscreen((value) => !value)}>
                {avaFullscreen ? "WINDOWED" : "FULL TERMINAL"}
              </button>
              <button
                aria-label="Close Ava"
                data-telemetry="ava.close-console"
                onClick={() => {
                  setAva(false);
                  setAvaFullscreen(false);
                }}
              >
                ×
              </button>
            </nav>
          </header>
          <div className="ava-state">
            <span>DAY {s.day}</span>
            <span>{s.actions} ORDERS</span>
            <span>{clockText(remaining)}</span>
            <span>{avaSession.terminal.plan.length} STAGED</span>
            <span>
              {avaSession.terminal.confirmation
                ? `CONFIRM ${avaSession.terminal.confirmation.id}`
                : "NO ORDER AWAITING CONFIRMATION"}
            </span>
          </div>
          <div className="messages" ref={avaMessagesRef}>
            {messages.map((m, i) => (
              <div
                aria-live={m.who === "AVA" ? "polite" : undefined}
                className={m.who === "YOU" ? "you" : ""}
                data-ava-cognitive-runtime={m.cognitiveActivation?.runtime}
                data-ava-cognitive-status={m.cognitiveActivation?.status}
                data-ava-cognitive-families={m.cognitiveActivation?.operatorFamilies.join(",")}
                key={i}
                role={m.who === "AVA" ? "status" : undefined}
              >
                <span>{m.who}</span>
                <div className="message-body">
                  {m.who === "YOU" ? (
                    <p className="ava-player-line">{m.text}</p>
                  ) : m.kind === "shell" ? (
                    <pre className="ava-shell-output">{m.text}</pre>
                  ) : (
                    <AvaTextRenderer text={m.text} />
                  )}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={run} data-no-telemetry>
            <label htmlFor="ava-command-input">
              commander@delenda:
              {avaSession.terminal.shell.cwd.replace("/home/commander", "~") || "/"}$
            </label>
            <div>
              <span>&gt;</span>
              <input
                id="ava-command-input"
                disabled={!avaArchiveHydrated}
                maxLength={512}
                value={input}
                onChange={(e) => {
                  avaCompletionRef.current = null;
                  setInput(e.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Tab") return;
                  event.preventDefault();
                  completeAvaCommand();
                }}
                placeholder={
                  avaArchiveHydrated
                    ? "Ask Ava, or use cd, ls, grep, find, download..."
                    : "Synchronizing report archive..."
                }
              />
              <button data-telemetry="ava.run-command">RUN</button>
            </div>
          </form>
          <footer>
            <button
              type="button"
              data-telemetry="ava.open-help"
              onClick={() => void submitAvaCommand("help")}
            >
              COMMAND MANUAL
            </button>
            <span>
              MISSIONS // ADVISE // REPORT // STAGE // EXPORT CHAT // CD // LS
              // GREP // FIND // DOWNLOAD
            </span>
            <button onClick={() => openWikiApplet("site-telemetry")}>
              SIGNAL POLICY
            </button>
          </footer>
        </aside>
      )}
      {pendingDoctrine && (
        <DoctrineConfirm
          vector={pendingDoctrine.vector}
          stage={pendingDoctrine.stage}
          s={s}
          yes={internalize}
          no={() => setPendingDoctrine(null)}
        />
      )}
      {metric && (
        <MetricDrawer
          metric={metric}
          s={s}
          live={live}
          close={() => setMetric(null)}
        />
      )}
      {wikiApplet && (
        <WikiApplet article={wikiApplet} close={() => setWikiApplet(null)} />
      )}
      {opportunityOpen &&
        opportunityWindow.status === "active" &&
        opportunityWindow.packet && (
          <OpportunityModal
            s={s}
            packet={opportunityWindow.packet}
            closesAt={opportunityClosesAt}
            commit={issueOpportunity}
            close={() => setOpportunityOpen(false)}
          />
        )}
      {dayModal && canResolveDay && (
        <Overlay close={() => setDayModal(false)} kind="center">
          <div className="small-modal">
            <Close onClick={() => setDayModal(false)} />
            <span className="eyebrow">End Day {s.day}</span>
            <h2>Release the day to resolution?</h2>
            <p>
              {s.maneuver
                ? `${maneuverForState(s,s.maneuver)?.label} will be resolved against ${situationForState(s).sector}. `
                : "No maneuver order exists. Standing tempo will prosecute the day. "}
              {s.actions
                ? `${s.actions} unused action${s.actions === 1 ? "" : "s"} will expire. `
                : ""}
              The Butcher’s Bill cannot be recalled afterward.
            </p>
            <Actions
              cancel={() => setDayModal(false)}
              action={advance}
              label={`Resolve Day ${s.day}`}
            />
          </div>
        </Overlay>
      )}
      {reset && (
        <Overlay close={() => setReset(false)} kind="center">
          <CampaignSetup
            current={s}
            hasSave={hasSave && s.status === "active"}
            seedOverride={seedOverride}
            configOverride={challengeConfig}
            onStart={startCampaign}
            onResume={() => {
              setReset(false);
              setSeedOverride(null);
              setChallengeConfig(null);
            }}
            onClose={() => {
              setReset(false);
              setSeedOverride(null);
              setChallengeConfig(null);
            }}
          />
        </Overlay>
      )}
    </main>
  );
}
