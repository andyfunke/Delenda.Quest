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

test("the enumerated overlay separates mechanical archetypes from authored content frames",()=>{
  assert.deepEqual(rules.convergenceMatrixAudit(),{domestic:12,network:12,version:"sub-missions-v3",contentVersion:"sub-mission-content-v1",optionRefs:72,domesticFrames:48,networkFrames:48,totalFrames:96,realizationLayers:72,compiledVariants:288});
  assert.deepEqual(rules.validateSubMissionRegistry(),[]);
  assert.equal(new Set(rules.SUB_MISSION_FRAMES.map(frame=>frame.id)).size,96);
  for(const archetype of [...rules.DOMESTIC_SUB_MISSIONS,...rules.NETWORK_SUB_MISSIONS]){
    const frames=rules.SUB_MISSION_FRAMES.filter(frame=>frame.archetypeId===archetype.id);
    assert.equal(frames.length,4,`${archetype.id} should own four indivisible content frames`);
    assert.equal(archetype.options.length,3);
    assert.ok(archetype.convergence.length>=1);
    for(const ref of archetype.options){
      const family=rules.FAMILIES.find(item=>item.id===ref.familyId);
      assert.ok(family?.choices.some(choice=>choice.id===ref.choiceId),`${archetype.id} references ${ref.familyId}/${ref.choiceId}`);
    }
  }
  const domesticArchetypes=new Set(),networkArchetypes=new Set(),domesticFrames=new Set(),networkFrames=new Set();
  const profiles=[
    {},{queue:0,training:100000,quality:35},{desertionPressure:90,queue:0},{legitimacy:18,queue:0},{resistance:82,queue:0},{treasury:5,queue:0},{materiel:24,queue:0},{queue:0,training:100000},
  ];
  for(let seed=1;seed<=20;seed++)for(let day=1;day<=30;day++)for(const profile of profiles){
    const state=rules.initialState({seed:seed*7919,theater:"industrial"});Object.assign(state,profile);state.day=day;state.currentSituation=null;
    const packet=rules.compileConvergence(state);domesticArchetypes.add(packet.domestic.archetypeId);networkArchetypes.add(packet.network.archetypeId);domesticFrames.add(packet.domestic.frameId);networkFrames.add(packet.network.frameId);
    for(const prompt of [packet.domestic,packet.network]){
      assert.match(prompt.id,new RegExp(`^${prompt.domain}\\.${prompt.archetypeId}\\.${prompt.frameId}\\.${prompt.realizationId}$`));
      assert.ok(prompt.operationalAnchor.sector);
      assert.ok(prompt.convergence.every(edge=>edge.summary.includes(prompt.operationalAnchor.sector)));
    }
  }
  assert.equal(domesticArchetypes.size,12);assert.equal(networkArchetypes.size,12);
  assert.equal(domesticFrames.size,48);assert.equal(networkFrames.size,48);
});

test("a campaign consumes enumerated frames without exact-copy repetition",()=>{
  let state=rules.initialState({seed:99173,theater:"lowland"});const seen={domestic:new Set(),network:new Set()};
  while(state.status==="active"){
    const packet=rules.compileConvergence(state);
    for(const domain of ["domestic","network"]){assert.ok(!seen[domain].has(packet[domain].id),`${domain} repeated ${packet[domain].id}`);seen[domain].add(packet[domain].id)}
    state=rules.resolve(state);
  }
  assert.ok(seen.domestic.size>=27);assert.ok(seen.network.size>=27);
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
  assert.equal(result.state.active[network.family.id],network.choice.id);
  const tagged=result.state.decisions.filter(decision=>decision.domain);
  assert.equal(tagged.length,2);assert.ok(tagged.every(decision=>decision.missionId&&decision.resolutionTicket));
});

test("daily sub-missions remain sealed through same-day orders and rotate only after resolution",()=>{
  const state=rules.initialState({seed:7219,theater:"ridge"}),before=rules.compileConvergence(state),option=before.domestic.options[0];
  const committed=rules.commitConvergence(state,{domesticId:option.id}).state,afterCommit=rules.compileConvergence(committed);
  assert.equal(afterCommit.domestic.id,before.domestic.id);assert.equal(afterCommit.domestic.stateFingerprint,before.domestic.stateFingerprint);assert.equal(afterCommit.domestic.resolutionTicket,before.domestic.resolutionTicket);
  const next=rules.resolve(committed),afterResolve=rules.compileConvergence(next);
  assert.equal(afterResolve.day,2);assert.notEqual(afterResolve.domestic.resolutionTicket,before.domestic.resolutionTicket);assert.notEqual(afterResolve.domestic.id,before.domestic.id);assert.notEqual(afterResolve.network.id,before.network.id);assert.equal(next.subMissionHistory.length,2);assert.equal(next.subMissionHistory.find(record=>record.domain==="domestic").outcome,"issued");assert.equal(next.subMissionHistory.find(record=>record.domain==="network").outcome,"lapsed");
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
