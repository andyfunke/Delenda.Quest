"use client";

import type { GameState, Maneuver } from "./game";
import { directorForState, fmt, maneuverContractFor, projectOutcomeBands } from "./game";
import { CONCEPTS } from "./concepts";

function Concept({id,children}:{id:string;children:React.ReactNode}){const c=CONCEPTS[id];if(!c)return <span>{children}</span>;return <span className="term" tabIndex={0}>{children}<span className="term-tip"><b>{c.label}</b><span>{c.definition}</span>{c.normal&&<em>NORMAL // {c.normal}</em>}<strong>CONSEQUENCE // {c.consequence}</strong><a href={`?wiki=${id}`} target="_blank" rel="noreferrer">OPEN WIKI ARTICLE ↗</a></span></span>}
function Factor({label,value,id}:{label:string;value:number;id:string}){return <div><Concept id={id}>{label}</Concept><b>{Math.round(value*100)}%</b><i><em style={{width:`${Math.min(100,value*100)}%`}}/></i></div>}

export function OperationsPacket({s,m}:{s:GameState;m:Maneuver}){
  const projections=projectOutcomeBands(s,m);const o=projections.executed;const contract=maneuverContractFor(s,m);
  const director=directorForState(s);
  const conditionPressure=director.modifiers.friendlyPressure-director.modifiers.enemyPressure;
  const branches=Object.values(projections);const groundLow=Math.min(...branches.map(x=>x.groundMovement)),groundHigh=Math.max(...branches.map(x=>x.groundMovement));const enemyLow=Math.min(...branches.map(x=>x.enemyLosses)),enemyHigh=Math.max(...branches.map(x=>x.enemyLosses));const friendlyLow=Math.min(...branches.map(x=>x.friendlyLosses)),friendlyHigh=Math.max(...branches.map(x=>x.friendlyLosses));
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
    <div className="operations-outcome"><div><small>FRIENDLY LOSS EXPOSURE</small><b>−{fmt(friendlyLow,true)}–{fmt(friendlyHigh,true)}</b><span>{(friendlyLow/o.committed*100).toFixed(1)}–{(friendlyHigh/o.committed*100).toFixed(1)}% of committed force</span></div><div><small>ENEMY LOSS RANGE</small><b>{fmt(enemyLow,true)}–{fmt(enemyHigh,true)}</b><span>collapse through clean execution</span></div><div><small>GROUND EFFECT RANGE</small><b>{groundLow>=0?"+":""}{groundLow.toFixed(2)} TO {groundHigh>=0?"+":""}{groundHigh.toFixed(2)} KM</b><span>contingent margin remains sealed</span></div></div>
    <div className="outcome-band-matrix">{contract.bands.map(({id,label,margin})=>{const branch=projections[id];const fact=id==="clean"?contract.aftermath?.clean??contract.aftermath?.success:id==="executed"?contract.aftermath?.success:contract.aftermath?.failure;return <a href="?wiki=outcome-margin" target="_blank" rel="noreferrer" key={id} className={`band-${id}`} title={`${label}: confidence minus the stored resolution roll falls in the ${margin} band.`}><small>{label}</small><b>{branch.groundMovement>=0?"+":""}{branch.groundMovement.toFixed(2)} KM</b><span>−{fmt(branch.friendlyLosses,true)} friendly // {fmt(branch.enemyLosses,true)} enemy est.</span><em>{fact?.label??"No persistent fact"}</em></a>})}</div>
    <details><summary>SHOW PRESSURE CALCULUS AND EVIDENCE</summary><div className="pressure-ledger">{[["BASE + TEMPO",o.basePressure],["MANEUVER RANGE",`${m.failurePressure>=0?"+":""}${m.failurePressure.toFixed(2)} to ${m.successPressure>=0?"+":""}${m.successPressure.toFixed(2)}`],["FORCE RATIO",o.forceRatioPressure],["INTELLIGENCE",o.intelligencePressure],["SHORTAGES",o.shortagePressure],[`CAMPAIGN CONDITION // ${director.event.label.toUpperCase()}`,conditionPressure]].map(([label,value])=><div key={String(label)}><span>{label}</span><b>{typeof value==="number"?`${value>=0?"+":""}${value.toFixed(2)} KM`:`${value} KM`}</b></div>)}</div><ul><li>Campaign Director: {director.event.label} // friendly pressure {director.modifiers.friendlyPressure>=0?"+":""}{director.modifiers.friendlyPressure.toFixed(2)} // enemy pressure {director.modifiers.enemyPressure>=0?"+":""}{director.modifiers.enemyPressure.toFixed(2)}</li>{o.evidence.filter(x=>!x.startsWith("Resolution roll")&&!x.includes("ground movement")&&!x.includes("enemy losses")).map(x=><li key={x}>{x}</li>)}</ul></details>
  </section>;
}
