import assert from "node:assert/strict";
import test from "node:test";

const rules=await import(process.env.DELENDA_CONVERGENCE_BUNDLE);

test("daily convergence compiles one operational, domestic, and network problem",()=>{
  const state=rules.initialState({seed:1729,theater:"lowland"});
  const left=rules.compileConvergence(state),right=rules.compileConvergence(structuredClone(state));
  assert.deepEqual(left,right);
  assert.equal(left.day,1);
  assert.ok(left.operational.maneuvers.length>=3);
  assert.equal(left.domestic.options.length,3);
  assert.equal(left.network.options.length,3);
  assert.equal(new Set(left.domestic.options.map(option=>option.id)).size,3);
  assert.equal(new Set(left.network.options.map(option=>option.id)).size,3);
});

test("the generative overlay has authored breadth and a stable matrix version",()=>{
  assert.deepEqual(rules.convergenceMatrixAudit(),{domestic:8,network:8,version:"convergence-v1"});
  const domestic=new Set(),network=new Set();
  const profiles=[
    {},{queue:0,training:100000,quality:35},{desertionPressure:90,queue:0},{legitimacy:18,queue:0},{resistance:82,queue:0},{treasury:5,queue:0},{materiel:24,queue:0},{queue:0,training:100000},
  ];
  for(let seed=1;seed<=20;seed++)for(let day=1;day<=30;day++)for(const profile of profiles){
    const state=rules.initialState({seed:seed*7919,theater:"industrial"});Object.assign(state,profile);state.day=day;state.currentSituation=null;
    const packet=rules.compileConvergence(state);domestic.add(packet.domestic.id);network.add(packet.network.id);
  }
  assert.ok(domestic.size>=6);
  assert.ok(network.size>=6);
});

test("one briefing issue packet consumes the same three authoritative orders",()=>{
  const state=rules.initialState({seed:4409,theater:"river"}),before=rules.situationForState(state),packet=rules.compileConvergence(state);
  const network=packet.network.options.find(option=>option.choice.networkPosture!==state.networkPosture)??packet.network.options[0];
  const result=rules.commitConvergence(state,{maneuverId:before.maneuvers[0],domesticId:packet.domestic.options[0].id,networkId:network.id});
  assert.equal(result.issued.length,3);
  assert.equal(result.state.actions,0);
  assert.equal(result.state.decisions.length,3);
  assert.equal(result.state.maneuver,before.maneuvers[0]);
  assert.equal(rules.situationForState(result.state).resolutionTicket,before.resolutionTicket);
  assert.notEqual(result.state.networkPosture,state.networkPosture);
});

test("network and foreign-intelligence options are tradeoffs rather than scalar upgrades",()=>{
  const network=rules.FAMILIES.find(family=>family.id==="network-posture"),foreign=rules.FAMILIES.find(family=>family.id==="foreign-intelligence");
  assert.equal(network.choices.length,3);
  assert.equal(foreign.choices.length,3);
  assert.deepEqual(new Set(network.choices.map(choice=>choice.networkPosture)),new Set(["broadcast","dark","distributed"]));
  assert.ok(network.choices.every(choice=>choice.exact.length>=3&&choice.risk.length>=1));
  assert.ok(foreign.choices.some(choice=>(choice.delta?.dependency??0)>0));
  assert.ok(foreign.choices.some(choice=>(choice.delta?.treasury??0)<-5));
  assert.ok(foreign.choices.some(choice=>(choice.delta?.legitimacy??0)<0));
});
