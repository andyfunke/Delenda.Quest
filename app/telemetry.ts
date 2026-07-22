import type { AvaCompileResult } from "./ava/schema";
import { DOCTRINES, FAMILIES, MANEUVERS, initialState, type GameState, type Module } from "./game";

type ClientCounter={type:"counter";category:"page_view"|"element_interaction"|"ava_command";subject:string;context?:string;count?:number};
type ClientOutcome={type:"campaign_outcome";campaignId:string;outcome:"victory"|"defeat";days:number;theater:string;archetype:string;adversary:string;decisions:Record<string,number>};
type ClientEvent=ClientCounter|ClientOutcome;

const queue:ClientEvent[]=[];
let timer:number|undefined;

const flush=()=>{
  if(typeof window==="undefined"||!queue.length)return;
  const events=queue.splice(0,50);const body=JSON.stringify({events});
  if(document.visibilityState==="hidden"&&navigator.sendBeacon){navigator.sendBeacon("/api/telemetry",new Blob([body],{type:"application/json"}));return;}
  void fetch("/api/telemetry",{method:"POST",headers:{"Content-Type":"application/json"},body,keepalive:true,credentials:"omit"}).catch(()=>undefined);
};

const enqueue=(event:ClientEvent)=>{
  if(typeof window==="undefined")return;
  queue.push(event);if(timer!==undefined)return;
  timer=window.setTimeout(()=>{timer=undefined;flush()},900);
};

export const recordPageView=(subject:string,context="site")=>enqueue({type:"counter",category:"page_view",subject,context});
export const recordElementInteraction=(subject:string,context:string)=>enqueue({type:"counter",category:"element_interaction",subject,context});

export const recordAvaTelemetry=(result:AvaCompileResult,module:Module,outcome:"executed"|"clarification"|"rejected")=>{
  const intent=result.status==="compiled"?result.instruction.kind:"uncompiled";
  const failure=result.status==="clarify"?result.failure:"none";
  const shape=`${intent}:${outcome}:${failure}:${result.trace.rule}:t${Math.min(20,result.trace.tokenCount)}:u${Math.min(20,result.trace.unresolvedTokenCount)}`;
  enqueue({type:"counter",category:"ava_command",subject:shape,context:module});
};

const countBy=(values:string[])=>values.reduce<Record<string,number>>((counts,value)=>{counts[value]=(counts[value]??0)+1;return counts},{});
export const recordCampaignOutcome=(state:GameState)=>{
  if(state.status==="active")return;
  const decisions=[
    ...state.decisions.map(item=>`order:${item.family}:${item.choice}`),
    ...state.opportunityHistory.map(item=>`opportunity:${item.opportunityId}:${item.responseId}:${item.outcome}`),
    ...state.unlocked.map(item=>`doctrine:${item}`),
  ];
  enqueue({type:"campaign_outcome",campaignId:state.campaignId,outcome:state.status,days:state.day,theater:state.theater,archetype:state.stateArchetype,adversary:state.adversaryPersonality,decisions:countBy(decisions)});
};

const serviceDecisions=(state:GameState)=>{
  const rows:Array<{decisionId:string;decisionLabel:string;choiceId:string;choiceLabel:string}>=[];
  for(const decision of state.decisions){
    const family=FAMILIES.find(item=>item.id===decision.family),choice=family?.choices.find(item=>item.id===decision.choice);
    rows.push({decisionId:`order:${decision.day}:${decision.family}`,decisionLabel:`Day ${decision.day} // ${family?.label??decision.family}`,choiceId:decision.choice,choiceLabel:choice?.label??decision.choice});
  }
  for(const decision of state.situationHistory){
    const maneuver=MANEUVERS.find(item=>item.id===decision.maneuverId);
    rows.push({decisionId:`maneuver:${decision.day}:${decision.blueprintId}`,decisionLabel:`Day ${decision.day} // ${decision.blueprintId}`,choiceId:decision.maneuverId??"standing-tempo",choiceLabel:maneuver?.label??"Standing Tempo"});
  }
  for(const decision of state.opportunityHistory){
    rows.push({decisionId:`opportunity:${decision.day}:${decision.opportunityId}`,decisionLabel:`Day ${decision.day} // ${decision.label}`,choiceId:decision.responseId,choiceLabel:decision.response});
  }
  for(const doctrineId of state.unlocked){
    const stage=DOCTRINES.flatMap(vector=>vector.stages).find(item=>item.id===doctrineId);
    rows.push({decisionId:`doctrine:${doctrineId}`,decisionLabel:"Doctrine Internalized",choiceId:doctrineId,choiceLabel:stage?.label??doctrineId});
  }
  return rows;
};

export const submitCampaignRecord=async(state:GameState,submissionId:string)=>{
  if(state.status==="active"||!submissionId)return null;
  const opening=initialState({seed:state.campaignSeed,archetype:state.stateArchetype,adversaryPersonality:state.adversaryPersonality,theater:state.theater});
  const response=await fetch("/api/campaign-records",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({submissionId,campaignId:state.campaignId,campaignSeed:state.campaignSeed,theater:state.theater,archetype:state.stateArchetype,adversary:state.adversaryPersonality,contentVersion:state.contentPackVersion,outcome:state.status,days:state.day,deployable:state.deployable,openingDeployable:opening.deployable,front:state.front,legitimacy:state.legitimacy,resistance:state.resistance,readiness:state.readiness,decisions:serviceDecisions(state),completedAt:Date.now()}),keepalive:true});
  if(response.status===401)return null;
  if(!response.ok){const result=await response.json().catch(()=>({})) as {error?:string};throw new Error(result.error??"Campaign Record could not be issued.")}
  return response.json();
};

const stableElementKey=(element:HTMLElement)=>{
  if(element.dataset.telemetry)return element.dataset.telemetry;
  if(element.dataset.semantic)return `${element.tagName.toLowerCase()}.${element.dataset.semantic.toLowerCase()}`;
  const aria=element.getAttribute("aria-label");if(aria)return `${element.tagName.toLowerCase()}.aria-${aria.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,48)}`;
  if(element.id)return `${element.tagName.toLowerCase()}#${element.id}`;
  const classes=[...element.classList].filter(name=>!/[0-9]/.test(name)).slice(0,2);
  return classes.length?`${element.tagName.toLowerCase()}.${classes.join(".")}`:element.tagName.toLowerCase();
};

export const installInteractionTelemetry=(module:()=>Module)=>{
  const onClick=(event:MouseEvent)=>{
    const target=(event.target as Element|null)?.closest<HTMLElement>("button,a,[role=button],input,summary");
    if(!target||target.closest("[data-no-telemetry]"))return;
    recordElementInteraction(stableElementKey(target),module());
  };
  const onVisibility=()=>{if(document.visibilityState==="hidden")flush()};
  document.addEventListener("click",onClick,{capture:true});document.addEventListener("visibilitychange",onVisibility);
  return()=>{document.removeEventListener("click",onClick,{capture:true});document.removeEventListener("visibilitychange",onVisibility);flush()};
};
