"use client";
import { useCallback, useEffect, useState } from "react";

type Snapshot={
  siteSummary:{registeredPlayers:number;activeCampaigns:number;playersSeenLast24Hours:number;completedCampaigns:number;telemetryEvents:number;openBugReports:number;asOf:number};
  telemetry:Array<{key:string;category:string;subject:string;context:string;count:number}>;
  outcomeSummary:Array<{outcome:string;campaigns:number;averageDays:number}>;
  decisionClusters:Array<{decision:string;outcome:string;count:number;days:number}>;
  bugReports:Array<{id:string;route:string;elementKey:string;elementText:string;gridX:number;gridY:number;module:string;interfaceMode:string;reportText:string;status:string;createdAt:number}>;
};
const apiError=(value:unknown,fallback:string)=>{
  if(value&&typeof value==="object"&&"error" in value&&typeof value.error==="string")return value.error;
  return fallback;
};
const isSnapshot=(value:unknown):value is Snapshot=>{
  if(!value||typeof value!=="object")return false;
  const candidate=value as Partial<Snapshot>;
  return !!candidate.siteSummary&&
    typeof candidate.siteSummary==="object"&&
    Array.isArray(candidate.telemetry)&&
    Array.isArray(candidate.outcomeSummary)&&
    Array.isArray(candidate.decisionClusters)&&
    Array.isArray(candidate.bugReports);
};
const overrides=[
  ["accountEnabled","ACCOUNT ACCESS"],["socialEnabled","SOCIAL ACCESS"],["telemetryEnabled","TELEMETRY PARTICIPATION"],["aliasRenameUnlocked","RESET ALIAS COOLDOWN"],
] as const;

export function AdminPage(){
  const[data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(""),[alias,setAlias]=useState("");
  const load=useCallback(async()=>{const response=await fetch("/api/admin",{cache:"no-store"});const body:unknown=await response.json();if(!response.ok){setError(apiError(body,"Unavailable"));return}if(!isSnapshot(body)){setError("Administration returned an invalid response.");return}setData(body)},[]);
  useEffect(()=>{void load()},[load]);
  const override=async(field:string,value:boolean)=>{const response=await fetch("/api/admin",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({alias,field,value})});const body:unknown=await response.json();setError(response.ok?`${field} updated for ${alias}.`:apiError(body,"Override failed."))};
  const bug=async(id:string,status:"reviewed"|"closed")=>{await fetch("/api/admin",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"bug",id,status})});await load()};
  if(error&&!data)return <div className="module admin-page"><header><h1>Administration</h1><p>{error}</p></header></div>;
  return <div className="module admin-page" data-module="ADMIN"><header><span className="eyebrow">Aggregate operations // no individual gameplay surveillance</span><h1>Administration</h1><p>Support controls, ethical product telemetry, decision/outcome aggregates, and anonymous bug reports. No email list, friends graph, private transcript, or individual play history is exposed here.</p></header>
    <section className="admin-grid">
      <article className="admin-wide"><h2>SITE STATUS</h2>{data&&[
        ["REGISTERED PLAYERS",data.siteSummary.registeredPlayers],
        ["ACTIVE ACCOUNT CAMPAIGNS",data.siteSummary.activeCampaigns],
        ["PLAYERS SEEN // 24 HOURS",data.siteSummary.playersSeenLast24Hours],
        ["COMPLETED CAMPAIGN RECORDS",data.siteSummary.completedCampaigns],
        ["FIRST-PARTY TELEMETRY EVENTS",data.siteSummary.telemetryEvents],
        ["OPEN BUG REPORTS",data.siteSummary.openBugReports],
      ].map(([label,value])=><div className="admin-row" key={label}><b>{label}</b><span>{Number(value).toLocaleString()}</span><span>AS OF {new Date(data.siteSummary.asOf).toLocaleString()}</span></div>)}</article>
      <article><h2>PLAYER SUPPORT OVERRIDES</h2><label>PLAYER ALIAS<input value={alias} onChange={event=>setAlias(event.target.value)} placeholder="AshenRelay0421"/></label>{overrides.map(([field,label])=><div className="admin-override" key={field}><b>{label}</b><button disabled={!alias} onClick={()=>void override(field,true)}>ENABLE / UNLOCK</button><button disabled={!alias} onClick={()=>void override(field,false)}>DISABLE / LOCK</button></div>)}<p>{error}</p></article>
      <article><h2>OUTCOMES</h2>{data?.outcomeSummary.map(row=><div className="admin-row" key={row.outcome}><b>{row.outcome.toUpperCase()}</b><span>{row.campaigns} CAMPAIGNS</span><span>{row.averageDays} AVG DAYS</span></div>)}</article>
      <article className="admin-wide"><h2>DECISIONS CLUSTERED BY OUTCOME</h2>{data?.decisionClusters.slice(0,40).map(row=><div className="admin-row" key={`${row.outcome}:${row.decision}`}><b>{row.decision}</b><span>{row.outcome.toUpperCase()}</span><span>{row.count} USES</span></div>)}</article>
      <article className="admin-wide"><h2>SECTION USE AND SWITCHING</h2>{data?.telemetry.filter(row=>["page_view","module_dwell","module_switch","element_interaction","ava_command"].includes(row.category)).slice(0,80).map(row=><div className="admin-row" key={row.key}><b>{row.category.toUpperCase()} // {row.subject}</b><span>{row.context}</span><span>{row.count.toLocaleString()}</span></div>)}</article>
      <article className="admin-wide"><h2>BUG REPORTS</h2>{data?.bugReports.map(report=><div className="admin-bug" key={report.id}><header><b>{report.module.toUpperCase()} // GRID {report.gridX},{report.gridY}</b><span>{report.status.toUpperCase()}</span></header><small>{report.route} // {report.elementKey} // {report.elementText}</small><p>{report.reportText}</p><button onClick={()=>void bug(report.id,"reviewed")}>REVIEWED</button><button onClick={()=>void bug(report.id,"closed")}>CLOSE</button></div>)}</article>
    </section>
  </div>;
}
