import { createHmac } from "node:crypto";
import { createServer } from "node:http";

const secret=process.env.SSH_AUTHORITY_SECRET??"";
const expectedFingerprint=process.env.EXPECTED_FINGERPRINT??"";
const port=Number(process.env.PORT??39091);
if(secret.length<32)throw new Error("SSH_AUTHORITY_SECRET must be at least 32 characters");

const reply=(response,status,body)=>{
  const payload=JSON.stringify(body);
  response.writeHead(status,{"content-type":"application/json","content-length":Buffer.byteLength(payload)});
  response.end(payload);
};
const valid=(request,body)=>{
  const timestamp=request.headers["x-delenda-ssh-timestamp"]??"";
  const requestId=request.headers["x-delenda-ssh-request-id"]??"";
  const signature=request.headers["x-delenda-ssh-signature"]??"";
  if(Math.abs(Date.now()-Number(timestamp))>60_000)return false;
  const expected=createHmac("sha256",secret).update(`${timestamp}.${requestId}.${body}`).digest("hex");
  return signature===expected;
};

createServer((request,response)=>{
  if(request.method==="GET"&&request.url==="/health")return reply(response,200,{ok:true});
  if(request.method!=="POST"||request.url!=="/api/ssh/authority")return reply(response,404,{ok:false,error:"not_found"});
  let body="";
  request.setEncoding("utf8");
  request.on("data",chunk=>{body+=chunk;if(body.length>40_000)request.destroy()});
  request.on("end",()=>{
    if(!valid(request,body))return reply(response,401,{ok:false,error:"unauthorized"});
    const input=JSON.parse(body);
    if(input.action==="open"){
      if(input.fingerprint!==expectedFingerprint)return reply(response,200,{ok:true,status:"PAIRING_REQUIRED",code:"PAIRTEST",expiresAt:Date.now()+600_000,pairUrl:"https://delenda.quest/game?account=1&ssh_pair=PAIRTEST"});
      return reply(response,200,{ok:true,status:"READY",sessionId:"mock-session",banner:"DELENDA QUEST\nDAY 1 · TEST-CAMPAIGN\nORDERS 0/3\n\nType `brief`, `orders`, or `help`.\nDELENDA>",terminal:{interactive:input.interactive!==false,width:80,colorDepth:0,commandsRead:0,consequentialAttempts:0,discourse:{}}});
    }
    if(input.action==="command"){
      const terminal={...(input.terminal??{}),commandsRead:Number(input.terminal?.commandsRead??0)+1};
      const line=String(input.line??"");
      return reply(response,200,{ok:true,status:"OK",text:`STATUS=OK\n\nMOCK COMMAND: ${line}`,terminal,campaignRevision:1});
    }
    if(input.action==="close")return reply(response,200,{ok:true});
    return reply(response,400,{ok:false,error:"unsupported_action"});
  });
}).listen(port,"127.0.0.1",()=>process.stdout.write(`mock authority ${port}\n`));
