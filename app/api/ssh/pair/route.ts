import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../auth";
import { approvePairingChallenge, revokeSshCredential, sshCredentialsFor } from "../../../../db/ssh";

const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return json({error:"Sign in before managing SSH devices."},401);
  return json({credentials:await sshCredentialsFor(user)});
}

export async function POST(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return json({error:"Sign in before pairing an SSH device."},401);
  try{
    const body=await request.json() as {code?:unknown;label?:unknown};
    return json(await approvePairingChallenge(user,typeof body.code==="string"?body.code:"",typeof body.label==="string"?body.label:"SSH device"));
  }catch(error){return json({error:error instanceof Error?error.message:"SSH pairing failed."},400)}
}

export async function DELETE(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return json({error:"Sign in before revoking an SSH device."},401);
  try{
    const body=await request.json() as {id?:unknown};
    return json(await revokeSshCredential(user,typeof body.id==="string"?body.id:""));
  }catch(error){return json({error:error instanceof Error?error.message:"SSH revocation failed."},400)}
}
