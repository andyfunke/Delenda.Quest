import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { recordRotationItem, rotationIds } from "../../../../db/rotation";

export async function GET(){
  const user=await getChatGPTUser();
  if(!user)return NextResponse.json({authenticated:false,ids:[]},{status:401});
  return NextResponse.json({authenticated:true,ids:await rotationIds(user,"opportunity")},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request){
  const user=await getChatGPTUser();
  if(!user)return NextResponse.json({error:"Sign in to persist the opportunity ledger across devices."},{status:401});
  const payload=await request.json() as {itemId?:string;status?:string;campaignId?:string;day?:number};
  if(!payload.itemId||!payload.status)return NextResponse.json({error:"Opportunity item and status are required."},{status:400});
  const result=await recordRotationItem(user,{kind:"opportunity",itemId:payload.itemId,status:payload.status,context:JSON.stringify({campaignId:payload.campaignId??null,day:payload.day??null})});
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
}
