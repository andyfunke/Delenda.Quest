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
  assert.deepEqual(instruction("report"),{kind:"REPORT",topic:"daily-brief",days:undefined,scope:"current"});
  assert.deepEqual(instruction("domestic"),{kind:"REPORT",topic:"domestic",days:undefined,scope:"current"});
  assert.deepEqual(instruction("projection"),{kind:"REPORT",topic:"projection",days:undefined,scope:"current"});
  assert.deepEqual(instruction("what happens next"),{kind:"REPORT",topic:"projection",days:undefined,scope:"current"});
  assert.deepEqual(instruction("retrospective"),{kind:"REPORT",topic:"retrospective",days:undefined,scope:"current"});
  assert.deepEqual(instruction("report losses over the last 5 days"),{kind:"REPORT",topic:"losses",days:5,scope:"current"});
  assert.deepEqual(instruction("casualties past three days"),{kind:"REPORT",topic:"losses",days:3,scope:"current"});
});

test("advice language compiles to the deterministic advisory layer",()=>{
  for(const phrase of ["what should I do","wtf do I do","what the fuck do I do","where do I start","recommend a next move","advise me"]){
    const result=mod.compileAvaCommand(phrase,context);
    assert.equal(result.status,"compiled");
    assert.equal(result.instruction.kind,"SEMANTIC");
    assert.equal(result.semantic.operation,"ADVISE");
  }
});

test("a bare report stays bounded to the command surface",()=>{
  const result=mod.compileAvaCommand("report",{...context,currentModule:"military"});
  assert.equal(result.status,"compiled");
  assert.deepEqual(result.instruction,{kind:"REPORT",topic:"military",days:undefined,scope:"current"});
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
  assert.equal(result.kind,"SEMANTIC");
  assert.equal(result.query.operation,"COMPARE");
  assert.deepEqual(result.query.subject.entityIds,["salient","gap"]);

  const explicit=instruction("compare M1 M2");
  assert.equal(explicit.kind,"COMPARE");
  assert.deepEqual(explicit.entities.map(item=>item.id),["salient","gap"]);
});

test("mutations fail closed without a unique staged target",()=>{
  const issue=mod.compileAvaCommand("issue order",context);assert.equal(issue.status,"clarify");assert.equal(issue.failure,"missing-target");
  const result=mod.compileAvaCommand("make it better",context);assert.equal(result.status,"clarify");assert.match(result.prompt,/could not map that/i);
});

test("campaign corpus compiles to typed semantic structures without collisions",()=>{
  assert.equal(mod.AVA_UTTERANCE_COLLISIONS.length,0);
  assert.ok(mod.AVA_UTTERANCE_COVERAGE.recognizedUtterances>=4800);
  assert.ok(mod.AVA_CAMPAIGN_LANGUAGE_CORPUS.length>=20);
  for(const expected of mod.AVA_CAMPAIGN_LANGUAGE_CORPUS){
    const result=mod.compileAvaCommand(expected.utterance,context);
    assert.equal(result.status,"compiled",expected.id);
    assert.equal(result.instruction.kind,"SEMANTIC",expected.id);
    assert.equal(result.semantic.operation,expected.operation,expected.id);
    assert.equal(result.semantic.subject.type,expected.subject,expected.id);
    if(expected.scope)assert.equal(result.semantic.scope.group,expected.scope,expected.id);
    if(expected.forbiddenScope)assert.notEqual(result.semantic.scope.group,expected.forbiddenScope,expected.id);
    assert.ok(result.trace.normalizedTokens.length,expected.id);
    assert.ok(result.trace.grammarProvenance.length,expected.id);
  }
});

test("secondary is a reusable scope while ordinal and attachment neighbors remain distinct",()=>{
  const secondary=mod.compileAvaCommand("which side operation fucks me least",context);
  assert.equal(secondary.status,"compiled");
  assert.equal(secondary.semantic.scope.group,"SECONDARY");
  assert.deepEqual(secondary.semantic.scope.domains,["DOMESTIC","NETWORK"]);
  assert.equal(secondary.semantic.criteria[0],"LOWEST_RISK");

  for(const phrase of [
    "what is the secondary objective of the main mission",
    "show me the second mission",
    "is production secondary to military readiness",
    "which mission has secondary effects",
  ]){
    const result=mod.compileAvaCommand(phrase,context);
    assert.equal(result.status,"compiled",phrase);
    assert.notEqual(result.semantic.scope.group,"SECONDARY",phrase);
  }
});

test("shell grammar is recognized before natural-language normalization",()=>{
  for(const [raw,command,args] of [
    ["pwd","PWD",[]],
    ["cd ~/home","CD",["~/home"]],
    ["cd ..","CD",[".."]],
    ["cd /var","CD",["/var"]],
    ["grep -inr net reports","GREP",["-inr","net","reports"]],
    ["find reports -name *.xlsx","FIND",["reports","-name","*.xlsx"]],
    ["download reports/current/command-dashboard.xlsx","DOWNLOAD",["reports/current/command-dashboard.xlsx"]],
  ]){
    const result=mod.compileAvaCommand(raw,context);
    assert.equal(result.status,"compiled",raw);
    assert.equal(result.instruction.kind,"SHELL",raw);
    assert.equal(result.instruction.shell.command,command,raw);
    assert.deepEqual(result.instruction.shell.args,args,raw);
  }
  assert.notEqual(instruction("find the safest mission").kind,"SHELL");
  assert.notEqual(instruction("clear plan").kind,"SHELL");
});

test("shell operators fail closed without turning ordinary comparisons into security errors",()=>{
  for(const raw of [
    "grep x /etc && resolve day",
    "cd /var; issue M1",
    "cat /etc/issue > M1",
    "pwd; stage M1",
  ]){
    const result=mod.compileAvaCommand(raw,context);
    assert.equal(result.status,"compiled",raw);
    assert.equal(result.instruction.kind,"SHELL",raw);
    assert.equal(result.instruction.shell.command,"REJECT",raw);
  }
  const mutation=mod.compileAvaCommand("issue M1 > /tmp/order",context);
  assert.equal(mutation.status,"clarify");
  assert.equal(mutation.failure,"unsupported-command-operator");

  for(const raw of [
    "is risk > 50%?",
    "compare domestic; network",
    "compare domestic & network",
  ]){
    const result=mod.compileAvaCommand(raw,context);
    assert.notEqual(
      result.status==="clarify" ? result.failure : "",
      "unsupported-command-operator",
      raw,
    );
  }
});
