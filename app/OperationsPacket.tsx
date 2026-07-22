"use client";

import type { GameState, Maneuver } from "./game";
import { directorForState, fmtStrategic, projectAdversary, projectOutcomeBands, situationForState } from "./game";
import { CONCEPTS } from "./concepts";
import { openWikiApplet } from "./wiki-events";

type Detail={label:string;value:string};

function InspectCell({id,label,value,note,details,className=""}:{id:string;label:string;value:string;note:string;details:Detail[];className?:string}){
  const concept=CONCEPTS[id];
  const open=()=>openWikiApplet(id);
  return <div className={`operation-inspect ${className}`} role="button" tabIndex={0} onClick={open} onKeyDown={event=>{if(event.key==="Enter"||event.key===" ")open()}}>
    <small>{label}</small><b>{value}</b><span>{note}</span>
    <div className="effect-bubble"><strong>{concept?.label??label}</strong><p>{concept?.definition}</p><dl>{details.map(detail=><div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>{concept?.consequence&&<p><b>WHY IT MATTERS // </b>{concept.consequence}</p>}<em>OPEN FIELD MANUAL →</em></div>
  </div>;
}

export function OperationsPacket({s,m}:{s:GameState;m:Maneuver}){
  const situation=situationForState(s);
  const projections=projectOutcomeBands(s,m);
  const operation=projections.executed;
  const adversary=projectAdversary(s,m);
  const director=directorForState(s);
  const branches=Object.values(projections);
  const groundLow=Math.min(...branches.map(branch=>branch.groundMovement));
  const groundHigh=Math.max(...branches.map(branch=>branch.groundMovement));
  const friendlyLow=Math.min(...branches.map(branch=>branch.friendlyLosses));
  const friendlyHigh=Math.max(...branches.map(branch=>branch.friendlyLosses));
  const intelligenceContribution=(s.intelligence-42)*.2;
  const readinessContribution=(s.readiness-64)*.15;
  const equipmentContribution=(s.equipment-71)*.15;
  const shortageContribution=Object.values(s.production).filter(line=>line.stock<line.use*2).length*-3;
  const proofContribution=Math.min(8,(s.affinityProofs[m.vector]??0)*2);
  const adaptationContribution=Math.min(12,(s.adversary?.adaptation[m.id]??0)*1.5);
  const conditionContribution=director.modifiers.confidence*100;
  const problemArticle=`situation-${situation.blueprintId.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}`;
  const factorData=[
    {id:"terrain-conversion",label:"TERRAIN",value:situation.terrain,factor:operation.terrainFactor,details:[{label:"SECTOR CONDITION",value:situation.terrain},{label:"POWER CONVERSION",value:`× ${operation.terrainFactor.toFixed(2)}`},{label:"LEVER",value:"Maneuver selection and terrain-specialist Doctrine"}]},
    {id:"ground-condition",label:"GROUND",value:situation.ground,factor:operation.groundFactor,details:[{label:"SURFACE STATE",value:situation.ground},{label:"POWER CONVERSION",value:`× ${operation.groundFactor.toFixed(2)}`},{label:"LOSS EXPOSURE",value:"Ground condition also modifies the casualty circuit"}]},
    {id:"command-network",label:"NETWORK",value:situation.network,factor:operation.networkFactor,details:[{label:"NETWORK STATE",value:situation.network},{label:"POWER CONVERSION",value:`× ${operation.networkFactor.toFixed(2)}`},{label:"ENEMY INTERFERENCE",value:`−${Math.round(adversary.networkInterference*100)} points`},{label:"LEVER",value:"Restore the Command Net or internalize command Doctrine"}]},
    {id:"operational-supply",label:"SUPPLY",value:situation.supply,factor:operation.supplyFactor,details:[{label:"LOCAL CONDITION",value:situation.supply},{label:"POWER CONVERSION",value:`× ${operation.supplyFactor.toFixed(2)}`},{label:"TEMPO",value:s.tempo.toUpperCase()},{label:"LEVER",value:"Operational tempo, external supply, and campaign condition"}]},
    {id:"intelligence",label:"INTELLIGENCE",value:`${s.intelligence.toFixed(0)} / 100`,factor:operation.intelligenceFactor,details:[{label:"AUTHORITATIVE SCORE",value:`${s.intelligence.toFixed(1)} / 100`},{label:"POWER CONVERSION",value:`× ${operation.intelligenceFactor.toFixed(2)}`},{label:"CONFIDENCE CONTRIBUTION",value:`${intelligenceContribution>=0?"+":""}${intelligenceContribution.toFixed(1)} points`},{label:"ENEMY ORDERS CLASSIFIED",value:`${adversary.observedOrders.length} / 3`},{label:"LEVER",value:"Statecraft, network operations, reconnaissance, and opportunities"}]},
  ];
  return <section className="operations-packet">
    <header><div><small>CAMPAIGN ESTIMATE // ONE AUTHORITATIVE REPORT</small><b>{situation.sector.toUpperCase()} // {m.label.toUpperCase()}</b></div><span>HOVER FOR CALCULUS // CLICK FOR FIELD MANUAL</span></header>
    <section className="operations-brief">
      <div><small>ACTIVE OPERATIONAL PROBLEM</small><h3>{situation.headline}</h3><p>{situation.briefing}</p></div>
      <button onClick={()=>openWikiApplet(problemArticle)}><span>CAMPAIGN SYNOPSIS</span><b>{situation.problemClass.replaceAll("-"," ").toUpperCase()}</b><small>{situation.question}</small></button>
    </section>
    <div className="operations-factors">{factorData.map(factor=><InspectCell key={factor.id} id={factor.id} label={factor.label} value={factor.value} note={`CONVERSION ×${factor.factor.toFixed(2)}`} details={factor.details}/>)}</div>
    <InspectCell id="enemy-orders" label="OBSERVED ENEMY INTENT" value={adversary.observedOrders[0]??"NO CURRENT ORDER CLASSIFIED"} note={adversary.hiddenOrders?`${adversary.hiddenOrders} of 3 orders remain unclassified`:"All three orders classified"} details={[{label:"OPERATIONS",value:adversary.observedOrders.find(order=>order.startsWith("OPERATIONS"))??"UNCLASSIFIED"},{label:"PRODUCTION",value:adversary.observedOrders.find(order=>order.startsWith("PRODUCTION"))??"UNCLASSIFIED"},{label:"COUNTERMEASURE",value:adversary.observedOrders.find(order=>order.startsWith("COUNTERMEASURE"))??"UNCLASSIFIED"},{label:"CLASSIFICATION RULE",value:"Intelligence below 35 reveals 1 order; 35 to 64 reveals 2; 65 or higher reveals all 3"}]} className="observed-intent"/>
    <div className="operations-summary">
      <InspectCell id="force-commitment" label="FRIENDLY DEPLOYED" value={fmtStrategic(operation.committed)} note={`${(operation.commitmentShare*100).toFixed(1)}% of ${fmtStrategic(s.deployable)} deployable`} details={[{label:"DEPLOYABLE FORCE",value:fmtStrategic(s.deployable)},{label:"MANEUVER COMMITMENT",value:fmtStrategic(operation.committed)},{label:"COMMITMENT SHARE",value:`${(operation.commitmentShare*100).toFixed(1)}%`},{label:"UNCOMMITTED DEPLOYABLE",value:fmtStrategic(Math.max(0,s.deployable-operation.committed))}]}/>
      <InspectCell id="effective-committed-force" label="FRIENDLY EFFECTIVE" value={fmtStrategic(operation.effectiveCommitted)} note={`${fmtStrategic(operation.committed)} personnel × ${operation.friendlyConditionFactor.toFixed(2)} condition`} details={[{label:"FRIENDLY DEPLOYED",value:fmtStrategic(operation.committed)},{label:"CONDITION BLEND",value:`× ${operation.friendlyConditionFactor.toFixed(2)}`},{label:"READINESS // 20% WEIGHT",value:operation.readinessFactor.toFixed(2)},{label:"EQUIPMENT // 18% WEIGHT",value:operation.equipmentFactor.toFixed(2)},{label:"TERRAIN // 12% WEIGHT",value:operation.terrainFactor.toFixed(2)},{label:"GROUND // 12% WEIGHT",value:operation.groundFactor.toFixed(2)},{label:"NETWORK // 12% WEIGHT",value:operation.networkFactor.toFixed(2)},{label:"SUPPLY // 14% WEIGHT",value:operation.supplyFactor.toFixed(2)},{label:"INTELLIGENCE // 12% WEIGHT",value:operation.intelligenceFactor.toFixed(2)},{label:"FRONTAGE",value:`${Math.round(operation.frontageSaturation*100)}% of ${fmtStrategic(operation.frontageDemand)} useful capacity; congestion begins above 135%`},{label:"RESULT",value:fmtStrategic(operation.effectiveCommitted)}]}/>
      <InspectCell id="enemy-forward-deployment" label="ENEMY DEPLOYED" value={fmtStrategic(operation.enemyCommitted)} note={`${situation.sector} // ${fmtStrategic(operation.enemyCommittedLow)}–${fmtStrategic(operation.enemyCommittedHigh)}`} details={[{label:"LOCAL DEPLOYED ESTIMATE",value:fmtStrategic(operation.enemyCommitted)},{label:"LOCAL DEPLOYMENT BAND",value:`${fmtStrategic(operation.enemyCommittedLow)}–${fmtStrategic(operation.enemyCommittedHigh)}`},{label:"THEATER FORWARD DEPLOYED",value:fmtStrategic(adversary.deployedEstimate)},{label:"TOTAL ASSESSED FIELD FORCE",value:fmtStrategic(adversary.estimatedForce)},{label:"FORWARD COMMITMENT",value:`${Math.round(adversary.deploymentShare*100)}% under ${adversary.posture}`},{label:"LOCAL EFFECTIVE FORCE",value:fmtStrategic(operation.enemyPower)},{label:"LOCAL CONDITION BLEND",value:`× ${operation.enemyConditionFactor.toFixed(2)}`},{label:"REINFORCEMENT AT RESOLUTION",value:`+${fmtStrategic(adversary.reinforcement)} theater-wide`},{label:"ASSESSMENT BASIS",value:"Theater forward deployment × this sector's share of the enemy disposition"}]}/>
      <InspectCell id="force-ratio" label="EFFECTIVE FORCE RATIO" value={`${operation.forceRatio.toFixed(2)} : 1`} note={`${fmtStrategic(operation.friendlyPower)} friendly vs ${fmtStrategic(operation.enemyPower)} enemy effective`} details={[{label:"FRIENDLY DEPLOYED",value:fmtStrategic(operation.committed)},{label:"FRIENDLY EFFECTIVE",value:fmtStrategic(operation.friendlyPower)},{label:"ENEMY DEPLOYED",value:fmtStrategic(operation.enemyCommitted)},{label:"ENEMY EFFECTIVE",value:fmtStrategic(operation.enemyPower)},{label:"FORMULA",value:"friendly effective force ÷ enemy effective force in the selected sector"},{label:"PRESSURE CONTRIBUTION",value:`${operation.forceRatioPressure>=0?"+":""}${operation.forceRatioPressure.toFixed(2)}`}]}/>
    </div>
    <div className="operations-conclusions">
      <InspectCell id="execution-confidence" label="EXECUTION CONFIDENCE" value={`${Math.round(operation.executionConfidence*100)}%`} note="sealed roll selects the result band" details={[{label:"MANEUVER BASE",value:`${Math.round(m.success*100)}%`},{label:"INTELLIGENCE",value:`${intelligenceContribution>=0?"+":""}${intelligenceContribution.toFixed(1)} points`},{label:"READINESS",value:`${readinessContribution>=0?"+":""}${readinessContribution.toFixed(1)} points`},{label:"EQUIPMENT",value:`${equipmentContribution>=0?"+":""}${equipmentContribution.toFixed(1)} points`},{label:"SHORTAGES",value:`${shortageContribution.toFixed(1)} points`},{label:"FIELD PROOFS",value:`+${proofContribution.toFixed(1)} points`},{label:"ENEMY ADAPTATION",value:`−${adaptationContribution.toFixed(1)} points`},{label:"CAMPAIGN CONDITION",value:`${conditionContribution>=0?"+":""}${conditionContribution.toFixed(1)} points`}]}/>
      <InspectCell id="casualty-exposure" label="FRIENDLY LOSS EXPOSURE" value={`${fmtStrategic(friendlyLow)}–${fmtStrategic(friendlyHigh)}`} note={`${(friendlyLow/operation.committed*100).toFixed(1)}–${(friendlyHigh/operation.committed*100).toFixed(1)}% of deployed force`} details={branches.map(branch=>({label:branch.outcomeBand.replaceAll("-"," ").toUpperCase(),value:`${fmtStrategic(branch.friendlyLosses)} losses`}))}/>
      <InspectCell id="pressure" label="GROUND EFFECT ENVELOPE" value={`${groundLow>=0?"+":""}${groundLow.toFixed(2)} TO ${groundHigh>=0?"+":""}${groundHigh.toFixed(2)} KM`} note="four disclosed result bands" details={[...branches.map(branch=>({label:branch.outcomeBand.replaceAll("-"," ").toUpperCase(),value:`${branch.groundMovement>=0?"+":""}${branch.groundMovement.toFixed(2)} KM`})),{label:"BASE + TEMPO",value:`${operation.basePressure>=0?"+":""}${operation.basePressure.toFixed(2)}`},{label:"MANEUVER",value:`${operation.maneuverPressure>=0?"+":""}${operation.maneuverPressure.toFixed(2)}`},{label:"FORCE RATIO",value:`${operation.forceRatioPressure>=0?"+":""}${operation.forceRatioPressure.toFixed(2)}`},{label:"INTELLIGENCE",value:`${operation.intelligencePressure>=0?"+":""}${operation.intelligencePressure.toFixed(2)}`},{label:"SHORTAGES",value:operation.shortagePressure.toFixed(2)},{label:"CAMPAIGN CONDITION",value:`${director.event.label} // ${(director.modifiers.friendlyPressure-director.modifiers.enemyPressure)>=0?"+":""}${(director.modifiers.friendlyPressure-director.modifiers.enemyPressure).toFixed(2)}`} ]}/>
    </div>
    <footer>REPORT CONCLUSIONS ABOVE // MINUTIAE LIVE IN BUBBLETTES // FIELD MANUAL HOLDS THE COMPLETE RULE</footer>
  </section>;
}
