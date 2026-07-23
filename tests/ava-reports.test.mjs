import assert from "node:assert/strict";
import test from "node:test";

const reports=await import(process.env.DELENDA_AVA_REPORTS_BUNDLE);
const game=await import(process.env.DELENDA_AVA_GAME_BUNDLE);

const resolvedState=(days)=>{let state=game.initialState({seed:77123,theater:"ridge",archetype:"industrial",adversaryPersonality:"adaptive"});for(let index=0;index<days;index++)state=game.resolve(state);return state};
const row=(report,label)=>report.calculation.rows.find(item=>item.label===label)?.value;

test("loss report aggregates exactly the requested resolved-day window",()=>{
  const state=resolvedState(7),records=state.resolutionHistory.slice(0,5),expectedCombat=records.reduce((sum,record)=>sum+record.personnel.combatLosses,0),expectedNet=records.reduce((sum,record)=>sum+record.personnel.netDesertion,0);
  const report=reports.buildAvaReport({kind:"REPORT",topic:"losses",days:5,scope:"current"},state);
  assert.equal(report.history.resolvedDays,5);assert.equal(report.history.requestedDays,5);
  assert.equal(row(report,"FRIENDLY COMBAT LOSS"),game.fmt(expectedCombat,true));
  assert.equal(row(report,"NET FLIGHT"),game.fmt(expectedNet,true));
  assert.notEqual(row(report,"FRIENDLY COMBAT LOSS"),game.fmt(expectedCombat+game.estimateDay(state).casualty,true),"current-day projection must not leak into resolved history");
});

test("reports disclose partial migration history instead of inventing unavailable days",()=>{
  const state=resolvedState(2),report=reports.buildAvaReport({kind:"REPORT",topic:"losses",days:5,scope:"current"},state);
  assert.equal(report.history.resolvedDays,2);assert.match(report.history.observations[0],/2 of requested 5 resolved days/);
});

test("advice and report cards always contain the four intelligence layers and supplied grammar",()=>{
  const state=resolvedState(3);
  for(const instruction of [{kind:"ADVISE"},{kind:"REPORT",topic:"retrospective",days:3,scope:"current"},{kind:"REPORT",topic:"production",scope:"national"},{kind:"REPORT",topic:"projection",scope:"current"},{kind:"REPORT",topic:"domestic",scope:"current"}]){
    const report=reports.buildAvaReport(instruction,state);
    assert.ok(report.flavor.length>20);assert.ok(report.calculation.equation.length>10);assert.ok(report.calculation.rows.length>=3);assert.ok(report.history.observations.length);assert.ok(report.recommendation.length>20);assert.ok(report.commands.length>=3);assert.ok(report.links.length>=2);
  }
});

test("advice stops at the order boundary and retrospective excludes standing tempo",()=>{
  const closed=resolvedState(3),spent={...closed,status:"active",actions:0,legitimacy:1,resistance:100};
  const advice=reports.buildAvaReport({kind:"ADVISE"},spent);
  assert.match(advice.direct,/Resolve the day/);assert.match(advice.recommendation,/further command input cannot change this day/);
  const retrospective=reports.buildAvaReport({kind:"REPORT",topic:"retrospective",days:3,scope:"current"},closed);
  assert.equal(row(retrospective,"ISSUED MANEUVERS SUCCEEDED"),"0 / 0");
  assert.match(retrospective.history.observations.join(" "),/standing tempo is not reported as command success/);
});

test("the extended report registry covers every terminal information surface",()=>{
  const state=resolvedState(4),topics=["daily-brief","operations","network","intelligence","adversary","personnel","resources","effects","opportunities","decision-ledger","service-record"];
  for(const topic of topics){
    const report=reports.buildAvaReport({kind:"REPORT",topic,days:3,scope:"current"},state);
    assert.equal(report.topic,topic);assert.ok(report.direct.length>20,topic);assert.ok(report.flavor.length>20,topic);
    assert.ok(report.calculation.equation.length>20,topic);assert.ok(report.calculation.rows.length>=3,topic);
    assert.ok(report.history.observations.length,topic);assert.ok(report.recommendation.length>20,topic);
    assert.ok(report.links.length>=2,topic);assert.ok(report.commands.length>=3,topic);
  }
});

test("new reports preserve authority boundaries and exact ledger values",()=>{
  const state=resolvedState(4),production=game.projectProduction(state),personnel=game.estimateDay(state),force=game.projectForceGeneration(state);
  const resources=reports.buildAvaReport({kind:"REPORT",topic:"resources",days:3,scope:"current"},state);
  assert.equal(row(resources,"MUNITIONS COVERAGE"),`${production.lines.find(line=>line.resource==="munitions").coverage.toFixed(1)} DAYS · ${production.lines.find(line=>line.resource==="munitions").status.toUpperCase()}`);
  const people=reports.buildAvaReport({kind:"REPORT",topic:"personnel",days:3,scope:"current"},state);
  assert.equal(row(people,"NET FLIGHT"),`−${game.fmt(personnel.netDesertion,true)}`);
  const disclosedLoss=Number(row(people,"COMBAT LOSS").replace(/[^\d]/g,""));
  const disclosedNet=force.deployableAssigned-disclosedLoss-personnel.netDesertion;
  assert.equal(row(people,"PROJECTED NET DEPLOYABLE"),`${disclosedNet>=0?"+":"−"}${Math.abs(disclosedNet).toFixed(0)}`);
  const enemy=reports.buildAvaReport({kind:"REPORT",topic:"adversary",days:3,scope:"current"},state);
  assert.ok(!enemy.calculation.rows.some(item=>item.label.includes("ACTUAL")),"hidden actual enemy force must not be emitted");
  const observedOrders=state.adversaryLedger?.observedOrders??[];
  for(const label of ["OPERATIONS ORDER","PRODUCTION ORDER","COUNTERMEASURE"]){const value=row(enemy,label);assert.ok(value==="UNCLASSIFIED"||observedOrders.includes(value),`${label} must come from observed orders`) }
  const service=reports.buildAvaReport({kind:"REPORT",topic:"service-record",scope:"account"},state);
  assert.ok(!service.calculation.rows.some(item=>/GAMESTATE|CONTENT VERSION|SERVICE DATA/.test(item.label+" "+item.value)));
});

test("report narration is topic-bounded and contains no implementation vocabulary",()=>{
  const state=resolvedState(2),battlefield=game.situationForState(state).headline;
  for(const topic of ["production","domestic","diplomacy","personnel","resources","network","opportunities","service-record"]){
    const report=reports.buildAvaReport({kind:"REPORT",topic,scope:"current"},state),text=[report.flavor,report.direct,report.recommendation,...report.history.observations,...report.calculation.rows.flatMap(item=>[item.label,item.value])].join(" ");
    assert.doesNotMatch(report.flavor,new RegExp(battlefield.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")),`${topic} must not inherit unrelated battlefield prose`);
    assert.doesNotMatch(text,/GAMESTATE|CONTENT VERSION|SESSION CONTEXT|runtime effect|exact substrate|present in this save|public slug|deterministic|compiler|schema version|selection evidence|\bconvergence\b/i,topic);
  }
});

test("daily brief exposes the Main Campaign and only today's active alternate fronts",()=>{
  for(const seed of [1,2,5]){
    const state=game.initialState({seed,theater:"ridge"}),active=game.campaignAlternateDomainsForState(state),report=reports.buildAvaReport({kind:"REPORT",topic:"daily-brief",scope:"campaign"},state),labels=report.calculation.rows.map(item=>item.label);
    assert.ok(labels.includes("MAIN CAMPAIGN"));assert.ok(labels.some(label=>label.startsWith("M1 /")));
    assert.equal(labels.includes("DOMESTIC FRONT"),active.includes("domestic"));
    assert.equal(labels.some(label=>label.startsWith("D1 /")),active.includes("domestic"));
    assert.equal(labels.includes("COMMAND NETWORK"),active.includes("network"));
    assert.equal(labels.some(label=>label.startsWith("N1 /")),active.includes("network"));
    assert.doesNotMatch(report.history.observations.join(" "),/deterministic rotation|seeded tie/i);
  }
});
