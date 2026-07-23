import { NextResponse } from "next/server";
import { globalProductTelemetry } from "../../../db/telemetry";

export async function GET(){
  return NextResponse.json(await globalProductTelemetry(),{
    headers:{"Cache-Control":"no-store"},
  });
}
