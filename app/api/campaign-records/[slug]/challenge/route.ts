import { NextResponse } from "next/server";
import { campaignChallenge } from "../../../../../db/campaign-records";

export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
  const{slug}=await params,challenge=await campaignChallenge(slug);
  return challenge?NextResponse.json(challenge):NextResponse.json({error:"Challenge not found."},{status:404});
}
