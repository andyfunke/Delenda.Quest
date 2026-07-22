import assert from "node:assert/strict";
import test from "node:test";

const rules=await import(process.env.DELENDA_GAME_BUNDLE);
const {
  BLUEPRINT_RULES, CONTENT_PACK_VERSION, FACT_CATALOG, MANEUVERS, SITUATIONS,
  THEATERS, auditCampaignSubstrate, commit, commitManeuver, initialState,
  outcomeBandForMargin, projectOperations, resolve, situationForState, FAMILIES,
}=rules;

test("content pack is complete and internally referential",()=>{
  assert.equal(CONTENT_PACK_VERSION,"campaign-substrate-v1");
  assert.equal(SITUATIONS.length,15);
  assert.equal(Object.keys(BLUEPRINT_RULES).length,15);
  assert.equal(Object.keys(FACT_CATALOG).length,25);
  assert.deepEqual(auditCampaignSubstrate(SITUATIONS,MANEUVERS.map(x=>x.id)),[]);
});

test("every theater opens with a stored graph-backed Situation Packet",()=>{
  for(const theater of THEATERS){
    const state=initialState({seed:2049,theater:theater.id});
    const situation=situationForState(state);
    assert.equal(state.saveVersion,3);
    assert.equal(state.contentPackVersion,CONTENT_PACK_VERSION);
    assert.equal(state.theaterSectors.length,6);
    assert.equal(situation.day,1);
    assert.equal(situation.theater,theater.id);
    assert.ok(state.theaterSectors.some(x=>x.id===situation.sectorId));
    assert.ok(situation.maneuvers.length>=3);
    assert.ok(situation.maneuvers.every(id=>MANEUVERS.some(x=>x.id===id)));
    assert.match(situation.resolutionTicket,/^campaign-substrate-v1:/);
  }
});

test("selection and resolution tickets are deterministic for identical state",()=>{
  const left=initialState({seed:99173,theater:"industrial",archetype:"officer-regency",adversaryPersonality:"adaptive"});
  const right=initialState({seed:99173,theater:"industrial",archetype:"officer-regency",adversaryPersonality:"adaptive"});
  assert.deepEqual(situationForState(left),situationForState(right));
  assert.deepEqual(left.theaterSectors,right.theaterSectors);
  assert.deepEqual(left.operationalFacts,right.operationalFacts);
});

test("a stored packet cannot be rerolled by preparatory directives",()=>{
  const state=initialState({seed:4157,theater:"river"});
  const before=situationForState(state);
  const family=FAMILIES.find(x=>x.choices.length>0);
  const changed=commit(state,family,family.choices[0]);
  const after=situationForState(changed);
  assert.equal(after.id,before.id);
  assert.equal(after.resolutionTicket,before.resolutionTicket);
  assert.equal(changed.actions,2);
});

test("maneuver authorization is enforced by the active packet",()=>{
  const state=initialState({seed:777,theater:"ridge"});
  const situation=situationForState(state);
  const unauthorized=MANEUVERS.find(x=>!situation.maneuvers.includes(x.id));
  if(unauthorized)assert.equal(commitManeuver(state,unauthorized),state);
  const authorized=MANEUVERS.find(x=>x.id===situation.maneuvers[0]);
  const committed=commitManeuver(state,authorized);
  assert.equal(committed.maneuver,authorized.id);
  assert.equal(committed.actions,2);
});

test("outcome margin boundaries are exhaustive and stable",()=>{
  assert.equal(outcomeBandForMargin(.2),"clean");
  assert.equal(outcomeBandForMargin(.1999),"executed");
  assert.equal(outcomeBandForMargin(0),"executed");
  assert.equal(outcomeBandForMargin(-.0001),"disrupted");
  assert.equal(outcomeBandForMargin(-.2),"disrupted");
  assert.equal(outcomeBandForMargin(-.2001),"collapse");
});

test("resolution persists aftermath and compiles the next day from it",()=>{
  const state=initialState({seed:11881,theater:"lowland"});
  const situation=situationForState(state);
  const maneuver=MANEUVERS.find(x=>x.id===situation.maneuvers[0]);
  const committed=commitManeuver(state,maneuver);
  const projected=projectOperations(committed,maneuver);
  const next=resolve(committed);
  assert.equal(next.day,2);
  assert.equal(next.situationHistory.length,1);
  assert.equal(next.situationHistory[0].resolutionTicket,undefined);
  assert.equal(next.situationHistory[0].sectorId,situation.sectorId);
  assert.equal(next.operationsLedger.resolutionRoll,projected.resolutionRoll);
  assert.ok(["clean","executed","disrupted","collapse"].includes(next.operationsLedger.outcomeBand));
  assert.ok(next.operationalFacts.some(x=>x.createdDay===1));
  assert.equal(next.currentSituation.day,2);
  assert.notEqual(next.currentSituation.resolutionTicket,situation.resolutionTicket);
});

test("same seed and orders replay to identical campaign state",()=>{
  const play=()=>{
    let state=initialState({seed:30031,theater:"industrial",archetype:"siege-state",adversaryPersonality:"opportunist"});
    for(let i=0;i<5&&state.status==="active";i++){
      const situation=situationForState(state);
      const maneuver=MANEUVERS.find(x=>x.id===situation.maneuvers[i%situation.maneuvers.length]);
      state=resolve(commitManeuver(state,maneuver));
    }
    return state;
  };
  assert.deepEqual(play(),play());
});

test("bounded campaign sweep remains finite across seeds and theaters",()=>{
  for(let seed=1;seed<=12;seed++)for(const theater of THEATERS){
    let state=initialState({seed:seed*7919,theater:theater.id});
    for(let day=0;day<7&&state.status==="active";day++){
      const situation=situationForState(state);
      const maneuver=MANEUVERS.find(x=>x.id===situation.maneuvers[(seed+day)%situation.maneuvers.length]);
      state=resolve(commitManeuver(state,maneuver));
      assert.ok(Number.isFinite(state.front));
      assert.ok(Number.isFinite(state.deployable));
      assert.equal(state.currentSituation.day,state.day);
    }
  }
});
