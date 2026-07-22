import assert from "node:assert/strict";
import test from "node:test";

const mod=await import(process.env.DELENDA_AVA_BUNDLE);
const entities=[
  {id:"readiness",kind:"metric",label:"Readiness",aliases:["combat readiness"]},
  {id:"intelligence",kind:"metric",label:"Intelligence",aliases:["classification"]},
  {id:"national",kind:"module",label:"Production"},
  {id:"salient",kind:"maneuver",label:"Reinforce the Salient",aliases:["reinforce salient"],handle:"M1",action:{kind:"maneuver",maneuverId:"salient"}},
  {id:"gap",kind:"maneuver",label:"Exploit the Gap",aliases:["exploit gap"],handle:"M2",action:{kind:"maneuver",maneuverId:"gap"}},
  {id:"backchannel",kind:"directive",label:"Open Back Channel",parentId:"statecraft",handle:"P1",action:{kind:"directive",familyId:"statecraft",choiceId:"backchannel"}},
];
const context={currentModule:"campaign",entities,selected:null};
const instruction=raw=>{const result=mod.compileAvaCommand(raw,context);assert.equal(result.status,"compiled",JSON.stringify(result));return result.instruction};

test("natural status phrases compile to STATUS",()=>{
  assert.equal(instruction("How are we doing?").kind,"STATUS");
  assert.equal(instruction("where do we stand").kind,"STATUS");
  assert.equal(instruction("update").kind,"STATUS");
});

test("the conversational substrate handles channel opening and order orientation",()=>{
  assert.equal(instruction("hello").kind,"GREETING");
  assert.equal(instruction("hi Ava").kind,"GREETING");
  assert.equal(instruction("hello there").kind,"GREETING");
  assert.equal(instruction("orders").kind,"ORDERS");
  assert.equal(instruction("command").kind,"HELP");
});

test("reports resolve module aliases",()=>{
  assert.deepEqual(instruction("production report"),{kind:"REPORT",topic:"production",days:undefined,scope:"national"});
  assert.deepEqual(instruction("produce a report on production"),{kind:"REPORT",topic:"production",days:undefined,scope:"national"});
  assert.deepEqual(instruction("report"),{kind:"REPORT",topic:"overview",days:undefined,scope:"current"});
  assert.deepEqual(instruction("domestic"),{kind:"REPORT",topic:"domestic",days:undefined,scope:"current"});
  assert.deepEqual(instruction("projection"),{kind:"REPORT",topic:"projection",days:undefined,scope:"current"});
  assert.deepEqual(instruction("what happens next"),{kind:"REPORT",topic:"projection",days:undefined,scope:"current"});
  assert.deepEqual(instruction("retrospective"),{kind:"REPORT",topic:"retrospective",days:undefined,scope:"current"});
  assert.deepEqual(instruction("report losses over the last 5 days"),{kind:"REPORT",topic:"losses",days:5,scope:"current"});
  assert.deepEqual(instruction("casualties past three days"),{kind:"REPORT",topic:"losses",days:3,scope:"current"});
});

test("advice language compiles to the deterministic advisory layer",()=>{
  for(const phrase of ["what should I do","wtf do I do","where do I start","recommend a next move","advise me"]){assert.deepEqual(instruction(phrase),{kind:"ADVISE"})}
});

test("explanations resolve facet and entity",()=>{
  const result=instruction("How do I improve intelligence?");
  assert.equal(result.kind,"EXPLAIN");assert.equal(result.entity.id,"intelligence");assert.equal(result.facet,"levers");
});

test("authorized orders compile through aliases",()=>{
  const result=instruction("prepare reinforce salient");
  assert.equal(result.kind,"STAGE");assert.equal(result.entities[0].id,"salient");
});

test("comparison requires and resolves two maneuvers",()=>{
  const result=instruction("compare reinforce the salient with exploit the gap");
  assert.equal(result.kind,"COMPARE");assert.deepEqual(result.entities.map(item=>item.id),["salient","gap"]);
});

test("mutations fail closed without a unique staged target",()=>{
  const issue=mod.compileAvaCommand("issue order",context);assert.equal(issue.status,"clarify");assert.equal(issue.failure,"missing-target");
  const result=mod.compileAvaCommand("make it better",context);assert.equal(result.status,"clarify");assert.match(result.prompt,/could not map that/i);
});
