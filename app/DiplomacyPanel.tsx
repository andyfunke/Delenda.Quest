"use client";

import { useEffect, useMemo } from "react";
import { CONCEPTS } from "./concepts";
import {
  FAMILIES,
  activeDiplomacyForState,
  diplomacyDurationFor,
  fmt,
  projectDiplomacy,
  type Choice,
  type Family,
  type GameState,
} from "./game";
import { openWikiApplet } from "./wiki-events";

function Concept({id,children}:{id:string;children:React.ReactNode}){
  const c=CONCEPTS[id];
  return <span className="term" role="button" tabIndex={0} onClick={()=>openWikiApplet(id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")openWikiApplet(id)}}>{children}<span className="term-tip"><b>{c.label}</b><span>{c.definition}</span>{c.normal&&<em>NORMAL // {c.normal}</em>}<strong>CONSEQUENCE // {c.consequence}</strong><button onClick={e=>{e.stopPropagation();openWikiApplet(id)}}>OPEN WIKI APPLET</button><a href={`?wiki=${id}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>OPEN EXTERNALLY ↗</a></span></span>;
}

const actorKey:Record<string,string>={orison:"Orison",vey:"Vey",kestrel:"Kestrel",cineric:"Cineric"};
const adverseTerms=["dependency","enemy strength","atrocity","sanctions","betrayal","leverage"];
const signedValue=(value:string)=>Number(value.match(/([+−-]\d+(?:\.\d+)?)/)?.[1].replace("−","-")??0);
const impactTone=(value:string)=>{
  const amount=signedValue(value);if(!amount)return "neutral";
  const adverse=adverseTerms.some(term=>value.toLowerCase().includes(term));
  return adverse?(amount>0?"loss":"gain"):(amount>0?"gain":"loss");
};
const actorImpact=(choice:Choice|undefined,actorId:string,metric:string)=>choice?.exact.find(line=>line.toLowerCase().startsWith(`${actorKey[actorId].toLowerCase()} ${metric.toLowerCase()}`));

export function DiplomacyPanel({s,preview,actorId,onActorChange}:{s:GameState;preview?:{family:Family;choice:Choice}|null;actorId?:string;onActorChange?:(actorId:string)=>void}){
  const ledger=projectDiplomacy(s);
  const selected=ledger.actors.some(actor=>actor.id===actorId)?actorId:ledger.actors[0]?.id??"";
  const implicatedActor=useMemo(()=>ledger.actors.find(actor=>preview?.choice.exact.some(line=>line.toLowerCase().startsWith(actorKey[actor.id].toLowerCase()))),[preview,ledger.actors]);
  const implicatedActorId=implicatedActor?.id;
  useEffect(()=>{if(implicatedActorId)onActorChange?.(implicatedActorId)},[implicatedActorId,onActorChange]);
  const actor=ledger.actors.find(candidate=>candidate.id===selected)??ledger.actors[0];
  const active=activeDiplomacyForState(s).map(action=>{
    const family=FAMILIES.find(candidate=>candidate.id===action.familyId);
    const choice=family?.choices.find(candidate=>candidate.id===action.choiceId);
    return family&&choice?{...action,family,choice}:null;
  }).filter(Boolean) as Array<{familyId:string;choiceId:string;startedDay:number;expiresDay:number;family:Family;choice:Choice}>;
  if(!actor)return null;
  const metric=(id:string,label:string,value:number,change:number)=>{
    const impact=actorImpact(preview?.choice,actor.id,label);
    return <div className={impact?`preview-${impactTone(impact)}`:""}><Concept id={id}>{label.toUpperCase()}</Concept><b>{value.toFixed(1)}</b><small>{change>=0?"+":""}{change.toFixed(1)}/day</small>{impact&&<em>{impact.replace(/^.*?:\s*/,"")}</em>}</div>;
  };
  const actorMetric=(id:string,label:string,value:number,note:string)=>{
    const impact=actorImpact(preview?.choice,actor.id,label);
    return <div className={impact?`preview-${impactTone(impact)}`:""}><Concept id={id}>{label.toUpperCase()}</Concept><b>{value.toFixed(1)}</b><small>{note}</small>{impact&&<em>{impact.replace(/^.*?:\s*/,"")}</em>}</div>;
  };

  return <section className="diplomacy-panel">
    <header><div><small>FOREIGN RELATIONS // NEXT RESOLUTION</small><b>{fmt(ledger.totalMunitions,true)} MUNITIONS INBOUND</b></div><div><small>TREASURY DELIVERY</small><b>{ledger.totalTreasury.toFixed(1)} B</b></div><div><small>INTELLIGENCE DELIVERY</small><b>+{ledger.totalIntelligence}</b></div><div><small>HIGHEST BETRAYAL PRESSURE</small><b>{Math.round(ledger.highestBetrayalRisk*100)}%</b></div></header>
    <section className="active-diplomacy-report"><header><span>ACTIVE DIPLOMATIC ACTIONS</span><b>{active.length} OPERANT</b></header>{active.length?<div>{active.map(action=><article key={`${action.familyId}-${action.choiceId}-${action.startedDay}`}><small>{action.family.category.toUpperCase()} // THROUGH DAY {action.expiresDay-1}</small><b>{action.choice.label}</b><p>{action.choice.exact.join(" // ")}</p><em>{Math.max(0,action.expiresDay-s.day)} RESOLUTION{action.expiresDay-s.day===1?"":"S"} REMAIN</em></article>)}</div>:<p>NO ACTIVE DIPLOMATIC ACTIONS // NEW ACTIONS MAY STACK ACROSS ISSUE FAMILIES</p>}</section>
    {preview&&<section className="diplomacy-impact-report"><header><span>SELECTED ACTION EFFECTS // {preview.choice.label.toUpperCase()}</span><b>{preview.family.lock} DAY COOLDOWN // ACTIVE {preview.choice.duration??diplomacyDurationFor(preview.family.id)} DAYS</b></header><div>{preview.choice.exact.map(effect=><span className={impactTone(effect)} key={effect}><i>{impactTone(effect)==="gain"?"▲":impactTone(effect)==="loss"?"▼":"■"}</i><b>{effect}</b></span>)}</div></section>}
    <div className="diplomacy-workspace"><article><div><small>SELECTED FOREIGN ACTOR // {actor.role.toUpperCase()}</small><h3>{actor.name}</h3><p>{actor.interest}</p></div><div className="actor-metrics">{metric("diplomatic-trust","Trust",actor.trust,actor.trustChange)}{metric("foreign-leverage","Leverage",actor.leverage,actor.leverageChange)}{metric("foreign-dependency","Dependency",actor.dependency,actor.dependencyChange)}{actorMetric("treaty-obligation","Obligation",actor.obligation,"callable duty")}{actorMetric("aid-pipeline","Aid Pipeline",actor.aidPipeline,`${fmt(actor.munitionsDelivered,true)} munitions/day`)}{actorMetric("sanctions-exposure","Sanctions",actor.sanctionsExposure,"external isolation")}<div className={actor.betrayalRisk>.55?"critical":""}><Concept id="betrayal-pressure">BETRAYAL PRESSURE</Concept><b>{Math.round(actor.betrayalRisk*100)}%</b><small>dependency + leverage + distrust</small></div></div></article></div>
    <footer>{ledger.totalSanctionsDrag.toFixed(2)} MATERIEL CONDITION LOST TO AGGREGATE SANCTIONS EXPOSURE // FOREIGN ACTOR SELECTED IN THE LEFT COMMAND RAIL</footer>
  </section>;
}
