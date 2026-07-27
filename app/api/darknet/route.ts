import { NextResponse } from "next/server";
import { globalProductTelemetry } from "../../../db/telemetry";
import { getAuthenticatedUser } from "../../auth";

export async function GET(){
  if(!await getAuthenticatedUser())return NextResponse.json({error:"Sign in before accessing campaign signals."},{status:401});
  return NextResponse.json(await globalProductTelemetry(),{
    headers:{"Cache-Control":"no-store"},
  });
}
