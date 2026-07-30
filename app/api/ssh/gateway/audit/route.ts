import { closeSshSessionAudit, openSshSessionAudit } from "../../../../../db/ssh";
import { authorizeGatewayRequest, gatewayUnauthorized } from "../auth";

export async function POST(request:Request){
  if(!await authorizeGatewayRequest(request))return gatewayUnauthorized();
  try{
    const input=await request.json() as {event?:unknown;id?:unknown;playerId?:unknown;credentialId?:unknown;remoteRiskHash?:unknown;clientVersion?:unknown;commandsRead?:unknown;consequentialAttempts?:unknown};
    const result=input.event==="close"
      ?await closeSshSessionAudit(input)
      :await openSshSessionAudit(input);
    return Response.json(result,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"SSH audit could not be recorded."},{status:400,headers:{"Cache-Control":"no-store"}});
  }
}
