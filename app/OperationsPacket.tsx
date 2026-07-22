"use client";

import type { GameState, Maneuver } from "./game";
import { directorForState, explainManeuverChance, fmtStrategic, projectAdversary, projectOutcomeBands, situationForState } from "./game";
import { CONCEPTS } from "./concepts";
import { Bubblette, type BubbletteDetail } from "./Bubblette";

type Detail=BubbletteDetail;

function InspectCell({id,label,value,note,details,className=""}:{id:string;label:string;value:string;note:string;details:Detail[];className?:string}){
  const concept=CONCEPTS[id];
  return <Bubblette id={id} title={concept?.label??label} summary={concept?.definition??note} details={details} className={`operation-inspect ${className}`} panelClassName="operation-bubblette">
    <small>{label}</small><b>{value}</b><span>{note}</span>
  </Bubblette>;
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
  const chance=explainManeuverChance(s,m,director);
  const problemArticle=`situation-${situation.blueprintId.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}`;
  const packageLabels:Record<string,string>={reinforce:"Reserve Integration Package",interdict:"Counterbattery Package",route:"Route-Opening Package",abandon:"Disengagement Package",exploit:"Mobile Exploitation Package",breach:"Assault Passage Package",network:"Relay Restoration Package"};
  const modularized=operation.packageEfficiency<1;
  const commitmentDetails:Detail[]=modularized?[
    {label:"NOMINAL REQUIREMENT",value:fmtStrategic(operation.nominalCommitment),conceptId:"force-commitment"},
    {label:"TASK PACKAGE",value:packageLabels[m.id]??"Mission Package",conceptId:"force-commitment"},
    {label:"SOLDIERS EXPOSED",value:fmtStrategic(operation.committed),conceptId:"casualty-exposure"},
    {label:"PERSONNEL WITHHELD",value:fmtStrategic(Math.max(0,operation.nominalCommitment-operation.committed)),conceptId:"deployable-force",tone:"gain"},
  ]:[
    {label:"DEPLOYABLE FORCE",value:fmtStrategic(s.deployable),conceptId:"deployable-force"},
    {label:"DESERTION PATROLS",value:`−${fmtStrategic(operation.patrolCommitment)}`,conceptId:"desertion-pressure",tone:"loss"},
    {label:"OPERATIONALLY AVAILABLE",value:fmtStrategic(operation.operationallyAvailable),conceptId:"force-commitment"},
    {label:"MANEUVER COMMITMENT",value:fmtStrategic(operation.committed),conceptId:"force-commitment"},
  ];
  const factorData=[
    {id:"terrain-conversion",label:"TERRAIN",value:situation.terrain,factor:operation.terrainFactor,details:[{label:"SECTOR CONDITION",value:situation.terrain,conceptId:"terrain-conversion"},{label:"POWER CONVERSION",value:`× ${operation.terrainFactor.toFixed(2)}`,conceptId:"effective-committed-force"},{label:"CONTROL",value:"Maneuver selection and terrain-specialist Doctrine",conceptId:"execution-confidence"}]},
    {id:"ground-condition",label:"GROUND",value:situation.ground,factor:operation.groundFactor,details:[{label:"SURFACE STATE",value:situation.ground,conceptId:"ground-condition"},{label:"POWER CONVERSION",value:`× ${operation.groundFactor.toFixed(2)}`,conceptId:"effective-committed-force"},{label:"LOSS EXPOSURE",value:"Ground condition also modifies the casualty circuit",conceptId:"casualty-exposure"}]},
    {id:"command-network",label:"NETWORK",value:situation.network,factor:operation.networkFactor,details:[{label:"NETWORK STATE",value:situation.network,conceptId:"command-network"},{label:"POWER CONVERSION",value:`× ${operation.networkFactor.toFixed(2)}`,conceptId:"effective-committed-force"},{label:"ENEMY INTERFERENCE",value:`−${Math.round(adversary.networkInterference*100)} points`,conceptId:"enemy-countermeasure"},{label:"CONTROL",value:"Network posture, authentication, custody, and command Doctrine",conceptId:"command-network"}]},
    {id:"operational-supply",label:"SUPPLY",value:situation.supply,factor:operation.supplyFactor,details:[{label:"LOCAL CONDITION",value:situation.supply,conceptId:"operational-supply"},{label:"POWER CONVERSION",value:`× ${operation.supplyFactor.toFixed(2)}`,conceptId:"effective-committed-force"},{label:"TEMPO",value:s.tempo.toUpperCase(),conceptId:"operational-tempo"},{label:"CONTROL",value:"Operational tempo, external supply, and campaign condition",conceptId:"operational-supply"}]},
    {id:"intelligence",label:"INTELLIGENCE",value:`${s.intelligence.toFixed(0)} / 100`,factor:operation.intelligenceFactor,details:[{label:"AUTHORITATIVE SCORE",value:`${s.intelligence.toFixed(1)} / 100`,conceptId:"intelligence"},{label:"POWER CONVERSION",value:`× ${operation.intelligenceFactor.toFixed(2)}`,conceptId:"effective-committed-force"},{label:"CONFIDENCE CONTRIBUTION",value:`${chance.terms.find(term=>term.id==="intelligence")!.points>=0?"+":""}${chance.terms.find(term=>term.id==="intelligence")!.points.toFixed(1)} points`,conceptId:"intelligence"},{label:"ENEMY ORDERS CLASSIFIED",value:`${adversary.observedOrders.length} / 3`,conceptId:"enemy-orders"},{label:"CONTROL",value:"Statecraft, network operations, reconnaissance, and opportunities",conceptId:"intelligence"}]},
  ];
  return <section className="operations-packet">
    <header><div><small>CAMPAIGN ESTIMATE // ONE AUTHORITATIVE REPORT</small><b>{situation.sector.toUpperCase()} // {m.label.toUpperCase()}</b></div><span>SELECT ANY FIELD TO TRACE ITS CAUSE</span></header>
    <section className="operations-brief">
      <div><small>ACTIVE OPERATIONAL PROBLEM</small><h3>{situation.headline}</h3><p>{situation.briefing}</p></div>
      <Bubblette id={problemArticle} title="Campaign Synopsis" summary={situation.briefing} details={[{label:"DECISION",value:situation.question,conceptId:"campaign-synopsis"}]} control={{label:"Open Main Campaign",module:"campaign"}} className="operations-synopsis"><span>CAMPAIGN SYNOPSIS</span><b>{situation.problemClass.replaceAll("-"," ").toUpperCase()}</b><small>{situation.question}</small></Bubblette>
    </section>
    <div className="operations-factors">{factorData.map(factor=><InspectCell key={factor.id} id={factor.id} label={factor.label} value={factor.value} note={`CONVERSION ×${factor.factor.toFixed(2)}`} details={factor.details}/>)}</div>
    <InspectCell id="enemy-orders" label="OBSERVED ENEMY INTENT" value={adversary.observedOrders[0]??"NO CURRENT ORDER CLASSIFIED"} note={adversary.hiddenOrders?`${adversary.hiddenOrders} of 3 orders remain unclassified`:"All three orders classified"} details={[{label:"OPERATIONS",value:adversary.observedOrders.find(order=>order.startsWith("OPERATIONS"))??"UNCLASSIFIED"},{label:"PRODUCTION",value:adversary.observedOrders.find(order=>order.startsWith("PRODUCTION"))??"UNCLASSIFIED"},{label:"COUNTERMEASURE",value:adversary.observedOrders.find(order=>order.startsWith("COUNTERMEASURE"))??"UNCLASSIFIED"},{label:"CLASSIFICATION RULE",value:"Intelligence below 35 reveals 1 order; 35 to 64 reveals 2; 65 or higher reveals all 3"}]} className="observed-intent"/>
    <div className="operations-summary">
      <InspectCell id="force-commitment" label="FRIENDLY DEPLOYED" value={fmtStrategic(operation.committed)} note={modularized?`${fmtStrategic(operation.nominalCommitment)} nominal // ${fmtStrategic(operation.committed)} exposed`:`${(operation.commitmentShare*100).toFixed(1)}% of ${fmtStrategic(operation.operationallyAvailable)} operationally available`} details={commitmentDetails}/>
      <InspectCell id="effective-committed-force" label="FRIENDLY EFFECTIVE" value={fmtStrategic(operation.effectiveCommitted)} note={`${fmtStrategic(operation.combatEquivalent)} package-equivalent personnel × ${operation.friendlyConditionFactor.toFixed(2)} condition`} details={[{label:"SOLDIERS EXPOSED",value:fmtStrategic(operation.committed)},{label:"PACKAGE EQUIVALENT",value:fmtStrategic(operation.combatEquivalent)},{label:"CONDITION BLEND",value:`× ${operation.friendlyConditionFactor.toFixed(2)}`},{label:"FRONTAGE",value:`${Math.round(operation.frontageSaturation*100)}% of ${fmtStrategic(operation.frontageDemand)} useful capacity; congestion begins above 135%`}]}/>
      <InspectCell id="enemy-forward-deployment" label="ENEMY DEPLOYED" value={fmtStrategic(operation.enemyCommitted)} note={`${situation.sector} // ${fmtStrategic(operation.enemyCommittedLow)}–${fmtStrategic(operation.enemyCommittedHigh)}`} details={[{label:"LOCAL DEPLOYED ESTIMATE",value:fmtStrategic(operation.enemyCommitted)},{label:"LOCAL DEPLOYMENT BAND",value:`${fmtStrategic(operation.enemyCommittedLow)}–${fmtStrategic(operation.enemyCommittedHigh)}`},{label:"THEATER FORWARD DEPLOYED",value:fmtStrategic(adversary.deployedEstimate)},{label:"TOTAL ASSESSED FIELD FORCE",value:fmtStrategic(adversary.estimatedForce)},{label:"FORWARD COMMITMENT",value:`${Math.round(adversary.deploymentShare*100)}% under ${adversary.posture}`},{label:"LOCAL EFFECTIVE FORCE",value:fmtStrategic(operation.enemyPower)},{label:"LOCAL CONDITION BLEND",value:`× ${operation.enemyConditionFactor.toFixed(2)}`},{label:"REINFORCEMENT AT RESOLUTION",value:`+${fmtStrategic(adversary.reinforcement)} theater-wide`},{label:"ASSESSMENT BASIS",value:"Theater forward deployment × this sector's share of the enemy disposition"}]}/>
      <InspectCell id="force-ratio" label="EFFECTIVE FORCE RATIO" value={`${operation.forceRatio.toFixed(2)} : 1`} note={`${fmtStrategic(operation.friendlyPower)} friendly vs ${fmtStrategic(operation.enemyPower)} enemy effective`} details={[{label:"FRIENDLY DEPLOYED",value:fmtStrategic(operation.committed),conceptId:"force-commitment"},{label:"FRIENDLY EFFECTIVE",value:fmtStrategic(operation.friendlyPower),conceptId:"effective-committed-force"},{label:"ENEMY DEPLOYED",value:fmtStrategic(operation.enemyCommitted),conceptId:"enemy-forward-deployment"},{label:"ENEMY EFFECTIVE",value:fmtStrategic(operation.enemyPower),conceptId:"enemy-forward-deployment"},{label:"DISPLAYED RATIO",value:"friendly effective ÷ enemy effective",conceptId:"force-ratio"},{label:"RATIO USED FOR LOSS PRESSURE",value:`${operation.boundedForceRatio.toFixed(2)} : 1`,conceptId:"force-ratio"},{label:"PRESSURE CONTRIBUTION",value:`${operation.forceRatioPressure>=0?"+":""}${operation.forceRatioPressure.toFixed(2)}`,conceptId:"pressure"}]}/>
    </div>
    <div className="operations-conclusions">
      <InspectCell id="execution-confidence" label="EXECUTION CONFIDENCE" value={`${Math.round(operation.executionConfidence*100)}%`} note="sealed roll selects the result band" details={[...chance.terms.map(term=>({label:term.label.toUpperCase(),value:`${term.points>=0?"+":""}${term.points.toFixed(1)} points`,conceptId:term.conceptId,tone:term.points>0?"gain" as const:term.points<0?"loss" as const:"neutral" as const})),{label:"UNCLAMPED TOTAL",value:`${(chance.unclamped*100).toFixed(1)}%`,conceptId:"execution-confidence"},{label:"FINAL 5–95% CLAMP",value:`${Math.round(chance.result*100)}%`,conceptId:"execution-confidence"}]}/>
      <InspectCell id="casualty-exposure" label="FRIENDLY LOSS EXPOSURE" value={`${fmtStrategic(friendlyLow)}–${fmtStrategic(friendlyHigh)}`} note={`${(friendlyLow/operation.committed*100).toFixed(1)}–${(friendlyHigh/operation.committed*100).toFixed(1)}% of deployed force`} details={branches.map(branch=>({label:branch.outcomeBand.replaceAll("-"," ").toUpperCase(),value:`${fmtStrategic(branch.friendlyLosses)} losses`}))}/>
      <InspectCell id="pressure" label="GROUND EFFECT ENVELOPE" value={`${groundLow>=0?"+":""}${groundLow.toFixed(2)} TO ${groundHigh>=0?"+":""}${groundHigh.toFixed(2)} KM`} note="four disclosed result bands" details={[...branches.map(branch=>({label:branch.outcomeBand.replaceAll("-"," ").toUpperCase(),value:`${branch.groundMovement>=0?"+":""}${branch.groundMovement.toFixed(2)} KM`})),{label:"BASE + TEMPO",value:`${operation.basePressure>=0?"+":""}${operation.basePressure.toFixed(2)}`},{label:"MANEUVER",value:`${operation.maneuverPressure>=0?"+":""}${operation.maneuverPressure.toFixed(2)}`},{label:"FORCE RATIO",value:`${operation.forceRatioPressure>=0?"+":""}${operation.forceRatioPressure.toFixed(2)}`},{label:"INTELLIGENCE",value:`${operation.intelligencePressure>=0?"+":""}${operation.intelligencePressure.toFixed(2)}`},{label:"SHORTAGES",value:operation.shortagePressure.toFixed(2)},{label:"CAMPAIGN CONDITION",value:`${director.event.label} // ${(director.modifiers.friendlyPressure-director.modifiers.enemyPressure)>=0?"+":""}${(director.modifiers.friendlyPressure-director.modifiers.enemyPressure).toFixed(2)}`} ]}/>
    </div>
    <footer>PIN A FIELD FOR ITS CURRENT VALUE, IMMEDIATE CONSEQUENCE, AND CONTROL</footer>
  </section>;
}
