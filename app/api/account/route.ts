import { NextResponse } from "next/server";
import { accountSnapshot, inviteFriend, removeFriend, updateAllowFriends } from "../../../db/accounts";
import { chatGPTSignInPath, getChatGPTUser } from "../../chatgpt-auth";

export async function GET(){
  const user=await getChatGPTUser();
  if(!user)return NextResponse.json({authenticated:false,signIn:chatGPTSignInPath("/?account=1")},{status:401});
  return NextResponse.json({authenticated:true,...await accountSnapshot(user)});
}

export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"Sign in before inviting a friend."},{status:401});
  try{const body=await request.json() as {email?:string};return NextResponse.json(await inviteFriend(user,body.email??""));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Invite failed."},{status:400});}
}

export async function DELETE(request:Request){
  const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"Sign in before changing friends."},{status:401});
  const body=await request.json() as {email?:string};await removeFriend(user,body.email??"");return NextResponse.json({ok:true});
}

export async function PATCH(request:Request){
  const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"Sign in before changing account settings."},{status:401});
  const body=await request.json() as {allowFriends?:unknown};
  if(typeof body.allowFriends!=="boolean")return NextResponse.json({error:"allowFriends must be a boolean."},{status:400});
  return NextResponse.json(await updateAllowFriends(user,body.allowFriends));
}
