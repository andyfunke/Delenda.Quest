import http from "node:http";

const port=Number(process.env.PORT??9080);
const token=process.env.GATEWAY_TOKEN??"";
const expectedKey=process.env.PUBLIC_KEY??"";
const [expectedAlgorithm,expectedKeyData]=expectedKey.trim().split(/\s+/);
let campaign=null;

const json=(response,status,payload)=>{
  const body=JSON.stringify(payload);
  response.writeHead(status,{"content-type":"application/json","content-length":Buffer.byteLength(body),"cache-control":"no-store"});
  response.end(body);
};

const server=http.createServer(async(request,response)=>{
  if(request.headers.authorization!==`Bearer ${token}`)return json(response,401,{error:"unauthorized"});
  const chunks=[];
  for await(const chunk of request)chunks.push(chunk);
  const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString("utf8")):{};
  const url=new URL(request.url,"http://gateway.test");

  if(url.pathname==="/api/ssh/gateway/authorize"&&request.method==="POST"){
    const authorized=body.algorithm===expectedAlgorithm&&body.keyData===expectedKeyData;
    return authorized
      ?json(response,200,{authorized:true,credentialId:"test-credential",playerId:"guest-test@gateway.invalid",label:"CI key",fingerprint:"SHA256:test"})
      :json(response,404,{authorized:false});
  }
  if(url.pathname==="/api/ssh/gateway/campaign"&&request.method==="GET")
    return json(response,200,{accountKey:url.searchParams.get("player"),campaign});
  if(url.pathname==="/api/ssh/gateway/campaign"&&request.method==="PUT"){
    campaign={...body.campaign,revision:(campaign?.revision??0)+1,updatedAt:Date.now()};
    return json(response,200,{accountKey:body.playerId,campaign});
  }
  if(url.pathname==="/api/ssh/gateway/audit"&&request.method==="POST")
    return json(response,200,body.event==="close"?{ok:true,id:body.id}:{id:body.id,connectedAt:Date.now()});
  return json(response,404,{error:"not found"});
});

server.listen(port,"0.0.0.0",()=>process.stdout.write(`READY ${port}\n`));
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>server.close(()=>process.exit(0)));
