import { desc, sql } from "drizzle-orm";
import { getDb } from "./index";
import { campaignOutcomes, telemetryCounters } from "./schema";

type CounterCategory="page_view"|"element_interaction"|"ava_command"|"module_dwell"|"module_switch";
type CounterEvent={type:"counter";category:CounterCategory;subject:string;context?:string;count?:number};
type CampaignOutcomeEvent={type:"campaign_outcome";campaignId:string;outcome:"victory"|"defeat";days:number;theater:string;archetype:string;adversary:string;decisions:Record<string,number>};
export type TelemetryEvent=CounterEvent|CampaignOutcomeEvent;

export type GlobalProductTelemetry={
  asOf:number;
  categoryTotals:Array<{category:string;count:number}>;
  outcomes:Array<{outcome:string;campaigns:number;averageDays:number}>;
  topSignals:Array<{category:string;subject:string;context:string;count:number}>;
};

const safe=(value:unknown,max=96)=>typeof value==="string"?value.toLowerCase().replace(/[^a-z0-9:._/-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,max):"";
const digest=async(value:string)=>{
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map(byte=>byte.toString(16).padStart(2,"0")).join("");
};

export async function recordTelemetry(events:TelemetryEvent[]){
  const db=await getDb(),now=Date.now();
  for(const event of events.slice(0,50)){
    if(event.type==="counter"){
      const category:CounterCategory=event.category;
      const subject=safe(event.subject),context=safe(event.context??"site");
      const count=Math.max(1,Math.min(100,Math.floor(event.count??1)));
      if(!subject)continue;
      const key=`${category}:${context}:${subject}`;
      await db.insert(telemetryCounters).values({key,category,subject,context,count,updatedAt:now}).onConflictDoUpdate({target:telemetryCounters.key,set:{count:sql`${telemetryCounters.count}+${count}`,updatedAt:now}});
      continue;
    }
    const campaignId=safe(event.campaignId,80),outcome=event.outcome;
    if(!campaignId||(outcome!=="victory"&&outcome!=="defeat"))continue;
    const decisions=Object.fromEntries(Object.entries(event.decisions??{}).slice(0,160).map(([key,value])=>[safe(key,120),Math.max(0,Math.min(100,Math.floor(Number(value)||0)))]).filter(([key])=>key));
    const id=await digest(`delenda.quest:${campaignId}`);
    await db.insert(campaignOutcomes).values({id,outcome,days:Math.max(1,Math.min(365,Math.floor(event.days))),theater:safe(event.theater,40),archetype:safe(event.archetype,60),adversary:safe(event.adversary,60),decisions:JSON.stringify(decisions),createdAt:now}).onConflictDoNothing();
  }
}

export async function globalProductTelemetry():Promise<GlobalProductTelemetry>{
  const db=await getDb();
  const[categoryRows,outcomeRows,topSignals]=await Promise.all([
    db.select({
      category:telemetryCounters.category,
      count:sql<number>`sum(${telemetryCounters.count})`,
    }).from(telemetryCounters).groupBy(telemetryCounters.category),
    db.select({
      outcome:campaignOutcomes.outcome,
      campaigns:sql<number>`count(*)`,
      averageDays:sql<number>`avg(${campaignOutcomes.days})`,
    }).from(campaignOutcomes).groupBy(campaignOutcomes.outcome),
    db.select({
      category:telemetryCounters.category,
      subject:telemetryCounters.subject,
      context:telemetryCounters.context,
      count:telemetryCounters.count,
    }).from(telemetryCounters).orderBy(desc(telemetryCounters.count)).limit(60),
  ]);
  return{
    asOf:Date.now(),
    categoryTotals:categoryRows.map(row=>({
      category:row.category,
      count:Number(row.count)||0,
    })).sort((left,right)=>right.count-left.count),
    outcomes:outcomeRows.map(row=>({
      outcome:row.outcome,
      campaigns:Number(row.campaigns)||0,
      averageDays:Math.round(Number(row.averageDays)||0),
    })).sort((left,right)=>right.campaigns-left.campaigns),
    topSignals:topSignals.map(row=>({...row,count:Number(row.count)||0})),
  };
}
