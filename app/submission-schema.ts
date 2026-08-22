import {
  SUB_MISSION_FRAMES, auditSubMissionContent, framesForArchetype, realizationsForArchetype, subMissionFrameById,
  type SubMissionFrame,
} from "./sub-mission-content";
import { hashInt, stableHash } from "./substrate/substrate-core";

export type SubMissionDomain = "domestic" | "network";
export type SubMissionPressureBand = "watch" | "active" | "cascade";

export type SubMissionStateView = {
  campaignSeed:number;day:number;queue:number;training:number;quality:number;desertionPressure:number;
  legitimacy:number;resistance:number;treasury:number;materiel:number;readiness:number;equipment:number;
  intelligence:number;dependency:number;forced:number;workforce:number;maintenanceDebt:number;
  networkPosture:string;front:number;theater?:string;
  production:Record<string,{stock:number;use:number}>;
  currentSituation?:{sector:string;problemClass:string;blueprintId:string;headline:string}|null;
};

export type SubMissionOptionRef = {familyId:string;choiceId:string};
export type SubMissionConvergenceEdge = {
  source:string;via:string;target:string;summary:string;
};
export type SubMissionArchetype = {
  id:string;domain:SubMissionDomain;category:string;label:string;definition:string;
  options:SubMissionOptionRef[];base:number;operationalFit:string[];
  pressure:(state:SubMissionStateView)=>number;
  evidence:(state:SubMissionStateView)=>string[];
  convergence:SubMissionConvergenceEdge[];
};

export type RenderedSubMissionContent = Pick<SubMissionFrame,"title"|"authority"|"aliases"> & {brief:string;question:string};
export type CompiledSubMissionRef = {
  archetypeId:string;frameId:string;realizationId:string;contentId:string;domain:SubMissionDomain;category:string;
  pressureBand:SubMissionPressureBand;selectionScore:number;candidateCount:number;
  selectionBasis:string;evidence:string[];resolutionTicket:string;stateFingerprint:string;
  rendered:RenderedSubMissionContent;operationalAnchor:{sector:string;problemClass:string;headline:string};
  convergence:SubMissionConvergenceEdge[];
};

export type DailySubMissionDocket = {
  version:string;contentVersion:string;day:number;domestic:CompiledSubMissionRef;network:CompiledSubMissionRef;
};

export type SubMissionHistoryRecord = {
  day:number;domain:SubMissionDomain;archetypeId:string;frameId:string;realizationId:string;contentId:string;category:string;
  pressureBand:SubMissionPressureBand;resolutionTicket:string;
  optionId:string|null;familyId:string|null;choiceId:string|null;outcome:"issued"|"lapsed";
};

export const SUB_MISSION_SCHEMA_VERSION="sub-missions-v3";
export const SUB_MISSION_CONTENT_VERSION="sub-mission-content-v1";

const coverage=(state:SubMissionStateView,resource:string)=>{
  const line=state.production[resource];return line?line.stock/Math.max(1,line.use):0;
};
const shortageCount=(state:SubMissionStateView)=>Object.values(state.production).filter(line=>line.stock<line.use*2).length;
const option=(familyId:string,choiceId:string):SubMissionOptionRef=>({familyId,choiceId});
const edge=(source:string,via:string,target:string,summary:string):SubMissionConvergenceEdge=>({source,via,target,summary});

export const DOMESTIC_SUB_MISSIONS:SubMissionArchetype[]=[
  {id:"induction-overhang",domain:"domestic",category:"INDUCTION",label:"Induction Overhang",definition:"Unconverted manpower competes with training capacity, transport, and civilian continuity.",options:[option("training-capacity","camps"),option("training-capacity","schools"),option("training-standard","full")],base:4,operationalFit:["force-preservation","assault","counterstroke"],pressure:s=>s.queue/Math.max(1,s.training)*7,evidence:s=>[`${Math.round(s.queue).toLocaleString()} awaiting induction`,`${(s.queue/Math.max(1,s.training)).toFixed(1)} capacity-days of backlog`],convergence:[edge("training.queue","forceGeneration.effectiveGraduates","operations.friendlyEffectiveForce","Today's capacity decision changes the replacement stream available to {sector}.")]},
  {id:"replacement-standard",domain:"domestic",category:"REPLACEMENTS",label:"Replacement Standard",definition:"Graduation speed, specialist depth, and full preparation trade present mass for future capability.",options:[option("training-standard","compressed"),option("training-standard","specialist"),option("training-standard","full")],base:4,operationalFit:["force-preservation","assault","crossing"],pressure:s=>Math.max(0,78-s.quality)*.35+Math.max(0,65-s.readiness)*.22,evidence:s=>[`Training quality ${s.quality.toFixed(0)}%`,`Readiness ${s.readiness.toFixed(0)}%`],convergence:[edge("training.quality","forceGeneration.deployableAssigned","operations.conditionConversion","Replacement standards alter how new personnel convert into effective force at {sector}.")]},
  {id:"personnel-flight",domain:"domestic",category:"PERSONNEL SUSTAINMENT",label:"Personnel Flight",definition:"Return, interception, and household support retain personnel by spending different forms of authority.",options:[option("desertion","amnesty"),option("desertion","patrols"),option("desertion","rations")],base:3,operationalFit:["force-preservation","logistics","counterstroke"],pressure:s=>s.desertionPressure*.28+Math.max(0,55-s.legitimacy)*.18,evidence:s=>[`Desertion pressure ${s.desertionPressure.toFixed(0)} / 100`,`Legitimacy ${s.legitimacy.toFixed(0)}%`],convergence:[edge("personnel.desertionPressure","forceGeneration.netFlight","operations.deployablePersonnel","Retention policy changes the personnel that can remain assigned around {sector}.")]},
  {id:"casualty-account",domain:"domestic",category:"CASUALTY POLITICS",label:"Casualty Account",definition:"Public truth, ritual, and classification distribute the political burden of battlefield loss.",options:[option("casualty-politics","publish-rolls"),option("casualty-politics","public-mourning"),option("casualty-politics","sealed-ledger")],base:4,operationalFit:["force-preservation","counterstroke","assault"],pressure:s=>Math.max(0,62-s.legitimacy)*.22+s.resistance*.08,evidence:s=>[`Legitimacy ${s.legitimacy.toFixed(0)}%`,`Resistance ${s.resistance.toFixed(0)}%`],convergence:[edge("operations.friendlyLosses","domestic.casualtyBurden","domestic.legitimacy","How losses at {sector} enter public knowledge changes the state's tolerance for the next operation.")]},
  {id:"civil-allocation",domain:"domestic",category:"CIVIL ALLOCATION",label:"Civil Allocation",definition:"Civilian supply can preserve consent, industrial output, or local administrative reach.",options:[option("home-front","ration-equally"),option("home-front","priority-industry"),option("home-front","local-councils")],base:4,operationalFit:["logistics","crossing","assault"],pressure:s=>s.resistance*.16+shortageCount(s)*2.5,evidence:s=>[`Resistance ${s.resistance.toFixed(0)}%`,`${shortageCount(s)} production lines below two days`],convergence:[edge("domestic.civilAllocation","production.convertedOutput","operations.supplyConversion","Civil allocation competes with the production and transport supporting {sector}.")]},
  {id:"fiscal-mobilization",domain:"domestic",category:"WAR FINANCE",label:"Fiscal Mobilization",definition:"Debt, taxation, and requisition move the war burden through time and class.",options:[option("finance","bonds"),option("finance","profit-tax"),option("finance","seize")],base:3,operationalFit:["logistics","assault","crossing"],pressure:s=>Math.max(0,140-s.treasury)*.055,evidence:s=>[`Treasury ${s.treasury.toFixed(1)} B`,`Armed institutions remain on daily appropriation`],convergence:[edge("domestic.treasury","production.capacity","operations.supplyAvailability","War finance preserves or constrains the material flow sustaining {sector}.")]},
  {id:"industrial-labor",domain:"domestic",category:"INDUSTRIAL LABOR",label:"Industrial Labor",definition:"Overtime, dispersion, and maintenance exchange immediate output for survivability and future capacity.",options:[option("industry","overtime"),option("industry","disperse"),option("industry","maintenance")],base:4,operationalFit:["logistics","assault","crossing"],pressure:s=>Math.max(0,76-s.materiel)*.2+s.maintenanceDebt*.08,evidence:s=>[`Materiel condition ${s.materiel.toFixed(0)}%`,`Maintenance debt ${s.maintenanceDebt.toFixed(0)} / 100`],convergence:[edge("production.maintenanceDebt","production.convertedOutput","operations.equipmentConversion","Industrial labor policy changes equipment and supply conversion at {sector}.")]},
  {id:"service-bargain",domain:"domestic",category:"SERVICE OBLIGATION",label:"Service Bargain",definition:"Volunteerism, selective compulsion, and universal service distribute force and resistance differently.",options:[option("service","volunteer"),option("service","selective"),option("service","universal")],base:3,operationalFit:["force-preservation","assault","counterstroke"],pressure:s=>s.forced/4000+s.resistance*.1,evidence:s=>[`${Math.round(s.forced).toLocaleString()} forced entrants per day`,`Resistance ${s.resistance.toFixed(0)}%`],convergence:[edge("domestic.servicePolicy","forceGeneration.intake","operations.futureDeployable","The service bargain determines the future replacement depth behind {sector}.")]},
  {id:"ration-fracture",domain:"domestic",category:"HOUSEHOLD SUPPLY",label:"Ration Fracture",definition:"Household scarcity can preserve equality, war production, or coercive order.",options:[option("home-front","ration-equally"),option("home-front","priority-industry"),option("home-front","curfew")],base:3,operationalFit:["logistics","force-preservation","crossing"],pressure:s=>shortageCount(s)*3+Math.max(0,50-s.legitimacy)*.16,evidence:s=>[`${shortageCount(s)} critical supply lines`,`Legitimacy ${s.legitimacy.toFixed(0)}%`],convergence:[edge("domestic.rationPolicy","domestic.tolerance","forceGeneration.netFlight","Household supply affects whether formations assigned to {sector} remain formations.")]},
  {id:"factory-junction",domain:"domestic",category:"INDUSTRIAL PRIORITY",label:"Factory Junction",definition:"One constrained transport interval must privilege a single arm of production.",options:[option("production","guns"),option("production","steel"),option("production","eyes")],base:3,operationalFit:["logistics","assault","observation"],pressure:s=>Math.max(0,5-coverage(s,"munitions"))*.75+Math.max(0,70-s.equipment)*.08,evidence:s=>[`Munitions coverage ${coverage(s,"munitions").toFixed(1)} days`,`Equipment coverage ${s.equipment.toFixed(0)}%`],convergence:[edge("production.allocation","production.resourceStock","operations.maneuverCost","The marginal industrial train determines which operations remain supportable at {sector}.")]},
  {id:"household-arrears",domain:"domestic",category:"MILITARY HOUSEHOLDS",label:"Household Arrears",definition:"Pay, household stipends, and survivor priority purchase service with different future liabilities.",options:[option("price","base-pay"),option("price","stipends"),option("price","survivors")],base:3,operationalFit:["force-preservation","counterstroke","assault"],pressure:s=>Math.max(0,60-s.legitimacy)*.15+s.desertionPressure*.12,evidence:s=>[`Legitimacy ${s.legitimacy.toFixed(0)}%`,`Desertion pressure ${s.desertionPressure.toFixed(0)} / 100`],convergence:[edge("domestic.serviceCompensation","personnel.retention","operations.deployablePersonnel","Household compensation changes retention in the formations supporting {sector}.")]},
  {id:"continuity-threshold",domain:"domestic",category:"STATE CONTINUITY",label:"Continuity Threshold",definition:"Truth, delegation, and coercive quiet preserve different parts of a state near discontinuity.",options:[option("casualty-politics","publish-rolls"),option("home-front","local-councils"),option("home-front","curfew")],base:2,operationalFit:["force-preservation","counterstroke","command"],pressure:s=>Math.max(0,55-s.legitimacy)*.26+Math.max(0,s.resistance-25)*.2,evidence:s=>[`Legitimacy ${s.legitimacy.toFixed(0)}%`,`Resistance ${s.resistance.toFixed(0)}%`],convergence:[edge("domestic.continuity","domestic.collapseRisk","campaign.terminalState","State continuity determines whether command at {sector} remains politically executable.")]},
];

export const NETWORK_SUB_MISSIONS:SubMissionArchetype[]=[
  {id:"relay-compromise",domain:"network",category:"RELAY TOPOLOGY",label:"Relay Compromise",definition:"Tempo, secrecy, and redundancy spend different parts of a compromised signal path.",options:[option("network-posture","broadcast"),option("network-posture","dark"),option("network-posture","distributed")],base:4,operationalFit:["command","observation","counterstroke"],pressure:s=>Math.max(0,58-s.intelligence)*.16,evidence:s=>[`Intelligence ${s.intelligence.toFixed(0)} / 100`,`Current posture ${s.networkPosture}`],convergence:[edge("network.posture","operations.networkConversion","operations.friendlyEffectiveForce","Relay posture changes how completely assigned force at {sector} can receive and execute command.")]},
  {id:"authentication-drift",domain:"network",category:"AUTHENTICATION",label:"Authentication Drift",definition:"More proof protects the network while consuming the interval in which an order remains useful.",options:[option("network-authentication","triple-challenge"),option("network-authentication","delegated-keys"),option("network-authentication","rolling-codes")],base:4,operationalFit:["command","counterstroke","assault"],pressure:s=>Math.max(0,65-s.readiness)*.12+Math.max(0,55-s.intelligence)*.12,evidence:s=>[`Readiness ${s.readiness.toFixed(0)}%`,`Intelligence ${s.intelligence.toFixed(0)} / 100`],convergence:[edge("network.authentication","operations.orderLatency","operations.executionConfidence","Authentication policy changes whether the order for {sector} arrives while it is still relevant.")]},
  {id:"courier-loss",domain:"network",category:"PHYSICAL CONTINUITY",label:"Courier Loss",definition:"Physical custody trades secrecy, delay, and local survivability when relays fail.",options:[option("network-custody","central-archive"),option("network-custody","field-custody"),option("network-custody","burn-after-use")],base:4,operationalFit:["command","crossing","logistics"],pressure:s=>s.networkPosture==="dark"?5:1,evidence:s=>[`Current posture ${s.networkPosture}`,`Equipment coverage ${s.equipment.toFixed(0)}%`],convergence:[edge("network.physicalCustody","operations.orderContinuity","operations.maneuverAvailability","Courier custody determines which instructions can survive the route to {sector}.")]},
  {id:"spectrum-saturation",domain:"network",category:"TRANSMISSION SECURITY",label:"Spectrum Saturation",definition:"Bandwidth remains available while every transmission contributes to an enemy pattern.",options:[option("network-posture","broadcast"),option("network-authentication","rolling-codes"),option("network-posture","distributed")],base:3,operationalFit:["command","observation","assault"],pressure:s=>Math.max(0,62-s.intelligence)*.15,evidence:s=>[`Intelligence ${s.intelligence.toFixed(0)} / 100`,`Network posture ${s.networkPosture}`],convergence:[edge("network.spectrum","adversary.classification","operations.enemyPressure","Transmission policy changes how quickly the enemy can classify command around {sector}.")]},
  {id:"false-order",domain:"network",category:"COMMAND PROVENANCE",label:"False Order",definition:"Correct syntax, valid seals, and operational reality no longer identify the same authority.",options:[option("network-authentication","triple-challenge"),option("network-custody","central-archive"),option("network-authentication","delegated-keys")],base:4,operationalFit:["command","counterstroke","exploitation"],pressure:s=>Math.max(0,60-s.intelligence)*.18,evidence:s=>[`Intelligence ${s.intelligence.toFixed(0)} / 100`,`Dependency ${s.dependency.toFixed(0)} / 100`],convergence:[edge("network.provenance","operations.orderValidity","operations.executionConfidence","Provenance policy controls which orders the formations at {sector} are permitted to believe.")]},
  {id:"archive-latency",domain:"network",category:"ARCHIVE CUSTODY",label:"Archive Latency",definition:"The complete record and the executable order diverge as distribution falls behind change.",options:[option("network-custody","central-archive"),option("network-custody","field-custody"),option("network-custody","burn-after-use")],base:3,operationalFit:["command","logistics","crossing"],pressure:s=>s.day*.15+Math.max(0,70-s.readiness)*.08,evidence:s=>[`Campaign Day ${s.day}`,`Readiness ${s.readiness.toFixed(0)}%`],convergence:[edge("network.archiveCustody","operations.orderVersion","operations.executionConfidence","Archive custody determines which version of the plan reaches {sector}.")]},
  {id:"relay-custody",domain:"network",category:"RELAY CUSTODY",label:"Relay Custody",definition:"Hardware, keys, and technicians belong to incompatible chains of command.",options:[option("network-custody","field-custody"),option("network-authentication","rolling-codes"),option("network-custody","central-archive")],base:3,operationalFit:["command","observation","logistics"],pressure:s=>Math.max(0,75-s.equipment)*.12+s.dependency*.06,evidence:s=>[`Equipment coverage ${s.equipment.toFixed(0)}%`,`Dependency ${s.dependency.toFixed(0)} / 100`],convergence:[edge("network.relayCustody","operations.networkAvailability","operations.conditionConversion","Relay custody controls the command-network term converting personnel into power at {sector}.")]},
  {id:"emitter-pattern",domain:"network",category:"EMITTER INTELLIGENCE",label:"Emitter Pattern",definition:"Collection breadth, source custody, and political dependence compete inside the same estimate.",options:[option("foreign-intelligence","fused-exchange"),option("foreign-intelligence","compartmented"),option("foreign-intelligence","unilateral-collection")],base:3,operationalFit:["observation","counterstroke","exploitation"],pressure:s=>Math.max(0,68-s.intelligence)*.2,evidence:s=>[`Intelligence ${s.intelligence.toFixed(0)} / 100`,`Foreign dependency ${s.dependency.toFixed(0)} / 100`],convergence:[edge("intelligence.emitterCollection","adversary.classification","operations.executionConfidence","Emitter classification narrows the enemy estimate governing operations at {sector}.")]},
  {id:"coalition-provenance",domain:"network",category:"COALITION PROVENANCE",label:"Coalition Provenance",definition:"Shared intelligence becomes clearer while the sources that justify it become less visible.",options:[option("foreign-intelligence","fused-exchange"),option("foreign-intelligence","compartmented"),option("network-authentication","triple-challenge")],base:3,operationalFit:["observation","command","counterstroke"],pressure:s=>s.dependency*.15+Math.max(0,55-s.intelligence)*.1,evidence:s=>[`Dependency ${s.dependency.toFixed(0)} / 100`,`Intelligence ${s.intelligence.toFixed(0)} / 100`],convergence:[edge("intelligence.coalitionFeed","operations.enemyEstimate","operations.forceRatio","Coalition provenance changes the confidence interval around enemy power at {sector}.")]},
  {id:"autonomous-cells",domain:"network",category:"LOCAL AUTHORITY",label:"Autonomous Cells",definition:"Local authority restores tempo while weakening central coherence and attribution.",options:[option("network-authentication","delegated-keys"),option("network-custody","central-archive"),option("network-custody","burn-after-use")],base:3,operationalFit:["command","counterstroke","exploitation"],pressure:s=>Math.max(0,65-s.readiness)*.15+(s.networkPosture==="distributed"?2:0),evidence:s=>[`Readiness ${s.readiness.toFixed(0)}%`,`Current posture ${s.networkPosture}`],convergence:[edge("network.localAuthority","operations.orderLatency","operations.maneuverExecution","Local authority determines whether separated cells can act at {sector} before permission arrives.")]},
  {id:"restoration-corridor",domain:"network",category:"RESTORATION ROUTE",label:"Restoration Corridor",definition:"Command restoration consumes the same transport capacity as the material its orders intend to spend.",options:[option("network-posture","distributed"),option("supply","transit"),option("network-posture","dark")],base:3,operationalFit:["logistics","command","crossing"],pressure:s=>Math.max(0,4-coverage(s,"munitions"))*.8+Math.max(0,65-s.equipment)*.1,evidence:s=>[`Munitions coverage ${coverage(s,"munitions").toFixed(1)} days`,`Equipment coverage ${s.equipment.toFixed(0)}%`],convergence:[edge("network.restorationRoute","operations.supplyAccess","operations.networkConversion","The route to {sector} can restore command or carry the material command intends to use.")]},
  {id:"key-compromise",domain:"network",category:"KEY COMPROMISE",label:"Key Compromise",definition:"Proven compromise forces command to buy authentication with speed, memory, or dependence.",options:[option("network-authentication","rolling-codes"),option("network-custody","burn-after-use"),option("foreign-intelligence","compartmented")],base:4,operationalFit:["command","observation","counterstroke"],pressure:s=>Math.max(0,60-s.intelligence)*.16+s.day*.08,evidence:s=>[`Intelligence ${s.intelligence.toFixed(0)} / 100`,`Campaign Day ${s.day}`],convergence:[edge("network.keyIntegrity","operations.orderValidity","operations.executionConfidence","Key integrity controls the confidence contribution of networked orders at {sector}.")]},
];

export const SUB_MISSION_ARCHETYPES=[...DOMESTIC_SUB_MISSIONS,...NETWORK_SUB_MISSIONS];

const stableHashInt=hashInt;
const pressureBand=(pressure:number):SubMissionPressureBand=>pressure>=7?"cascade":pressure>=3.5?"active":"watch";
const bindSector=(summary:string,sector:string)=>summary.replaceAll("{sector}",sector);

const chooseContent=(state:SubMissionStateView,archetype:SubMissionArchetype,history:SubMissionHistoryRecord[])=>{
  const frames=framesForArchetype(archetype.id),realizations=realizationsForArchetype(archetype.id);if(!frames.length)throw new Error(`No content frames registered for ${archetype.id}`);if(!realizations.length)throw new Error(`No realization layers registered for ${archetype.id}`);
  const used=history.filter(record=>record.domain===archetype.domain&&record.archetypeId===archetype.id);
  const start=stableHashInt(`${state.campaignSeed}:${archetype.domain}:${archetype.id}:${SUB_MISSION_CONTENT_VERSION}`)%frames.length;
  const cycle=used.length,realization=realizations[Math.floor(cycle/frames.length)%realizations.length];
  const order=frames.map((_,offset)=>frames[(start+cycle+offset)%frames.length]);
  const recent=new Set(used.filter(record=>state.day-record.day<=12).map(record=>record.frameId));
  return{frame:order.find(frame=>!recent.has(frame.id))??order[0],realization};
};

const compileDomain=(state:SubMissionStateView,domain:SubMissionDomain,archetypes:SubMissionArchetype[],history:SubMissionHistoryRecord[]):CompiledSubMissionRef=>{
  const recent=history.filter(record=>record.domain===domain&&state.day-record.day<=3);
  const rotationStart=Math.floor(stableHash(`${state.campaignSeed}:${domain}:rotation`)*archetypes.length);
  const rotationIndex=(rotationStart+state.day-1)%archetypes.length;
  const problemClass=state.currentSituation?.problemClass??"unclassified";
  const ranked=archetypes.map((archetype,index)=>{
    const sameTemplate=recent.find(record=>record.archetypeId===archetype.id);
    const sameCategory=recent.find(record=>record.category===archetype.category);
    const novelty=sameTemplate?-8:sameCategory?-3:2;
    const pressure=Math.max(0,Math.min(10,archetype.pressure(state)));
    const convergence=archetype.operationalFit.includes(problemClass)?6:0;
    const rotationDistance=(index-rotationIndex+archetypes.length)%archetypes.length;
    const rotation=rotationDistance===0?8:rotationDistance===1?3:0;
    const seeded=stableHash(`${state.campaignSeed}:${state.day}:${domain}:${archetype.id}`)*2;
    return{archetype,score:archetype.base+pressure+novelty+convergence+rotation+seeded,pressure,novelty,convergence,rotation,seeded};
  }).sort((a,b)=>b.score-a.score||a.archetype.id.localeCompare(b.archetype.id));
  const previous=recent.find(record=>record.day===state.day-1)?.archetypeId;
  const chosen=ranked.find(candidate=>candidate.archetype.id!==previous)??ranked[0];
  const{frame,realization}=chooseContent(state,chosen.archetype,history);const band=pressureBand(chosen.pressure);
  const anchor={sector:state.currentSituation?.sector??"the active sector",problemClass,headline:state.currentSituation?.headline??"The operational problem remains unclassified."};
  const fingerprint=stableHashInt(`${state.day}:${state.queue}:${state.readiness}:${state.legitimacy}:${state.intelligence}:${state.front}:${anchor.sector}:${anchor.problemClass}`).toString(16).padStart(8,"0");
  const contentId=`${domain}.${chosen.archetype.id}.${frame.id}.${realization.id}`;
  const ticket=`${SUB_MISSION_SCHEMA_VERSION}:${domain}:${state.day}:${stableHashInt(`${state.campaignSeed}:${state.day}:${contentId}:${band}:${fingerprint}`).toString(16).padStart(8,"0")}`;
  return{archetypeId:chosen.archetype.id,frameId:frame.id,realizationId:realization.id,contentId,domain,category:chosen.archetype.category,pressureBand:band,selectionScore:chosen.score,candidateCount:ranked.length,selectionBasis:`pressure ${chosen.pressure.toFixed(2)} + novelty ${chosen.novelty.toFixed(2)} + operational convergence ${chosen.convergence.toFixed(2)} + deterministic rotation ${chosen.rotation.toFixed(2)} + seeded tie ${chosen.seeded.toFixed(2)}`,evidence:chosen.archetype.evidence(state),resolutionTicket:ticket,stateFingerprint:fingerprint,rendered:{title:frame.title,brief:`${frame.brief} ${realization.coda}`,question:`${frame.question} ${realization.questionCoda}`,authority:frame.authority,aliases:[...frame.aliases]},operationalAnchor:anchor,convergence:chosen.archetype.convergence.map(item=>({...item,summary:bindSector(item.summary,anchor.sector)}) )};
};

export const compileSubMissionDocket=(state:SubMissionStateView,history:SubMissionHistoryRecord[]=[]):DailySubMissionDocket=>({
  version:SUB_MISSION_SCHEMA_VERSION,contentVersion:SUB_MISSION_CONTENT_VERSION,day:state.day,
  domestic:compileDomain(state,"domestic",DOMESTIC_SUB_MISSIONS,history),
  network:compileDomain(state,"network",NETWORK_SUB_MISSIONS,history),
});

export const subMissionArchetypeById=(id:string)=>SUB_MISSION_ARCHETYPES.find(archetype=>archetype.id===id);
export const subMissionSpineById=subMissionArchetypeById;
export { SUB_MISSION_FRAMES, subMissionFrameById };

export const auditSubMissionSchema=()=>{
  const content=auditSubMissionContent();
  const optionRefs=SUB_MISSION_ARCHETYPES.flatMap(archetype=>archetype.options);
  return{domestic:DOMESTIC_SUB_MISSIONS.length,network:NETWORK_SUB_MISSIONS.length,version:SUB_MISSION_SCHEMA_VERSION,contentVersion:SUB_MISSION_CONTENT_VERSION,optionRefs,domesticFrames:content.domesticFrames,networkFrames:content.networkFrames,totalFrames:content.totalFrames,realizationLayers:content.realizationLayers,compiledVariants:content.compiledVariants};
};

export const validateSubMissionRegistry=()=>{
  const issues:string[]=[];const archetypeIds=new Set(SUB_MISSION_ARCHETYPES.map(item=>item.id));const frameIds=new Set<string>();
  for(const archetype of SUB_MISSION_ARCHETYPES){const frames=framesForArchetype(archetype.id),realizations=realizationsForArchetype(archetype.id);if(frames.length<3)issues.push(`${archetype.id} has fewer than three content frames.`);if(realizations.length!==3)issues.push(`${archetype.id} does not have three temporal realization layers.`);if(archetype.options.length!==3)issues.push(`${archetype.id} does not expose exactly three response refs.`);if(!archetype.convergence.length)issues.push(`${archetype.id} has no convergence edge.`);}
  for(const frame of SUB_MISSION_FRAMES){if(frameIds.has(frame.id))issues.push(`Duplicate frame id ${frame.id}.`);frameIds.add(frame.id);if(!archetypeIds.has(frame.archetypeId))issues.push(`${frame.id} references unknown archetype ${frame.archetypeId}.`);if(!frame.title||!frame.brief||!frame.question||!frame.authority)issues.push(`${frame.id} has incomplete authored content.`);}
  return issues;
};
