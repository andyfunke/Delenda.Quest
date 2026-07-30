import { activeCampaignForOwner, saveActiveCampaignForOwner, type ActiveCampaignSubmission } from "../../../../../db/campaigns";
import { authorizeGatewayRequest, gatewayUnauthorized } from "../auth";

const playerFromUrl=(request:Request)=>new URL(request.url).searchParams.get("player")??"";

export async function GET(request:Request){
  if(!await authorizeGatewayRequest(request))return gatewayUnauthorized();
  try{
    return Response.json(await activeCampaignForOwner(playerFromUrl(request)),{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Campaign could not be loaded."},{status:400,headers:{"Cache-Control":"no-store"}});
  }
}

export async function PUT(request:Request){
  if(!await authorizeGatewayRequest(request))return gatewayUnauthorized();
  const length=Number(request.headers.get("content-length")??0);
  if(length>900_000)return Response.json({error:"Campaign state is too large."},{status:413});
  try{
    const input=await request.json() as {playerId?:unknown;campaign?:ActiveCampaignSubmission};
    if(typeof input.playerId!=="string"||!input.campaign)throw new Error("Campaign gateway request is incomplete.");
    return Response.json(await saveActiveCampaignForOwner(input.playerId,input.campaign),{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Campaign could not be saved."},{status:400,headers:{"Cache-Control":"no-store"}});
  }
}
