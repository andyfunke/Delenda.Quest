import { NextResponse } from "next/server";
import { createCampaignRecord, serviceRecordFor, type CampaignRecordSubmission } from "../../../db/campaign-records";
import { getAuthenticatedUser } from "../../auth";

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({error:"Sign in to view the Service Record."},{status:401});
  return NextResponse.json(await serviceRecordFor(user));
}

export async function POST(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({error:"Sign in to issue a Campaign Record."},{status:401});
  const city=request.headers.get("cf-ipcity")??request.headers.get("x-vercel-ip-city")??"";
  const region=request.headers.get("cf-region")??request.headers.get("x-vercel-ip-country-region")??"";
  const country=request.headers.get("cf-ipcountry")??request.headers.get("x-vercel-ip-country")??"";
  const publicGeo=[city,region,country].filter(Boolean).join(", ")||"LOCATION UNAVAILABLE";
  try{return NextResponse.json(await createCampaignRecord(user,{...await request.json() as CampaignRecordSubmission,publicGeo}));}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Campaign record could not be issued."},{status:400});}
}
