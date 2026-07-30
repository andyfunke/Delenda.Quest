import { readFile } from "node:fs/promises";

export type GatewayConfig={apiBase:string;token:string};
export type RemoteCampaignEnvelope={
  state:unknown;
  clock:{start:number;end:number};
  runToken:string;
  multiplayerRun:boolean;
  revision?:number;
  updatedAt?:number;
};

type CampaignResponse={accountKey:string;campaign:RemoteCampaignEnvelope|null};

export async function readGatewayConfig(path=process.env.DELENDA_SSH_CONFIG??"/etc/delenda-gateway/config.json"):Promise<GatewayConfig>{
  const parsed=JSON.parse(await readFile(path,"utf8")) as Partial<GatewayConfig>;
  const apiBase=typeof parsed.apiBase==="string"?parsed.apiBase.replace(/\/+$/g,""):"";
  const token=typeof parsed.token==="string"?parsed.token:"";
  if(!/^https:\/\//.test(apiBase)||token.length<32)throw new Error("SSH gateway configuration is incomplete.");
  return{apiBase,token};
}

const request=async<T>(config:GatewayConfig,path:string,init:RequestInit={}):Promise<T>=>{
  const response=await fetch(`${config.apiBase}${path}`,{
    ...init,
    headers:{authorization:`Bearer ${config.token}`,"content-type":"application/json",...(init.headers??{})},
    signal:AbortSignal.timeout(12_000),
  });
  const payload=await response.json().catch(()=>({})) as T&{error?:string};
  if(!response.ok)throw new Error(payload.error??`Gateway API failed with ${response.status}.`);
  return payload;
};

export const authorizeRemoteKey=(config:GatewayConfig,algorithm:string,keyData:string)=>
  request<{authorized:true;credentialId:string;playerId:string;label:string;fingerprint:string}>(config,"/api/ssh/gateway/authorize",{
    method:"POST",body:JSON.stringify({algorithm,keyData}),
  });

export const loadRemoteCampaign=(config:GatewayConfig,playerId:string)=>
  request<CampaignResponse>(config,`/api/ssh/gateway/campaign?player=${encodeURIComponent(playerId)}`,{method:"GET"});

export const saveRemoteCampaign=(config:GatewayConfig,playerId:string,campaign:RemoteCampaignEnvelope)=>
  request<CampaignResponse>(config,"/api/ssh/gateway/campaign",{
    method:"PUT",body:JSON.stringify({playerId,campaign}),
  });

export const openRemoteAudit=(config:GatewayConfig,input:{id:string;playerId:string;credentialId:string;remoteRiskHash?:string;clientVersion?:string})=>
  request<{id:string;connectedAt:number}>(config,"/api/ssh/gateway/audit",{
    method:"POST",body:JSON.stringify({event:"open",...input}),
  });

export const closeRemoteAudit=(config:GatewayConfig,input:{id:string;commandsRead:number;consequentialAttempts:number})=>
  request<{ok:true;id:string}>(config,"/api/ssh/gateway/audit",{
    method:"POST",body:JSON.stringify({event:"close",...input}),
  });
