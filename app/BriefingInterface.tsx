"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DAILY_ORDERS,
  DOCTRINES,
  FAMILIES,
  MANEUVERS,
  coverage,
  directiveRejection,
  estimateDay,
  fmt,
  maneuverById,
  projectDomestic,
  projectForceGeneration,
  projectOperations,
  projectProduction,
  situationForState,
  type Choice,
  type DoctrineStage,
  type DoctrineVector,
  type Family,
  type GameState,
  type Maneuver,
  type Module,
} from "./game";
import {
  compileConvergence,
  convergenceOptionAvailable,
  type ConvergenceOption,
  type ConvergencePrompt,
} from "./convergence";
import { FieldManual } from "./FieldManual";
import { TheaterGeometry } from "./TheaterGeometry";
import {
  MODULE_EPIGRAPHS,
  type ModuleEpigraphKey,
} from "./module-epigraphs";

type BriefingIssue = {
  maneuverId?: string;
  domesticId?: string;
  networkId?: string;
};
type Surface =
  | "brief"
  | "state"
  | "production"
  | "military"
  | "diplomacy"
  | "doctrine"
  | "manual"
  | "service";
type Props = {
  s: GameState;
  remaining: string;
  issue: (input: BriefingIssue) => void;
  issueDirective: (family: Family, choice: Choice) => void;
  resolveDay: () => void;
  openAva: () => void;
  selectDoctrine: (vector: DoctrineVector, stage: DoctrineStage) => void;
  useCommandInterface: () => void;
  onSurfaceChange: (module: Module) => void;
};

const signed = (value: number, suffix = "") =>
  `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}${suffix}`;
const optionCost = (option: ConvergenceOption) => [
  ...option.choice.exact,
  ...option.choice.risk.map((line) => `RISK // ${line}`),
];

function ModernModuleEpigraph({ module }: { module: ModuleEpigraphKey }) {
  const epigraph = MODULE_EPIGRAPHS[module];
  return (
    <blockquote className="modern-module-epigraph">
      “{epigraph.quote}”
      <cite>— {epigraph.source}</cite>
    </blockquote>
  );
}

function InterfaceSwitch({
  useCommandInterface,
}: {
  useCommandInterface: () => void;
}) {
  return (
    <div className="briefing-switch" aria-label="Interface mode">
      <button onClick={useCommandInterface}>COMMAND WINDOWS</button>
      <button className="active" aria-pressed="true">
        ALT UX
      </button>
    </div>
  );
}

function DecisionOption({
  selected,
  disabled,
  name,
  description,
  cost,
  onClick,
}: {
  selected: boolean;
  disabled?: boolean;
  name: string;
  description: string;
  cost: string[];
  onClick: () => void;
}) {
  return (
    <button
      className={`briefing-option ${selected ? "selected" : ""}`}
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
    >
      <i aria-hidden="true" />
      <span className="briefing-option-copy">
        <b>{name}</b>
        <small>{description}</small>
      </span>
      <span className="briefing-option-cost">
        {cost.map((line, index) => (
          <em
            className={
              line.includes("+")
                ? "pos"
                : line.includes("-") || line.includes("−")
                  ? "neg"
                  : "warn"
            }
            key={`${line}-${index}`}
          >
            {line}
          </em>
        ))}
      </span>
    </button>
  );
}

function DecisionCard({
  meta,
  title,
  brief,
  context,
  children,
  primary = false,
}: {
  meta: string;
  title: string;
  brief?: string;
  context?: React.ReactNode;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <article className={`briefing-decision ${primary ? "primary" : ""}`}>
      <header>
        <span>{meta}</span>
        <h2>{title}</h2>
        {brief && <p>{brief}</p>}
      </header>
      {context}
      <div className="briefing-options">{children}</div>
    </article>
  );
}

function MissionContext({ prompt }: { prompt: ConvergencePrompt }) {
  const showMissionEntry = () =>
    window.dispatchEvent(
      new CustomEvent("briefing-open-manual", { detail: prompt.id }),
    );
  return (
    <section
      className="briefing-mission-context"
      aria-label={`${prompt.domain} mission provenance`}
    >
      <div className="campaign-mission-context">
        <small>
          {prompt.category.toUpperCase()} // {prompt.pressureBand.toUpperCase()}{" "}
          PRESSURE
        </small>
        <b>{prompt.question}</b>
        <span>
          OPERATIONAL ANCHOR // {prompt.operationalAnchor.sector.toUpperCase()}{" "}
          // {prompt.operationalAnchor.problemClass.toUpperCase()}
        </span>
      </div>
      <div className="maneuver-contract">
        <section>
          <h3>Why today // live evidence</h3>
          <ul>
            {prompt.evidence.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>How this reaches the front</h3>
          <p>{prompt.operationalAnchor.headline}</p>
          <ul>
            {prompt.convergence.map((edge, index) => (
              <li key={`${edge.source}-${edge.via}-${edge.target}`}>
                <b>CONSEQUENCE {index + 1}</b>
                <span>{edge.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <button className="opportunity-manual" onClick={showMissionEntry}>
        FIELD MANUAL // {prompt.title.toUpperCase()} →
      </button>
    </section>
  );
}

function StateSurface({ s }: { s: GameState }) {
  const operation = projectOperations(s),
    production = projectProduction(s),
    domestic = projectDomestic(s),
    force = projectForceGeneration(s),
    personnel = estimateDay(s);
  const metrics = [
    [
      "LOCAL PERSONNEL",
      fmt(operation.committed, true),
      operation.packageEfficiency < 1
        ? `${fmt(operation.nominalCommitment, true)} nominal task package`
        : `${fmt(operation.operationallyAvailable, true)} operationally available`,
    ],
    [
      "LOCAL EFFECTIVE FORCE",
      fmt(operation.friendlyPower, true),
      `literal ratio ${operation.forceRatio.toFixed(2)}`,
    ],
    [
      "ENEMY EFFECTIVE FORCE",
      fmt(operation.enemyPower, true),
      `${fmt(operation.enemyCommitted, true)} local personnel`,
    ],
    [
      "PROJECTED LOSSES",
      fmt(personnel.casualty, true),
      `${fmt(personnel.netDesertion, true)} net flight`,
    ],
    [
      "PRODUCTION SHORTAGES",
      String(production.shortages),
      `${production.maintenanceDebtAfter.toFixed(0)} maintenance debt`,
    ],
    [
      "REPLACEMENT OUTPUT",
      fmt(force.effectiveGraduates, true),
      `${fmt(force.deployableAssigned, true)} assigned deployable`,
    ],
    [
      "LEGITIMACY",
      `${s.legitimacy.toFixed(0)}%`,
      `${signed(domestic.legitimacyChange)} at resolution`,
    ],
    [
      "RESISTANCE",
      `${s.resistance.toFixed(0)}%`,
      `${signed(domestic.resistanceChange)} at resolution`,
    ],
  ];
  return (
    <section className="modern-surface">
      <header>
        <span>AUTHORITATIVE STATE // DAY {s.day}</span>
        <h1>State of the war</h1>
        <p>
          Every number below is drawn from the same state used by resolution,
          Ava, Campaign, and the command windows.
        </p>
      </header>
      <div className="modern-metric-grid">
        {metrics.map(([label, value, note]) => (
          <article key={label}>
            <small>{label}</small>
            <b>{value}</b>
            <span>{note}</span>
          </article>
        ))}
      </div>
      <section className="briefing-block">
        <header>
          <h2>{s.theater.toUpperCase()} THEATER // SITUATION MAP</h2>
          <span>REFERENCE TACTICAL PLATE // LIVE STATE</span>
        </header>
        <TheaterGeometry s={s} variant="briefing" />
      </section>
    </section>
  );
}

function DirectiveSurface({
  s,
  module,
  focusFamilyId,
  issue,
}: {
  s: GameState;
  module: "national" | "military" | "diplomacy";
  focusFamilyId?: string;
  issue: (family: Family, choice: Choice) => void;
}) {
  const families = useMemo(
      () => FAMILIES.filter((family) => family.module === module),
      [module],
    ),
    groups = [...new Set(families.map((family) => family.category))];
  const [selectedFamilyId, setSelectedFamilyId] = useState(
    families[0]?.id ?? "",
  );
  const [selectedChoiceId, setSelectedChoiceId] = useState("");
  const [selectedActor, setSelectedActor] = useState(s.actors[0]?.id ?? "");
  const family =
      families.find((item) => item.id === selectedFamilyId) ?? families[0],
    choice =
      family?.choices.find((item) => item.id === selectedChoiceId) ?? null;
  useEffect(() => {
    setSelectedFamilyId(
      focusFamilyId && families.some((item) => item.id === focusFamilyId)
        ? focusFamilyId
        : (families[0]?.id ?? ""),
    );
    setSelectedChoiceId("");
  }, [focusFamilyId, families]);
  useEffect(() => setSelectedChoiceId(""), [selectedFamilyId, s.day]);
  const moduleLabel =
    module === "national" ? "PRODUCTION" : module.toUpperCase();
  const moduleEpigraph = module === "national" ? "production" : module;
  return (
    <section className="modern-surface modern-directives">
      <header>
        <ModernModuleEpigraph module={moduleEpigraph} />
        <span>{moduleLabel} // NATIVE ALT UX SURFACE</span>
        <h1>
          {module === "national"
            ? "Production and domestic state"
            : module === "military"
              ? "Military command"
              : "Diplomatic ledger"}
        </h1>
        <p>
          Selections remain inside Alt UX and issue against the same directive
          families, locks, and three-order budget.
        </p>
      </header>
      {module === "diplomacy" && (
        <nav className="modern-actors" aria-label="Foreign actors">
          {s.actors.map((actor) => (
            <button
              className={selectedActor === actor.id ? "active" : ""}
              aria-pressed={selectedActor === actor.id}
              onClick={() => setSelectedActor(actor.id)}
              key={actor.id}
            >
              <b>{actor.name}</b>
              <small>
                {actor.role.toUpperCase()} · TRUST {actor.trust.toFixed(0)} ·
                LEVERAGE {actor.leverage.toFixed(0)}
              </small>
            </button>
          ))}
        </nav>
      )}
      <div className="modern-directive-layout">
        <nav className="modern-family-rail">
          {groups.map((group) => (
            <section key={group}>
              <h2>{group}</h2>
              {families
                .filter((item) => item.category === group)
                .map((item) => (
                  <button
                    className={family?.id === item.id ? "active" : ""}
                    aria-pressed={family?.id === item.id}
                    onClick={() => setSelectedFamilyId(item.id)}
                    key={item.id}
                  >
                    <b>{item.label}</b>
                    <small>
                      {Math.max(0, (s.locks[item.id] ?? 0) - s.day)
                        ? `LOCKED ${Math.max(0, (s.locks[item.id] ?? 0) - s.day)}D`
                        : "AVAILABLE"}
                    </small>
                  </button>
                ))}
            </section>
          ))}
        </nav>
        {family ? (
          <article className="modern-family-detail">
            <div className="modern-path">
              {moduleLabel} / {family.category.toUpperCase()} /{" "}
              {family.label.toUpperCase()}
              {module === "diplomacy"
                ? ` / ${s.actors.find((actor) => actor.id === selectedActor)?.name.toUpperCase()}`
                : ""}
            </div>
            <h2>{family.label}</h2>
            <p>{family.brief}</p>
            <div className="modern-choice-list">
              {family.choices.map((item) => {
                const rejection = directiveRejection(s, family, item);
                return (
                  <button
                    className={choice?.id === item.id ? "selected" : ""}
                    disabled={!!rejection}
                    aria-pressed={choice?.id === item.id}
                    onClick={() =>
                      setSelectedChoiceId(choice?.id === item.id ? "" : item.id)
                    }
                    key={item.id}
                  >
                    <div>
                      <b>{item.label}</b>
                      <span>{item.flavor}</span>
                    </div>
                    <ul>
                      {item.exact.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <aside>
                      <small>TRADEOFF</small>
                      {item.risk.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                      {rejection && <em>{rejection}</em>}
                    </aside>
                  </button>
                );
              })}
            </div>
            {choice && (
              <div className="modern-issue">
                <span>1 ORDER // {family.lock} DAY FAMILY ROTATION</span>
                <button
                  disabled={!!directiveRejection(s, family, choice)}
                  onClick={() => issue(family, choice)}
                >
                  ISSUE {choice.label.toUpperCase()} →
                </button>
              </div>
            )}
          </article>
        ) : null}
      </div>
    </section>
  );
}

function DoctrineSurface({
  s,
  select,
}: {
  s: GameState;
  select: (vector: DoctrineVector, stage: DoctrineStage) => void;
}) {
  return (
    <section className="modern-surface">
      <header>
        <ModernModuleEpigraph module="doctrine" />
        <span>DOCTRINE // {s.doctrine} INSIGHT AVAILABLE</span>
        <h1>Institutional memory</h1>
        <p>
          Verified battlefield results become spendable principles. No campaign
          order is consumed.
        </p>
      </header>
      <div className="modern-doctrine-grid">
        {DOCTRINES.map((vector) => (
          <article
            className={vector.forbidden ? "forbidden" : ""}
            key={vector.id}
          >
            <header>
              <small>{vector.authority}</small>
              <h2>{vector.label}</h2>
              <p>“{vector.quote}”</p>
            </header>
            {vector.stages.map((stage, index) => {
              const unlocked = s.unlocked.includes(stage.id),
                prior =
                  index === 0 ||
                  s.unlocked.includes(vector.stages[index - 1].id);
              return (
                <button
                  className={!prior ? "unresearchable" : ""}
                  onClick={() => select(vector, stage)}
                  key={stage.id}
                >
                  <span>
                    {unlocked
                      ? "INTERNALIZED"
                      : prior
                        ? `${stage.cost} IP`
                        : "PREREQUISITE"}
                  </span>
                  <b>{stage.label}</b>
                  <small>{stage.effect}</small>
                </button>
              );
            })}
          </article>
        ))}
      </div>
    </section>
  );
}

function ManualSurface({
  article,
  navigate,
}: {
  article: string;
  navigate: (module: string, family?: string) => void;
}) {
  return (
    <section className="modern-surface modern-manual-surface">
      <FieldManual article={article} variant="briefing" onControl={navigate} />
    </section>
  );
}

function ServiceSurface({ s }: { s: GameState }) {
  const resolved = s.resolutionHistory.length,
    orders = s.resolutionHistory.reduce((sum, day) => sum + day.orders.used, 0),
    losses = s.resolutionHistory.reduce(
      (sum, day) => sum + day.personnel.combatLosses,
      0,
    ),
    netFlight = s.resolutionHistory.reduce(
      (sum, day) => sum + day.personnel.netDesertion,
      0,
    );
  return (
    <section className="modern-surface">
      <header>
        <span>SERVICE RECORD // CURRENT CAMPAIGN</span>
        <h1>{s.campaignId}</h1>
        <p>
          This live command record becomes a permanent, pseudonymous Campaign
          Record when the run closes.
        </p>
      </header>
      <div className="modern-metric-grid">
        <article>
          <small>STATUS</small>
          <b>{s.status.toUpperCase()}</b>
          <span>Day {s.day}</span>
        </article>
        <article>
          <small>RESOLVED DAYS</small>
          <b>{resolved}</b>
          <span>{orders} issued orders preserved</span>
        </article>
        <article>
          <small>CUMULATIVE COMBAT LOSS</small>
          <b>{fmt(losses, true)}</b>
          <span>{fmt(netFlight, true)} net flight</span>
        </article>
        <article>
          <small>DECISION LEDGER</small>
          <b>{s.decisions.length}</b>
          <span>{s.subMissionHistory.length} sub-missions preserved</span>
        </article>
      </div>
      <div className="modern-service-ledger">
        {s.resolutionHistory.slice(0, 8).map((day) => (
          <article key={day.resolvedDay}>
            <span>DAY {day.resolvedDay}</span>
            <b>{day.sector}</b>
            <small>
              {day.outcome.outcomeBand.toUpperCase()} ·{" "}
              {signed(day.outcome.groundMovement, " KM")} ·{" "}
              {fmt(day.personnel.combatLosses, true)} LOSSES
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}

function DailySurface({
  s,
  remaining,
  issue,
  resolveDay,
  setSurface,
}: {
  s: GameState;
  remaining: string;
  issue: (input: BriefingIssue) => void;
  resolveDay: () => void;
  setSurface: (surface: Surface) => void;
}) {
  const packet = useMemo(() => compileConvergence(s), [s]);
  const [selectedManeuver, setSelectedManeuver] = useState(s.maneuver ?? "");
  const [selectedDomestic, setSelectedDomestic] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  useEffect(() => {
    setSelectedManeuver(s.maneuver ?? "");
    setSelectedDomestic("");
    setSelectedNetwork("");
  }, [s.day, s.maneuver]);
  const operation = projectOperations(s),
    production = projectProduction(s),
    personnel = estimateDay(s);
  const selectedCount = [
    selectedManeuver && !s.maneuver,
    selectedDomestic,
    selectedNetwork,
  ].filter(Boolean).length;
  const canIssue =
    s.status === "active" && selectedCount > 0 && selectedCount <= s.actions;
  const availableManeuvers = packet.operational.maneuvers
    .map((id) => MANEUVERS.find((item) => item.id === id))
    .filter((item): item is Maneuver => !!item);
  const issueSelections = () => {
    issue({
      maneuverId:
        selectedManeuver && !s.maneuver ? selectedManeuver : undefined,
      domesticId: selectedDomestic || undefined,
      networkId: selectedNetwork || undefined,
    });
    setSelectedDomestic("");
    setSelectedNetwork("");
  };
  const bars = [
    [
      "MUNITIONS COVERAGE",
      Math.min(100, (coverage(s, "munitions") / 12) * 100),
      `${coverage(s, "munitions").toFixed(1)} days`,
      "amber",
    ],
    ["EQUIPMENT COVERAGE", s.equipment, `${s.equipment.toFixed(0)}%`, "cyan"],
    ["STATE TOLERANCE", s.legitimacy, `${s.legitimacy.toFixed(0)}%`, "red"],
    [
      "NETWORK CONVERSION",
      Math.min(100, operation.networkFactor * 100),
      s.networkPosture,
      "green",
    ],
  ] as const;
  return (
    <>
      <header className="modern-campaign-opening">
        <ModernModuleEpigraph module="campaign" />
      </header>
      <section className="briefing-situation">
        <span>
          DAILY STRATEGIC SITUATION // {packet.operational.sector.toUpperCase()}{" "}
          // {packet.operational.windowHours}-HOUR WINDOW
        </span>
        <h1>{packet.operational.headline}</h1>
        <p>
          {packet.operational.briefing}{" "}
          {s.maneuver
            ? `${maneuverById(s.maneuver)?.label} is already issued.`
            : "No maneuver has been issued; standing tempo prosecutes the day by default."}
        </p>
        <blockquote>
          “{packet.operational.quote}”
          <cite>— {packet.operational.attribution}</cite>
        </blockquote>
      </section>
      <section className="briefing-vitals">
        <div>
          <small>DEPLOYABLE</small>
          <b>{fmt(s.deployable, true)}</b>
          <span className="neg">
            −{fmt(personnel.casualty, true)} projected loss
          </span>
        </div>
        <div>
          <small>MUNITIONS COVERAGE</small>
          <b className={coverage(s, "munitions") < 5 ? "warn" : ""}>
            {coverage(s, "munitions").toFixed(1)} days
          </b>
          <span>STOCKPILE {s.production.munitions.stock.toLocaleString()}</span>
        </div>
        <div>
          <small>INDUSTRIAL CONDITION</small>
          <b>{s.materiel.toFixed(0)}%</b>
          <span className={production.materielChange < 0 ? "neg" : "pos"}>
            {signed(production.materielChange)} / day
          </span>
        </div>
        <div>
          <small>INTEL CONFIDENCE</small>
          <b className="warn">{s.intelligence.toFixed(0)}%</b>
          <span>
            {s.intelligence >= 65
              ? "observed"
              : s.intelligence >= 35
                ? "estimated"
                : "contradictory"}
          </span>
        </div>
      </section>
      <section className="briefing-decisions">
        <header>
          <span>COMMANDER&apos;S QUESTION · RESOLVES TONIGHT</span>
          <h1>{packet.operational.question}</h1>
          <p>
            DECISION WINDOW CLOSES IN <b>{remaining}</b>
          </p>
        </header>
        <div className="briefing-decision-stack">
          <DecisionCard
            primary
            meta="PRIMARY · MAIN CAMPAIGN · RESOLVES TONIGHT"
            title={packet.operational.sector}
            brief="Ground, force, and casualty consequences resolve from the stored operational ticket."
          >
            {availableManeuvers.slice(0, 4).map((m) => {
              const p = projectOperations(s, m);
              return (
                <DecisionOption
                  key={m.id}
                  selected={selectedManeuver === m.id}
                  disabled={!!s.maneuver || s.actions < 1}
                  name={m.label}
                  description={m.flavor}
                  cost={[
                    `${fmt(p.committed, true)} committed`,
                    `${Math.round(p.executionConfidence * 100)}% confidence`,
                    `${fmt(p.friendlyLosses, true)} loss exposure`,
                  ]}
                  onClick={() =>
                    setSelectedManeuver(selectedManeuver === m.id ? "" : m.id)
                  }
                />
              );
            })}
          </DecisionCard>
          <DecisionCard
            meta={`SITUATIONAL · DOMESTIC · ${packet.domestic.authority}`}
            title={packet.domestic.title}
            brief={`${packet.domestic.brief} Sealed through Day ${packet.domestic.rotatesAfterDay} resolution.`}
            context={<MissionContext prompt={packet.domestic} />}
          >
            {packet.domestic.options.map((option) => (
              <DecisionOption
                key={option.id}
                selected={selectedDomestic === option.id}
                disabled={!convergenceOptionAvailable(s, option)}
                name={option.choice.label}
                description={option.choice.flavor}
                cost={optionCost(option)}
                onClick={() =>
                  setSelectedDomestic(
                    selectedDomestic === option.id ? "" : option.id,
                  )
                }
              />
            ))}
          </DecisionCard>
          <DecisionCard
            meta={`SITUATIONAL · NETWORK · ${packet.network.authority}`}
            title={packet.network.title}
            brief={`${packet.network.brief} Sealed through Day ${packet.network.rotatesAfterDay} resolution.`}
            context={<MissionContext prompt={packet.network} />}
          >
            {packet.network.options.map((option) => (
              <DecisionOption
                key={option.id}
                selected={selectedNetwork === option.id}
                disabled={!convergenceOptionAvailable(s, option)}
                name={option.choice.label}
                description={option.choice.flavor}
                cost={optionCost(option)}
                onClick={() =>
                  setSelectedNetwork(
                    selectedNetwork === option.id ? "" : option.id,
                  )
                }
              />
            ))}
          </DecisionCard>
        </div>
        <div className="briefing-issue">
          <span>
            ORDERS AVAILABLE{" "}
            <b>
              {s.actions} / {DAILY_ORDERS}
            </b>
          </span>
          <button disabled={!canIssue} onClick={issueSelections}>
            ISSUE {selectedCount || ""} ORDER{selectedCount === 1 ? "" : "S"}
          </button>
        </div>
        <p className="briefing-inaction">
          Unissued orders lapse at resolution. Inaction remains an authored
          daily policy.
        </p>
      </section>
      <section className="briefing-block">
        <header>
          <h2>SYSTEMIC ATTRITION</h2>
          <span>0 IS FAILURE // 100 IS NOMINAL</span>
        </header>
        <div className="briefing-ledger">
          {bars.map(([label, value, note, tone]) => (
            <div key={label}>
              <p>
                <span>{label}</span>
                <b>{note}</b>
              </p>
              <i>
                <em
                  className={tone}
                  style={{ width: `${Math.max(2, value)}%` }}
                />
              </i>
            </div>
          ))}
        </div>
      </section>
      <section className="briefing-block">
        <header>
          <h2>STRATEGIC BALANCE</h2>
          <span>
            {operation.friendlyPower >= operation.enemyPower
              ? "LOCAL ADVANTAGE"
              : "ENEMY ADVANTAGE"}
          </span>
        </header>
        <div className="briefing-versus">
          <div>
            <small>YOUR LOCAL EFFECTIVE FORCE</small>
            <b>{fmt(operation.friendlyPower, true)}</b>
          </div>
          <span>VS</span>
          <div>
            <small>LOCAL ENEMY EFFECTIVE FORCE</small>
            <b>{fmt(operation.enemyPower, true)}</b>
          </div>
        </div>
        <div className="briefing-track">
          <i />
          <em
            style={{
              left: `${Math.max(2, Math.min(98, ((s.front + 12) / 24) * 100))}%`,
            }}
          />
        </div>
        <div className="briefing-track-labels">
          <span>−12 · DEFEAT</span>
          <b>
            CURRENT {signed(s.front, " KM")} · LITERAL RATIO{" "}
            {operation.forceRatio.toFixed(2)}
          </b>
          <span>+12 · VICTORY</span>
        </div>
      </section>
      <section className="briefing-block">
        <header>
          <h2>{s.theater.toUpperCase()} THEATER // SITUATION MAP</h2>
          <span>REFERENCE TACTICAL PLATE // LIVE STATE</span>
        </header>
        <TheaterGeometry s={s} variant="briefing" />
      </section>
      <section className="briefing-wings">
        <article>
          <span>STANDALONE COMMAND WIDGET</span>
          <h2>Military</h2>
          <p>
            {fmt(s.deployable, true)} deployable. Readiness{" "}
            {s.readiness.toFixed(0)}. Network posture {s.networkPosture}. Every
            force and command-network family is available without changing
            renderer.
          </p>
          <button onClick={() => setSurface("military")}>
            OPEN MILITARY BOARD →
          </button>
        </article>
        <article>
          <span>STANDALONE COMMAND WIDGET</span>
          <h2>Diplomacy</h2>
          <p>
            {s.actors.length} foreign actors. {s.activeDiplomacy.length} active
            actions. Actor scope and action scope remain separate.
          </p>
          <button onClick={() => setSurface("diplomacy")}>
            OPEN DIPLOMATIC LEDGER →
          </button>
        </article>
      </section>
      <section className="briefing-block">
        <header>
          <h2>
            <i className="briefing-live" />
            SIGNALS TRAFFIC // CONTINUOUS
          </h2>
          <span>PATTERN ANALYSIS: {s.doctrine} INSIGHT</span>
        </header>
        <div className="briefing-signals">
          <p>
            <time>NOW</time>
            <span>
              <b>OPERATIONS</b> // {packet.operational.headline.toUpperCase()}
            </span>
          </p>
          <p>
            <time>−04M</time>
            <span>
              <b>DOMESTIC</b> // {packet.domestic.title.toUpperCase()}
            </span>
          </p>
          <p>
            <time>−11M</time>
            <span>
              <b>NETWORK</b> // {packet.network.title.toUpperCase()}
            </span>
          </p>
          <p>
            <time>−18M</time>
            <span>
              <b>SUPPLY</b> // MUNITIONS COVERAGE{" "}
              {coverage(s, "munitions").toFixed(1)} DAYS
            </span>
          </p>
          <p>
            <time>−27M</time>
            <span>
              <b>PERSONNEL</b> // {fmt(personnel.netDesertion, true)} PROJECTED
              NET FLIGHT FROM {fmt(personnel.desertion, true)} ATTEMPTS
            </span>
          </p>
        </div>
      </section>
      <footer className="briefing-footer">
        <span>DELENDA QUEST // ONE CAMPAIGN // TWO COMMAND INTERFACES</span>
        <button disabled={s.status !== "active"} onClick={resolveDay}>
          RESOLVE DAY {s.day} →
        </button>
      </footer>
    </>
  );
}

const surfaceFor = (target: string): Surface =>
  target === "national"
    ? "production"
    : target === "dashboard"
      ? "state"
      : target === "campaign"
        ? "brief"
        : target === "wiki"
          ? "manual"
          : target === "account"
            ? "service"
            : [
                  "brief",
                  "state",
                  "production",
                  "military",
                  "diplomacy",
                  "doctrine",
                  "manual",
                  "service",
                ].includes(target)
              ? (target as Surface)
              : "brief";

export function BriefingInterface({
  s,
  remaining,
  issue,
  issueDirective,
  resolveDay,
  openAva,
  selectDoctrine,
  useCommandInterface,
  onSurfaceChange,
}: Props) {
  const [surface, setSurface] = useState<Surface>("brief"),
    [focusFamilyId, setFocusFamilyId] = useState<string | undefined>(),
    [manualArticle, setManualArticle] = useState("resolution"),
    [confirmResolve, setConfirmResolve] = useState(false),
    [doctrineConfirm, setDoctrineConfirm] = useState<{
      vector: DoctrineVector;
      stage: DoctrineStage;
    } | null>(null),
    doctrineStageIndex = doctrineConfirm
      ? doctrineConfirm.vector.stages.findIndex(
          (stage) => stage.id === doctrineConfirm.stage.id,
        )
      : -1,
    doctrinePriorStage =
      doctrineConfirm && doctrineStageIndex > 0
        ? doctrineConfirm.vector.stages[doctrineStageIndex - 1]
        : null,
    doctrineUnlocked = doctrineConfirm
      ? s.unlocked.includes(doctrineConfirm.stage.id)
      : false,
    doctrinePrerequisiteMet =
      !!doctrineConfirm &&
      (doctrineStageIndex === 0 ||
        (!!doctrinePriorStage && s.unlocked.includes(doctrinePriorStage.id))),
    doctrineAvailable =
      !!doctrineConfirm &&
      !doctrineUnlocked &&
      doctrinePrerequisiteMet &&
      s.doctrine >= doctrineConfirm.stage.cost;
  const navigate = (module: string, family?: string) => {
    setFocusFamilyId(family);
    setSurface(surfaceFor(module));
  };
  useEffect(() => {
    const open = (event: Event) => {
      const detail = (
          event as CustomEvent<string | { module: string; family?: string }>
        ).detail,
        target = typeof detail === "string" ? detail : detail.module;
      setFocusFamilyId(typeof detail === "string" ? undefined : detail.family);
      setSurface(surfaceFor(target));
    };
    const manual = (event: Event) => {
      setManualArticle((event as CustomEvent<string>).detail);
      setSurface("manual");
    };
    const resolve = () => setConfirmResolve(true);
    window.addEventListener("briefing-open-surface", open);
    window.addEventListener("briefing-open-manual", manual);
    window.addEventListener("briefing-request-resolve", resolve);
    return () => {
      window.removeEventListener("briefing-open-surface", open);
      window.removeEventListener("briefing-open-manual", manual);
      window.removeEventListener("briefing-request-resolve", resolve);
    };
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (doctrineConfirm) setDoctrineConfirm(null);
      else if (confirmResolve) setConfirmResolve(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [doctrineConfirm, confirmResolve]);
  const nav: [Surface, string][] = [
    ["brief", "DAILY CAMPAIGN"],
    ["state", "STATE"],
    ["production", "PRODUCTION"],
    ["military", "MILITARY"],
    ["diplomacy", "DIPLOMACY"],
    ["doctrine", "DOCTRINE"],
    ["manual", "FIELD MANUAL"],
    ["service", "SERVICE RECORD"],
  ];
  const chooseSurface = (next: Surface) => {
    setFocusFamilyId(undefined);
    setSurface(next);
  };
  useEffect(() => {
    const moduleBySurface: Record<Surface, Module> = {
      brief: "campaign",
      state: "dashboard",
      production: "national",
      military: "military",
      diplomacy: "diplomacy",
      doctrine: "doctrine",
      manual: "wiki",
      service: "account",
    };
    onSurfaceChange(moduleBySurface[surface]);
  }, [surface, onSurfaceChange]);
  const confirmDoctrine = () => {
    if (!doctrineConfirm || !doctrineAvailable) return;
    selectDoctrine(doctrineConfirm.vector, doctrineConfirm.stage);
    setDoctrineConfirm(null);
  };
  return (
    <div className="briefing-ui">
      <div className="briefing-wrap">
        <header className="briefing-top">
          <button
            className="briefing-brand"
            onClick={() => chooseSurface("brief")}
          >
            DELENDA <em>QUEST</em>
          </button>
          <div>
            <span>
              DAY {s.day} // RESOLUTION IN <b>{remaining}</b>
            </span>
            <InterfaceSwitch useCommandInterface={useCommandInterface} />
          </div>
        </header>
        <nav className="briefing-nav">
          {nav.map(([id, label]) => (
            <button
              className={surface === id ? "active" : ""}
              aria-pressed={surface === id}
              onClick={() => chooseSurface(id)}
              key={id}
            >
              {label}
            </button>
          ))}
        </nav>
        {surface === "brief" ? (
          <DailySurface
            s={s}
            remaining={remaining}
            issue={issue}
            resolveDay={() => setConfirmResolve(true)}
            setSurface={chooseSurface}
          />
        ) : surface === "state" ? (
          <StateSurface s={s} />
        ) : surface === "production" ? (
          <DirectiveSurface
            s={s}
            module="national"
            focusFamilyId={focusFamilyId}
            issue={issueDirective}
          />
        ) : surface === "military" ? (
          <DirectiveSurface
            s={s}
            module="military"
            focusFamilyId={focusFamilyId}
            issue={issueDirective}
          />
        ) : surface === "diplomacy" ? (
          <DirectiveSurface
            s={s}
            module="diplomacy"
            focusFamilyId={focusFamilyId}
            issue={issueDirective}
          />
        ) : surface === "doctrine" ? (
          <DoctrineSurface
            s={s}
            select={(vector, stage) => setDoctrineConfirm({ vector, stage })}
          />
        ) : surface === "manual" ? (
          <ManualSurface article={manualArticle} navigate={navigate} />
        ) : (
          <ServiceSurface s={s} />
        )}
      </div>
      <button className="briefing-ava" onClick={openAva}>
        <i />
        <span>AVA</span>
        <small>COMMAND CHANNEL</small>
      </button>
      {confirmResolve && (
        <div className="modern-dialog-scrim" role="presentation">
          <section
            className="modern-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Resolve Day ${s.day}`}
          >
            <small>RESOLUTION // DAY {s.day}</small>
            <h2>Release the day to resolution?</h2>
            <p>
              {s.maneuver
                ? `${maneuverById(s.maneuver)?.label} resolves against ${situationForState(s).sector}. `
                : "Standing tempo prosecutes the unresolved campaign problem. "}
              {s.actions
                ? `${s.actions} unused order${s.actions === 1 ? "" : "s"} will lapse. `
                : ""}
              The resulting losses, movement, production, domestic state, and
              mission rotation cannot be recalled.
            </p>
            <div>
              <button onClick={() => setConfirmResolve(false)}>
                RETURN TO BRIEF
              </button>
              <button
                className="primary"
                onClick={() => {
                  setConfirmResolve(false);
                  resolveDay();
                }}
              >
                RESOLVE DAY {s.day} →
              </button>
            </div>
          </section>
        </div>
      )}
      {doctrineConfirm && (
        <div className="modern-dialog-scrim" role="presentation">
          <section
            className={`modern-dialog ${doctrineConfirm.vector.forbidden ? "danger" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={`Internalize ${doctrineConfirm.stage.label}`}
          >
            <small>
              {doctrineConfirm.vector.forbidden
                ? "PROHIBITED INSTITUTIONAL METHOD"
                : "DOCTRINE INTERNALIZATION"}{" "}
              // {doctrineConfirm.vector.label.toUpperCase()}
            </small>
            <h2>{doctrineConfirm.stage.label}</h2>
            <blockquote>“{doctrineConfirm.vector.quote}”</blockquote>
            <p>{doctrineConfirm.stage.description}</p>
            <dl>
              <div>
                <dt>BATTLEFIELD EFFECT</dt>
                <dd>{doctrineConfirm.stage.effect}</dd>
              </div>
              <div>
                <dt>INSIGHT COST</dt>
                <dd>
                  {doctrineConfirm.stage.cost} //{" "}
                  {s.doctrine - doctrineConfirm.stage.cost} REMAINS
                </dd>
              </div>
              <div>
                <dt>STATUS</dt>
                <dd>
                  {doctrineUnlocked
                    ? "INTERNALIZED"
                    : !doctrinePrerequisiteMet
                      ? `${doctrinePriorStage?.label.toUpperCase() ?? "PRIOR PRINCIPLE"} REQUIRED FIRST`
                      : s.doctrine < doctrineConfirm.stage.cost
                        ? `${doctrineConfirm.stage.cost - s.doctrine} MORE INSIGHT REQUIRED`
                        : "AVAILABLE"}
                </dd>
              </div>
            </dl>
            <div>
              <button onClick={() => setDoctrineConfirm(null)}>
                RETURN TO DOCTRINE
              </button>
              <button
                className="primary"
                disabled={!doctrineAvailable}
                onClick={confirmDoctrine}
              >
                {doctrineUnlocked
                  ? "ALREADY INTERNALIZED"
                  : !doctrinePrerequisiteMet
                    ? "PRIOR PRINCIPLE REQUIRED"
                    : s.doctrine < doctrineConfirm.stage.cost
                      ? "INSUFFICIENT INSIGHT"
                      : doctrineConfirm.vector.forbidden
                        ? "AUTHORIZE PROHIBITED METHOD →"
                        : "INTERNALIZE PRINCIPLE →"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
