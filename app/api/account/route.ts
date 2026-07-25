import { NextResponse } from "next/server";
import { accountSnapshot, inviteFriend, removeFriendByAlias, updateAlias, updateAllowFriends, updateTimeZone } from "../../../db/accounts";
import { chatGPTSignInPath, getChatGPTUser } from "../../chatgpt-auth";
import { isAdmin } from "../../../db/admin";
import { accountTurnSnapshot } from "../../../db/turns";

export async function GET(){
  const user=await getChatGPTUser();
  if(!user)return NextResponse.json({authenticated:false,signIn:chatGPTSignInPath("/game?account=1")},{status:401});
  const account=await accountSnapshot(user);
  return NextResponse.json({authenticated:true,isAdmin:await isAdmin(user),...account,turn:await accountTurnSnapshot(user)});
}

export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"Sign in before inviting a friend."},{status:401});
  try{const body=await request.json() as {email?:string};return NextResponse.json(await inviteFriend(user,body.email??""));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Invite failed."},{status:400});}
}

export async function DELETE(request:Request){
  const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"Sign in before changing friends."},{status:401});
  const body=await request.json() as {alias?:string};await removeFriendByAlias(user,body.alias??"");return NextResponse.json({ok:true});
}

export async function PATCH(request:Request){
  const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"Sign in before changing account settings."},{status:401});
  const body=await request.json() as {allowFriends?:unknown;alias?:unknown;timeZone?:unknown};
  try{
    if(typeof body.alias==="string")return NextResponse.json(await updateAlias(user,body.alias));
    if(typeof body.timeZone==="string")return NextResponse.json(await updateTimeZone(user,body.timeZone));
    if(typeof body.allowFriends==="boolean")return NextResponse.json(await updateAllowFriends(user,body.allowFriends));
    return NextResponse.json({error:"No supported account setting was supplied."},{status:400});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Account setting failed."},{status:400});}
}
