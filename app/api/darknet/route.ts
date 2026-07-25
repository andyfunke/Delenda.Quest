import { NextResponse } from "next/server";
import { globalProductTelemetry } from "../../../db/telemetry";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET(){
  if(!await getChatGPTUser())return NextResponse.json({error:"Sign in before accessing campaign signals."},{status:401});
  return NextResponse.json(await globalProductTelemetry(),{
    headers:{"Cache-Control":"no-store"},
  });
}
