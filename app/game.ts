import { NO_ACTION_DAILY_FRONT_LOSS, adversaryCircuit, diplomacyCircuit, domesticCircuit, executeCircuit, forceGenerationCircuit, operationsCircuit, productionCircuit, type AdversaryLedger, type AdversaryState, type DiplomacyLedger, type DiplomaticActor, type DomesticLedger, type ForceGenerationLedger, type OperationsLedger, type ProductionLedger, type TrainingCohort } from "./circuits";
import {
  BLUEPRINT_RULES, CONTENT_PACK_VERSION, FACT_CATALOG, GENERIC_SITUATION_TEMPLATES,
  MANEUVER_AFTERMATH, auditCampaignSubstrate, compileSituation, deterministicRoll,
  initialOperationalFacts, initialTheaterSectors, outcomeBandForMargin, outcomeBandLabel, resolveSituationAftermath,
  type CompiledSituation, type OperationalFact, type OutcomeBand,
  type SituationHistoryRecord, type SituationTemplate, type Theater as SubstrateTheater,
  type TheaterSector,
} from "./campaign-substrate";
import { composeWarDispatch } from "./war-dispatch";
import { OPPORTUNITY_CATEGORY_LABELS, OPPORTUNITY_SPINES, type OpportunityCategory } from "./opportunity-corpus";
import { OPPORTUNITY_RESPONSE_FLAVOR } from "./opportunity-flavor";
import { SUB_MISSION_CONTENT_VERSION, SUB_MISSION_SCHEMA_VERSION, compileSubMissionDocket, subMissionArchetypeById, subMissionFrameById, type DailySubMissionDocket, type SubMissionDomain, type SubMissionHistoryRecord } from "./submission-schema";
import { EARLIEST_MODELED_VICTORY_DAY, campaignBalanceProfile } from "./campaign-balance";
import { campaignSeedId } from "./campaign-id";
import { ADDITIONAL_DIRECTIVE_FAMILIES, DIRECTIVE_CATEGORY_OVERRIDES, DIRECTIVE_CHOICE_ADDITIONS } from "./directive-expansion";
import { ADDITIONAL_CAMPAIGN_EVENTS, CAMPAIGN_EVENT_CALCULUS } from "./campaign-event-expansion";

export { CAMPAIGN_SEED_NAME_COUNT, campaignSeedId } from "./campaign-id";

export type Module = "dashboard" | "campaign" | "national" | "military" | "diplomacy" | "doctrine" | "account" | "wiki";
export type Resource = "munitions" | "armor" | "flight" | "drones";
export type Tempo = "hold" | "methodical" | "surge" | "human-wave";
export type NetworkPosture = "broadcast" | "dark" | "distributed";
export type Tone = "good" | "warn" | "bad";
export type Theater = SubstrateTheater;
export type CampaignConfig = { seed:number; archetype:string; adversaryPersonality:string; theater:Theater };
export const DAILY_ORDERS = 3;
export const campaignAlternateDomainsForState=(state:Pick<GameState,"campaignSeed"|"day">):SubMissionDomain[]=>{
  let value=(Math.imul(state.campaignSeed|0,0x45d9f3b)^Math.imul(state.day,0x27d4eb2d))>>>0;
  value=Math.imul(value^(value>>>16),0x45d9f3b)>>>0;
  const rotation=value%3;
  if(rotation===0)return["domestic"];
  if(rotation===1)return["domestic","network"];
  return["network"];
};

export type OpportunityEffect = Partial<{
  enemyForce:number; enemyMunitions:number; enemyReadiness:number; enemyEquipment:number;
  intelligence:number; readiness:number; equipment:number; materiel:number; friendlyPressure:number;
  munitions:number; armor:number; flight:number; drones:number; treasury:number; legitimacy:number;
  resistance:number; dependency:number; atrocityExposure:number; reciprocity:number;
}>;
export type OpportunityResponse = {
  id:string; label:string; flavor:string; exact:string[]; contingent:string[]; chance:number;
  cost?:Partial<Record<Resource,number>>; commit?:OpportunityEffect; success:OpportunityEffect; failure?:OpportunityEffect;
};
export type OpportunityTemplate = {
  id:string; category:OpportunityCategory; categoryLabel:string; sourceSpine:string; label:string;
  individual:string; headline:string; brief:string; responses:OpportunityResponse[];
};
export type OpportunityPacket = OpportunityTemplate & {
  sector:string; ticket:string; occurrence:number; opensAtFraction:number; closesAtFraction:number;
};
export type OpportunityCommitment = { day:number; opportunityId:string; responseId:string };
export type OpportunityHistoryRecord = {
  day:number; opportunityId:string; responseId:string; label:string; response:string;
  outcome:"exploited"|"missed"|"expired"; report:string; friendlyPressure?:number; category?:OpportunityCategory;
};
export type OpportunityAssignment = {
  campaignId:string; day:number; opportunityId:string; occurrence:number;
  status:"opened"|"acted"|"expired"; openedAt:number; updatedAt:number;
};
export type DiplomaticMetric="trust"|"leverage"|"dependency"|"obligation"|"aidPipeline"|"sanctionsExposure";
export type DiplomaticEffect={actorId:string;metric:DiplomaticMetric;perDay:number};
export type ActiveDiplomacyAction = { familyId:string; choiceId:string; startedDay:number; expiresDay:number; actorEffects?:DiplomaticEffect[] };

export type StrategicSnapshot = {
  day:number;front:number;armed:number;deployable:number;readiness:number;equipment:number;materiel:number;
  treasury:number;legitimacy:number;resistance:number;dependency:number;intelligence:number;desertionPressure:number;
};

export type DailyResolutionRecord = {
  schemaVersion:1;resolvedDay:number;phaseId:CampaignPhaseId;eventId:string;sector:string;blueprintId:string;
  opening:StrategicSnapshot;closing:StrategicSnapshot;
  orders:{used:number;unused:number;maneuverId:string|null;directives:Array<{familyId?:string;choiceId?:string;family:string;choice:string;domain?:SubMissionDomain;missionId?:string}>};
  operations:OperationsLedger;production:ProductionLedger;forceGeneration:ForceGenerationLedger;domestic:DomesticLedger;diplomacy:DiplomacyLedger;
  adversaryObserved:{estimatedForce:number;estimateLow:number;estimateHigh:number;observedOrders:string[];hiddenOrders:number;signals:string[]};
  personnel:{combatLosses:number;desertionAttempts:number;retained:number;intercepted:number;netDesertion:number;effectiveGraduates:number;deployableAssigned:number};
  outcome:{groundMovement:number;outcomeBand:OutcomeBand;doctrineGain:number;factsCreated:string[]};
};

export type GameState = {
  saveVersion:number; contentPackVersion:string; campaignId:string; campaignSeed:number; stateArchetype:string; adversaryPersonality:string; theater:Theater;
  day: number; actions: number; status: "active" | "victory" | "defeat"; victorySecuredDay:number|null;
  population: number; workforce: number; armed: number; deployable: number;
  voluntary: number; forced: number; queue: number; training: number; duration: number; quality: number;
  trainingCohorts: TrainingCohort[]; reserves:number; forceGenerationLedger:ForceGenerationLedger|null;
  readiness: number; equipment: number; materiel: number; treasury: number; legitimacy: number; resistance: number;
  dependency: number; intelligence: number; front: number; enemy: number;
  doctrine: number; doctrineEarned: number; doctrineWinAwards: { day:number; action:string; verified:string; reward:number }[]; affinityProofs: Record<string,number>; atrocityExposure: number; reciprocity: number; desertionPressure: number;
  deserters: number; retained: number; intercepted: number; patrolCommitment: number;
  target: Resource | "balanced"; pendingTarget: Resource | "balanced" | null; tempo: Tempo; networkPosture:NetworkPosture; maneuver: string | null;
  maintenanceDebt: number; productionLedger: ProductionLedger | null; operationsLedger:OperationsLedger|null; domesticLedger:DomesticLedger|null; diplomacyLedger:DiplomacyLedger|null;actors:DiplomaticActor[];adversary:AdversaryState;adversaryLedger:AdversaryLedger|null;
  production: Record<Resource, { allocation: number; stock: number; output: number; use: number }>;
  active: Record<string, string>; locks: Record<string, number>; scheduled: Scheduled[];
  activeDiplomacy:ActiveDiplomacyAction[];
  unlocked: string[]; decisions: { day: number; family: string; choice: string; familyId?:string; choiceId?:string; domain?:SubMissionDomain; missionId?:string; resolutionTicket?:string }[];
  eventHistory:{day:number;phase:string;event:string;eventId:string;calculusId?:string;trigger:string}[];
  opportunityCommitment:OpportunityCommitment|null; opportunityHistory:OpportunityHistoryRecord[];
  opportunityAssignments:OpportunityAssignment[]; accountOpportunityIds:string[];
  theaterSectors:TheaterSector[]; operationalFacts:OperationalFact[]; situationHistory:SituationHistoryRecord[]; currentSituation:CompiledSituation|null;
  currentSubMissions:DailySubMissionDocket|null;subMissionHistory:SubMissionHistoryRecord[];resolutionHistory:DailyResolutionRecord[];
  reports: { day: number; title: string; body: string; tone: Tone; epigraph?: string }[];
};

type NumberKey = { [K in keyof GameState]: GameState[K] extends number ? K : never }[keyof GameState];
type Delta = Partial<Record<NumberKey, number>>;
type Scheduled = { day: number; source: string; delta: Delta };

export type Choice = {
  id: string; label: string; flavor: string; exact: string[]; risk: string[];
  delta?: Delta; tick?: Delta; delay?: { days: number; delta: Delta };
  target?: GameState["target"]; tempo?: Tempo; networkPosture?:NetworkPosture; doctrine?: number; duration?:number;
  actorEffects?:DiplomaticEffect[];
};

export type Family = {
  id: string; module: Exclude<Module, "dashboard" | "campaign" | "doctrine" | "wiki">; category: string;
  label: string; brief: string; lock: number; choices: Choice[];
};

export type Maneuver = {
  id: string; label: string; flavor: string; exact: string[]; risk: string[];
  success: number; casualty: number; supply: number; successPressure: number; failurePressure: number; commitment:number;
  vector: string; readiness?: number; reciprocity?: number; ownedDelta?:Delta; resourceUse?:Partial<Record<Resource,number>>;
};

export type Situation = CompiledSituation;
export type { CompiledSituation, OperationalFact, OutcomeBand, SituationHistoryRecord, SituationTemplate, TheaterSector };

export type DoctrineStage = { id: string; label: string; cost: number; description: string; effect: string; output?: string; affects?: string; delta?: Delta; quote?: string; attribution?: string; severity?: "grave"|"extreme"|"total" };
export type DoctrineVector = { id: string; label: string; authority: string; quote: string; forbidden?: boolean; stages: DoctrineStage[] };

const c = (id: string, label: string, flavor: string, exact: string[], risk: string[], extra: Partial<Choice> = {}): Choice => ({ id, label, flavor, exact, risk, ...extra });

export type CampaignArchetype = { id:string; label:string; difficulty:string; brief:string; quote:string; modifiers:string[] };
export type AdversaryPersonality = { id:string; label:string; difficulty:string; brief:string; doctrine:string; modifiers:string[] };
export type TheaterDefinition = { id:Theater; label:string; brief:string; pressure:string; quote:string };
export type CampaignPhaseId="contact"|"compression"|"exhaustion"|"terminal";
export type DirectorModifiers={productionOutput:number;supplyUse:number;casualty:number;desertion:number;confidence:number;friendlyPressure:number;enemyPressure:number;supplyConversion:number;legitimacy:number;resistance:number;maintenance:number;treasury:number};
export type CampaignPhase={id:CampaignPhaseId;label:string;days:[number,number];brief:string;quote:string;exact:string[];modifiers:Partial<DirectorModifiers>};
export type CampaignEvent={id:string;label:string;category:string;phases:CampaignPhaseId[];brief:string;report:string;quote:string;exact:string[];risk:string[];modifiers:Partial<DirectorModifiers>;trigger?:string;calculusId?:string};
export type CampaignDirector={phase:CampaignPhase;event:CampaignEvent;modifiers:DirectorModifiers;trigger:string};

export const STATE_ARCHETYPES:CampaignArchetype[]=[
  {id:"siege-state",label:"The Siege State",difficulty:"SEVERE",brief:"The magazines were filled by starving everything that could object. You inherit shells, coercive capacity, and a population already familiar with the word temporary.",quote:"A city under siege eventually learns that every door is military infrastructure.",modifiers:["Munitions stock +38,000","Legitimacy -6","Resistance +8","Materiel Condition -4"]},
  {id:"industrial-republic",label:"The Industrial Republic",difficulty:"STANDARD",brief:"The factories still answer the bell. The army does not. Your state can replace machines faster than it can explain why men should enter them.",quote:"The furnace votes continuously. Its ballot is output.",modifiers:["Workforce +650,000","Materiel Condition +10","Equipment Coverage +4","Deployable Force -32,000","Treasury +18 B"]},
  {id:"conscription-directorate",label:"The Conscription Directorate",difficulty:"HARD",brief:"The state solved its manpower shortage by declaring that nobody possessed a private future. The induction system is full. The country is not persuaded.",quote:"Universal obligation is the cleanest phrase ever applied to a crowded train.",modifiers:["Armed Forces +60,000","Forced Intake +12,000/day","Training Queue +50,000","Training Quality -8","Legitimacy -9","Resistance +10"]},
  {id:"mercantile-compact",label:"The Mercantile Compact",difficulty:"STANDARD",brief:"Credit, access, and discretion have kept the front supplied. None of them belong to you. Every foreign delivery arrives with a second manifest.",quote:"A neutral port is an alliance priced by the hour.",modifiers:["Treasury +95 B","Foreign Aid Pipelines +10","Dependency +18","Munitions stock -25,000","Armed Forces -45,000"]},
  {id:"officer-regency",label:"The Officer Regency",difficulty:"HARD",brief:"The army administers the state because the state could no longer administer the army. Staff work is excellent. Consent has been postponed without a return date.",quote:"When the general staff becomes the government, every shortage becomes an order.",modifiers:["Readiness +12","Intelligence +14","Equipment Coverage +5","Voluntary Intake -3,000/day","Legitimacy -4","Resistance +3"]},
  {id:"ruined-federation",label:"The Ruined Federation",difficulty:"EXTREME",brief:"Several capitals still issue stationery. Only one still issues ammunition. You begin with experienced observers, broken transport, and a front already inside the old border.",quote:"A federation ends twice: first in law, then at the last functioning depot.",modifiers:["Population -1,800,000","Workforce -1,000,000","Front -2.0 km","Materiel Condition -15","Equipment Coverage -12","Treasury -80 B","Insight Points +90"]},
];

export const ADVERSARY_PERSONALITIES:AdversaryPersonality[]=[
  {id:"attritional",label:"The Exhaustion Staff",difficulty:"HARD",brief:"It treats time as a weapons system and accepts ugly exchange ratios whenever your replacements are worse.",doctrine:"Mass, fire schedules, replacement depth",modifiers:["Enemy Force +65,000","Enemy Munitions +35,000","Enemy Munitions Output +4,000/day","Enemy Readiness -4","Sustained pressure and reinforcement increase"]},
  {id:"adaptive",label:"The Pattern Directorate",difficulty:"HARD",brief:"It records repetition as confession. Reusing a maneuver teaches the enemy twice as quickly and changes the countermeasure package.",doctrine:"Observation, deception, countermeasure cycling",modifiers:["Enemy adaptation accrues 2 levels per repeated maneuver","Each level reduces Execution Confidence by 1.5%","Deception and network interference improve"]},
  {id:"opportunist",label:"The Counterstroke School",difficulty:"SEVERE",brief:"It preserves force until your line becomes locally embarrassed, then converts the embarrassment into a larger problem.",doctrine:"Concentration, exploitation, pursuit",modifiers:["Enemy Force -20,000","Enemy Readiness +8","Enemy Equipment +6","Counterstrokes gain pressure and lethality"]},
  {id:"cautious",label:"The Preservation Command",difficulty:"STANDARD",brief:"It would rather keep a good army than win a bad afternoon. Ground comes slowly; equipment and readiness do not.",doctrine:"Defense in depth, reconstitution, denial",modifiers:["Enemy Force -15,000","Enemy Readiness +10","Enemy Equipment +8","Enemy pressure reduced","Enemy reconstitution threshold increased"]},
];

export const THEATERS:TheaterDefinition[]=[
  {id:"lowland",label:"The Lowland Corridor",brief:"Open ground, saturated roads, long artillery sightlines, and too few alternate routes. Supply is visible because everything is visible.",pressure:"Maneuver and supply conversion",quote:"The plain provides no cover from arithmetic."},
  {id:"ridge",label:"The Ridge System",brief:"Prepared heights, obstacle belts, narrow passages, and observation that survives every failed assault.",pressure:"Frontage, mines, and assault geometry",quote:"High ground is merely a casualty advantage with a view."},
  {id:"industrial",label:"The Industrial Basin",brief:"Factories, rail cuts, worker districts, buried cable, and structures sturdy enough to become fortifications by accident.",pressure:"Networks, rubble, and civilian allocation",quote:"A factory district produces weapons even after production stops."},
  {id:"river",label:"The River Principalities",brief:"Locks, levees, ferries, drowned approaches, and crossings that make every operational plan depend on a civil engineer.",pressure:"Engineering, weather, and crossing custody",quote:"A river is a border that submits daily revisions."},
];

export const CAMPAIGN_PHASES:CampaignPhase[]=[
  {id:"contact",label:"Contact and Classification",days:[1,5],brief:"The armies are still discovering which prewar assumptions survived first contact. Information is valuable because institutions have not yet learned to counterfeit it.",quote:"The first map of a war is a list of things that failed to remain true.",exact:["Combat casualty factor ×0.94","Desertion flow ×0.92","Industrial output ×1.02"],modifiers:{casualty:.94,desertion:.92,productionOutput:1.02}},
  {id:"compression",label:"Operational Compression",days:[6,12],brief:"Routes, reserves, and timetables have narrowed. Every useful asset is now close enough to the front to be consumed by it.",quote:"Concentration is legal. Concentration is powerful. Concentration is targetable.",exact:["Supply use ×1.08","Enemy front pressure +0.10 km","Industrial output ×0.98","Combat casualty factor ×1.04"],modifiers:{supplyUse:1.08,enemyPressure:.1,productionOutput:.98,casualty:1.04}},
  {id:"exhaustion",label:"The Exhaustion Season",days:[13,20],brief:"Replacement quality falls, maintenance becomes selective, and political language begins losing the ability to conceal arithmetic.",quote:"An exhausted state can still issue orders. It merely loses control over what obeys them.",exact:["Combat casualty factor ×1.12","Desertion flow ×1.18","Industrial output ×0.92","Maintenance debt +1.5/day","Enemy front pressure +0.18 km"],modifiers:{casualty:1.12,desertion:1.18,productionOutput:.92,maintenance:1.5,enemyPressure:.18}},
  {id:"terminal",label:"Terminal Operations",days:[21,30],brief:"The campaign has entered the interval where defeat, victory, and administrative collapse can arrive in the same report.",quote:"The last reserve is not a formation. It is the remaining difference between intent and fact.",exact:["Combat casualty factor ×1.22","Desertion flow ×1.30","Industrial output ×0.86","Execution Confidence -3%","Enemy front pressure +0.30 km"],modifiers:{casualty:1.22,desertion:1.3,productionOutput:.86,confidence:-.03,enemyPressure:.3}},
];

export const CAMPAIGN_EVENTS:CampaignEvent[]=[
  {id:"surveyors-dawn",label:"Surveyors at Dawn",category:"WEATHER AND OBSERVATION",phases:["contact"],brief:"Night fog withdrew before either artillery staff finished exploiting it. Survey parties can now correct the map in full view of the enemy.",report:"Survey control improved execution while exposed movement reduced the protection of uncertainty.",quote:"Visibility is intelligence shared with the enemy.",exact:["Execution Confidence +4%","Friendly casualty factor ×0.96"],risk:["Enemy classification improves with every exposed movement"],modifiers:{confidence:.04,casualty:.96}},
  {id:"first-rail-cut",label:"The First Rail Cut",category:"LOGISTICS",phases:["contact"],brief:"A single crater has separated the timetable from the railway. Every supply bureau still possesses its original schedule.",report:"The rail cut reduced industrial delivery and increased the cost of every unit reaching the front.",quote:"A timetable survives interruption longer than a train does.",exact:["Supply use ×1.14","Industrial output ×0.95"],risk:["A second interruption may create a critical coverage day"],modifiers:{supplyUse:1.14,productionOutput:.95}},
  {id:"phantom-reserve",label:"The Phantom Reserve",category:"INTELLIGENCE",phases:["contact"],brief:"Three sources report an enemy reserve at three mutually exclusive grid references. All three sources previously survived vetting.",report:"False reserve indicators degraded execution and permitted additional enemy pressure.",quote:"Corroboration is not truth when every witness inherited the same lie.",exact:["Execution Confidence -6%","Enemy front pressure +0.12 km"],risk:["The false disposition may conceal a real concentration"],modifiers:{confidence:-.06,enemyPressure:.12}},
  {id:"open-sky",label:"Clear Weather Without Air Superiority",category:"AIR AND EXPOSURE",phases:["contact"],brief:"Cloud cover has disappeared. Fire correction improves. So does every enemy observer's view of the reserve routes.",report:"Clear weather increased tactical conversion and the price of visible movement.",quote:"A clear sky is neutral only to those without an army beneath it.",exact:["Execution Confidence +2%","Friendly front pressure +0.08 km","Combat casualty factor ×1.08"],risk:["Committed reserves are classified earlier"],modifiers:{confidence:.02,friendlyPressure:.08,casualty:1.08}},
  {id:"junction-priority",label:"The Junction Receives Priority",category:"LOGISTICS",phases:["compression"],brief:"Civil and military rail authorities have agreed that one must become subordinate. The agreement does not specify who will count the consequences.",report:"Priority routing improved military throughput while the civil network absorbed the delay.",quote:"Priority is merely scarcity with a signature.",exact:["Industrial output ×1.04","Supply use ×0.92","Resistance +0.4 at resolution"],risk:["Civil distribution failures may outlast the order"],modifiers:{productionOutput:1.04,supplyUse:.92,resistance:.4}},
  {id:"relay-harvest",label:"Forty-Seven Minutes of Enemy Traffic",category:"SIGNALS",phases:["compression"],brief:"A displaced relay entered the enemy net and was accepted. Pattern analysts have less than one hour before authentication discipline returns.",report:"Captured traffic improved execution and restored part of the supply conversion chain.",quote:"A network reveals its doctrine whenever it believes nobody is listening.",exact:["Execution Confidence +6%","Supply conversion ×1.05"],risk:["The collection window closes at resolution"],modifiers:{confidence:.06,supplyConversion:1.05}},
  {id:"relief-column",label:"Enemy Relief Column Identified",category:"ENEMY OPERATIONS",phases:["compression"],brief:"A fresh enemy column has entered the theater without dispersing. Its route is known. Its destination is not.",report:"The relief column imposed immediate pressure and raised battlefield loss exposure.",quote:"Reinforcement is a future problem moving in column.",exact:["Enemy front pressure +0.28 km","Combat casualty factor ×1.06"],risk:["Failure to arrest the column preserves its strength for tomorrow"],modifiers:{enemyPressure:.28,casualty:1.06}},
  {id:"staff-conference",label:"The Staff Conference Continues",category:"COMMAND",phases:["compression"],brief:"Every directorate has supplied a representative. No directorate has supplied authority to concede its own priority.",report:"Additional planning improved execution while the line surrendered time.",quote:"Coordination is the period during which responsibility learns to travel.",exact:["Execution Confidence +8%","Friendly front pressure -0.15 km"],risk:["The plan improves after the opportunity begins closing"],modifiers:{confidence:.08,friendlyPressure:-.15}},
  {id:"replacement-refusal",label:"Replacement Battalion Refuses Embarkation",category:"PERSONNEL",phases:["exhaustion"],brief:"The battalion is formed, equipped, and present at the platform. It has become unavailable through collective stillness.",report:"Embarkation refusal increased desertion flow and entered the domestic legitimacy ledger.",quote:"A formation can mutiny without moving.",exact:["Desertion flow ×1.30","Legitimacy -0.8 at resolution"],risk:["Public punishment may convert refusal into a symbol"],modifiers:{desertion:1.3,legitimacy:-.8}},
  {id:"bearing-sequence",label:"Bearings Fail in Sequence",category:"MATERIEL",phases:["exhaustion"],brief:"Three factories report unrelated bearing failures using the same procurement batch number. The batch predates the war and the official responsible for accepting it.",report:"Cascading bearing failures reduced output and deepened maintenance debt.",quote:"Sabotage and procurement become indistinguishable after the archive burns.",exact:["Industrial output ×0.82","Maintenance debt +3 at resolution"],risk:["Repair stock may be consumed before the causal batch is isolated"],modifiers:{productionOutput:.82,maintenance:3}},
  {id:"burial-details",label:"Burial Details Reassigned",category:"PERSONNEL",phases:["exhaustion"],brief:"Rear-area units have been ordered forward. Line infantry will recover the dead between rotations or leave them as terrain information.",report:"Reassignment preserved fighting strength while increasing personnel flight.",quote:"The dead require manpower until somebody decides they do not.",exact:["Combat casualty factor ×0.97","Desertion flow ×1.12","Legitimacy +0.4 at resolution"],risk:["Unrecovered casualties amplify later public disclosure"],modifiers:{casualty:.97,desertion:1.12,legitimacy:.4}},
  {id:"ration-script",label:"Rations Become a Second Currency",category:"HOME FRONT",phases:["exhaustion"],brief:"Military ration chits now clear debts in three industrial districts. The treasury denies issuing a currency it cannot redeem.",report:"Ration substitution reduced military consumption and increased domestic resistance.",quote:"A state creates money whenever it creates something people cannot refuse.",exact:["Supply use ×0.90","Resistance +1.2 at resolution","Legitimacy -0.5 at resolution"],risk:["Black-market authority may survive restored supply"],modifiers:{supplyUse:.9,resistance:1.2,legitimacy:-.5}},
  {id:"national-reserve",label:"The National Reserve Is Released",category:"TERMINAL OPERATIONS",phases:["terminal"],brief:"The formation preserved for continuity of government has been transferred to operational command. Continuity will now be attempted by winning.",report:"The national reserve increased pressure and confidence at exceptional casualty exposure.",quote:"The purpose of a reserve is not to remain intact.",exact:["Friendly front pressure +0.35 km","Execution Confidence +5%","Combat casualty factor ×1.22"],risk:["No equivalent reserve remains after resolution"],modifiers:{friendlyPressure:.35,confidence:.05,casualty:1.22}},
  {id:"archive-fires",label:"The General Staff Burns Its Archive",category:"COMMAND SECURITY",phases:["terminal"],brief:"Classified files are being destroyed faster than they can be inventoried. Current orders now depend on memory and surviving carbon copies.",report:"Archive destruction degraded execution and surrendered additional pressure to the enemy.",quote:"An institution erases its past immediately before losing control of its future.",exact:["Execution Confidence -8%","Enemy front pressure +0.15 km"],risk:["Destroyed provenance cannot be reconstructed after the campaign"],modifiers:{confidence:-.08,enemyPressure:.15}},
  {id:"last-bridge",label:"The Last Serviceable Bridge",category:"LOGISTICS",phases:["terminal"],brief:"All heavy movement now crosses one span whose maintenance file contains the phrase temporary restriction eleven times.",report:"Bridge custody reduced supply conversion and consumed additional transport capacity.",quote:"The last bridge is a headquarters with load limits.",exact:["Supply conversion ×0.82","Supply use ×1.15","Friendly front pressure -0.10 km"],risk:["Failure of the span isolates every committed heavy formation"],modifiers:{supplyConversion:.82,supplyUse:1.15,friendlyPressure:-.1}},
  {id:"hospitals-west",label:"Enemy Field Hospitals Move West",category:"ENEMY INTENT",phases:["terminal"],brief:"Enemy medical echelons are moving toward the line instead of away from it. The intelligence office has classified this as confidence.",report:"Forward medical preparation preceded increased enemy pressure and friendly losses.",quote:"Hospitals reveal an offensive before guns reveal its hour.",exact:["Enemy front pressure +0.30 km","Combat casualty factor ×1.08"],risk:["Prepared casualty capacity permits the enemy to sustain a worse exchange"],modifiers:{enemyPressure:.3,casualty:1.08}},
  {id:"shell-famine",label:"The Shell Famine Is Now a Tactical Condition",category:"REACTIVE CRISIS",phases:["contact","compression","exhaustion","terminal"],trigger:"Munitions coverage below 2 days",brief:"Fire plans are being rewritten around rounds that do not exist. Batteries retain targets and lose permission to engage them.",report:"Critical munitions coverage reduced execution and pressure while increasing casualties.",quote:"A shortage is an order with too many recipients.",exact:["Execution Confidence -6%","Friendly front pressure -0.25 km","Combat casualty factor ×1.18","Supply use ×0.82"],risk:["Continued shortage can trigger this crisis again after one intervening day"],modifiers:{confidence:-.06,friendlyPressure:-.25,casualty:1.18,supplyUse:.82}},
  {id:"general-stoppage",label:"The General Stoppage Acquires a Timetable",category:"REACTIVE CRISIS",phases:["contact","compression","exhaustion","terminal"],trigger:"Resistance at or above 55",brief:"Industrial committees have synchronized stoppages without issuing a declaration. The absence of a central author has not prevented central effects.",report:"Organized stoppage collapsed industrial output and deepened the domestic crisis.",quote:"A strike becomes strategy when every factory learns the same hour.",exact:["Industrial output ×0.68","Legitimacy -1.4 at resolution","Resistance +1.0 at resolution"],risk:["Coercive restoration may preserve output while destroying legitimacy"],modifiers:{productionOutput:.68,legitimacy:-1.4,resistance:1}},
  {id:"formation-fever",label:"The Formation Reports Sick",category:"REACTIVE CRISIS",phases:["contact","compression","exhaustion","terminal"],trigger:"Readiness below 42",brief:"Medical absence, vehicle faults, and unlocated personnel have converged into a single operational fact: the formation exists more completely on paper than in assembly.",report:"Readiness collapse increased casualties, desertion, and execution failure.",quote:"A ghost formation still consumes rations if the ledger believes in it.",exact:["Execution Confidence -7%","Combat casualty factor ×1.12","Desertion flow ×1.25"],risk:["The condition persists until Readiness is restored"],modifiers:{confidence:-.07,casualty:1.12,desertion:1.25}},
  {id:"creditor-call",label:"A Creditor Exercises Wartime Access",category:"REACTIVE CRISIS",phases:["contact","compression","exhaustion","terminal"],trigger:"Dependency at or above 55",brief:"A foreign counterparty has converted emergency assistance into a claim on current transport and treasury capacity. The agreement was always explicit to somebody.",report:"External dependency reduced available treasury and industrial discretion.",quote:"Aid becomes ownership at the first moment refusal is unaffordable.",exact:["Treasury -8 B at resolution","Industrial output ×0.92","Legitimacy -0.6 at resolution"],risk:["Refusal may interrupt future deliveries"],modifiers:{treasury:-8,productionOutput:.92,legitimacy:-.6}},
];
const CORE_CAMPAIGN_EVENTS=[...CAMPAIGN_EVENTS];
CAMPAIGN_EVENTS.push(...ADDITIONAL_CAMPAIGN_EVENTS);

export const FAMILIES: Family[] = [
  { id: "production", module: "national", category: "Industrial Command", label: "Set Production Target", brief: "Put the marginal factory, worker, and shipment behind one arm of the war machine.", lock: 2, choices: [
    c("guns", "Feed the Guns", "The front consumes arithmetic by the trainload.", ["Munitions allocation becomes 46% at resolution", "Armor, Flight, and Drones become 18% each", "Retooling output: -28% for the conversion day"], ["Front pressure: +0.2 to +0.8 km while coverage exceeds 3 days"], { target: "munitions" }),
    c("steel", "Steel the Spearhead", "A tank is a factory learning to move.", ["Armor allocation becomes 46% at resolution", "Other production lines become 18% each", "Retooling output: -28% for the conversion day"], ["Breakthrough chance: 14% to 29% at readiness above 65"], { target: "armor" }),
    c("air", "Contest the Air", "Every quiet sky is merely unaccounted violence.", ["Flight allocation becomes 46% at resolution", "Other production lines become 18% each", "Retooling output: -28% for the conversion day"], ["Enemy attrition reduction: 4% to 11% after two days"], { target: "flight" }),
    c("eyes", "Automate the Horizon", "Cheap eyes first. Cheap explosives immediately after.", ["Drones allocation becomes 46% at resolution", "Other production lines become 18% each", "Retooling output: -28% for the conversion day", "Intelligence: +3"], ["Targeting efficiency: +3% to +9%"], { target: "drones", delta: { intelligence: 3 }, doctrine: 2 }),
    c("balance", "Balance the Ledger", "Nothing starves. Nothing arrives in decisive quantity.", ["All production allocations become 25% at resolution", "Retooling output: -28% for the conversion day"], ["No breakthrough bonus; shortage risk falls 8% to 15%"], { target: "balanced" }),
    c("common-spares", "Stock Common Spares", "The decisive weapon is often the replacement part shared by everything else.", ["All production allocations become 25% at resolution", "Materiel condition: +3", "Maintenance debt: -4", "Treasury: -6.0 B", "Retooling output: -28% for the conversion day"], ["No single arm receives the specialization bonus"], { target: "balanced", delta: { materiel: 3, maintenanceDebt: -4, treasury: -6 } }),
  ]},
  { id: "industry", module: "national", category: "Industrial Command", label: "Organize Industry", brief: "Choose what factories optimize for when the requisition office stops pretending this is temporary.", lock: 4, choices: [
    c("war-economy", "Declare War Economy", "The civilian economy will be remembered fondly by survivors.", ["Treasury: -8.0 B", "Training capacity: +8,000 on Day +2", "Legitimacy: -2"], ["Military output: +8% to +14%"], { delta: { treasury: -8, legitimacy: -2 }, delay: { days: 2, delta: { training: 8000 } } }),
    c("disperse", "Disperse Production", "A thousand small targets are still a strategy.", ["Treasury: -5.0 B", "Materiel condition: +5 on Day +2"], ["Enemy strike losses: -20% to -35%"], { delta: { treasury: -5 }, delay: { days: 2, delta: { materiel: 5 } } }),
    c("overtime", "Mandate Overtime", "The eighth day of the week has been discovered by decree.", ["Treasury: +3.0 B", "Resistance: +6", "Materiel condition: -3"], ["Output gain: +12% to +20% for four days"], { delta: { treasury: 3, resistance: 6, materiel: -3 } }),
    c("maintenance", "Schedule Maintenance", "A stopped line looks like cowardice until the bearings fail.", ["Treasury: -4.0 B", "Materiel condition: +9 on Day +1", "Readiness: -2"], ["Breakdown losses: -25% to -40%"], { delta: { treasury: -4, readiness: -2 }, delay: { days: 1, delta: { materiel: 9 } } }),
    c("shop-councils", "Arm the Shop Councils", "The people nearest the machine receive enough authority to keep it alive.", ["Industrial output multiplier: ×1.05 while active", "Maintenance debt policy term: -1.2/day", "Treasury: -5.0 B", "Legitimacy: +2", "Resistance: -2"], ["Local production authority becomes harder to revoke after the emergency"], { delta: { treasury: -5, legitimacy: 2, resistance: -2 } }),
  ]},
  { id: "finance", module: "national", category: "Public Finance", label: "Finance Mobilization", brief: "Move the war bill through time, class, or fiction.", lock: 3, choices: [
    c("bonds", "Issue War Bonds", "Patriotism, now bearing interest.", ["Treasury: +24.0 B", "Legitimacy: +1", "Treasury: -1.2 B per day"], ["Debt event after Day +8: 10% to 18%"], { delta: { treasury: 24, legitimacy: 1 }, tick: { treasury: -1.2 } }),
    c("profit-tax", "Levy Excess Profits", "Sacrifice will be progressive for exactly one quarter.", ["Treasury: +12.0 B", "Legitimacy: +3", "Resistance: +2"], ["Industrial output loss: 2% to 6%"], { delta: { treasury: 12, legitimacy: 3, resistance: 2 } }),
    c("print", "Print with Confidence", "Ink is a strategic reserve if nobody asks what it buys.", ["Treasury: +18.0 B", "Legitimacy: -2", "Resistance: +3"], ["Procurement cost growth: 2% to 5%"], { delta: { treasury: 18, legitimacy: -2, resistance: 3 } }),
    c("seize", "Requisition Private Reserves", "Ownership has been temporarily clarified.", ["Treasury: +15.0 B", "Materiel: +4", "Legitimacy: -5", "Resistance: +9"], ["Sabotage risk: 8% to 16% per day"], { delta: { treasury: 15, materiel: 4, legitimacy: -5, resistance: 9 } }),
    c("customs-future", "Sell the Customs Future", "Tomorrow's border revenue arrives today wearing a foreign seal.", ["Treasury: +30.0 B", "Dependency: +8", "Legitimacy: -1", "Treasury: -2.5 B per day"], ["The pledged customs stream cannot finance a second emergency"], { delta: { treasury: 30, dependency: 8, legitimacy: -1 }, tick: { treasury: -2.5 } }),
  ]},
  { id: "service", module: "military", category: "Force Generation", label: "Define Service Obligation", brief: "Define who owes the state a body and what the state owes in return.", lock: 4, choices: [
    c("volunteer", "Maintain a Volunteer Force", "The uniform is a career until the casualty lists lengthen.", ["Voluntary intake becomes 6,200 per day", "Forced intake becomes 0", "Legitimacy: +1", "Treasury: -2.0 B per day"], ["Replacement coverage: 42% to 68%"], { delta: { legitimacy: 1, voluntary: -2800 }, tick: { treasury: -2 } }),
    c("selective", "Implement Selective Service", "Universal duty, selectively administered.", ["Voluntary intake becomes 5,600 per day", "Forced intake becomes 6,000 per day", "Legitimacy: -1", "Resistance: +1 per day"], ["Evasion: 5% to 12% of forced intake"], { delta: { voluntary: -3400, forced: 6000, legitimacy: -1 }, tick: { resistance: 1, legitimacy: -.5 } }),
    c("universal", "Mandate Universal Service", "The nation has become a queue outside an induction office.", ["Voluntary intake becomes 4,200 per day", "Forced intake becomes 15,000 per day", "Legitimacy: -3", "Resistance: +2.5 per day"], ["Training congestion: +12% to +28%"], { delta: { voluntary: -4800, forced: 15000, legitimacy: -3 }, tick: { resistance: 2.5, legitimacy: -1 } }),
    c("levy", "Declare an Emergency Levy", "Standards are luxuries purchased with time.", ["Forced intake becomes 28,000 per day", "Training quality: -12", "Legitimacy: -5", "Resistance: +6 per day", "Doctrine: +4"], ["Levy exhaustion begins after three days"], { delta: { voluntary: -6500, forced: 28000, quality: -12, legitimacy: -5 }, tick: { resistance: 6, legitimacy: -2 }, doctrine: 4 }),
    c("auxiliary", "Contract Auxiliary Manpower", "Citizenship is fastest when approached from the front.", ["Voluntary intake becomes 5,000 per day", "Forced intake becomes 10,000 per day", "Treasury: -8.0 B", "Dependency: +3 per day"], ["Desertion: 4% to 13%"], { delta: { voluntary: -4000, forced: 10000, treasury: -8 }, tick: { treasury: -10, dependency: 3 } }),
  ]},
  { id: "price", module: "military", category: "Force Generation", label: "Price Enlistment", brief: "Adjust the price, story, and household bargain attached to enlistment.", lock: 3, choices: [
    c("base-pay", "Raise Base Pay", "A recurring answer to a recurring shortage.", ["Voluntary intake: +3,000 per day", "Treasury: -5.0 B per day", "Legitimacy: +0.5 per day"], ["Public salary parity claim after three days"], { delta: { voluntary: 3000 }, tick: { treasury: -5, legitimacy: .5 } }),
    c("bonus", "Offer Joining Bonuses", "A signing ceremony with a survivor benefit in the fine print.", ["Treasury: -10.0 B", "Voluntary intake: +5,500 per day"], ["Intake falls 1,500 below baseline when offer closes"], { delta: { treasury: -10, voluntary: 5500 } }),
    c("stipends", "Guarantee Family Stipends", "The household joins before the soldier does.", ["Voluntary intake: +2,500 per day", "Legitimacy: +1", "Treasury: -4.0 B per day"], ["Arrears event if treasury becomes negative"], { delta: { voluntary: 2500, legitimacy: 1 }, tick: { treasury: -4 } }),
    c("survivors", "Pay Survivors First", "The dead have become the most reliable recruiters.", ["Voluntary intake: +1,500 per day", "Legitimacy: +2", "Treasury: -3.0 B per day"], ["Obligation grows with each casualty report"], { delta: { voluntary: 1500, legitimacy: 2 }, tick: { treasury: -3 } }),
  ]},
  { id: "training-capacity", module: "military", category: "Training and Induction", label: "Provision Training Capacity", brief: "A recruit is not a soldier. Decide where that conversion is allowed to occur.", lock: 4, choices: [
    c("camps", "Expand Temporary Camps", "Canvas, mud, and a curriculum measured in urgency.", ["Training capacity: +28,000 on Day +2", "Treasury: -8.0 B", "Training quality: -2"], ["Disease loss: 1% to 4% of queue"], { delta: { treasury: -8, quality: -2 }, delay: { days: 2, delta: { training: 28000 } } }),
    c("academy", "Build Permanent Academies", "Build for the next war while losing the present one.", ["Training capacity: +18,000 on Day +5", "Training quality: +6 on Day +5", "Treasury: -14.0 B"], ["Construction delay: 0 to 2 additional days"], { delta: { treasury: -14 }, delay: { days: 5, delta: { training: 18000, quality: 6 } } }),
    c("schools", "Convert Civilian Schools", "The timetable now includes entrenchment and casualty handling.", ["Training capacity: +20,000 on Day +1", "Workforce: -15,000", "Legitimacy: -3"], ["Regional resistance: +1 to +5"], { delta: { workforce: -15000, legitimacy: -3 }, delay: { days: 1, delta: { training: 20000 } } }),
    c("field", "Train in the Field", "The enemy will provide the final examination.", ["Training duration: -2 days", "Training quality: -12", "Readiness: -3", "Doctrine: +3"], ["First-week casualties: +8% to +22%"], { delta: { duration: -2, quality: -12, readiness: -3 }, doctrine: 3 }),
  ]},
  { id: "training-standard", module: "military", category: "Training and Induction", label: "Set Training Standard", brief: "Determine which deficiencies become the front's problem.", lock: 4, choices: [
    c("full", "Full Standard", "The calendar is held responsible for battlefield quality.", ["Training duration becomes 7 days", "Training quality: +8"], ["Replacement shortfall: 8,000 to 22,000 per day"], { delta: { duration: 1, quality: 8 } }),
    c("compressed", "Compressed Standard", "Every omitted lesson is converted into tempo.", ["Training duration becomes 4 days", "Training quality: -5", "Doctrine: +2"], ["Graduate casualties: +4% to +12%"], { delta: { duration: -2, quality: -5 }, doctrine: 2 }),
    c("specialist", "Branch-Specific Tracks", "Specialization is efficiency until the wrong shortage arrives.", ["Training duration remains 6 days", "Training quality: +4", "Equipment coverage: +3"], ["Cross-branch replacement loss: 5% to 12%"], { delta: { quality: 4, equipment: 3 } }),
    c("marginal", "Accept Marginal Candidates", "The requirement is now the ability to satisfy the requirement.", ["Training capacity: +25,000", "Training quality: -10", "Legitimacy: -2"], ["Medical discharge: 8% to 18%"], { delta: { training: 25000, quality: -10, legitimacy: -2 } }),
  ]},
  { id: "tempo", module: "military", category: "Operations", label: "Set Operational Tempo", brief: "Choose how quickly men, stock, and legitimacy enter the slaughterhouse.", lock: 1, choices: [
    c("hold", "Hold the Line", "Preserve the army. Explain the map.", ["Soldier attrition multiplier: 0.55", "Supply use multiplier: 0.65"], ["Front movement: -0.8 to +0.3 km"], { tempo: "hold" }),
    c("method", "Methodical Advance", "Convert shells into ground at the approved exchange rate.", ["Soldier attrition multiplier: 1.0", "Supply use multiplier: 1.0"], ["Front movement: -0.4 to +1.2 km"], { tempo: "methodical" }),
    c("surge", "Local Surge", "Concentrate the bill where the map is weakest.", ["Soldier attrition multiplier: 1.35", "Supply use multiplier: 1.4", "Doctrine: +2"], ["Front movement: -0.2 to +2.0 km"], { tempo: "surge", doctrine: 2 }),
    c("wave", "Human Wave", "The state has identified the shortest route between population and terrain.", ["Soldier attrition multiplier: 2.1", "Supply use multiplier: 1.2", "Legitimacy: -3", "Doctrine: +5"], ["Front movement: -0.5 to +3.2 km"], { tempo: "human-wave", delta: { legitimacy: -3 }, doctrine: 5 }),
  ]},
  { id: "desertion", module: "military", category: "Personnel Sustainment", label: "Process Desertion", brief: "Decide whether absence is a personnel problem, a police problem, or a truth problem.", lock: 2, choices: [
    c("amnesty", "Issue Limited Amnesty", "Return is permitted once. The record is not erased.", ["Desertion pressure: -8", "Legitimacy: +2", "Readiness: -1", "Retains 22% of new flight attempts while active"], ["The remaining 78% still requires interception or leaves the force"], { delta: { desertionPressure: -8, legitimacy: 2, readiness: -1 } }),
    c("patrols", "Establish Desertion Patrols", "The rear acquires a front of its own.", ["Patrol commitment: +4,800 once", "Intercepts 65% of new flight attempts after retention", "Resistance: +4", "Treasury: -2.0 B per day"], ["4,800 personnel become unavailable to frontline operations"], { delta: { patrolCommitment: 4800, resistance: 4 }, tick: { treasury: -2 } }),
    c("stations", "Seal Rail Stations", "Mobility has been reclassified as evidence.", ["Desertion pressure: -4", "Retains 12% of new flight attempts while active", "Workforce: -9,000", "Resistance: +6"], ["Civilian throughput loss: 4% to 9%"], { delta: { desertionPressure: -4, workforce: -9000, resistance: 6 } }),
    c("rations", "Guarantee Family Rations", "The household is secured behind the formation.", ["Desertion pressure: -6", "Retains 35% of new flight attempts while active", "Legitimacy: +3", "Treasury: -3.0 B per day"], ["Combined with established patrols, net flight can reach zero"], { delta: { desertionPressure: -6, legitimacy: 3 }, tick: { treasury: -3 } }),
    c("reclassify", "Reclassify Missing as Casualties", "The ledger has restored discipline without locating a man.", ["Reported desertions: -2,000", "Legitimacy: -2", "Doctrine: +2"], ["Audit exposure: 14% to 31%"], { delta: { deserters: -2000, legitimacy: -2 }, doctrine: 2 }),
  ]},
  { id:"home-front",module:"national",category:"Civilian Conversion",label:"Govern Civil Allocation",brief:"Decide which households absorb scarcity and whether administrative order still deserves civilian cooperation.",lock:3,choices:[
    c("ration-equally","Ration Equally","Scarcity becomes legitimate only when privilege is also hungry.",["Daily Legitimacy support: +1.2","Daily Resistance damping: -0.8","Treasury: -2.0 B per day"],["Black-market displacement: 4% to 9%"],{tick:{treasury:-2}}),
    c("priority-industry","Prioritize Industrial Households","The furnace receives calories before the family receives an explanation.",["Production workforce preserved","Daily Legitimacy pressure: -0.8","Daily Resistance pressure: +1.4"],["Industrial output protected while strike risk rises"]),
    c("curfew","Impose Night Curfew","The city will demonstrate tranquility by becoming empty.",["Daily Resistance damping: -1.1","Daily Legitimacy pressure: -1.5","Treasury: -1.0 B per day"],["Evasion and clandestine organization migrate indoors"],{tick:{treasury:-1}}),
    c("local-councils","Delegate to Local Councils","The center retains authority by admitting where it has none.",["Daily Resistance damping: -1.5","Daily Legitimacy support: +0.7","Dependency: +1"],["Regional autonomy demands: 6% to 14%"],{delta:{dependency:1}}),
    c("salvage-bureaus","Open Household Salvage Bureaus","Every kitchen drawer becomes a minor warehouse of the republic.",["Materiel condition: +4","Treasury: +3.0 B","Workforce: -7,000","Daily Legitimacy support: +0.4","Daily Resistance damping: -0.4"],["Informal salvage markets retain custody of some recovered stock"],{delta:{materiel:4,treasury:3,workforce:-7000}}),
  ]},
  { id:"casualty-politics",module:"national",category:"Civilian Conversion",label:"Administer the Butcher's Bill",brief:"Choose how battlefield loss enters households, newspapers, ceremonies, and the state's remaining credibility.",lock:2,choices:[
    c("publish-rolls","Publish the Rolls","The state names the dead because the households already have.",["Daily Legitimacy support: +0.8","Casualty totals remain exact","Intelligence: -1"],["Enemy battle-damage confidence improves 2% to 5%"],{delta:{intelligence:-1}}),
    c("sealed-ledger","Seal the Ledger","Classification is applied to grief until grief becomes opposition.",["Daily Legitimacy pressure: -0.7","Daily Resistance pressure: +0.5","Enemy casualty intelligence reduced"],["Disclosure scandal: 12% to 24%"]),
    c("public-mourning","Declare Public Mourning","Production stops long enough to prove the dead interrupted something.",["Daily Legitimacy support: +1.4","Treasury: -3.0 B","Materiel condition: -1"],["Casualty tolerance improves while output pauses"],{delta:{treasury:-3,materiel:-1}}),
    c("victory-accounting","Report Exchange Ratios","Every coffin is accompanied by an estimate of enemy inconvenience.",["Daily Legitimacy pressure: -0.4","Daily Resistance pressure: +0.7","Intelligence: +1"],["Audit contradiction risk: 10% to 21%"],{delta:{intelligence:1}}),
    c("survivor-estates","Establish Survivor Estates","The state gives each death a household that can still collect from it.",["Daily Legitimacy support: +1.0","Daily Resistance damping: -0.3","Voluntary intake: +1,000 per day","Treasury: -4.0 B per day"],["The obligation expands with every future casualty list"],{delta:{voluntary:1000},tick:{treasury:-4}}),
  ]},
  { id: "supply", module: "diplomacy", category: "Access and Exchange", label: "Secure External Supply", brief: "Trade independence, access, or future policy for things that explode today.", lock: 4, choices: [
    c("credit", "Request Allied Credit", "The friendship has a floating rate.", ["Treasury: +20.0 B", "Dependency: +8", "Legitimacy: +1"], ["Repayment event: 12.0 to 28.0 B"], { delta: { treasury: 20, dependency: 8, legitimacy: 1 } }),
    c("port", "Lease Port Access", "Sovereignty will resume after the final automatic renewal.", ["Treasury: +12.0 B", "Materiel: +5 on Day +2", "Dependency: +12"], ["Blockade resistance: +8% to +18%"], { delta: { treasury: 12, dependency: 12 }, delay: { days: 2, delta: { materiel: 5 } } }),
    c("shadow", "Buy on the Shadow Market", "Plausible deniability has excellent margins.", ["Equipment: +8 on Day +1", "Treasury: -16.0 B", "Legitimacy: -2", "Insight Points: no award"], ["Interdiction risk: 18% to 32%"], { delta: { treasury: -16, legitimacy: -2 }, delay: { days: 1, delta: { equipment: 8 } } }),
    c("transit", "Guarantee Neutral Transit", "Neutrality now includes a handling fee and rail priority.", ["Materiel: +3", "Treasury: -5.0 B", "Intelligence: +2"], ["Supply use reduction: 4% to 9%"], { delta: { materiel: 3, treasury: -5, intelligence: 2 } }),
  ]},
  { id: "statecraft", module: "diplomacy", category: "Influence and Coercion", label: "Conduct Statecraft", brief: "Alter what the opponent believes, what allies tolerate, or what tomorrow will cost.", lock: 2, choices: [
    c("summit", "Summit Photo-Op", "A table, two flags, and the disciplined absence of agreement.", ["Legitimacy: +4", "Treasury: -1.0 B", "Intelligence: +1"], ["Ceasefire channel: 8% to 18%"], { delta: { legitimacy: 4, treasury: -1, intelligence: 1 } }),
    c("backchannel", "Open Back Channel", "Officially, nobody has spoken. Unofficially, nobody has agreed.", ["Intelligence: +6", "Legitimacy: -1"], ["Enemy tempo disclosure: 35% to 65%"], { delta: { intelligence: 6, legitimacy: -1 } }),
    c("ultimatum", "Issue Public Ultimatum", "A deadline is policy with a clock attached.", ["Legitimacy: +2", "Enemy strength: +4,000", "Resistance: -1"], ["Enemy concession: 5% to 12%"], { delta: { legitimacy: 2, enemy: 4000, resistance: -1 } }),
    c("denial", "Maintain Plausible Deniability", "The policy does not exist outside the budget line that funds it.", ["Intelligence: +3", "Legitimacy: -2", "Enemy strength: -2,200"], ["Covert disruption: 1,000 to 5,000 enemy strength"], { delta: { intelligence: 3, legitimacy: -2, enemy: -2200 } }),
  ]},
  {id:"treaties",module:"diplomacy",category:"Commitments and Alliances",label:"Bind Foreign Obligations",brief:"Write today's access into tomorrow's automatic duty, then discover which party understood the verbs differently.",lock:4,choices:[
    c("mutual-defense","Ratify Mutual Defense","The alliance is strongest where the trigger remains grammatically uncertain.",["Orison Trust growth: +2.0/day","Orison Obligation accumulates","Dependency growth: +0.7/day"],["Alliance call may mature before aid capacity"]),
    c("intel-pact","Establish Intelligence Compact","Each party contributes what it can verify and withholds what it can use.",["Orison Trust growth: +1.0/day","Orison Aid Pipeline: +0.7/day","Intelligence: +2"],["Source compromise exposure: 8% to 17%"],{delta:{intelligence:2}}),
    c("transit-treaty","Codify Neutral Transit","The neutral rail timetable acquires an annex nobody reads aloud.",["Vey Trust growth: +2.0/day","Vey Aid Pipeline: +1.0/day","Dependency: +2"],["Transit suspension if Vey sanctions exposure exceeds 35"],{delta:{dependency:2}}),
    c("nonaggression","Offer Nonaggression Term","Peace is leased from the adversary in units shorter than memory.",["Cineric Trust growth: +1.8/day","Cineric Leverage decay: -0.8/day","Legitimacy: -1"],["Enemy rearmament remains unconstrained"],{delta:{legitimacy:-1}}),
    c("secret-annex","Execute Secret Annex","The public treaty contains the nouns. The annex contains the war.",["Kestrel Leverage growth: +2.0/day","Kestrel Trust growth: +1.2/day","Atrocity Exposure: +2"],["Broker betrayal pressure: +1.5/day"],{delta:{atrocityExposure:2}}),
  ]},
  {id:"sanctions",module:"diplomacy",category:"Influence and Coercion",label:"Administer Sanctions",brief:"Convert market access into coercion while counting which dependencies point inward.",lock:3,choices:[
    c("total-embargo","Impose Total Embargo","Trade is prohibited after every useful exception has already cleared customs.",["Cineric Leverage growth: +2.0/day","Cineric Sanctions Exposure: +3/day","Cineric Trust: -3/day"],["Retaliatory materiel drag rises with global exposure"]),
    c("targeted-controls","Target Strategic Controls","The prohibited component is always smaller than the machine it prevents.",["Cineric Leverage growth: +1.0/day","Cineric Sanctions Exposure: +1.5/day","Treasury: -2.0 B"],["Evasion network adapts after four days"],{delta:{treasury:-2}}),
    c("secondary-sanctions","Threaten Secondary Sanctions","Neutrality is permitted until it touches an invoice.",["Vey Sanctions Exposure: +2/day","Vey Trust: -2.5/day","Dependency: -1"],["Neutral transit disruption: 12% to 28%"],{delta:{dependency:-1}}),
    c("humanitarian-exemption","Publish Humanitarian Exemptions","Mercy is enumerated by tariff code and denied by missing paperwork.",["Cineric Trust support: +0.5/day","Cineric Leverage: -0.3/day","Legitimacy: +2"],["Dual-use leakage: 5% to 13%"],{delta:{legitimacy:2}}),
    c("lift-sanctions","Lift Sanctions for Access","Principle is exchanged for a corridor with specified axle weight.",["Cineric Trust growth: +2.5/day","Cineric Exposure: -4/day","Cineric Leverage: -2/day"],["Enemy procurement recovery: 1,000 to 3,500 strength/day"]),
  ]},
  {id:"alliance-obligations",module:"diplomacy",category:"Commitments and Alliances",label:"Service Alliance Obligations",brief:"Decide whether the alliance is a source of materiel, a claimant on it, or merely a future accusation.",lock:2,choices:[
    c("send-munitions","Honor the Munitions Call","The shells leave before the communique describing shared sacrifice.",["Munitions stock: -18,000","Orison Trust growth: +2.4/day","Orison Leverage growth: +1.5/day"],["Friendly coverage may cross a critical threshold"],{delta:{treasury:-1}}),
    c("accept-liaison","Accept Allied Liaison","A foreign officer enters the room and the room acquires another archive.",["Orison Trust growth: +1.3/day","Orison Dependency growth: +1/day","Intelligence: +3"],["Operational autonomy loss: 4% to 9%"],{delta:{intelligence:3}}),
    c("refuse-call","Refuse the Alliance Call","Sovereignty is exercised most clearly when somebody else expected ammunition.",["Orison Trust: -4/day","Orison Leverage: -2/day","Munitions preserved"],["Aid Pipeline suspension if Trust falls below 30"]),
    c("request-corps","Request Expeditionary Corps","Borrow soldiers whose graves will remain a bilateral instrument.",["Deployable Force: +12,000 on Day +2","Orison Obligation: -3/day","Orison Dependency: +2/day"],["Command friction: Readiness -1 on arrival"],{delay:{days:2,delta:{deployable:12000,armed:12000,readiness:-1}}}),
  ]},
  {id:"network-posture",module:"military",category:"Command Network",label:"Set Network Posture",brief:"Choose whether command travels quickly, secretly, or redundantly when every transmission is also evidence.",lock:1,choices:[
    c("broadcast","Rebroadcast on Compromised Frequencies","Restore command tempo by accepting that the enemy will learn the shape of the traffic.",["Network conversion: +14%","Readiness: +2","Intelligence: -4"],["Enemy pattern analysis accelerates while this posture remains active"],{networkPosture:"broadcast",delta:{readiness:2,intelligence:-4},doctrine:2}),
    c("dark","Go Dark and Run Couriers","Preserve the order picture by replacing bandwidth with distance, delay, and exposed messengers.",["Network conversion: -12%","Intelligence: +5","Equipment Coverage: +1"],["Operational execution slows while interception risk falls"],{networkPosture:"dark",delta:{intelligence:5,equipment:1}}),
    c("distributed","Distribute Autonomous Relays","Spend equipment to keep the network usable without concentrating its signature.",["Network conversion: +4%","Equipment Coverage: -2","Readiness: +1","Intelligence: +1"],["No single relay restores full command tempo; no single loss collapses it"],{networkPosture:"distributed",delta:{equipment:-2,readiness:1,intelligence:1}}),
    c("burst-windows","Cycle Burst Transmission Windows","The network exists for ninety seconds at a time and survives in the silence between them.",["Network posture conversion: +4%","Equipment Coverage: -1","Intelligence: +3","Treasury: -4.0 B"],["Missed windows isolate formations until the next synchronized burst"],{networkPosture:"distributed",delta:{equipment:-1,intelligence:3,treasury:-4}}),
  ]},
  {id:"network-authentication",module:"military",category:"Command Network",label:"Authenticate Orders",brief:"Choose which combination of time, local authority, equipment, and classification can prove that an order deserves obedience.",lock:2,choices:[
    c("triple-challenge","Enforce Triple Challenge","An order must survive three independent questions even when the answer arrives after the opportunity.",["Authentication shield: +9%","Network conversion: -5%","Readiness: -2","Intelligence: +4"],["A valid order may expire before its final challenge clears"],{delta:{readiness:-2,intelligence:4}}),
    c("delegated-keys","Delegate Formation Keys","Local commanders receive enough cryptographic authority to move before headquarters can agree.",["Network conversion: +8%","Readiness: +2","Equipment Coverage: -2"],["Compromised formation keys expose a larger autonomous cell"],{delta:{readiness:2,equipment:-2}}),
    c("rolling-codes","Fund Rolling Code Windows","The state purchases speed and secrecy with key material, technicians, and a permanently recurring bill.",["Network conversion: +3%","Intelligence: +2","Treasury: -6.0 B"],["Synchronization failure isolates formations outside the update window"],{delta:{intelligence:2,treasury:-6}}),
    c("one-time-pads","Issue One-Time Pads at Scale","Paper becomes bandwidth once every page is valuable enough to burn.",["Authentication shield: +8%","Network conversion: -2%","Intelligence: +3","Readiness: -1","Treasury: -7.0 B"],["Distribution delay turns an unused pad into dead weight and a captured pad into evidence"],{delta:{intelligence:3,readiness:-1,treasury:-7}}),
  ]},
  {id:"network-custody",module:"military",category:"Command Network",label:"Control Signal Custody",brief:"Decide where authoritative orders, keys, and archives survive when the physical network does not.",lock:3,choices:[
    c("central-archive","Centralize the Order Archive","Headquarters preserves one complete truth and accepts the delay required to consult it.",["Authentication shield: +6%","Intelligence: +5","Network conversion: -4%","Readiness: -1"],["Destruction or isolation of the archive becomes a single-point failure"],{delta:{intelligence:5,readiness:-1}}),
    c("field-custody","Issue Field Custody Kits","Formations carry their own keys, seals, and decision records into the same terrain that destroys radios.",["Network conversion: +5%","Readiness: +2","Equipment Coverage: -3"],["Captured kits disclose local command provenance"],{delta:{readiness:2,equipment:-3}}),
    c("burn-after-use","Authorize Disposable Keys","Every useful message destroys the credential that proved it, preserving secrecy at the cost of continuity.",["Authentication shield: +4%","Intelligence: +2","Equipment Coverage: -1"],["No surviving archive can reconstruct an order after execution"],{delta:{intelligence:2,equipment:-1}}),
    c("split-archive","Split the Archive by Echelon","No headquarters possesses the whole plan, and no captured headquarters can betray it.",["Authentication shield: +5%","Network conversion: +2%","Intelligence: +2","Equipment Coverage: -2"],["Conflicting fragments can survive longer than the authority needed to reconcile them"],{delta:{intelligence:2,equipment:-2}}),
  ]},
  {id:"foreign-intelligence",module:"diplomacy",category:"Access and Exchange",label:"Trade Foreign Intelligence",brief:"Acquire classification by deciding which foreign dependency, fiscal cost, or secret exposure will carry it.",lock:3,choices:[
    c("fused-exchange","Enter a Fused Intelligence Exchange","Receive the broadest foreign picture and accept that future estimates will depend on its continued arrival.",["Intelligence: +8","Dependency: +7","Legitimacy: +1"],["Foreign filtering becomes part of the national estimate"],{delta:{intelligence:8,dependency:7,legitimacy:1},duration:5}),
    c("compartmented","Accept a Compartmented Liaison","Buy a narrower picture with treasury and retain custody of the underlying national collection.",["Intelligence: +4","Treasury: -3 B","Dependency: +2"],["Some source provenance remains unavailable to command"],{delta:{intelligence:4,treasury:-3,dependency:2},duration:4}),
    c("unilateral-collection","Fund Unilateral Foreign Collection","Preserve autonomy by paying for access, cutouts, and attribution risk directly.",["Intelligence: +6","Treasury: -12 B","Legitimacy: -1"],["Exposure damages the state rather than an ally if collection is compromised"],{delta:{intelligence:6,treasury:-12,legitimacy:-1},duration:3}),
  ]},
  // Append-only family registry. Ava pins the pre-expansion P-handles and
  // allocates registered additions after them.
  { id: "expenditure", module: "national", category: "Public Finance", label: "Allocate War Expenditure", brief: "Decide which obligation is paid now and which institution carries the arrears.", lock: 3, choices: [
    c("frontline-procurement", "Prioritize Frontline Procurement", "The invoice is honored because the alternative has coordinates.", ["Treasury: -12.0 B", "Materiel condition: +4", "Equipment coverage: +2", "Legitimacy: -1"], ["Civil commitments are deferred to keep military contracts current"], { delta: { treasury: -12, materiel: 4, equipment: 2, legitimacy: -1 } }),
    c("civil-payrolls", "Protect Civil Payrolls", "The state proves it still exists by paying people who do not carry rifles.", ["Treasury: -9.0 B", "Legitimacy: +4", "Resistance: -3"], ["No direct military output is purchased"], { delta: { treasury: -9, legitimacy: 4, resistance: -3 } }),
    c("defer-capital", "Defer Capital Maintenance", "The machine is balanced by moving its failure into the future.", ["Treasury: +11.0 B", "Materiel condition: -5", "Maintenance debt: +8"], ["Breakdown exposure rises as the deferred bill compounds"], { delta: { treasury: 11, materiel: -5, maintenanceDebt: 8 } }),
    c("audit-contracts", "Audit Emergency Contracts", "Every recovered billion is attached to a name that expected the archive to burn.", ["Intelligence: +3", "Legitimacy: +1", "Readiness: -1", "Treasury: +7.0 B on Day +2"], ["Procurement offices lose speed while contracts are reconstructed"], { delta: { intelligence: 3, legitimacy: 1, readiness: -1 }, delay: { days: 2, delta: { treasury: 7 } } }),
    c("empty-ceremonial", "Empty the Ceremonial Reserves", "The state discovers that prestige was stored in climate-controlled warehouses.", ["Treasury: +9.0 B", "Materiel condition: +6", "Equipment Coverage: +1", "Legitimacy: -2", "Intelligence: -1"], ["No parade stock remains to conceal later shortages"], { delta: { treasury: 9, materiel: 6, equipment: 1, legitimacy: -2, intelligence: -1 } }),
  ]},
  { id: "war-labor", module: "national", category: "Labor Mobilization", label: "Mobilize Industrial Labor", brief: "Decide which bodies remain behind the machines, what bargain keeps them there, and which other institution must surrender them.", lock: 3, choices: [
    c("recall-skilled-reservists", "Recall Skilled Reservists", "The army returns the hands that can distinguish a damaged machine from a dead one.", ["Deployable force: -6,000", "Workforce: +50,000", "Materiel condition: +4"], ["The front loses trained bodies so the factories can preserve trained hands"], { delta: { deployable: -6000, workforce: 50000, materiel: 4 } }),
    c("displaced-labor", "Import Displaced Labor", "The border opens for workers under a contract written before they can read the station signs.", ["Workforce: +70,000", "Treasury: -6.0 B", "Dependency: +4", "Legitimacy: -1"], ["Housing, translation, and foreign sponsorship become part of industrial continuity"], { delta: { workforce: 70000, treasury: -6, dependency: 4, legitimacy: -1 } }),
    c("equal-war-wages", "Equalize War Wages", "The state discovers that fairness becomes efficient when every line needs the same people.", ["Workforce: +35,000", "Treasury: -8.0 B", "Legitimacy: +2", "Resistance: -3"], ["The wage floor becomes an obligation that survives the emergency"], { delta: { workforce: 35000, treasury: -8, legitimacy: 2, resistance: -3 } }),
    c("shift-discipline", "Militarize Shift Discipline", "The whistle becomes an order and absence becomes a category of disobedience.", ["Workforce: +60,000", "Treasury: +3.0 B", "Legitimacy: -3", "Resistance: +6", "Materiel condition: -2"], ["Coerced attendance raises nominal labor faster than it preserves machines"], { delta: { workforce: 60000, treasury: 3, legitimacy: -3, resistance: 6, materiel: -2 } }),
    c("protected-rest", "Protect Rest Rotations", "A rested worker produces less today and prevents a silent factory funeral tomorrow.", ["Workforce: -20,000", "Treasury: -4.0 B", "Materiel condition: +6", "Maintenance debt: -6"], ["Immediate labor availability falls while industrial endurance improves"], { delta: { workforce: -20000, treasury: -4, materiel: 6, maintenanceDebt: -6 } }),
  ]},
  { id: "strategic-freight", module: "national", category: "Strategic Distribution", label: "Route Strategic Freight", brief: "Choose which transport network receives priority, which civilian promise is broken, and where the war stock is allowed to wait.", lock: 2, choices: [
    c("rail-priority", "Impose Military Rail Priority", "The timetable admits that every passenger train was occupying artillery space.", ["Treasury: -5.0 B", "Materiel condition: +4", "Readiness: +1", "Resistance: +2"], ["Civil movement and food distribution absorb the displaced rail delay"], { delta: { treasury: -5, materiel: 4, readiness: 1, resistance: 2 } }),
    c("night-convoys", "Run the Night Convoy System", "The trucks travel without lights and arrive carrying equal quantities of ammunition and rumor.", ["Treasury: -7.0 B", "Materiel condition: +5", "Intelligence: +2", "Equipment Coverage: -1"], ["Vehicle wear and route compromise rise with every repeated night schedule"], { delta: { treasury: -7, materiel: 5, intelligence: 2, equipment: -1 } }),
    c("river-barges", "Open the River Barge Reserve", "Old hulls move the tonnage that modern roads have learned to refuse.", ["Treasury: -4.0 B", "Materiel condition: +6", "Workforce: +12,000", "Intelligence: -1"], ["Slow exposed routes trade concealment for carrying capacity"], { delta: { treasury: -4, materiel: 6, workforce: 12000, intelligence: -1 } }),
    c("civilian-fleet", "Cannibalize the Civilian Fleet", "Every delivery truck becomes military equipment one removed door panel at a time.", ["Treasury: +2.0 B", "Materiel condition: +8", "Equipment Coverage: +2", "Workforce: -40,000", "Legitimacy: -3"], ["Civil commerce loses the vehicles required to recover after requisition"], { delta: { treasury: 2, materiel: 8, equipment: 2, workforce: -40000, legitimacy: -3 } }),
    c("distributed-depots", "Disperse the Strategic Depots", "The stockpile survives by becoming five hundred smaller accounting problems.", ["Treasury: -9.0 B", "Materiel condition: +4", "Maintenance debt: -3", "Intelligence: -2"], ["Distribution survives concentrated attack but becomes slower to inventory and mass"], { delta: { treasury: -9, materiel: 4, maintenanceDebt: -3, intelligence: -2 } }),
  ]},
  { id: "tooling-policy", module: "national", category: "Industrial Command", label: "Govern Machine Tooling", brief: "Determine whether precision, interchangeability, or immediate volume owns the machines that make every other machine possible.", lock: 3, choices: [
    c("master-dies", "Preserve the Master Dies", "Production pauses around the objects from which replacement production can still be copied.", ["Treasury: -6.0 B", "Materiel condition: +5", "Maintenance debt: -3"], ["Immediate throughput is sacrificed to preserve industrial reproducibility"], { delta: { treasury: -6, materiel: 5, maintenanceDebt: -3 } }),
    c("standard-components", "Standardize Common Components", "Three incompatible victories are canceled in favor of one part that fits.", ["Treasury: -4.0 B", "Equipment Coverage: +4", "Materiel condition: +2", "Intelligence: -1"], ["Specialized equipment loses priority during standardization"], { delta: { treasury: -4, equipment: 4, materiel: 2, intelligence: -1 } }),
    c("tooling-to-failure", "Run Tooling to Failure", "The maintenance interval is reclassified as an obstacle to output.", ["Treasury: +6.0 B", "Workforce: +25,000", "Materiel condition: -6", "Maintenance debt: +7"], ["The production gain is borrowed directly from the machine's remaining life"], { delta: { treasury: 6, workforce: 25000, materiel: -6, maintenanceDebt: 7 } }),
  ]},
  { id: "procurement-pricing", module: "national", category: "Public Finance", label: "Set Procurement Prices", brief: "Choose whether urgency, certainty, or public custody governs the price the state pays for war output.", lock: 3, choices: [
    c("cost-plus", "Guarantee Cost-Plus Contracts", "The factory is protected from every uncertainty except the temptation to create more cost.", ["Treasury: -8.0 B", "Workforce: +25,000", "Materiel condition: +3"], ["Contractors retain little incentive to control expenditure"], { delta: { treasury: -8, workforce: 25000, materiel: 3 } }),
    c("fixed-price", "Impose Fixed Prices", "The state discovers savings by assigning inflation to the supplier.", ["Treasury: +5.0 B", "Materiel condition: -3", "Resistance: +2"], ["Suppliers protect margin through delay, substitution, and concealed defects"], { delta: { treasury: 5, materiel: -3, resistance: 2 } }),
    c("open-book", "Require Open-Book Contracts", "Every invoice receives an intelligence officer and every friendship receives a file number.", ["Treasury: -3.0 B", "Intelligence: +4", "Legitimacy: +2", "Readiness: -1"], ["Audit custody slows emergency purchasing"], { delta: { treasury: -3, intelligence: 4, legitimacy: 2, readiness: -1 } }),
  ]},
  { id: "shift-system", module: "national", category: "Labor Mobilization", label: "Regulate the Shift System", brief: "Choose how hours, darkness, fatigue, and machine availability are arranged across the industrial day.", lock: 2, choices: [
    c("twelve-hour-shifts", "Impose Twelve-Hour Shifts", "The clock is expanded until exhaustion occupies the additional hours.", ["Workforce: +40,000", "Treasury: +3.0 B", "Materiel condition: -3", "Resistance: +4"], ["Fatigue converts nominal labor into maintenance failures"], { delta: { workforce: 40000, treasury: 3, materiel: -3, resistance: 4 } }),
    c("rotating-crews", "Establish Rotating Crews", "The machine never sleeps because the people are permitted to.", ["Treasury: -5.0 B", "Workforce: +20,000", "Materiel condition: +4", "Maintenance debt: -2"], ["Crew handoffs reduce local continuity"], { delta: { treasury: -5, workforce: 20000, materiel: 4, maintenanceDebt: -2 } }),
    c("blackout-shifts", "Move Precision Work into Blackout Hours", "The most valuable line operates when observation is least certain.", ["Treasury: -4.0 B", "Workforce: -10,000", "Intelligence: +3", "Materiel condition: +3"], ["Night transport and supervision reduce available labor"], { delta: { treasury: -4, workforce: -10000, intelligence: 3, materiel: 3 } }),
  ]},
  { id: "skilled-allocation", module: "national", category: "Labor Mobilization", label: "Allocate Skilled Trades", brief: "Place the finite population that understands tolerances, power systems, and repair where its absence will do the least damage.", lock: 3, choices: [
    c("reserve-toolmakers", "Reserve the Toolmakers", "The irreplaceable workers receive exemptions that everyone else is invited to misunderstand.", ["Workforce: -20,000", "Materiel condition: +7", "Maintenance debt: -4", "Legitimacy: -1"], ["Visible exemptions weaken the equality of sacrifice"], { delta: { workforce: -20000, materiel: 7, maintenanceDebt: -4, legitimacy: -1 } }),
    c("field-repair", "Raise Field Repair Detachments", "The workshop moves close enough to the guns that every repaired vehicle hears the next requirement.", ["Deployable force: -4,000", "Treasury: -5.0 B", "Materiel condition: +5", "Readiness: +2"], ["Technicians assigned forward cannot sustain factory tooling"], { delta: { deployable: -4000, treasury: -5, materiel: 5, readiness: 2 } }),
    c("apprentice-dilution", "Dilute the Trades with Apprentices", "One master becomes five partial workers and a permanent inspection problem.", ["Workforce: +45,000", "Training capacity: +3,000", "Treasury: -3.0 B", "Materiel condition: -3"], ["Defect discovery moves later in the production sequence"], { delta: { workforce: 45000, training: 3000, treasury: -3, materiel: -3 } }),
  ]},
  { id: "depot-policy", module: "national", category: "Strategic Distribution", label: "Control War Depots", brief: "Decide whether stock survives through proximity, concealment, or continuous movement.", lock: 2, choices: [
    c("forward-depots", "Push Depots Forward", "The supplies arrive first because they are stored where retreat would lose them.", ["Treasury: -4.0 B", "Readiness: +3", "Materiel condition: -3"], ["Forward stock is exposed to the same fires as the formations it serves"], { delta: { treasury: -4, readiness: 3, materiel: -3 } }),
    c("buried-depots", "Excavate Buried Depots", "The warehouse survives by becoming geology.", ["Treasury: -8.0 B", "Materiel condition: +5", "Intelligence: -2"], ["Deep custody slows issue and inventory"], { delta: { treasury: -8, materiel: 5, intelligence: -2 } }),
    c("mobile-depots", "Create Mobile Depots", "The stockpile acquires wheels and inherits every problem of a convoy.", ["Treasury: -6.0 B", "Equipment Coverage: -3", "Materiel condition: +4", "Readiness: +2"], ["Transport equipment becomes unavailable to formations"], { delta: { treasury: -6, equipment: -3, materiel: 4, readiness: 2 } }),
  ]},
  { id: "transport-priority", module: "national", category: "Strategic Distribution", label: "Prioritize Industrial Transport", brief: "Declare which cargo may delay every other cargo without explanation.", lock: 2, choices: [
    c("ammunition-first", "Move Ammunition First", "Every siding becomes a firing schedule written in railcars.", ["Treasury: -5.0 B", "Readiness: +2", "Materiel condition: +3", "Resistance: +1"], ["Machine tools and civilian freight wait behind frontline consumption"], { delta: { treasury: -5, readiness: 2, materiel: 3, resistance: 1 } }),
    c("machine-tools-first", "Move Machine Tools First", "The shipment that makes future shipments outranks the shipment already requested by the front.", ["Treasury: -6.0 B", "Materiel condition: +6", "Readiness: -2", "Maintenance debt: -2"], ["Immediate operational delivery loses priority"], { delta: { treasury: -6, materiel: 6, readiness: -2, maintenanceDebt: -2 } }),
    c("food-and-coal", "Protect Food and Coal Trains", "The factory receives the heat and calories required to remain a factory.", ["Treasury: -6.0 B", "Workforce: +30,000", "Legitimacy: +2", "Resistance: -2"], ["Military freight loses protected paths"], { delta: { treasury: -6, workforce: 30000, legitimacy: 2, resistance: -2 } }),
  ]},
  { id: "mineral-output", module: "national", category: "Resource Extraction", label: "Expand Mineral Output", brief: "Choose which ground, workforce, or foreign dependency is converted into strategic metal.", lock: 4, choices: [
    c("deepen-mines", "Deepen the State Mines", "The shaft follows the ore past the point where rescue remains an engineering assumption.", ["Treasury: -8.0 B", "Workforce: -30,000", "Materiel condition: +7"], ["Extraction casualties and pumping demand rise with depth"], { delta: { treasury: -8, workforce: -30000, materiel: 7 } }),
    c("strip-mines", "Authorize Emergency Strip Mines", "The landscape is removed because the ore beneath it has a delivery date.", ["Treasury: -4.0 B", "Materiel condition: +10", "Legitimacy: -3", "Resistance: +5"], ["The extraction scar becomes a permanent domestic fact"], { delta: { treasury: -4, materiel: 10, legitimacy: -3, resistance: 5 } }),
    c("foreign-concentrate", "Purchase Foreign Concentrate", "The metal crosses the border already carrying another state's leverage.", ["Treasury: -6.0 B", "Materiel condition: +8", "Dependency: +6"], ["Import interruption becomes an industrial condition"], { delta: { treasury: -6, materiel: 8, dependency: 6 } }),
  ]},
  { id: "scrap-recovery", module: "national", category: "Resource Extraction", label: "Recover Strategic Scrap", brief: "Determine which wreckage, household object, or obsolete institution is permitted to become raw material again.", lock: 2, choices: [
    c("battlefield-salvage", "Organize Battlefield Salvage", "Recovery crews advance after the guns and before the ownership claims.", ["Deployable force: -3,500", "Equipment Coverage: +4", "Materiel condition: +5"], ["Salvage parties operate inside artillery range"], { delta: { deployable: -3500, equipment: 4, materiel: 5 } }),
    c("household-drive", "Conduct a Household Metal Drive", "Every kitchen is invited to discover its reserve of strategic alloy.", ["Materiel condition: +4", "Legitimacy: +2", "Resistance: +1"], ["Symbolic participation produces uneven metal quality"], { delta: { materiel: 4, legitimacy: 2, resistance: 1 } }),
    c("raze-obsolete-plant", "Raze Obsolete Plant", "The old factory makes its final contribution by ceasing to be a factory.", ["Treasury: +4.0 B", "Materiel condition: +8", "Workforce: -25,000"], ["Lost industrial sites cannot be restarted during the campaign"], { delta: { treasury: 4, materiel: 8, workforce: -25000 } }),
  ]},
  { id: "energy-supply", module: "national", category: "Resource Extraction", label: "Secure Industrial Energy", brief: "Allocate electricity, coal, and water pressure before the factories convert shortage into silence.", lock: 3, choices: [
    c("grid-priority", "Give War Plants Grid Priority", "The lights go out in districts that cannot produce ammunition.", ["Materiel condition: +5", "Legitimacy: -2", "Resistance: +4"], ["Civil blackout becomes visible proof of industrial privilege"], { delta: { materiel: 5, legitimacy: -2, resistance: 4 } }),
    c("emergency-coal", "Open the Emergency Coal Fields", "Unworked seams receive a workforce before they receive safe access.", ["Treasury: -4.0 B", "Workforce: +45,000", "Materiel condition: -2", "Resistance: +2"], ["Rapid extraction spends labor and machinery inefficiently"], { delta: { treasury: -4, workforce: 45000, materiel: -2, resistance: 2 } }),
    c("hydro-reserve", "Release the Hydroelectric Reserve", "The river is ordered to keep the furnaces ahead of the season.", ["Treasury: -7.0 B", "Materiel condition: +3", "Legitimacy: +1", "Resistance: -1"], ["Water reserves available to agriculture and cities decline"], { delta: { treasury: -7, materiel: 3, legitimacy: 1, resistance: -1 } }),
  ]},
  { id: "civilian-rationing", module: "national", category: "Civilian Conversion", label: "Ration Civil Consumption", brief: "Choose which civilian claim on fuel, metal, and factory time is denied so war production can remain coherent.", lock: 3, choices: [
    c("durable-goods", "Ration Durable Goods", "The civilian product survives as a catalog photograph and a source of machine time.", ["Materiel condition: +5", "Legitimacy: -1", "Resistance: +3"], ["Household replacement demand accumulates outside the official economy"], { delta: { materiel: 5, legitimacy: -1, resistance: 3 } }),
    c("transport-fuel", "Ration Civil Transport Fuel", "Every private journey is measured against a convoy that has not yet arrived.", ["Materiel condition: +4", "Workforce: -20,000", "Resistance: +2"], ["Labor mobility falls with civilian fuel access"], { delta: { materiel: 4, workforce: -20000, resistance: 2 } }),
    c("protect-essentials", "Protect Civil Essentials", "The war machine is required to leave enough ordinary life to justify defending it.", ["Treasury: -8.0 B", "Materiel condition: -1", "Legitimacy: +4", "Resistance: -4"], ["Industrial conversion yields space to civilian survival"], { delta: { treasury: -8, materiel: -1, legitimacy: 4, resistance: -4 } }),
  ]},
  { id: "civil-conversion", module: "national", category: "Civilian Conversion", label: "Convert Civil Industry", brief: "Decide which familiar product disappears so its plant, workers, and tolerances can enter the war ledger.", lock: 3, choices: [
    c("appliance-fuses", "Convert Appliance Lines to Fuses", "The switch that once started a washing machine now starts something less reversible.", ["Treasury: -5.0 B", "Workforce: +25,000", "Materiel condition: +5"], ["Civil repair capacity disappears with the appliance line"], { delta: { treasury: -5, workforce: 25000, materiel: 5 } }),
    c("bus-carriers", "Convert Buses into Carriers", "Public transport receives armor plate and a less public destination.", ["Treasury: -6.0 B", "Equipment Coverage: +5", "Workforce: -15,000", "Legitimacy: -1"], ["Civil transport capacity falls immediately"], { delta: { treasury: -6, equipment: 5, workforce: -15000, legitimacy: -1 } }),
    c("press-shells", "Convert Presses to Shell Cases", "The press retains its rhythm and changes only what the rhythm produces.", ["Treasury: -4.0 B", "Materiel condition: +6", "Resistance: +2"], ["Consumer fabrication capacity is lost during retooling"], { delta: { treasury: -4, materiel: 6, resistance: 2 } }),
  ]},
  { id: "substitute-materials", module: "national", category: "Civilian Conversion", label: "Authorize Substitute Materials", brief: "Choose which shortage is concealed inside a new standard and which user discovers it under load.", lock: 2, choices: [
    c("wood-fabric", "Substitute Wood and Fabric", "Precision metal is spared by assigning weather to the replacement material.", ["Treasury: -2.0 B", "Equipment Coverage: +3", "Materiel condition: -2"], ["Service life and environmental resistance decline"], { delta: { treasury: -2, equipment: 3, materiel: -2 } }),
    c("low-grade-steel", "Accept Lower-Grade Steel", "The specification survives by moving its weakness somewhere the form does not ask about.", ["Materiel condition: +5", "Equipment Coverage: -2", "Maintenance debt: +5"], ["Breakage migrates from production into service"], { delta: { materiel: 5, equipment: -2, maintenanceDebt: 5 } }),
    c("synthetic-feedstocks", "Fund Synthetic Feedstocks", "Chemistry is asked to imitate a supply route the navy cannot protect.", ["Treasury: -9.0 B", "Materiel condition: +4", "Intelligence: +2", "Dependency: -2"], ["Synthetic conversion consumes treasury and technical attention"], { delta: { treasury: -9, materiel: 4, intelligence: 2, dependency: -2 } }),
  ]},
  { id: "operational-reserve", module: "military", category: "Operations", label: "Manage Operational Reserves", brief: "Decide which uncommitted soldiers reinforce the line, recover behind it, or remain available for a counterstroke.", lock: 2, choices: [
    c("central-reserve", "Hold a Central Reserve", "The uncommitted formation is useful because every crisis must continue accounting for it.", ["Deployable force: -16,000", "Readiness: +3", "16,000 return to deployable duty on Day +2"], ["The line carries today's pressure without the withheld reserve"], { delta: { deployable: -16000, readiness: 3 }, delay: { days: 2, delta: { deployable: 16000 } } }),
    c("release-reserve", "Release the Replacement Reserve", "Tomorrow's continuity is converted into today's headcount.", ["Replacement reserve: -12,000", "Deployable force: +12,000", "Readiness: -2"], ["Replacement depth falls until new graduates refill it"], { delta: { reserves: -12000, deployable: 12000, readiness: -2 } }),
    c("rotate-battalions", "Rotate Exhausted Battalions", "The formation leaves the line before exhaustion makes the decision permanent.", ["Deployable force: -9,000", "Desertion pressure: -4", "9,000 return and Readiness increases by 6 on Day +2"], ["Immediate local force falls during the relief"], { delta: { deployable: -9000, desertionPressure: -4 }, delay: { days: 2, delta: { deployable: 9000, readiness: 6 } } }),
    c("strip-rear", "Strip the Rear Echelons", "Every headquarters discovers it employed riflemen when the front asks loudly enough.", ["Deployable force: +14,000", "Materiel condition: -3", "Legitimacy: -2", "Desertion pressure: +4"], ["Transport, repair, and administration lose the personnel they concealed"], { delta: { deployable: 14000, materiel: -3, legitimacy: -2, desertionPressure: 4 } }),
  ]},
  { id: "unit-recovery", module: "military", category: "Personnel Sustainment", label: "Administer Rotation and Recovery", brief: "Choose how damaged formations exchange immediate headcount for restored endurance.", lock: 3, choices: [
    c("scheduled-rotation", "Rotate on Schedule", "A relief executed on time is cheaper than an evacuation executed late.", ["Deployable force: -8,000", "Desertion pressure: -3", "8,000 return and Readiness increases by 5 on Day +2"], ["The relieved sector carries less force until the rotation closes"], { delta: { deployable: -8000, desertionPressure: -3 }, delay: { days: 2, delta: { deployable: 8000, readiness: 5 } } }),
    c("walking-wounded", "Return the Walking Wounded", "The medical category changes before the wound does.", ["Replacement reserve: -6,000", "Deployable force: +6,000", "Readiness: -3", "Desertion pressure: +2"], ["Medical relapse and formation drag rise with premature return"], { delta: { reserves: -6000, deployable: 6000, readiness: -3, desertionPressure: 2 } }),
    c("rebuild-cadres", "Rebuild Formation Cadres", "Preserve the people who can make the next thousand replacements cohere.", ["Deployable force: -7,000", "Treasury: -8.0 B", "Training capacity: +6,000 and Readiness: +4 on Day +2"], ["Experienced leaders leave the line during reconstruction"], { delta: { deployable: -7000, treasury: -8 }, delay: { days: 2, delta: { deployable: 7000, training: 6000, readiness: 4 } } }),
    c("convalescent-leave", "Guarantee Convalescent Leave", "A promise to return men home is also a promise that returning still exists.", ["Deployable force: -5,000", "Legitimacy: +3", "Desertion pressure: -6", "5,000 return to deployable duty on Day +2"], ["Immediate replacement coverage falls while leave is honored"], { delta: { deployable: -5000, legitimacy: 3, desertionPressure: -6 }, delay: { days: 2, delta: { deployable: 5000 } } }),
  ]},
  { id: "branch-priority", module: "military", category: "Force Generation", label: "Assign Branch Priority", brief: "Determine which kind of soldier the induction machine is attempting to produce before the front decides for it.", lock: 3, choices: [
    c("infantry-cadres", "Mass Infantry Cadres", "The army asks first for people who can occupy whatever survives the fire plan.", ["Training capacity: +8,000", "Training quality: +2", "Equipment Coverage: -2", "Treasury: -4.0 B"], ["Specialist replacement depth grows more slowly"], { delta: { training: 8000, quality: 2, equipment: -2, treasury: -4 } }),
    c("armored-crews", "Raise Armored Crews", "A vehicle without a crew is inventory. A crew without a vehicle is infantry with specialized regret.", ["Training quality: +5", "Equipment Coverage: +3", "Workforce: -12,000", "Training capacity: -2,000", "Treasury: -8.0 B"], ["Crew demand can outrun serviceable armor"], { delta: { quality: 5, equipment: 3, workforce: -12000, training: -2000, treasury: -8 } }),
    c("battery-schools", "Expand Battery Schools", "The gun line requires mathematicians who can tolerate being answered in kind.", ["Training capacity: +3,000", "Training quality: +4", "Intelligence: +2", "Equipment Coverage: -1", "Treasury: -5.0 B"], ["Gunners consume equipment and training time before they replace line infantry"], { delta: { training: 3000, quality: 4, intelligence: 2, equipment: -1, treasury: -5 } }),
    c("drone-operators", "Conscript Drone Operators", "The labor market is searched for anyone already fluent in distance, latency, and disposable machines.", ["Training capacity: +5,000", "Training quality: +3", "Intelligence: +5", "Workforce: -9,000", "Equipment Coverage: -1", "Treasury: -6.0 B"], ["Civil technical capacity falls as operators enter uniform"], { delta: { training: 5000, quality: 3, intelligence: 5, workforce: -9000, equipment: -1, treasury: -6 } }),
  ]},
  { id: "industrial-accords", module: "diplomacy", category: "Access and Exchange", label: "Negotiate Industrial Accords", brief: "Acquire the tooling, licenses, and components that domestic industry can imitate only after the campaign ends.", lock: 3, choices: [
    c("licensed-tooling", "License Allied War Tooling", "The machine arrives with an instruction manual and a political warranty.", ["Orison Trust growth: +1.0/day", "Orison Dependency growth: +0.6/day", "Orison Aid Pipeline: +0.4/day", "Materiel condition: +4", "Treasury: -8.0 B", "Dependency: +3"], ["Allied standards become part of the domestic production baseline"], { delta: { materiel: 4, treasury: -8, dependency: 3 }, duration: 6 }),
    c("component-clearing", "Open a Neutral Component Clearinghouse", "Every bearing remains neutral until installed in something that shoots.", ["Vey Trust growth: +1.2/day", "Vey Dependency growth: +0.5/day", "Vey Aid Pipeline: +0.5/day", "Equipment Coverage: +4", "Treasury: -5.0 B", "Dependency: +2"], ["Neutral access contracts if sanctions exposure rises"], { delta: { equipment: 4, treasury: -5, dependency: 2 }, duration: 5 }),
    c("reverse-engineering", "Fund Brokered Reverse Engineering", "The broker sells the object, the tolerances, and three mutually exclusive stories about where they came from.", ["Kestrel Trust growth: +0.7/day", "Kestrel Leverage growth: +1.2/day", "Kestrel Sanctions Exposure: +0.8/day", "Intelligence: +5", "Treasury: -10.0 B", "Legitimacy: -1"], ["Attribution risk follows every copied component"], { delta: { intelligence: 5, treasury: -10, legitimacy: -1 }, duration: 4 }),
  ]},
  { id: "information-diplomacy", module: "diplomacy", category: "Influence and Coercion", label: "Conduct Information Diplomacy", brief: "Make foreign publics, ministries, and markets carry facts that their governments would prefer to keep local.", lock: 2, choices: [
    c("publish-captured-orders", "Publish Captured Orders", "The enemy's private verbs are translated into every neutral language.", ["Cineric Trust: -1.4/day", "Cineric Leverage growth: +0.6/day", "Legitimacy: +3", "Intelligence: -1"], ["Publication consumes part of the source advantage"], { delta: { legitimacy: 3, intelligence: -1 }, duration: 4 }),
    c("embed-correspondents", "Embed Foreign Correspondents", "Observation is granted access and immediately begins negotiating custody of the story.", ["Vey Trust growth: +0.7/day", "Vey Leverage decay: -0.2/day", "Intelligence: +4", "Legitimacy: +1", "Treasury: -4.0 B"], ["Operational security narrows while foreign credibility rises"], { delta: { intelligence: 4, legitimacy: 1, treasury: -4 }, duration: 5 }),
    c("broadcast-surrender", "Broadcast Credible Surrender Terms", "The enemy soldier receives an alternative future before his officer can confiscate it.", ["Cineric Trust growth: +0.8/day", "Cineric Leverage decay: -0.4/day", "Intelligence: +2", "Reciprocity: +6", "Legitimacy: -1"], ["Domestic audiences may mistake conditional mercy for weakness"], { delta: { intelligence: 2, reciprocity: 6, legitimacy: -1 }, duration: 4 }),
  ]},
  { id: "burden-sharing", module: "diplomacy", category: "Commitments and Alliances", label: "Broker Coalition Burdens", brief: "Decide which ally pays, which ally commands, and which obligation survives when the accounting becomes public.", lock: 3, choices: [
    c("joint-procurement", "Establish a Joint Procurement Board", "Shared purchasing creates one price and several owners.", ["Orison Trust growth: +1.4/day", "Orison Dependency growth: +0.7/day", "Orison Obligation: +1.0/day", "Materiel condition: +3", "Equipment Coverage: +2", "Treasury: -6.0 B"], ["Procurement priority becomes a coalition negotiation"], { delta: { materiel: 3, equipment: 2, treasury: -6 }, duration: 6 }),
    c("air-defense-host", "Host Allied Air Defense", "Protection arrives with foreign crews, foreign keys, and a map of everything worth protecting.", ["Orison Trust growth: +1.8/day", "Orison Obligation: +1.5/day", "Equipment Coverage: -3", "Intelligence: +3", "Legitimacy: +2", "Treasury: -4.0 B"], ["Command authority over the defended airspace becomes shared"], { delta: { equipment: -3, intelligence: 3, legitimacy: 2, treasury: -4 }, duration: 5 }),
    c("refugee-rail", "Guarantee the Refugee Rail Corridor", "The same timetable that carries ammunition proves the alliance contains civilians.", ["Vey Trust growth: +1.6/day", "Vey Leverage decay: -0.8/day", "Workforce: -12,000", "Treasury: -5.0 B", "Legitimacy: +4", "Resistance: -2"], ["Military freight loses protected train paths while the guarantee is active"], { delta: { workforce: -12000, treasury: -5, legitimacy: 4, resistance: -2 }, duration: 5 }),
  ]},
];

for(const family of FAMILIES){
  const category=DIRECTIVE_CATEGORY_OVERRIDES[family.id];
  if(category)family.category=category;
  const additions=DIRECTIVE_CHOICE_ADDITIONS[family.id];
  if(additions?.length)family.choices.push(...additions as Choice[]);
}
FAMILIES.push(...ADDITIONAL_DIRECTIVE_FAMILIES as Family[]);

export const MANEUVERS: Maneuver[] = [
  { id:"reinforce",commitment:31000,label:"Reinforce the Salient",flavor:"The reserve enters through the route the enemy has already selected for fire.",exact:["Commit 31,000 deployable soldiers","Munitions use: +18%","Readiness: -2"],risk:["Outcome margin: Clean Execution through Operational Collapse","Negative margin exposes the committed reserve"],success:.68,casualty:1.22,supply:1.18,successPressure:.9,failurePressure:-.7,vector:"Force Reconstitution",readiness:-2,resourceUse:{munitions:1.18}},
  { id:"interdict",commitment:24000,label:"Clear the Interdiction Zone",flavor:"Find the batteries by surviving long enough to make them fire twice.",exact:["Commit 24,000 deployable soldiers","Munitions use: +31%","Drone use: +24%"],risk:["Outcome margin: Clean Execution through Operational Collapse","Salient remains understrength during the fires commitment"],success:.47,casualty:.86,supply:1.31,successPressure:1.25,failurePressure:-.45,vector:"Strategic Fires",resourceUse:{munitions:1.31,drones:1.24}},
  { id:"route",commitment:18000,label:"Establish a Southern Route",flavor:"The engineer changes what the map permits while the infantry pays for the time.",exact:["Commit 18,000 deployable soldiers","Materiel condition: -3","Operational supply burden ×0.80"],risk:["Positive margin opens an Alternate Route","Negative margin spends the committed engineers"],success:.54,casualty:.72,supply:.8,successPressure:.15,failurePressure:-.8,vector:"Operational Engineering",ownedDelta:{materiel:-3}},
  { id:"abandon",commitment:22000,label:"Abandon the Salient",flavor:"Preserve the formation. Reclassify the ground as an earlier misunderstanding.",exact:["Commit 22,000 deployable soldiers","Casualty factor ×0.44","Recover 3 Equipment","Operational supply burden ×0.62"],risk:["Outcome margin: Clean Execution through Operational Collapse","Negative margin exposes the withdrawing reserve"],success:.76,casualty:.44,supply:.62,successPressure:-.8,failurePressure:-2.4,vector:"Force Reconstitution",ownedDelta:{equipment:3}},
  { id:"exploit",commitment:46000,label:"Exploit Their Concentration",flavor:"The mission begins where protection stops being guaranteed.",exact:["Commit 46,000 deployable soldiers","Readiness: -5","Operational supply burden ×1.16"],risk:["Positive margin may create a Breakthrough Window","Negative margin spends the mobile reserve"],success:.18,casualty:1.65,supply:1.16,successPressure:3.2,failurePressure:-1.1,vector:"Assault Geometry",readiness:-5},
  { id:"breach",commitment:38000,label:"Force the Wire",flavor:"The wire has done its work if the assault arrives one man at a time.",exact:["Commit 38,000 deployable soldiers","Munitions use: +26%","Operational supply burden ×1.26"],risk:["Positive margin breaches the obstacle belt","Negative margin preserves the assault sequence for enemy observers"],success:.33,casualty:1.48,supply:1.26,successPressure:2.2,failurePressure:-.9,vector:"Assault Geometry",resourceUse:{munitions:1.26}},
  { id:"network",commitment:16000,label:"Restore the Command Net",flavor:"Cut the fiber and every order must cross the ground again.",exact:["Commit 16,000 deployable soldiers","Drone use: +32%","Operational supply burden ×0.92"],risk:["Positive margin restores the network and adds 3 Intelligence","Negative margin compromises the relay package"],success:.61,casualty:.78,supply:.92,successPressure:.75,failurePressure:-.65,vector:"Networked Command",resourceUse:{drones:1.32}},
];

const LEGACY_SITUATIONS: SituationTemplate[] = [
  { id: "kesh", theater:"lowland", sector: "Kesh Corridor", headline: "The Kesh Corridor Cannot Remain Open", briefing: "Enemy fires have interdicted the northern road and severed two command relays. The 18th Formation can still reach the salient through Kesh, but the corridor will become untenable before the day resolves.", question: "Where should the reserve be spent?", terrain: "Cratered lowland", ground: "Saturated", network: "Intermittent", supply: "Interdicted", intelligence: "Estimated // 78%", windowHours: 11, quote: "A corridor exists only because somebody maintains it.", attribution: "Oren Hale, Command Network Authority", maneuvers: ["reinforce", "interdict", "route", "abandon", "exploit"] },
  { id: "vell-plain", theater:"lowland", sector:"Vell Plain", headline:"The Vell Plain Has Finished Concealing the Army", briefing:"Defoliation, fire, and two weeks without rain have removed the last visual argument for surprise. Enemy observation covers every lateral road. A mobile reserve can still cross, provided it accepts being counted before it arrives.", question:"Which movement is worth revealing?", terrain:"Open lowland", ground:"Dry", network:"Intermittent", supply:"Adequate", intelligence:"Observed // 81%", windowHours:9, quote:"Concealment ends before movement does.", attribution:"Field Circular 8, Movement Under Observation", maneuvers:["interdict","route","network","reinforce","exploit"] },
  { id: "ossuary-mile", theater:"lowland", sector:"Ossuary Mile", headline:"The Road Is Passable Because the Wrecks Mark Its Edges", briefing:"Recovery crews opened a single lane through the abandoned transport column. The enemy has not fired on it since dawn, which the artillery staff considers more alarming than fire.", question:"Do you use the road before its silence is explained?", terrain:"Cratered lowland corridor", ground:"Saturated", network:"Degraded", supply:"Interdicted", intelligence:"Inferred // 57%", windowHours:7, quote:"The road is empty because the enemy has finished measuring it.", attribution:"Quartermaster Vale, The Last Serviceable Route", maneuvers:["route","interdict","reinforce","abandon","network"] },
  { id: "thorne-line", theater:"ridge", sector: "Thorne Line", headline: "The Wire Is Intact and the Timetable Is Not", briefing: "Three assault waves have reached the obstacle belt without opening a vehicle lane. Enemy reserves are moving behind the ridge. A breach attempted after dusk will lose artillery observation and gain nothing else.", question: "What should cross first?", terrain: "Prepared ridge", ground: "Mined", network: "Degraded", supply: "Adequate", intelligence: "Observed // 84%", windowHours: 8, quote: "The minefield is defeated only when someone crosses it.", attribution: "Col. Aris Thorne, Lectures on Assault Geometry", maneuvers: ["breach", "interdict", "network", "abandon", "exploit"] },
  { id:"ash-spine", theater:"ridge", sector:"Ash Spine", headline:"Every Approach to the Height Has Acquired a Name", briefing:"The northern spur is called Pilgrim, the southern cut is called Mercy, and neither designation has improved survivability. Counterbattery radar places the enemy guns behind reverse slope positions.", question:"Which geometry receives the next formation?", terrain:"Prepared ridge", ground:"Mined and dry", network:"Intermittent", supply:"Rationed", intelligence:"Observed // 73%", windowHours:10, quote:"A named approach is one the casualty clerks already recognize.", attribution:"Col. Aris Thorne, Lectures on Assault Geometry", maneuvers:["breach","interdict","route","abandon","exploit"] },
  { id:"varren-steps", theater:"ridge", sector:"Varren Steps", headline:"The Enemy Has Withdrawn Upward", briefing:"Forward positions are empty, heated, and mined. Thermal signatures show movement on the second ridge line while friendly patrols report no contact on the first. The vacant ground may be an invitation or an invoice.", question:"How much force enters an absence?", terrain:"Narrow ridge", ground:"Mined", network:"Degraded", supply:"Adequate", intelligence:"Contradictory // 52%", windowHours:6, quote:"An undefended position can still be occupied by intent.", attribution:"Pattern Analysis Note 44-C", maneuvers:["network","reinforce","breach","abandon","exploit"] },
  { id: "hollow-net", theater:"industrial", sector: "Hollow Relay District", headline: "The Army Beyond the Relay Is Armed, At Least", briefing: "The eastern formation has not acknowledged an order in ninety-three minutes. Reconnaissance sees movement but cannot classify its direction. Every new instruction must now be carried across contested ground.", question: "Which uncertainty receives the army?", terrain: "Industrial basin", ground: "Dry", network: "Severed", supply: "Rationed", intelligence: "Contradictory // 49%", windowHours: 6, quote: "The map is obedient only where the network holds.", attribution: "Oren Hale, Command Network Authority", maneuvers: ["network", "reinforce", "route", "abandon", "exploit"] },
  { id:"calder-foundry", theater:"industrial", sector:"Calder Foundry Belt", headline:"The Furnaces Are Cold and the Buildings Are Still Producing Casualties", briefing:"Enemy infantry occupies the annealing halls. Friendly guns cannot distinguish the foundry roof from the worker shelters behind it. The rail spur remains usable for one direction of traffic.", question:"Which part of the city remains infrastructure?", terrain:"Industrial basin", ground:"Rubble and dry", network:"Intermittent", supply:"Adequate", intelligence:"Observed // 69%", windowHours:12, quote:"A factory becomes a fortress when output is measured in delay.", attribution:"Industrial Defense Memorandum 12", maneuvers:["network","breach","interdict","route","abandon"] },
  { id:"blackglass-yards", theater:"industrial", sector:"Blackglass Rail Yards", headline:"Nine Trains Are Waiting for One Surviving Switch", briefing:"Munitions, replacements, fuel, and evacuees occupy the same rail fan. Enemy drones have identified the switch house. Dispatch can move one priority consist before the next strike window.", question:"What reaches the front, and what remains to be counted?", terrain:"Industrial corridor", ground:"Cratered and dry", network:"Degraded", supply:"Interdicted", intelligence:"Observed // 88%", windowHours:5, quote:"A timetable is command authority printed on cheaper paper.", attribution:"Rail Custody Board, Emergency Schedule", maneuvers:["interdict","network","route","reinforce","abandon"] },
  { id:"dalca-crossing", theater:"river", sector:"Dalca Crossing", headline:"The Bridge Exists in Three Incompatible Reports", briefing:"Aerial imagery shows the center span down. Engineers report a maintenance catwalk intact. The retreating battalion reports armor crossing east to west, which would require a bridge no other observer can find.", question:"Which report receives the reserve?", terrain:"River crossing corridor", ground:"Flooded", network:"Degraded", supply:"Interdicted", intelligence:"Contradictory // 46%", windowHours:7, quote:"A crossing is not a structure. It is a temporary monopoly on both banks.", attribution:"Engineer Directorate, River Operations", maneuvers:["network","route","interdict","reinforce","abandon"] },
  { id:"neme-locks", theater:"river", sector:"Neme Locks", headline:"The Lock Gates Can Deny the Valley Once", briefing:"Civil engineers can release the upper pool and drown the eastern approaches. The same act will destroy the service road, three villages, and the only heavy crossing within sixty kilometers.", question:"When does terrain become expendable?", terrain:"River lock corridor", ground:"Saturated", network:"Intermittent", supply:"Adequate", intelligence:"Observed // 75%", windowHours:9, quote:"Hydrology is artillery with a civilian chain of custody.", attribution:"Director Sera Neme, Flood Control Authority", maneuvers:["route","abandon","interdict","reinforce","exploit"] },
  { id:"charnel-ford", theater:"river", sector:"Charnel Ford", headline:"The Ford Is Shallow Enough to Cross and Deep Enough to Lose Everything", briefing:"Night reconnaissance marked a vehicle path through the current. Dawn rain has moved every marker downstream. Enemy fires are searching the western bank while the assault group waits under camouflage that will not survive full light.", question:"What is the price of the far bank before noon?", terrain:"Open river crossing", ground:"Flooded and mined", network:"Intermittent", supply:"Rationed", intelligence:"Estimated // 62%", windowHours:5, quote:"The far bank is always closer on a staff map.", attribution:"Field Circular 19, Forced Passage", maneuvers:["breach","route","interdict","abandon","exploit"] },
];

export const SITUATIONS:SituationTemplate[]=[...LEGACY_SITUATIONS,...GENERIC_SITUATION_TEMPLATES];

export const DOCTRINES: DoctrineVector[] = [
  { id: "drone", label: "Drone War", authority: "Pattern Analysis Directorate", quote: "Intelligence may infer. It may not know.", stages: [
    { id: "drone-war", label: "Drone War", cost: 0, output:"Allocation Rule", affects:"Drone formations", description: "Treat uncrewed systems as a permanent allocation layer rather than a special asset.", effect: "Unlock drone reconnaissance and strike allocation." },
    { id: "autonomous", label: "Autonomous Drones", cost: 120, output:"Operator Modifier", affects:"Drone formations", description: "Permit assigned missions to continue after command-network degradation.", effect: "Network failure no longer cancels Drone output.", delta: { intelligence: 2 } },
    { id: "long-range", label: "Long-Range Drones", cost: 180, output:"Workshop Module", affects:"Reconnaissance and strike drones", description: "Move observation and interdiction behind the immediate battle zone.", effect: "Strategic Interdiction gains +9% success.", delta: { intelligence: 3 } },
    { id: "mass-drones", label: "Mass-Producible Drones", cost: 260, output:"Production Rule", affects:"Drone industry", description: "Replace airframe quality thresholds with repeatable industrial loss.", effect: "Drone production output +18%." },
    { id: "reusable", label: "Reusable Drones", cost: 340, output:"Recovery Rule", affects:"Drone formations", description: "Recover capability after missions instead of pricing every sortie as terminal.", effect: "Drone daily use -22%." },
    { id: "specialized", label: "Specialized Drones", cost: 450, output:"Unit Buttons", affects:"Specialist drone units", description: "Separate relay, engineering, counter-battery, anti-armor, and contamination roles.", effect: "Unlock specialist Drone situation choices.", delta: { equipment: 2 } },
  ]},
  { id: "assault", label: "Assault Geometry", authority: "Col. Aris Thorne", quote: "A gap is not safe because it is open.", stages: [
    { id: "assault-observation", label: "Observed Passage", cost: 80, output:"Breach Casualty Procedure", affects:"Breach maneuvers", description: "Preserve the sequence in which an obstacle consumes an assault.", effect: "Failed breaches preserve observation and expose their casualty sequence." },
    { id: "suppression", label: "Liquidate Courage", cost: 160, output:"Firing Pattern", affects:"Assault support", description: "Synchronize passage with suppression rather than preceding it.", effect: "Breach casualty multiplier -8%." },
    { id: "forced-passage", label: "Forced Passage", cost: 280, output:"Campaign Maneuver", affects:"Engineers and assault formations", description: "Concentrate engineers, fires, and reserves against one geometric problem.", effect: "Breach success +12%.", delta: { readiness: 2 } },
  ]},
  { id: "networked", label: "Networked Command", authority: "Oren Hale", quote: "Command is the art of eliminating distances.", stages: [
    { id: "relay-discipline", label: "Relay Discipline", cost: 90, output:"Operator Modifier", affects:"Signal companies", description: "Make every formation capable of restoring one lost command edge.", effect: "Severed-network penalty -10%." },
    { id: "redundant-orders", label: "Redundant Orders", cost: 190, output:"Command-Network Safeguard", affects:"All formations", description: "Transmit intent through several systems before the first fails.", effect: "Daily Intelligence floor becomes 35.", delta: { intelligence: 3 } },
    { id: "autonomous-command", label: "Autonomous Command", cost: 310, output:"Unit Behavior", affects:"Isolated formations", description: "Permit formations to continue doctrine without receiving permission.", effect: "Network situations unlock exploitation orders." },
  ]},
  { id: "force-procedures", label: "Force Procedures", authority: "General Staff Codification Office", quote: "A force prepared for every task pays for capabilities it will not use.", stages: [
    { id:"modularized",label:"Modularized Forces",cost:100,output:"Task-Organization Rule",affects:"All campaign maneuvers",description:"Standardize assault, fires, engineer, signal, and sustainment detachments as interchangeable packages. A maneuver draws only the functions it needs instead of moving an entire parent formation.",effect:"Campaign maneuvers commit 10% fewer soldiers for the same projected combat power." },
    { id:"disintermediation",label:"Disintermediation",cost:150,output:"Army Button",affects:"Concentrated armies",description:"Break a concentrated army into adjacent legal positions without optimizing the terrain.",effect:"Unlock Disintermediate Army. Reduces concentration risk and imposes disorder." },
    { id:"casualty-table",label:"Priority Casualty Table",cost:220,output:"Casualty Allocation Control",affects:"Stacked combat",description:"Override the default order in which formation categories absorb losses.",effect:"Unlock manual casualty-priority control before resolution." },
    { id:"vanguard",label:"Vanguard Designation",cost:260,output:"Unit Module",affects:"Screens and expendable units",description:"Mark one formation as first-contact absorber for mines, ambush, and opening fire.",effect:"Unlock Designate Vanguard in eligible situations." },
    { id:"shoot-scoot",label:"Shoot-and-Scoot",cost:390,output:"Unit Button",affects:"Mobile batteries",description:"Fire and displace before counterfire at the expense of sustained accuracy.",effect:"Counterbattery losses fall; immediate fire output is reduced." },
  ]},
  { id: "fieldcraft", label: "Fieldcraft and Emplacement", authority: "Engineer Directorate", quote: "A formation is powerful only inside the conditions that make it function.", stages: [
    { id:"entrench",label:"Hasty Entrenchment",cost:90,output:"Unit Button",affects:"Infantry and engineers",description:"Convert unused movement into a temporary defensive posture.",effect:"Unlock Entrench; benefit ends when the formation moves." },
    { id:"camouflage",label:"Camouflage Discipline",cost:140,output:"Workshop Module",affects:"Infantry, batteries, operators",description:"Degrade enemy classification until movement, fire, transmission, or close scouting.",effect:"Enemy intelligence treats eligible formations as uncertain contacts." },
    { id:"sensor-disrupt",label:"Disrupt Sensor",cost:210,output:"Operator Modifier",affects:"Operators and saboteurs",description:"Interfere with non-visual detection while remaining visible to direct sight.",effect:"Sensor-only targeting becomes unavailable against equipped operators." },
    { id:"pioneer",label:"Pioneer Kit",cost:270,output:"Workshop Module",affects:"Infantry",description:"Permit infantry to cut wire, clear minor obstacles, and perform light demolition.",effect:"Unlock limited engineering actions without creating full Engineers." },
    { id:"terrain-emplacement",label:"Terrain Emplacement",cost:360,output:"Engineer Buttons",affects:"Engineer formations",description:"Deform terrain into kill pits, ramparts, defoliated lanes, and earthen parapets.",effect:"Unlock advanced battlefield-shaping situation choices." },
  ]},
  { id: "atrocities", label: "Atrocities", authority: "Custody and Reciprocity Directorate", quote: "The next surrender is negotiated with the last prisoner.", forbidden: true, stages: [
    { id: "gas", label: "Gas Warfare", cost: 10, description: "Correct the enemy belief that contaminated ground can be occupied.", effect: "Pressure +0.25. Reciprocity -8. Atrocity Exposure +12.", delta: { reciprocity: -8, atrocityExposure: 12, legitimacy: -3 }, severity:"grave", quote:"Gas does not capture ground but corrects the enemy’s belief that ground can be occupied.", attribution:"Col. Aris Thorne, Tables of Practical Denial" },
    { id: "mines", label: "Persistent Mine Denial", cost: 14, description: "Make the ground remain hostile after the front has moved.", effect: "Withdrawal pressure improves. Materiel Condition -2.", delta: { atrocityExposure: 9, materiel: -2 }, severity:"grave", quote:"The minefield is defeated only when someone crosses it.", attribution:"Col. Aris Thorne, Lectures on Assault Geometry" },
    { id: "deny-reciprocity", label: "Deny Reciprocity", cost: 20, description: "Remove exchange from the surrender economy.", effect: "Prisoner burden falls. Enemy surrender expectancy collapses.", delta: { reciprocity: -25, atrocityExposure: 18, legitimacy: -4 }, severity:"extreme", quote:"A surrendering army brings the expectation that surrender still exists.", attribution:"Nova Voss, Notes on the Surrender Economy" },
    { id:"stimulants",label:"Administer Stimulants",cost:26,output:"Unit Button",affects:"Biological formations",description:"Purchase one emergency movement interval with accumulated exhaustion debt.",effect:"Unlock emergency reinforcement; next-day Readiness penalty applies.",delta:{atrocityExposure:6,readiness:-3},severity:"grave",quote:"Collapse is patient. It does not rush to collect its debts.",attribution:"Pell Orasky, Medical Advisory on Combat Acceleration" },
    { id: "total-war", label: "Total War", cost: 32, description: "Remove the distinction between the enemy war system, its civilian substrate, and the natural resources that sustain both.", effect: "Civilian infrastructure and natural resources become valid targets. Enemy cohesion hardens. Atrocity Exposure +36. Legitimacy -10.", delta: { atrocityExposure: 36, desertionPressure: 10, legitimacy: -10 }, severity:"total", quote:"Total war begins when the map ceases to contain anything innocent.", attribution:"Nova Voss, Notes on the Surrender Economy" },
  ]},
];

const DIPLOMACY_DURATION:Record<string,number>={supply:6,statecraft:4,treaties:8,sanctions:6,"alliance-obligations":4,"industrial-accords":5,"information-diplomacy":4,"burden-sharing":5};
export const diplomacyDurationFor=(familyId:string,choice?:Choice)=>choice?.duration??DIPLOMACY_DURATION[familyId]??4;
FAMILIES.filter(family=>family.module==="diplomacy").forEach(family=>family.choices.forEach(choice=>{choice.duration=diplomacyDurationFor(family.id,choice)}));
export const activeDiplomacyForState=(state:GameState)=>state.activeDiplomacy.filter(action=>action.startedDay<=state.day&&action.expiresDay>state.day);

export const DEFAULT_CAMPAIGN:CampaignConfig={seed:1729,archetype:"industrial-republic",adversaryPersonality:"adaptive",theater:"lowland"};
export const TERMINAL_RESOLUTION_DAY=EARLIEST_MODELED_VICTORY_DAY;
const validTheater=(value:unknown):value is Theater=>THEATERS.some(x=>x.id===value);
export const sanitizeSeed=(value:number)=>Math.max(1,Math.min(2_147_483_647,Math.abs(Math.trunc(Number.isFinite(value)?value:DEFAULT_CAMPAIGN.seed))));

const applyArchetype=(s:GameState,id:string)=>{
  if(id==="siege-state"){s.production.munitions.stock+=38000;s.legitimacy-=6;s.resistance+=8;s.materiel-=4;}
  if(id==="industrial-republic"){s.workforce+=650000;s.materiel+=10;s.equipment+=4;s.deployable-=32000;s.treasury+=18;}
  if(id==="conscription-directorate"){s.armed+=60000;s.deployable+=22000;s.forced+=12000;s.queue+=50000;s.quality-=8;s.legitimacy-=9;s.resistance+=10;}
  if(id==="mercantile-compact"){s.treasury+=95;s.dependency+=18;s.production.munitions.stock-=25000;s.armed-=45000;s.deployable-=45000;s.actors.forEach(a=>{if(a.role!=="rival")a.aidPipeline+=10;});}
  if(id==="officer-regency"){s.readiness+=12;s.intelligence+=14;s.equipment+=5;s.voluntary-=3000;s.legitimacy-=4;s.resistance+=3;}
  if(id==="ruined-federation"){s.population-=1800000;s.workforce-=1000000;s.front-=2;s.materiel-=15;s.equipment-=12;s.treasury-=80;s.doctrine+=90;s.doctrineEarned+=90;}
};

const applyAdversaryPersonality=(s:GameState,id:string)=>{
  const a=s.adversary;
  if(id==="attritional"){a.force+=65000;a.munitions+=35000;a.munitionsOutput+=4000;a.readiness-=4;a.posture="Methodical Exhaustion";}
  if(id==="adaptive"){a.doctrine+=4;a.posture="Pattern Analysis";}
  if(id==="opportunist"){a.force-=20000;a.readiness+=8;a.equipment+=6;a.posture="Counterstroke Reserve";}
  if(id==="cautious"){a.force-=15000;a.readiness+=10;a.equipment+=8;a.posture="Defense in Depth";}
  s.enemy=a.force;
};

export const initialState = (input:Partial<CampaignConfig>={}): GameState => {
  const config:CampaignConfig={
    seed:sanitizeSeed(input.seed??DEFAULT_CAMPAIGN.seed),
    archetype:STATE_ARCHETYPES.some(x=>x.id===input.archetype)?input.archetype!:DEFAULT_CAMPAIGN.archetype,
    adversaryPersonality:ADVERSARY_PERSONALITIES.some(x=>x.id===input.adversaryPersonality)?input.adversaryPersonality!:DEFAULT_CAMPAIGN.adversaryPersonality,
    theater:validTheater(input.theater)?input.theater:DEFAULT_CAMPAIGN.theater,
  };
  const s:GameState={
    saveVersion:4,contentPackVersion:CONTENT_PACK_VERSION,campaignId:campaignSeedId(config.seed),campaignSeed:config.seed,stateArchetype:config.archetype,adversaryPersonality:config.adversaryPersonality,theater:config.theater,
    day: 1, actions: DAILY_ORDERS, status: "active", victorySecuredDay:null, population: 18420000, workforce: 11200000, armed: 620000, deployable: 431000,
    voluntary: 9000, forced: 0, queue: 76000, training: 48000, duration: 6, quality: 78,
    trainingCohorts: [{id:"D0-C1",admittedDay:0,headcount:42000,daysRemaining:2,quality:82},{id:"D0-C2",admittedDay:0,headcount:38000,daysRemaining:4,quality:76}], reserves: 53000, forceGenerationLedger:null,
    readiness: 64, equipment: 71, materiel: 68, treasury: 220, legitimacy: 58, resistance: 14, dependency: 9, intelligence: 42,
    front: -3.4, enemy: 590000, doctrine: 0, doctrineEarned: 0, doctrineWinAwards: [], affinityProofs: {}, atrocityExposure: 0, reciprocity: 100, desertionPressure: 18, deserters: 0, retained:0, intercepted: 0, patrolCommitment: 0,
    target: "balanced", pendingTarget: null, tempo: "methodical", networkPosture:"distributed", maneuver: null, maintenanceDebt: 22, productionLedger: null, operationsLedger:null, domesticLedger:null,diplomacyLedger:null,
    actors:[
      {id:"orison",name:"Orison Compact",role:"ally",interest:"Keep the active line consuming enemy attention without entering it",trust:62,leverage:38,dependency:24,obligation:31,aidPipeline:22,sanctionsExposure:8,betrayalRisk:.18},
      {id:"vey",name:"Vey Port Authority",role:"neutral",interest:"Preserve transit revenue and legal neutrality",trust:47,leverage:44,dependency:18,obligation:9,aidPipeline:11,sanctionsExposure:14,betrayalRisk:.27},
      {id:"kestrel",name:"Kestrel Exchange",role:"broker",interest:"Monetize scarcity without becoming attributable",trust:34,leverage:57,dependency:12,obligation:4,aidPipeline:7,sanctionsExposure:29,betrayalRisk:.49},
      {id:"cineric",name:"Cineric Directorate",role:"rival",interest:"Isolate the state before defeating its field army",trust:11,leverage:52,dependency:5,obligation:0,aidPipeline:0,sanctionsExposure:21,betrayalRisk:.67},
    ],
    adversary:{force:590000,readiness:61,equipment:68,munitions:138000,munitionsOutput:16800,munitionsUse:19200,doctrine:0,objective:"Unclassified",posture:"Methodical Pressure",productionTarget:"Replacement Equipment",countermeasure:"Seed False Dispositions",maneuverCounts:{},adaptation:{},lastOrders:[],estimateBias:1},adversaryLedger:null,
    production: { munitions: { allocation: 34, stock: 152000, output: 18400, use: 21000 }, armor: { allocation: 24, stock: 1180, output: 62, use: 74 }, flight: { allocation: 18, stock: 286, output: 14, use: 17 }, drones: { allocation: 24, stock: 3640, output: 310, use: 355 } },
    active: {}, locks: {}, scheduled: [], activeDiplomacy:[],unlocked: ["drone-war"], decisions: [], eventHistory:[],opportunityCommitment:null,opportunityHistory:[],opportunityAssignments:[],accountOpportunityIds:[],
    theaterSectors:initialTheaterSectors(config.theater),operationalFacts:initialOperationalFacts(config.theater),situationHistory:[],currentSituation:null,
    currentSubMissions:null,subMissionHistory:[],resolutionHistory:[],reports: [],
  };
  applyArchetype(s,config.archetype);applyAdversaryPersonality(s,config.adversaryPersonality);normalize(s);s.currentSituation=compileSituationForState(s);s.currentSubMissions=compileSubMissionDocket(s,s.subMissionHistory);
  const situation=situationForState(s),director=directorForState(s);s.adversary.objective=situation.sector;
  const archetype=STATE_ARCHETYPES.find(x=>x.id===config.archetype)!;
  s.reports=[{day:1,title:`${situation.sector} Will Consume the First Available Reserve`,body:`${situation.briefing}\n\n${director.event.brief} The field army enters the sector with a serviceable reserve and arsenals able to sustain immediate operations. By dusk, headquarters must decide where to mass force and what to leave exposed.`,tone:"warn",epigraph:archetype.quote}];
  return s;
};

const clone = (state: GameState): GameState => JSON.parse(JSON.stringify(state));
const add = (state: GameState, delta: Delta = {}) => Object.entries(delta).forEach(([key, value]) => { (state[key as NumberKey] as number) += value as number; });
const normalize = (s: GameState) => {
  ["readiness","equipment","materiel","legitimacy","resistance","dependency","intelligence","quality","atrocityExposure","reciprocity","desertionPressure","maintenanceDebt"].forEach((key) => { (s[key as NumberKey] as number) = Math.max(0, Math.min(100, s[key as NumberKey] as number)); });
  s.deployable = Math.max(0, Math.min(s.armed, Math.round(s.deployable))); s.reserves=Math.max(0,Math.round(s.reserves));s.queue = Math.max(0, Math.round(s.queue)); s.training = Math.max(1000, Math.round(s.training)); s.duration = Math.max(2, Math.min(12, Math.round(s.duration))); s.deserters = Math.max(0, Math.round(s.deserters));s.retained=Math.max(0,Math.round(s.retained??0));s.intercepted=Math.max(0,Math.round(s.intercepted));
};
const hash = (text: string) => { let h = 2166136261; for (let i=0;i<text.length;i++) { h ^= text.charCodeAt(i); h = Math.imul(h,16777619); } return (h>>>0)/4294967295; };

const LEGACY_OPPORTUNITY_TEMPLATES=[
  {id:"displacing-battery",label:"Exposed Battery",headline:"An Enemy Battery Is Displacing in the Open",brief:"Counterbattery observers have retained a firing unit through its first displacement. The road is exposed for minutes, not hours; engaging it will spend stock outside the day’s three strategic orders.",responses:[
    {id:"drone-strike",label:"Commit a Drone Strike",flavor:"Trade machines and shells for the shortest available kill chain.",exact:["Munitions stock: −1,200","Drone stock: −240","Does not consume a strategic order"],contingent:["68% exploitation confidence","Success removes about 3,200 enemy force and adds local pressure","Failure reduces Equipment Coverage by 0.4"],chance:.68,cost:{munitions:1200,drones:240},success:{enemyForce:-3200,intelligence:1,friendlyPressure:.18},failure:{equipment:-.4}},
    {id:"counterbattery",label:"Fire the Registered Mission",flavor:"Spend shells before the enemy finishes becoming a different target.",exact:["Munitions stock: −3,400","Does not consume a strategic order"],contingent:["78% exploitation confidence","Success removes about 2,200 enemy force and 5,400 enemy munitions"],chance:.78,cost:{munitions:3400},success:{enemyForce:-2200,enemyMunitions:-5400,friendlyPressure:.1}},
    {id:"track-displacement",label:"Track, Do Not Fire",flavor:"Preserve the target long enough to learn where the battery believes it is safe.",exact:["No stock committed","Intelligence: +3 at resolution","Does not consume a strategic order"],contingent:["No kinetic effect"],chance:1,success:{intelligence:3}},
  ]},
  {id:"reserve-column",label:"Reserve Column",headline:"Enemy Reserves Have Entered a Single Road Column",brief:"Traffic control has compressed several formations into one route. The concentration is vulnerable now and operationally dispersed once it reaches the sector.",responses:[
    {id:"interdict-column",label:"Interdict the Column",flavor:"Attack the timetable before it becomes local force.",exact:["Munitions stock: −2,600","Drone stock: −160","Does not consume a strategic order"],contingent:["63% exploitation confidence","Success removes about 4,200 enemy force and adds local pressure","Failure reduces Equipment Coverage by 0.5"],chance:.63,cost:{munitions:2600,drones:160},success:{enemyForce:-4200,friendlyPressure:.22},failure:{equipment:-.5}},
    {id:"mine-route",label:"Seed the Exit Route",flavor:"Let the column enter and make its dispersal geometry hostile.",exact:["Drone stock: −80","Does not consume a strategic order"],contingent:["82% exploitation confidence","Success removes about 1,800 enemy force","Failure adds 0.3 Materiel debt"],chance:.82,cost:{drones:80},success:{enemyForce:-1800,friendlyPressure:.1},failure:{materiel:-.3}},
    {id:"follow-column",label:"Follow the Column",flavor:"A reserve reveals more by arriving than by dying on the road.",exact:["No stock committed","Intelligence: +3 at resolution","Does not consume a strategic order"],contingent:["Enemy reserve arrives intact"],chance:1,success:{intelligence:3}},
  ]},
  {id:"relay-burst",label:"Relay Compromise",headline:"An Enemy Relay Has Repeated Its Handshake",brief:"The same authentication sequence appeared on three networks. Exploitation may expose command traffic; intervention may also teach the enemy which relay was compromised.",responses:[
    {id:"exploit-net",label:"Exploit the Relay",flavor:"Use the breach until the breach notices it is being used.",exact:["No stock committed","Does not consume a strategic order"],contingent:["72% exploitation confidence","Success adds 4 Intelligence and local pressure","Failure costs 1 Intelligence"],chance:.72,success:{intelligence:4,friendlyPressure:.15},failure:{intelligence:-1}},
    {id:"spoof-order",label:"Insert a False Order",flavor:"Command the enemy once and reveal the shape of the deception forever.",exact:["Drone stock: −140","Does not consume a strategic order"],contingent:["55% exploitation confidence","Success removes about 2,600 enemy force and adds local pressure","Failure reduces Readiness by 0.6"],chance:.55,cost:{drones:140},success:{enemyForce:-2600,friendlyPressure:.25},failure:{readiness:-.6}},
    {id:"map-network",label:"Map the Network",flavor:"Preserve access as an intelligence instrument instead of spending it as an attack.",exact:["No stock committed","Intelligence: +3 at resolution","Does not consume a strategic order"],contingent:["No immediate enemy loss"],chance:1,success:{intelligence:3}},
  ]},
  {id:"field-depot",label:"Field Depot",headline:"A Forward Depot Has Been Identified Before Dispersal",brief:"Fuel and munitions are still separated by inventory rather than distance. The depot will cease to exist as one target when the next distribution cycle begins.",responses:[
    {id:"strike-depot",label:"Strike the Depot",flavor:"Burn the stock where it is counted instead of where it will be fired.",exact:["Munitions stock: −2,200","Drone stock: −220","Does not consume a strategic order"],contingent:["65% exploitation confidence","Success destroys about 9,000 enemy munitions and 1,500 enemy force","Failure reduces Equipment Coverage by 0.4"],chance:.65,cost:{munitions:2200,drones:220},success:{enemyMunitions:-9000,enemyForce:-1500},failure:{equipment:-.4}},
    {id:"raid-depot",label:"Raid the Distribution Detail",flavor:"Exchange certainty for a larger theft from the enemy timetable.",exact:["Munitions stock: −1,200","Does not consume a strategic order"],contingent:["48% exploitation confidence","Success destroys about 12,000 enemy munitions and 3,000 enemy force","Failure reduces Readiness by 1"],chance:.48,cost:{munitions:1200},success:{enemyMunitions:-12000,enemyForce:-3000,friendlyPressure:.2},failure:{readiness:-1}},
    {id:"observe-distribution",label:"Observe Distribution",flavor:"Let the stock survive long enough to identify every formation expecting it.",exact:["No stock committed","Intelligence: +2 at resolution","Does not consume a strategic order"],contingent:["Enemy stock remains available"],chance:1,success:{intelligence:2}},
  ]},
] as const;

type OpportunityProfile={
  chance:number; cost?:Partial<Record<Resource,number>>; commit?:OpportunityEffect;
  success:OpportunityEffect; failure?:OpportunityEffect; alternate:OpportunityEffect;
};

const OPPORTUNITY_PROFILES:Record<OpportunityCategory,OpportunityProfile>={
  "individual-action":{chance:.68,cost:{munitions:800,drones:40},success:{enemyForce:-1800,intelligence:1,friendlyPressure:.12},failure:{readiness:-.3},alternate:{intelligence:3}},
  "clandestine-sabotage":{chance:.66,cost:{drones:40},success:{enemyMunitions:-6500,enemyReadiness:-1.2,friendlyPressure:.14},failure:{intelligence:-1},alternate:{intelligence:2,enemyMunitions:-1800}},
  "proxy-warfare":{chance:.61,cost:{munitions:700},commit:{treasury:-.8,dependency:.4},success:{enemyForce:-2200,enemyReadiness:-1.4,intelligence:1,friendlyPressure:.18},failure:{legitimacy:-.6},alternate:{intelligence:3,enemyReadiness:-.4}},
  "equipment-recovery":{chance:.64,cost:{munitions:500},success:{equipment:1,materiel:.5,munitions:2000},failure:{readiness:-.5},alternate:{intelligence:2,equipment:.4}},
  "energy-warfare":{chance:.65,cost:{drones:80},success:{enemyMunitions:-4000,enemyReadiness:-1.8,friendlyPressure:.15},failure:{intelligence:-1},alternate:{intelligence:3,enemyReadiness:-.5}},
  "political-warfare":{chance:.62,success:{enemyReadiness:-1.3,intelligence:2,friendlyPressure:.12},failure:{legitimacy:-.5},alternate:{intelligence:3,enemyReadiness:-.4}},
  "leadership-interdiction":{chance:.54,cost:{drones:100},commit:{atrocityExposure:2.2,reciprocity:-3,legitimacy:-.4},success:{enemyReadiness:-2.2,enemyForce:-500,friendlyPressure:.2},failure:{atrocityExposure:1,legitimacy:-1},alternate:{intelligence:4,enemyReadiness:-.6}},
  "counterintelligence":{chance:.72,success:{intelligence:4,friendlyPressure:.08},failure:{intelligence:-2},alternate:{intelligence:2,enemyReadiness:-.3}},
  "personnel-recovery":{chance:.67,cost:{munitions:500,drones:50},success:{readiness:1,intelligence:2,legitimacy:.3},failure:{readiness:-.5},alternate:{intelligence:2,friendlyPressure:.05}},
  "domestic-reform":{chance:.74,success:{readiness:1.5,materiel:1,equipment:.4,legitimacy:.4},failure:{resistance:.8,readiness:-.5},alternate:{intelligence:1,materiel:.6}},
};

const signed=(value:number,decimals=Number.isInteger(value)?0:1)=>`${value>=0?"+":"−"}${Math.abs(value).toFixed(decimals)}`;
const opportunityEffectLines=(effect:OpportunityEffect={})=>{
  const lines:string[]=[];
  if(effect.enemyForce)lines.push(`Enemy field force ${signed(effect.enemyForce)}`);
  if(effect.enemyMunitions)lines.push(`Enemy munitions ${signed(effect.enemyMunitions)}`);
  if(effect.enemyReadiness)lines.push(`Enemy readiness ${signed(effect.enemyReadiness)} points`);
  if(effect.enemyEquipment)lines.push(`Enemy equipment ${signed(effect.enemyEquipment)} points`);
  if(effect.intelligence)lines.push(`Intelligence ${signed(effect.intelligence)} points`);
  if(effect.readiness)lines.push(`Readiness ${signed(effect.readiness)} points`);
  if(effect.equipment)lines.push(`Equipment Coverage ${signed(effect.equipment)} points`);
  if(effect.materiel)lines.push(`Materiel Condition ${signed(effect.materiel)} points`);
  if(effect.friendlyPressure)lines.push(`Same-day battlefield pressure ${signed(effect.friendlyPressure,2)}`);
  if(effect.munitions)lines.push(`Munitions stock ${signed(effect.munitions)}`);
  if(effect.armor)lines.push(`Armor stock ${signed(effect.armor)}`);
  if(effect.flight)lines.push(`Flight stock ${signed(effect.flight)}`);
  if(effect.drones)lines.push(`Drone stock ${signed(effect.drones)}`);
  if(effect.treasury)lines.push(`Treasury ${signed(effect.treasury)} B`);
  if(effect.legitimacy)lines.push(`Legitimacy ${signed(effect.legitimacy)} points`);
  if(effect.resistance)lines.push(`Resistance ${signed(effect.resistance)} points`);
  if(effect.dependency)lines.push(`Dependency ${signed(effect.dependency)} points`);
  if(effect.atrocityExposure)lines.push(`Atrocity Exposure ${signed(effect.atrocityExposure)} points`);
  if(effect.reciprocity)lines.push(`Reciprocity ${signed(effect.reciprocity)} points`);
  return lines;
};

const scaledCost=(cost:Partial<Record<Resource,number>>|undefined,index:number)=>cost?Object.fromEntries(Object.entries(cost).map(([resource,amount])=>[resource,Math.round(Number(amount)*(1+(index%5-2)*.08)/10)*10])) as Partial<Record<Resource,number>>:undefined;

export const OPPORTUNITY_TEMPLATES:OpportunityTemplate[]=OPPORTUNITY_SPINES.map((spine,index)=>{
  const profile=OPPORTUNITY_PROFILES[spine.category];
  const authoredFlavor=OPPORTUNITY_RESPONSE_FLAVOR[spine.id];
  if(!authoredFlavor)throw new Error(`Missing response flavor for opportunity ${spine.id}`);
  const chance=Math.min(.88,profile.chance+(index%4)*.025);
  const cost=scaledCost(profile.cost,index);
  const costLines=Object.entries(cost??{}).map(([resource,amount])=>`${resource[0].toUpperCase()+resource.slice(1)} stock: −${Number(amount).toLocaleString()}`);
  const primary:OpportunityResponse={
    id:`${spine.id}-act`,label:spine.primary,
    flavor:authoredFlavor.primary,
    exact:[...costLines,...opportunityEffectLines(profile.commit),"Strategic orders: 0","Resolution: immediate"],
    contingent:[`${Math.round(chance*100)}% exploitation confidence`,...opportunityEffectLines(profile.success).map(line=>`SUCCESS // ${line}`),...opportunityEffectLines(profile.failure).map(line=>`FAILURE // ${line}`)],
    chance,cost,commit:profile.commit,success:profile.success,failure:profile.failure,
  };
  const alternateChance=1;
  const guaranteedAlternate:OpportunityEffect={
    ...profile.alternate,
    friendlyPressure:Math.max(profile.alternate.friendlyPressure??0,.2),
  };
  const alternate:OpportunityResponse={
    id:`${spine.id}-exploit`,label:spine.alternate,
    flavor:authoredFlavor.alternate,
    exact:["No strategic order consumed",...opportunityEffectLines(guaranteedAlternate).map(line=>`GUARANTEED // ${line}`),"Resolution: immediate"],
    contingent:["No sealed failure branch"],
    chance:alternateChance,success:guaranteedAlternate,
  };
  return{...spine,categoryLabel:OPPORTUNITY_CATEGORY_LABELS[spine.category],responses:[primary,alternate]};
});

const DIRECTOR_DEFAULTS:DirectorModifiers={productionOutput:1,supplyUse:1,casualty:1,desertion:1,confidence:0,friendlyPressure:0,enemyPressure:0,supplyConversion:1,legitimacy:0,resistance:0,maintenance:0,treasury:0};
export const phaseForDay=(day:number)=>CAMPAIGN_PHASES.find(x=>day>=x.days[0]&&day<=x.days[1])??CAMPAIGN_PHASES[CAMPAIGN_PHASES.length-1];
export const eventForState=(state:GameState)=>{
  const phase=phaseForDay(state.day),history=state.eventHistory??[],seen=new Set(history.map(record=>record.eventId));
  const lastCalculus=history[0]?.calculusId??CAMPAIGN_EVENT_CALCULUS[history[0]?.eventId??""]??history[0]?.eventId;
  const triggered=CORE_CAMPAIGN_EVENTS.filter(event=>event.trigger&&event.id!==lastCalculus&&(
    (event.id==="shell-famine"&&state.production.munitions.stock/Math.max(1,state.production.munitions.use)<2)||
    (event.id==="general-stoppage"&&state.resistance>=55)||
    (event.id==="formation-fever"&&state.readiness<42)||
    (event.id==="creditor-call"&&state.dependency>=55)
  ));
  const baseline=triggered.length
    ? triggered[Math.floor(hash(`${state.campaignSeed}:${state.day}:reactive-crisis`)*triggered.length)]
    : (()=>{const deck=CORE_CAMPAIGN_EVENTS.filter(event=>!event.trigger&&event.phases.includes(phase.id));const offset=Math.floor(hash(`${state.campaignSeed}:${phase.id}:event-offset`)*deck.length);const stride=hash(`${state.campaignSeed}:${phase.id}:event-stride`)>.5?3:1;const relative=Math.max(0,state.day-phase.days[0]);return deck[(offset+relative*stride)%deck.length]??CORE_CAMPAIGN_EVENTS[0]})();
  const aligned=CAMPAIGN_EVENTS.filter(event=>!event.trigger&&event.phases.includes(phase.id)&&!seen.has(event.id)&&(CAMPAIGN_EVENT_CALCULUS[event.id]??event.id)===baseline.id);
  const phaseUnused=CAMPAIGN_EVENTS.filter(event=>!event.trigger&&event.phases.includes(phase.id)&&!seen.has(event.id));
  const anyUnused=CAMPAIGN_EVENTS.filter(event=>!event.trigger&&!seen.has(event.id));
  const deck=!seen.has(baseline.id)?[baseline]:aligned.length?aligned:phaseUnused.length?phaseUnused:anyUnused.length?anyUnused:[baseline];
  const narrative=deck[Math.floor(hash(`${state.campaignSeed}:${state.day}:${baseline.id}:campaign-writing`)*deck.length)]??baseline;
  return{...narrative,exact:baseline.exact,modifiers:baseline.modifiers,calculusId:baseline.id};
};
const combineDirectorModifiers=(phase:Partial<DirectorModifiers>,event:Partial<DirectorModifiers>):DirectorModifiers=>({
  productionOutput:(phase.productionOutput??DIRECTOR_DEFAULTS.productionOutput)*(event.productionOutput??DIRECTOR_DEFAULTS.productionOutput),supplyUse:(phase.supplyUse??DIRECTOR_DEFAULTS.supplyUse)*(event.supplyUse??DIRECTOR_DEFAULTS.supplyUse),casualty:(phase.casualty??DIRECTOR_DEFAULTS.casualty)*(event.casualty??DIRECTOR_DEFAULTS.casualty),desertion:(phase.desertion??DIRECTOR_DEFAULTS.desertion)*(event.desertion??DIRECTOR_DEFAULTS.desertion),
  confidence:(phase.confidence??DIRECTOR_DEFAULTS.confidence)+(event.confidence??DIRECTOR_DEFAULTS.confidence),friendlyPressure:(phase.friendlyPressure??DIRECTOR_DEFAULTS.friendlyPressure)+(event.friendlyPressure??DIRECTOR_DEFAULTS.friendlyPressure),enemyPressure:(phase.enemyPressure??DIRECTOR_DEFAULTS.enemyPressure)+(event.enemyPressure??DIRECTOR_DEFAULTS.enemyPressure),supplyConversion:(phase.supplyConversion??DIRECTOR_DEFAULTS.supplyConversion)*(event.supplyConversion??DIRECTOR_DEFAULTS.supplyConversion),
  legitimacy:(phase.legitimacy??DIRECTOR_DEFAULTS.legitimacy)+(event.legitimacy??DIRECTOR_DEFAULTS.legitimacy),resistance:(phase.resistance??DIRECTOR_DEFAULTS.resistance)+(event.resistance??DIRECTOR_DEFAULTS.resistance),maintenance:(phase.maintenance??DIRECTOR_DEFAULTS.maintenance)+(event.maintenance??DIRECTOR_DEFAULTS.maintenance),treasury:(phase.treasury??DIRECTOR_DEFAULTS.treasury)+(event.treasury??DIRECTOR_DEFAULTS.treasury),
});
export const directorForState=(state:GameState):CampaignDirector=>{const phase=phaseForDay(state.day),event=eventForState(state);return{phase,event,modifiers:combineDirectorModifiers(phase.modifiers,event.modifiers),trigger:event.trigger??`Seeded ${phase.label} condition`};};

const compileSituationForState=(state:GameState)=>{const event=eventForState(state),calculus=CORE_CAMPAIGN_EVENTS.find(item=>item.id===(event.calculusId??event.id))??event;return compileSituation(state,SITUATIONS,{id:calculus.id,category:calculus.category,label:calculus.label});};
export const situationForDay = (day: number) => SITUATIONS[(day - 1) % SITUATIONS.length];
export const situationForState = (state:GameState):CompiledSituation => {
  if(state.currentSituation?.day===state.day&&state.currentSituation.contentPackVersion===CONTENT_PACK_VERSION&&state.currentSituation.maneuverPresentations)return state.currentSituation;
  return compileSituationForState(state);
};

export const OPPORTUNITY_FREQUENCY=1/5;
/*
 * Random assignments use one sealed five-sided roll per player day. A single
 * face opens the assignment. A raw trigger is suppressed when either of the
 * preceding two days also rolled the trigger face, so assignments can never
 * occupy the same three-day window. Day 1 is an onboarding day and can never
 * open one.
 */
const opportunityRoll=(seed:number,day:number)=>
  1+Math.floor(hash(`${seed}:target-of-opportunity:roll:${day}`)*5);
const opportunityRawTrigger=(seed:number,day:number)=>
  day>1&&opportunityRoll(seed,day)===1;
const opportunityOccurs=(seed:number,day:number)=>
  opportunityRawTrigger(seed,day)&&
  !opportunityRawTrigger(seed,day-1)&&
  !opportunityRawTrigger(seed,day-2);
const opportunitySchedule=(seed:number,throughDay:number)=>{
  const days:number[]=[];
  for(let day=2;day<=throughDay;day+=1)
    if(opportunityOccurs(seed,day))days.push(day);
  return days;
};
const opportunityOrder=(seed:number)=>[...OPPORTUNITY_TEMPLATES].sort((a,b)=>hash(`${seed}:target-of-opportunity:deck:${a.id}`)-hash(`${seed}:target-of-opportunity:deck:${b.id}`));

export const opportunityForState=(state:GameState):OpportunityPacket|null=>{
  if(!opportunityOccurs(state.campaignSeed,state.day))return null;
  const occurrence=opportunitySchedule(state.campaignSeed,state.day-1).length;
  const assignment=(state.opportunityAssignments??[]).find(item=>item.campaignId===state.campaignId&&item.day===state.day);
  const fullDeck=opportunityOrder(state.campaignSeed);
  const remaining=fullDeck.filter(item=>!(state.accountOpportunityIds??[]).includes(item.id));
  const deck=remaining.length?remaining:fullDeck;
  const template=assignment
    ? OPPORTUNITY_TEMPLATES.find(item=>item.id===assignment.opportunityId)
    : deck[occurrence%deck.length];
  if(!template)return null;
  const situation=situationForState(state);
  const opensAtFraction=0;
  const closesAtFraction=1;
  return{...template,sector:situation.sector,occurrence:occurrence+1,opensAtFraction,closesAtFraction,ticket:`TOO-${state.day}-${Math.floor(hash(`${state.campaignSeed}:${state.day}:${template.id}:${situation.sectorId}`)*0xffffffff).toString(16).padStart(8,"0")}`};
};

export const recordOpportunityOpened=(state:GameState,packet:OpportunityPacket,at=Date.now())=>{
  if((state.opportunityAssignments??[]).some(item=>item.campaignId===state.campaignId&&item.day===state.day))return state;
  const next=clone(state);
  next.opportunityAssignments.unshift({campaignId:state.campaignId,day:state.day,opportunityId:packet.id,occurrence:packet.occurrence,status:"opened",openedAt:at,updatedAt:at});
  if(!next.accountOpportunityIds.includes(packet.id))next.accountOpportunityIds.push(packet.id);
  return next;
};

export const recordOpportunityExpired=(state:GameState,packet:OpportunityPacket,at=Date.now())=>{
  if(state.opportunityHistory.some(record=>record.day===state.day&&record.opportunityId===packet.id))return state;
  const opened=recordOpportunityOpened(state,packet,at),next=clone(opened);
  const assignment=next.opportunityAssignments.find(item=>item.campaignId===state.campaignId&&item.day===state.day&&item.opportunityId===packet.id);
  if(assignment){assignment.status="expired";assignment.updatedAt=at;}
  next.opportunityHistory.unshift({day:state.day,opportunityId:packet.id,responseId:"window-expired",label:packet.label,response:"No response entered",outcome:"expired",report:`${packet.label} at ${packet.sector} expired without a command response. The missed opening remains in the permanent opportunity ledger.`,friendlyPressure:0,category:packet.category});
  return next;
};

export const opportunityStatusForFraction=(state:GameState,fraction:number)=>{
  const packet=opportunityForState(state);if(!packet)return{status:"none" as const,packet:null};
  if(fraction<packet.opensAtFraction)return{status:"upcoming" as const,packet};
  if(fraction>=packet.closesAtFraction)return{status:"expired" as const,packet};
  const resolved=state.opportunityHistory.some(record=>record.day===state.day&&record.opportunityId===packet.id);
  if(resolved)return{status:"resolved" as const,packet};
  return{status:"active" as const,packet};
};

const legacyTelemetryReport=/Campaign Director:|Operational packet:|Field condition:|Foreign delivery:|Domestic state:|Production closed with|entered training|No Insight Points were awarded/i;
const legacyNamedCollapse=/At ([^,\n]+), [^;\n]+ came apart under concentrated fire;/g;
const rewriteNamedCollapseReports=(state:GameState)=>{
  for(const report of state.reports)report.body=report.body.replace(legacyNamedCollapse,"At $1, the plan lost integrity under concentrated fire;");
};
const rewriteLegacyMorningReport=(state:GameState)=>{
  const latest=state.reports[0],operations=state.operationsLedger,adversary=state.adversaryLedger,diplomacy=state.diplomacyLedger,domestic=state.domesticLedger,production=state.productionLedger,forceGeneration=state.forceGenerationLedger;
  if(!latest||!legacyTelemetryReport.test(latest.body)||!operations||!adversary||!diplomacy||!domestic||!production||!forceGeneration)return;
  const eventRecord=state.eventHistory.find(record=>record.day===operations.day);const event=CAMPAIGN_EVENTS.find(item=>item.id===eventRecord?.eventId);
  const history=state.situationHistory.find(record=>record.day===operations.day);const aftermath=(history?.factsCreated??[]).map(id=>FACT_CATALOG[id]).filter(Boolean);
  const award=state.doctrineWinAwards.find(item=>item.day===operations.day);const opportunity=state.opportunityHistory.find(item=>item.day===operations.day);
  const dispatch=composeWarDispatch({sector:operations.sector,maneuverLabel:operations.maneuver==="Standing Tempo"?null:operations.maneuver,conditionBrief:event?.brief??"Field reports reached headquarters before the formations had finished counting the night.",outcomeBand:operations.outcomeBand,movement:operations.groundMovement,friendlyLosses:operations.friendlyLosses,enemyLosses:operations.enemyLosses,committed:operations.committed,forceRatio:operations.forceRatio,adversary,diplomacy,domestic,production,forceGeneration,desertionAttempted:state.deserters,doctrineGain:award?.reward??0,aftermath,opportunityOutcome:opportunity?.outcome==="expired"?"missed":opportunity?.outcome??null});
  state.reports[0]={...latest,...dispatch,epigraph:event?.quote??latest.epigraph};
};

const recordObject=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object";
const finiteNumber=(value:unknown)=>typeof value==="number"&&Number.isFinite(value);
const stringArray=(value:unknown)=>Array.isArray(value)&&value.every(item=>typeof item==="string");
const nullableString=(value:unknown)=>value===null||typeof value==="string";
const pressureBandValue=(value:unknown)=>value==="watch"||value==="active"||value==="cascade";
const validSubMissionReference=(value:unknown,domain:SubMissionDomain)=>{
  if(!recordObject(value)||value.domain!==domain||typeof value.archetypeId!=="string"||subMissionArchetypeById(value.archetypeId)?.domain!==domain||typeof value.frameId!=="string"||subMissionFrameById(value.frameId)?.archetypeId!==value.archetypeId)return false;
  const rendered=value.rendered,anchor=value.operationalAnchor;
  return typeof value.realizationId==="string"&&typeof value.contentId==="string"&&pressureBandValue(value.pressureBand)&&typeof value.category==="string"&&finiteNumber(value.selectionScore)&&finiteNumber(value.candidateCount)&&typeof value.selectionBasis==="string"&&stringArray(value.evidence)&&typeof value.resolutionTicket==="string"&&typeof value.stateFingerprint==="string"&&recordObject(rendered)&&typeof rendered.title==="string"&&typeof rendered.brief==="string"&&typeof rendered.question==="string"&&typeof rendered.authority==="string"&&stringArray(rendered.aliases)&&recordObject(anchor)&&typeof anchor.sector==="string"&&typeof anchor.problemClass==="string"&&typeof anchor.headline==="string"&&Array.isArray(value.convergence);
};
const validSubMissionHistoryRecord=(value:unknown):value is SubMissionHistoryRecord=>{
  if(!recordObject(value)||(value.domain!=="domestic"&&value.domain!=="network")||!finiteNumber(value.day)||typeof value.archetypeId!=="string"||subMissionArchetypeById(value.archetypeId)?.domain!==value.domain||typeof value.frameId!=="string"||subMissionFrameById(value.frameId)?.archetypeId!==value.archetypeId)return false;
  return typeof value.realizationId==="string"&&typeof value.contentId==="string"&&pressureBandValue(value.pressureBand)&&typeof value.category==="string"&&typeof value.resolutionTicket==="string"&&nullableString(value.optionId)&&nullableString(value.familyId)&&nullableString(value.choiceId)&&(value.outcome==="issued"||value.outcome==="lapsed");
};
const validResolutionHistoryRecord=(value:unknown):value is DailyResolutionRecord=>{
  if(!recordObject(value)||value.schemaVersion!==1||!finiteNumber(value.resolvedDay)||typeof value.sector!=="string"||!recordObject(value.opening)||!recordObject(value.closing))return false;
  const orders=value.orders,operations=value.operations,production=value.production,forceGeneration=value.forceGeneration,domestic=value.domestic,diplomacy=value.diplomacy,observed=value.adversaryObserved,personnel=value.personnel,outcome=value.outcome;
  if(!recordObject(orders)||!finiteNumber(orders.used)||!finiteNumber(orders.unused)||!nullableString(orders.maneuverId)||!Array.isArray(orders.directives)||!orders.directives.every(item=>recordObject(item)&&typeof item.family==="string"&&typeof item.choice==="string"))return false;
  if(!recordObject(operations)||typeof operations.succeeded!=="boolean"||!finiteNumber(operations.enemyLosses)||!recordObject(production)||!Array.isArray(production.lines)||!production.lines.every(line=>recordObject(line)&&typeof line.resource==="string"&&finiteNumber(line.net)))return false;
  if(!recordObject(forceGeneration)||!recordObject(domestic)||!finiteNumber(domestic.legitimacyChange)||!finiteNumber(domestic.resistanceChange)||!recordObject(diplomacy))return false;
  if(!recordObject(observed)||!stringArray(observed.observedOrders)||!stringArray(observed.signals)||!recordObject(personnel)||!["combatLosses","desertionAttempts","retained","intercepted","netDesertion","effectiveGraduates","deployableAssigned"].every(field=>finiteNumber(personnel[field])))return false;
  return recordObject(outcome)&&finiteNumber(outcome.groundMovement)&&typeof outcome.outcomeBand==="string"&&finiteNumber(outcome.doctrineGain)&&stringArray(outcome.factsCreated);
};

export const restoreCampaignState=(value:unknown):GameState|null=>{
  if(!value||typeof value!=="object")return null;const candidate=value as Partial<GameState>;
  const theater=validTheater(candidate.theater)?candidate.theater:DEFAULT_CAMPAIGN.theater;
  const base=initialState({seed:candidate.campaignSeed,archetype:candidate.stateArchetype,adversaryPersonality:candidate.adversaryPersonality,theater});
  if(typeof candidate.day!=="number"||typeof candidate.deployable!=="number"||typeof candidate.production!=="object")return null;
  const state:GameState={...base,...candidate,saveVersion:4,contentPackVersion:CONTENT_PACK_VERSION,campaignSeed:sanitizeSeed(candidate.campaignSeed??base.campaignSeed),theater,
    production:{...base.production,...candidate.production},adversary:{...base.adversary,...candidate.adversary,maneuverCounts:{...base.adversary.maneuverCounts,...candidate.adversary?.maneuverCounts},adaptation:{...base.adversary.adaptation,...candidate.adversary?.adaptation}},
    actors:Array.isArray(candidate.actors)?candidate.actors:base.actors,trainingCohorts:Array.isArray(candidate.trainingCohorts)?candidate.trainingCohorts:base.trainingCohorts,
    decisions:Array.isArray(candidate.decisions)?candidate.decisions:base.decisions,eventHistory:Array.isArray(candidate.eventHistory)?candidate.eventHistory:base.eventHistory,reports:Array.isArray(candidate.reports)&&candidate.reports.length?candidate.reports:base.reports,scheduled:Array.isArray(candidate.scheduled)?candidate.scheduled:base.scheduled,
    opportunityCommitment:candidate.opportunityCommitment??null,opportunityHistory:Array.isArray(candidate.opportunityHistory)?candidate.opportunityHistory:base.opportunityHistory,
    opportunityAssignments:Array.isArray(candidate.opportunityAssignments)?candidate.opportunityAssignments:base.opportunityAssignments,
    accountOpportunityIds:Array.isArray(candidate.accountOpportunityIds)?candidate.accountOpportunityIds.filter(item=>typeof item==="string"):base.accountOpportunityIds,
    unlocked:Array.isArray(candidate.unlocked)?[...new Set(candidate.unlocked.map(id=>id==="deny-quarter"?"total-war":id))]:base.unlocked,doctrineWinAwards:Array.isArray(candidate.doctrineWinAwards)?candidate.doctrineWinAwards:base.doctrineWinAwards,
    theaterSectors:Array.isArray(candidate.theaterSectors)&&candidate.theaterSectors.length?candidate.theaterSectors:base.theaterSectors,
    operationalFacts:Array.isArray(candidate.operationalFacts)?candidate.operationalFacts:base.operationalFacts,
    situationHistory:Array.isArray(candidate.situationHistory)?candidate.situationHistory:base.situationHistory,currentSituation:candidate.currentSituation??null,
    currentSubMissions:candidate.currentSubMissions??null,subMissionHistory:Array.isArray(candidate.subMissionHistory)?candidate.subMissionHistory.filter(validSubMissionHistoryRecord):base.subMissionHistory,
    resolutionHistory:Array.isArray(candidate.resolutionHistory)?candidate.resolutionHistory.filter(validResolutionHistoryRecord):base.resolutionHistory,
    active:candidate.active??base.active,locks:candidate.locks??base.locks,activeDiplomacy:Array.isArray(candidate.activeDiplomacy)?candidate.activeDiplomacy:base.activeDiplomacy,affinityProofs:candidate.affinityProofs??base.affinityProofs,victorySecuredDay:typeof candidate.victorySecuredDay==="number"?candidate.victorySecuredDay:null};
  normalize(state);rewriteNamedCollapseReports(state);rewriteLegacyMorningReport(state);if(state.currentSituation?.day!==state.day||state.currentSituation.contentPackVersion!==CONTENT_PACK_VERSION||!state.currentSituation.maneuverPresentations)state.currentSituation=compileSituationForState(state);const docket=state.currentSubMissions;const docketValid=recordObject(docket)&&docket.day===state.day&&docket.version===SUB_MISSION_SCHEMA_VERSION&&docket.contentVersion===SUB_MISSION_CONTENT_VERSION&&validSubMissionReference(docket.domestic,"domestic")&&validSubMissionReference(docket.network,"network");if(!docketValid)state.currentSubMissions=compileSubMissionDocket(state,state.subMissionHistory);state.adversary.objective=state.currentSituation.sector;return state;
};
export const maneuverById = (id: string | null) => MANEUVERS.find((m) => m.id === id);
export const maneuverForSituation = (
  maneuver:Maneuver,
  situation:CompiledSituation,
):Maneuver=>{
  const presentation=situation.maneuverPresentations?.[maneuver.id];
  return presentation
    ? {...maneuver,label:presentation.label,flavor:presentation.rationale}
    : maneuver;
};
export const maneuverForState=(state:GameState,id:string|null)=>
  id
    ? (()=>{const maneuver=maneuverById(id);return maneuver?maneuverForSituation(maneuver,situationForState(state)):undefined;})()
    : undefined;
export const maneuversForState=(state:GameState):Maneuver[]=>{
  const situation=situationForState(state);
  return situation.maneuvers
    .map(id=>MANEUVERS.find(maneuver=>maneuver.id===id))
    .filter((maneuver):maneuver is Maneuver=>!!maneuver)
    .map(maneuver=>maneuverForSituation(maneuver,situation));
};
const maneuverGeometryFit=(state:GameState,maneuver:Maneuver)=>{
  const situation=situationForState(state),problem=situation.problemClass;
  let fit=maneuver.success;
  if(problem==="command"){if(maneuver.id==="network")fit+=.36;if(maneuver.id==="route")fit+=.12;}
  if(problem==="logistics"){if(maneuver.id==="route")fit+=.36;if(maneuver.id==="reinforce")fit+=.1;}
  if(problem==="assault"){if(maneuver.id==="breach")fit+=.34;if(maneuver.id==="interdict")fit+=.2;}
  if(problem==="crossing"){if(maneuver.id==="route")fit+=.34;if(maneuver.id==="network")fit+=.12;}
  if(problem==="force-preservation"){if(maneuver.id==="reinforce"||maneuver.id==="abandon")fit+=.27;}
  if(problem==="exploitation"&&maneuver.id==="exploit")fit+=.36;
  if(problem==="counterstroke"){if(maneuver.id==="interdict")fit+=.3;if(maneuver.id==="reinforce")fit+=.2;}
  if(problem==="observation"){if(maneuver.id==="network")fit+=.3;if(maneuver.id==="interdict")fit+=.14;}
  const terrain=`${situation.terrain} ${situation.ground}`.toLowerCase();
  if(terrain.includes("ridge")&&(maneuver.id==="breach"||maneuver.id==="interdict"))fit+=.1;
  if(terrain.includes("mined")&&(maneuver.id==="breach"||maneuver.id==="route"))fit+=.1;
  if(terrain.includes("flood")&&maneuver.id==="route")fit+=.12;
  if(terrain.includes("industrial")&&maneuver.id==="network")fit+=.08;
  if(["famine","critical","strained"].includes(situation.bands.supply)&&maneuver.id==="route")fit+=.12;
  if(["severed","degraded"].includes(situation.bands.network)&&maneuver.id==="network")fit+=.12;
  return fit+hash(`${state.campaignSeed}:${state.day}:${situation.id}:path:${maneuver.id}`)*.0001;
};
export const regulatedPathwayForState=(state:GameState,maneuver:Maneuver)=>{
  const docket=situationForState(state).maneuvers.map(id=>maneuverById(id)).filter((item):item is Maneuver=>!!item);
  const ranked=[...docket].sort((left,right)=>maneuverGeometryFit(state,right)-maneuverGeometryFit(state,left));
  if(!docket.some(item=>item.id===maneuver.id))return"outside-docket" as const;
  return ranked[0]?.id===maneuver.id?"advantage" as const:"loss-exposure" as const;
};
export type ManeuverChanceTerm={id:string;label:string;points:number;conceptId:string};
export const explainManeuverChance = (s:GameState,m:Maneuver,director:CampaignDirector=directorForState(s)) => {
  const doctrine=(m.id==="interdict"&&s.unlocked.includes("long-range")?.09:0)+(m.id==="breach"&&s.unlocked.includes("forced-passage")?.12:0)+(m.id==="network"&&s.unlocked.includes("relay-discipline")?.06:0);
  const pathRole=regulatedPathwayForState(s,m);
  const terms:ManeuverChanceTerm[]=[
    {id:"base",label:"Maneuver base",points:m.success*100,conceptId:"execution-confidence"},
    {id:"intelligence",label:"Intelligence",points:(s.intelligence-42)*.2,conceptId:"intelligence"},
    {id:"readiness",label:"Readiness",points:(s.readiness-64)*.15,conceptId:"readiness"},
    {id:"equipment",label:"Equipment",points:(s.equipment-71)*.15,conceptId:"equipment-coverage"},
    {id:"shortages",label:"Supply shortages",points:Object.values(s.production).filter(line=>line.stock<line.use*2).length*-3,conceptId:"lines-below-two-days"},
    {id:"proofs",label:`Field proofs // ${s.affinityProofs[m.vector]??0}`,points:Math.min(8,(s.affinityProofs[m.vector]??0)*2),conceptId:"execution-confidence"},
    {id:"doctrine",label:"Internalized doctrine",points:doctrine*100,conceptId:"execution-confidence"},
    {id:"adaptation",label:`Enemy adaptation // ${s.adversary?.adaptation[m.id]??0}`,points:-Math.min(12,(s.adversary?.adaptation[m.id]??0)*1.5),conceptId:"enemy-adaptation"},
    {id:"condition",label:`Campaign condition // ${director.event.label}`,points:director.modifiers.confidence*100,conceptId:"campaign-synopsis"},
    {id:"path-regulation",label:pathRole==="advantage"?"Generated advantage pathway // 1 of 3":"Generated loss-exposure pathway // 2 of 3",points:pathRole==="advantage"?8:pathRole==="loss-exposure"?-4:0,conceptId:"campaign-synopsis"},
  ];
  const unclamped=terms.reduce((total,term)=>total+term.points,0)/100;
  return{terms,unclamped,result:Math.max(.05,Math.min(.95,unclamped)),clamp:[.05,.95] as const};
};
export const maneuverChance = (s: GameState, m: Maneuver, director:CampaignDirector=directorForState(s)) => explainManeuverChance(s,m,director).result;
export const doctrineStage = (id: string) => DOCTRINES.flatMap((v) => v.stages.map((stage,index) => ({ vector:v,stage,index }))).find((x) => x.stage.id === id);

export const directiveRejection=(state:GameState,family:Family,choice:Choice)=>{
  if(state.actions<1)return "No daily orders remain.";
  if(state.status!=="active")return `The campaign is ${state.status}.`;
  if((state.locks[family.id]??0)>state.day)return `${family.label} remains locked until Day ${state.locks[family.id]}.`;
  if(family.id==="desertion"&&choice.id==="patrols"&&state.patrolCommitment>=4800)return "The authorized 4,800-person patrol screen is already established.";
  const reserveRequirement=choice.id==="release-reserve"?12000:choice.id==="walking-wounded"?6000:0;
  if(reserveRequirement&&state.reserves<reserveRequirement)return `${choice.label} requires ${reserveRequirement.toLocaleString()} personnel in the replacement reserve.`;
  const deployableRequirement=choice.id==="central-reserve"?16000:choice.id==="rotate-battalions"?9000:choice.id==="scheduled-rotation"?8000:choice.id==="rebuild-cadres"?7000:choice.id==="convalescent-leave"?5000:0;
  if(deployableRequirement&&state.deployable<deployableRequirement)return `${choice.label} requires ${deployableRequirement.toLocaleString()} deployable personnel.`;
  return null;
};

export const commit = (state: GameState, family: Family, choice: Choice) => {
  if(directiveRejection(state,family,choice))return state;
  const s = clone(state); add(s, choice.delta);
  if (choice.delay) s.scheduled.push({ day: s.day + choice.delay.days, source: choice.label, delta: choice.delay.delta });
  if (choice.target) s.pendingTarget = choice.target;
  if (choice.tempo) s.tempo = choice.tempo;
  if (choice.networkPosture) s.networkPosture = choice.networkPosture;
  s.active[family.id] = choice.id;
  if(family.module==="diplomacy")s.activeDiplomacy.push({familyId:family.id,choiceId:choice.id,startedDay:s.day,expiresDay:s.day+diplomacyDurationFor(family.id,choice),actorEffects:choice.actorEffects?.map(effect=>({...effect}))});
  s.locks[family.id] = s.day + family.lock; s.actions -= 1; s.decisions.unshift({ day: s.day, family: family.label, choice: choice.label, familyId:family.id, choiceId:choice.id }); normalize(s); return s;
};

export const maneuverOrderRejection=(state:GameState,maneuver:Maneuver)=>{
  const situation=situationForState(state);
  if(state.actions<1)return "No daily orders remain.";
  if(state.status!=="active")return `The campaign is ${state.status}.`;
  if(state.maneuver)return "An operational order already exists for this day.";
  if(!situation.maneuvers.includes(maneuver.id))return `${maneuver.label} is not authorized by ${situation.blueprintId}.`;
  return null;
};
export const commitManeuver = (state: GameState, maneuver: Maneuver) => {
  if(maneuverOrderRejection(state,maneuver))return state;
  const s = clone(state),situation=situationForState(s),realized=maneuverForSituation(maneuver,situation); s.maneuver = maneuver.id; s.actions -= 1; add(s,maneuver.ownedDelta);s.readiness += maneuver.readiness ?? 0; s.reciprocity += maneuver.reciprocity ?? 0;
  s.decisions.unshift({ day: s.day, family: `Operational Direction // ${situation.sector}`, choice: realized.label, familyId:"main-campaign", choiceId:maneuver.id }); normalize(s); return s;
};

export const opportunityResponseRejection=(state:GameState,response:OpportunityResponse)=>{
  if(state.status!=="active")return `The campaign is ${state.status}.`;
  const packet=opportunityForState(state);
  if(!packet)return "No target of opportunity is scheduled for this day.";
  if(!packet.responses.some(candidate=>candidate.id===response.id))return "That response does not belong to the current opportunity.";
  if(state.opportunityHistory.some(record=>record.day===state.day&&record.opportunityId===packet.id))return "This opportunity has already resolved.";
  if(state.opportunityCommitment?.day===state.day)return "A legacy target-of-opportunity response is already committed for this day.";
  const short=Object.entries(response.cost??{}).find(([resource,amount])=>state.production[resource as Resource].stock<Number(amount));
  return short?`Insufficient ${short[0]} stock for this response.`:null;
};

export const commitOpportunity=(state:GameState,response:OpportunityResponse)=>{
  if(opportunityResponseRejection(state,response))return state;
  const s=clone(state),packet=opportunityForState(s);if(!packet)return state;
  Object.entries(response.cost??{}).forEach(([resource,amount])=>{s.production[resource as Resource].stock=Math.max(0,s.production[resource as Resource].stock-Number(amount));});
  applyOpportunityEffect(s,response.commit);
  const exploited=response.chance>=1||hash(`${packet.ticket}:${response.id}:immediate-resolution`)<=response.chance;
  const effect=exploited?response.success:response.failure??{};applyOpportunityEffect(s,effect);normalize(s);
  const report=exploited?`${packet.individual} executed ${response.label.toLowerCase()} at ${packet.sector}; the opening was exploited before the window closed.`:`${packet.individual} attempted ${response.label.toLowerCase()} at ${packet.sector}; the opening closed without the intended effect.`;
  s.opportunityHistory.unshift({day:s.day,opportunityId:packet.id,responseId:response.id,label:packet.label,response:response.label,outcome:exploited?"exploited":"missed",report,friendlyPressure:effect.friendlyPressure??0,category:packet.category});
  const assignment=s.opportunityAssignments.find(item=>item.campaignId===s.campaignId&&item.day===s.day&&item.opportunityId===packet.id);
  if(assignment){assignment.status="acted";assignment.updatedAt=Date.now();}
  else s.opportunityAssignments.unshift({campaignId:s.campaignId,day:s.day,opportunityId:packet.id,occurrence:packet.occurrence,status:"acted",openedAt:Date.now(),updatedAt:Date.now()});
  if(!s.accountOpportunityIds.includes(packet.id))s.accountOpportunityIds.push(packet.id);
  s.opportunityCommitment=null;
  return s;
};

const applyOpportunityEffect=(state:GameState,effect:OpportunityEffect={})=>{
  if(effect.enemyForce){state.adversary.force=Math.max(0,state.adversary.force+effect.enemyForce);state.enemy=Math.max(0,state.enemy+effect.enemyForce);}
  if(effect.enemyMunitions)state.adversary.munitions=Math.max(0,state.adversary.munitions+effect.enemyMunitions);
  if(effect.enemyReadiness)state.adversary.readiness=Math.max(0,Math.min(100,state.adversary.readiness+effect.enemyReadiness));
  if(effect.enemyEquipment)state.adversary.equipment=Math.max(0,Math.min(100,state.adversary.equipment+effect.enemyEquipment));
  if(effect.intelligence)state.intelligence+=effect.intelligence;
  if(effect.readiness)state.readiness+=effect.readiness;
  if(effect.equipment)state.equipment+=effect.equipment;
  if(effect.materiel)state.materiel+=effect.materiel;
  if(effect.munitions)state.production.munitions.stock=Math.max(0,state.production.munitions.stock+effect.munitions);
  if(effect.armor)state.production.armor.stock=Math.max(0,state.production.armor.stock+effect.armor);
  if(effect.flight)state.production.flight.stock=Math.max(0,state.production.flight.stock+effect.flight);
  if(effect.drones)state.production.drones.stock=Math.max(0,state.production.drones.stock+effect.drones);
  if(effect.treasury)state.treasury+=effect.treasury;
  if(effect.legitimacy)state.legitimacy+=effect.legitimacy;
  if(effect.resistance)state.resistance+=effect.resistance;
  if(effect.dependency)state.dependency+=effect.dependency;
  if(effect.atrocityExposure)state.atrocityExposure+=effect.atrocityExposure;
  if(effect.reciprocity)state.reciprocity+=effect.reciprocity;
};

const resolveLegacyOpportunityForDay=(state:GameState)=>{
  const commitment=state.opportunityCommitment;
  if(!commitment||commitment.day!==state.day)return{pressure:0,report:""};
  const packet=(LEGACY_OPPORTUNITY_TEMPLATES as unknown as Array<{id:string;label:string;headline:string;brief:string;responses:OpportunityResponse[]}>).find(item=>item.id===commitment.opportunityId);
  const response=packet?.responses.find(x=>x.id===commitment.responseId);
  if(!packet||!response){state.opportunityCommitment=null;return{pressure:0,report:""};}
  const ticket=`LEGACY-TOO-${state.campaignSeed}-${state.day}-${packet.id}`;
  const exploited=response.chance>=1||hash(`${ticket}:${response.id}:resolution`)<=response.chance;
  const effect=exploited?response.success:response.failure??{};applyOpportunityEffect(state,effect);normalize(state);
  const sector=situationForState(state).sector;
  const report=exploited?`${response.label} exploited ${packet.label.toLowerCase()} at ${sector}.`:`${response.label} missed the ${packet.label.toLowerCase()} at ${sector}.`;
  state.opportunityHistory.unshift({day:state.day,opportunityId:packet.id,responseId:response.id,label:packet.label,response:response.label,outcome:exploited?"exploited":"missed",report,friendlyPressure:effect.friendlyPressure??0});
  state.opportunityCommitment=null;
  return{pressure:effect.friendlyPressure??0,report:` Target of opportunity: ${report}`};
};

export const unlockDoctrine = (state: GameState, stageId: string) => {
  const found = doctrineStage(stageId); if (!found || state.unlocked.includes(stageId) || state.doctrine < found.stage.cost) return state;
  if (found.index > 0 && !state.unlocked.includes(found.vector.stages[found.index-1].id)) return state;
  const s = clone(state); s.doctrine -= found.stage.cost; s.unlocked.push(stageId); add(s, found.stage.delta); normalize(s); return s;
};

const tempoProfile = (tempo: Tempo) => ({ hold: [.55,.65,-.25], methodical: [1,1,.35], surge: [1.35,1.4,.85], "human-wave": [2.1,1.2,1.25] }[tempo]);
export const estimateDay = (s: GameState, director:CampaignDirector=directorForState(s)) => {
  const maneuver = maneuverById(s.maneuver); const [,tempoSupply] = tempoProfile(s.tempo);
  const casualty = projectOperations(s,maneuver??null).friendlyLosses;
  const desertion = Math.round((260 + s.desertionPressure * 31 + s.forced * .018) * (s.reciprocity < 45 ? 1.25 : 1) * director.modifiers.desertion);
  const retentionRate=s.active.desertion==="rations"?.35:s.active.desertion==="amnesty"?.22:s.active.desertion==="stations"?.12:0;
  const patrolRate=Math.min(.65,s.patrolCommitment/7200);
  const retained=Math.min(desertion,Math.round(desertion*retentionRate));
  const intercepted=Math.min(desertion-retained,Math.round(desertion*patrolRate));
  return { casualty, desertion, retained, intercepted, netDesertion: Math.max(0,desertion-retained-intercepted), retentionRate, patrolRate, supply: tempoSupply * (maneuver?.supply ?? 1) * director.modifiers.supplyUse };
};

export const liveProjection = (s: GameState, fraction: number) => {
  const f = Math.max(0, Math.min(1, fraction)); const estimate = estimateDay(s); const director=directorForState(s); const losses = Math.floor(estimate.casualty * f);
  const rollCall=(total:number)=>total<=0?0:Math.min(total,Math.max(1,Math.round(total*.06))+Math.floor(Math.max(0,total-Math.max(1,Math.round(total*.06)))*f));
  const deserted=rollCall(estimate.desertion);const retained=Math.min(deserted,Math.round(deserted*estimate.retentionRate));const intercepted=Math.min(deserted-retained,Math.round(deserted*estimate.patrolRate));const netDesertion=Math.max(0,deserted-retained-intercepted);
  const production: Record<Resource,number> = { munitions:0,armor:0,flight:0,drones:0 };
  const projected=executeCircuit(productionCircuit,s,{supplyMultiplier:tempoProfile(s.tempo)[1],resourceUse:maneuverById(s.maneuver)?.resourceUse,directorOutput:director.modifiers.productionOutput,directorUse:director.modifiers.supplyUse,directorMaintenance:director.modifiers.maintenance});
  projected.ledger.lines.forEach(line=>production[line.resource]=Math.max(0,Math.round(line.opening+(line.output-line.fulfilledUse)*f)));
  return { losses, deserted, retained, intercepted, netDesertion, deployable: Math.max(0, s.deployable - losses - netDesertion), armed: Math.max(0,s.armed-losses-netDesertion), production };
};

export const projectProduction = (s:GameState) => {const director=directorForState(s);return executeCircuit(productionCircuit,s,{supplyMultiplier:tempoProfile(s.tempo)[1],resourceUse:maneuverById(s.maneuver)?.resourceUse,directorOutput:director.modifiers.productionOutput,directorUse:director.modifiers.supplyUse,directorMaintenance:director.modifiers.maintenance}).ledger;};
export const projectForceGeneration = (s:GameState) => executeCircuit(forceGenerationCircuit,s,{preview:true}).ledger;
const operationProjection=(s:GameState,maneuver:Maneuver|null,roll:number)=>{const situation=situationForState(s);const director=directorForState(s);const balance=campaignBalanceProfile(s.campaignSeed);const adversaryPreview=executeCircuit(adversaryCircuit,s,{roll:hash(`${s.campaignSeed}:${s.day}:adversary:${maneuver?.id??"standing"}`),situation,playerManeuver:maneuver});const projected={...adversaryPreview.state,adversaryLedger:adversaryPreview.ledger};const [tempoCasualty,tempoSupply,tempoPressure]=tempoProfile(projected.tempo);const shortages=Object.values(projected.production).filter(x=>x.stock<x.use*2).length;const opportunityPressure=projected.opportunityHistory.find(record=>record.day===projected.day)?.friendlyPressure??0;return executeCircuit(operationsCircuit,projected,{situation,maneuver,roll,confidence:maneuver?maneuverChance(projected,maneuver):1,tempoCasualty,tempoSupply:tempoSupply*(maneuver?.supply??1),tempoPressure,shortages,directorCasualty:director.modifiers.casualty,directorFriendlyPressure:director.modifiers.friendlyPressure+opportunityPressure+(maneuver?balance.pacingPressure:0),directorEnemyPressure:director.modifiers.enemyPressure,directorSupplyConversion:director.modifiers.supplyConversion}).ledger;};
export const projectOperations = (s:GameState,maneuver:Maneuver|null=maneuverById(s.maneuver)??null) => {const situation=situationForState(s);return operationProjection(s,maneuver,deterministicRoll(situation.resolutionTicket,maneuver?.id??"standing"));};
export const projectOperationRange = (s:GameState,maneuver:Maneuver) => {const confidence=maneuverChance(s,maneuver);return{success:operationProjection(s,maneuver,confidence-.1),failure:operationProjection(s,maneuver,confidence+.1)};};
export const projectOutcomeBands=(s:GameState,maneuver:Maneuver)=>{const confidence=maneuverChance(s,maneuver);return{
  clean:operationProjection(s,maneuver,confidence-.25),executed:operationProjection(s,maneuver,confidence-.1),
  disrupted:operationProjection(s,maneuver,confidence+.1),collapse:operationProjection(s,maneuver,confidence+.25),
};};
export const maneuverContractFor=(s:GameState,maneuver:Maneuver)=>{const confidence=maneuverChance(s,maneuver);const aftermath=MANEUVER_AFTERMATH[maneuver.id];return{
  resolutionTicket:situationForState(s).resolutionTicket,confidence,
  bands:[
    {id:"clean" as const,label:outcomeBandLabel.clean,margin:"+20 points or more"},
    {id:"executed" as const,label:outcomeBandLabel.executed,margin:"0 to +19.9 points"},
    {id:"disrupted" as const,label:outcomeBandLabel.disrupted,margin:"−0.1 to −20 points"},
    {id:"collapse" as const,label:outcomeBandLabel.collapse,margin:"worse than −20 points"},
  ],
  aftermath:aftermath?{success:FACT_CATALOG[aftermath.successFact],failure:FACT_CATALOG[aftermath.failureFact],clean:aftermath.cleanFact?FACT_CATALOG[aftermath.cleanFact]:null}:null,
};};
export const projectDomestic = (s:GameState) => {const shortages=Object.values(s.production).filter(x=>x.stock<x.use*2).length;const director=directorForState(s);return executeCircuit(domesticCircuit,s,{friendlyLosses:estimateDay(s).casualty,shortages,directorLegitimacy:director.modifiers.legitimacy,directorResistance:director.modifiers.resistance}).ledger;};
export const projectDiplomacy = (s:GameState) => executeCircuit(diplomacyCircuit,s,{}).ledger;
export const projectAdversary = (s:GameState,maneuver:Maneuver|null=maneuverById(s.maneuver)??null) => executeCircuit(adversaryCircuit,s,{roll:hash(`${s.campaignSeed}:${s.day}:adversary:${maneuver?.id??"standing"}`),situation:situationForState(s),playerManeuver:maneuver}).ledger;

export const roundStrategicCount=(value:number)=>Math.round(value/100)*100;
export const fmtStrategic=(value:number)=>roundStrategicCount(value).toLocaleString();
export const describeGroundMovement=(value:number)=>{
  const absolute=Math.abs(value);
  if(absolute<.05)return{title:"The Front Stalled",sentence:"The front stalled; measured movement remained below 50 meters.",display:"STALL"};
  const direction=value>0?"forward":"back";
  const amount=absolute<1?`${Math.round(absolute*10)*100} m`:`${absolute.toFixed(1)} km`;
  return{title:value>0?`The Line Moved ${amount} Forward`:`The Line Fell Back ${amount}`,sentence:`The front moved ${amount} ${direction}.`,display:`${value>0?"+":"−"}${amount}`};
};

const strategicSnapshot=(state:GameState):StrategicSnapshot=>({
  day:state.day,front:state.front,armed:state.armed,deployable:state.deployable,readiness:state.readiness,equipment:state.equipment,materiel:state.materiel,
  treasury:state.treasury,legitimacy:state.legitimacy,resistance:state.resistance,dependency:state.dependency,intelligence:state.intelligence,desertionPressure:state.desertionPressure,
});

export const resolve = (state: GameState) => {
  if (state.status !== "active") return state; const s = clone(state); const situation = situationForState(s); const canonicalManeuver = maneuverById(s.maneuver)??null; const maneuver = canonicalManeuver?maneuverForSituation(canonicalManeuver,situation):null; const director=directorForState(s);const opening=strategicSnapshot(s);const docket=s.currentSubMissions?.day===s.day?s.currentSubMissions:compileSubMissionDocket(s,s.subMissionHistory);
  const arrivals = s.scheduled.filter((x) => x.day <= s.day); s.scheduled = s.scheduled.filter((x) => x.day > s.day); arrivals.forEach((x) => add(s, x.delta));
  Object.entries(s.active).forEach(([familyId, choiceId]) => { const f = FAMILIES.find((x) => x.id === familyId); if(f?.module==="diplomacy")return;const ch = f?.choices.find((x) => x.id === choiceId); add(s, ch?.tick); });
  const opportunityResult=resolveLegacyOpportunityForDay(s);
  const diplomacyResult=executeCircuit(diplomacyCircuit,s,{});Object.assign(s,diplomacyResult.state);s.diplomacyLedger=diplomacyResult.ledger;
  const adversaryResult=executeCircuit(adversaryCircuit,s,{roll:hash(`${s.campaignSeed}:${s.day}:adversary:${maneuver?.id??"standing"}`),situation,playerManeuver:maneuver});Object.assign(s,adversaryResult.state);s.adversaryLedger=adversaryResult.ledger;
  const [tempoCasualty,tempoSupply,tempoPressure] = tempoProfile(s.tempo); const maneuverSupply = maneuver?.supply ?? 1;
  const productionResult=executeCircuit(productionCircuit,s,{supplyMultiplier:tempoSupply,resourceUse:maneuver?.resourceUse,directorOutput:director.modifiers.productionOutput,directorUse:director.modifiers.supplyUse,directorMaintenance:director.modifiers.maintenance});Object.assign(s,productionResult.state);s.productionLedger=productionResult.ledger;
  const forceResult=executeCircuit(forceGenerationCircuit,s,{});Object.assign(s,forceResult.state);s.forceGenerationLedger=forceResult.ledger;const grads=forceResult.ledger.effectiveGraduates;
  const immediateOpportunityPressure=opportunityResult.pressure?0:s.opportunityHistory.find(record=>record.day===s.day)?.friendlyPressure??0;
  const shortages=Object.values(s.production).filter((x)=>x.stock<x.use*2).length;const balance=campaignBalanceProfile(s.campaignSeed);const operationResult=executeCircuit(operationsCircuit,s,{situation,maneuver,roll:deterministicRoll(situation.resolutionTicket,maneuver?.id??"standing"),confidence:maneuver?maneuverChance(s,maneuver,director):1,tempoCasualty,tempoSupply:tempoSupply*maneuverSupply,tempoPressure,shortages,directorCasualty:director.modifiers.casualty,directorFriendlyPressure:director.modifiers.friendlyPressure+opportunityResult.pressure+immediateOpportunityPressure+(maneuver?balance.pacingPressure:0),directorEnemyPressure:director.modifiers.enemyPressure,directorSupplyConversion:director.modifiers.supplyConversion});s.operationsLedger=operationResult.ledger;const {succeeded,friendlyLosses:losses,enemyLosses:enemyLoss,groundMovement:move,outcomeBand,margin}=operationResult.ledger;
  const desert=estimateDay(s,director); s.deserters+=desert.desertion;s.retained+=desert.retained; s.intercepted+=desert.intercepted; s.armed-=losses+desert.netDesertion; s.deployable-=losses+desert.netDesertion;s.adversary.force=Math.max(0,s.adversary.force-enemyLoss);s.enemy=Math.round(s.adversary.force*s.adversary.estimateBias); s.population-=Math.round(losses*.72);
  s.front+=move;if(maneuver?.id==="network"&&succeeded)s.intelligence+=3;const aftermath=resolveSituationAftermath(s,situation,maneuver?.id??null,outcomeBand,margin,move);s.theaterSectors=aftermath.theaterSectors;s.operationalFacts=aftermath.operationalFacts;s.situationHistory=aftermath.situationHistory;
  let doctrineGain=0; if(maneuver&&succeeded){doctrineGain=Math.max(10,Math.round(enemyLoss/1000*8+Math.max(0,move)*20));s.doctrine+=doctrineGain;s.doctrineEarned+=doctrineGain;s.affinityProofs[maneuver.vector]=(s.affinityProofs[maneuver.vector]??0)+1;s.doctrineWinAwards.unshift({day:s.day,action:maneuver.label,verified:`${fmtStrategic(enemyLoss)} enemy losses // ${describeGroundMovement(move).display}`,reward:doctrineGain});}
  s.readiness+=(grads>losses?.7:-1.2)-shortages*.55; s.equipment-=losses/18000+shortages*.35; s.maintenanceDebt+=tempoSupply*.6; s.treasury+=3.4-s.armed/185000+director.modifiers.treasury;const domesticResult=executeCircuit(domesticCircuit,s,{friendlyLosses:losses,shortages,directorLegitimacy:director.modifiers.legitimacy,directorResistance:director.modifiers.resistance});Object.assign(s,domesticResult.state);s.domesticLedger=domesticResult.ledger;
  const opportunityOutcome=s.opportunityHistory[0]?.day===s.day?(s.opportunityHistory[0].outcome==="expired"?"missed":s.opportunityHistory[0].outcome):null;
  const dispatch=composeWarDispatch({sector:situation.sector,maneuverLabel:maneuver?.label??null,conditionBrief:director.event.brief,outcomeBand,movement:move,friendlyLosses:losses,enemyLosses:enemyLoss,committed:operationResult.ledger.committed,forceRatio:operationResult.ledger.forceRatio,adversary:adversaryResult.ledger,diplomacy:diplomacyResult.ledger,domestic:domesticResult.ledger,production:productionResult.ledger,forceGeneration:forceResult.ledger,desertionAttempted:desert.desertion,doctrineGain,aftermath:aftermath.createdFacts,opportunityOutcome});
  s.eventHistory.unshift({day:s.day,phase:director.phase.label,event:director.event.label,eventId:director.event.id,calculusId:director.event.calculusId??director.event.id,trigger:director.trigger});
  const todayDirectives=s.decisions.filter(decision=>decision.day===s.day);
  for(const domain of campaignAlternateDomainsForState(s)){const mission=docket[domain];const issued=todayDirectives.find(decision=>decision.domain===domain&&decision.missionId===mission.contentId);s.subMissionHistory.unshift({day:s.day,domain,archetypeId:mission.archetypeId,frameId:mission.frameId,realizationId:mission.realizationId,contentId:mission.contentId,category:mission.category,pressureBand:mission.pressureBand,resolutionTicket:mission.resolutionTicket,optionId:issued?.choiceId??null,familyId:issued?.familyId??null,choiceId:issued?.choiceId??null,outcome:issued?"issued":"lapsed"});}
  const closing=strategicSnapshot(s);s.resolutionHistory.unshift({schemaVersion:1,resolvedDay:s.day,phaseId:director.phase.id,eventId:director.event.id,sector:situation.sector,blueprintId:situation.blueprintId,opening,closing,orders:{used:DAILY_ORDERS-s.actions,unused:s.actions,maneuverId:maneuver?.id??null,directives:todayDirectives.map(decision=>({familyId:decision.familyId,choiceId:decision.choiceId,family:decision.family,choice:decision.choice,domain:decision.domain,missionId:decision.missionId}))},operations:operationResult.ledger,production:productionResult.ledger,forceGeneration:forceResult.ledger,domestic:domesticResult.ledger,diplomacy:diplomacyResult.ledger,adversaryObserved:{estimatedForce:adversaryResult.ledger.estimatedForce,estimateLow:adversaryResult.ledger.estimateLow,estimateHigh:adversaryResult.ledger.estimateHigh,observedOrders:[...adversaryResult.ledger.observedOrders],hiddenOrders:adversaryResult.ledger.hiddenOrders,signals:[...adversaryResult.ledger.signals]},personnel:{combatLosses:losses,desertionAttempts:desert.desertion,retained:desert.retained,intercepted:desert.intercepted,netDesertion:desert.netDesertion,effectiveGraduates:forceResult.ledger.effectiveGraduates,deployableAssigned:forceResult.ledger.deployableAssigned},outcome:{groundMovement:move,outcomeBand,doctrineGain,factsCreated:aftermath.createdFacts.map(fact=>fact.id)}});
  s.day+=1; s.actions=DAILY_ORDERS; s.maneuver=null;s.currentSituation=null; s.reports.unshift({ day:s.day, ...dispatch, epigraph:director.event.quote });
  const resolvedDay=s.day-1,terminalResolutionOpen=resolvedDay>=balance.designHorizonDay;
  if(s.front>=12&&s.victorySecuredDay===null)s.victorySecuredDay=resolvedDay;
  const inertCommand=s.resolutionHistory.every(record=>record.orders.used===0&&record.orders.maneuverId===null);
  if((terminalResolutionOpen&&s.victorySecuredDay!==null)||(s.day>30&&s.front>0))s.status="victory";
  if(inertCommand&&resolvedDay>=balance.inertDefeatDay)s.status="defeat";
  if((terminalResolutionOpen&&s.front<=-12)||s.legitimacy<=0||s.deployable<75000||(s.day>30&&s.front<=0))s.status="defeat";
  normalize(s);s.currentSituation=compileSituationForState(s);s.currentSubMissions=compileSubMissionDocket(s,s.subMissionHistory);s.adversary.objective=s.currentSituation.sector;return s;
};

export const fmt = (n: number, full=false) => full?Math.round(n).toLocaleString():new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1}).format(n);
export const coverage = (s: GameState, r: Resource) => s.production[r].stock/Math.max(1,s.production[r].use);
export const assessment = (s: GameState) => { const ratio=projectOperations(s).forceRatio; return ratio>1.15?["Local advantage","good"]:ratio>.9?["Contested","warn"]:["Enemy advantage","bad"] as [string,Tone]; };
export { BLUEPRINT_RULES, CONTENT_PACK_VERSION, FACT_CATALOG, NO_ACTION_DAILY_FRONT_LOSS, auditCampaignSubstrate, outcomeBandForMargin, campaignBalanceProfile };
export { CAMPAIGN_FINISH_DISTRIBUTION, ADVANTAGE_PATH_SURFACE, LOSS_PATH_SURFACE, calculateCampaignScore, earlyVictoryAcceleration, finishByDayProbability } from "./campaign-balance";
