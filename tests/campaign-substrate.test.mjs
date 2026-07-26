import assert from "node:assert/strict";
import test from "node:test";

const rules=await import(process.env.DELENDA_GAME_BUNDLE);
const {
  ADVANTAGE_PATH_SURFACE, BLUEPRINT_RULES, CAMPAIGN_EVENTS, CAMPAIGN_FINISH_DISTRIBUTION, CAMPAIGN_SEED_NAME_COUNT, CONTENT_PACK_VERSION, DOCTRINES, FACT_CATALOG, LOSS_PATH_SURFACE, MANEUVERS, NO_ACTION_DAILY_FRONT_LOSS, OPPORTUNITY_FREQUENCY, OPPORTUNITY_TEMPLATES, SITUATIONS, TERMINAL_RESOLUTION_DAY,
  THEATERS, activeDiplomacyForState, auditCampaignSubstrate, commit, commitManeuver,
  commitOpportunity, describeGroundMovement, initialState, opportunityForState, opportunityOccurs, opportunityStatusForFraction,
  calculateCampaignScore, campaignBalanceProfile, campaignSeedId, directiveRejection, earlyVictoryAcceleration, estimateDay, eventForState, finishByDayProbability, forceOpportunityForCurrentDay, maneuverChance, outcomeBandForMargin, phaseForDay, projectAdversary, projectDiplomacy, projectOperationRange, projectOperations, projectProduction, recordOpportunityExpired, recordOpportunityOpened, regulatedPathwayForState, resolve, restoreCampaignState, situationForState, FAMILIES,
}=rules;

test("content pack is complete and internally referential",()=>{
  assert.equal(CONTENT_PACK_VERSION,"campaign-substrate-v4");
  assert.equal(SITUATIONS.length,50);
  assert.equal(Object.keys(BLUEPRINT_RULES).length,50);
  assert.equal(Object.keys(FACT_CATALOG).length,25);
  assert.deepEqual(auditCampaignSubstrate(SITUATIONS,MANEUVERS.map(x=>x.id)),[]);
});

test("campaign seeds use a broad proper-name register instead of alias grammar",()=>{
  assert.ok(CAMPAIGN_SEED_NAME_COUNT>=80);
  const ids=new Set(Array.from({length:80},(_,index)=>campaignSeedId(index+1)));
  assert.equal(ids.size,80);
  for(const id of ids)assert.match(id,/^#WAR-[A-Z]+-[0-9]{4}$/);
  assert.match(campaignSeedId(6682),/^#WAR-(?:POSEIDON|HERMES|HERMAPHRODITUS|[A-Z]+)-[0-9]{4}$/);
});

test("Main campaign exposes hundreds of eligible situation-sector bindings",()=>{
  const permutationCount=SITUATIONS.reduce((total,situation)=>{
    const rule=BLUEPRINT_RULES[situation.id];
    assert.ok(rule,`missing blueprint rule for ${situation.id}`);
    if(rule.writingOnly)return total;
    return total+(rule.fixedSectorId?1:rule.theaters.length*6);
  },0);

  assert.equal(permutationCount,684);
});

test("a full thirty-day campaign cannot repeat an authored Main situation or campaign condition",()=>{
  assert.ok(CAMPAIGN_EVENTS.filter(event=>!event.trigger).length>=30);
  for(const theater of THEATERS){
    for(let seed=1;seed<=20;seed++){
      let state=initialState({seed,theater:theater.id});
      const situations=new Set(),events=new Set();
      for(let day=1;day<=30;day++){
        state={...state,day,currentSituation:null};
        const situation=situationForState(state),event=eventForState(state);
        const situationKey=situation.blueprintId;
        assert.ok(!situations.has(situationKey),`${theater.id} seed ${seed} repeated ${situationKey} on day ${day}`);
        assert.ok(!events.has(event.id),`${theater.id} seed ${seed} repeated ${event.id} on day ${day}`);
        situations.add(situationKey);
        events.add(event.id);
        state={
          ...state,
          situationHistory:[{day,blueprintId:situation.blueprintId,calculusBlueprintId:situation.calculusBlueprintId,situationId:situation.id,sectorId:situation.sectorId,maneuverId:null,outcomeBand:null,margin:null,groundMovement:null,factsCreated:[]},...state.situationHistory],
          eventHistory:[{day,phase:phaseForDay(day).label,event:event.label,eventId:event.id,calculusId:event.calculusId,trigger:event.trigger??"Seeded campaign condition"},...state.eventHistory],
        };
      }
      assert.equal(situations.size,30);
      assert.equal(events.size,30);
    }
  }
});

test("every theater opens with a stored graph-backed Situation Packet",()=>{
  for(const theater of THEATERS){
    const state=initialState({seed:2049,theater:theater.id});
    const situation=situationForState(state);
    assert.equal(state.saveVersion,4);
    assert.equal(state.contentPackVersion,CONTENT_PACK_VERSION);
    assert.equal(state.theaterSectors.length,6);
    assert.equal(situation.day,1);
    assert.equal(situation.theater,theater.id);
    assert.ok(state.theaterSectors.some(x=>x.id===situation.sectorId));
    assert.equal(situation.maneuvers.length,3);
    assert.ok(situation.maneuvers.every(id=>MANEUVERS.some(x=>x.id===id)));
    assert.match(situation.resolutionTicket,/^campaign-substrate-v3:/);
  }
});

test("Main campaign compiles situation-specific order language over stable maneuver calculus",()=>{
  const visibleLabels=new Set(),canonicalLabels=new Set(MANEUVERS.map(item=>item.label));
  for(let seed=1;seed<=24;seed++){
    let state=initialState({seed,theater:THEATERS[(seed-1)%THEATERS.length].id});
    for(let day=1;day<=18;day++){
      state={...state,day,currentSituation:null};
      const situation=situationForState(state);
      assert.equal(Object.keys(situation.maneuverPresentations).length,3);
      for(const id of situation.maneuvers){
        const canonical=MANEUVERS.find(item=>item.id===id),presentation=situation.maneuverPresentations[id];
        assert.ok(canonical&&presentation);
        assert.ok(presentation.label.includes(situation.sector));
        assert.ok(presentation.rationale.length>40);
        assert.match(presentation.realizationId,new RegExp(`:${id}:L\\d+:R\\d+$`));
        assert.ok(!canonicalLabels.has(presentation.label),`${presentation.label} fell back to a global maneuver label`);
        visibleLabels.add(presentation.label);
      }
    }
  }
  assert.ok(visibleLabels.size>=150,`only ${visibleLabels.size} distinct situation-specific order labels compiled`);
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

test("directive menus expose the expanded parent and child corpus",()=>{
  const grouped=new Map();
  for(const family of FAMILIES){
    const key=`${family.module}/${family.category}`;
    grouped.set(key,[...(grouped.get(key)??[]),family.label]);
  }
  for(const[key,labels]of grouped)assert.ok(labels.length>=2,`${key} exposes only ${labels.join(", ")}`);
  assert.deepEqual(grouped.get("national/Public Finance"),["Finance Mobilization","Administer the Butcher's Bill","Allocate War Expenditure","Set Procurement Prices"]);
  assert.deepEqual(grouped.get("military/Operations"),["Set Operational Tempo","Manage Operational Reserves","Set Combined-Arms Priority"]);
  assert.deepEqual(grouped.get("military/Personnel Sustainment"),["Process Desertion","Administer Rotation and Recovery","Govern the Medical Replacement System"]);
  assert.deepEqual(grouped.get("diplomacy/Access and Exchange"),["Secure External Supply","Trade Foreign Intelligence","Negotiate Industrial Accords"]);
  assert.deepEqual(grouped.get("diplomacy/Influence and Coercion"),["Conduct Statecraft","Administer Sanctions","Conduct Information Diplomacy"]);
  assert.deepEqual(grouped.get("diplomacy/Commitments and Alliances"),["Bind Foreign Obligations","Service Alliance Obligations","Broker Coalition Burdens"]);

  const byModule=(module)=>FAMILIES.filter(family=>family.module===module);
  const production=byModule("national");
  const productionParents=[...new Set(production.map(family=>family.category))];
  assert.deepEqual(productionParents,[
    "Industrial Command",
    "Public Finance",
    "Labor Mobilization",
    "Strategic Distribution",
    "Resource Extraction",
    "Civilian Conversion",
  ]);
  assert.equal(production.length,20);
  for(const parent of productionParents){
    const count=production.filter(family=>family.category===parent).length;
    assert.ok(count>=3&&count<=4,`${parent} has ${count} selectable families`);
  }
  assert.ok(production.every(family=>family.choices.length>=4));
  assert.equal(byModule("military").length,18);
  assert.ok(byModule("military").every(family=>family.choices.length>=4));
  assert.equal(byModule("diplomacy").length,18);
  assert.ok(byModule("diplomacy").every(family=>family.choices.length>=4));
  for(const moduleId of ["military","diplomacy"]){
    const families=byModule(moduleId),parents=[...new Set(families.map(family=>family.category))];
    assert.equal(parents.length,6,`${moduleId} exposes ${parents.length} parents`);
    for(const parent of parents){
      const count=families.filter(family=>family.category===parent).length;
      assert.ok(count>=3&&count<=4,`${moduleId}/${parent} exposes ${count} subcategories`);
    }
  }
});

test("new Public Finance, Operations, and Personnel Sustainment families execute real state changes without resolving the day",()=>{
  for(const[familyId,choiceId,field]of[["expenditure","frontline-procurement","treasury"],["operational-reserve","release-reserve","deployable"],["unit-recovery","walking-wounded","reserves"]]){
    const state=initialState({seed:5519}),family=FAMILIES.find(item=>item.id===familyId),choice=family.choices.find(item=>item.id===choiceId),before=state[field];
    const next=commit(state,family,choice);
    assert.equal(next.day,state.day,`${familyId} advanced the day`);
    assert.equal(next.resolutionHistory.length,state.resolutionHistory.length,`${familyId} resolved the day`);
    assert.equal(next.actions,state.actions-1);
    assert.equal(next.active[familyId],choiceId);
    assert.equal(next.locks[familyId],state.day+family.lock);
    assert.notEqual(next[field],before,`${familyId} did not change ${field}`);
  }
});

test("all recovered Production parents execute owned state changes without resolving the day",()=>{
  for(const[familyId,choiceId,field]of[
    ["war-labor","recall-skilled-reservists","workforce"],
    ["strategic-freight","rail-priority","materiel"],
    ["tooling-policy","master-dies","materiel"],
    ["procurement-pricing","cost-plus","treasury"],
    ["shift-system","twelve-hour-shifts","workforce"],
    ["skilled-allocation","reserve-toolmakers","materiel"],
    ["depot-policy","forward-depots","readiness"],
    ["transport-priority","ammunition-first","readiness"],
    ["mineral-output","deepen-mines","materiel"],
    ["scrap-recovery","battlefield-salvage","equipment"],
    ["energy-supply","grid-priority","materiel"],
    ["civilian-rationing","durable-goods","materiel"],
    ["civil-conversion","appliance-fuses","workforce"],
    ["substitute-materials","wood-fabric","equipment"],
  ]){
    const state=initialState({seed:5522}),family=FAMILIES.find(item=>item.id===familyId),choice=family.choices.find(item=>item.id===choiceId),before=state[field];
    const next=commit(state,family,choice);
    assert.equal(next.day,state.day);
    assert.equal(next.actions,state.actions-1);
    assert.equal(next.active[familyId],choiceId);
    assert.notEqual(next[field],before,`${familyId}/${choiceId} did not change ${field}`);
  }
});

test("expanded directive families execute owned state changes and persistent diplomacy",()=>{
  for(const[familyId,choiceId,field]of[["production","common-spares","maintenanceDebt"],["branch-priority","drone-operators","intelligence"],["procurement-goal","armor-reserve-goal","pendingTarget"],["industrial-accords","licensed-tooling","materiel"],["information-diplomacy","broadcast-surrender","intelligence"],["burden-sharing","refugee-rail","legitimacy"],["neutral-finance","gold-swap","treasury"]]){
    const state=initialState({seed:5520}),family=FAMILIES.find(item=>item.id===familyId),choice=family.choices.find(item=>item.id===choiceId),before=state[field];
    const next=commit(state,family,choice);
    assert.equal(next.day,state.day);
    assert.equal(next.actions,state.actions-1);
    assert.notEqual(next[field],before,`${familyId}/${choiceId} did not change ${field}`);
    if(family.module==="diplomacy")assert.ok(next.activeDiplomacy.some(action=>action.familyId===familyId&&action.choiceId===choiceId&&action.expiresDay>next.day));
  }
  const state=initialState({seed:5521}),family=FAMILIES.find(item=>item.id==="industrial-accords"),choice=family.choices.find(item=>item.id==="licensed-tooling");
  const committed=commit(state,family,choice),before=state.actors.find(actor=>actor.id==="orison"),after=projectDiplomacy(committed).actors.find(actor=>actor.id==="orison");
  assert.ok(after.trustChange>0);
  assert.ok(after.dependencyChange>0);
  assert.ok(after.aidPipeline>before.aidPipeline);
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

test("targets of opportunity are deterministic and do not spend a strategic order",()=>{
  let state=null,initialPacket=null;
  for(let seed=1;seed<500&&!initialPacket;seed++){
    const opening=initialState({seed,theater:"river"});
    for(let day=2;day<=30&&!initialPacket;day++){
      const candidate={...opening,day,currentSituation:null};
      const found=opportunityForState(candidate);
      if(found){state=candidate;initialPacket=found;}
    }
  }
  assert.ok(state&&initialPacket);
  const packet=opportunityForState(state),again=opportunityForState(state);
  assert.deepEqual(packet,again);
  const response=packet.responses[0],beforeActions=state.actions;
  const committed=commitOpportunity(state,response);
  assert.equal(committed.actions,beforeActions);
  assert.equal(committed.opportunityCommitment,null);
  assert.equal(committed.opportunityHistory.length,1);
  assert.equal(committed.opportunityHistory[0].opportunityId,packet.id);
  assert.match(committed.opportunityHistory[0].report,/opening/i);
  assert.notDeepEqual(committed,state);
});

test("opened and expired opportunities remain pinned in the permanent no-repeat ledger",()=>{
  let state=null,packet=null;
  for(let seed=1;seed<500&&!packet;seed++){
    const opening=initialState({seed,theater:"river"});
    for(let day=2;day<=30&&!packet;day++){
      const candidate={...opening,day,currentSituation:null};
      const found=opportunityForState(candidate);
      if(found){state=candidate;packet=found;}
    }
  }
  assert.ok(state&&packet);
  const opened=recordOpportunityOpened(state,packet,1234);
  assert.ok(opened.accountOpportunityIds.includes(packet.id));
  assert.equal(opened.opportunityAssignments[0].status,"opened");
  assert.equal(opportunityForState(opened).id,packet.id);
  const expired=recordOpportunityExpired(opened,packet,5678);
  assert.equal(expired.opportunityAssignments[0].status,"expired");
  assert.equal(expired.opportunityHistory[0].outcome,"expired");
  assert.match(expired.opportunityHistory[0].report,/permanent opportunity ledger/i);
  assert.equal(opportunityForState(expired).id,packet.id);
});

test("immediate opportunities alter the same-day operation when their effect is operational",()=>{
  let state=null,committed=null;
  for(let seed=1;seed<2000&&!committed;seed++){
    const opening=initialState({seed,theater:"river"});
    for(let day=2;day<=30&&!committed;day++){
      const candidate={...opening,day,currentSituation:null};
      const packet=opportunityForState(candidate);if(!packet)continue;
      const next=commitOpportunity(candidate,packet.responses[0]);
      if(next.opportunityHistory[0]?.friendlyPressure){state=candidate;committed=next;}
    }
  }
  assert.ok(state&&committed);
  assert.notEqual(projectOperations(committed).groundMovement,projectOperations(state).groundMovement);
  assert.notEqual(resolve(committed).operationsLedger.groundMovement,resolve(state).operationsLedger.groundMovement);
});

test("the opportunity corpus is unique, full-day, and uses a one-in-three daily trigger",()=>{
  assert.equal(OPPORTUNITY_TEMPLATES.length,100);
  assert.equal(new Set(OPPORTUNITY_TEMPLATES.map(item=>item.id)).size,100);
  assert.ok(OPPORTUNITY_TEMPLATES.every(item=>item.headline&&item.individual&&item.responses.length===2));
  const responseFlavor=OPPORTUNITY_TEMPLATES.flatMap(item=>item.responses.map(response=>response.flavor));
  assert.equal(responseFlavor.length,200);
  assert.equal(new Set(responseFlavor).size,200);
  assert.ok(responseFlavor.every(line=>line.trim().split(/\s+/).length>=10));
  assert.ok(responseFlavor.every(line=>!/^Convert .+ opening into an immediate/i.test(line)));
  assert.ok(responseFlavor.every(line=>!/^Use the same access to deepen classification/i.test(line)));
  let occurrences=0,total=0;
  const ids=[];
  const state=initialState({seed:99173,theater:"industrial"});
  for(let day=1;day<=30;day++){
    const candidate={...state,day,currentSituation:null};
    const packet=opportunityForState(candidate);total+=1;
    if(!packet)continue;
    occurrences+=1;ids.push(packet.id);
    assert.equal(packet.opensAtFraction,0);
    assert.equal(packet.closesAtFraction,1);
    assert.equal(opportunityStatusForFraction(candidate,(packet.opensAtFraction+packet.closesAtFraction)/2).status,"active");
    assert.equal(opportunityStatusForFraction(candidate,packet.closesAtFraction).status,"expired");
    const safeResponse=packet.responses.find(response=>response.chance===1);
    assert.ok(safeResponse,"every opportunity must offer a guaranteed macro gain");
    assert.ok(Object.values(safeResponse.success).some(value=>typeof value==="number"&&value!==0));
  }
  assert.equal(total,30);
  assert.equal(occurrences,ids.length);
  assert.equal(new Set(ids).size,ids.length);
  const occurrenceDays=[];
  for(let day=1;day<=30;day++)if(opportunityForState({...state,day,currentSituation:null}))occurrenceDays.push(day);
  assert.equal(OPPORTUNITY_FREQUENCY,1/3);

  let organic=0,samples=0,openingDayOrganic=0;
  for(let seed=1;seed<=4000;seed++){
    for(let day=1;day<=30;day++){
      const occurs=opportunityOccurs(seed,day);
      organic+=Number(occurs);
      samples+=1;
      if(day===1)openingDayOrganic+=Number(occurs);
    }
  }
  const observed=organic/samples;
  assert.ok(observed>.325&&observed<.342,`observed organic rate ${observed}`);
  assert.ok(openingDayOrganic>1200&&openingDayOrganic<1470,`opening-day events ${openingDayOrganic}`);
});

test("the godmode override opens a visible current-day opportunity without duplicating it",()=>{
  let state;
  for(let seed=1;seed<1000;seed++){
    const candidate=initialState({seed,theater:"industrial"});
    if(!opportunityForState(candidate)){
      state=candidate;
      break;
    }
  }
  assert.ok(state,"the fixture needs a day-one seed without an organic event");
  const forced=forceOpportunityForCurrentDay(state);
  const window=opportunityStatusForFraction(forced,.5);
  assert.notStrictEqual(forced,state);
  assert.deepEqual(forced.forcedOpportunityDays,[state.day]);
  assert.equal(window.status,"active");
  assert.ok(window.packet?.headline);
  assert.strictEqual(
    forceOpportunityForCurrentDay(forced),
    forced,
    "repeating the Ava cheat must not duplicate the same day",
  );
  const opened=recordOpportunityOpened(forced,window.packet);
  assert.equal(opened.opportunityAssignments.length,1);
  assert.equal(opened.opportunityAssignments[0].day,state.day);
  assert.ok(opened.accountOpportunityIds.includes(window.packet.id));
});

test("depleted stockpiles preserve industrial output and cap fulfilled use instead of inventing negative stock",()=>{
  const state=initialState({seed:99173,theater:"industrial"});
  state.production.munitions.stock=0;
  const line=projectProduction(state).lines.find(item=>item.resource==="munitions");
  assert.ok(line.output>0,"depletion must not turn industrial output off");
  assert.equal(line.desiredOutput,line.requestedUse);
  assert.equal(line.fulfilledUse,Math.min(line.requestedUse,line.opening+line.output));
  assert.equal(line.unmetUse,Math.max(0,line.requestedUse-line.fulfilledUse));
  assert.equal(line.closing,line.opening+line.output-line.fulfilledUse);
  assert.ok(line.closing>=0);
  assert.equal(line.equilibrium,line.output-line.desiredOutput);
});

test("the force report uses one local personnel chain and one disclosed effective ratio",()=>{
  const state=initialState({seed:99173,theater:"industrial"});
  const situation=situationForState(state);
  const maneuver=MANEUVERS.find(item=>item.id===situation.maneuvers[0]);
  const operation=projectOperations(state,maneuver),adversary=projectAdversary(state,maneuver);
  assert.ok(operation.enemyCommitted<adversary.deployedEstimate);
  assert.ok(operation.enemyCommitted>operation.enemyCommittedLow);
  assert.ok(operation.enemyCommitted<operation.enemyCommittedHigh);
  assert.equal(operation.friendlyPower,operation.effectiveCommitted);
  assert.equal(operation.forceRatio,operation.friendlyPower/operation.enemyPower);
  assert.equal(operation.boundedForceRatio,Math.max(.35,Math.min(1.8,operation.forceRatio)));
  assert.ok(operation.friendlyConditionFactor>=.42&&operation.friendlyConditionFactor<=1.08);
  assert.ok(operation.enemyConditionFactor>=.45&&operation.enemyConditionFactor<=1.08);
});

test("Modularized Forces creates a real task package without creating phantom force",()=>{
  const opening=initialState({seed:99173,theater:"industrial"});
  const maneuver=MANEUVERS.find(item=>item.id==="route");
  const baseline=projectOperations(opening,maneuver);
  const modular={...opening,unlocked:[...opening.unlocked,"modularized"]};
  const packaged=projectOperations(modular,maneuver);
  assert.equal(packaged.packageEfficiency,.9);
  assert.equal(packaged.nominalCommitment,maneuver.commitment);
  assert.equal(packaged.committed,Math.round(maneuver.commitment*.9));
  assert.equal(packaged.combatEquivalent,maneuver.commitment);
  assert.equal(packaged.friendlyPower,baseline.friendlyPower);
  assert.ok(packaged.friendlyLosses<=baseline.friendlyLosses);
  const starved=projectOperations({...modular,deployable:8000,patrolCommitment:0},maneuver);
  assert.equal(starved.committed,8000);
  assert.ok(starved.combatEquivalent<maneuver.commitment);
  const doctrine=DOCTRINES.flatMap(vector=>vector.stages).find(stage=>stage.id==="modularized");
  assert.equal(doctrine.output,"Task-Organization Rule");
  assert.match(doctrine.effect,/commit 10% fewer soldiers/i);
  assert.doesNotMatch(`${doctrine.description} ${doctrine.effect}`,/workshop|module slot/i);
});

test("the Ossuary Mile field aphorism is operationally intelligible",()=>{
  const ossuary=SITUATIONS.find(item=>item.id==="ossuary-mile");
  assert.equal(ossuary.quote,"The road is empty because the enemy has finished measuring it.");
  assert.doesNotMatch(ossuary.quote,/useless or ranged/i);
});

test("desertion is nonzero by default and zero must be earned through disclosed retention plus patrols",()=>{
  let state=initialState({seed:8801,theater:"lowland"});const desertion=FAMILIES.find(family=>family.id==="desertion"),patrols=desertion.choices.find(choice=>choice.id==="patrols"),rations=desertion.choices.find(choice=>choice.id==="rations");
  const opening=estimateDay(state);assert.ok(opening.desertion>0);assert.ok(opening.netDesertion>0);assert.equal(opening.retained,0);assert.equal(opening.intercepted,0);
  const untreated=resolve(initialState({seed:8801,theater:"lowland"})),record=untreated.resolutionHistory[0];
  assert.ok(record.personnel.desertionAttempts>0);assert.ok(record.personnel.netDesertion>0);
  assert.equal(untreated.deserters,record.personnel.desertionAttempts);
  assert.equal(untreated.armed,record.closing.armed);
  state=commit(state,desertion,patrols);assert.equal(state.patrolCommitment,4800);assert.ok(projectOperations(state).operationallyAvailable<state.deployable);assert.match(directiveRejection(state,desertion,patrols),/locked/);
  state=resolve(state);state=resolve(state);assert.match(directiveRejection(state,desertion,patrols),/already established/);state=commit(state,desertion,rations);const mitigated=estimateDay(state);
  assert.ok(mitigated.desertion>0);assert.ok(mitigated.retained>0);assert.ok(mitigated.intercepted>0);assert.equal(mitigated.netDesertion,0);
});

test("restoration rejects malformed saved sub-mission dockets and preserves resolution history",()=>{
  let state=initialState({seed:99173,theater:"industrial"});state=resolve(state);const restored=restoreCampaignState(structuredClone(state));assert.equal(restored.resolutionHistory.length,1);
  const malformed=structuredClone(state);malformed.currentSubMissions.domestic.archetypeId="missing-archetype";const repaired=restoreCampaignState(malformed);assert.notEqual(repaired.currentSubMissions.domestic.archetypeId,"missing-archetype");assert.doesNotThrow(()=>rules.situationForState(repaired));
  const missingFrame=structuredClone(state);missingFrame.currentSubMissions.domestic.frameId="missing-frame";const reframed=restoreCampaignState(missingFrame);assert.notEqual(reframed.currentSubMissions.domestic.frameId,"missing-frame");
  const missingEvidence=structuredClone(state);delete missingEvidence.currentSubMissions.network.evidence;const regenerated=restoreCampaignState(missingEvidence);assert.ok(Array.isArray(regenerated.currentSubMissions.network.evidence));assert.ok(regenerated.currentSubMissions.network.rendered.title);
  const malformedHistory=structuredClone(state);delete malformedHistory.resolutionHistory[0].adversaryObserved;const filtered=restoreCampaignState(malformedHistory);assert.equal(filtered.resolutionHistory.length,0);
});

test("the generated path surface is one-third advantage and two-thirds loss exposure",()=>{
  assert.equal(ADVANTAGE_PATH_SURFACE,1/3);
  assert.equal(LOSS_PATH_SURFACE,2/3);
  const state=initialState({seed:1729,theater:"lowland"}),situation=situationForState(state);
  const roles=situation.maneuvers.map(id=>regulatedPathwayForState(state,MANEUVERS.find(item=>item.id===id)));
  assert.equal(roles.filter(role=>role==="advantage").length,1);
  assert.equal(roles.filter(role=>role==="loss-exposure").length,2);
});

test("the campaign finish horizon is a disclosed bell curve with a negligible Day-15 tail",()=>{
  const total=CAMPAIGN_FINISH_DISTRIBUTION.reduce((sum,item)=>sum+item.probability,0);
  const late=CAMPAIGN_FINISH_DISTRIBUTION.filter(item=>item.day>=28).reduce((sum,item)=>sum+item.probability,0);
  assert.ok(Math.abs(total-1)<1e-12);
  assert.ok(late>.6);
  assert.ok(finishByDayProbability(15)<.000001);
  assert.equal(CAMPAIGN_FINISH_DISTRIBUTION.toSorted((a,b)=>b.probability-a.probability)[0].day,29);
});

test("early victories earn an exponential score acceleration while losses do not",()=>{
  const day28=earlyVictoryAcceleration(28,"victory"),day24=earlyVictoryAcceleration(24,"victory"),day20=earlyVictoryAcceleration(20,"victory"),day15=earlyVictoryAcceleration(15,"victory");
  assert.equal(day28,0);
  assert.ok(day24>0);
  assert.ok(day20-day24>day24-day28);
  assert.ok(day15-day20>day20-day24);
  assert.equal(earlyVictoryAcceleration(15,"defeat"),0);
  const score=calculateCampaignScore({outcome:"victory",days:15,productionMin:0,productionMax:0,sufferedMin:0,sufferedMax:0,inflictedMin:0,inflictedMax:0});
  assert.equal(score.earlyVictory,2600);
  assert.equal(score.total,8400);
});

test("first-day loss exposure is daily while an inert command loses inside ten days",()=>{
  assert.equal(NO_ACTION_DAILY_FRONT_LOSS,-1.1);
  for(const theater of THEATERS){
    const opening=initialState({seed:1729,theater:theater.id});
    const situation=situationForState(opening);
    for(const id of situation.maneuvers){
      const maneuver=MANEUVERS.find(item=>item.id===id),operation=projectOperations(opening,maneuver);
      assert.ok(operation.friendlyLosses<operation.committed*.08,`${theater.id} ${maneuver.id} exposed more than 8% in one day`);
    }
  }
  const terminalDays=[];
  for(let seed=1;seed<=12;seed++)for(const theater of THEATERS){
    let state=initialState({seed:seed*7919,theater:theater.id});
    while(state.status==="active"&&state.day<=35)state=resolve(state);
    assert.equal(state.status,"defeat");
    terminalDays.push(state.day-1);
  }
  assert.ok(Math.min(...terminalDays)>=8);
  assert.ok(Math.max(...terminalDays)<=10);
  const average=terminalDays.reduce((total,day)=>total+day,0)/terminalDays.length;
  assert.ok(average>=8&&average<=9.5);
});

test("crossing the negative twelve-kilometer line ends the campaign immediately",()=>{
  const state=initialState({seed:1729,theater:"lowland"});
  state.front=-12.2;
  assert.equal(restoreCampaignState(state).status,"defeat");
  const crossing=initialState({seed:1729,theater:"lowland"});
  crossing.front=-11.9;
  assert.equal(resolve(crossing).status,"defeat");
});

test("competent command resolves against the seed-specific bell-curve horizon",()=>{
  assert.equal(TERMINAL_RESOLUTION_DAY,15);
  const plan=[["tempo","surge"],["statecraft","backchannel"],["production","eyes"],["industry","maintenance"],["training-standard","specialist"],["desertion","rations"],["supply","shadow"],["casualty-politics","public-mourning"]];
  const terminal=[];
  for(let seed=1;seed<=6;seed++)for(const theater of THEATERS){
    let state=initialState({seed:seed*7919,theater:theater.id});
    while(state.status==="active"){
      const opportunity=opportunityForState(state);if(opportunity)state=commitOpportunity(state,opportunity.responses.find(response=>response.chance===1)??opportunity.responses[0]);
      for(const [familyId,choiceId] of plan){
        if(state.actions<=1)break;
        const family=FAMILIES.find(item=>item.id===familyId),choice=family.choices.find(item=>item.id===choiceId),next=commit(state,family,choice);
        if(next!==state)state=next;
      }
      const situation=situationForState(state);let best=null,bestScore=-Infinity;
      for(const id of situation.maneuvers){
        const maneuver=MANEUVERS.find(item=>item.id===id),range=projectOperationRange(state,maneuver),chance=maneuverChance(state,maneuver);
        const movement=chance*range.success.groundMovement+(1-chance)*range.failure.groundMovement;
        const losses=chance*range.success.friendlyLosses+(1-chance)*range.failure.friendlyLosses;
        const score=movement-losses/200000;
        if(score>bestScore){bestScore=score;best=maneuver;}
      }
      state=resolve(commitManeuver(state,best));
    }
    terminal.push(state);
  }
  const victories=terminal.filter(state=>state.status==="victory"),defeats=terminal.filter(state=>state.status==="defeat");
  assert.ok(victories.length>=terminal.length*.5);
  assert.ok(terminal.every(state=>state.day-1>=TERMINAL_RESOLUTION_DAY&&state.day-1<=30));
  assert.ok(victories.every(state=>state.day-1>=campaignBalanceProfile(state.campaignSeed).designHorizonDay));
  const victoryAverage=victories.reduce((total,state)=>total+state.day-1,0)/victories.length;
  const defeatAverage=defeats.reduce((total,state)=>total+state.day-1,0)/defeats.length;
  assert.ok(victoryAverage>=26&&victoryAverage<=30);
  assert.ok(defeatAverage>=28&&defeatAverage<=30);
});

test("diplomatic actions coexist, retain separate expiries, and leave an effects report",()=>{
  const state=initialState({seed:4409});
  const supply=FAMILIES.find(family=>family.id==="supply"),statecraft=FAMILIES.find(family=>family.id==="statecraft");
  const credit=supply.choices.find(choice=>choice.id==="credit"),summit=statecraft.choices.find(choice=>choice.id==="summit");
  let current=commit(commit(state,supply,credit),statecraft,summit);
  assert.equal(activeDiplomacyForState(current).length,2);
  assert.notEqual(current.activeDiplomacy[0].expiresDay,current.activeDiplomacy[1].expiresDay);
  current=resolve(current);
  assert.match(current.reports[0].body,/foreign ammunition reached the railheads/i);
  current=resolve(resolve(resolve(current)));
  assert.equal(current.day,5);
  assert.equal(activeDiplomacyForState(current).some(action=>action.choiceId==="summit"),false);
  assert.equal(activeDiplomacyForState(current).some(action=>action.choiceId==="credit"),true);
});

test("morning reports are cinematic dispatches rather than telemetry dumps",()=>{
  const state=initialState({seed:1729,theater:"lowland"});
  const next=resolve(state),report=next.reports[0];
  assert.match(report.title,/line|lodgment|culminated|broke|ground/i);
  assert.match(report.body,/Enemy command/);
  assert.match(report.body,/butcher's bill/i);
  assert.equal(report.body.split("\n\n").length,3);
  assert.doesNotMatch(report.body,/Campaign Director:|Operational packet:|Foreign delivery:|Domestic state:|Production closed with|entered training|No Insight Points|resolution roll|\d+\.\d+%/i);
});

test("saved telemetry reports are rewritten when a campaign is restored",()=>{
  const resolved=resolve(initialState({seed:1729,theater:"lowland"}));
  resolved.reports[0]={...resolved.reports[0],title:"The Line Fell Back 0.0 km",body:"1,635 soldiers were lost. Operational packet: 208,506 committed. Foreign delivery: 1,875 munitions. No Insight Points were awarded."};
  const restored=restoreCampaignState(JSON.parse(JSON.stringify(resolved)));
  assert.ok(restored);
  assert.notEqual(restored.reports[0].title,"The Line Fell Back 0.0 km");
  assert.match(restored.reports[0].body,/Enemy command/);
  assert.doesNotMatch(restored.reports[0].body,/Operational packet:|Foreign delivery:|No Insight Points/);
});

test("sub-threshold ground movement is reported as a stall",()=>{
  const movement=describeGroundMovement(.012);
  assert.equal(movement.title,"The Front Stalled");
  assert.match(movement.sentence,/stalled/i);
  assert.doesNotMatch(movement.sentence,/0\.0/);
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
