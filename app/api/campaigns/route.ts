import { NextResponse } from "next/server";
import { campaignLibrary, removeCampaignPack, saveCampaignPack, type CampaignPackInput } from "../../../db/campaigns";
import { getChatGPTUser } from "../../chatgpt-auth";

const MAX_PAYLOAD_BYTES=1_500_000;
const SPINES=new Set(["campaign-identity","opening-state","daily-prompts","production","military","diplomacy","doctrine","resolution","wiki"]);

function portableCampaign(value:unknown):CampaignPackInput{
  if(!value||typeof value!=="object")throw new Error("Campaign payload must be an object.");
  const body=value as Record<string,unknown>;
  if(body.format!=="delenda.quest.campaign.v1")throw new Error("Unsupported campaign format.");
  if(typeof body.id!=="string"||!/^[a-zA-Z0-9._:-]{1,128}$/.test(body.id))throw new Error("Campaign id is invalid.");
  if(typeof body.title!=="string"||!body.title.trim()||body.title.length>160)throw new Error("Campaign title is required and must be 160 characters or fewer.");
  const access:"friends"|"private"=body.access==="friends"?"friends":"private";
  if(!Array.isArray(body.entries)||body.entries.length>2_000)throw new Error("Campaign entries are missing or exceed the 2,000-record limit.");
  for(const entry of body.entries){
    if(!entry||typeof entry!=="object")throw new Error("Campaign contains a malformed record.");
    const record=entry as Record<string,unknown>;
    if(typeof record.spineId!=="string"||!SPINES.has(record.spineId))throw new Error("Campaign contains a record outside the immutable spines.");
    const encodedRuleData=typeof record.ruleData==="string"?record.ruleData:"{}";
    record.ruleData=encodedRuleData;
    const ruleData=JSON.parse(encodedRuleData);
    if(!ruleData||typeof ruleData!=="object"||Array.isArray(ruleData))throw new Error("Every record rule_data value must be a JSON object.");
  }
  const normalized={...body,title:body.title.trim(),access,updatedAt:new Date().toISOString()};
  const payload=JSON.stringify(normalized);
  if(new TextEncoder().encode(payload).byteLength>MAX_PAYLOAD_BYTES)throw new Error("Campaign exceeds the 1.5 MB account-storage limit.");
  return{id:body.id,title:normalized.title as string,access,payload};
}

export async function GET(){
  const user=await getChatGPTUser();
  if(!user)return NextResponse.json({authenticated:false,campaigns:[]},{status:401});
  return NextResponse.json({authenticated:true,campaigns:await campaignLibrary(user)});
}

export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"Sign in before syncing a campaign."},{status:401});
  try{return NextResponse.json(await saveCampaignPack(user,portableCampaign(await request.json())));}catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Campaign sync failed."},{status:400});
  }
}

export async function DELETE(request:Request){
  const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"Sign in before deleting a campaign."},{status:401});
  const body=await request.json() as {id?:unknown};
  if(typeof body.id!=="string")return NextResponse.json({error:"Campaign id is required."},{status:400});
  return NextResponse.json(await removeCampaignPack(user,body.id));
}
