"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DAILY_ORDERS, MANEUVERS, coverage, estimateDay, fmt, maneuverById, projectOperations,
  projectProduction, type GameState, type Maneuver, type Module,
} from "./game";
import { compileConvergence, convergenceOptionAvailable, type ConvergenceOption } from "./convergence";

type BriefingIssue={maneuverId?:string;domesticId?:string;networkId?:string};
type Props={
  s:GameState;remaining:string;
  issue:(input:BriefingIssue)=>void;resolveDay:()=>void;openAva:()=>void;
  openModule:(module:Module)=>void;useCommandInterface:()=>void;
};

const signed=(value:number,suffix="")=>`${value>=0?"+":"−"}${Math.abs(value).toFixed(1)}${suffix}`;
const optionCost=(option:ConvergenceOption)=>option.choice.exact.slice(0,2);

function InterfaceSwitch({useCommandInterface}:{useCommandInterface:()=>void}){
  return <div className="briefing-switch" aria-label="Interface mode"><button onClick={useCommandInterface}>COMMAND WINDOWS</button><button className="active" aria-pressed="true">DAILY BRIEF</button></div>;
}

function DecisionOption({selected,disabled,name,description,cost,onClick}:{selected:boolean;disabled?:boolean;name:string;description:string;cost:string[];onClick:()=>void}){
  return <button className={`briefing-option ${selected?"selected":""}`} disabled={disabled} aria-pressed={selected} onClick={onClick}><i aria-hidden="true"/><span className="briefing-option-copy"><b>{name}</b><small>{description}</small></span><span className="briefing-option-cost">{cost.map((line,index)=><em className={line.includes("+")?"pos":line.includes("-")||line.includes("−")?"neg":"warn"} key={`${line}-${index}`}>{line}</em>)}</span></button>;
}

function DecisionCard({meta,title,brief,children,primary=false}:{meta:string;title:string;brief?:string;children:React.ReactNode;primary?:boolean}){
  return <article className={`briefing-decision ${primary?"primary":""}`}><header><span>{meta}</span><h2>{title}</h2>{brief&&<p>{brief}</p>}</header><div className="briefing-options">{children}</div></article>;
}

function TheaterPlate({s}:{s:GameState}){
  const marker=Math.max(70,Math.min(630,350+s.front/12*250));
  return <div className="briefing-plate"><svg viewBox="0 0 700 210" role="img" aria-label={`${s.theater} theater situation map, front ${signed(s.front," km")}`}><rect width="700" height="210" fill="#0a0c0b"/><g className="grid"><path d="M100 0v210M200 0v210M300 0v210M400 0v210M500 0v210M600 0v210M0 52h700M0 105h700M0 158h700"/></g><path className="friendly" d="M40 20h200l60 85-60 85H40z"/><path className="contested" d="M300 105l130-35 40 35-40 35z"/><path className="enemy" d="M520 20h150v170H520l-50-85z"/><path className="corridor" d="M240 92l190-22M240 118l190 22"/><line className="front" x1={marker} y1="40" x2={marker} y2="170"/><rect className="formation" x="150" y="90" width="34" height="20"/><text x="167" y="104">RES</text><rect className="formation active" x="425" y="95" width="34" height="20"/><text x="442" y="109">CMD</text><circle className="emitter" cx="590" cy="70" r="6"/><text className="enemy-label" x="590" y="56">EMITTER?</text><text className="caption" x="30" y="204">{s.theater.toUpperCase()} THEATER // NETWORK {s.networkPosture.toUpperCase()} // INTEL {s.intelligence.toFixed(0)}%</text></svg><div className="briefing-map-legend"><span><i className="friendly"/>FRIENDLY</span><span><i className="contested"/>CONTESTED</span><span><i className="enemy"/>ENEMY</span></div></div>;
}

export function BriefingInterface({s,remaining,issue,resolveDay,openAva,openModule,useCommandInterface}:Props){
  const packet=useMemo(()=>compileConvergence(s),[s]);
  const[selectedManeuver,setSelectedManeuver]=useState(s.maneuver??"");
  const[selectedDomestic,setSelectedDomestic]=useState("");
  const[selectedNetwork,setSelectedNetwork]=useState("");
  useEffect(()=>{setSelectedManeuver(s.maneuver??"");setSelectedDomestic("");setSelectedNetwork("")},[s.day,s.maneuver]);
  const operation=projectOperations(s),production=projectProduction(s),personnel=estimateDay(s);
  const selectedCount=[selectedManeuver&&!s.maneuver,selectedDomestic,selectedNetwork].filter(Boolean).length;
  const canIssue=s.status==="active"&&selectedCount>0&&selectedCount<=s.actions;
  const availableManeuvers=packet.operational.maneuvers.map(id=>MANEUVERS.find(item=>item.id===id)).filter((item):item is Maneuver=>!!item);
  const issueSelections=()=>{issue({maneuverId:selectedManeuver&&!s.maneuver?selectedManeuver:undefined,domesticId:selectedDomestic||undefined,networkId:selectedNetwork||undefined});setSelectedDomestic("");setSelectedNetwork("")};
  const friendlyPower=operation.friendlyPower,enemyPower=operation.enemyPower;
  const bars=[
    ["MUNITIONS COVERAGE",Math.min(100,coverage(s,"munitions")/12*100),`${coverage(s,"munitions").toFixed(1)} days`,"amber"],
    ["EQUIPMENT COVERAGE",s.equipment,`${s.equipment.toFixed(0)}%`,"cyan"],
    ["STATE TOLERANCE",s.legitimacy,`${s.legitimacy.toFixed(0)}%`,"red"],
    ["NETWORK CONVERSION",Math.min(100,operation.networkFactor*100),s.networkPosture,"green"],
  ] as const;
  return <div className="briefing-ui">
    <div className="briefing-wrap">
      <header className="briefing-top"><button className="briefing-brand" onClick={()=>openModule("dashboard")}>DELENDA <em>QUEST</em></button><div><span>DAY {s.day} // RESOLUTION IN <b>{remaining}</b></span><InterfaceSwitch useCommandInterface={useCommandInterface}/></div></header>
      <nav className="briefing-nav"><button onClick={()=>openModule("dashboard")}>STATE</button><button onClick={()=>openModule("military")}>MILITARY</button><button onClick={()=>openModule("diplomacy")}>DIPLOMACY</button><button onClick={()=>openModule("doctrine")}>DOCTRINE</button><button onClick={()=>openModule("wiki")}>FIELD MANUAL</button><button onClick={()=>openModule("account")}>SERVICE RECORD</button></nav>

      <section className="briefing-situation"><span>DAILY STRATEGIC SITUATION // {packet.operational.sector.toUpperCase()} // {packet.operational.windowHours}-HOUR WINDOW</span><h1>{packet.operational.headline}</h1><p>{packet.operational.briefing} {s.maneuver?`${maneuverById(s.maneuver)?.label} is already issued.`:"No maneuver has been issued; standing tempo prosecutes the day by default."}</p><blockquote>“{packet.operational.quote}”<cite>— {packet.operational.attribution}</cite></blockquote></section>

      <section className="briefing-vitals"><div><small>DEPLOYABLE</small><b>{fmt(s.deployable,true)}</b><span className="neg">−{fmt(personnel.casualty,true)} projected loss</span></div><div><small>MUNITIONS COVERAGE</small><b className={coverage(s,"munitions")<5?"warn":""}>{coverage(s,"munitions").toFixed(1)} days</b><span className="neg">{production.lines.find(line=>line.resource==="munitions")?.net.toLocaleString()} net</span></div><div><small>INDUSTRIAL CONDITION</small><b>{s.materiel.toFixed(0)}%</b><span className={production.materielChange<0?"neg":"pos"}>{signed(production.materielChange)} / day</span></div><div><small>INTEL CONFIDENCE</small><b className="warn">{s.intelligence.toFixed(0)}%</b><span>{s.intelligence>=65?"observed":s.intelligence>=35?"estimated":"contradictory"}</span></div></section>

      <section className="briefing-decisions"><header><span>COMMANDER&apos;S QUESTION · RESOLVES TONIGHT</span><h1>{packet.operational.question}</h1><p>DECISION WINDOW CLOSES IN <b>{remaining}</b></p><blockquote>“The day is one problem expressed through several institutions.”<cite>CONVERGENCE SCHEMA // {packet.matrixVersion.toUpperCase()}</cite></blockquote></header>
        <div className="briefing-decision-stack">
          <DecisionCard primary meta="PRIMARY · OPERATIONAL · RESOLVES TONIGHT" title={packet.operational.sector} brief="Ground, force, and casualty consequences resolve from the stored operational ticket.">{availableManeuvers.slice(0,4).map(m=>{const p=projectOperations(s,m);return <DecisionOption key={m.id} selected={selectedManeuver===m.id} disabled={!!s.maneuver||s.actions<1} name={m.label} description={m.flavor} cost={[`${fmt(p.committed,true)} committed`,`${Math.round(p.executionConfidence*100)}% confidence`,`${fmt(p.friendlyLosses,true)} loss exposure`]} onClick={()=>setSelectedManeuver(selectedManeuver===m.id?"":m.id)}/>})}</DecisionCard>
          <DecisionCard meta={`SITUATIONAL · DOMESTIC · ${packet.domestic.authority}`} title={packet.domestic.title} brief={packet.domestic.brief}>{packet.domestic.options.map(option=><DecisionOption key={option.id} selected={selectedDomestic===option.id} disabled={!convergenceOptionAvailable(s,option)} name={option.choice.label} description={option.choice.flavor} cost={optionCost(option)} onClick={()=>setSelectedDomestic(selectedDomestic===option.id?"":option.id)}/>)}</DecisionCard>
          <DecisionCard meta={`SITUATIONAL · NETWORK · ${packet.network.authority}`} title={packet.network.title} brief={packet.network.brief}>{packet.network.options.map(option=><DecisionOption key={option.id} selected={selectedNetwork===option.id} disabled={!convergenceOptionAvailable(s,option)} name={option.choice.label} description={option.choice.flavor} cost={optionCost(option)} onClick={()=>setSelectedNetwork(selectedNetwork===option.id?"":option.id)}/>)}</DecisionCard>
        </div>
        <div className="briefing-issue"><span>ORDERS AVAILABLE <b>{s.actions} / {DAILY_ORDERS}</b></span><button disabled={!canIssue} onClick={issueSelections}>ISSUE {selectedCount||""} ORDER{selectedCount===1?"":"S"}</button></div><p className="briefing-inaction">Unissued orders lapse at resolution. Inaction remains an authored daily policy.</p>
      </section>

      <section className="briefing-block"><header><h2>SYSTEMIC ATTRITION</h2><span>0 IS FAILURE // 100 IS NOMINAL</span></header><div className="briefing-ledger">{bars.map(([label,value,note,tone])=><div key={label}><p><span>{label}</span><b>{note}</b></p><i><em className={tone} style={{width:`${Math.max(2,value)}%`}}/></i></div>)}</div></section>

      <section className="briefing-block"><header><h2>STRATEGIC BALANCE</h2><span>{friendlyPower>=enemyPower?"LOCAL ADVANTAGE":"ENEMY ADVANTAGE"}</span></header><div className="briefing-versus"><div><small>YOUR LOCAL EFFECTIVE FORCE</small><b>{fmt(friendlyPower,true)}</b></div><span>VS</span><div><small>LOCAL ENEMY ESTIMATE</small><b>{fmt(enemyPower,true)}</b></div></div><div className="briefing-track"><i/><em style={{left:`${Math.max(2,Math.min(98,(s.front+12)/24*100))}%`}}/></div><div className="briefing-track-labels"><span>−12 · DEFEAT</span><b>CURRENT {signed(s.front," KM")}</b><span>+12 · VICTORY</span></div></section>

      <section className="briefing-block"><header><h2>{s.theater.toUpperCase()} THEATER // SITUATION MAP</h2><span>GENERATED FROM THE ACTIVE SECTOR GRAPH</span></header><TheaterPlate s={s}/></section>

      <section className="briefing-wings"><article><span>STANDALONE COMMAND WIDGET</span><h2>Military</h2><p>{fmt(s.deployable,true)} deployable. Readiness {s.readiness.toFixed(0)}. Network posture {s.networkPosture}. Recruitment, training, personnel sustainment, tempo, and command-network trades remain independently available.</p><button onClick={()=>openModule("military")}>OPEN MILITARY BOARD →</button></article><article><span>STANDALONE COMMAND WIDGET</span><h2>Diplomacy</h2><p>{s.actors.length} foreign actors. {s.activeDiplomacy.length} active actions. Intelligence exchange now trades dependency, treasury, or political exposure instead of offering a strictly stronger version of the same bonus.</p><button onClick={()=>openModule("diplomacy")}>OPEN DIPLOMATIC LEDGER →</button></article></section>

      <section className="briefing-block"><header><h2><i className="briefing-live"/>SIGNALS TRAFFIC // CONTINUOUS</h2><span>PATTERN ANALYSIS: {s.doctrine} INSIGHT</span></header><div className="briefing-signals"><p><time>NOW</time><span><b>OPERATIONS</b> // {packet.operational.headline.toUpperCase()}</span></p><p><time>−04M</time><span><b>DOMESTIC</b> // {packet.domestic.title.toUpperCase()}</span></p><p><time>−11M</time><span><b>NETWORK</b> // {packet.network.title.toUpperCase()}</span></p><p><time>−18M</time><span><b>SUPPLY</b> // MUNITIONS COVERAGE {coverage(s,"munitions").toFixed(1)} DAYS</span></p><p><time>−27M</time><span><b>PERSONNEL</b> // {fmt(personnel.netDesertion,true)} PROJECTED NET FLIGHT</span></p></div></section>

      <footer className="briefing-footer"><span>DELENDA QUEST // ONE SUBSTRATE // TWO COMMAND INTERFACES</span><button disabled={s.status!=="active"} onClick={resolveDay}>RESOLVE DAY {s.day} →</button></footer>
    </div>
    <button className="briefing-ava" onClick={openAva}><i/><span>AVA</span><small>COMMAND CHANNEL</small></button>
  </div>;
}
