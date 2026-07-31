import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../auth";
import { addSshCredential, listSshCredentials, revokeSshCredential } from "../../../../db/ssh";

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({error:"Sign in to manage SSH keys."},{status:401});
  return NextResponse.json(await listSshCredentials(user),{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({error:"Sign in to register an SSH key."},{status:401});
  const length=Number(request.headers.get("content-length")??0);
  if(length>32_000)return NextResponse.json({error:"SSH key request is too large."},{status:413});
  try{
    const input=await request.json() as {label?:unknown;publicKey?:unknown};
    return NextResponse.json(await addSshCredential(user,input),{status:201,headers:{"Cache-Control":"no-store"}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"SSH key could not be registered."},{status:400});
  }
}

export async function DELETE(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({error:"Sign in to revoke an SSH key."},{status:401});
  try{
    const input=await request.json() as {id?:unknown};
    return NextResponse.json(await revokeSshCredential(user,input.id),{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"SSH key could not be revoked."},{status:400});
  }
}
