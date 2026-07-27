import { NextResponse } from "next/server";
import { createBugReport } from "../../../db/bug-reports";
import { getAuthenticatedUser } from "../../auth";

export async function POST(request:Request){
  if(!await getAuthenticatedUser())return NextResponse.json({error:"Sign in before sending a bug report."},{status:401});
  const length=Number(request.headers.get("content-length")??0);
  if(length>12_000)return NextResponse.json({error:"Bug report is too large."},{status:413});
  try{return NextResponse.json(await createBugReport(await request.json()));}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Bug report was not accepted."},{status:400});}
}
