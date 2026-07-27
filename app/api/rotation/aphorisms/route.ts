import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../auth";
import { recordRotationItem, rotationEntries } from "../../../../db/rotation";

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({authenticated:false,ids:[],accountKey:null},{status:401});
  const entries=await rotationEntries(user,"aphorism");
  return NextResponse.json({authenticated:true,ids:entries.map(entry=>entry.itemId),entries,accountKey:user.email},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({error:"Sign in to persist the aphorism ledger across devices."},{status:401});
  const payload=await request.json() as {itemId?:string;dayKey?:string};
  if(!payload.itemId)return NextResponse.json({error:"Aphorism item is required."},{status:400});
  return NextResponse.json(await recordRotationItem(user,{kind:"aphorism",itemId:payload.itemId,status:"displayed",context:payload.dayKey??""}),{headers:{"Cache-Control":"no-store"}});
}
