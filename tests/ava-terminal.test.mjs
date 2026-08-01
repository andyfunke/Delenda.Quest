import assert from "node:assert/strict";
import test from "node:test";

const compiler=await import(process.env.DELENDA_AVA_BUNDLE);
const terminal=await import(process.env.DELENDA_AVA_TERMINAL_BUNDLE);
const runtime=await import(process.env.DELENDA_AVA_RUNTIME_BUNDLE);
const contextModule=await import(process.env.DELENDA_AVA_CONTEXT_BUNDLE);
const game=await import(process.env.DELENDA_AVA_GAME_BUNDLE);

const newState=(seed=1729)=>game.initialState({...game.DEFAULT_CAMPAIGN,seed});
const newSession=()=>terminal.initialAvaTerminalSession();

const compile=(raw,state,fraction=0,selected=null,discourse)=>{
  const result=compiler.compileAvaCommand(raw,{
    currentModule:"campaign",
    entities:contextModule.avaEntitiesForState(state,fraction),
    selected,
    discourse,
  });
  assert.equal(result.status,"compiled",`${raw}: ${JSON.stringify(result)}`);
  return result;
};

const run=(raw,state,session=newSession(),fraction=0,darkNetContext)=>{
  const compiled=compile(raw,state,fraction,null,session.discourse);
  return terminal.runAvaInstruction(
    state,
    session,
    compiled.instruction,
    fraction,
    compiled.semantic,
    compiled.trace,
    darkNetContext,
  );
};

test("every Ava response opens with ruthless state-bound and instruction-bounded field voice",()=>{
  const state=newState();
  const expected=new Map([
    ["hello","ORIENTATION"],
    ["who are you","IDENTITY"],
    ["help","GRAMMAR"],
    ["missions","MISSIONS"],
    ["report production","PRODUCTION"],
    ["report losses over the last 5 days","LOSSES"],
    ["where do I influence execution confidence","OPERATIONS"],
    ["explain execution confidence calculus","OPERATIONS"],
    ["forecast M1","PROJECTION"],
    ["open production","PRODUCTION"],
    ["thanks","ACKNOWLEDGMENT"],
  ]);
  for(const [command,topic] of expected){
    const result=run(command,state);
    assert.match(result.text,new RegExp(`^FIELD NOTE / ${topic}\\n\\S`));
    assert.doesNotMatch(result.text,/deterministic|runtime effect|compiler|content frame|schema version/i);
  }
  assert.notEqual(run("report production",state).text.split("\n")[1],run("report losses over the last 5 days",state).text.split("\n")[1]);
});

test("ordinary shittest player commands return useful orientation instead of grammar accidents",()=>{
  const state=newState();
  const cases=[
    ["test",/command channel open/i],
    ["hello",/recommend the next move/i],
    ["what to do",/recommendation|priority|judgment/i],
    ["what do i do",/recommendation|priority|judgment/i],
    ["what now",/recommendation|priority|judgment/i],
    ["what next",/recommendation|priority|judgment/i],
    ["where do we go from here",/recommendation|priority|judgment/i],
    ["how should we proceed",/recommendation|priority|judgment/i],
    ["how to play",/command grammar/i],
    ["could you explain how this game actually works",/command grammar/i],
    ["help me",/command grammar/i],
    ["im lost",/command grammar/i],
    ["what did i do",/retrospective/i],
    ["please recap what we did last turn",/retrospective/i],
    ["what have we done",/retrospective/i],
    ["catch me up",/command position|situation|overview/i],
    ["ava can you catch me up on the situation",/command position|situation|overview/i],
  ];
  for(const [command,useful] of cases){
    const result=run(command,state);
    assert.match(result.text,useful,command);
    assert.doesNotMatch(result.text,/recognized EXPLAIN|could not map|no legal option exists in the requested scope/i,command);
  }
});

const firstAvailable=(state,kind,fraction=0,domain)=>{
  const descriptor=runtime.enumerateAvaActions(state,fraction).find(item=>
    item.kind===kind&&item.available&&(domain===undefined||item.domain===domain)
  );
  assert.ok(descriptor,`expected an available ${domain??kind} action`);
  return descriptor;
};

test("expanded directive registration preserves established Ava P-handles",()=>{
  const actions=runtime.enumerateAvaActions(newState());
  const handles=(familyId)=>actions
    .filter(item=>item.action?.familyId===familyId)
    .map(item=>item.handle);

  assert.deepEqual(handles("supply"),["P48","P49","P50","P51"]);
  assert.deepEqual(handles("statecraft"),["P52","P53","P54","P55"]);
  assert.deepEqual(handles("treaties"),["P56","P57","P58","P59","P60"]);
  assert.deepEqual(handles("sanctions"),["P61","P62","P63","P64","P65"]);
  assert.deepEqual(handles("alliance-obligations"),["P66","P67","P68","P69"]);
  assert.deepEqual(handles("foreign-intelligence"),["P79","P80","P81","P162"]);
  assert.deepEqual(handles("expenditure"),["P82","P83","P84","P85","P102"]);
  assert.deepEqual(handles("operational-reserve"),["P86","P87","P88","P89"]);
  assert.deepEqual(handles("unit-recovery"),["P90","P91","P92","P93"]);
  assert.equal(actions.filter(item=>item.kind==="directive").length,237);
  assert.deepEqual(handles("production"),["P1","P2","P3","P4","P5","P94"]);
  assert.deepEqual(handles("network-posture"),["P70","P71","P72","P99"]);
  assert.deepEqual(handles("network-authentication"),["P73","P74","P75","P100"]);
  assert.deepEqual(handles("network-custody"),["P76","P77","P78","P101"]);
  assert.deepEqual(handles("branch-priority"),["P103","P104","P105","P106"]);
  assert.deepEqual(handles("industrial-accords"),["P107","P108","P109","P175"]);
  assert.deepEqual(handles("information-diplomacy"),["P110","P111","P112","P176"]);
  assert.deepEqual(handles("burden-sharing"),["P113","P114","P115","P177"]);
  assert.deepEqual(handles("war-labor"),["P116","P117","P118","P119","P120"]);
  assert.deepEqual(handles("strategic-freight"),["P121","P122","P123","P124","P125"]);
  assert.deepEqual(handles("tooling-policy"),["P126","P127","P128","P163"]);
  assert.deepEqual(handles("substitute-materials"),["P159","P160","P161","P174"]);
  assert.deepEqual(handles("procurement-goal"),["P190","P191","P192","P193"]);
  assert.deepEqual(handles("equipment-standard"),["P194","P195","P196","P197"]);
  assert.deepEqual(handles("sustainment-goal"),["P198","P199","P200","P201"]);
  assert.deepEqual(handles("neutral-courtship"),["P202","P203","P204","P205"]);
  assert.deepEqual(handles("covert-purchases"),["P234","P235","P236","P237"]);
});

const missionPacket=(state)=>[
  firstAvailable(state,"maneuver",0,"main"),
  firstAvailable(state,"sub-mission",0,"domestic"),
  firstAvailable(state,"sub-mission",0,"network"),
];
const fullDocketState=()=>newState(1);

const stageMissionPacket=(state)=>{
  const descriptors=missionPacket(state);
  const staged=run(`stage ${descriptors.map(item=>item.handle).join(" ")}`,state);
  return{descriptors,staged};
};

const confirmPending=(state,session,fraction=0)=>{
  assert.ok(session.confirmation,"expected a pending confirmation");
  return run(`confirm ${session.confirmation.id}`,state,session,fraction);
};

test("MISSIONS is a DOM-free executable docket with Main, Domestic, and Network handles",()=>{
  const state=fullDocketState();
  const result=run("missions",state);

  assert.equal(result.state,state,"read-only terminal commands must preserve the state object");
  assert.equal(result.executed,false);
  assert.match(result.text,/MISSIONS \[SEALED D\+0\]/);
  assert.match(result.text,/MAIN CAMPAIGN/);
  assert.match(result.text,/DOMESTIC FRONT/);
  assert.match(result.text,/COMMAND NETWORK/);
  assert.match(result.text,/\[M\d+\].*AVAILABLE/);
  assert.match(result.text,/\[D\d+\].*AVAILABLE/);
  assert.match(result.text,/\[N\d+\].*AVAILABLE/);
});

test("MISSIONS omits an alternate front that did not rotate into the day",()=>{
  const result=run("missions",newState(2));
  assert.match(result.text,/MAIN CAMPAIGN/);
  assert.doesNotMatch(result.text,/DOMESTIC FRONT/);
  assert.match(result.text,/COMMAND NETWORK/);
  assert.doesNotMatch(result.text,/\[D\d+\]/);
  assert.match(result.text,/\[N\d+\].*AVAILABLE/);
});

test("a Main/Domestic/Network packet stages without mutating campaign state",()=>{
  const state=fullDocketState();
  const before=structuredClone(state);
  const{descriptors,staged}=stageMissionPacket(state);

  assert.deepEqual(staged.state,before);
  assert.equal(staged.executed,false);
  assert.equal(staged.session.plan.length,3);
  assert.deepEqual(staged.session.plan.map(runtime.actionKey),descriptors.map(item=>runtime.actionKey(item.action)));
  assert.match(staged.text,/PLAN: P-/);
  assert.match(staged.text,/COST: 3 ORDERS/);
});

test("ISSUE PLAN preflights, state-bound confirmation executes, and terminal matches direct controller",()=>{
  const initial=fullDocketState();
  const{staged}=stageMissionPacket(initial);
  const issued=run("issue plan",initial,staged.session);

  assert.deepEqual(issued.state,initial,"preflight must not mutate state");
  assert.ok(issued.session.confirmation);
  assert.equal(issued.session.confirmation.stateRevision,runtime.avaStateRevision(initial));
  assert.match(issued.text,/ORDER AWAITING CONFIRMATION/);
  assert.match(issued.text,/> confirm C-/i);

  const directPlan=runtime.buildAvaPlan(initial,staged.session.plan);
  const direct=runtime.executeAvaPlan(initial,directPlan);
  assert.equal(direct.executed,true,direct.rejection);

  const confirmed=confirmPending(initial,issued.session);
  assert.equal(confirmed.executed,true,confirmed.rejection);
  assert.equal(confirmed.state.actions,0);
  assert.deepEqual(confirmed.state,direct.state,"terminal and direct controller must produce the same authoritative state");
});

test("the exact confirmation command emitted by Ava round-trips through the compiler",()=>{
  const state=newState();
  const staged=run("resolve day",state);
  assert.ok(staged.session.confirmation);
  const command=`confirm ${staged.session.confirmation.id}`;
  const result=compiler.compileAvaCommand(command,{
    currentModule:"campaign",
    entities:contextModule.avaEntitiesForState(state),
    selected:null,
  });
  assert.equal(result.status,"compiled",`${command}: ${JSON.stringify(result)}`);
  assert.equal(result.instruction.kind,"CONFIRM");
  assert.equal(result.instruction.token,staged.session.confirmation.id);
});

test("terminal reports preserve requested historical windows and expose report structure",()=>{
  let state=newState(77123);
  for(let day=0;day<6;day+=1)state=game.resolve(state);

  const losses=run("report losses over the last 5 days",state);
  assert.equal(losses.report?.topic,"losses");
  assert.equal(losses.report?.history.requestedDays,5);
  assert.equal(losses.report?.history.resolvedDays,5);
  assert.doesNotMatch(losses.text,/CALCULATION|CUMULATIVE INTELLIGENCE|FRIENDLY COMBAT LOSS/);
  assert.match(losses.text,/ANSWER/);

  const network=run("report network",state);
  assert.equal(network.report?.topic,"network");
  assert.match(network.text,/NETWORK/i,"a Network report must identify and describe the requested system");
});

test("MORE and LESS materially change report disclosure depth",()=>{
  const state=newState();
  const deepMode=run("more detail",state),deepReport=run("report production",state,deepMode.session);
  assert.match(deepReport.text,/DEPENDENCIES/);assert.match(deepReport.text,/LEDGER SCOPE/);assert.match(deepReport.text,/CALCULATION/);
  assert.doesNotMatch(deepReport.text,/industrial-throughput|production-flow|resource-coverage/i,"deep reports must print human labels, not internal slugs");
  assert.doesNotMatch(deepReport.text,/ \/\/ /,"Ava must use the declared text punctuation grammar");
  const glanceMode=run("less",state,deepReport.session),glanceReport=run("report production",state,glanceMode.session);
  assert.doesNotMatch(glanceReport.text,/DEPENDENCIES|LEDGER SCOPE|CALCULATION|CUMULATIVE INTELLIGENCE/);
  assert.match(glanceReport.text,/ANSWER/);assert.match(glanceReport.text,/JUDGMENT/);assert.match(glanceReport.text,/GRAMMAR/);
  assert.notEqual(deepReport.text,glanceReport.text);
});

test("Ava explains influence and calculus from the same indexed metric",()=>{
  const state=newState();
  const levers=run("where do I influence execution confidence",state);
  assert.match(levers.text,/CONTROL/);
  assert.match(levers.text,/Select and Prepare a Maneuver/);
  assert.match(levers.text,/DEPENDENCIES/);
  assert.match(levers.text,/GRAMMAR/);

  const calculus=run("explain execution confidence calculus",state);
  assert.match(calculus.text,/CALCULATION/);
  assert.match(calculus.text,/BASE CHANCE|READINESS|INTELLIGENCE/);
  assert.match(calculus.text,/EXECUTION CONFIDENCE/);
  assert.doesNotMatch(calculus.text,/sealed deterministic roll/i);
  assert.doesNotMatch(calculus.text,/<(?:div|section|table|svg)\b/i);
});

test("available doctrine can be internalized through a state-bound zero-order confirmation",()=>{
  const state=newState();
  state.doctrine=500;
  const descriptor=firstAvailable(state,"doctrine-stage");
  const staged=run(`internalize ${descriptor.handle}`,state);

  assert.ok(staged.session.confirmation);
  assert.equal(staged.session.confirmation.purpose,"doctrine");
  assert.deepEqual(staged.state,state);

  const direct=runtime.executeAvaAction(state,descriptor.action);
  assert.equal(direct.executed,true,direct.rejection);
  const confirmed=confirmPending(state,staged.session);
  assert.equal(confirmed.executed,true,confirmed.rejection);
  assert.equal(confirmed.state.actions,state.actions,"doctrine must not spend a strategic order");
  assert.ok(confirmed.state.unlocked.includes(descriptor.action.stageId));
  assert.deepEqual(confirmed.state,direct.state);
});

const stateWithOpportunity=()=>{
  for(let seed=1;seed<=2000;seed+=1){
    const opening=newState(seed);
    for(let day=2;day<=30;day+=1){
      const state=game.restoreCampaignState({...opening,day,currentSituation:null,currentSubMissions:null});
      const status=game.opportunityStatusForFraction(state,0);
      if(!status.packet)continue;
      const fraction=(status.packet.opensAtFraction+status.packet.closesAtFraction)/2;
      if(game.opportunityStatusForFraction(state,fraction).status==="active")return{state,fraction,packet:status.packet};
    }
  }
  assert.fail("no deterministic post-Day-1 opportunity found in seed sweep");
};

test("opportunity forecast discloses branches but never resolves or reveals the sealed branch",()=>{
  const{state,fraction,packet}=stateWithOpportunity();
  const descriptor=firstAvailable(state,"opportunity-response",fraction);
  const before=structuredClone(state);
  const forecast=run(`forecast ${descriptor.handle}`,state,newSession(),fraction);

  assert.deepEqual(forecast.state,before);
  assert.equal(forecast.executed,false);
  assert.equal(forecast.state.opportunityHistory.length,0);
  assert.match(forecast.text,/does not reveal which contingent branch/i);
  assert.match(forecast.text,/does not reveal which contingent branch/i);
  assert.doesNotMatch(forecast.text,new RegExp(packet.ticket.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")),"forecast output must not expose the resolution ticket");
  assert.doesNotMatch(forecast.text,/opening was exploited|opening closed without the intended effect/i);
});

test("opportunity response confirms and resolves without spending a strategic order",()=>{
  const{state,fraction}=stateWithOpportunity();
  const descriptor=firstAvailable(state,"opportunity-response",fraction);
  const staged=run(`respond ${descriptor.handle}`,state,newSession(),fraction);

  assert.ok(staged.session.confirmation);
  assert.equal(staged.session.confirmation.purpose,"opportunity");
  const confirmed=confirmPending(state,staged.session,fraction);
  assert.equal(confirmed.executed,true,confirmed.rejection);
  assert.equal(confirmed.state.actions,state.actions);
  assert.equal(confirmed.state.opportunityHistory.length,1);
  assert.equal(confirmed.state.opportunityHistory[0].opportunityId,descriptor.action.opportunityId);
});

test("RESOLVE DAY requires confirmation and matches the direct controller",()=>{
  const state=newState(551);
  const staged=run("resolve day",state);

  assert.deepEqual(staged.state,state);
  assert.equal(staged.executed,false);
  assert.equal(staged.session.confirmation?.purpose,"resolve-day");

  const direct=runtime.executeAvaAction(state,{kind:"resolve-day"});
  assert.equal(direct.executed,true,direct.rejection);
  const confirmed=confirmPending(state,staged.session);
  assert.equal(confirmed.executed,true,confirmed.rejection);
  assert.equal(confirmed.state.day,state.day+1);
  assert.equal(confirmed.state.resolutionHistory.length,state.resolutionHistory.length+1);
  assert.deepEqual(confirmed.state,direct.state);
});

test("Military orders can exhaust the order budget but can never resolve the day",()=>{
  const opening=newState(8088),military=runtime.enumerateAvaActions(opening).filter(item=>item.kind==="directive"&&item.parentLabel.startsWith("Military /"));
  assert.ok(military.length>=8);
  for(const descriptor of military){
    const state=newState(8088),result=runtime.executeAvaAction(state,descriptor.action);
    assert.equal(result.executed,true,`${descriptor.label}: ${result.rejection}`);
    assert.equal(result.state.day,state.day,descriptor.label);
    assert.equal(result.state.resolutionHistory.length,state.resolutionHistory.length,descriptor.label);
    assert.equal(result.state.status,state.status,descriptor.label);
  }
  const finalOrder={...opening,actions:1},descriptor=runtime.enumerateAvaActions(finalOrder).find(item=>item.kind==="directive"&&item.parentLabel.startsWith("Military /")&&item.available);
  assert.ok(descriptor);
  const spent=runtime.executeAvaAction(finalOrder,descriptor.action);
  assert.equal(spent.executed,true,spent.rejection);assert.equal(spent.state.actions,0);assert.equal(spent.state.day,finalOrder.day);assert.equal(spent.state.resolutionHistory.length,0);
  const mixed=runtime.buildAvaPlan(opening,[descriptor.action,{kind:"resolve-day"}]);
  const rejected=runtime.executeAvaPlan(opening,mixed);
  assert.equal(rejected.executed,false);assert.match(rejected.rejection,/cannot share an order packet/);assert.equal(rejected.state,opening);
});

test("confirmation is rejected after authoritative state changes",()=>{
  const state=newState();
  const staged=run("resolve day",state);
  assert.ok(staged.session.confirmation);

  const maneuver=firstAvailable(state,"maneuver",0,"main");
  const external=runtime.executeAvaAction(state,maneuver.action);
  assert.equal(external.executed,true,external.rejection);
  assert.notEqual(runtime.avaStateRevision(external.state),staged.session.confirmation.stateRevision);

  const rejected=confirmPending(external.state,staged.session);
  assert.equal(rejected.executed,false);
  assert.equal(rejected.rejection,"Confirmation expired because the command position changed.");
  assert.deepEqual(rejected.state,external.state);
  assert.match(rejected.text,/CONFIRM REJECTED/);
});

test("ordinary advice is narrative while explicit forecast and compare expose bounded command calculus",()=>{
  const state=newState(1729);
  const advice=run("what should I do",state);
  assert.match(advice.text,/^FIELD NOTE \/ JUDGMENT/);
  assert.match(advice.text,/AVA \/ CAMPAIGN \/ DAY 1/);
  assert.match(advice.text,/My recommendation is M\d/);
  assert.match(advice.text,/three declarant options/i);
  assert.doesNotMatch(advice.text,/CALCULATION|equation|option score|rules fired|corridor viability/i);
  assert.ok(advice.answerPlan);
  assert.equal(advice.answerPlan.calculationDisclosure,"NONE");
  assert.ok(advice.trace?.semantic);
  assert.ok(advice.trace?.retrievedFacts.length);

  const forecast=run("forecast M1",state);
  assert.match(forecast.text,/CALCULATION/);
  assert.match(forecast.text,/controlled success\/disruption branches/i);
  assert.match(forecast.text,/principal uncertainty/i);
  assert.match(forecast.text,/disclosed enemy-force estimate/i);
  assert.doesNotMatch(forecast.text,/resolution roll|ticket:[A-Za-z0-9]/i);

  const comparison=run("compare M1 M2",state);
  assert.match(comparison.text,/DISCLOSED PROJECTION/i);
  assert.match(comparison.text,/disclosed loss, ground, and shortage|Neither order dominates/i);
  assert.doesNotMatch(comparison.text,/SHARED DECISION CALCULUS|rules fired|SCORE/i);
});

test("Ava varies authored structure deterministically without changing the grounded conclusion",()=>{
  const state=newState(1729);
  const first=run("what should I do",state);
  const second=run("what should I do",state,first.session);
  assert.notEqual(first.text,second.text);
  assert.notEqual(first.answerPlan?.structureId,second.answerPlan?.structureId);
  assert.equal(first.answerPlan?.directAnswer,second.answerPlan?.directAnswer);
  assert.equal(first.answerPlan?.stateRevision,second.answerPlan?.stateRevision);
});

test("the sealed Ava shell navigates a realistic fake filesystem and denies protected paths",()=>{
  const state=newState(1);
  let session=newSession();
  const execute=(command)=>{
    const result=run(command,state,session);
    session=result.session;
    assert.equal(result.outputKind,"shell",command);
    assert.deepEqual(result.state,state,command);
    return result;
  };

  assert.equal(execute("pwd").text,"/home/commander/home");
  assert.equal(execute("cd ..").session.shell.cwd,"/home/commander");
  assert.equal(execute("cd ~/home").session.shell.cwd,"/home/commander/home");
  assert.equal(execute("cd /var").session.shell.cwd,"/var");
  assert.match(execute("ls -al").text,/cache[\s\S]*lib[\s\S]*log[\s\S]*tmp/);
  assert.match(execute("cd /var/log").text,/Permission denied/);
  assert.match(execute("cd /var/log/../tmp").text,/Permission denied/);
  assert.equal(execute("cd /home/commander/home").session.shell.cwd,"/home/commander/home");
  assert.match(execute("grep -inr net reports").text,/NET FLIGHT|NETWORK/i);
  assert.equal(execute('grep -r "(.|..)+Z" reports').text,"");
  assert.match(execute("grep x /does-not-exist").text,/No such file or directory/);
  assert.match(execute("grep x reports").text,/Is a directory/);
  assert.match(execute("find reports -maxdepth 2 -name *.xlsx").text,/command-dashboard\.xlsx/);
  assert.match(execute("find /does-not-exist").text,/No such file or directory/);
  assert.match(execute("history").text,/pwd[\s\S]*cd \.\.[\s\S]*find reports/);
  const cleared=execute("clear");
  assert.equal(cleared.clearScreen,true);
  assert.equal(cleared.text,"");
});

test("Dark Net mounts the complete campaign corpus and preserves the current docket separately",()=>{
  const state=newState(1);
  const telemetry={
    asOf:Date.UTC(2026,6,23),
    categoryTotals:[
      {category:"page_view",count:1200},
      {category:"ava_command",count:400},
    ],
    outcomes:[
      {outcome:"victory",campaigns:12,averageDays:18},
      {outcome:"defeat",campaigns:9,averageDays:14},
    ],
    topSignals:[
      {category:"page_view",subject:"module:campaign",context:"site",count:500},
    ],
  };
  const opened=run("tor",state,newSession(),0,{telemetry,seenAphorismIds:[]});
  assert.equal(opened.outputKind,"shell");
  assert.deepEqual(opened.state,state);
  assert.equal(opened.executed,false);
  assert.match(opened.text,/DARK NET \/\/ RELAY ESTABLISHED/);
  assert.match(opened.text,/438 CAMPAIGN RECORDS \/\/ 1314 RESPONSE PATHS/);
  assert.equal(opened.session.shell.cwd,"/darknet");
  assert.equal(opened.session.shell.darkNetUnlocked,true);
  assert.doesNotMatch(opened.text,/email|friend@example|raw prompt/i);

  const telemetryResult=run(
    "tor telemetry",
    state,
    opened.session,
    0,
    {telemetry,seenAphorismIds:[]},
  );
  assert.match(telemetryResult.text,/PAGE VIEW: 1,200/);
  assert.match(telemetryResult.text,/VICTORY: 12 CAMPAIGNS/);

  const campaign=run("access darknet campaign",state,telemetryResult.session);
  assert.match(campaign.text,/COMPLETE CAMPAIGN REGISTRY \/\/ 438 RECORDS \/\/ 1314 RESPONSE PATHS/);
  assert.match(campaign.text,/50 MAIN SITUATIONS/);
  assert.match(campaign.text,/288 DOMESTIC \+ NETWORK VARIANTS/);
  assert.match(campaign.text,/100 TARGETS OF OPPORTUNITY/);
  assert.equal(campaign.session.shell.cwd,"/darknet/campaign");

  const grep=run("grep -ir authentication .",state,campaign.session);
  assert.match(grep.text,/\/darknet\/campaign\/network\//);
  assert.ok(grep.text.split("\n").length>100);

  const current=run("tor campaign current",state,grep.session);
  const expected=runtime.enumerateAvaActions(state).filter(
    item=>item.domain!==undefined||item.kind==="opportunity-response",
  );
  assert.match(current.text,new RegExp(`${expected.length} OPTIONS`));
  for(const option of expected)assert.match(current.text,new RegExp(`\\[${option.handle}\\]`));
  assert.equal(current.session.plan.length,0);
  assert.equal(current.session.confirmation,null);
  assert.deepEqual(current.state,state);
  assert.match(current.text,/No order can be staged, issued, or confirmed through this surface/);
});

test("Dark Net quotation index is free but opening a record consumes exactly one unseen entry",()=>{
  const state=newState(1);
  const index=run("tor quotes",state,newSession(),0,{seenAphorismIds:["Q002"]});
  assert.match(index.text,/126 RECORDS \/\/ 125 UNSEEN/);
  assert.match(index.text,/Q001 \[UNSEEN\]/);
  assert.match(index.text,/Q002 \[VIEWED\]/);
  assert.doesNotMatch(index.text,/A commander who spends his reserve early/);
  assert.equal(index.aphorismViewIds,undefined);

  const first=run("tor quote Q001",state,index.session,0,{seenAphorismIds:["Q002"]});
  assert.deepEqual(first.aphorismViewIds,["Q001"]);
  assert.match(first.text,/A commander who spends his reserve early/);
  assert.match(first.text,/125 → 124 UNSEEN/);
  assert.deepEqual(first.state,state);

  const repeated=run("dark net Q001",state,first.session,0,{seenAphorismIds:["Q001","Q002"]});
  assert.deepEqual(repeated.aphorismViewIds,["Q001"]);
  assert.match(repeated.text,/ALREADY VIEWED \/\/ 124 UNSEEN REMAIN/);

  const grepped=run(
    "grep reserve",
    state,
    first.session,
    0,
    {seenAphorismIds:["Q002"]},
  );
  assert.ok(grepped.aphorismViewIds?.length);
  assert.match(grepped.text,/\/darknet\/quotes\/Q\d{3}\.txt:/);
});

test("bare filenames, shorthand stems, and Tab completion resolve through the live virtual filesystem",()=>{
  const state=newState(1);
  const session=newSession();
  const references=terminal.avaShellFileReferences(state,session.shell);
  const context={
    currentModule:"campaign",
    entities:contextModule.avaEntitiesForState(state,0),
    shellFileReferences:references,
  };
  const bare=compiler.compileAvaCommand("operations",context);
  assert.equal(bare.status,"compiled");
  assert.equal(bare.instruction.kind,"SHELL");
  assert.equal(bare.instruction.shell.command,"OPEN");
  const opened=terminal.runAvaInstruction(
    state,
    session,
    bare.instruction,
    0,
    bare.semantic,
    bare.trace,
  );
  assert.equal(opened.download?.filename,"operations.xlsx");

  const explicit=compiler.compileAvaCommand(
    "reports/current/operations.txt",
    context,
  );
  assert.equal(explicit.status,"compiled");
  assert.equal(explicit.instruction.kind,"SHELL");
  const text=terminal.runAvaInstruction(
    state,
    session,
    explicit.instruction,
    0,
    explicit.semantic,
    explicit.trace,
  );
  assert.match(text.text,/OPERATIONS|Operational/i);

  const shellCompletion=terminal.completeAvaInput("cd rep",state,session.shell);
  assert.match(shellCompletion.value,/^cd reports/);
  const naturalCompletion=terminal.completeAvaInput(
    "advise me on the sec",
    state,
    session.shell,
  );
  assert.match(naturalCompletion.value,/^advise me on the secondary/i);
});

test("Ava report workbooks are real downloadable xlsx files with formulas preserved in cells",()=>{
  const state=newState(1);
  const report=run("report production",state);
  const savedPath="/home/commander/home/reports/saved/day-001-production-01.xlsx";
  assert.match(report.text,/reports\/saved\/day-001-production-01\.xlsx/);
  assert.ok(report.session.shell.files.some(file=>file.path===savedPath));

  const download=run(
    `download ${savedPath}`,
    state,
    report.session,
  );
  assert.equal(download.outputKind,"shell");
  assert.ok(download.download);
  assert.equal(download.download.mime,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(Buffer.from(download.download.bytes.subarray(0,2)).toString(),"PK");
  const archive=Buffer.from(download.download.bytes).toString("utf8");
  for(const marker of [
    "Industrial Throughput",
    "ALLOCATION",
    "PRODUCTION",
    "CURRENT",
    "REQUIRED",
    "LIVE STOCK",
    "BALANCE",
    "Net Flight",
    "Force Generation",
    "Diplomatic Calculus",
    "Directive Calculus",
    "Doctrine Calculus",
    "Calculation Inputs",
    "Resolution History",
    "Ava Decision Ledger",
    "F2*0.5+E2*0.35-D2*0.55-G2*0.00025",
    "Campaign Score",
    "EXP((28-B3)/5.2)",
  ])assert.match(archive,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")),marker);
  assert.doesNotMatch(archive,/resolutionTicket|raw prompt|accountOpportunityIds/i);

  const resolvePending=run("resolve day",state,download.session);
  const nextDay=confirmPending(state,resolvePending.session);
  assert.ok(
    nextDay.session.shell.files.some(file=>file.path===savedPath),
    "saved reports must survive order and day transitions",
  );
});

test("Ava counsel and exports cannot derive conclusions from sealed enemy condition",()=>{
  const state=newState(1);
  const altered=structuredClone(state);
  altered.adversary.force=Math.round(state.adversary.force*0.42);
  altered.adversary.readiness=20;
  altered.adversary.equipment=100;

  const firstAdvice=run("what should I do",state);
  const alteredAdvice=run("what should I do",altered);
  assert.equal(firstAdvice.answerPlan?.directAnswer,alteredAdvice.answerPlan?.directAnswer);
  assert.deepEqual(firstAdvice.answerPlan?.rankedOptions,alteredAdvice.answerPlan?.rankedOptions);

  const firstReport=run("report production",state);
  const alteredReport=run("report production",altered);
  const firstWorkbook=firstReport.session.shell.files.find(file=>file.kind==="workbook");
  const alteredWorkbook=alteredReport.session.shell.files.find(file=>file.kind==="workbook");
  assert.ok(firstWorkbook?.workbookBytes);
  assert.ok(alteredWorkbook?.workbookBytes);
  assert.deepEqual(firstWorkbook.workbookBytes,alteredWorkbook.workbookBytes);
});

test("saved report snapshots are immutable and sequence changed same-day state",()=>{
  const state=newState(1);
  const first=run("report production",state,newSession(),0.5);
  const firstPath="/home/commander/home/reports/saved/day-001-production-01.xlsx";
  const firstBytes=[
    ...first.session.shell.files.find(file=>file.path===firstPath).workbookBytes,
  ];
  const changed={...state,workforce:Math.round(state.workforce*0.7)};
  const second=run("report production",changed,first.session,0.5);
  const secondPath="/home/commander/home/reports/saved/day-001-production-02.xlsx";
  assert.ok(second.session.shell.files.some(file=>file.path===secondPath));
  assert.deepEqual(
    second.session.shell.files.find(file=>file.path===firstPath).workbookBytes,
    firstBytes,
  );
  assert.notDeepEqual(
    second.session.shell.files.find(file=>file.path===secondPath).workbookBytes,
    firstBytes,
  );
});

test("contextual repairs revise the semantic query without losing the active docket",()=>{
  const state=fullDocketState();
  const first=run("advise me on the secondary missions",state);
  assert.equal(first.trace?.semantic?.scope.group,"SECONDARY");
  assert.ok(first.session.discourse.lastRecommended);

  const why=run("why that one",state,first.session);
  assert.equal(why.trace?.semantic?.operation,"JUSTIFY");
  assert.equal(why.trace?.semantic?.reference.type,"LAST_RECOMMENDATION");
  assert.match(why.text,/JUSTIFICATION/);

  const other=run("what about the other one",state,why.session);
  assert.equal(other.trace?.semantic?.reference.type,"OTHER_ENTITY");
  assert.notEqual(other.session.discourse.lastRecommended,first.session.discourse.lastRecommended);

  const correction=run("no, I meant the network option",state,other.session);
  assert.equal(correction.trace?.semantic?.operation,"CORRECT");
  assert.deepEqual(correction.trace?.semantic?.scope.domains,["NETWORK"]);

  const hypothetical=run(
    "would you still recommend it without the production gain",
    state,
    correction.session,
  );
  assert.equal(hypothetical.trace?.semantic?.timeframe,"PROJECTED");
  assert.equal(hypothetical.trace?.semantic?.overlays[0].kind,"WITHOUT_EFFECT");
  assert.match(hypothetical.text,/ASSUMPTION/);
  assert.doesNotMatch(hypothetical.text,/CALCULATION/);
});

test("negative near-neighbors do not collapse into secondary-scope advice",()=>{
  const state=fullDocketState();
  const negated=run("do not advise me on the secondary missions",state);
  assert.equal(negated.trace?.semantic?.polarity,"NEGATED");
  assert.match(negated.text,/will not recommend/i);

  const objective=run("what is the secondary objective of the main mission",state);
  assert.equal(objective.trace?.semantic?.subject.type,"MISSION_OBJECTIVE");
  assert.notEqual(objective.trace?.semantic?.scope.group,"SECONDARY");
  assert.match(objective.text,/does not invoke the Domestic and Network/i);

  const ordinal=run("show me the second mission",state);
  assert.equal(ordinal.trace?.semantic?.quantity.value,2);
  assert.notEqual(ordinal.trace?.semantic?.scope.group,"SECONDARY");

  const predicate=run("is production secondary to military readiness",state);
  assert.equal(predicate.trace?.semantic?.operation,"CHALLENGE");
  assert.match(predicate.text,/related systems with separate state/i);
});

test("a complete campaign can be prosecuted through Ava text alone",()=>{
  let state=newState(90210),session=newSession(),resolutions=0;
  while(state.status==="active"&&resolutions<35){
    const docket=run("missions",state,session);
    const available=[...docket.text.matchAll(/\[([MDN]\d+)\].*AVAILABLE/g)].map(match=>match[1]);
    const handles=["M","D","N"].map(prefix=>available.find(handle=>handle.startsWith(prefix))).filter(Boolean).slice(0,state.actions);
    assert.ok(handles.length,`Day ${state.day} emitted no executable mission handles`);
    const staged=run(`stage ${handles.join(" ")}`,state,docket.session);
    const preflight=run("issue plan",state,staged.session);
    const issued=confirmPending(state,preflight.session);
    assert.equal(issued.executed,true,issued.rejection);
    state=issued.state;session=issued.session;

    const resolution=run("resolve day",state,session);
    const closed=confirmPending(state,resolution.session);
    assert.equal(closed.executed,true,closed.rejection);
    state=closed.state;session=closed.session;resolutions+=1;
  }
  assert.notEqual(state.status,"active","terminal-only campaign must reach a terminal result");
  assert.ok(resolutions>=1&&resolutions<=35);
  assert.equal(state.resolutionHistory.length,resolutions);
});
