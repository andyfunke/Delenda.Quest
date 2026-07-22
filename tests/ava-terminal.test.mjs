import assert from "node:assert/strict";
import test from "node:test";

const compiler=await import(process.env.DELENDA_AVA_BUNDLE);
const terminal=await import(process.env.DELENDA_AVA_TERMINAL_BUNDLE);
const runtime=await import(process.env.DELENDA_AVA_RUNTIME_BUNDLE);
const contextModule=await import(process.env.DELENDA_AVA_CONTEXT_BUNDLE);
const game=await import(process.env.DELENDA_AVA_GAME_BUNDLE);

const newState=(seed=1729)=>game.initialState({...game.DEFAULT_CAMPAIGN,seed});
const newSession=()=>terminal.initialAvaTerminalSession();

const compile=(raw,state,fraction=0,selected=null)=>{
  const result=compiler.compileAvaCommand(raw,{
    currentModule:"campaign",
    entities:contextModule.avaEntitiesForState(state,fraction),
    selected,
  });
  assert.equal(result.status,"compiled",`${raw}: ${JSON.stringify(result)}`);
  return result.instruction;
};

const run=(raw,state,session=newSession(),fraction=0)=>terminal.runAvaInstruction(
  state,
  session,
  compile(raw,state,fraction),
  fraction,
);

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

const firstAvailable=(state,kind,fraction=0,domain)=>{
  const descriptor=runtime.enumerateAvaActions(state,fraction).find(item=>
    item.kind===kind&&item.available&&(domain===undefined||item.domain===domain)
  );
  assert.ok(descriptor,`expected an available ${domain??kind} action`);
  return descriptor;
};

const missionPacket=(state)=>[
  firstAvailable(state,"maneuver",0,"main"),
  firstAvailable(state,"sub-mission",0,"domestic"),
  firstAvailable(state,"sub-mission",0,"network"),
];

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
  const state=newState();
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

test("a Main/Domestic/Network packet stages without mutating campaign state",()=>{
  const state=newState();
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
  const initial=newState();
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
  assert.match(losses.text,/CALCULATION/);
  assert.match(losses.text,/CUMULATIVE INTELLIGENCE/);
  assert.match(losses.text,/FRIENDLY COMBAT LOSS/);

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
    const state=newState(seed),status=game.opportunityStatusForFraction(state,0);
    if(!status.packet)continue;
    const fraction=(status.packet.opensAtFraction+status.packet.closesAtFraction)/2;
    if(game.opportunityStatusForFraction(state,fraction).status==="active")return{state,fraction,packet:status.packet};
  }
  assert.fail("no deterministic Day 1 opportunity found in seed sweep");
};

test("opportunity forecast discloses branches but never resolves or reveals the sealed branch",()=>{
  const{state,fraction,packet}=stateWithOpportunity();
  const descriptor=firstAvailable(state,"opportunity-response",fraction);
  const before=structuredClone(state);
  const forecast=run(`forecast ${descriptor.handle}`,state,newSession(),fraction);

  assert.deepEqual(forecast.state,before);
  assert.equal(forecast.executed,false);
  assert.equal(forecast.state.opportunityHistory.length,0);
  assert.match(forecast.text,/sealed ticket/i);
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
