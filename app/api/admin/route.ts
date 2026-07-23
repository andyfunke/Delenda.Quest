import { NextResponse } from "next/server";
import { adminSnapshot, updateBugStatus, updatePlayerSupport } from "../../../db/admin";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET(){
  const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"Sign in."},{status:401});
  try{return NextResponse.json(await adminSnapshot(user));}catch{return NextResponse.json({error:"Administrator access required."},{status:403});}
}
export async function PATCH(request:Request){
  const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"Sign in."},{status:401});
  try{
    const body=await request.json() as {kind?:string;alias?:string;field?:string;value?:boolean;id?:string;status?:"open"|"reviewed"|"closed"};
    if(body.kind==="bug"&&body.id&&body.status)return NextResponse.json(await updateBugStatus(user,body.id,body.status));
    if(body.alias&&body.field&&typeof body.value==="boolean")return NextResponse.json(await updatePlayerSupport(user,{alias:body.alias,field:body.field,value:body.value}));
    return NextResponse.json({error:"No supported override supplied."},{status:400});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Override failed."},{status:400});}
}
