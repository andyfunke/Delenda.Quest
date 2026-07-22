import { NextResponse } from "next/server";
import { publicCampaignRecord } from "../../../../db/campaign-records";

export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
  const{slug}=await params,record=await publicCampaignRecord(slug);
  return record?NextResponse.json(record):NextResponse.json({error:"Campaign Record not found."},{status:404});
}
