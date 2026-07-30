import { createHash, createHmac, randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";

const [fingerprint,algorithm,keyBlob]=process.argv.slice(2);
const authorityUrl=(process.env.SSH_AUTHORITY_URL??"").replace(/\/$/,"");
const secret=process.env.SSH_AUTHORITY_SECRET??"";
if(!authorityUrl||secret.length<32){
  process.stderr.write("DELENDA SSH authority is not configured.\n");
  process.exit(78);
}
const remote=(process.env.SSH_CONNECTION??"").split(/\s+/)[0]??"unknown";
const remoteRiskHash=createHash("sha256").update(`${process.env.SSH_REMOTE_RISK_SALT??secret}:${remote}`).digest("hex");
const clientVersion=(process.env.SSH_CLIENT_VERSION??process.env.TERM??"unknown").slice(0,128);
const interactive=!String(process.env.SSH_ORIGINAL_COMMAND??"").trim();
let terminal={interactive,width:Number(process.stdout.columns)||80,colorDepth:0,commandsRead:0,consequentialAttempts:0,discourse:{}};
let sessionId="";

async function call(action,payload={}){
  const requestId=randomUUID();
  const timestamp=String(Date.now());
  const body=JSON.stringify({action,...payload});
  const signature=createHmac("sha256",secret).update(`${timestamp}.${requestId}.${body}`).digest("hex");
  const response=await fetch(`${authorityUrl}/api/ssh/authority`,{method:"POST",headers:{"content-type":"application/json","x-delenda-ssh-timestamp":timestamp,"x-delenda-ssh-request-id":requestId,"x-delenda-ssh-signature":signature},body,signal:AbortSignal.timeout(15_000)});
  const result=await response.json().catch(()=>({ok:false,error:"invalid_authority_response"}));
  if(!response.ok||!result.ok)throw new Error(result.instruction??result.message??result.error??`authority_${response.status}`);
  return result;
}

async function execute(line){
  const result=await call("command",{sessionId,line,interactive,terminal});
  if(result.terminal)terminal=result.terminal;
  process.stdout.write(`${String(result.text??"").replace(/\r?\n/g,"\r\n")}\r\n`);
}

try{
  const opened=await call("open",{fingerprint,algorithm,keyBlob,interactive,width:terminal.width,remoteRiskHash,clientVersion});
  if(opened.status==="PAIRING_REQUIRED"){
    process.stdout.write(["DELENDA QUEST // COMMAND IDENTITY UNPAIRED","",`PAIRING CODE: ${opened.code}`,`AUTHORIZE: ${opened.pairUrl}`,"","Reconnect after authorization.\r\n"].join("\r\n"));
    process.exit(0);
  }
  if(opened.status==="NO_CAMPAIGN"){
    process.stdout.write(`${opened.message}\r\n`);
    process.exit(0);
  }
  if(opened.status!=="READY"||!opened.sessionId)throw new Error("authority_open_failed");
  sessionId=opened.sessionId;
  terminal=opened.terminal??terminal;
  if(!interactive){
    await execute(String(process.env.SSH_ORIGINAL_COMMAND??"").trim());
  }else{
    process.stdout.write(`${String(opened.banner??"DELENDA QUEST").replace(/\r?\n/g,"\r\n")} `);
    const rl=createInterface({input:process.stdin,output:process.stdout,terminal:true});
    while(true){
      const line=await rl.question(terminal.commandsRead?"DELENDA> ":"");
      const command=line.trim();
      if(!command)continue;
      if(/^(exit|quit|logout)$/i.test(command))break;
      await execute(command);
    }
    rl.close();
  }
}catch(error){
  process.stderr.write(`SSH SESSION FAILURE // ${error instanceof Error?error.message:"unknown"}\n`);
  process.exitCode=1;
}finally{
  if(sessionId){
    try{await call("close",{sessionId,interactive,terminal})}catch{}
  }
}
