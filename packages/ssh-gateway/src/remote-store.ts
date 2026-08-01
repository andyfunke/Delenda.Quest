import { readFile } from "node:fs/promises";
import { request as httpsRequest } from "node:https";

export type GatewayConfig={apiBase:string;token:string;caPem?:string};
export type RemoteCampaignEnvelope={
  state:unknown;
  clock:{start:number;end:number};
  runToken:string;
  multiplayerRun:boolean;
  revision?:number;
  expectedRevision?:number;
  updatedAt?:number;
};

type CampaignResponse={accountKey:string;campaign:RemoteCampaignEnvelope|null};
type GatewayRequestInit={method?:"GET"|"POST"|"PUT";body?:string};

export class GatewayRequestError extends Error{
  constructor(
    message:string,
    readonly status:number,
    readonly payload:unknown,
  ){
    super(message);
    this.name="GatewayRequestError";
  }
}

export async function readGatewayConfig(path=process.env.DELENDA_SSH_CONFIG??"/etc/delenda-gateway/config.json"):Promise<GatewayConfig>{
  const parsed=JSON.parse(await readFile(path,"utf8")) as Partial<GatewayConfig>;
  const apiBase=typeof parsed.apiBase==="string"?parsed.apiBase.replace(/\/+$/g,""):"";
  const token=typeof parsed.token==="string"?parsed.token:"";
  const caPem=typeof parsed.caPem==="string"&&parsed.caPem.includes("BEGIN CERTIFICATE")?parsed.caPem:undefined;
  if(!/^https:\/\//.test(apiBase)||token.length<32)throw new Error("SSH gateway configuration is incomplete.");
  return{apiBase,token,caPem};
}

const request=async<T>(config:GatewayConfig,path:string,init:GatewayRequestInit={}):Promise<T>=>{
  const target=new URL(path,`${config.apiBase}/`);
  const body=init.body??"";
  return new Promise<T>((resolve,reject)=>{
    const operation=httpsRequest(target,{
      method:init.method??"GET",
      headers:{
        authorization:`Bearer ${config.token}`,
        accept:"application/json",
        ...(body?{"content-type":"application/json","content-length":Buffer.byteLength(body)}:{}),
      },
      ca:config.caPem,
      rejectUnauthorized:true,
      timeout:12_000,
    },response=>{
      const chunks:Buffer[]=[];
      let size=0;
      response.on("data",chunk=>{
        const bytes=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
        size+=bytes.length;
        if(size>2_000_000){operation.destroy(new Error("Gateway API response exceeded the safety limit."));return;}
        chunks.push(bytes);
      });
      response.on("end",()=>{
        try{
          const text=Buffer.concat(chunks).toString("utf8");
          const payload=(text?JSON.parse(text):{}) as T&{error?:string};
          if((response.statusCode??500)<200||(response.statusCode??500)>=300)
            reject(
              new GatewayRequestError(
                payload.error??`Gateway API failed with ${response.statusCode}.`,
                response.statusCode??500,
                payload,
              ),
            );
          else resolve(payload);
        }catch(error){reject(error)}
      });
    });
    operation.on("timeout",()=>operation.destroy(new Error("Gateway API request timed out.")));
    operation.on("error",reject);
    if(body)operation.write(body);
    operation.end();
  });
};

export const authorizeRemoteKey=(config:GatewayConfig,algorithm:string,keyData:string)=>
  request<{authorized:true;credentialId:string;playerId:string;label:string;fingerprint:string}>(config,"/api/ssh/gateway/authorize",{
    method:"POST",body:JSON.stringify({algorithm,keyData}),
  });

export const loadRemoteCampaign=(config:GatewayConfig,playerId:string)=>
  request<CampaignResponse>(config,`/api/ssh/gateway/campaign?player=${encodeURIComponent(playerId)}`,{method:"GET"});

export const saveRemoteCampaign=(config:GatewayConfig,playerId:string,campaign:RemoteCampaignEnvelope)=>
  request<CampaignResponse>(config,"/api/ssh/gateway/campaign",{
    method:"PUT",
    body:JSON.stringify({
      playerId,
      campaign:{
        ...campaign,
        expectedRevision:Number.isInteger(campaign.revision)
          ? campaign.revision
          : Number.isInteger(campaign.expectedRevision)
            ? campaign.expectedRevision
            : 0,
      },
    }),
  });

export const openRemoteAudit=(config:GatewayConfig,input:{id:string;playerId:string;credentialId:string;remoteRiskHash?:string;clientVersion?:string})=>
  request<{id:string;connectedAt:number}>(config,"/api/ssh/gateway/audit",{
    method:"POST",body:JSON.stringify({event:"open",...input}),
  });

export const closeRemoteAudit=(config:GatewayConfig,input:{id:string;commandsRead:number;consequentialAttempts:number})=>
  request<{ok:true;id:string}>(config,"/api/ssh/gateway/audit",{
    method:"POST",body:JSON.stringify({event:"close",...input}),
  });

export const queryRemoteArchive=(config:GatewayConfig,input:{operation:string;query:string})=>
  request<{text:string;source:string}>(
    config,
    `/api/archive/loc?operation=${encodeURIComponent(input.operation)}&query=${encodeURIComponent(input.query)}`,
    {method:"GET"},
  );
