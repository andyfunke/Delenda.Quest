"use client";

import type { GameState, Maneuver } from "./game";
import { fmt, projectOperationRange, projectOperations } from "./game";
import { CONCEPTS } from "./concepts";

function Concept({id,children}:{id:string;children:React.ReactNode}){const c=CONCEPTS[id];return <span className="term" tabIndex={0}>{children}<span className="term-tip"><b>{c.label}</b><span>{c.definition}</span>{c.normal&&<em>NORMAL // {c.normal}</em>}<strong>CONSEQUENCE // {c.consequence}</strong><a href={`?wiki=${id}`} target="_blank" rel="noreferrer">OPEN WIKI ARTICLE ↗</a></span></span>}
function Factor({label,value,id}:{label:string;value:number;id:string}){return <div><Concept id={id}>{label}</Concept><b>{Math.round(value*100)}%</b><i><em style={{width:`${Math.min(100,value*100)}%`}}/></i></div>}

export function OperationsPacket({s,m}:{s:GameState;m:Maneuver}){
  const o=projectOperations(s,m);
  const branches=projectOperationRange(s,m);const groundLow=Math.min(branches.success.groundMovement,branches.failure.groundMovement),groundHigh=Math.max(branches.success.groundMovement,branches.failure.groundMovement);const enemyLow=Math.min(branches.success.enemyLosses,branches.failure.enemyLosses),enemyHigh=Math.max(branches.success.enemyLosses,branches.failure.enemyLosses);
  return <section className="operations-packet">
    <header><div><small>OPERATIONAL RESOLUTION PACKET</small><b>{o.sector.toUpperCase()} // {o.maneuver.toUpperCase()}</b></div><span>CONTINGENT BRANCH SEALED UNTIL RESOLUTION</span></header>
    <div className="operations-summary">
      <div><Concept id="force-commitment">COMMITTED</Concept><b>{fmt(o.committed,true)}</b><small>{(o.commitmentShare*100).toFixed(1)}% of deployable</small></div>
      <div><Concept id="effective-committed-force">EFFECTIVE COMMITTED</Concept><b>{fmt(o.effectiveCommitted,true)}</b><small>after battlefield conversion</small></div>
      <div><Concept id="force-ratio">LOCAL FORCE RATIO</Concept><b>{o.forceRatio.toFixed(2)} : 1</b><small>{fmt(o.friendlyPower,true)} vs {fmt(o.enemyPower,true)}</small></div>
      <div><Concept id="frontage">FRONTAGE</Concept><b>{Math.round(o.frontageSaturation*100)}%</b><small>{fmt(o.frontageDemand,true)} useful capacity</small></div>
    </div>
    <div className="operations-factors">
      <Factor label="TERRAIN" value={o.terrainFactor} id="terrain-conversion"/><Factor label="GROUND" value={o.groundFactor} id="ground-condition"/><Factor label="NETWORK" value={o.networkFactor} id="command-network"/><Factor label="SUPPLY" value={o.supplyFactor} id="operational-supply"/><Factor label="INTELLIGENCE" value={o.intelligenceFactor} id="intelligence"/><Factor label="FRONTAGE" value={Math.min(1.5,1/Math.max(.67,o.frontageSaturation))} id="frontage"/>
    </div>
    <div className="operations-outcome"><div><small>FRIENDLY LOSS EXPOSURE</small><b>−{fmt(o.friendlyLosses,true)}</b><span>{(o.lossRate*100).toFixed(1)}% of committed // branch-independent estimate</span></div><div><small>ENEMY LOSS RANGE</small><b>{fmt(enemyLow,true)}–{fmt(enemyHigh,true)}</b><span>failure branch to winning branch</span></div><div><small>GROUND EFFECT RANGE</small><b>{groundLow>=0?"+":""}{groundLow.toFixed(2)} TO {groundHigh>=0?"+":""}{groundHigh.toFixed(2)} KM</b><span>contingent branch sealed</span></div></div>
    <details><summary>SHOW PRESSURE CALCULUS AND EVIDENCE</summary><div className="pressure-ledger">{[["BASE + TEMPO",o.basePressure],["MANEUVER RANGE",`${m.failurePressure>=0?"+":""}${m.failurePressure.toFixed(2)} to ${m.successPressure>=0?"+":""}${m.successPressure.toFixed(2)}`],["FORCE RATIO",o.forceRatioPressure],["INTELLIGENCE",o.intelligencePressure],["SHORTAGES",o.shortagePressure]].map(([label,value])=><div key={String(label)}><span>{label}</span><b>{typeof value==="number"?`${value>=0?"+":""}${value.toFixed(2)} KM`:`${value} KM`}</b></div>)}</div><ul>{o.evidence.filter(x=>!x.startsWith("Resolution roll")&&!x.includes("ground movement")&&!x.includes("enemy losses")).map(x=><li key={x}>{x}</li>)}</ul></details>
  </section>;
}
