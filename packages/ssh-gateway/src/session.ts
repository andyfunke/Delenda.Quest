import { createHash, randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { initialState, restoreCampaignState, type GameState } from "../../../app/game";
import { createAvaNexusSession } from "../../../app/ava/nexus";
import {
  closeRemoteAudit,
  GatewayRequestError,
  loadRemoteCampaign,
  openRemoteAudit,
  readGatewayConfig,
  saveRemoteCampaign,
  type RemoteCampaignEnvelope,
} from "./remote-store";
import {
  executeNativeSshGatewayLine,
  publicNativeSshGatewayFailure,
  type NativeSshGatewayFailurePhase,
} from "./session-core";

const args=new Map<string,string>();
for(let index=2;index<process.argv.length-1;index+=2)if(process.argv[index]?.startsWith("--"))args.set(process.argv[index]!,process.argv[index+1]!);
const encodedPlayer=args.get("--player")??"",credentialId=(args.get("--credential")??"").replace(/[^a-zA-Z0-9._:-]/g,"");
let playerId="";
try{playerId=Buffer.from(encodedPlayer,"base64url").toString("utf8")}catch{}
if(!/^[^\s@]+@[^\s@]+$/.test(playerId)||!credentialId){
  process.stderr.write("AVA REMOTE COMMAND REJECTED // INVALID COMMAND IDENTITY\n");
  process.exit(1);
}

const abortSession=(error:unknown,phase:NativeSshGatewayFailurePhase):never=>{
  const failure=publicNativeSshGatewayFailure(error,phase);
  process.stderr.write(`AVA REMOTE COMMAND REJECTED // ${failure.code}\n${failure.message}\n`);
  process.exit(1);
};

const config=await readGatewayConfig().catch(error=>abortSession(error,"CONFIGURATION"));
const sessionId=randomUUID();
const connection=process.env.SSH_CONNECTION??"unknown";
const remoteRiskHash=createHash("sha256").update(connection).digest("hex").slice(0,32);
await openRemoteAudit(config,{id:sessionId,playerId,credentialId,remoteRiskHash,clientVersion:process.env.SSH_CLIENT?.slice(0,120)})
  .catch(error=>abortSession(error,"AUDIT"));

const seedFor=(value:string)=>{
  const digest=createHash("sha256").update(value).digest();
  return Math.max(1,digest.readUInt32BE(0));
};

const freshEnvelope=():RemoteCampaignEnvelope=>{
  const now=Date.now();
  return{
    state:initialState({seed:seedFor(playerId)}),
    clock:{start:now,end:now+86_400_000},
    runToken:randomUUID(),
    multiplayerRun:false,
    revision:0,
  };
};

let remote=await loadRemoteCampaign(config,playerId)
  .catch(error=>abortSession(error,"CAMPAIGN_LOAD"));
let envelope=remote.campaign??freshEnvelope();
let state:GameState|null=restoreCampaignState(envelope.state);
if(!state){
  envelope=freshEnvelope();
  state=restoreCampaignState(envelope.state);
}
if(!state)abortSession(null,"CAMPAIGN_INITIALIZATION");
if(!remote.campaign){
  try{
    const saved=await saveRemoteCampaign(config,playerId,envelope);
    envelope=saved.campaign??envelope;
  }catch(error){
    if(!(error instanceof GatewayRequestError)||error.status!==409)
      abortSession(error,"CAMPAIGN_INITIALIZATION");
    remote=await loadRemoteCampaign(config,playerId)
      .catch(loadError=>abortSession(loadError,"CAMPAIGN_LOAD"));
    const winnerEnvelope:RemoteCampaignEnvelope=remote.campaign??
      abortSession(null,"CAMPAIGN_INITIALIZATION");
    envelope=winnerEnvelope;
    const winner=restoreCampaignState(envelope.state);
    if(!winner)
      abortSession(null,"CAMPAIGN_INITIALIZATION");
    state=winner;
  }
}
const openedState:GameState=state??
  abortSession(null,"CAMPAIGN_INITIALIZATION");

const interactive=!(process.env.SSH_ORIGINAL_COMMAND??"").trim();
let nexusSession=createAvaNexusSession(interactive,"campaign");
const write=(text:string)=>output.write(text.replace(/\r?\n/g,"\r\n"));
write(`DELENDA QUEST // AVA REMOTE COMMAND\nCOMMAND IDENTITY: ${playerId}\nDAY ${openedState.day} // ORDERS ${openedState.actions}/3\nNo host shell is present. Type HELP, BRIEF, MISSIONS, or WHAT SHOULD I DO.\n\n`);

const runLine=async(raw:string)=>{
  const line=raw.trim();
  if(!line)return true;
  if(/^(exit|quit|logout)$/i.test(line))return false;
  const beforeState=state!;
  const result=executeNativeSshGatewayLine({
    raw:line,
    state:beforeState,
    session:nexusSession,
    playerId,
    nowMs:Date.now(),
  });
  if(result.changed){
    try{
      const nextEnvelope:RemoteCampaignEnvelope={
        state:result.state,
        clock:envelope.clock,
        runToken:envelope.runToken,
        multiplayerRun:envelope.multiplayerRun,
        revision:envelope.revision??0,
      };
      const saved=await saveRemoteCampaign(config,playerId,nextEnvelope);
      envelope=saved.campaign??nextEnvelope;
      state=result.state;
      nexusSession=result.session;
    }catch(error){
      if(error instanceof GatewayRequestError&&error.status===409){
        const winner=await loadRemoteCampaign(config,playerId).catch(()=>null);
        const restored=winner?.campaign
          ? restoreCampaignState(winner.campaign.state)
          : null;
        if(winner?.campaign&&restored){
          envelope=winner.campaign;
          state=restored;
          nexusSession=createAvaNexusSession(interactive,"campaign");
          write("FIELD NOTE / REJECTION\nCONCURRENT CAMPAIGN REVISION WON\nThe authoritative account campaign was reloaded. The rejected command changed no campaign state.\n\n");
          return true;
        }
      }
      const failure=publicNativeSshGatewayFailure(
        error,
        "CAMPAIGN_PERSISTENCE",
      );
      write(`FIELD NOTE / REJECTION\n${failure.code}\n${failure.message}\nNo campaign state was changed.\n\n`);
      return true;
    }
  }else nexusSession=result.session;
  write(`${result.publicResult.text}\n\n`);
  return true;
};

let exitCode=0;
try{
  const original=(process.env.SSH_ORIGINAL_COMMAND??"").trim();
  if(original)await runLine(original);
  else{
    const terminal=createInterface({input,output,terminal:true,historySize:100,removeHistoryDuplicates:true});
    while(true){
      const line=await terminal.question("AVA> ").catch(()=>"exit");
      if(!await runLine(line))break;
    }
    terminal.close();
  }
}catch(error){
  exitCode=1;
  const failure=publicNativeSshGatewayFailure(error,"SESSION");
  write(`AVA REMOTE COMMAND FAILED // ${failure.code}\n${failure.message}\n`);
}finally{
  await closeRemoteAudit(config,{id:sessionId,commandsRead:nexusSession.commandsRead,consequentialAttempts:nexusSession.consequentialAttempts}).catch(()=>undefined);
}
process.exit(exitCode);
