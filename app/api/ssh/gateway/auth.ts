const encoder=new TextEncoder();

const constantTimeEqual=async(left:string,right:string)=>{
  const [a,b]=await Promise.all([
    crypto.subtle.digest("SHA-256",encoder.encode(left)),
    crypto.subtle.digest("SHA-256",encoder.encode(right)),
  ]);
  const x=new Uint8Array(a),y=new Uint8Array(b);
  let difference=x.length^y.length;
  for(let index=0;index<Math.max(x.length,y.length);index+=1)difference|=(x[index]??0)^(y[index]??0);
  return difference===0;
};

export async function authorizeGatewayRequest(request:Request){
  const authorization=request.headers.get("authorization")??"";
  const supplied=authorization.startsWith("Bearer ")?authorization.slice(7):"";
  const {env}=await import("cloudflare:workers");
  const expected=(env as unknown as Record<string,string|undefined>).DELENDA_SSH_GATEWAY_TOKEN??"";
  return Boolean(supplied&&expected&&await constantTimeEqual(supplied,expected));
}

export const gatewayUnauthorized=()=>Response.json({error:"SSH gateway authentication failed."},{status:401,headers:{"Cache-Control":"no-store"}});
