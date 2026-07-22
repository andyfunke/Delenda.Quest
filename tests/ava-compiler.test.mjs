import assert from "node:assert/strict";
import test from "node:test";

const mod=await import(process.env.DELENDA_AVA_BUNDLE);
const entities=[
  {id:"readiness",kind:"metric",label:"Readiness",aliases:["combat readiness"]},
  {id:"intelligence",kind:"metric",label:"Intelligence",aliases:["classification"]},
  {id:"national",kind:"module",label:"Production"},
  {id:"salient",kind:"maneuver",label:"Reinforce the Salient",aliases:["reinforce salient"]},
  {id:"gap",kind:"maneuver",label:"Exploit the Gap",aliases:["exploit gap"]},
  {id:"backchannel",kind:"directive",label:"Open Back Channel",parentId:"statecraft"},
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
  assert.equal(instruction("orders").kind,"ORDERS");
  assert.equal(instruction("command").kind,"HELP");
});

test("reports resolve module aliases",()=>{
  assert.deepEqual(instruction("production report"),{kind:"REPORT",scope:"national"});
  assert.deepEqual(instruction("report"),{kind:"REPORT",scope:"current"});
});

test("explanations resolve facet and entity",()=>{
  const result=instruction("How do I improve intelligence?");
  assert.equal(result.kind,"EXPLAIN");assert.equal(result.entity.id,"intelligence");assert.equal(result.facet,"levers");
});

test("authorized orders compile through aliases",()=>{
  const result=instruction("prepare reinforce salient");
  assert.equal(result.kind,"SELECT");assert.equal(result.entity.id,"salient");
});

test("comparison requires and resolves two maneuvers",()=>{
  const result=instruction("compare reinforce the salient with exploit the gap");
  assert.equal(result.kind,"COMPARE");assert.deepEqual(result.entities.map(item=>item.id),["salient","gap"]);
});

test("mutations fail closed without a unique staged target",()=>{
  assert.deepEqual(instruction("issue order"),{kind:"COMMIT",entity:undefined});
  const result=mod.compileAvaCommand("make it better",context);assert.equal(result.status,"clarify");assert.equal(result.prompt,"Command not executed. Please clarify orders.");
});
