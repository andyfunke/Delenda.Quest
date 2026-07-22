import { NextResponse } from "next/server";
import { createCampaignRecord, serviceRecordFor, type CampaignRecordSubmission } from "../../../db/campaign-records";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET(){
  const user=await getChatGPTUser();
  if(!user)return NextResponse.json({error:"Sign in to view the Service Record."},{status:401});
  return NextResponse.json(await serviceRecordFor(user));
}

export async function POST(request:Request){
  const user=await getChatGPTUser();
  if(!user)return NextResponse.json({error:"Sign in to issue a Campaign Record."},{status:401});
  try{return NextResponse.json(await createCampaignRecord(user,await request.json() as CampaignRecordSubmission));}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Campaign record could not be issued."},{status:400});}
}
