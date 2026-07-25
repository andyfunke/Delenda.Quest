"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DAILY_ORDERS,
  DOCTRINES,
  FAMILIES,
  coverage,
  directiveRejection,
  estimateDay,
  fmt,
  maneuverForState,
  maneuversForState,
  projectDomestic,
  projectDiplomacy,
  projectForceGeneration,
  projectOperations,
  projectProduction,
  situationForState,
  type Choice,
  type DoctrineStage,
  type DoctrineVector,
  type Family,
  type GameState,
  type Module,
} from "./game";
import {
  compileConvergence,
  convergenceFrontStatus,
  convergenceOptionAvailable,
  type ConvergenceOption,
  type ConvergencePrompt,
} from "./convergence";
import { FieldManual } from "./FieldManual";
import { TheaterGeometry } from "./TheaterGeometry";
import { operationalObjectiveForProblemClass } from "./campaign-substrate";
import type { Aphorism } from "./aphorisms";
import { Bubblette, type BubbletteDetail } from "./Bubblette";
import { OperationsPacket } from "./OperationsPacket";
import { CampaignDirectorPanel } from "./CampaignDirectorPanel";
import { DomesticStatePanel } from "./DomesticStatePanel";
import { DiplomacyPanel } from "./DiplomacyPanel";
import { AdversaryPanel } from "./AdversaryPanel";
import { campaignSeedId } from "./campaign-id";
import { AccountPage } from "./AccountPage";

type BriefingIssue = {
  maneuverId?: string;
  domesticId?: string;
  networkId?: string;
};
type Surface =
  | "daily"
  | "brief"
  | "state"
  | "production"
  | "military"
  | "diplomacy"
  | "doctrine"
  | "manual"
  | "service"
  | "account";
type Props = {
  s: GameState;
  epigraph: Aphorism | null;
  remaining: string;
  canResolve: boolean;
  initialModule: Module;
  issue: (input: BriefingIssue) => void;
  issueDirective: (family: Family, choice: Choice) => void;
  resolveDay: () => void | Promise<boolean>;
  openAva: () => void;
  selectDoctrine: (vector: DoctrineVector, stage: DoctrineStage) => void;
  useCommandInterface: () => void;
  onNewCampaign: () => void;
  onSurfaceChange: (module: Module) => void;
  logoutPath: string;
};

const signed = (value: number, suffix = "") =>
  `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}${suffix}`;
const optionCost = (option: ConvergenceOption) => [
  ...option.choice.exact,
  ...option.choice.risk.map((line) => `RISK // ${line}`),
];

function ModernModuleEpigraph({ epigraph }: { epigraph: Aphorism | null }) {
  if (!epigraph) return null;
  return (
    <blockquote className="modern-module-epigraph">
      “{epigraph.text}”
      <cite>— {epigraph.source}</cite>
    </blockquote>
  );
}

function UxToggle({
  useCommandInterface,
}: {
  useCommandInterface: () => void;
}) {
  return (
    <button
      aria-label="Switch to Command Windows UX"
      className="briefing-ux-toggle"
      onClick={useCommandInterface}
    >
      SWITCH UX
    </button>
  );
}

function DecisionOption({
  selected,
  disabled,
  unavailable,
  name,
  description,
  cost,
  onClick,
}: {
  selected: boolean;
  disabled?: boolean;
  unavailable?: boolean;
  name: string;
  description: string;
  cost: string[];
  onClick: () => void;
}) {
  return (
    <button
      className={`briefing-option ${selected ? "selected" : ""} ${unavailable ? "unavailable" : ""}`}
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
  cooling = false,
}: {
  meta: string;
  title: string;
  brief?: string;
  context?: React.ReactNode;
  children: React.ReactNode;
  primary?: boolean;
  cooling?: boolean;
}) {
  return (
    <article
      className={`briefing-decision ${primary ? "primary" : ""} ${cooling ? "cooling" : ""}`}
    >
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
          // {operationalObjectiveForProblemClass(prompt.operationalAnchor.problemClass)}
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

function SecondaryFrontLedger({
  s,
  prompt,
  prefix,
  selected,
  select,
}: {
  s: GameState;
  prompt: ConvergencePrompt;
  prefix: "D" | "N";
  selected: string;
  select: (id: string) => void;
}) {
  const status = convergenceFrontStatus(s, prompt);
  const frontEffect = prompt.convergence
    .map((edge) => edge.summary)
    .join(" ");
  return (
    <section
      className="briefing-secondary-ledger"
      data-domain={prompt.domain}
    >
      <header>
        <div>
          <span>
            {prompt.domain === "domestic"
              ? "SECONDARY QUEST // DOMESTIC FRONT"
              : "SECONDARY QUEST // COMMAND NETWORK"}
          </span>
          <b>{prompt.category.toUpperCase()}</b>
        </div>
        <em className={status.cooling ? "cooling" : ""}>
          {status.cooling ? status.reason : "RESPONSES AVAILABLE"}
        </em>
      </header>
      <div className="briefing-secondary-narrative">
        <div className="briefing-secondary-heading">
          <small>
            {prompt.pressureBand.toUpperCase()} PRESSURE //{" "}
            {prompt.operationalAnchor.sector.toUpperCase()}
          </small>
          <h2>{prompt.title}</h2>
          <p>{prompt.question}</p>
        </div>
        <aside>
          <span>HOW THIS REACHES THE FRONT</span>
          <p>{frontEffect}</p>
          <small>
            OPERATIONAL ORIENTATION //{" "}
            {operationalObjectiveForProblemClass(
              prompt.operationalAnchor.problemClass,
            ).toUpperCase()}
          </small>
        </aside>
      </div>
      <div className="briefing-secondary-options">
        {prompt.options.map((option, index) => {
          const unavailable = !convergenceOptionAvailable(s, option);
          return (
            <button
              key={option.id}
              className={selected === option.id ? "selected" : ""}
              disabled={unavailable}
              aria-pressed={selected === option.id}
              onClick={() => select(selected === option.id ? "" : option.id)}
            >
              <i aria-hidden="true" />
              <span className="briefing-secondary-option-copy">
                <small>RESPONSE {prefix}{index + 1}</small>
                <b>{option.choice.label}</b>
                <span>{option.choice.flavor}</span>
              </span>
              <span className="briefing-secondary-option-cost">
                {optionCost(option).map((line, costIndex) => (
                  <em
                    className={
                      line.includes("+")
                        ? "pos"
                        : line.includes("-") || line.includes("−")
                          ? "neg"
                          : "warn"
                    }
                    key={`${line}-${costIndex}`}
                  >
                    {line}
                  </em>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StateSurface({ s }: { s: GameState }) {
  const operation = projectOperations(s),
    production = projectProduction(s),
    domestic = projectDomestic(s),
    force = projectForceGeneration(s),
    diplomacy=projectDiplomacy(s),
    personnel = estimateDay(s),
    maneuver=maneuversForState(s)[0];
  const activeDirectives=Object.entries(s.active).flatMap(([familyId,choiceId])=>{
    const family=FAMILIES.find(item=>item.id===familyId),choice=family?.choices.find(item=>item.id===choiceId);
    return family&&choice?[{family,choice,expires:s.locks[familyId]??s.day}]:[];
  });
  const internalized=DOCTRINES.flatMap(vector=>vector.stages.map(stage=>({vector,stage}))).filter(item=>s.unlocked.includes(item.stage.id));
  const controlsFor=(keys:string[])=>{
    const matches=FAMILIES.flatMap(family=>family.choices.some(item=>{
      const effects=[item.delta,item.tick,item.delay?.delta].filter(Boolean) as Array<Record<string,number>>;
      return effects.some(effect=>keys.some(key=>key in effect));
    })?[family]:[]);
    return [...new Set(matches.map(item=>`${item.category} // ${item.label}`))];
  };
  const node=(id:string,label:string,value:string,note:string,keys:string[],details:BubbletteDetail[]=[])=>{
    const controls=controlsFor(keys);
    return <Bubblette id={id} title={label} summary={note} details={[
      ...details,
      {label:"DIRECT CONTROLS",value:controls.slice(0,5).join(" · ")||"No directive changes this value directly"},
      {label:"INTERDEPENDENCIES",value:keys.join(" · ")},
    ]} className="state-constellation-node">
      <small>{label}</small><b>{value}</b><span>{note}</span>
    </Bubblette>;
  };
  return (
    <section className="modern-surface modern-state-surface">
      <header>
        <span>AUTHORITATIVE STATE // DAY {s.day} // {campaignSeedId(s.campaignSeed)}</span>
        <h1>State of the war</h1>
        <p>
          Hover any figure for its dependencies. Pin it to open the Field
          Manual, trace what consumes it, or jump to the directives that
          control it.
        </p>
      </header>
      <div className="state-constellation" aria-label="Authoritative state dependency constellation">
        <div className="state-constellation-core"><small>CAMPAIGN STATE</small><b>{s.status.toUpperCase()}</b><span>{s.front>=0?"+":""}{s.front.toFixed(1)} KM // DAY {s.day}</span></div>
        {node("deployable-force","DEPLOYABLE",fmt(s.deployable,true),`${fmt(operation.committed,true)} committed locally`,["deployable","armed","readiness"])}
        {node("effective-committed-force","FRIENDLY EFFECTIVE",fmt(operation.friendlyPower,true),`ratio ${operation.forceRatio.toFixed(2)} : 1`,["readiness","equipment","intelligence"])}
        {node("enemy-forward-deployment","ENEMY EFFECTIVE",fmt(operation.enemyPower,true),`${fmt(operation.enemyCommittedLow,true)}–${fmt(operation.enemyCommittedHigh,true)} local band`,["intelligence","enemy"])}
        {node("casualty-exposure","LOSS EXPOSURE",fmt(personnel.casualty,true),`${fmt(personnel.netDesertion,true)} projected net flight`,["readiness","equipment","desertionPressure","patrolCommitment"])}
        {node("industrial-condition","INDUSTRIAL CONDITION",`${s.materiel.toFixed(0)}%`,`${production.shortages} shortages // ${production.maintenanceDebtAfter.toFixed(0)} debt`,["materiel","maintenanceDebt","workforce","treasury"])}
        {node("training-pipeline","REPLACEMENT OUTPUT",fmt(force.effectiveGraduates,true),`${fmt(force.deployableAssigned,true)} assigned deployable`,["training","quality","queue","reserves"])}
        {node("treasury","TREASURY",`${s.treasury.toFixed(1)} B`,`${signed(diplomacy.totalTreasury)} foreign delivery`,["treasury","dependency"])}
        {node("legitimacy","LEGITIMACY",`${s.legitimacy.toFixed(0)}%`,`${signed(domestic.legitimacyChange)} at resolution`,["legitimacy","resistance","treasury"])}
        {node("resistance","RESISTANCE",`${s.resistance.toFixed(0)}%`,`${signed(domestic.resistanceChange)} at resolution`,["resistance","legitimacy","forced"])}
        {node("intelligence","INTELLIGENCE",`${s.intelligence.toFixed(0)}%`,`${operation.executionConfidence*100>=0?"+":""}${Math.round(operation.executionConfidence*100)}% execution confidence`,["intelligence","networkPosture"])}
      </div>
      <CampaignDirectorPanel s={s} />
      <section className="briefing-block">
        <header>
          <h2>{s.theater.toUpperCase()} THEATER // SITUATION MAP</h2>
        </header>
        <TheaterGeometry s={s} variant="briefing" />
      </section>
      {maneuver?<OperationsPacket s={s} m={maneuver}/>:null}
      <section className="state-report-block">
        <header><span>INDUSTRIAL THROUGHPUT // NEXT RESOLUTION</span><b>{production.shortages} SHORTAGES</b></header>
        <div className="state-throughput-grid">
          {production.lines.map(line=>node(
            line.resource==="munitions"?"operational-supply":"equipment",
            line.resource.toUpperCase(),
            line.closing.toLocaleString(),
            `${line.output.toLocaleString()} output // ${line.fulfilledUse.toLocaleString()} use // ${line.net>=0?"+":""}${line.net.toLocaleString()} net`,
            ["materiel","maintenanceDebt","workforce","treasury"],
            [{label:"ALLOCATION",value:`${s.production[line.resource].allocation}%`},{label:"DESIRED OUTPUT",value:line.desiredOutput.toLocaleString()},{label:"COVERAGE",value:`${coverage(s,line.resource).toFixed(1)} days`}],
          ))}
        </div>
      </section>
      <section className="state-report-block">
        <header><span>FORCE GENERATION // NEXT RESOLUTION</span><b>{fmt(force.effectiveGraduates,true)} EFFECTIVE GRADUATES</b></header>
        <div className="modern-metric-grid">
          <article><small>GROSS INTAKE</small><b>{fmt(force.grossIntake,true)}</b><span>{fmt(force.admitted,true)} admitted</span></article>
          <article><small>TRAINING CAPACITY</small><b>{fmt(force.capacity,true)}</b><span>{force.cohortsClosing} cohorts tracked</span></article>
          <article><small>REPLACEMENT RESERVE</small><b>{fmt(force.reservesClosing,true)}</b><span>{fmt(force.deployableAssigned,true)} assigned</span></article>
          <article><small>TRAINING QUALITY</small><b>{s.quality.toFixed(0)}%</b><span>{s.duration} day standard</span></article>
        </div>
      </section>
      <DomesticStatePanel s={s}/>
      <DiplomacyPanel s={s}/>
      {maneuver?<AdversaryPanel s={s} m={maneuver}/>:null}
      <section className="state-report-block resolution-ledger state-order-ledger">
        <header><span>ACTIVE ORDERS AND EFFECTS</span><b>{activeDirectives.length+s.activeDiplomacy.length} ACTIVE</b></header>
        {activeDirectives.map(({family,choice,expires})=><article key={family.id}><b>{family.category.toUpperCase()}</b><span>{family.label} // {choice.label}</span><span>LOCK THROUGH DAY {expires}</span><span>{[...choice.exact,...choice.risk].join(" · ")}</span></article>)}
        {s.activeDiplomacy.map(action=>{const family=FAMILIES.find(item=>item.id===action.familyId),choice=family?.choices.find(item=>item.id===action.choiceId);return <article key={`${action.familyId}:${action.choiceId}:${action.startedDay}`}><b>DIPLOMATIC EFFECT</b><span>{family?.label??action.familyId} // {choice?.label??action.choiceId}</span><span>EXPIRES DAY {action.expiresDay}</span><span>{choice?[...choice.exact,...choice.risk].join(" · "):"Persistent foreign effect"}</span></article>})}
        {!activeDirectives.length&&!s.activeDiplomacy.length?<p>NO ACTIVE DIRECTIVES // THE STATE IS RUNNING ON BASELINE ORDERS</p>:null}
      </section>
      <section className="state-report-block resolution-ledger state-learning-ledger">
        <header><span>DOCTRINE, OPPORTUNITIES, AND PERMANENT MEMORY</span><b>{s.doctrine} INSIGHT AVAILABLE</b></header>
        {internalized.map(({vector,stage})=><article key={stage.id}><b>{vector.label.toUpperCase()}</b><span>{stage.label}</span><span>INTERNALIZED</span><span>{stage.effect}</span></article>)}
        {s.opportunityHistory.map(record=><article key={`${record.day}:${record.opportunityId}`}><b>DAY {record.day} OPPORTUNITY</b><span>{record.label}</span><span>{record.outcome.toUpperCase()}</span><span>{record.response} // {record.report}</span></article>)}
        {!internalized.length&&!s.opportunityHistory.length?<p>NO PERMANENT LEARNING OR OPPORTUNITY RECORDS YET</p>:null}
      </section>
      <section className="state-report-block resolution-ledger">
        <header><span>RESOLUTION HISTORY</span><b>{s.resolutionHistory.length} DAYS RECORDED</b></header>
        {s.resolutionHistory.length?s.resolutionHistory.map(record=><article key={record.resolvedDay}><b>DAY {record.resolvedDay}</b><span>{record.sector} // {record.outcome.outcomeBand.replaceAll("-"," ").toUpperCase()}</span><span>{record.outcome.groundMovement>=0?"+":""}{record.outcome.groundMovement.toFixed(2)} KM</span><span>{fmt(record.personnel.combatLosses,true)} COMBAT LOSSES</span><span>{fmt(record.personnel.netDesertion,true)} NET FLIGHT</span></article>):<p>NO DAYS RESOLVED // TODAY’S STATE IS THE OPENING RECORD</p>}
      </section>
    </section>
  );
}

export function DirectiveSurface({
  s,
  module,
  focusFamilyId,
  issue,
  epigraph,
}: {
  s: GameState;
  module: "national" | "military" | "diplomacy";
  focusFamilyId?: string;
  issue: (family: Family, choice: Choice) => void;
  epigraph: Aphorism | null;
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
  return (
    <section
      className="modern-surface modern-directives"
      data-module={moduleLabel}
    >
      <header>
        <ModernModuleEpigraph epigraph={epigraph} />
        <span>{moduleLabel} // DIRECTIVE CONTROL</span>
        <h1>
          {module === "national"
            ? "Production and domestic state"
            : module === "military"
              ? "Military command"
              : "Diplomatic ledger"}
        </h1>
        <p>
          Select an issue family, review its tradeoffs, and issue one order.
          Reports, forecasts, active effects, and historical ledgers are
          available through Ava.
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
  epigraph,
}: {
  s: GameState;
  select: (vector: DoctrineVector, stage: DoctrineStage) => void;
  epigraph: Aphorism | null;
}) {
  const [selectedVectorId,setSelectedVectorId]=useState("");
  const [selectedStageId,setSelectedStageId]=useState("");
  const vector=DOCTRINES.find(item=>item.id===selectedVectorId)??null;
  const stage=vector?.stages.find(item=>item.id===selectedStageId)??null;
  const stageIndex=stage&&vector?vector.stages.findIndex(item=>item.id===stage.id):-1;
  const priorAvailable=!!stage&&!!vector&&(stageIndex===0||s.unlocked.includes(vector.stages[stageIndex-1].id));
  const unlocked=!!stage&&s.unlocked.includes(stage.id);
  const available=!!stage&&priorAvailable&&!unlocked&&s.doctrine>=stage.cost;
  return (
    <section className="modern-surface modern-doctrine-surface">
      <header>
        <ModernModuleEpigraph epigraph={epigraph} />
        <span>DOCTRINE // INSTITUTIONAL MEMORY</span>
        <h1>Doctrine control</h1>
        <div className="doctrine-insight-available"><small>INSIGHT AVAILABLE</small><b>{s.doctrine}</b><span>VERIFIED BATTLEFIELD EVIDENCE</span></div>
      </header>
      <div className="modern-doctrine-layout">
        <nav className="modern-doctrine-rail" aria-label="Doctrine categories and principles">
          {DOCTRINES.map(item=><section className={item.forbidden?"forbidden":""} key={item.id}>
            <button className={selectedVectorId===item.id&&!selectedStageId?"active":""} onClick={()=>{setSelectedVectorId(item.id);setSelectedStageId("")}}>
              <small>{item.authority}</small><b>{item.label}</b>
            </button>
            {item.stages.map((itemStage,index)=>{
              const itemUnlocked=s.unlocked.includes(itemStage.id);
              const prior=index===0||s.unlocked.includes(item.stages[index-1].id);
              return <button className={`${selectedStageId===itemStage.id?"active":""} ${!prior?"unresearchable":""}`} onClick={()=>{setSelectedVectorId(item.id);setSelectedStageId(itemStage.id)}} key={itemStage.id}>
                <span>{itemUnlocked?"INTERNALIZED":prior?`${itemStage.cost} INSIGHT`:"PREREQUISITE"}</span><b>{itemStage.label}</b>
              </button>;
            })}
          </section>)}
        </nav>
        <article className={`modern-doctrine-detail ${vector?.forbidden?"forbidden":""}`}>
          {!vector?<div className="modern-doctrine-empty"><small>NO PRINCIPLE SELECTED</small><h2>Select a doctrine category from the left.</h2><p>Every principle is authored, sequential, persistent, and grounded in a verified battlefield result.</p></div>:!stage?<><div className="modern-path">DOCTRINE / {vector.label.toUpperCase()}</div><small>{vector.authority}</small><h2>{vector.label}</h2><blockquote>“{vector.quote}”</blockquote><p>{vector.stages.length} principles form this learning path. Select one from the left to inspect its evidence cost, affected formation, and permanent rule.</p></>:<>
            <div className="modern-path">DOCTRINE / {vector.label.toUpperCase()} / {stage.label.toUpperCase()}</div>
            <small>{stage.output??"INSTITUTIONAL PRINCIPLE"} // {stage.affects??vector.authority}</small>
            <h2>{stage.label}</h2>
            {stage.quote?<blockquote>“{stage.quote}”<cite>— {stage.attribution}</cite></blockquote>:<blockquote>“{vector.quote}”<cite>— {vector.authority}</cite></blockquote>}
            <p>{stage.description}</p>
            <section className="doctrine-effect-report"><small>PERMANENT EFFECT</small><b>{stage.effect}</b><span>{stage.cost} INSIGHT REQUIRED // {s.doctrine} AVAILABLE</span></section>
            <button className="doctrine-internalize" onClick={()=>{if(available)select(vector,stage)}}>{unlocked?"ALREADY INTERNALIZED":!priorAvailable?"PREREQUISITE REQUIRED":s.doctrine<stage.cost?`NEED ${stage.cost-s.doctrine} MORE INSIGHT`:`INTERNALIZE ${stage.label.toUpperCase()} →`}</button>
          </>}
        </article>
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
        <h1>{campaignSeedId(s.campaignSeed)}</h1>
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
  epigraph,
  remaining,
  issue,
  setSurface,
}: {
  s: GameState;
  epigraph: Aphorism | null;
  remaining: string;
  issue: (input: BriefingIssue) => void;
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
  const selectedDomesticOption = packet.domestic.options.find(
      (option) => option.id === selectedDomestic,
    ),
    selectedNetworkOption = packet.network.options.find(
      (option) => option.id === selectedNetwork,
    );
  const selectedCount = [
    selectedManeuver && !s.maneuver,
    selectedDomestic,
    selectedNetwork,
  ].filter(Boolean).length;
  const canIssue =
    s.status === "active" &&
    selectedCount > 0 &&
    selectedCount <= s.actions &&
    (!selectedDomesticOption ||
      convergenceOptionAvailable(s, selectedDomesticOption)) &&
    (!selectedNetworkOption ||
      convergenceOptionAvailable(s, selectedNetworkOption));
  const availableManeuvers = maneuversForState(s);
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
    [
      "INDUSTRIAL CONDITION",
      s.materiel,
      `${s.materiel.toFixed(0)}% · ${signed(production.materielChange)} / day`,
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
    <section className="modern-surface modern-daily-surface">
      <ModernModuleEpigraph epigraph={epigraph} />
      <section className="briefing-situation">
        <span>
          DAILY STRATEGIC SITUATION // {packet.operational.sector.toUpperCase()}{" "}
          // {packet.operational.windowHours}-HOUR WINDOW
        </span>
        <h1>{packet.operational.headline}</h1>
        <p>
          {packet.operational.briefing}{" "}
          {s.maneuver
            ? `${maneuverForState(s,s.maneuver)?.label} is already issued.`
            : "No maneuver has been issued; standing tempo prosecutes the day by default."}
        </p>
        <blockquote>
          “{packet.operational.quote}”
          <cite>— {packet.operational.attribution}</cite>
        </blockquote>
      </section>
      <section className="briefing-vitals">
        <div>
          <small>FORWARD DEPLOYED</small>
          <b>{fmt(operation.committed, true)}</b>
          <span>
            ENGAGING ENEMY //{" "}
            {(operation.commitmentShare * 100).toFixed(1)}% OF OPERATIONALLY
            AVAILABLE
          </span>
        </div>
        <div>
          <small>MUNITIONS COVERAGE</small>
          <b className={coverage(s, "munitions") < 5 ? "warn" : ""}>
            {coverage(s, "munitions").toFixed(1)} days
          </b>
          <span>STOCKPILE {s.production.munitions.stock.toLocaleString()}</span>
          <span>
            CURRENT {production.lines.find((line) => line.resource === "munitions")?.output.toLocaleString()}
            {" // "}DESIRED {production.lines.find((line) => line.resource === "munitions")?.desiredOutput.toLocaleString()}
          </span>
        </div>
        <div>
          <small>READINESS</small>
          <b>{s.readiness.toFixed(0)}%</b>
          <span>{s.tempo.toUpperCase()} TEMPO</span>
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
            {availableManeuvers.map((m) => {
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
          {packet.activeDomains.length > 0 && <div className="briefing-secondary-fronts">
            {packet.activeDomains.includes("domestic") && (
            <SecondaryFrontLedger
              s={s}
              prompt={packet.domestic}
              prefix="D"
              selected={selectedDomestic}
              select={setSelectedDomestic}
            />
            )}
            {packet.activeDomains.includes("network") && (
            <SecondaryFrontLedger
              s={s}
              prompt={packet.network}
              prefix="N"
              selected={selectedNetwork}
              select={setSelectedNetwork}
            />
            )}
          </div>}
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
    </section>
  );
}

function DailyBriefSurface({ s }: { s: GameState }) {
  const latest = s.reports[0];
  const quote =
    latest.epigraph ??
    "The report is complete when the missing figures stop being requested.";
  const source =
    latest.day === 1
      ? "COMM. HET CLAXTON, Praetor Corps, Third Division"
      : "CAMPAIGN ARCHIVE";
  return (
    <section className={`alt-daily-brief ${latest.tone}`}>
      <header>
        <span>MORNING REPORT // DAY {latest.day}</span>
        <small>FIELD DISPATCH // CAMPAIGN ARCHIVE</small>
      </header>
      <blockquote>
        <span>“{quote}”</span>
        <cite>— {source}</cite>
      </blockquote>
      <article>
        <small>DAILY BRIEF</small>
        <h1>{latest.title}</h1>
        <div>
          {latest.body.split(/\n{2,}/).map((paragraph, index) => (
            <p key={`${latest.day}-${index}`}>{paragraph}</p>
          ))}
        </div>
      </article>
    </section>
  );
}

const surfaceFor = (target: string): Surface =>
  target === "national"
    ? "production"
    : target === "dashboard"
      ? "brief"
      : target === "campaign"
        ? "brief"
        : target === "wiki"
          ? "manual"
          : target === "account"
            ? "account"
            : [
                  "daily",
                  "brief",
                  "production",
                  "military",
                  "diplomacy",
                  "doctrine",
                  "manual",
                  "service",
                  "account",
                ].includes(target)
              ? (target as Surface)
              : "brief";

export function BriefingInterface({
  s,
  epigraph,
  remaining,
  canResolve,
  initialModule,
  issue,
  issueDirective,
  resolveDay,
  openAva,
  selectDoctrine,
  useCommandInterface,
  onNewCampaign,
  onSurfaceChange,
  logoutPath,
}: Props) {
  const [surface, setSurface] = useState<Surface>(() => surfaceFor(initialModule)),
    [focusFamilyId, setFocusFamilyId] = useState<string | undefined>(),
    [manualArticle, setManualArticle] = useState("resolution"),
    [confirmResolve, setConfirmResolve] = useState(false),
    [accountMenuOpen, setAccountMenuOpen] = useState(false),
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
  const requestResolve = useCallback(() => {
    if (canResolve) setConfirmResolve(true);
  }, [canResolve]);
  const navigate = (module: string, family?: string) => {
    setFocusFamilyId(family);
    setSurface(surfaceFor(module));
  };
  useEffect(() => {
    setSurface(surfaceFor(initialModule));
  }, [initialModule]);
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
    window.addEventListener("briefing-open-surface", open);
    window.addEventListener("briefing-open-manual", manual);
    window.addEventListener("briefing-request-resolve", requestResolve);
    return () => {
      window.removeEventListener("briefing-open-surface", open);
      window.removeEventListener("briefing-open-manual", manual);
      window.removeEventListener("briefing-request-resolve", requestResolve);
    };
  }, [requestResolve]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (doctrineConfirm) setDoctrineConfirm(null);
      else if (confirmResolve) setConfirmResolve(false);
      else if (accountMenuOpen) setAccountMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [doctrineConfirm, confirmResolve, accountMenuOpen]);
  const nav: [Surface, string][] = [
    ["brief", "DAILY CAMPAIGN"],
    ["daily", "DAILY BRIEF"],
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
      daily: "dashboard",
      brief: "campaign",
      state: "dashboard",
      production: "national",
      military: "military",
      diplomacy: "diplomacy",
      doctrine: "doctrine",
      manual: "wiki",
      service: "account",
      account: "account",
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
          <Link
            className="briefing-brand"
            href="/"
            aria-label="Return to the Delenda Quest splash page"
          >
            DELENDA <em>QUEST</em>
          </Link>
          <div className="briefing-top-stack">
            <div className="briefing-status-row">
              <span>
                DAY {s.day} // RESOLUTION IN <b>{remaining}</b>
              </span>
              <UxToggle useCommandInterface={useCommandInterface} />
            </div>
            <div className="briefing-top-actions">
              <button disabled={!canResolve} onClick={requestResolve}>
                RESOLVE DAY {s.day} →
              </button>
              <div className={`briefing-account-menu ${accountMenuOpen ? "open" : ""}`}>
                <button
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountMenuOpen((open) => !open)}
                >
                  ACCOUNT
                </button>
                {accountMenuOpen && (
                  <div role="menu">
                    <button
                      role="menuitem"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        chooseSurface("account");
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
            </div>
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
        {surface === "daily" ? (
          <DailyBriefSurface s={s} />
        ) : surface === "brief" ? (
          <DailySurface
            s={s}
            epigraph={epigraph}
            remaining={remaining}
            issue={issue}
            setSurface={chooseSurface}
          />
        ) : surface === "state" ? (
          <StateSurface s={s} />
        ) : surface === "production" ? (
          <DirectiveSurface
            s={s}
            epigraph={epigraph}
            module="national"
            focusFamilyId={focusFamilyId}
            issue={issueDirective}
          />
        ) : surface === "military" ? (
          <DirectiveSurface
            s={s}
            epigraph={epigraph}
            module="military"
            focusFamilyId={focusFamilyId}
            issue={issueDirective}
          />
        ) : surface === "diplomacy" ? (
          <DirectiveSurface
            s={s}
            epigraph={epigraph}
            module="diplomacy"
            focusFamilyId={focusFamilyId}
            issue={issueDirective}
          />
        ) : surface === "doctrine" ? (
          <DoctrineSurface
            s={s}
            epigraph={epigraph}
            select={(vector, stage) => setDoctrineConfirm({ vector, stage })}
          />
        ) : surface === "manual" ? (
          <ManualSurface article={manualArticle} navigate={navigate} />
        ) : surface === "service" ? (
          <ServiceSurface s={s} />
        ) : (
          <section className="modern-surface briefing-account-surface">
            <AccountPage onNewCampaign={onNewCampaign} />
          </section>
        )}
        <footer className="briefing-footer">
          <span>DELENDA QUEST // ONE CAMPAIGN // TWO COMMAND INTERFACES</span>
          <button
            disabled={!canResolve}
            onClick={requestResolve}
          >
            RESOLVE DAY {s.day} →
          </button>
        </footer>
      </div>
      <button className="briefing-ava" onClick={openAva}>
        <i />
        <span>AVA</span>
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
                ? `${maneuverForState(s,s.maneuver)?.label} resolves against ${situationForState(s).sector}. `
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
                disabled={!canResolve}
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
            <blockquote>
              “{doctrineConfirm.stage.quote ?? doctrineConfirm.vector.quote}”
              {doctrineConfirm.stage.attribution && (
                <cite>— {doctrineConfirm.stage.attribution}</cite>
              )}
            </blockquote>
            {doctrineConfirm.vector.forbidden &&
              doctrineConfirm.stage.severity && (
                <strong className={`atrocity-severity ${doctrineConfirm.stage.severity}`}>
                  DECISION SEVERITY // {doctrineConfirm.stage.severity.toUpperCase()}
                </strong>
              )}
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
