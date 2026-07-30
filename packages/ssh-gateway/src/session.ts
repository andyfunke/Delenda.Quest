import { createHash, randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { initialState, restoreCampaignState, type GameState } from "../../../app/game";
import { createAvaNexusSession, runAvaNexusLine } from "../../../app/ava/nexus";
import type { PlayerContext } from "../../../app/substrate/contracts";
import {
  closeRemoteAudit,
  GatewayRequestError,
  loadRemoteCampaign,
  openRemoteAudit,
  readGatewayConfig,
  saveRemoteCampaign,
  type RemoteCampaignEnvelope,
} from "./remote-store";

const args=new Map<string,string>();
for(let index=2;index<process.argv.length-1;index+=2)if(process.argv[index]?.startsWith("--"))args.set(process.argv[index]!,process.argv[index+1]!);
const encodedPlayer=args.get("--player")??"",credentialId=(args.get("--credential")??"").replace(/[^a-zA-Z0-9._:-]/g,"");
let playerId="";
try{playerId=Buffer.from(encodedPlayer,"base64url").toString("utf8")}catch{}
if(!/^[^\s@]+@[^\s@]+$/.test(playerId)||!credentialId){
  process.stderr.write("AVA REMOTE COMMAND REJECTED // INVALID COMMAND IDENTITY\n");
  process.exit(1);
}

const config=await readGatewayConfig();
const sessionId=randomUUID();
const connection=process.env.SSH_CONNECTION??"unknown";
const remoteRiskHash=createHash("sha256").update(connection).digest("hex").slice(0,32);
await openRemoteAudit(config,{id:sessionId,playerId,credentialId,remoteRiskHash,clientVersion:process.env.SSH_CLIENT?.slice(0,120)});

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

let remote=await loadRemoteCampaign(config,playerId);
let envelope=remote.campaign??freshEnvelope();
let state:GameState|null=restoreCampaignState(envelope.state);
if(!state){
  envelope=freshEnvelope();
  state=restoreCampaignState(envelope.state);
}
if(!state)throw new Error("Ava could not initialize the campaign state.");
if(!remote.campaign){
  try{
    const saved=await saveRemoteCampaign(config,playerId,envelope);
    envelope=saved.campaign??envelope;
  }catch(error){
    if(!(error instanceof GatewayRequestError)||error.status!==409)throw error;
    remote=await loadRemoteCampaign(config,playerId);
    if(!remote.campaign)
      throw new Error("The concurrent campaign winner could not be reloaded.");
    envelope=remote.campaign;
    const winner=restoreCampaignState(envelope.state);
    if(!winner)
      throw new Error("The concurrent campaign winner is invalid.");
    state=winner;
  }
}

const interactive=!(process.env.SSH_ORIGINAL_COMMAND??"").trim();
let nexusSession=createAvaNexusSession(interactive,"campaign");
const write=(text:string)=>output.write(text.replace(/\r?\n/g,"\r\n"));
write(`DELENDA QUEST // AVA REMOTE COMMAND\nCOMMAND IDENTITY: ${playerId}\nDAY ${state.day} // ORDERS ${state.actions}/3\nNo host shell is present. Type HELP, BRIEF, MISSIONS, or WHAT SHOULD I DO.\n\n`);

const runLine=async(raw:string)=>{
  const line=raw.trim();
  if(!line)return true;
  if(/^(exit|quit|logout)$/i.test(line))return false;
  const beforeState=state!;
  const beforeSerialized=JSON.stringify(beforeState);
  const ctx:PlayerContext={
    playerId,campaignId:beforeState.campaignId,
    campaignRevision:`${beforeState.day}:${beforeState.actions}:${beforeState.contentPackVersion}`,
    surface:"ssh",authority:"command",nowMs:Date.now(),
  };
  const result=runAvaNexusLine(line,ctx,beforeState,nexusSession);
  const changed=JSON.stringify(result.state)!==beforeSerialized;
  if(changed){
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
      write(`FIELD NOTE / REJECTION\nREMOTE LEDGER UNAVAILABLE\n${error instanceof Error?error.message:"The command could not be persisted."}\nNo campaign state was changed.\n\n`);
      return true;
    }
  }else nexusSession=result.session;
  write(`${result.text}\n\n`);
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
  write(`AVA REMOTE COMMAND FAILED\n${error instanceof Error?error.message:"The session terminated unexpectedly."}\n`);
}finally{
  await closeRemoteAudit(config,{id:sessionId,commandsRead:nexusSession.commandsRead,consequentialAttempts:nexusSession.consequentialAttempts}).catch(()=>undefined);
}
process.exit(exitCode);
