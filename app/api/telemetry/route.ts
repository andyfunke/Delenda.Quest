import { NextResponse } from "next/server";
import { recordTelemetry, type TelemetryEvent } from "../../../db/telemetry";

export async function POST(request:Request){
  const contentLength=Number(request.headers.get("content-length")??0);
  if(contentLength>48_000)return NextResponse.json({error:"Telemetry packet exceeds the accepted field size."},{status:413});
  try{
    const payload=await request.json() as {events?:TelemetryEvent[]};
    if(!Array.isArray(payload.events))return NextResponse.json({error:"Telemetry events are required."},{status:400});
    await recordTelemetry(payload.events);
    return new NextResponse(null,{status:204,headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({error:"Telemetry packet was not accepted."},{status:400});
  }
}
