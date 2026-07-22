"use client";

import { useEffect, useMemo, useState } from "react";
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
const signedValue=(text:string)=>Number(text.match(/([+−-]\d+(?:\.\d+)?)/)?.[1].replace("−","-")??0);
const impactTone=(text:string)=>{
  const value=signedValue(text);if(!value)return "neutral";
  const adverse=adverseTerms.some(term=>text.toLowerCase().includes(term));
  return adverse?(value>0?"loss":"gain"):(value>0?"gain":"loss");
};
const actorImpact=(choice:Choice|undefined,actorId:string,metric:string)=>choice?.exact.find(line=>line.toLowerCase().startsWith(`${actorKey[actorId].toLowerCase()} ${metric.toLowerCase()}`));

export function DiplomacyPanel({s,preview}:{s:GameState;preview?:{family:Family;choice:Choice}|null}){
  const ledger=projectDiplomacy(s);const[selected,setSelected]=useState(ledger.actors[0]?.id??"");
  const implicatedActor=useMemo(()=>ledger.actors.find(actor=>preview?.choice.exact.some(line=>line.toLowerCase().startsWith(actorKey[actor.id].toLowerCase()))),[preview,ledger.actors]);
  const implicatedActorId=implicatedActor?.id;
  useEffect(()=>{if(implicatedActorId)setSelected(implicatedActorId)},[implicatedActorId]);
  const actor=ledger.actors.find(a=>a.id===selected)??ledger.actors[0];
  const active=activeDiplomacyForState(s).map(action=>{const family=FAMILIES.find(f=>f.id===action.familyId);const choice=family?.choices.find(c=>c.id===action.choiceId);return family&&choice?{...action,family,choice}:null}).filter(Boolean) as Array<{familyId:string;choiceId:string;startedDay:number;expiresDay:number;family:Family;choice:Choice}>;
  const metric=(id:string,label:string,value:number,change:number,note:string)=>{const impact=actorImpact(preview?.choice,actor.id,label);return <div className={impact?`preview-${impactTone(impact)}`:""}><Concept id={id}>{label.toUpperCase()}</Concept><b>{value.toFixed(1)}</b><small>{change>=0?"+":""}{change.toFixed(1)}/day</small>{impact&&<em>{impact.replace(/^.*?:\s*/,"")}</em>} {!impact&&note&&<i>{note}</i>}</div>};
  return <section className="diplomacy-panel">
    <header><div><small>FOREIGN RELATIONS // NEXT RESOLUTION</small><b>{fmt(ledger.totalMunitions,true)} MUNITIONS INBOUND</b></div><div><small>TREASURY DELIVERY</small><b>{ledger.totalTreasury.toFixed(1)} B</b></div><div><small>INTELLIGENCE DELIVERY</small><b>+{ledger.totalIntelligence}</b></div><div><small>HIGHEST BETRAYAL PRESSURE</small><b>{Math.round(ledger.highestBetrayalRisk*100)}%</b></div></header>
    <section className="active-diplomacy-report"><header><span>ACTIVE DIPLOMATIC ACTIONS</span><b>{active.length} OPERANT</b></header>{active.length?<div>{active.map(action=><article key={`${action.familyId}-${action.choiceId}-${action.startedDay}`}><small>{action.family.category.toUpperCase()} // THROUGH DAY {action.expiresDay-1}</small><b>{action.choice.label}</b><p>{action.choice.exact.join(" // ")}</p><em>{Math.max(0,action.expiresDay-s.day)} RESOLUTION{action.expiresDay-s.day===1?"":"S"} REMAIN</em></article>)}</div>:<p>NO ACTIVE DIPLOMATIC ACTIONS // NEW ACTIONS MAY STACK ACROSS ISSUE FAMILIES</p>}</section>
    {preview&&<section className="diplomacy-impact-report"><header><span>SELECTED ACTION EFFECTS // {preview.choice.label.toUpperCase()}</span><b>{preview.family.lock} DAY COOLDOWN // ACTIVE {preview.choice.duration??diplomacyDurationFor(preview.family.id)} DAYS</b></header><div>{preview.choice.exact.map(effect=><span className={impactTone(effect)} key={effect}><i>{impactTone(effect)==="gain"?"▲":impactTone(effect)==="loss"?"▼":"■"}</i><b>{effect}</b></span>)}</div></section>}
    <div className="diplomacy-workspace"><nav>{ledger.actors.map(a=><button className={a.id===actor.id?"selected":""} onClick={()=>setSelected(a.id)} key={a.id}><span>{a.role.toUpperCase()}</span><b>{a.name}</b><small>TRUST {a.trust.toFixed(0)} // LEVERAGE {a.leverage.toFixed(0)}</small></button>)}</nav>{actor&&<article><div><small>{actor.role.toUpperCase()} // {actor.id.toUpperCase()}</small><h3>{actor.name}</h3><p>{actor.interest}</p></div><div className="actor-metrics">{metric("diplomatic-trust","Trust",actor.trust,actor.trustChange,"")}{metric("foreign-leverage","Leverage",actor.leverage,actor.leverageChange,"")}{metric("foreign-dependency","Dependency",actor.dependency,actor.dependencyChange,"")}<div className={actorImpact(preview?.choice,actor.id,"Obligation")?`preview-${impactTone(actorImpact(preview?.choice,actor.id,"Obligation")!)}`:""}><Concept id="treaty-obligation">OBLIGATION</Concept><b>{actor.obligation.toFixed(1)}</b><small>callable duty</small>{actorImpact(preview?.choice,actor.id,"Obligation")&&<em>{actorImpact(preview?.choice,actor.id,"Obligation")!.replace(/^.*?:\s*/,"")}</em>}</div><div className={actorImpact(preview?.choice,actor.id,"Aid Pipeline")?`preview-${impactTone(actorImpact(preview?.choice,actor.id,"Aid Pipeline")!)}`:""}><Concept id="aid-pipeline">AID PIPELINE</Concept><b>{actor.aidPipeline.toFixed(1)}</b><small>{fmt(actor.munitionsDelivered,true)} munitions/day</small>{actorImpact(preview?.choice,actor.id,"Aid Pipeline")&&<em>{actorImpact(preview?.choice,actor.id,"Aid Pipeline")!.replace(/^.*?:\s*/,"")}</em>}</div><div className={actorImpact(preview?.choice,actor.id,"Sanctions")?`preview-${impactTone(actorImpact(preview?.choice,actor.id,"Sanctions")!)}`:""}><Concept id="sanctions-exposure">SANCTIONS</Concept><b>{actor.sanctionsExposure.toFixed(1)}</b><small>external isolation</small>{actorImpact(preview?.choice,actor.id,"Sanctions")&&<em>{actorImpact(preview?.choice,actor.id,"Sanctions")!.replace(/^.*?:\s*/,"")}</em>}</div><div className={actor.betrayalRisk>.55?"critical":""}><Concept id="betrayal-pressure">BETRAYAL PRESSURE</Concept><b>{Math.round(actor.betrayalRisk*100)}%</b><small>dependency + leverage + distrust</small></div></div></article>}</div>
    <footer>{ledger.totalSanctionsDrag.toFixed(2)} MATERIEL CONDITION LOST TO AGGREGATE SANCTIONS EXPOSURE // SELECT AN ACTOR OR ACTION TO INSPECT</footer>
  </section>;
}
