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

export const supplyMultiplierFor=(tempo:Tempo)=>({hold:.65,methodical:1,surge:1.4,"human-wave":1.2}[tempo]);
