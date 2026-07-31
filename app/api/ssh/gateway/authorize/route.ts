import { authorizeSshCredential } from "../../../../../db/ssh";
import { authorizeGatewayRequest, gatewayUnauthorized } from "../auth";

export async function POST(request:Request){
  if(!await authorizeGatewayRequest(request))return gatewayUnauthorized();
  const length=Number(request.headers.get("content-length")??0);
  if(length>32_000)return Response.json({error:"SSH authorization request is too large."},{status:413});
  try{
    const input=await request.json() as {algorithm?:unknown;keyData?:unknown};
    const credential=await authorizeSshCredential(input.algorithm,input.keyData);
    if(!credential)return Response.json({authorized:false},{status:404,headers:{"Cache-Control":"no-store"}});
    return Response.json({authorized:true,...credential},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"SSH authorization failed."},{status:400,headers:{"Cache-Control":"no-store"}});
  }
}
