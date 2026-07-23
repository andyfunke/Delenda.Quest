import { NextResponse } from "next/server";
import { createBugReport } from "../../../db/bug-reports";

export async function POST(request:Request){
  const length=Number(request.headers.get("content-length")??0);
  if(length>12_000)return NextResponse.json({error:"Bug report is too large."},{status:413});
  try{return NextResponse.json(await createBugReport(await request.json()));}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Bug report was not accepted."},{status:400});}
}
