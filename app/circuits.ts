import type { GameState, Resource, Tempo } from "./game";

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

export const supplyMultiplierFor=(tempo:Tempo)=>({hold:.65,methodical:1,surge:1.4,"human-wave":1.2}[tempo]);
