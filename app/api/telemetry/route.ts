import { NextResponse } from "next/server";
import { recordTelemetry, type TelemetryEvent } from "../../../db/telemetry";
import { telemetryAllowed } from "../../../db/accounts";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function POST(request:Request){
  const contentLength=Number(request.headers.get("content-length")??0);
  if(contentLength>48_000)return NextResponse.json({error:"Telemetry packet exceeds the accepted field size."},{status:413});
  try{
    const user=await getChatGPTUser();
    if(!user)return NextResponse.json({error:"Sign in before recording campaign telemetry."},{status:401});
    if(!await telemetryAllowed(user))return new NextResponse(null,{status:204});
    const payload=await request.json() as {events?:TelemetryEvent[]};
    if(!Array.isArray(payload.events))return NextResponse.json({error:"Telemetry events are required."},{status:400});
    await recordTelemetry(payload.events);
    return new NextResponse(null,{status:204,headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({error:"Telemetry packet was not accepted."},{status:400});
  }
}
