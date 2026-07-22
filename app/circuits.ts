import type { GameState, Maneuver, Resource, Situation, Tempo } from "./game";
import { outcomeBandForMargin, type OutcomeBand } from "./campaign-substrate";

export type CircuitSignal = { severity:"nominal"|"warning"|"critical"; code:string; message:string };
export type CircuitResult<S,L> = { state:S; ledger:L; signals:CircuitSignal[] };
export type Circuit<S,L,C> = { id:string; resolve:(state:S,context:C)=>CircuitResult<S,L> };
export const executeCircuit = <S,L,C>(circuit:Circuit<S,L,C>,state:S,context:C)=>circuit.resolve(state,context);

export type ProductionLineLedger = {
  resource:Resource; allocation:number; opening:number; output:number; use:number; closing:number;
  coverage:number; net:number; status:"stable"|"strained"|"critical";
};
export type ProductionLedger = {
  day:number; target:GameState["target"]; retooled:boolean; workforceFactor:number; conditionFactor:number;
  policyFactor:number; maintenanceDebtBefore:number; maintenanceDebtAfter:number; lines:ProductionLineLedger[];
  shortages:number; equipmentRecovery:number; materielOpening:number; materielClosing:number; materielChange:number;
};
export type ProductionContext = {
  supplyMultiplier:number; resourceUse?:Partial<Record<Resource,number>>;
  directorOutput:number; directorUse:number; directorMaintenance:number;
};

export type TrainingCohort = { id:string; admittedDay:number; headcount:number; daysRemaining:number; quality:number };
export type ForceGenerationLedger = {
  day:number; eligiblePopulation:number; voluntaryIntake:number; forcedIntake:number; grossIntake:number;
  queueOpening:number; admitted:number; queueClosing:number; capacity:number; estimatedWaitDays:number;
  cohortsOpening:number; cohortsClosing:number; graduatingCohorts:number; rawGraduates:number; effectiveGraduates:number;
  equipmentDemand:number; equipmentAssigned:number; reserveAssigned:number; reserveReleased:number; deployableAssigned:number;
  reservesOpening:number; reservesClosing:number; deployableOpening:number; deployableClosing:number;
};
export type ForceGenerationContext = { preview?:boolean };
export type OperationsLedger = {
  day:number; sector:string; maneuver:string; committed:number; commitmentShare:number; frontageDemand:number; frontageSaturation:number;
  terrainFactor:number; groundFactor:number; networkFactor:number; supplyFactor:number; intelligenceFactor:number;
  readinessFactor:number; equipmentFactor:number; friendlyConditionFactor:number; effectiveCommitted:number; friendlyPower:number; enemyCommitted:number; enemyCommittedLow:number; enemyCommittedHigh:number; enemyCommitmentShare:number; enemyConditionFactor:number; enemyPower:number; forceRatio:number;
  executionConfidence:number; resolutionRoll:number; margin:number; outcomeBand:OutcomeBand; succeeded:boolean; friendlyLosses:number; lossRate:number; enemyLosses:number;
  basePressure:number; maneuverPressure:number; forceRatioPressure:number; intelligencePressure:number; shortagePressure:number; groundMovement:number;
  evidence:string[];
};
export type OperationsContext = {
  situation:Situation; maneuver:Maneuver|null; roll:number; confidence:number;
  tempoCasualty:number; tempoSupply:number; tempoPressure:number; shortages:number;
  directorCasualty:number; directorFriendlyPressure:number; directorEnemyPressure:number; directorSupplyConversion:number;
};
export type DomesticLedger = {day:number;legitimacyOpening:number;resistanceOpening:number;casualtyBurden:number;forcedIntakeBurden:number;shortageBurden:number;atrocityBurden:number;fiscalBurden:number;policyLegitimacy:number;policyResistance:number;legitimacyChange:number;resistanceChange:number;desertionPressureChange:number;legitimacyClosing:number;resistanceClosing:number;strikeRisk:number;collapseRisk:number;signals:string[]};
export type DomesticContext = {friendlyLosses:number;shortages:number;directorLegitimacy:number;directorResistance:number};
export type DiplomaticActor = {id:string;name:string;role:"ally"|"neutral"|"rival"|"broker";interest:string;trust:number;leverage:number;dependency:number;obligation:number;aidPipeline:number;sanctionsExposure:number;betrayalRisk:number};
export type DiplomacyActorLedger = DiplomaticActor & {trustChange:number;leverageChange:number;dependencyChange:number;munitionsDelivered:number;treasuryDelivered:number;intelligenceDelivered:number};
export type DiplomacyLedger = {day:number;actors:DiplomacyActorLedger[];totalMunitions:number;totalTreasury:number;totalIntelligence:number;totalSanctionsDrag:number;highestBetrayalRisk:number;signals:string[]};
export type AdversaryState = {force:number;readiness:number;equipment:number;munitions:number;munitionsOutput:number;munitionsUse:number;doctrine:number;objective:string;posture:string;productionTarget:string;countermeasure:string;maneuverCounts:Record<string,number>;adaptation:Record<string,number>;lastOrders:string[];estimateBias:number};
export type AdversaryLedger = {day:number;objective:string;posture:string;productionTarget:string;countermeasure:string;orders:string[];observedOrders:string[];hiddenOrders:number;pressure:number;powerFactor:number;networkInterference:number;deceptionPenalty:number;friendlyLossFactor:number;reinforcement:number;munitionsOpening:number;munitionsOutput:number;munitionsUse:number;munitionsClosing:number;doctrineGain:number;actualForce:number;estimatedForce:number;estimateLow:number;estimateHigh:number;deploymentShare:number;deployedEstimate:number;deployedLow:number;deployedHigh:number;intelConfidence:number;adaptation:Record<string,number>;signals:string[]};
export type AdversaryContext = {roll:number;situation:Situation;playerManeuver:Maneuver|null};

const resources:Resource[]=["munitions","armor","flight","drones"];
const baseOutput:Record<Resource,number>={munitions:540,armor:2.55,flight:.74,drones:12.6};
const baseUse:Record<Resource,number>={munitions:21000,armor:74,flight:17,drones:355};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export const NO_ACTION_DAILY_FRONT_LOSS=-0.29;
export const enemyDeploymentShareForPosture=(posture:string)=>posture.includes("Reconstitute") ? .28 : posture.includes("Concentrated") ? .72 : posture.includes("Exploit") ? .62 : posture.includes("Counterstroke") ? .58 : posture.includes("Defense") ? .38 : .48;
const allocationFor=(target:GameState["target"],resource:Resource)=>target==="balanced"?25:resource===target?46:18;

const policyProfile=(state:GameState)=>{
  const industry=state.active.industry;
  const finance=state.active.finance;
  let output=1,debt=.8,materiel=-.2;
  if(industry==="war-economy"){output*=1.1;debt+=1.2;}
  if(industry==="disperse"){output*=.96;debt-=1;materiel+=.35;}
  if(industry==="overtime"){output*=1.18;debt+=3.5;materiel-=.8;}
  if(industry==="maintenance"){output*=.78;debt-=8;materiel+=1.8;}
  if(finance==="profit-tax")output*=.96;
  return{output,debt,materiel};
};

export const productionCircuit:Circuit<GameState,ProductionLedger,ProductionContext>={
  id:"production",
  resolve(input,context){
    const state:GameState=JSON.parse(JSON.stringify(input));
    const retooled=state.pendingTarget!==null;
    if(state.pendingTarget){state.target=state.pendingTarget;state.pendingTarget=null;resources.forEach(r=>state.production[r].allocation=allocationFor(state.target,r));}
    const workforceFactor=clamp(state.workforce/11_200_000,.62,1.04);
    const conditionFactor=clamp(.62+state.materiel/220-state.maintenanceDebt/500,.48,1.08);
    const policy=policyProfile(state);
    const retoolFactor=retooled?.72:1;
    const openingDebt=state.maintenanceDebt,materielOpening=state.materiel;
    const lines=resources.map(resource=>{
      const line=state.production[resource];
      const specialization=state.target===resource?1.12:1;
      const output=Math.max(0,Math.round(baseOutput[resource]*line.allocation*workforceFactor*conditionFactor*policy.output*specialization*retoolFactor*context.directorOutput));
      const use=Math.max(0,Math.round(baseUse[resource]*context.supplyMultiplier*(context.resourceUse?.[resource]??1)*context.directorUse));
      const opening=line.stock,closing=Math.max(0,opening+output-use),coverage=closing/Math.max(1,use);
      line.output=output;line.use=use;line.stock=closing;
      return{resource,allocation:line.allocation,opening,output,use,closing,coverage,net:output-use,status:coverage<2?"critical" as const:coverage<5?"strained" as const:"stable" as const};
    });
    const utilization=lines.reduce((n,line)=>n+line.allocation,0)/100;
    state.maintenanceDebt=clamp(state.maintenanceDebt+policy.debt+utilization*.7+(retooled?2.5:0)+context.directorMaintenance,0,100);
    state.materiel+=policy.materiel-(state.maintenanceDebt/100)*.55;
    const equipmentRecovery=clamp((lines.find(x=>x.resource==="armor")!.output/80+lines.find(x=>x.resource==="flight")!.output/24+lines.find(x=>x.resource==="drones")!.output/1200)*.18,0,1.2);
    state.equipment+=equipmentRecovery;
    const shortages=lines.filter(line=>line.status==="critical").length;
    const signals:CircuitSignal[]=lines.filter(line=>line.status!=="stable").map(line=>({severity:line.status==="critical"?"critical":"warning",code:`production.${line.resource}.${line.status}`,message:`${line.resource} closes at ${line.coverage.toFixed(1)} days of coverage.`}));
    if(retooled)signals.push({severity:"warning",code:"production.retooling",message:`Industrial allocation changed to ${state.target}; conversion output absorbed a 28% retooling loss.`});
    return{state,signals,ledger:{day:state.day,target:state.target,retooled,workforceFactor,conditionFactor,policyFactor:policy.output*retoolFactor,maintenanceDebtBefore:openingDebt,maintenanceDebtAfter:state.maintenanceDebt,lines,shortages,equipmentRecovery,materielOpening,materielClosing:state.materiel,materielChange:state.materiel-materielOpening}};
  }
};

export const forceGenerationCircuit:Circuit<GameState,ForceGenerationLedger,ForceGenerationContext>={
  id:"force-generation",
  resolve(input){
    const state:GameState=JSON.parse(JSON.stringify(input));
    state.trainingCohorts=state.trainingCohorts??[]; state.reserves=state.reserves??0;
    const queueOpening=state.queue,reservesOpening=state.reserves,deployableOpening=state.deployable;
    const voluntaryIntake=Math.max(0,Math.round(state.voluntary));
    const forcedIntake=Math.max(0,Math.round(state.forced));
    const grossIntake=voluntaryIntake+forcedIntake;
    state.workforce=Math.max(0,state.workforce-Math.round(grossIntake*.64));
    state.queue+=grossIntake;
    const admitted=Math.min(state.queue,state.training); state.queue-=admitted;
    const cohortsOpening=state.trainingCohorts.length;
    const matured=state.trainingCohorts.map(c=>({...c,daysRemaining:c.daysRemaining-1}));
    const graduating=matured.filter(c=>c.daysRemaining<=0);
    const remaining=matured.filter(c=>c.daysRemaining>0);
    if(admitted>0)remaining.push({id:`D${state.day}-C${cohortsOpening+1}`,admittedDay:state.day,headcount:admitted,daysRemaining:state.duration,quality:state.quality});
    const rawGraduates=graduating.reduce((n,c)=>n+c.headcount,0);
    const effectiveGraduates=Math.round(graduating.reduce((n,c)=>n+c.headcount*clamp((c.quality-20)/80,.35,1.05),0));
    const equipmentDemand=effectiveGraduates;
    const equipmentAssigned=Math.min(effectiveGraduates,Math.round(effectiveGraduates*clamp(state.equipment/100,.25,1)));
    const reserveAssigned=Math.max(0,effectiveGraduates-equipmentAssigned);
    const readinessGate=clamp((state.readiness-30)/55,.35,1);
    const graduateDeployment=Math.round(equipmentAssigned*readinessGate);
    const reserveReleased=Math.min(state.reserves,Math.round(state.reserves*.08*clamp(state.equipment/100,.25,1)*readinessGate));
    const deployableAssigned=graduateDeployment+reserveReleased;
    state.reserves=Math.max(0,state.reserves-reserveReleased)+reserveAssigned+(equipmentAssigned-graduateDeployment);
    state.armed+=effectiveGraduates;
    state.deployable+=deployableAssigned;
    state.trainingCohorts=remaining;
    const estimatedWaitDays=state.training>0?state.queue/state.training:99;
    const signals:CircuitSignal[]=[];
    if(estimatedWaitDays>2)signals.push({severity:"warning",code:"force.queue.congested",message:`Induction backlog is ${estimatedWaitDays.toFixed(1)} capacity-days.`});
    if(equipmentAssigned<effectiveGraduates*.75)signals.push({severity:"critical",code:"force.equipment.assignment",message:`Only ${Math.round(equipmentAssigned/Math.max(1,effectiveGraduates)*100)}% of graduates received field equipment.`});
    if(state.trainingCohorts.length===0)signals.push({severity:"warning",code:"force.cohorts.empty",message:"No training cohorts remain in the pipeline."});
    return{state,signals,ledger:{day:state.day,eligiblePopulation:Math.max(0,state.population-state.armed-state.workforce),voluntaryIntake,forcedIntake,grossIntake,queueOpening,admitted,queueClosing:state.queue,capacity:state.training,estimatedWaitDays,cohortsOpening,cohortsClosing:remaining.length,graduatingCohorts:graduating.length,rawGraduates,effectiveGraduates,equipmentDemand,equipmentAssigned,reserveAssigned,reserveReleased,deployableAssigned,reservesOpening,reservesClosing:state.reserves,deployableOpening,deployableClosing:state.deployable}};
  }
};

const textFactor=(value:string,table:Record<string,number>,fallback=1)=>Object.entries(table).find(([key])=>value.toLowerCase().includes(key))?.[1]??fallback;
export const operationsCircuit:Circuit<GameState,OperationsLedger,OperationsContext>={
  id:"operations",
  resolve(input,context){
    const state:GameState=JSON.parse(JSON.stringify(input)); const {situation,maneuver}=context;
    const committed=Math.min(state.deployable,maneuver?.commitment??Math.round(state.deployable*.52));
    const frontageDemand=textFactor(situation.terrain,{ridge:52000,corridor:44000,basin:68000,lowland:60000,river:36000},56000);
    const terrainFactor=textFactor(situation.terrain,{ridge:.82,corridor:.9,basin:1.04,lowland:1,river:.76});
    const groundFactor=textFactor(situation.ground,{mined:.72,flooded:.68,saturated:.79,rubble:.84,dry:1.04,cratered:.86});
    const networkPostureAdjustment=state.networkPosture==="broadcast"?.14:state.networkPosture==="dark"?-.12:.04;
    let networkFactor=textFactor(situation.network,{severed:.68,degraded:.82,intermittent:.9,restored:1.06})+networkPostureAdjustment-(state.adversaryLedger?.networkInterference??0);if(state.unlocked.includes("relay-discipline"))networkFactor=Math.max(networkFactor,.78);if(state.unlocked.includes("autonomous-command"))networkFactor=Math.max(networkFactor,.9);
    const supplyFactor=textFactor(situation.supply,{interdicted:.73,rationed:.82,adequate:1,secure:1.08})/Math.max(.85,context.tempoSupply*.82)*context.directorSupplyConversion;
    const intelligenceFactor=clamp(.72+state.intelligence/150-(state.adversaryLedger?.deceptionPenalty??0),.68,1.26);
    const readinessFactor=state.readiness/100,equipmentFactor=state.equipment/100;
    const frontageSaturation=committed/frontageDemand;
    const congestionFactor=frontageSaturation>1.35?clamp(1-(frontageSaturation-1.35)*.22,.68,1):1;
    const friendlyConditionFactor=clamp(readinessFactor*.2+equipmentFactor*.18+terrainFactor*.12+groundFactor*.12+networkFactor*.12+supplyFactor*.14+intelligenceFactor*.12,.42,1.08);
    const effectiveCommitted=committed*friendlyConditionFactor*congestionFactor;
    const enemyReadiness=(state.adversary?.readiness??61)/100,enemyEquipment=(state.adversary?.equipment??68)/100;const friendlyPower=effectiveCommitted;
    const enemyCommitmentShare=state.adversaryLedger?.deploymentShare??enemyDeploymentShareForPosture(state.adversary?.posture??"Methodical Pressure");
    const targetSector=state.theaterSectors?.find(sector=>sector.id===situation.sectorId);
    const theaterEnemyBase=Math.max(1,(state.theaterSectors??[]).filter(sector=>sector.theater===state.theater).reduce((total,sector)=>total+sector.enemyForceEstimate,0));
    const sectorEnemyShare=targetSector?targetSector.enemyForceEstimate/theaterEnemyBase:1/6;
    const assessedForward=state.adversaryLedger?.deployedEstimate??state.enemy*enemyCommitmentShare;
    const enemyCommitted=Math.max(1,assessedForward*sectorEnemyShare);
    const enemyCommittedLow=Math.max(1,(state.adversaryLedger?.deployedLow??assessedForward*.8)*sectorEnemyShare);
    const enemyCommittedHigh=Math.max(enemyCommittedLow,(state.adversaryLedger?.deployedHigh??assessedForward*1.2)*sectorEnemyShare);
    const enemyConditionFactor=clamp(enemyReadiness*.34+enemyEquipment*.26+terrainFactor*.1+groundFactor*.1+.82*.1+.86*.1,.45,1.08);
    const enemyPower=Math.max(1,enemyCommitted*enemyConditionFactor*(state.adversaryLedger?.powerFactor??1));
    const forceRatio=clamp(friendlyPower/enemyPower,.35,1.8);
    const margin=maneuver?context.confidence-context.roll:0;
    const outcomeBand=outcomeBandForMargin(margin);
    const succeeded=outcomeBand==="clean"||outcomeBand==="executed";
    const pressureFactor=outcomeBand==="clean" ? 1.15 : outcomeBand==="executed" ? 1 : outcomeBand==="disrupted" ? .45 : 1.2;
    const maneuverPressure=maneuver?(succeeded?maneuver.successPressure*pressureFactor:maneuver.failurePressure*pressureFactor):0;
    const shortagePenalty=context.shortages*.18;
    const doctrineCasualty=maneuver?.id==="breach"&&state.unlocked.includes("suppression")?.92:1;
    const lossBandFactor=outcomeBand==="clean" ? .88 : outcomeBand==="executed" ? 1 : outcomeBand==="disrupted" ? 1.12 : 1.28;
    const dailyLossRate=.014*context.tempoCasualty*(maneuver?.casualty??1)*doctrineCasualty*context.directorCasualty*(state.adversaryLedger?.friendlyLossFactor??1)*(state.production.munitions.stock<42000?1.15:1)*textFactor(situation.ground,{mined:1.22,flooded:1.18,saturated:1.08,rubble:1.1,dry:.94})*lossBandFactor/Math.sqrt(Math.max(.35,forceRatio));
    const friendlyLosses=Math.round(committed*clamp(dailyLossRate,.006,.075));
    const atrocities=(state.unlocked.includes("gas")?.25:0)+(state.unlocked.includes("mines")?.12:0);
    const enemyLossBand=outcomeBand==="clean" ? 1.15 : outcomeBand==="executed" ? 1 : outcomeBand==="disrupted" ? .72 : .45;
    const enemyLossRate=.011*Math.sqrt(forceRatio)*(.9+Math.max(-.25,context.tempoPressure+maneuverPressure)*.18)*enemyLossBand;
    const enemyLosses=Math.max(0,Math.round(enemyCommitted*clamp(enemyLossRate,.004,.05)));
    const forceRatioPressure=clamp((forceRatio-.45)*.55,-.22,.42),intelligencePressure=(state.intelligence-42)/180,shortagePressure=-shortagePenalty;
    const networkTempoPressure=maneuver?(state.networkPosture==="broadcast"?.25:state.networkPosture==="dark"?-.08:.12):0;
    const basePressure=(maneuver?0:NO_ACTION_DAILY_FRONT_LOSS)+(context.tempoPressure-.35)*.45+networkTempoPressure+atrocities;
    const enemyPressureDeviation=(state.adversaryLedger?.pressure??.35)-.35;
    const groundMovement=basePressure+maneuverPressure*1.5+forceRatioPressure+intelligencePressure+shortagePressure+context.directorFriendlyPressure-context.directorEnemyPressure-enemyPressureDeviation;
    const evidence=[`${committed.toLocaleString()} soldiers committed (${(committed/state.deployable*100).toFixed(1)}% of deployable force)`,`${effectiveCommitted.toFixed(0)} terrain- and condition-adjusted committed power`,`Resolution roll ${(context.roll*100).toFixed(1)} against ${(context.confidence*100).toFixed(1)} execution confidence; margin ${margin>=0?"+":""}${(margin*100).toFixed(1)} points`,`${outcomeBand.toUpperCase()} outcome band selected from the stored margin`,`${friendlyLosses.toLocaleString()} friendly and ${enemyLosses.toLocaleString()} estimated enemy losses`,`${groundMovement>=0?"+":""}${groundMovement.toFixed(2)} km ground movement`];
    const signals:CircuitSignal[]=[];if(frontageSaturation>1.35)signals.push({severity:"warning",code:"operations.frontage.congestion",message:"Committed force exceeds useful frontage and loses conversion efficiency."});if(networkFactor<.8)signals.push({severity:"critical",code:"operations.network.severed",message:"Command network sharply reduces committed-force conversion."});if(supplyFactor<.8)signals.push({severity:"critical",code:"operations.supply.interdicted",message:"Supply condition constrains operational power."});
    return{state,signals,ledger:{day:state.day,sector:situation.sector,maneuver:maneuver?.label??"Standing Tempo",committed,commitmentShare:committed/Math.max(1,state.deployable),frontageDemand,frontageSaturation,terrainFactor,groundFactor,networkFactor,supplyFactor,intelligenceFactor,readinessFactor,equipmentFactor,friendlyConditionFactor,effectiveCommitted,friendlyPower,enemyCommitted,enemyCommittedLow,enemyCommittedHigh,enemyCommitmentShare,enemyConditionFactor,enemyPower,forceRatio,executionConfidence:context.confidence,resolutionRoll:context.roll,margin,outcomeBand,succeeded,friendlyLosses,lossRate:friendlyLosses/Math.max(1,committed),enemyLosses,basePressure,maneuverPressure,forceRatioPressure,intelligencePressure,shortagePressure,groundMovement,evidence}};
  }
};

export const domesticCircuit:Circuit<GameState,DomesticLedger,DomesticContext>={
  id:"domestic-state",
  resolve(input,context){
    const state:GameState=JSON.parse(JSON.stringify(input));const legitimacyOpening=state.legitimacy,resistanceOpening=state.resistance;
    const casualtyBurden=context.friendlyLosses/8500,forcedIntakeBurden=state.forced/28000,shortageBurden=context.shortages*.65,atrocityBurden=state.atrocityExposure/180,fiscalBurden=state.treasury<40?(40-state.treasury)/35:0;
    let policyLegitimacy=0,policyResistance=0;const home=state.active["home-front"],casualties=state.active["casualty-politics"];
    if(home==="ration-equally"){policyLegitimacy+=1.2;policyResistance-=.8;}if(home==="priority-industry"){policyLegitimacy-=.8;policyResistance+=1.4;}if(home==="curfew"){policyLegitimacy-=1.5;policyResistance-=1.1;}if(home==="local-councils"){policyLegitimacy+=.7;policyResistance-=1.5;}
    if(casualties==="publish-rolls")policyLegitimacy+=.8;if(casualties==="sealed-ledger"){policyLegitimacy-=.7;policyResistance+=.5;}if(casualties==="public-mourning")policyLegitimacy+=1.4;if(casualties==="victory-accounting"){policyLegitimacy-=.4;policyResistance+=.7;}
    const legitimacyChange=policyLegitimacy-casualtyBurden-shortageBurden-atrocityBurden-fiscalBurden+context.directorLegitimacy;
    const resistanceChange=policyResistance+forcedIntakeBurden+casualtyBurden*.35+shortageBurden*.7-Math.max(0,state.legitimacy-45)/180+context.directorResistance;
    const desertionPressureChange=context.friendlyLosses/4500+(state.readiness<45?3:0)-state.legitimacy/120+Math.max(0,state.resistance-35)/30;
    state.legitimacy+=legitimacyChange;state.resistance+=resistanceChange;state.desertionPressure+=desertionPressureChange;
    const strikeRisk=clamp((state.resistance*1.15+(100-state.legitimacy)*.55+context.shortages*8)/150,0,.95);
    const collapseRisk=clamp(((25-state.legitimacy)*2+Math.max(0,state.resistance-60)*1.4+Math.max(0,-state.treasury))/100,0,.95);
    const signalText:string[]=[];if(strikeRisk>.5)signalText.push("Industrial strike preparation exceeds the containment threshold.");if(collapseRisk>.35)signalText.push("State continuity is entering a non-linear failure band.");if(casualtyBurden>1)signalText.push("Daily casualty publication exceeds the legitimacy absorption rate.");
    const signals:CircuitSignal[]=signalText.map((message,i)=>({severity:i===1?"critical":"warning",code:`domestic.${i}`,message}));
    return{state,signals,ledger:{day:state.day,legitimacyOpening,resistanceOpening,casualtyBurden,forcedIntakeBurden,shortageBurden,atrocityBurden,fiscalBurden,policyLegitimacy,policyResistance,legitimacyChange,resistanceChange,desertionPressureChange,legitimacyClosing:state.legitimacy,resistanceClosing:state.resistance,strikeRisk,collapseRisk,signals:signalText}};
  }
};

export const diplomacyCircuit:Circuit<GameState,DiplomacyLedger,Record<string,never>>={
  id:"diplomacy",
  resolve(input){
    const state:GameState=JSON.parse(JSON.stringify(input));state.actors=state.actors??[];state.activeDiplomacy=(state.activeDiplomacy??[]).filter(action=>action.expiresDay>state.day);const signals:string[]=[];const enabled=(familyId:string,choiceId:string)=>state.activeDiplomacy.some(action=>action.familyId===familyId&&action.choiceId===choiceId);
    const actors=state.actors.map(actor=>{const opening={...actor};let trustChange=(50-actor.trust)*.015,leverageChange=-actor.leverage*.01,dependencyChange=-actor.dependency*.004;
      if(actor.id==="orison"){if(enabled("supply","credit")){trustChange+=1.2;dependencyChange+=.8;leverageChange+=.5;}if(enabled("treaties","mutual-defense")){trustChange+=2;dependencyChange+=.7;actor.obligation=Math.min(100,actor.obligation+2);}if(enabled("treaties","intel-pact")){trustChange+=1;actor.aidPipeline=Math.min(100,actor.aidPipeline+.7);}if(enabled("alliance-obligations","send-munitions")){trustChange+=2.4;leverageChange+=1.5;}if(enabled("alliance-obligations","accept-liaison")){trustChange+=1.3;dependencyChange+=1;}if(enabled("alliance-obligations","refuse-call")){trustChange-=4;leverageChange-=2;}if(enabled("alliance-obligations","request-corps")){dependencyChange+=2;actor.obligation=Math.max(0,actor.obligation-3);}}
      if(actor.id==="vey"){if(enabled("supply","port")){trustChange+=1.5;dependencyChange+=1.4;leverageChange+=.8;}if(enabled("supply","transit")){trustChange+=1;dependencyChange+=.5;}if(enabled("treaties","transit-treaty")){trustChange+=2;actor.aidPipeline=Math.min(100,actor.aidPipeline+1);}if(enabled("sanctions","secondary-sanctions")){trustChange-=2.5;actor.sanctionsExposure+=2;}}
      if(actor.id==="kestrel"){if(enabled("supply","shadow")){trustChange+=.7;dependencyChange+=1.6;actor.sanctionsExposure+=1.5;}if(enabled("treaties","secret-annex")){trustChange+=1.2;leverageChange+=2;actor.betrayalRisk+=1.5;}}
      if(actor.id==="cineric"){if(enabled("statecraft","summit")){trustChange+=1.2;leverageChange-=.5;}if(enabled("statecraft","backchannel")){trustChange+=.8;leverageChange+=.5;}if(enabled("statecraft","ultimatum")){trustChange-=2;leverageChange+=1.5;}if(enabled("statecraft","denial")){trustChange-=.8;leverageChange+=.7;}if(enabled("treaties","nonaggression")){trustChange+=1.8;leverageChange-=.8;}if(enabled("sanctions","total-embargo")){trustChange-=3;leverageChange+=2;actor.sanctionsExposure+=3;}if(enabled("sanctions","targeted-controls")){trustChange-=1.4;leverageChange+=1;actor.sanctionsExposure+=1.5;}if(enabled("sanctions","humanitarian-exemption")){trustChange+=.5;leverageChange-=.3;}if(enabled("sanctions","lift-sanctions")){trustChange+=2.5;leverageChange-=2;actor.sanctionsExposure=Math.max(0,actor.sanctionsExposure-4);}}
      actor.trust=clamp(actor.trust+trustChange,0,100);actor.leverage=clamp(actor.leverage+leverageChange,0,100);actor.dependency=clamp(actor.dependency+dependencyChange,0,100);actor.sanctionsExposure=clamp(actor.sanctionsExposure,0,100);actor.betrayalRisk=clamp((actor.dependency*.45+actor.leverage*.3+(100-actor.trust)*.35+(actor.role==="broker"?12:0))/100,0,.95);
      const deliveryFactor=actor.role==="rival"?0:actor.aidPipeline*(actor.trust/100)*(1-actor.betrayalRisk);const munitionsDelivered=Math.round(deliveryFactor*145),treasuryDelivered=deliveryFactor*.035,intelligenceDelivered=Math.round(deliveryFactor/18);
      state.production.munitions.stock+=munitionsDelivered;state.treasury+=treasuryDelivered;state.intelligence+=intelligenceDelivered;
      if(actor.betrayalRisk>.55)signals.push(`${actor.name} has entered a high betrayal-pressure band.`);if(actor.sanctionsExposure>35)signals.push(`${actor.name} is approaching sanctions isolation.`);
      return{...actor,trustChange:actor.trust-opening.trust,leverageChange:actor.leverage-opening.leverage,dependencyChange:actor.dependency-opening.dependency,munitionsDelivered,treasuryDelivered,intelligenceDelivered};});
    if(enabled("alliance-obligations","send-munitions"))state.production.munitions.stock=Math.max(0,state.production.munitions.stock-18000);if(enabled("sanctions","total-embargo")){state.enemy=Math.max(0,state.enemy-1200);if(state.adversary)state.adversary.force=Math.max(0,state.adversary.force-1200);}if(enabled("sanctions","targeted-controls")){state.enemy=Math.max(0,state.enemy-650);if(state.adversary)state.adversary.force=Math.max(0,state.adversary.force-650);}if(enabled("sanctions","lift-sanctions")){state.enemy+=1800;if(state.adversary)state.adversary.force+=1800;}
    state.actors=actors.map(actor=>({id:actor.id,name:actor.name,role:actor.role,interest:actor.interest,trust:actor.trust,leverage:actor.leverage,dependency:actor.dependency,obligation:actor.obligation,aidPipeline:actor.aidPipeline,sanctionsExposure:actor.sanctionsExposure,betrayalRisk:actor.betrayalRisk}));const totalSanctionsDrag=actors.reduce((n,a)=>n+a.sanctionsExposure,0)/250;state.materiel-=totalSanctionsDrag;
    const ledger={day:state.day,actors,totalMunitions:actors.reduce((n,a)=>n+a.munitionsDelivered,0),totalTreasury:actors.reduce((n,a)=>n+a.treasuryDelivered,0),totalIntelligence:actors.reduce((n,a)=>n+a.intelligenceDelivered,0),totalSanctionsDrag,highestBetrayalRisk:Math.max(0,...actors.map(a=>a.betrayalRisk)),signals};
    return{state,ledger,signals:signals.map((message,i)=>({severity:i?"critical":"warning",code:`diplomacy.${i}`,message}))};
  }
};

export const adversaryCircuit:Circuit<GameState,AdversaryLedger,AdversaryContext>={
  id:"adversary",
  resolve(input,context){
    const state:GameState=JSON.parse(JSON.stringify(input));const a:AdversaryState=state.adversary;const personality=state.adversaryPersonality??"adaptive";
    if(context.playerManeuver){const id=context.playerManeuver.id;a.maneuverCounts[id]=(a.maneuverCounts[id]??0)+1;if(a.maneuverCounts[id]>1)a.adaptation[id]=clamp((a.adaptation[id]??0)+(personality==="adaptive"?2:1),0,8);}
    const repeated=Object.entries(a.maneuverCounts).sort((x,y)=>y[1]-x[1])[0]?.[0]??"standing";
    let posture="Methodical Pressure";const reconstitutionFloor=personality==="cautious"?65:48;if(a.readiness<reconstitutionFloor)posture="Reconstitute Behind the Line";else if(state.front>3)posture="Local Counterstroke";else if(state.front<-5)posture="Exploit the Withdrawal";else if(context.roll<(personality==="opportunist"?.34:.22))posture="Concentrated Assault";
    const productionTarget=a.munitions/Math.max(1,a.munitionsUse)<4?"Munitions Recovery":repeated==="interdict"||repeated==="network"?"Signal Denial":"Replacement Equipment";
    const countermeasure=repeated==="breach"?"Deepen Obstacle Belt":repeated==="interdict"?"Displace Batteries":repeated==="network"?"Attack Relay Custody":repeated==="exploit"?"Disperse Rear Echelons":repeated==="reinforce"?"Pre-Register Corridors":"Seed False Dispositions";
    let pressure=.35,powerFactor=1,networkInterference=0,deceptionPenalty=.02,friendlyLossFactor=1,readinessChange=0,equipmentChange=0,useFactor=1;
    if(posture==="Reconstitute Behind the Line"){pressure=.05;powerFactor=.9;readinessChange=2.4;equipmentChange=.8;useFactor=.65;}if(posture==="Local Counterstroke"){pressure=.7;powerFactor=1.12;readinessChange=-1.5;friendlyLossFactor=1.1;useFactor=1.3;}if(posture==="Exploit the Withdrawal"){pressure=.85;powerFactor=1.16;readinessChange=-2;friendlyLossFactor=1.13;useFactor=1.4;}if(posture==="Concentrated Assault"){pressure=1.05;powerFactor=1.2;readinessChange=-2.6;friendlyLossFactor=1.18;useFactor=1.55;}
    if(countermeasure==="Attack Relay Custody")networkInterference=.11;if(countermeasure==="Pre-Register Corridors")friendlyLossFactor+=.08;if(countermeasure==="Seed False Dispositions")deceptionPenalty=.1;if(countermeasure==="Deepen Obstacle Belt"&&context.playerManeuver?.id==="breach")friendlyLossFactor+=.12;if(countermeasure==="Displace Batteries"&&context.playerManeuver?.id==="interdict")powerFactor+=.08;
    if(personality==="attritional"){pressure+=.18;friendlyLossFactor+=.06;useFactor+=.18;}
    if(personality==="adaptive"){deceptionPenalty+=.03;if(countermeasure==="Attack Relay Custody")networkInterference+=.04;}
    if(personality==="opportunist"&&posture!=="Methodical Pressure"&&posture!=="Reconstitute Behind the Line"){pressure+=.22;powerFactor+=.08;friendlyLossFactor+=.05;}
    if(personality==="cautious"){pressure=Math.max(0,pressure-.15);powerFactor+=.05;readinessChange+=.6;}
    a.posture=posture;a.productionTarget=productionTarget;a.countermeasure=countermeasure;a.objective=context.situation.sector;a.readiness=clamp(a.readiness+readinessChange,20,100);a.equipment=clamp(a.equipment+equipmentChange,20,100);
    const munitionsOpening=a.munitions;const munitionsOutput=Math.round(a.munitionsOutput*(productionTarget==="Munitions Recovery"?1.28:1));const munitionsUse=Math.round(a.munitionsUse*useFactor);a.munitions=Math.max(0,a.munitions+munitionsOutput-munitionsUse);if(productionTarget==="Replacement Equipment")a.equipment=clamp(a.equipment+.9,20,100);
    const doctrineGain=Math.max(1,Math.round(pressure*4));a.doctrine+=doctrineGain;const reinforcement=Math.round((6800+a.doctrine*5)*(personality==="attritional"?1.18:personality==="cautious"?.9:1));a.force+=reinforcement;
    const orders=[`OPERATIONS // ${posture}`,`PRODUCTION // ${productionTarget}`,`COUNTERMEASURE // ${countermeasure}`];a.lastOrders=orders;const intelConfidence=clamp(state.intelligence,10,95);const visible=intelConfidence>=65?3:intelConfidence>=35?2:1;const observedOrders=orders.slice(0,visible);const estimateBias=.92+context.roll*.16;a.estimateBias=estimateBias;const estimatedForce=Math.round(a.force*estimateBias);const uncertainty=(100-intelConfidence)/160;const estimateLow=Math.round(estimatedForce*(1-uncertainty)),estimateHigh=Math.round(estimatedForce*(1+uncertainty));const deploymentShare=enemyDeploymentShareForPosture(posture);const deployedEstimate=Math.round(estimatedForce*deploymentShare),deployedLow=Math.round(estimateLow*deploymentShare),deployedHigh=Math.round(estimateHigh*deploymentShare);state.enemy=estimatedForce;state.adversary=a;
    const signalText:string[]=[];if(a.munitions<munitionsUse*2)signalText.push("Enemy munitions signature indicates critical coverage.");if(a.adaptation[repeated]>=4)signalText.push(`Enemy adaptation against ${repeated} has become operationally material.`);if(posture==="Concentrated Assault")signalText.push("Enemy formation density indicates a concentrated assault order.");
    return{state,ledger:{day:state.day,objective:a.objective,posture,productionTarget,countermeasure,orders,observedOrders,hiddenOrders:3-visible,pressure,powerFactor,networkInterference,deceptionPenalty,friendlyLossFactor,reinforcement,munitionsOpening,munitionsOutput,munitionsUse,munitionsClosing:a.munitions,doctrineGain,actualForce:a.force,estimatedForce,estimateLow,estimateHigh,deploymentShare,deployedEstimate,deployedLow,deployedHigh,intelConfidence,adaptation:{...a.adaptation},signals:signalText},signals:signalText.map((message,i)=>({severity:i===2?"critical":"warning",code:`adversary.${i}`,message}))};
  }
};

export const supplyMultiplierFor=(tempo:Tempo)=>({hold:.65,methodical:1,surge:1.4,"human-wave":1.2}[tempo]);
