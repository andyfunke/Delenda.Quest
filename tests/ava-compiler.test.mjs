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

test("godmode random-event language compiles to one explicit intent",()=>{
  for(const phrase of [
    "random event",
    "Ava, random event now",
    "force an event right now",
    "please trigger a random opportunity",
    "make an opportunity happen",
    "give me an unexpected encounter",
    "spawn something unexpected",
  ]){
    assert.deepEqual(mod.compileAvaGodModeIntent(phrase)?.kind,"force-random-event",phrase);
  }
  for(const phrase of [
    "why are random events not happening",
    "when can an opportunity happen",
    "show opportunities",
    "production report",
  ])assert.equal(mod.compileAvaGodModeIntent(phrase),null,phrase);
});

test("daily unlock aliases compile to the existing account turn gate",()=>{
  assert.deepEqual(mod.compileAvaTurnModeIntent("daily unlock on"),{
    kind:"set-daily-unlock",
    enabled:true,
    vocabulary:"daily-unlock",
    normalizedInput:"daily unlock on",
  });
  assert.deepEqual(mod.compileAvaTurnModeIntent("daily unlock off"),{
    kind:"set-daily-unlock",
    enabled:false,
    vocabulary:"daily-unlock",
    normalizedInput:"daily unlock off",
  });
  assert.equal(mod.compileAvaTurnModeIntent("daily unlock maybe"),null);
});

test("Ava chat export phrases compile to one enumerated instruction",()=>{
  for(const phrase of [
    "export chat",
    "export ava chat",
    "export ava chat log",
    "export ava log",
  ])assert.deepEqual(instruction(phrase),{kind:"EXPORT_CHAT"},phrase);
});

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
  for(const phrase of ["what should I do","what to do","what do I do","what now","what am I supposed to do","wtf do I do","what the fuck do I do","where do I start","recommend a next move","advise me"]){
    const result=mod.compileAvaCommand(phrase,context);
    assert.equal(result.status,"compiled",phrase);
    assert.equal(result.instruction.kind,"SEMANTIC",phrase);
    assert.equal(result.semantic.operation,"ADVISE",phrase);
  }
});

test("ordinary player orientation language resolves before generic EXPLAIN",()=>{
  const expected=new Map([
    ["test","GREETING"],
    ["yo","GREETING"],
    ["ava","GREETING"],
    ["can you hear me","GREETING"],
    ["how to play","HELP"],
    ["how does this work","HELP"],
    ["help me","HELP"],
    ["im lost","HELP"],
    ["what did i do","REPORT"],
    ["what have we done","REPORT"],
    ["catch me up","STATUS"],
  ]);
  for(const [phrase,kind] of expected){
    const result=mod.compileAvaCommand(phrase,context);
    assert.equal(result.status,"compiled",phrase);
    assert.equal(result.instruction.kind,kind,phrase);
    assert.notEqual(result.instruction.kind,"EXPLAIN",phrase);
  }
  assert.equal(instruction("what did i do").topic,"retrospective");
  assert.equal(instruction("what did i do").days,1);
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

test("the generated grammar proves all 4,800 utterances by whole-IR equality",()=>{
  const bundle=mod.AVA_COMPILED_AGENCY_BUNDLE;
  assert.equal(bundle.recipes.length,4800);
  assert.equal(mod.AVA_UTTERANCE_COVERAGE.recognizedUtterances,4800);
  assert.equal(bundle.collisions.length,0);
  assert.equal(bundle.verifyRoundTrip(),true);
  for(const recipe of bundle.recipes){
    const result=mod.compileAvaCommand(recipe.normalized,context);
    assert.equal(result.status,"compiled",recipe.id);
    assert.equal(result.instruction.kind,"SEMANTIC",recipe.id);
    assert.equal(result.trace.exactIndexHit,true,recipe.id);
    assert.deepEqual(result.semantic,recipe.expectedQuery,recipe.id);
    assert.deepEqual(result.instruction.query,recipe.expectedQuery,recipe.id);
    assert.deepEqual(bundle.parse(recipe.normalized),recipe.expectedQuery,recipe.id);
    assert.equal(
      Object.keys(recipe.semanticOwners).length,
      mod.AVA_DELENDA_DOMAIN_PACK.requiredFields.length,
      recipe.id,
    );
  }
});

test("grammar compilation rejects empty, incomplete, and multiply-owned semantic productions",()=>{
  const compile=grammarSpec=>mod.compileAgencyBundle({
    grammarSpec,
    domainPack:mod.AVA_DELENDA_DOMAIN_PACK,
    capabilityRegistry:mod.AVA_CLASSIC_CAPABILITY_REGISTRY,
    normalizeSurface:value=>mod.normalizeSemanticInput(value).normalized,
  });
  const source=mod.AVA_CAMPAIGN_ADVICE_GRAMMAR;
  assert.throws(
    ()=>compile({...source,id:"empty-slots",slots:[]}),
    /grammar surface is empty/i,
  );
  assert.throws(
    ()=>compile({
      ...source,
      id:"empty-atom-surface",
      slots:[
        {...source.slots[0],atoms:[]},
        ...source.slots.slice(1),
      ],
    }),
    /grammar surface is empty/i,
  );
  assert.throws(
    ()=>compile({
      ...source,
      id:"missing-operation",
      slots:source.slots.slice(1),
    }),
    /missing semantic fields: operation/i,
  );
  assert.throws(
    ()=>compile({
      ...source,
      id:"duplicate-operation",
      fixedAtoms:[
        ...source.fixedAtoms,
        {
          id:"second-operation-owner",
          surfaces:["@fixed"],
          owns:["operation"],
          semantic:{operation:"ADVISE"},
        },
      ],
    }),
    /operation has multiple owners/i,
  );
});

test("negated consequential language never lowers to a positive mutation",()=>{
  for(const phrase of [
    "never resolve day",
    "do not resolve the day",
    "don't issue M1",
    "never commit M1",
    "do not stage M1",
    "stop executing M1",
  ]){
    const result=mod.compileAvaCommand(phrase,context);
    assert.equal(result.status,"clarify",phrase);
    assert.equal(result.failure,"unsupported-combination",phrase);
    assert.equal(result.semantic.polarity,"NEGATED",phrase);
    assert.equal(result.trace.rule,"negated-consequential",phrase);
  }
});

test("consequential grammar conserves every material token and rejects partial targets",()=>{
  for(const phrase of [
    "stage M1 and M9",
    "prepare M1 counterfeit",
    "issue M1 and bogus",
    "choose M1 with nonsense",
  ]){
    const result=mod.compileAvaCommand(phrase,context);
    assert.equal(result.status,"clarify",phrase);
    assert.equal(result.failure,"unsupported-combination",phrase);
    assert.ok(result.trace.unresolvedTokenCount>0,phrase);
    assert.ok(
      result.trace.tokenLedger.some(
        entry=>entry.material&&entry.status==="unresolved",
      ),
      phrase,
    );
  }

  for(const phrase of [
    "prepare M1 and M2",
    "stage reinforce salient and exploit gap please",
    "resolve day please",
    "yes do it",
  ]){
    const result=mod.compileAvaCommand(phrase,context);
    assert.equal(result.status,"compiled",phrase);
    assert.equal(result.trace.unresolvedTokenCount,0,phrase);
    assert.ok(
      result.trace.tokenLedger
        .filter(entry=>entry.material)
        .every(entry=>entry.status==="consumed"),
      phrase,
    );
  }
});

test("directive judgment compiles channel and actor without stealing campaign-choice criteria",()=>{
  for(const [phrase,channel] of [
    ["what should i do about producion","production"],
    ["advise production","production"],
    ["rank military","military"],
  ]){
    const result=mod.compileAvaCommand(phrase,context);
    assert.equal(result.status,"compiled",phrase);
    assert.equal(result.instruction.kind,"SEMANTIC",phrase);
    assert.equal(result.semantic.subject.type,"DIRECTIVE",phrase);
    assert.equal(result.semantic.directive.channel,channel,phrase);
  }

  const actor={id:"valeria",kind:"foreign-actor",label:"Valeria",aliases:["Valerian Republic"]};
  const diplomacy=mod.compileAvaCommand(
    "advise diplomacy with Valeria",
    {...context,entities:[...entities,actor]},
  );
  assert.equal(diplomacy.status,"compiled");
  assert.equal(diplomacy.semantic.subject.type,"DIRECTIVE");
  assert.deepEqual(diplomacy.semantic.directive,{
    channel:"diplomacy",
    actorId:"valeria",
  });
  assert.deepEqual(diplomacy.semantic.subject.entityIds,["valeria"]);

  for(const phrase of ["advise diplomacy","advise diplomacy with Atlantis"]){
    const result=mod.compileAvaCommand(
      phrase,
      {...context,entities:[...entities,actor]},
    );
    assert.equal(result.status,"clarify",phrase);
    assert.equal(result.failure,"missing-target",phrase);
  }

  const choice=mod.compileAvaCommand(
    "would you still recommend it without the production gain",
    context,
  );
  assert.equal(choice.status,"compiled");
  assert.equal(choice.semantic.subject.type,"CAMPAIGN_CHOICE");
  assert.equal(choice.semantic.directive,undefined);
});

test("metric challenges carry explicit operands and incomplete challenges clarify",()=>{
  const complete=mod.compileAvaCommand(
    "is production secondary to military readiness",
    context,
  );
  assert.equal(complete.status,"compiled");
  assert.equal(complete.semantic.subject.type,"METRIC");
  assert.equal(complete.semantic.operation,"CHALLENGE");
  assert.deepEqual(complete.semantic.metricOperands,[
    "production",
    "readiness",
  ]);

  const incomplete=mod.compileAvaCommand("challenge production",context);
  assert.equal(incomplete.status,"clarify");
  assert.equal(incomplete.failure,"missing-target");
});

test("campaign comparisons require two complete targets or two explicit domains",()=>{
  for(const phrase of [
    "compare reinforce salient with nonsense",
    "compare reinforce salient with exploit gap plus M9",
    "compare missions",
  ]){
    const result=mod.compileAvaCommand(phrase,context);
    assert.equal(result.status,"clarify",phrase);
  }
  for(const phrase of [
    "compare reinforce salient with exploit gap",
    "compare domestic and network",
    "compare n and d",
  ]){
    const result=mod.compileAvaCommand(phrase,context);
    assert.equal(result.status,"compiled",phrase);
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

test("Dark Net easter-egg derivatives compile as one sealed shell surface",()=>{
  for(const raw of [
    "tor",
    "./tor",
    "sh tor",
    "darknet",
    "dark net",
    "dark-web",
    "access darknet",
    "access the dark net",
    "open tor",
    "connect to dark web",
    "tor campaign",
    "darknet quote Q103",
  ]){
    const result=mod.compileAvaCommand(raw,context);
    assert.equal(result.status,"compiled",raw);
    assert.equal(result.instruction.kind,"SHELL",raw);
    assert.equal(result.instruction.shell.command,"DARK_NET",raw);
  }
  const unsafe=mod.compileAvaCommand("tor campaign | stage M1",context);
  assert.equal(unsafe.status,"compiled");
  assert.equal(unsafe.instruction.kind,"SHELL");
  assert.equal(unsafe.instruction.shell.command,"REJECT");
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
