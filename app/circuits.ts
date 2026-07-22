import type { GameState, Maneuver, Resource, Situation, Tempo } from "./game";

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
  shortages:number; equipmentRecovery:number;
};
export type ProductionContext = { supplyMultiplier:number; maneuverMultiplier:number };

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
  readinessFactor:number; equipmentFactor:number; effectiveCommitted:number; friendlyPower:number; enemyPower:number; forceRatio:number;
  executionConfidence:number; resolutionRoll:number; succeeded:boolean; friendlyLosses:number; lossRate:number; enemyLosses:number;
  basePressure:number; maneuverPressure:number; forceRatioPressure:number; intelligencePressure:number; shortagePressure:number; groundMovement:number;
  evidence:string[];
};
export type OperationsContext = { situation:Situation; maneuver:Maneuver|null; roll:number; confidence:number; tempoCasualty:number; tempoSupply:number; tempoPressure:number; shortages:number };
export type DomesticLedger = {day:number;legitimacyOpening:number;resistanceOpening:number;casualtyBurden:number;forcedIntakeBurden:number;shortageBurden:number;atrocityBurden:number;fiscalBurden:number;policyLegitimacy:number;policyResistance:number;legitimacyChange:number;resistanceChange:number;desertionPressureChange:number;legitimacyClosing:number;resistanceClosing:number;strikeRisk:number;collapseRisk:number;signals:string[]};
export type DomesticContext = {friendlyLosses:number;shortages:number};
export type DiplomaticActor = {id:string;name:string;role:"ally"|"neutral"|"rival"|"broker";interest:string;trust:number;leverage:number;dependency:number;obligation:number;aidPipeline:number;sanctionsExposure:number;betrayalRisk:number};
export type DiplomacyActorLedger = DiplomaticActor & {trustChange:number;leverageChange:number;dependencyChange:number;munitionsDelivered:number;treasuryDelivered:number;intelligenceDelivered:number};
export type DiplomacyLedger = {day:number;actors:DiplomacyActorLedger[];totalMunitions:number;totalTreasury:number;totalIntelligence:number;totalSanctionsDrag:number;highestBetrayalRisk:number;signals:string[]};

const resources:Resource[]=["munitions","armor","flight","drones"];
const baseOutput:Record<Resource,number>={munitions:540,armor:2.55,flight:.74,drones:12.6};
const baseUse:Record<Resource,number>={munitions:21000,armor:74,flight:17,drones:355};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
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
    const openingDebt=state.maintenanceDebt;
    const lines=resources.map(resource=>{
      const line=state.production[resource];
      const specialization=state.target===resource?1.12:1;
      const output=Math.max(0,Math.round(baseOutput[resource]*line.allocation*workforceFactor*conditionFactor*policy.output*specialization*retoolFactor));
      const use=Math.max(0,Math.round(baseUse[resource]*context.supplyMultiplier*context.maneuverMultiplier));
      const opening=line.stock,closing=Math.max(0,opening+output-use),coverage=closing/Math.max(1,use);
      line.output=output;line.use=use;line.stock=closing;
      return{resource,allocation:line.allocation,opening,output,use,closing,coverage,net:output-use,status:coverage<2?"critical" as const:coverage<5?"strained" as const:"stable" as const};
    });
    const utilization=lines.reduce((n,line)=>n+line.allocation,0)/100;
    state.maintenanceDebt=clamp(state.maintenanceDebt+policy.debt+utilization*.7+(retooled?2.5:0),0,100);
    state.materiel+=policy.materiel-(state.maintenanceDebt/100)*.55;
    const equipmentRecovery=clamp((lines.find(x=>x.resource==="armor")!.output/80+lines.find(x=>x.resource==="flight")!.output/24+lines.find(x=>x.resource==="drones")!.output/1200)*.18,0,1.2);
    state.equipment+=equipmentRecovery;
    const shortages=lines.filter(line=>line.status==="critical").length;
    const signals:CircuitSignal[]=lines.filter(line=>line.status!=="stable").map(line=>({severity:line.status==="critical"?"critical":"warning",code:`production.${line.resource}.${line.status}`,message:`${line.resource} closes at ${line.coverage.toFixed(1)} days of coverage.`}));
    if(retooled)signals.push({severity:"warning",code:"production.retooling",message:`Industrial allocation changed to ${state.target}; conversion output absorbed a 28% retooling loss.`});
    return{state,signals,ledger:{day:state.day,target:state.target,retooled,workforceFactor,conditionFactor,policyFactor:policy.output*retoolFactor,maintenanceDebtBefore:openingDebt,maintenanceDebtAfter:state.maintenanceDebt,lines,shortages,equipmentRecovery}};
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
    const frontageDemand=textFactor(situation.terrain,{ridge:52000,corridor:44000,basin:68000,lowland:60000},56000);
    const terrainFactor=textFactor(situation.terrain,{ridge:.82,corridor:.9,basin:1.04,lowland:1});
    const groundFactor=textFactor(situation.ground,{mined:.72,saturated:.79,dry:1.04,cratered:.86});
    let networkFactor=textFactor(situation.network,{severed:.68,degraded:.82,intermittent:.9,restored:1.06});if(state.unlocked.includes("relay-discipline"))networkFactor=Math.max(networkFactor,.78);if(state.unlocked.includes("autonomous-command"))networkFactor=Math.max(networkFactor,.9);
    const supplyFactor=textFactor(situation.supply,{interdicted:.73,rationed:.82,adequate:1,secure:1.08})/Math.max(.85,context.tempoSupply*.82);
    const intelligenceFactor=clamp(.72+state.intelligence/150,.76,1.26);
    const readinessFactor=state.readiness/100,equipmentFactor=state.equipment/100;
    const frontageSaturation=committed/frontageDemand;
    const congestionFactor=frontageSaturation>1.35?clamp(1-(frontageSaturation-1.35)*.22,.68,1):1;
    const effectiveCommitted=committed*readinessFactor*equipmentFactor*terrainFactor*groundFactor*networkFactor*supplyFactor*intelligenceFactor*congestionFactor;
    const supportPower=Math.max(0,state.deployable-committed)*.13*readinessFactor*equipmentFactor;
    const friendlyPower=effectiveCommitted+supportPower,enemyPower=Math.max(1,state.enemy*.12);
    const forceRatio=clamp(friendlyPower/enemyPower,.35,1.8);
    const succeeded=maneuver?context.roll<context.confidence:true;
    const maneuverPressure=maneuver?(succeeded?maneuver.successPressure:maneuver.failurePressure):0;
    const shortagePenalty=context.shortages*.18;
    const doctrineCasualty=maneuver?.id==="breach"&&state.unlocked.includes("suppression")?.92:1;
    const friendlyLosses=Math.round((4200+state.day*38)*context.tempoCasualty*(maneuver?.casualty??1)*doctrineCasualty*(state.production.munitions.stock<42000?1.15:1)*textFactor(situation.ground,{mined:1.22,saturated:1.08,dry:.94})/Math.max(.55,forceRatio));
    const atrocities=(state.unlocked.includes("gas")?.25:0)+(state.unlocked.includes("mines")?.12:0);
    const enemyLosses=Math.max(0,Math.round((3600+state.day*31)*forceRatio*(.8+(context.tempoPressure+maneuverPressure+atrocities)*.3)));
    const forceRatioPressure=(forceRatio-1)*1.5,intelligencePressure=(state.intelligence-42)/120,shortagePressure=-shortagePenalty;
    const basePressure=context.tempoPressure+atrocities+.25;
    const groundMovement=basePressure+maneuverPressure+forceRatioPressure+intelligencePressure+shortagePressure-.25;
    const evidence=[`${committed.toLocaleString()} soldiers committed (${(committed/state.deployable*100).toFixed(1)}% of deployable force)`,`${effectiveCommitted.toFixed(0)} terrain- and condition-adjusted committed power`,`Resolution roll ${(context.roll*100).toFixed(1)} against ${(context.confidence*100).toFixed(1)} execution confidence`,`${friendlyLosses.toLocaleString()} friendly and ${enemyLosses.toLocaleString()} estimated enemy losses`,`${groundMovement>=0?"+":""}${groundMovement.toFixed(2)} km ground movement`];
    const signals:CircuitSignal[]=[];if(frontageSaturation>1.35)signals.push({severity:"warning",code:"operations.frontage.congestion",message:"Committed force exceeds useful frontage and loses conversion efficiency."});if(networkFactor<.8)signals.push({severity:"critical",code:"operations.network.severed",message:"Command network sharply reduces committed-force conversion."});if(supplyFactor<.8)signals.push({severity:"critical",code:"operations.supply.interdicted",message:"Supply condition constrains operational power."});
    return{state,signals,ledger:{day:state.day,sector:situation.sector,maneuver:maneuver?.label??"Standing Tempo",committed,commitmentShare:committed/Math.max(1,state.deployable),frontageDemand,frontageSaturation,terrainFactor,groundFactor,networkFactor,supplyFactor,intelligenceFactor,readinessFactor,equipmentFactor,effectiveCommitted,friendlyPower,enemyPower,forceRatio,executionConfidence:context.confidence,resolutionRoll:context.roll,succeeded,friendlyLosses,lossRate:friendlyLosses/Math.max(1,committed),enemyLosses,basePressure,maneuverPressure,forceRatioPressure,intelligencePressure,shortagePressure,groundMovement,evidence}};
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
    const legitimacyChange=policyLegitimacy-casualtyBurden-shortageBurden-atrocityBurden-fiscalBurden;
    const resistanceChange=policyResistance+forcedIntakeBurden+casualtyBurden*.35+shortageBurden*.7-Math.max(0,state.legitimacy-45)/180;
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
    const state:GameState=JSON.parse(JSON.stringify(input));state.actors=state.actors??[];const signals:string[]=[];
    const actors=state.actors.map(actor=>{const opening={...actor};let trustChange=(50-actor.trust)*.015,leverageChange=-actor.leverage*.01,dependencyChange=-actor.dependency*.004;
      const supply=state.active.supply,statecraft=state.active.statecraft,treaty=state.active.treaties,sanctions=state.active.sanctions,obligation=state.active["alliance-obligations"];
      if(actor.id==="orison"){if(supply==="credit"){trustChange+=1.2;dependencyChange+=.8;leverageChange+=.5;}if(treaty==="mutual-defense"){trustChange+=2;dependencyChange+=.7;actor.obligation=Math.min(100,actor.obligation+2);}if(treaty==="intel-pact"){trustChange+=1;actor.aidPipeline=Math.min(100,actor.aidPipeline+.7);}if(obligation==="send-munitions"){trustChange+=2.4;leverageChange+=1.5;}if(obligation==="accept-liaison"){trustChange+=1.3;dependencyChange+=1;}if(obligation==="refuse-call"){trustChange-=4;leverageChange-=2;}if(obligation==="request-corps"){dependencyChange+=2;actor.obligation=Math.max(0,actor.obligation-3);}}
      if(actor.id==="vey"){if(supply==="port"){trustChange+=1.5;dependencyChange+=1.4;leverageChange+=.8;}if(supply==="transit"){trustChange+=1;dependencyChange+=.5;}if(treaty==="transit-treaty"){trustChange+=2;actor.aidPipeline=Math.min(100,actor.aidPipeline+1);}if(sanctions==="secondary-sanctions"){trustChange-=2.5;actor.sanctionsExposure+=2;}}
      if(actor.id==="kestrel"){if(supply==="shadow"){trustChange+=.7;dependencyChange+=1.6;actor.sanctionsExposure+=1.5;}if(treaty==="secret-annex"){trustChange+=1.2;leverageChange+=2;actor.betrayalRisk+=1.5;}}
      if(actor.id==="cineric"){if(statecraft==="summit"){trustChange+=1.2;leverageChange-=.5;}if(statecraft==="backchannel"){trustChange+=.8;leverageChange+=.5;}if(statecraft==="ultimatum"){trustChange-=2;leverageChange+=1.5;}if(statecraft==="denial"){trustChange-=.8;leverageChange+=.7;}if(treaty==="nonaggression"){trustChange+=1.8;leverageChange-=.8;}if(sanctions==="total-embargo"){trustChange-=3;leverageChange+=2;actor.sanctionsExposure+=3;}if(sanctions==="targeted-controls"){trustChange-=1.4;leverageChange+=1;actor.sanctionsExposure+=1.5;}if(sanctions==="humanitarian-exemption"){trustChange+=.5;leverageChange-=.3;}if(sanctions==="lift-sanctions"){trustChange+=2.5;leverageChange-=2;actor.sanctionsExposure=Math.max(0,actor.sanctionsExposure-4);}}
      actor.trust=clamp(actor.trust+trustChange,0,100);actor.leverage=clamp(actor.leverage+leverageChange,0,100);actor.dependency=clamp(actor.dependency+dependencyChange,0,100);actor.sanctionsExposure=clamp(actor.sanctionsExposure,0,100);actor.betrayalRisk=clamp((actor.dependency*.45+actor.leverage*.3+(100-actor.trust)*.35+(actor.role==="broker"?12:0))/100,0,.95);
      const deliveryFactor=actor.role==="rival"?0:actor.aidPipeline*(actor.trust/100)*(1-actor.betrayalRisk);const munitionsDelivered=Math.round(deliveryFactor*145),treasuryDelivered=deliveryFactor*.035,intelligenceDelivered=Math.round(deliveryFactor/18);
      state.production.munitions.stock+=munitionsDelivered;state.treasury+=treasuryDelivered;state.intelligence+=intelligenceDelivered;
      if(actor.betrayalRisk>.55)signals.push(`${actor.name} has entered a high betrayal-pressure band.`);if(actor.sanctionsExposure>35)signals.push(`${actor.name} is approaching sanctions isolation.`);
      return{...actor,trustChange:actor.trust-opening.trust,leverageChange:actor.leverage-opening.leverage,dependencyChange:actor.dependency-opening.dependency,munitionsDelivered,treasuryDelivered,intelligenceDelivered};});
    if(state.active["alliance-obligations"]==="send-munitions")state.production.munitions.stock=Math.max(0,state.production.munitions.stock-18000);if(state.active.sanctions==="total-embargo")state.enemy=Math.max(0,state.enemy-1200);if(state.active.sanctions==="targeted-controls")state.enemy=Math.max(0,state.enemy-650);if(state.active.sanctions==="lift-sanctions")state.enemy+=1800;
    state.actors=actors.map(({trustChange:_,leverageChange:__,dependencyChange:___,munitionsDelivered:____,treasuryDelivered:_____,intelligenceDelivered:______,...actor})=>actor);const totalSanctionsDrag=actors.reduce((n,a)=>n+a.sanctionsExposure,0)/250;state.materiel-=totalSanctionsDrag;
    const ledger={day:state.day,actors,totalMunitions:actors.reduce((n,a)=>n+a.munitionsDelivered,0),totalTreasury:actors.reduce((n,a)=>n+a.treasuryDelivered,0),totalIntelligence:actors.reduce((n,a)=>n+a.intelligenceDelivered,0),totalSanctionsDrag,highestBetrayalRisk:Math.max(0,...actors.map(a=>a.betrayalRisk)),signals};
    return{state,ledger,signals:signals.map((message,i)=>({severity:i?"critical":"warning",code:`diplomacy.${i}`,message}))};
  }
};

export const supplyMultiplierFor=(tempo:Tempo)=>({hold:.65,methodical:1,surge:1.4,"human-wave":1.2}[tempo]);
