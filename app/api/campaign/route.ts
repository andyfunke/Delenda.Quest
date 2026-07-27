import { NextResponse } from "next/server";
import { activeCampaignFor, deleteActiveCampaign, saveActiveCampaign, type ActiveCampaignSubmission } from "../../../db/campaigns";
import { getAuthenticatedUser } from "../../auth";

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({error:"Sign in to load your campaign."},{status:401});
  return NextResponse.json(await activeCampaignFor(user),{headers:{"Cache-Control":"no-store"}});
}

export async function PUT(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({error:"Sign in to save your campaign."},{status:401});
  const length=Number(request.headers.get("content-length")??0);
  if(length>900_000)return NextResponse.json({error:"Campaign state is too large."},{status:413});
  try{return NextResponse.json(await saveActiveCampaign(user,await request.json() as ActiveCampaignSubmission),{headers:{"Cache-Control":"no-store"}});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Campaign could not be saved."},{status:400});}
}

export async function DELETE(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({error:"Sign in to remove your campaign."},{status:401});
  return NextResponse.json(await deleteActiveCampaign(user),{headers:{"Cache-Control":"no-store"}});
}
