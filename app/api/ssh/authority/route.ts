import { NextResponse } from "next/server";
import type { GameState } from "../../../game";
import { verifySshAuthorityRequest } from "../../../ssh-signature";
import { activeCampaignForOwner, saveCampaignStateForOwner } from "../../../../db/campaigns";
import { closeSshAudit, credentialForFingerprint, openSshAudit, sshAudit, startPairingChallenge, updateSshAudit } from "../../../../db/ssh";
import { bannerFor, createTerminalSession, runTerminalLine, type TerminalSessionState } from "../../../../packages/terminal-core/src/session";

export const runtime="edge";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const text=(value:unknown,max:number)=>typeof value==="string"?value.trim().slice(0,max):"";
const integer=(value:unknown,fallback:number)=>Number.isFinite(Number(value))?Math.trunc(Number(value)):fallback;

const terminalSession=(value:unknown,interactive:boolean):TerminalSessionState=>{
  const candidate=value&&typeof value==="object"&&!Array.isArray(value)?value as Partial<TerminalSessionState>:{};
  const discourse=candidate.discourse&&typeof candidate.discourse==="object"&&!Array.isArray(candidate.discourse)?candidate.discourse:{};
  return{
    discourse:{...discourse},
    interactive,
    width:Math.max(40,Math.min(240,integer(candidate.width,80))),
    colorDepth:Math.max(0,Math.min(24,integer(candidate.colorDepth,0))),
    commandsRead:Math.max(0,integer(candidate.commandsRead,0)),
    consequentialAttempts:Math.max(0,integer(candidate.consequentialAttempts,0)),
  };
};

async function secret(){
  const {env}=await import("cloudflare:workers");
  return text((env as Cloudflare.Env&{SSH_AUTHORITY_SECRET?:string}).SSH_AUTHORITY_SECRET,512);
}

export async function GET(){
  return json({ok:true,service:"delenda-ssh-authority",protocol:1});
}

export async function POST(request:Request){
  const body=await request.text();
  if(body.length>32_768)return json({ok:false,error:"request_too_large"},413);
  const authoritySecret=await secret();
  const timestamp=request.headers.get("x-delenda-ssh-timestamp")??"";
  const requestId=request.headers.get("x-delenda-ssh-request-id")??"";
  const signature=request.headers.get("x-delenda-ssh-signature")??"";
  if(!await verifySshAuthorityRequest({secret:authoritySecret,timestamp,requestId,body,signature}))return json({ok:false,error:"unauthorized"},401);
  let input:Record<string,unknown>;
  try{input=JSON.parse(body) as Record<string,unknown>;}catch{return json({ok:false,error:"invalid_json"},400)}
  try{
    const action=text(input.action,32);
    if(action==="open"){
      const fingerprint=text(input.fingerprint,128),algorithm=text(input.algorithm,80),keyBlob=text(input.keyBlob,16_384),interactive=input.interactive!==false;
      const credential=await credentialForFingerprint(fingerprint);
      if(!credential){
        const challenge=await startPairingChallenge({fingerprint,algorithm,publicKey:`${algorithm} ${keyBlob}`});
        return json({ok:true,status:"PAIRING_REQUIRED",code:challenge.code,expiresAt:challenge.expiresAt,pairUrl:`https://delenda.quest/game?account=1&ssh_pair=${encodeURIComponent(challenge.code)}`});
      }
      const campaign=await activeCampaignForOwner(credential.ownerEmail);
      if(!campaign)return json({ok:true,status:"NO_CAMPAIGN",message:"No active campaign is attached to this command identity. Open DELENDA.QUEST once to commission a campaign."});
      const audit=await openSshAudit({ownerEmail:credential.ownerEmail,credentialId:credential.id,remoteRiskHash:text(input.remoteRiskHash,128),clientVersion:text(input.clientVersion,128)});
      const state=campaign.state as GameState;
      return json({ok:true,status:"READY",sessionId:audit.id,banner:bannerFor(state),terminal:createTerminalSession(interactive,integer(input.width,80)),campaignRevision:campaign.revision});
    }
    if(action==="command"){
      const sessionId=text(input.sessionId,80),audit=await sshAudit(sessionId);
      if(!audit?.ownerEmail)return json({ok:false,error:"unknown_session"},404);
      const campaign=await activeCampaignForOwner(audit.ownerEmail);
      if(!campaign)return json({ok:false,error:"no_campaign"},409);
      const line=text(input.line,2048),interactive=input.interactive!==false;
      const terminal=terminalSession(input.terminal,interactive),state=campaign.state as GameState;
      const result=runTerminalLine(line,{playerId:audit.ownerEmail,campaignId:state.campaignId,campaignRevision:String(campaign.revision),surface:"ssh",authority:"command",nowMs:Date.now()},state,terminal);
      let revision=campaign.revision;
      if(JSON.stringify(result.state)!==JSON.stringify(state)){
        const nextRevision=await saveCampaignStateForOwner(audit.ownerEmail,result.state,campaign.revision);
        if(nextRevision===null)return json({ok:false,error:"campaign_revision_conflict",instruction:"Campaign changed on another surface. Repeat the command against the current state."},409);
        revision=nextRevision;
      }
      await updateSshAudit(sessionId,{commandsRead:result.session.commandsRead,consequentialAttempts:result.session.consequentialAttempts});
      return json({ok:true,status:result.response.status,text:result.text,terminal:result.session,campaignRevision:revision});
    }
    if(action==="close"){
      const sessionId=text(input.sessionId,80),terminal=terminalSession(input.terminal,input.interactive!==false);
      return json(await closeSshAudit(sessionId,{commandsRead:terminal.commandsRead,consequentialAttempts:terminal.consequentialAttempts}));
    }
    return json({ok:false,error:"unsupported_action"},400);
  }catch(error){
    return json({ok:false,error:"authority_failure",message:error instanceof Error?error.message:"SSH authority failed."},400);
  }
}
