import {
  FAMILIES, MANEUVERS, commit, commitManeuver, situationForState,
  type Choice, type Family, type GameState, type Maneuver,
} from "./game";
export { FAMILIES, initialState, situationForState } from "./game";

export type ConvergenceDomain="domestic"|"network";
export type ConvergenceOption={id:string;family:Family;choice:Choice};
export type ConvergencePrompt={
  id:string;domain:ConvergenceDomain;title:string;brief:string;authority:string;
  options:ConvergenceOption[];matrixVersion:string;
};
export type ConvergencePacket={
  id:string;day:number;operational:ReturnType<typeof situationForState>;
  domestic:ConvergencePrompt;network:ConvergencePrompt;matrixVersion:string;
};

type PromptSpine={
  id:string;title:string;brief:string;authority:string;
  options:Array<[string,string]>;weight:(state:GameState)=>number;
};

export const CONVERGENCE_MATRIX_VERSION="convergence-v1";

const domesticSpines:PromptSpine[]=[
  {id:"induction-overhang",title:"Induction Bureau requests emergency disposition",brief:"The queue is becoming a political population of its own. Capacity, standards, or civilian institutions must absorb it.",authority:"INDUCTION BUREAU",options:[["training-capacity","camps"],["training-capacity","schools"],["training-standard","full"]],weight:s=>1+s.queue/Math.max(1,s.training)},
  {id:"replacement-standard",title:"Replacement quality has become an operational argument",brief:"Faster graduation preserves headcount while transmitting omitted training directly to the formations.",authority:"TRAINING INSPECTORATE",options:[["training-standard","compressed"],["training-standard","specialist"],["training-standard","full"]],weight:s=>1+(75-s.quality)/30},
  {id:"personnel-flight",title:"Rear-area absence has exceeded the administrative fiction",brief:"Return, interception, and household security each recover discipline by spending a different form of legitimacy.",authority:"PERSONNEL CONTROL",options:[["desertion","amnesty"],["desertion","patrols"],["desertion","rations"]],weight:s=>1+s.desertionPressure/45},
  {id:"casualty-account",title:"The casualty roll cannot remain both public and sealed",brief:"Households already possess names. Command must decide whether the state supplies truth, ritual, or classification.",authority:"CASUALTY ACCOUNTING OFFICE",options:[["casualty-politics","publish-rolls"],["casualty-politics","public-mourning"],["casualty-politics","sealed-ledger"]],weight:s=>1+(60-s.legitimacy)/35},
  {id:"civil-allocation",title:"Civil allocation has become a command decision",brief:"Calories, movement, and local authority can preserve consent, production, or central control, but not all three.",authority:"HOME FRONT DIRECTORATE",options:[["home-front","ration-equally"],["home-front","priority-industry"],["home-front","local-councils"]],weight:s=>1+s.resistance/50},
  {id:"fiscal-mobilization",title:"The treasury requests a political owner for the war bill",brief:"Debt, taxation, and requisition move the burden through time and class without making it disappear.",authority:"WAR FINANCE BOARD",options:[["finance","bonds"],["finance","profit-tax"],["finance","seize"]],weight:s=>1+(100-s.treasury)/120},
  {id:"industrial-labor",title:"The factories have reached their human maintenance limit",brief:"Output can be accelerated, dispersed, or deliberately interrupted before breakdown chooses for command.",authority:"INDUSTRIAL CONTROL BOARD",options:[["industry","overtime"],["industry","disperse"],["industry","maintenance"]],weight:s=>1+(75-s.materiel)/40},
  {id:"service-bargain",title:"The service obligation requires a new public bargain",brief:"The state can buy volunteers, compel a narrower class, or universalize the burden and inherit its resistance.",authority:"SERVICE COMMISSION",options:[["service","volunteer"],["service","selective"],["service","universal"]],weight:s=>1+(s.queue<s.training ? .35 : 0)},
];

const networkSpines:PromptSpine[]=[
  {id:"relay-compromise",title:"Signal Company proposes a relay gambit",brief:"The compromised frequencies still carry orders. Using them restores tempo and teaches the enemy what command sounds like.",authority:"SIGNAL COMPANY",options:[["network-posture","broadcast"],["network-posture","dark"],["network-posture","distributed"]],weight:s=>1+(s.intelligence<50?.25:0)},
  {id:"authentication-drift",title:"Authentication has become slower than maneuver",brief:"Every additional challenge protects the net while consuming the interval in which the order remains useful.",authority:"NETWORK SECURITY OFFICE",options:[["network-posture","broadcast"],["network-posture","dark"],["network-posture","distributed"]],weight:s=>1+(s.networkPosture==="dark"?.2:0)},
  {id:"courier-loss",title:"Courier routes now overlap the artillery map",brief:"Silence preserves secrecy only while the messengers survive the distance between headquarters.",authority:"FIELD COMMUNICATIONS BRANCH",options:[["network-posture","dark"],["network-posture","distributed"],["network-posture","broadcast"]],weight:s=>1+(s.readiness<55?.3:0)},
  {id:"relay-concentration",title:"Three formations depend on one surviving relay",brief:"Concentration improves command until a single antenna becomes a description of the whole army.",authority:"COMMAND NETWORK AUTHORITY",options:[["network-posture","distributed"],["network-posture","broadcast"],["network-posture","dark"]],weight:s=>1+(s.equipment<60?.25:0)},
  {id:"pattern-harvest",title:"Enemy pattern analysis is harvesting routine traffic",brief:"A familiar network is efficient for both the army using it and the enemy learning it.",authority:"PATTERN ANALYSIS DIRECTORATE",options:[["network-posture","distributed"],["network-posture","dark"],["network-posture","broadcast"]],weight:s=>1+(s.adversaryPersonality==="adaptive"?.3:0)},
  {id:"civilian-backbone",title:"Military traffic is displacing the civilian backbone",brief:"Priority routing restores the front by making hospitals, rail offices, and local government wait for the war.",authority:"CIVIL NETWORK CUSTODIAN",options:[["network-posture","broadcast"],["network-posture","distributed"],["network-posture","dark"]],weight:s=>1+s.resistance/200},
  {id:"spectrum-denial",title:"The usable spectrum has narrowed to an enemy invitation",brief:"Command can shout through interference, move physically through it, or spend equipment to route around it.",authority:"SPECTRUM CONTROL SECTION",options:[["network-posture","broadcast"],["network-posture","dark"],["network-posture","distributed"]],weight:s=>1+(situationForState(s).network.toLowerCase().includes("severed")?.35:0)},
  {id:"archive-latency",title:"The order archive is now ahead of the live war",brief:"Headquarters possesses every instruction except the one formations can still execute in time.",authority:"GENERAL STAFF ARCHIVE",options:[["network-posture","distributed"],["network-posture","broadcast"],["network-posture","dark"]],weight:s=>1+s.day/120},
];

const hash=(text:string)=>{let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)/4294967295};
const resolveOptions=(pairs:Array<[string,string]>)=>pairs.map(([familyId,choiceId])=>{const family=FAMILIES.find(item=>item.id===familyId);const choice=family?.choices.find(item=>item.id===choiceId);return family&&choice?{id:`${familyId}:${choiceId}`,family,choice}:null}).filter((item):item is ConvergenceOption=>!!item);
const compilePrompt=(state:GameState,domain:ConvergenceDomain,spines:PromptSpine[]):ConvergencePrompt=>{
  const spine=[...spines].sort((a,b)=>(b.weight(state)+hash(`${state.campaignSeed}:${state.day}:${b.id}`)*.9)-(a.weight(state)+hash(`${state.campaignSeed}:${state.day}:${a.id}`)*.9))[0];
  return{id:spine.id,domain,title:spine.title,brief:spine.brief,authority:spine.authority,options:resolveOptions(spine.options),matrixVersion:CONVERGENCE_MATRIX_VERSION};
};

export const compileConvergence=(state:GameState):ConvergencePacket=>({
  id:`${CONVERGENCE_MATRIX_VERSION}:${state.campaignSeed}:${state.day}`,
  day:state.day,operational:situationForState(state),
  domestic:compilePrompt(state,"domestic",domesticSpines),
  network:compilePrompt(state,"network",networkSpines),
  matrixVersion:CONVERGENCE_MATRIX_VERSION,
});

export const convergenceOptionAvailable=(state:GameState,option:ConvergenceOption)=>state.actions>0&&state.status==="active"&&(state.locks[option.family.id]??0)<=state.day;

export const commitConvergence=(state:GameState,input:{maneuverId?:string;domesticId?:string;networkId?:string})=>{
  const packet=compileConvergence(state);let next=state;const issued:string[]=[];
  for(const id of [input.domesticId,input.networkId]){
    const option=[...packet.domestic.options,...packet.network.options].find(item=>item.id===id);if(!option)continue;
    const result=commit(next,option.family,option.choice);if(result!==next){next=result;issued.push(option.choice.label)}
  }
  const maneuver: Maneuver|undefined=MANEUVERS.find(item=>item.id===input.maneuverId);
  if(maneuver){const result=commitManeuver(next,maneuver);if(result!==next){next=result;issued.push(maneuver.label)}}
  return{state:next,issued};
};

export const convergenceMatrixAudit=()=>({domestic:domesticSpines.length,network:networkSpines.length,version:CONVERGENCE_MATRIX_VERSION});
