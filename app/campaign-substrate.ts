import {
  FUNGIBLE_BLUEPRINT_RULES,
  FUNGIBLE_SITUATION_TEMPLATES,
} from "./main-situation-content";
import {
  evaluateGate as evaluateSubstrateGate,
  hashInt,
  phaseIdForDay,
  stableHash,
  type CampaignPhaseId,
  type ProblemClass,
  type SubstrateGate,
  type Theater,
} from "./substrate/substrate-core";

export { phaseIdForDay, stableHash };
export type { CampaignPhaseId, ProblemClass, Theater };

export type OutcomeBand = "clean" | "executed" | "disrupted" | "collapse";
export type TargetSelector = "fixed" | "highest-pressure" | "lowest-supply" | "weakest-network" | "most-damaged" | "frontline";

const OPERATIONAL_OBJECTIVES: Record<ProblemClass, string> = {
  "force-preservation": "PRESERVE THE FORCE",
  logistics: "RESTORE THE SUPPLY LINE",
  command: "RESTORE COMMAND",
  assault: "BREAK THE POSITION",
  crossing: "FORCE THE CROSSING",
  exploitation: "EXPLOIT THE OPENING",
  counterstroke: "ARREST THE COUNTERSTROKE",
  observation: "CLASSIFY THE ENEMY",
};

export const operationalObjectiveForProblemClass = (problem: string) =>
  OPERATIONAL_OBJECTIVES[problem as ProblemClass] ??
  "RESOLVE THE OPERATIONAL PROBLEM";

export type SituationTemplate = {
  id:string; sector:string; headline:string; briefing:string; question:string; theater:Theater;
  terrain:string; ground:string; network:string; supply:string; intelligence:string;
  windowHours:number; quote:string; attribution:string; maneuvers:string[];
};

export type TheaterSector = {
  id:string; theater:Theater; name:string; neighbors:string[]; terrain:string; ground:string;
  network:"severed"|"degraded"|"intermittent"|"restored";
  supplyAccess:number; infrastructure:number; fortification:number; control:number;
  friendlyForce:number; enemyForceEstimate:number;
};

export type OperationalFact = {
  id:string; sectorId:string|null; createdDay:number; expiresDay:number|null; intensity:number;
  source:string; visible:boolean;
};

export type FactDefinition = {id:string;label:string;category:string;consequence:string};

export type SituationHistoryRecord = {
  day:number; blueprintId:string; calculusBlueprintId?:string; situationId:string; sectorId:string; maneuverId:string|null;
  outcomeBand:OutcomeBand|null; margin:number|null; groundMovement:number|null; factsCreated:string[];
  presentedManeuverLabels?:string[];
};

export type OperationalBands = {
  frontPosture:"collapsing"|"defensive"|"contested"|"advancing"|"breakthrough";
  forceRatio:"inferior"|"disadvantaged"|"parity"|"superior"|"overwhelming";
  readiness:"exhausted"|"degraded"|"serviceable"|"ready";
  supply:"famine"|"critical"|"strained"|"adequate"|"surplus";
  reserveDepth:"absent"|"thin"|"available"|"deep";
  network:"severed"|"degraded"|"intermittent"|"restored";
  intelligence:"blind"|"contradictory"|"estimated"|"confirmed";
  enemyPosture:"reconstituting"|"pressuring"|"counterstroking"|"assaulting"|"exploiting";
  domesticState:"stable"|"brittle"|"organized-resistance"|"collapse";
  infrastructure:"severed"|"damaged"|"serviceable"|"intact";
};

export type ScalarKey = "front"|"readiness"|"reserves"|"intelligence"|"legitimacy"|"resistance"|"dependency"|"munitionsCoverage"|"sectorSupply"|"sectorDamage"|"sectorFortification";
export type BandKey = keyof OperationalBands;
/** Campaign gates use the shared substrate grammar (authoritative in app/substrate/gates.ts). */
export type Gate = SubstrateGate;

export type SituationBlueprintRule = {
  id:string; problemClass:ProblemClass; theaters:Theater[]; requires:Gate; forbids?:Gate;
  targetSelector:TargetSelector; fixedSectorId?:string; baseUrgency:number; cooldown:number;
  standingOrder:string; writingOnly?:boolean;
};

export type CompiledSituation = SituationTemplate & {
  day:number; blueprintId:string; calculusBlueprintId:string; problemClass:ProblemClass; sectorId:string; contentPackVersion:string;
  selectionScore:number; candidateCount:number; selectionBasis:string; resolutionTicket:string;
  triggeringFacts:string[]; bands:OperationalBands; standingOrder:string; aftermathFacts:string[];
  maneuverPresentations:Record<string,ManeuverPresentation>;
};

export type StrategicConditionInput = {id:string;category:string;label:string};

export type ManeuverPresentation = {
  label:string;
  rationale:string;
  realizationId:string;
};

export type CampaignStateView = {
  campaignSeed:number; day:number; theater:Theater; front:number; deployable:number; enemy:number;
  readiness:number; equipment:number; reserves:number; intelligence:number; legitimacy:number;
  resistance:number; dependency:number; production:{munitions:{stock:number;use:number}};
  adversary?:{posture?:string}; theaterSectors?:TheaterSector[]; operationalFacts?:OperationalFact[];
  situationHistory?:SituationHistoryRecord[];
};

export type ManeuverAftermathRule = {
  successFact:string; failureFact:string; cleanFact?:string; ttl:number;
};

export const CONTENT_PACK_VERSION="campaign-substrate-v5";
const CALCULUS_VERSION="campaign-substrate-v3";

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export const deterministicRoll=(ticket:string,maneuverId:string)=>stableHash(`${ticket}:${maneuverId}`);
const dailyManeuverDocket=(state:CampaignStateView,template:SituationTemplate)=>
  [...template.maneuvers]
    .sort((left,right)=>
      stableHash(`${state.campaignSeed}:${state.day}:${template.id}:maneuver:${left}`)-
        stableHash(`${state.campaignSeed}:${state.day}:${template.id}:maneuver:${right}`)||
      left.localeCompare(right))
    .slice(0,3);

const PROBLEM_TARGETS:Record<ProblemClass,string>={
  "force-preservation":"line",
  logistics:"supply corridor",
  command:"command lattice",
  assault:"enemy position",
  crossing:"far bank",
  exploitation:"opening",
  counterstroke:"enemy concentration",
  observation:"contact picture",
};

/** Public read-only projection of the authoritative problem target table. */
export const operationalTargetForProblemClass = (problem: string) =>
  PROBLEM_TARGETS[problem as ProblemClass] ?? "operational problem";

const MANEUVER_ORDER_GRAMMAR:Record<string,Array<(sector:string,target:string)=>string>>={
  reinforce:[
    (sector,target)=>`Reinforce the ${target} at ${sector}`,
    sector=>`Commit the Reserve at ${sector}`,
    (sector,target)=>`Reconstitute the ${sector} ${target}`,
    sector=>`Hold ${sector} in Strength`,
  ],
  interdict:[
    sector=>`Break the Enemy Fire Plan at ${sector}`,
    sector=>`Hunt the Guns Covering ${sector}`,
    sector=>`Blind the Batteries Over ${sector}`,
    sector=>`Sever Enemy Support at ${sector}`,
  ],
  route:[
    sector=>`Open a Second Route into ${sector}`,
    (sector,target)=>`Bypass the ${target} at ${sector}`,
    sector=>`Cut a Protected Approach to ${sector}`,
    sector=>`Clear the Service Road at ${sector}`,
  ],
  abandon:[
    sector=>`Disengage from ${sector}`,
    sector=>`Yield ${sector} to Preserve the Formation`,
    sector=>`Withdraw Behind ${sector}`,
    sector=>`Recover the Force from ${sector}`,
  ],
  exploit:[
    sector=>`Drive Through the Opening at ${sector}`,
    sector=>`Turn the Enemy Flank at ${sector}`,
    sector=>`Commit the Mobile Reserve Beyond ${sector}`,
    sector=>`Convert Contact into Breakthrough at ${sector}`,
  ],
  breach:[
    sector=>`Force a Lane Through ${sector}`,
    (sector,target)=>`Open the ${target} at ${sector}`,
    sector=>`Reduce the Strongpoint at ${sector}`,
    sector=>`Carry the Obstacle Belt at ${sector}`,
  ],
  network:[
    sector=>`Rebuild Command at ${sector}`,
    sector=>`Restore Relay Authority at ${sector}`,
    sector=>`Push a Field Net Through ${sector}`,
    (sector,target)=>`Reconstruct the ${target} at ${sector}`,
  ],
};

const MANEUVER_RATIONALES:Record<string,Array<(sector:string,target:string)=>string>>={
  reinforce:[
    (sector,target)=>`The reserve is committed where the ${target} is already consuming formations.`,
    sector=>`Fresh force enters ${sector} before local weakness becomes theater geometry.`,
    sector=>`The formation at ${sector} is made real again with personnel, equipment, and time.`,
  ],
  interdict:[
    sector=>`Enemy support around ${sector} is attacked before another formation is asked to survive it.`,
    ()=>`Observation, drones, airpower, and batteries are concentrated on the system sustaining the position.`,
    ()=>`The order spends fires to remove the enemy's ability to make movement expensive.`,
  ],
  route:[
    sector=>`Engineers change what ${sector} permits while covering forces purchase the work period.`,
    ()=>`The operation refuses the approach the enemy has already priced into its fire plan.`,
    (sector,target)=>`A second path converts the ${target} from a monopoly into a choice.`,
  ],
  abandon:[
    sector=>`Ground at ${sector} is exchanged for a formation that can still be used tomorrow.`,
    ()=>`The withdrawal reduces exposure, supply demand, and the enemy's authority over the timetable.`,
    ()=>`Recovery begins before the position converts preservation into rout.`,
  ],
  exploit:[
    sector=>`Mobile force enters ${sector} before enemy concentration becomes enemy coherence.`,
    ()=>`The operation spends protection to make temporary dislocation permanent.`,
    ()=>`The reserve crosses the point where support can no longer be guaranteed.`,
  ],
  breach:[
    ()=>`Infantry, armor, engineers, drones, and fires are synchronized on one survivable passage.`,
    sector=>`The obstacle at ${sector} is attacked as a system rather than crossed one casualty at a time.`,
    (sector,target)=>`A narrow opening is forced through the ${target} before supporting fire loses authority.`,
  ],
  network:[
    sector=>`Orders, targeting, and movement at ${sector} are made mutually legible again.`,
    ()=>`Relay teams restore the part of command that must survive distance and interference.`,
    (sector,target)=>`The ${target} is rebuilt before incompatible local decisions become operational fact.`,
  ],
};

const MANEUVER_ORDER_QUALIFIERS=[
  "",
  " // PRIORITY ONE",
  " // IMMEDIATE EXECUTION",
  " // FIRST ECHELON",
  " // SECOND ECHELON",
  " // LIMITED OBJECTIVE",
  " // RESERVE AUTHORITY",
  " // NIGHT WINDOW",
  " // DAWN WINDOW",
  " // COUNTERBATTERY WINDOW",
  " // UNDER SMOKE",
  " // BEFORE ENEMY RELIEF",
  " // FORMATION PRIORITY",
  " // FIRE PLAN ALPHA",
  " // DISPLACEMENT WINDOW",
  " // COMMANDER'S RESERVE",
] as const;

const legacyPresentedManeuverLabels=(
  state:CampaignStateView,
  templates:SituationTemplate[],
  record:SituationHistoryRecord,
)=>{
  const narrative=templates.find(template=>template.id===record.blueprintId);
  const calculus=templates.find(template=>template.id===(record.calculusBlueprintId??record.blueprintId));
  const rule=calculus?BLUEPRINT_RULES[calculus.id]:undefined;
  const sector=(state.theaterSectors??THEATER_SECTORS).find(item=>item.id===record.sectorId);
  if(!narrative||!calculus||!rule||!sector)return[];
  const target=PROBLEM_TARGETS[rule.problemClass];
  return dailyManeuverDocket({...state,day:record.day},calculus).flatMap(id=>{
    const labels=MANEUVER_ORDER_GRAMMAR[id];
    if(!labels?.length)return[];
    const labelIndex=hashInt(`${state.campaignSeed}:${record.day}:${narrative.id}:${sector.id}:${id}:order`)%labels.length;
    return[labels[labelIndex](sector.name,target)];
  });
};

const priorPresentedManeuverLabels=(
  state:CampaignStateView,
  templates:SituationTemplate[],
)=>{
  const labels=new Set<string>();
  for(const record of state.situationHistory??[]){
    const presented=record.presentedManeuverLabels?.length
      ? record.presentedManeuverLabels
      : legacyPresentedManeuverLabels(state,templates,record);
    for(const label of presented)labels.add(label);
  }
  return labels;
};

const compileManeuverPresentations=(
  state:CampaignStateView,
  template:SituationTemplate,
  rule:SituationBlueprintRule,
  sector:TheaterSector,
  maneuverIds:string[],
  priorLabels:Set<string>,
):Record<string,ManeuverPresentation>=>{
  const claimed=new Set(priorLabels);
  return Object.fromEntries(maneuverIds.map(id=>{
  const labels=MANEUVER_ORDER_GRAMMAR[id]??[(name:string)=>`${id.toUpperCase()} AT ${name}`];
  const rationales=MANEUVER_RATIONALES[id]??[()=>rule.standingOrder];
  const baseOffset=hashInt(`${state.campaignSeed}:${state.day}:${template.id}:${sector.id}:${id}:order`)%labels.length;
  const candidates=MANEUVER_ORDER_QUALIFIERS.flatMap((qualifier,qualifierIndex)=>
    labels.map((render,offset)=>{
      const labelIndex=(baseOffset+offset)%labels.length;
      return{
        label:`${render(sector.name,PROBLEM_TARGETS[rule.problemClass])}${qualifier}`,
        labelIndex,
        qualifierIndex,
      };
    }),
  );
  const candidateOffset=hashInt(`${state.campaignSeed}:${state.day}:${template.id}:${sector.id}:${id}:realization:${CONTENT_PACK_VERSION}`)%candidates.length;
  const selected=Array.from(
    {length:candidates.length},
    (_,offset)=>candidates[(candidateOffset+offset)%candidates.length],
  ).find(candidate=>!claimed.has(candidate.label))??candidates[candidateOffset];
  claimed.add(selected.label);
  const rationaleIndex=hashInt(`${state.campaignSeed}:${template.id}:${sector.id}:${id}:rationale`)%rationales.length;
  const target=PROBLEM_TARGETS[rule.problemClass];
  return[id,{
    label:selected.label,
    rationale:rationales[rationaleIndex](sector.name,target),
    realizationId:`${template.id}:${sector.id}:${id}:L${selected.labelIndex + 1}:Q${selected.qualifierIndex + 1}:R${rationaleIndex + 1}`,
  }];
  }));
};
/** Canonical phase table lives in the shared substrate (`app/substrate/vocabulary.ts`). */
export const outcomeBandForMargin=(margin:number):OutcomeBand=>margin>=.2?"clean":margin>=0?"executed":margin>=-.2?"disrupted":"collapse";
export const outcomeBandLabel:Record<OutcomeBand,string>={clean:"CLEAN EXECUTION",executed:"EXECUTED WITH FRICTION",disrupted:"DISRUPTED",collapse:"OPERATIONAL COLLAPSE"};

export const FACT_CATALOG:Record<string,FactDefinition>=Object.fromEntries(([
  ["salient_exists","Exposed Salient","GEOMETRY","Enables reinforcement, withdrawal, and interdiction problems until the salient is abandoned or integrated."],
  ["obstacle_belt_prepared","Prepared Obstacle Belt","ENGINEERING","Raises breach exposure until passage is forced or the position is bypassed."],
  ["command_net_severed","Command Net Severed","COMMAND","Degrades local force conversion and raises the priority of relay restoration."],
  ["crossing_exposed","Crossing Exposed","ENGINEERING","Makes movement across the waterline visible and increases crossing loss exposure."],
  ["enemy_fires_registered","Enemy Fires Registered","FIRES","The enemy has a reusable firing solution on the route or position."],
  ["rail_junction_damaged","Rail Junction Damaged","LOGISTICS","Reduces supply access until route work or alternate custody restores flow."],
  ["reserve_available","Reserve Available","FORCE","Permits reinforcement and exploitation at the cost of future force preservation."],
  ["salient_reinforced","Salient Reinforced","FORCE","Temporarily improves control and fortification in the target sector."],
  ["reserve_exposed","Reserve Exposed","FORCE","Makes subsequent commitment more costly and easier for the enemy to classify."],
  ["reserve_exhausted","Reserve Exhausted","FORCE","Raises the probability of formation-exhaustion and withdrawal situations."],
  ["enemy_fires_displaced","Enemy Fires Displaced","FIRES","Temporarily reduces the authority of registered enemy fires in the sector."],
  ["targeting_data_recovered","Targeting Data Recovered","INTELLIGENCE","Improves the next attempt to suppress or exploit the target sector."],
  ["batteries_unlocated","Batteries Unlocated","FIRES","Preserves interdiction pressure and conceals the responsible firing units."],
  ["alternate_route_open","Alternate Route Open","LOGISTICS","Improves sector supply access while the route remains serviceable."],
  ["engineers_spent","Engineers Spent","ENGINEERING","Reduces immediate route and breach capacity after a failed engineering commitment."],
  ["sector_abandoned","Sector Abandoned","CONTROL","Removes the position from friendly custody and creates pursuit exposure."],
  ["enemy_dislocated","Enemy Dislocated","OPERATIONS","Creates temporary freedom for exploitation and pursuit."],
  ["breakthrough_window","Breakthrough Window","OPERATIONS","Enables high-leverage follow-on action before the enemy reconstitutes."],
  ["mobile_reserve_spent","Mobile Reserve Spent","FORCE","Removes the principal instrument for immediate exploitation or counterstroke."],
  ["obstacle_breached","Obstacle Breached","ENGINEERING","Reduces fortification and enables passage through the target sector."],
  ["assault_observed","Assault Observed","INTELLIGENCE","The enemy has preserved the sequence and geometry of the failed assault."],
  ["command_net_restored","Command Net Restored","COMMAND","Raises local network conversion until relays are displaced or attacked."],
  ["relay_compromised","Relay Compromised","COMMAND","Makes future restoration attempts easier to detect and interrupt."],
  ["formation_exhausted","Formation Exhausted","PERSONNEL","Raises casualty and withdrawal pressure until the formation is rested or replaced."],
  ["infrastructure_severed","Infrastructure Severed","LOGISTICS","Cuts the sector from ordinary supply conversion until repaired or bypassed."],
] as const).map(([id,label,category,consequence])=>[id,{id,label,category,consequence}]));

export const THEATER_SECTORS:TheaterSector[]=[
  {id:"kesh-corridor",theater:"lowland",name:"Kesh Corridor",neighbors:["vell-plain","morrow-depot"],terrain:"Cratered lowland corridor",ground:"Saturated",network:"intermittent",supplyAccess:48,infrastructure:61,fortification:42,control:-.18,friendlyForce:72000,enemyForceEstimate:81000},
  {id:"vell-plain",theater:"lowland",name:"Vell Plain",neighbors:["kesh-corridor","saint-orsen-fields"],terrain:"Open lowland",ground:"Dry",network:"intermittent",supplyAccess:71,infrastructure:78,fortification:18,control:-.04,friendlyForce:61000,enemyForceEstimate:65000},
  {id:"ossuary-mile",theater:"lowland",name:"Ossuary Mile",neighbors:["morrow-depot","calve-junction"],terrain:"Cratered lowland corridor",ground:"Saturated",network:"degraded",supplyAccess:39,infrastructure:44,fortification:28,control:-.22,friendlyForce:52000,enemyForceEstimate:67000},
  {id:"morrow-depot",theater:"lowland",name:"Morrow Depot",neighbors:["kesh-corridor","ossuary-mile","calve-junction"],terrain:"Lowland rail basin",ground:"Dry",network:"restored",supplyAccess:82,infrastructure:73,fortification:31,control:.12,friendlyForce:58000,enemyForceEstimate:39000},
  {id:"calve-junction",theater:"lowland",name:"Calve Junction",neighbors:["ossuary-mile","morrow-depot","saint-orsen-fields"],terrain:"Lowland road junction",ground:"Cratered",network:"degraded",supplyAccess:57,infrastructure:55,fortification:37,control:-.09,friendlyForce:47000,enemyForceEstimate:54000},
  {id:"saint-orsen-fields",theater:"lowland",name:"Saint Orsen Fields",neighbors:["vell-plain","calve-junction"],terrain:"Open lowland",ground:"Dry",network:"intermittent",supplyAccess:67,infrastructure:69,fortification:14,control:.03,friendlyForce:43000,enemyForceEstimate:45000},
  {id:"thorne-line",theater:"ridge",name:"Thorne Line",neighbors:["ash-spine","redoubt-nine"],terrain:"Prepared ridge",ground:"Mined",network:"degraded",supplyAccess:62,infrastructure:51,fortification:84,control:-.21,friendlyForce:68000,enemyForceEstimate:79000},
  {id:"ash-spine",theater:"ridge",name:"Ash Spine",neighbors:["thorne-line","pilgrim-cut"],terrain:"Prepared ridge",ground:"Mined and dry",network:"intermittent",supplyAccess:54,infrastructure:47,fortification:77,control:-.14,friendlyForce:59000,enemyForceEstimate:72000},
  {id:"varren-steps",theater:"ridge",name:"Varren Steps",neighbors:["pilgrim-cut","talus-road"],terrain:"Narrow ridge",ground:"Mined",network:"degraded",supplyAccess:65,infrastructure:59,fortification:64,control:-.05,friendlyForce:49000,enemyForceEstimate:56000},
  {id:"pilgrim-cut",theater:"ridge",name:"Pilgrim Cut",neighbors:["ash-spine","varren-steps","redoubt-nine"],terrain:"Ridge defile",ground:"Cratered",network:"intermittent",supplyAccess:58,infrastructure:52,fortification:69,control:-.08,friendlyForce:45000,enemyForceEstimate:53000},
  {id:"redoubt-nine",theater:"ridge",name:"Redoubt Nine",neighbors:["thorne-line","pilgrim-cut","talus-road"],terrain:"Fortified height",ground:"Dry",network:"restored",supplyAccess:70,infrastructure:67,fortification:91,control:.08,friendlyForce:63000,enemyForceEstimate:47000},
  {id:"talus-road",theater:"ridge",name:"Talus Road",neighbors:["varren-steps","redoubt-nine"],terrain:"Ridge supply road",ground:"Saturated",network:"degraded",supplyAccess:43,infrastructure:38,fortification:33,control:-.11,friendlyForce:37000,enemyForceEstimate:44000},
  {id:"hollow-relay-district",theater:"industrial",name:"Hollow Relay District",neighbors:["calder-foundry-belt","south-switch"],terrain:"Industrial basin",ground:"Dry",network:"severed",supplyAccess:55,infrastructure:58,fortification:46,control:-.16,friendlyForce:65000,enemyForceEstimate:70000},
  {id:"calder-foundry-belt",theater:"industrial",name:"Calder Foundry Belt",neighbors:["hollow-relay-district","annealing-quarter"],terrain:"Industrial basin",ground:"Rubble and dry",network:"intermittent",supplyAccess:69,infrastructure:49,fortification:72,control:-.12,friendlyForce:71000,enemyForceEstimate:76000},
  {id:"blackglass-rail-yards",theater:"industrial",name:"Blackglass Rail Yards",neighbors:["south-switch","cinder-ward"],terrain:"Industrial corridor",ground:"Cratered and dry",network:"degraded",supplyAccess:41,infrastructure:43,fortification:38,control:-.2,friendlyForce:56000,enemyForceEstimate:64000},
  {id:"cinder-ward",theater:"industrial",name:"Cinder Ward",neighbors:["blackglass-rail-yards","annealing-quarter"],terrain:"Worker district",ground:"Rubble",network:"intermittent",supplyAccess:61,infrastructure:54,fortification:57,control:-.02,friendlyForce:48000,enemyForceEstimate:51000},
  {id:"annealing-quarter",theater:"industrial",name:"Annealing Quarter",neighbors:["calder-foundry-belt","cinder-ward","south-switch"],terrain:"Foundry district",ground:"Dry",network:"restored",supplyAccess:76,infrastructure:66,fortification:63,control:.1,friendlyForce:59000,enemyForceEstimate:44000},
  {id:"south-switch",theater:"industrial",name:"South Switch",neighbors:["hollow-relay-district","blackglass-rail-yards","annealing-quarter"],terrain:"Rail junction",ground:"Cratered",network:"degraded",supplyAccess:46,infrastructure:39,fortification:29,control:-.17,friendlyForce:42000,enemyForceEstimate:50000},
  {id:"dalca-crossing",theater:"river",name:"Dalca Crossing",neighbors:["west-reach","ferry-nine"],terrain:"River crossing corridor",ground:"Flooded",network:"degraded",supplyAccess:45,infrastructure:48,fortification:41,control:-.19,friendlyForce:57000,enemyForceEstimate:66000},
  {id:"neme-locks",theater:"river",name:"Neme Locks",neighbors:["upper-pool","west-reach"],terrain:"River lock corridor",ground:"Saturated",network:"intermittent",supplyAccess:68,infrastructure:72,fortification:53,control:-.03,friendlyForce:52000,enemyForceEstimate:55000},
  {id:"charnel-ford",theater:"river",name:"Charnel Ford",neighbors:["ferry-nine","upper-pool"],terrain:"Open river crossing",ground:"Flooded and mined",network:"intermittent",supplyAccess:51,infrastructure:37,fortification:34,control:-.13,friendlyForce:46000,enemyForceEstimate:54000},
  {id:"west-reach",theater:"river",name:"West Reach",neighbors:["dalca-crossing","neme-locks","upper-pool"],terrain:"Levee corridor",ground:"Saturated",network:"restored",supplyAccess:74,infrastructure:64,fortification:48,control:.09,friendlyForce:61000,enemyForceEstimate:43000},
  {id:"upper-pool",theater:"river",name:"Upper Pool",neighbors:["neme-locks","west-reach","charnel-ford"],terrain:"Reservoir approaches",ground:"Flooded",network:"degraded",supplyAccess:59,infrastructure:57,fortification:44,control:-.01,friendlyForce:41000,enemyForceEstimate:47000},
  {id:"ferry-nine",theater:"river",name:"Ferry Nine",neighbors:["dalca-crossing","charnel-ford"],terrain:"River transport node",ground:"Saturated",network:"intermittent",supplyAccess:63,infrastructure:53,fortification:26,control:-.06,friendlyForce:39000,enemyForceEstimate:45000},
];

export const initialTheaterSectors=(theater:Theater)=>THEATER_SECTORS.filter(x=>x.theater===theater).map(x=>({...x,neighbors:[...x.neighbors]}));

export const initialOperationalFacts=(theater:Theater):OperationalFact[]=>{
  const source="CAMPAIGN OPENING SURVEY";const make=(id:string,sectorId:string|null,intensity=1):OperationalFact=>({id,sectorId,createdDay:0,expiresDay:null,intensity,source,visible:true});
  const common=[make("reserve_available",null,1)];
  if(theater==="lowland")return[...common,make("salient_exists","kesh-corridor"),make("enemy_fires_registered","kesh-corridor"),make("rail_junction_damaged","ossuary-mile")];
  if(theater==="ridge")return[...common,make("obstacle_belt_prepared","thorne-line"),make("obstacle_belt_prepared","ash-spine"),make("enemy_fires_registered","ash-spine")];
  if(theater==="industrial")return[...common,make("command_net_severed","hollow-relay-district"),make("rail_junction_damaged","blackglass-rail-yards"),make("infrastructure_severed","south-switch")];
  return[...common,make("crossing_exposed","dalca-crossing"),make("crossing_exposed","charnel-ford"),make("infrastructure_severed","dalca-crossing")];
};

export const GENERIC_SITUATION_TEMPLATES:SituationTemplate[]=[
  {id:"formation-exhaustion",theater:"lowland",sector:"{sector}",headline:"The Formation at {sector} Exists More Completely on Paper",briefing:"Vehicle faults, medical absence, and unlocated personnel have converged into one operational fact. The line remains occupied, but its occupants can no longer perform every task assigned to the formation name.",question:"Which obligation is removed before the formation removes itself?",terrain:"Compiled from sector",ground:"Compiled from sector",network:"Compiled from sector",supply:"Compiled from sector",intelligence:"Compiled from state",windowHours:8,quote:"A ghost formation still consumes rations if the ledger believes in it.",attribution:"Formation Readiness Board, Exception Register",maneuvers:["reinforce","abandon","network","route","interdict"]},
  {id:"reserve-crisis",theater:"lowland",sector:"{sector}",headline:"The Last Uncommitted Reserve Has Reached {sector}",briefing:"The reserve can restore the local line, preserve another sector, or remain intact long enough to become unavailable for both. Every staff branch has described its preferred commitment as temporary.",question:"Where does future freedom become present force?",terrain:"Compiled from sector",ground:"Compiled from sector",network:"Compiled from sector",supply:"Compiled from sector",intelligence:"Compiled from state",windowHours:10,quote:"A reserve is freedom expressed as a formation.",attribution:"General Staff Memorandum, Reserve Custody",maneuvers:["reinforce","interdict","route","abandon","exploit"]},
  {id:"local-counterstroke",theater:"lowland",sector:"{sector}",headline:"The Enemy Has Begun a Counterstroke at {sector}",briefing:"Enemy movement is converging faster than its supporting timetable. The concentration is vulnerable while moving and overwhelming after arrival. Friendly forces can spoil, receive, evade, or misclassify the blow.",question:"Which part of the counterstroke is allowed to become real?",terrain:"Compiled from sector",ground:"Compiled from sector",network:"Compiled from sector",supply:"Compiled from sector",intelligence:"Compiled from state",windowHours:6,quote:"A counterstroke is a reserve admitting what it was preserved for.",attribution:"Pattern Analysis Directorate, Enemy Intent Series",maneuvers:["reinforce","interdict","network","abandon","exploit"]},
  ...FUNGIBLE_SITUATION_TEMPLATES,
];

const A:Gate={op:"always"};
const band=(key:BandKey,...values:string[]):Gate=>({op:"band",key,values});
const fact=(id:string,sector:"target"|"any"="target"):Gate=>({op:"fact",id,sector});
const any=(...gates:Gate[]):Gate=>({op:"any",gates});
const scalar=(key:ScalarKey,compare:"eq"|"neq"|"gt"|"gte"|"lt"|"lte"|"between"|"outside",value:number|[number,number]):Gate=>({op:"scalar",key,compare,value});
const allTheaters:Theater[]=["lowland","ridge","industrial","river"];

export const BLUEPRINT_RULES:Record<string,SituationBlueprintRule>={
  kesh:{id:"kesh",problemClass:"force-preservation",theaters:["lowland"],requires:any(fact("salient_exists"),band("frontPosture","collapsing","defensive","contested")),targetSelector:"fixed",fixedSectorId:"kesh-corridor",baseUrgency:88,cooldown:3,standingOrder:"Methodical defense continues to feed the exposed salient."},
  "vell-plain":{id:"vell-plain",problemClass:"observation",theaters:["lowland"],requires:A,targetSelector:"fixed",fixedSectorId:"vell-plain",baseUrgency:48,cooldown:4,standingOrder:"Movement remains dispersed and the enemy continues classifying lateral routes."},
  "ossuary-mile":{id:"ossuary-mile",problemClass:"logistics",theaters:["lowland"],requires:any(band("supply","famine","critical","strained"),fact("rail_junction_damaged"),fact("enemy_fires_registered")),targetSelector:"fixed",fixedSectorId:"ossuary-mile",baseUrgency:70,cooldown:3,standingOrder:"The single recovered lane remains under intermittent use and enemy observation."},
  "thorne-line":{id:"thorne-line",problemClass:"assault",theaters:["ridge"],requires:any(fact("obstacle_belt_prepared"),band("frontPosture","contested","advancing")),targetSelector:"fixed",fixedSectorId:"thorne-line",baseUrgency:74,cooldown:3,standingOrder:"Suppression continues without a committed passage attempt."},
  "ash-spine":{id:"ash-spine",problemClass:"assault",theaters:["ridge"],requires:any(fact("obstacle_belt_prepared"),fact("enemy_fires_registered")),targetSelector:"fixed",fixedSectorId:"ash-spine",baseUrgency:69,cooldown:3,standingOrder:"The named approaches remain under observed preparation."},
  "varren-steps":{id:"varren-steps",problemClass:"exploitation",theaters:["ridge"],requires:any(band("frontPosture","contested","advancing","breakthrough"),fact("enemy_dislocated","any")),targetSelector:"fixed",fixedSectorId:"varren-steps",baseUrgency:56,cooldown:4,standingOrder:"Patrols retain the first empty position without entering the second line."},
  "hollow-net":{id:"hollow-net",problemClass:"command",theaters:["industrial"],requires:any(fact("command_net_severed"),band("network","severed","degraded")),targetSelector:"fixed",fixedSectorId:"hollow-relay-district",baseUrgency:82,cooldown:3,standingOrder:"The isolated formation continues under its last acknowledged instruction."},
  "calder-foundry":{id:"calder-foundry",problemClass:"assault",theaters:["industrial"],requires:any(band("infrastructure","damaged","severed"),band("frontPosture","contested","advancing")),targetSelector:"fixed",fixedSectorId:"calder-foundry-belt",baseUrgency:61,cooldown:4,standingOrder:"Containment preserves the rail spur and concedes the occupied halls."},
  "blackglass-yards":{id:"blackglass-yards",problemClass:"logistics",theaters:["industrial"],requires:any(fact("rail_junction_damaged"),band("supply","famine","critical","strained")),targetSelector:"fixed",fixedSectorId:"blackglass-rail-yards",baseUrgency:79,cooldown:3,standingOrder:"Dispatch continues alternating military and evacuation traffic through one switch."},
  "dalca-crossing":{id:"dalca-crossing",problemClass:"crossing",theaters:["river"],requires:any(fact("crossing_exposed"),band("infrastructure","damaged","severed")),targetSelector:"fixed",fixedSectorId:"dalca-crossing",baseUrgency:77,cooldown:3,standingOrder:"The crossing remains closed to heavy movement pending classification."},
  "neme-locks":{id:"neme-locks",problemClass:"force-preservation",theaters:["river"],requires:A,targetSelector:"fixed",fixedSectorId:"neme-locks",baseUrgency:54,cooldown:4,standingOrder:"The upper pool remains held and the eastern approaches remain passable."},
  "charnel-ford":{id:"charnel-ford",problemClass:"crossing",theaters:["river"],requires:any(fact("crossing_exposed"),band("frontPosture","contested","advancing")),targetSelector:"fixed",fixedSectorId:"charnel-ford",baseUrgency:68,cooldown:3,standingOrder:"The assault group remains concealed on the near bank until concealment fails."},
  "formation-exhaustion":{id:"formation-exhaustion",problemClass:"force-preservation",theaters:allTheaters,requires:any(band("readiness","exhausted","degraded"),fact("formation_exhausted","any"),fact("reserve_exhausted","any")),targetSelector:"highest-pressure",baseUrgency:76,cooldown:4,standingOrder:"The formation remains in place and converts readiness debt into casualties."},
  "reserve-crisis":{id:"reserve-crisis",problemClass:"force-preservation",theaters:allTheaters,requires:any(band("reserveDepth","absent","thin"),band("frontPosture","collapsing","defensive"),fact("reserve_exposed","any")),targetSelector:"highest-pressure",baseUrgency:72,cooldown:4,standingOrder:"No additional reserve is committed; existing formations absorb local pressure."},
  "local-counterstroke":{id:"local-counterstroke",problemClass:"counterstroke",theaters:allTheaters,requires:any(band("enemyPosture","counterstroking","assaulting","exploiting"),scalar("front","gte",1)),targetSelector:"highest-pressure",baseUrgency:80,cooldown:3,standingOrder:"The line receives the counterstroke under its standing methodical posture."},
  ...FUNGIBLE_BLUEPRINT_RULES,
};

export const MANEUVER_AFTERMATH:Record<string,ManeuverAftermathRule>={
  reinforce:{successFact:"salient_reinforced",failureFact:"reserve_exposed",cleanFact:"reserve_available",ttl:3},
  interdict:{successFact:"enemy_fires_displaced",failureFact:"batteries_unlocated",cleanFact:"targeting_data_recovered",ttl:3},
  route:{successFact:"alternate_route_open",failureFact:"engineers_spent",ttl:4},
  abandon:{successFact:"sector_abandoned",failureFact:"reserve_exposed",ttl:6},
  exploit:{successFact:"enemy_dislocated",failureFact:"mobile_reserve_spent",cleanFact:"breakthrough_window",ttl:3},
  breach:{successFact:"obstacle_breached",failureFact:"assault_observed",cleanFact:"enemy_dislocated",ttl:4},
  network:{successFact:"command_net_restored",failureFact:"relay_compromised",cleanFact:"targeting_data_recovered",ttl:3},
};

const activeFacts=(state:CampaignStateView,sectorId?:string)=>((state.operationalFacts??[]).filter(x=>(x.expiresDay===null||x.expiresDay>=state.day)&&(!sectorId||x.sectorId===null||x.sectorId===sectorId)));
const phaseForState=(state:CampaignStateView)=>phaseIdForDay(state.day);

export const operationalBandsFor=(state:CampaignStateView,sector:TheaterSector):OperationalBands=>{
  const effectiveForce=state.deployable*state.readiness/100*state.equipment/100;
  const ratio=effectiveForce/Math.max(1,state.enemy*.52);
  const coverage=state.production.munitions.stock/Math.max(1,state.production.munitions.use);
  const localCoverage=coverage*clamp(sector.supplyAccess/70,.45,1.25);
  const posture=(state.adversary?.posture??"").toLowerCase();
  return{
    frontPosture:state.front<=-8?"collapsing":state.front<=-2?"defensive":state.front<3?"contested":state.front<8?"advancing":"breakthrough",
    forceRatio:ratio<.7?"inferior":ratio<.9?"disadvantaged":ratio<1.15?"parity":ratio<1.45?"superior":"overwhelming",
    readiness:state.readiness<42?"exhausted":state.readiness<58?"degraded":state.readiness<76?"serviceable":"ready",
    supply:localCoverage<1.5?"famine":localCoverage<2.5?"critical":localCoverage<5?"strained":localCoverage<9?"adequate":"surplus",
    reserveDepth:state.reserves<8000?"absent":state.reserves<30000?"thin":state.reserves<75000?"available":"deep",
    network:sector.network,
    intelligence:state.intelligence<30?"blind":state.intelligence<45?"contradictory":state.intelligence<68?"estimated":"confirmed",
    enemyPosture:posture.includes("reconstit")||posture.includes("depth")?"reconstituting":posture.includes("counter")?"counterstroking":posture.includes("assault")?"assaulting":posture.includes("exploit")?"exploiting":"pressuring",
    domesticState:state.legitimacy<22||state.resistance>78?"collapse":state.resistance>=55?"organized-resistance":state.legitimacy<45||state.resistance>35?"brittle":"stable",
    infrastructure:sector.infrastructure<30?"severed":sector.infrastructure<55?"damaged":sector.infrastructure<78?"serviceable":"intact",
  };
};

type GateContext={state:CampaignStateView;sector:TheaterSector;bands:OperationalBands};
const scalarValue=(context:GateContext,key:ScalarKey)=>{
  const {state,sector}=context;
  if(key==="munitionsCoverage")return state.production.munitions.stock/Math.max(1,state.production.munitions.use);
  if(key==="sectorSupply")return sector.supplyAccess;
  if(key==="sectorDamage")return 100-sector.infrastructure;
  if(key==="sectorFortification")return sector.fortification;
  return state[key];
};
export const evaluateGate=(gate:Gate,context:GateContext):boolean=>{
  const scalars:Record<string,number|undefined>={};
  for(const key of ["front","readiness","reserves","intelligence","legitimacy","resistance","dependency","munitionsCoverage","sectorSupply","sectorDamage","sectorFortification"] as ScalarKey[]){
    scalars[key]=scalarValue(context,key);
  }
  const bands:Record<string,string>={};
  for(const [key,value] of Object.entries(context.bands))bands[key]=String(value);
  return evaluateSubstrateGate(gate,{
    phase:phaseForState(context.state),
    theater:context.state.theater,
    bands,
    scalars,
    facts:activeFacts(context.state).map(fact=>({id:fact.id,sectorId:fact.sectorId,createdDay:fact.createdDay})),
    targetSectorId:context.sector.id,
    history:(context.state.situationHistory??[]).map(record=>({
      day:record.day,
      blueprintId:record.blueprintId,
      eventId:record.blueprintId,
    })),
    day:context.state.day,
    campaignDay:context.state.day,
  });
};

const targetSector=(rule:SituationBlueprintRule,sectors:TheaterSector[])=>{
  if(rule.fixedSectorId)return sectors.find(x=>x.id===rule.fixedSectorId)??sectors[0];
  const scored=sectors.map(sector=>{
    const pressure=sector.enemyForceEstimate/Math.max(1,sector.friendlyForce)+(1-sector.control)*.3;
    const score=rule.targetSelector==="lowest-supply"?100-sector.supplyAccess:rule.targetSelector==="weakest-network"?({severed:100,degraded:75,intermittent:45,restored:10}[sector.network]):rule.targetSelector==="most-damaged"?100-sector.infrastructure:rule.targetSelector==="frontline"?Math.abs(sector.control)*-10:pressure*50;
    return{sector,score};
  }).sort((a,b)=>b.score-a.score);
  return scored[0]?.sector??sectors[0];
};

const phaseFit=(problem:ProblemClass,phase:CampaignPhaseId)=>phase==="contact"?(problem==="observation"||problem==="command"?14:0):phase==="compression"?(problem==="logistics"||problem==="assault"?14:0):phase==="exhaustion"?(problem==="force-preservation"||problem==="logistics"?16:0):(problem==="counterstroke"||problem==="exploitation"||problem==="force-preservation"?18:0);
const conditionFit=(problem:ProblemClass,bands:OperationalBands)=>{
  let score=0;
  if(problem==="logistics"&&["famine","critical","strained"].includes(bands.supply))score+=22;
  if(problem==="command"&&["severed","degraded"].includes(bands.network))score+=22;
  if(problem==="force-preservation"&&(["exhausted","degraded"].includes(bands.readiness)||["collapsing","defensive"].includes(bands.frontPosture)))score+=20;
  if(problem==="assault"&&["contested","advancing"].includes(bands.frontPosture))score+=12;
  if(problem==="counterstroke"&&["counterstroking","assaulting","exploiting"].includes(bands.enemyPosture))score+=24;
  if(problem==="exploitation"&&["advancing","breakthrough"].includes(bands.frontPosture))score+=18;
  if(problem==="observation"&&["blind","contradictory"].includes(bands.intelligence))score+=16;
  return score;
};
const strategicFit=(problem:ProblemClass,condition?:StrategicConditionInput)=>{const category=condition?.category.toLowerCase()??"";if(problem==="logistics"&&category.includes("logistic"))return 18;if(problem==="command"&&(category.includes("command")||category.includes("signal")))return 18;if(problem==="force-preservation"&&(category.includes("personnel")||category.includes("home")))return 14;if((problem==="counterstroke"||problem==="exploitation")&&category.includes("enemy"))return 18;return 0;};

const compiledText=(text:string,sector:TheaterSector)=>text.replaceAll("{sector}",sector.name);
const networkLabel=(network:TheaterSector["network"])=>network[0].toUpperCase()+network.slice(1);
const supplyLabel=(supply:OperationalBands["supply"])=>({famine:"Interdicted",critical:"Interdicted",strained:"Rationed",adequate:"Adequate",surplus:"Secure"}[supply]);
const intelLabel=(state:CampaignStateView,bands:OperationalBands)=>`${bands.intelligence[0].toUpperCase()+bands.intelligence.slice(1)} // ${Math.round(clamp(35+state.intelligence*.65,35,92))}%`;

export const compileSituation=(state:CampaignStateView,templates:SituationTemplate[],condition?:StrategicConditionInput):CompiledSituation=>{
  const sectors=(state.theaterSectors?.filter(x=>x.theater===state.theater).length?state.theaterSectors.filter(x=>x.theater===state.theater):initialTheaterSectors(state.theater));
  const history=state.situationHistory??[];const phase=phaseForState(state);
  const sourceTemplates=templates.filter(template=>{const rule=BLUEPRINT_RULES[template.id];return rule?.theaters.includes(state.theater);});
  const calculusTemplates=sourceTemplates.filter(template=>!BLUEPRINT_RULES[template.id]?.writingOnly);
  const buildCandidates=(respectCooldown:boolean)=>calculusTemplates.flatMap(template=>{
    const rule=BLUEPRINT_RULES[template.id];if(!rule)return[];
    const sector=targetSector(rule,sectors);if(!sector)return[];const bands=operationalBandsFor(state,sector);const context={state,sector,bands};
    if(!evaluateGate(rule.requires,context)||rule.forbids&&evaluateGate(rule.forbids,context))return[];
    const last=history.find(x=>(x.calculusBlueprintId??x.blueprintId)===template.id);if(respectCooldown&&last&&state.day-last.day<rule.cooldown)return[];
    const recentSector=history.filter(x=>x.sectorId===sector.id&&state.day-x.day<=5).length;
    const factWeight=activeFacts(state,sector.id).length*2.5;
    const novelty=-recentSector*9-(last?Math.max(0,rule.cooldown-(state.day-last.day))*5:0);
    const noise=stableHash(`${state.campaignSeed}:${state.day}:${template.id}:${sector.id}:${CALCULUS_VERSION}`)*12;
    const score=rule.baseUrgency+phaseFit(rule.problemClass,phase)+conditionFit(rule.problemClass,bands)+strategicFit(rule.problemClass,condition)+factWeight+novelty+noise;
    return[{template,rule,sector,bands,score}];
  });
  let candidates=buildCandidates(true);if(!candidates.length)candidates=buildCandidates(false);
  if(!candidates.length){const template=templates.find(x=>BLUEPRINT_RULES[x.id]?.theaters.includes(state.theater))??templates[0];const rule=BLUEPRINT_RULES[template.id];const sector=targetSector(rule,sectors);const bands=operationalBandsFor(state,sector);candidates=[{template,rule,sector,bands,score:0}];}
  candidates.sort((a,b)=>b.score-a.score||a.template.id.localeCompare(b.template.id));const chosen=candidates[0];
  const unseenWriting=sourceTemplates.filter(template=>!history.some(record=>record.blueprintId===template.id));
  const alignedWriting=unseenWriting.filter(template=>BLUEPRINT_RULES[template.id]?.problemClass===chosen.rule.problemClass);
  const writingDeck=alignedWriting.length?alignedWriting:unseenWriting.length?unseenWriting:[chosen.template];
  const narrative=writingDeck[Math.floor(stableHash(`${state.campaignSeed}:${state.day}:${chosen.template.id}:situation-writing:${CONTENT_PACK_VERSION}`)*writingDeck.length)]??chosen.template;
  const facts=activeFacts(state,chosen.sector.id).map(x=>FACT_CATALOG[x.id]?.label??x.id);
  const maneuvers=dailyManeuverDocket(state,chosen.template);
  const maneuverPresentations=compileManeuverPresentations(
    state,
    narrative,
    chosen.rule,
    chosen.sector,
    maneuvers,
    priorPresentedManeuverLabels(state,templates),
  );
  const aftermathFacts=[...new Set(maneuvers.flatMap(id=>{const rule=MANEUVER_AFTERMATH[id];return rule?[rule.successFact,rule.failureFact,...(rule.cleanFact?[rule.cleanFact]:[])]:[]}).map(id=>FACT_CATALOG[id]?.label??id))];
  const ticket=`${CALCULUS_VERSION}:${hashInt(`${state.campaignSeed}:${state.day}:${chosen.template.id}:${chosen.sector.id}:resolution`).toString(16).padStart(8,"0")}`;
  const selectionBasis=`${candidates.length} ELIGIBLE CALCULUS // ${unseenWriting.length} UNSEEN AUTHORED SITUATIONS // ${phase.toUpperCase()} PHASE // ${chosen.bands.frontPosture.toUpperCase()} FRONT // ${chosen.bands.supply.toUpperCase()} SUPPLY // ${condition?.label.toUpperCase()??"NO STRATEGIC CONDITION"}`;
  return{
    ...narrative,maneuvers,id:`${narrative.id}:d${state.day}:${chosen.sector.id}`,day:state.day,blueprintId:narrative.id,calculusBlueprintId:chosen.template.id,problemClass:chosen.rule.problemClass,sectorId:chosen.sector.id,contentPackVersion:CONTENT_PACK_VERSION,
    theater:state.theater,sector:chosen.sector.name,headline:compiledText(narrative.headline,chosen.sector),briefing:compiledText(narrative.briefing,chosen.sector),question:compiledText(narrative.question,chosen.sector),
    terrain:chosen.sector.terrain,ground:chosen.sector.ground,network:networkLabel(chosen.sector.network),supply:supplyLabel(chosen.bands.supply),intelligence:intelLabel(state,chosen.bands),
    selectionScore:Number(chosen.score.toFixed(2)),candidateCount:candidates.length,selectionBasis,resolutionTicket:ticket,triggeringFacts:facts,bands:chosen.bands,standingOrder:chosen.rule.standingOrder,aftermathFacts,
    maneuverPresentations,
  };
};

const addFact=(facts:OperationalFact[],fact:OperationalFact)=>{
  const existing=facts.find(x=>x.id===fact.id&&x.sectorId===fact.sectorId);if(existing){existing.createdDay=fact.createdDay;existing.expiresDay=fact.expiresDay;existing.intensity=Math.max(existing.intensity,fact.intensity);existing.source=fact.source;return;}facts.push(fact);
};
const removeFact=(facts:OperationalFact[],id:string,sectorId:string)=>facts.filter(x=>!(x.id===id&&(x.sectorId===sectorId||x.sectorId===null)));
const improveNetwork=(network:TheaterSector["network"])=>network==="severed"?"degraded":network==="degraded"?"intermittent":"restored";
const degradeNetwork=(network:TheaterSector["network"])=>network==="restored"?"intermittent":network==="intermittent"?"degraded":"severed";

export const resolveSituationAftermath=(state:CampaignStateView,situation:CompiledSituation,maneuverId:string|null,band:OutcomeBand,margin:number,groundMovement:number)=>{
  const sectors=(state.theaterSectors??initialTheaterSectors(state.theater)).map(x=>({...x,neighbors:[...x.neighbors]}));
  let facts=(state.operationalFacts??initialOperationalFacts(state.theater)).filter(x=>x.expiresDay===null||x.expiresDay>=state.day).map(x=>({...x}));
  const history=(state.situationHistory??[]).map(x=>({...x,factsCreated:[...x.factsCreated],presentedManeuverLabels:x.presentedManeuverLabels?[...x.presentedManeuverLabels]:undefined}));const sector=sectors.find(x=>x.id===situation.sectorId)??sectors[0];const created:string[]=[];
  const success=band==="clean"||band==="executed";const rule=maneuverId?MANEUVER_AFTERMATH[maneuverId]:undefined;
  const create=(id:string,ttl:number,intensity=1)=>{const definition=FACT_CATALOG[id];if(!definition)return;addFact(facts,{id,sectorId:sector.id,createdDay:state.day,expiresDay:ttl<0?null:state.day+ttl,intensity,source:`${situation.blueprintId.toUpperCase()} // ${maneuverId?.toUpperCase()??"STANDING ORDER"} // ${outcomeBandLabel[band]}`,visible:true});created.push(id);};
  if(rule){create(success?rule.successFact:rule.failureFact,rule.ttl,band==="clean"||band==="collapse"?1.25:1);if(band==="clean"&&rule.cleanFact)create(rule.cleanFact,Math.max(2,rule.ttl-1),1);}
  const strength=band==="clean" ? 1.25 : band==="executed" ? 1 : band==="disrupted" ? .45 : -.35;
  if(maneuverId==="reinforce"){sector.control=clamp(sector.control+.07*strength,-1,1);sector.fortification=clamp(sector.fortification+6*Math.max(0,strength),0,100);if(!success)sector.network=degradeNetwork(sector.network);}
  if(maneuverId==="interdict"){sector.enemyForceEstimate=Math.max(0,sector.enemyForceEstimate-Math.round(4500*Math.max(0,strength)));sector.infrastructure=clamp(sector.infrastructure-2*Math.max(0,strength),0,100);}
  if(maneuverId==="route"){sector.supplyAccess=clamp(sector.supplyAccess+14*strength,0,100);sector.infrastructure=clamp(sector.infrastructure+8*strength,0,100);if(success)facts=removeFact(facts,"infrastructure_severed",sector.id);}
  if(maneuverId==="abandon"){sector.control=clamp(sector.control-(success ? .18 : .28),-1,1);sector.fortification=clamp(sector.fortification-5,0,100);facts=removeFact(facts,"salient_exists",sector.id);facts=removeFact(facts,"salient_reinforced",sector.id);}
  if(maneuverId==="exploit")sector.control=clamp(sector.control+(success ? .15 : -.09),-1,1);
  if(maneuverId==="breach"){sector.fortification=clamp(sector.fortification-(success?18:3),0,100);if(success)facts=removeFact(facts,"obstacle_belt_prepared",sector.id);}
  if(maneuverId==="network"){sector.network=success?improveNetwork(sector.network):degradeNetwork(sector.network);if(success){facts=removeFact(facts,"command_net_severed",sector.id);facts=removeFact(facts,"relay_compromised",sector.id);}}
  if(!maneuverId&&state.readiness<50)create("formation_exhausted",3,1);
  history.unshift({day:state.day,blueprintId:situation.blueprintId,calculusBlueprintId:situation.calculusBlueprintId,situationId:situation.id,sectorId:sector.id,maneuverId,outcomeBand:band,margin,groundMovement,factsCreated:created,presentedManeuverLabels:Object.values(situation.maneuverPresentations).map(presentation=>presentation.label)});
  return{theaterSectors:sectors,operationalFacts:facts,situationHistory:history.slice(0,60),createdFacts:created.map(id=>FACT_CATALOG[id])};
};

export const auditCampaignSubstrate=(templates:SituationTemplate[],maneuverIds:string[])=>{
  const issues:string[]=[];const known=new Set(maneuverIds);
  if(Object.keys(FACT_CATALOG).length<25)issues.push("Fact catalog contains fewer than 25 registered facts.");
  for(const theater of allTheaters)if(THEATER_SECTORS.filter(x=>x.theater===theater).length<6)issues.push(`${theater} contains fewer than six sectors.`);
  for(const template of templates){const rule=BLUEPRINT_RULES[template.id];if(!rule)issues.push(`${template.id} has no blueprint rule.`);if(template.maneuvers.length<3)issues.push(`${template.id} exposes fewer than three maneuvers.`);if(!template.maneuvers.some(x=>x==="abandon"||x==="reinforce"))issues.push(`${template.id} lacks a force-preservation maneuver.`);for(const id of template.maneuvers)if(!known.has(id))issues.push(`${template.id} references unknown maneuver ${id}.`);}
  return issues;
};
