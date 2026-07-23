import assert from "node:assert/strict";
import test from "node:test";

const rules=await import(process.env.DELENDA_CONVERGENCE_BUNDLE);

test("daily convergence compiles one operational, domestic, and network problem",()=>{
  const state=rules.initialState({seed:1729,theater:"lowland"});
  const left=rules.compileConvergence(state),right=rules.compileConvergence(structuredClone(state));
  assert.deepEqual(left,right);
  assert.equal(left.day,1);
  assert.equal(left.operational.maneuvers.length,3);
  assert.equal(left.domestic.options.length,3);
  assert.equal(left.network.options.length,3);
  assert.equal(new Set(left.domestic.options.map(option=>option.id)).size,3);
  assert.equal(new Set(left.network.options.map(option=>option.id)).size,3);
  assert.deepEqual(left.operational.maneuvers,right.operational.maneuvers);
});

test("the authoritative campaign docket rotates exactly three maneuvers and survives reloads",()=>{
  const state=rules.initialState({seed:1729,theater:"lowland"});
  const dockets=new Set();
  for(let day=1;day<=8;day+=1){
    state.day=day;
    state.currentSituation=null;
    const compiled=rules.compileConvergence(state);
    assert.equal(compiled.operational.maneuvers.length,3);
    assert.equal(new Set(compiled.operational.maneuvers).size,3);
    const restored=rules.restoreCampaignState(structuredClone(state));
    assert.deepEqual(rules.compileConvergence(restored).operational.maneuvers,compiled.operational.maneuvers);
    dockets.add(compiled.operational.maneuvers.join(","));
  }
  assert.ok(dockets.size>1,"campaign maneuver choices should rotate across days");
});

test("every day has Domestic, Network, or both additional Campaign fronts at equal probability",()=>{
  const counts={both:0,domestic:0,network:0};
  for(let seed=1;seed<=600;seed+=1){
    const packet=rules.compileConvergence(rules.initialState({seed,theater:"lowland"}));
    assert.ok(packet.activeDomains.length>=1,"the Main Campaign must always have an alternate front");
    const key=packet.activeDomains.length===2?"both":packet.activeDomains[0];
    counts[key]+=1;
  }
  for(const count of Object.values(counts))assert.ok(count>=160&&count<=240,JSON.stringify(counts));
});

test("only visible alternate fronts enter the resolved sub-mission history",()=>{
  for(let seed=1;seed<=30;seed+=1){
    const initial=rules.initialState({seed,theater:"lowland"}),packet=rules.compileConvergence(initial),resolved=rules.resolve(initial);
    const today=resolved.subMissionHistory.filter(record=>record.day===1);
    assert.deepEqual(new Set(today.map(record=>record.domain)),new Set(packet.activeDomains));
  }
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
  for(let day=1;day<=30;day+=1){
    const packet=rules.compileConvergence(state);
    for(const domain of packet.activeDomains){assert.ok(!seen[domain].has(packet[domain].id),`${domain} repeated ${packet[domain].id}`);seen[domain].add(packet[domain].id)}
    state.status="active";
    state=rules.resolve(state);
  }
  assert.ok(seen.domestic.size>=15);assert.ok(seen.network.size>=15);
});

test("one briefing issue packet consumes the same three authoritative orders when both additional Campaign fronts rotate in",()=>{
  const state=rules.initialState({seed:1,theater:"river"}),before=rules.situationForState(state),packet=rules.compileConvergence(state);
  assert.deepEqual(packet.activeDomains,["domestic","network"]);
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
  const state=rules.initialState({seed:1,theater:"ridge"}),before=rules.compileConvergence(state),option=before.domestic.options[0];
  const committed=rules.commitConvergence(state,{domesticId:option.id}).state,afterCommit=rules.compileConvergence(committed);
  assert.equal(afterCommit.domestic.id,before.domestic.id);assert.equal(afterCommit.domestic.stateFingerprint,before.domestic.stateFingerprint);assert.equal(afterCommit.domestic.resolutionTicket,before.domestic.resolutionTicket);
  const next=rules.resolve(committed),afterResolve=rules.compileConvergence(next);
  assert.equal(afterResolve.day,2);assert.notEqual(afterResolve.domestic.resolutionTicket,before.domestic.resolutionTicket);assert.notEqual(afterResolve.domestic.id,before.domestic.id);assert.notEqual(afterResolve.network.id,before.network.id);assert.equal(next.subMissionHistory.length,2);assert.equal(next.subMissionHistory.find(record=>record.domain==="domestic").outcome,"issued");assert.equal(next.subMissionHistory.find(record=>record.domain==="network").outcome,"lapsed");
});

test("each secondary front accepts one daily response, then cools while remaining inspectable",()=>{
  const state=rules.initialState({seed:1}),packet=rules.compileConvergence(state);
  const first=packet.domestic.options[0],second=packet.domestic.options.find(option=>option.family.id!==first.family.id)??packet.domestic.options[1];
  const committed=rules.commitConvergence(state,{domesticId:first.id});
  assert.equal(committed.issued.length,1);
  assert.equal(rules.convergenceFrontIssued(committed.state,"domestic"),true);
  const afterPacket=rules.compileConvergence(committed.state),status=rules.convergenceFrontStatus(committed.state,afterPacket.domestic);
  assert.equal(status.cooling,true);assert.equal(status.days,1);assert.match(status.reason,/REOPENS AFTER RESOLUTION/);
  assert.equal(rules.convergenceOptionAvailable(committed.state,afterPacket.domestic.options.find(option=>option.id===second.id)),false);
  const rejected=rules.commitConvergence(committed.state,{domesticId:second.id});
  assert.equal(rejected.state,committed.state,"a second same-front response must fail closed");
  assert.equal(rejected.issued.length,0);assert.equal(rejected.state.actions,committed.state.actions);
  assert.ok(afterPacket.domestic.options.some(option=>option.id===second.id),"cooling responses remain present for inspection");
});

test("full family cooldown grays a front while partial cooldown leaves alternatives active",()=>{
  let state,packet;
  for(let seed=1;seed<=100;seed++){
    const candidate=rules.initialState({seed}),compiled=rules.compileConvergence(candidate);
    if(compiled.activeDomains.includes("network")&&new Set(compiled.network.options.map(option=>option.family.id)).size>1){state=candidate;packet=compiled;break;}
  }
  assert.ok(state&&packet,"expected a mixed-family Network front in the seed sweep");
  const fully=structuredClone(state);
  for(const option of packet.network.options)fully.locks[option.family.id]=fully.day+3;
  const fullPacket=rules.compileConvergence(fully),fullStatus=rules.convergenceFrontStatus(fully,fullPacket.network);
  assert.equal(fullStatus.cooling,true);assert.equal(fullStatus.days,3);
  assert.ok(fullPacket.network.options.every(option=>!rules.convergenceOptionAvailable(fully,option)));
  const partial=structuredClone(state),lockedFamily=packet.network.options[0].family.id;
  partial.locks[lockedFamily]=partial.day+3;
  const partialPacket=rules.compileConvergence(partial),partialStatus=rules.convergenceFrontStatus(partial,partialPacket.network);
  assert.equal(partialStatus.cooling,false);
  assert.ok(partialPacket.network.options.some(option=>rules.convergenceOptionAvailable(partial,option)));
  assert.ok(partialPacket.network.options.some(option=>rules.convergenceOptionCooldown(partial,option)>0));
});

test("network and foreign-intelligence options are tradeoffs rather than scalar upgrades",()=>{
  const network=rules.FAMILIES.find(family=>family.id==="network-posture"),foreign=rules.FAMILIES.find(family=>family.id==="foreign-intelligence");
  assert.equal(network.choices.length,4);
  assert.equal(foreign.choices.length,3);
  assert.deepEqual(new Set(network.choices.map(choice=>choice.networkPosture)),new Set(["broadcast","dark","distributed"]));
  assert.ok(network.choices.every(choice=>choice.exact.length>=3&&choice.risk.length>=1));
  assert.ok(foreign.choices.some(choice=>(choice.delta?.dependency??0)>0));
  assert.ok(foreign.choices.some(choice=>(choice.delta?.treasury??0)<-5));
  assert.ok(foreign.choices.some(choice=>(choice.delta?.legitimacy??0)<0));
});
