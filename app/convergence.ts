import {
  FAMILIES, MANEUVERS, commit, commitManeuver, directiveRejection, situationForState,
  type Choice, type Family, type GameState, type Maneuver,
} from "./game";
import {
  SUB_MISSION_SCHEMA_VERSION, auditSubMissionSchema,
  compileSubMissionDocket, subMissionArchetypeById, subMissionFrameById,
  type CompiledSubMissionRef, type SubMissionConvergenceEdge, type SubMissionDomain, type SubMissionPressureBand,
} from "./submission-schema";
export { FAMILIES, initialState, resolve, restoreCampaignState, situationForState } from "./game";
export {
  DOMESTIC_SUB_MISSIONS, NETWORK_SUB_MISSIONS, SUB_MISSION_CONTENT_VERSION,
  SUB_MISSION_FRAMES, SUB_MISSION_SCHEMA_VERSION, validateSubMissionRegistry,
} from "./submission-schema";

export type ConvergenceDomain=SubMissionDomain;
export type ConvergenceOption={id:string;domain:ConvergenceDomain;family:Family;choice:Choice};
export type ConvergencePrompt={
  id:string;archetypeId:string;frameId:string;realizationId:string;domain:ConvergenceDomain;category:string;
  title:string;brief:string;question:string;authority:string;aliases:string[];pressureBand:SubMissionPressureBand;
  options:ConvergenceOption[];matrixVersion:string;selectionScore:number;candidateCount:number;selectionBasis:string;
  evidence:string[];resolutionTicket:string;stateFingerprint:string;rotatesAfterDay:number;
  operationalAnchor:CompiledSubMissionRef["operationalAnchor"];convergence:SubMissionConvergenceEdge[];
};
export type ConvergencePacket={
  id:string;day:number;operational:ReturnType<typeof situationForState>;
  domestic:ConvergencePrompt;network:ConvergencePrompt;matrixVersion:string;
  activeDomains:ConvergenceDomain[];
};

export const CONVERGENCE_MATRIX_VERSION=SUB_MISSION_SCHEMA_VERSION;

export const convergenceDomainsForState=(state:GameState):ConvergenceDomain[]=>{
  let value=(Math.imul(state.campaignSeed|0,0x45d9f3b)^Math.imul(state.day,0x27d4eb2d))>>>0;
  value=Math.imul(value^(value>>>16),0x45d9f3b)>>>0;
  const rotation=value%4;
  if(rotation===0)return[];
  if(rotation===1)return["domestic","network"];
  return rotation===2?["domestic"]:["network"];
};

const resolveOptions=(domain:ConvergenceDomain,contentId:string,pairs:Array<{familyId:string;choiceId:string}>)=>pairs.map(({familyId,choiceId})=>{
  const family=FAMILIES.find(item=>item.id===familyId);const choice=family?.choices.find(item=>item.id===choiceId);
  return family&&choice?{id:`${contentId}:${familyId}:${choiceId}`,domain,family,choice}:null;
}).filter((item):item is ConvergenceOption=>!!item);

const compilePrompt=(domain:ConvergenceDomain,reference:CompiledSubMissionRef,day:number):ConvergencePrompt=>{
  const archetype=subMissionArchetypeById(reference.archetypeId),frame=subMissionFrameById(reference.frameId);
  if(!archetype||archetype.domain!==domain)throw new Error(`Missing ${domain} sub-mission archetype ${reference.archetypeId}`);
  if(!frame||frame.archetypeId!==archetype.id||frame.domain!==domain)throw new Error(`Missing ${domain} content frame ${reference.frameId}`);
  return{id:reference.contentId,archetypeId:archetype.id,frameId:frame.id,realizationId:reference.realizationId,domain,category:archetype.category,...reference.rendered,pressureBand:reference.pressureBand,options:resolveOptions(domain,reference.contentId,archetype.options),matrixVersion:SUB_MISSION_SCHEMA_VERSION,selectionScore:reference.selectionScore,candidateCount:reference.candidateCount,selectionBasis:reference.selectionBasis,evidence:[...reference.evidence],resolutionTicket:reference.resolutionTicket,stateFingerprint:reference.stateFingerprint,rotatesAfterDay:day,operationalAnchor:{...reference.operationalAnchor},convergence:reference.convergence.map(edge=>({...edge}))};
};

export const compileConvergence=(state:GameState):ConvergencePacket=>{
  const docket=state.currentSubMissions?.day===state.day&&state.currentSubMissions.version===SUB_MISSION_SCHEMA_VERSION?state.currentSubMissions:compileSubMissionDocket(state,state.subMissionHistory??[]);
  return{id:`${SUB_MISSION_SCHEMA_VERSION}:${state.campaignSeed}:${state.day}`,day:state.day,operational:situationForState(state),domestic:compilePrompt("domestic",docket.domestic,state.day),network:compilePrompt("network",docket.network,state.day),matrixVersion:SUB_MISSION_SCHEMA_VERSION,activeDomains:convergenceDomainsForState(state)};
};

export const convergenceFrontIssued=(state:GameState,domain:ConvergenceDomain)=>state.decisions.some(decision=>decision.day===state.day&&decision.domain===domain);

export const convergenceOptionCooldown=(state:GameState,option:ConvergenceOption)=>Math.max(0,(state.locks[option.family.id]??0)-state.day);

export const convergenceFrontStatus=(state:GameState,prompt:ConvergencePrompt)=>{
  if(convergenceFrontIssued(state,prompt.domain))return{cooling:true,days:1,reason:"ORDER ISSUED // REOPENS AFTER RESOLUTION"};
  const cooldowns=prompt.options.map(option=>convergenceOptionCooldown(state,option));
  const cooling=cooldowns.length>0&&cooldowns.every(days=>days>0);
  return cooling
    ? {cooling:true,days:Math.min(...cooldowns),reason:`ALL RESPONSES COOLING // NEXT READY IN ${Math.min(...cooldowns)}D`}
    : {cooling:false,days:0,reason:"RESPONSES AVAILABLE"};
};

export const convergenceOptionRejection=(state:GameState,option:ConvergenceOption)=>{
  if(!convergenceDomainsForState(state).includes(option.domain))return `${option.domain==="domestic"?"Domestic Front":"Command Network"} is not present in today's campaign docket.`;
  if(convergenceFrontIssued(state,option.domain))return `${option.domain==="domestic"?"Domestic Front":"Command Network"} already received today's response and reopens after resolution.`;
  return directiveRejection(state,option.family,option.choice);
};

export const convergenceOptionAvailable=(state:GameState,option:ConvergenceOption)=>!convergenceOptionRejection(state,option);

export const commitConvergence=(state:GameState,input:{maneuverId?:string;domesticId?:string;networkId?:string})=>{
  const packet=compileConvergence(state);let next=state;const issued:string[]=[];
  for(const [domain,id,prompt] of [["domestic",input.domesticId,packet.domestic],["network",input.networkId,packet.network]] as const){
    if(!id)continue;const option=prompt.options.find(item=>item.id===id);if(!option||!convergenceOptionAvailable(next,option))continue;
    const result=commit(next,option.family,option.choice);if(result!==next){next=result;const decision=next.decisions[0];if(decision){decision.domain=domain;decision.missionId=prompt.id;decision.resolutionTicket=prompt.resolutionTicket;}issued.push(option.choice.label)}
  }
  const maneuver: Maneuver|undefined=MANEUVERS.find(item=>item.id===input.maneuverId);
  if(maneuver){const result=commitManeuver(next,maneuver);if(result!==next){next=result;issued.push(maneuver.label)}}
  return{state:next,issued};
};

export const convergenceMatrixAudit=()=>{const audit=auditSubMissionSchema();return{domestic:audit.domestic,network:audit.network,version:audit.version,contentVersion:audit.contentVersion,optionRefs:audit.optionRefs.length,domesticFrames:audit.domesticFrames,networkFrames:audit.networkFrames,totalFrames:audit.totalFrames,realizationLayers:audit.realizationLayers,compiledVariants:audit.compiledVariants};};
