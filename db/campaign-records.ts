import { and, desc, eq, or } from "drizzle-orm";
import type { ChatGPTUser } from "../app/chatgpt-auth";
import { getDb } from "./index";
import { campaignRecords, friendships, users } from "./schema";
import { ensureAccount } from "./accounts";
import {
  calculateCampaignScore,
  SCORE_FORMULA,
  type CampaignScoreBreakdown,
} from "../app/campaign-balance";

export const SCORING_VERSION="dq-score-v2";
export const FRIEND_BONUS_PER_CONNECTION=5;
export const FRIEND_BONUS_CAP=10;

export type RecordedDecision={
  decisionId:string;
  decisionLabel:string;
  choiceId:string;
  choiceLabel:string;
};

export type CampaignRecordSubmission={
  submissionId:string;
  campaignId:string;
  campaignSeed:number;
  theater:string;
  archetype:string;
  adversary:string;
  contentVersion:string;
  outcome:"victory"|"defeat"|"abandoned";
  days:number;
  deployable:number;
  openingDeployable:number;
  front:number;
  legitimacy:number;
  resistance:number;
  readiness:number;
  decisions:RecordedDecision[];
  completedAt:number;
  publicGeo?:string;
  multiplayer?:boolean;
  productionMin?:number;productionMax?:number;sufferedMin?:number;sufferedMax?:number;inflictedMin?:number;inflictedMax?:number;
};

type StoredRecord=typeof campaignRecords.$inferSelect;

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const clean=(value:unknown,max=100)=>typeof value==="string"?value.trim().replace(/[^a-zA-Z0-9 .:_/-]+/g,"").slice(0,max):"";
const cleanId=(value:unknown,max=100)=>clean(value,max).toLowerCase().replace(/[^a-z0-9:_/-]+/g,"-").replace(/^-+|-+$/g,"");
const number=(value:unknown,min:number,max:number)=>clamp(Number.isFinite(Number(value))?Number(value):min,min,max);
const token=()=>crypto.randomUUID().replaceAll("-","").slice(0,12).toUpperCase();
const digest=async(value:string)=>{
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map(byte=>byte.toString(16).padStart(2,"0")).join("");
};

const parseDecisions=(value:string):RecordedDecision[]=>{
  try{
    const rows=JSON.parse(value) as unknown;
    if(!Array.isArray(rows))return[];
    return rows.filter((row):row is RecordedDecision=>!!row&&typeof row==="object"&&typeof (row as RecordedDecision).decisionId==="string"&&typeof (row as RecordedDecision).choiceId==="string");
  }catch{return[]}
};
const parseScoreBreakdown=(value:string,campaignScore:number,days:number):CampaignScoreBreakdown=>{
  try{
    const parsed=JSON.parse(value) as Partial<CampaignScoreBreakdown>;
    if(typeof parsed.completion==="number"&&typeof parsed.production==="number"&&typeof parsed.casualtyControl==="number"&&typeof parsed.inflictedLosses==="number"&&typeof parsed.earlyVictory==="number")return{completion:parsed.completion,production:parsed.production,casualtyControl:parsed.casualtyControl,inflictedLosses:parsed.inflictedLosses,earlyVictory:parsed.earlyVictory,total:campaignScore,days,formula:SCORE_FORMULA};
  }catch{}
  return{completion:campaignScore,production:0,casualtyControl:0,inflictedLosses:0,earlyVictory:0,total:campaignScore,days,formula:"Legacy score issued before component persistence."};
};

const campaignKeyFor=(input:CampaignRecordSubmission)=>[cleanId(input.contentVersion,30),Math.trunc(number(input.campaignSeed,1,2_147_483_647)),cleanId(input.theater,30),cleanId(input.archetype,50),cleanId(input.adversary,50)].join(":");

const scoresFor=(input:CampaignRecordSubmission,friendCount:number)=>{
  const preservation=clamp(input.deployable/Math.max(1,input.openingDeployable),0,1);
  const breakdown=calculateCampaignScore({outcome:input.outcome,days:number(input.days,1,365),productionMin:number(input.productionMin,-100_000,1_000_000),productionMax:number(input.productionMax,-100_000,1_000_000),sufferedMin:number(input.sufferedMin,0,1_000_000),sufferedMax:number(input.sufferedMax,0,1_000_000),inflictedMin:number(input.inflictedMin,0,1_000_000),inflictedMax:number(input.inflictedMax,0,1_000_000)});
  const campaignScore=breakdown.total;
  const baseUberscore=Math.round(campaignScore/10);
  const friendMultiplier=100+Math.min(FRIEND_BONUS_CAP,friendCount)*FRIEND_BONUS_PER_CONNECTION;
  const multiplayerMultiplier=input.multiplayer?125:100;
  const uberscoreEarned=Math.round(baseUberscore*friendMultiplier/100*multiplayerMultiplier/100);
  return{campaignScore,baseUberscore,friendMultiplier,uberscoreEarned,forcePreserved:Math.round(preservation*1000),breakdown};
};

const friendCountFor=async(email:string)=>{
  const db=await getDb();
  const rows=await db.select({id:friendships.id}).from(friendships).where(or(eq(friendships.userA,email),eq(friendships.userB,email)));
  return rows.length;
};

const sanitizeSubmission=(input:CampaignRecordSubmission):CampaignRecordSubmission=>({
  submissionId:cleanId(input.submissionId,100),campaignId:clean(input.campaignId,100),campaignSeed:Math.trunc(number(input.campaignSeed,1,2_147_483_647)),
  theater:cleanId(input.theater,30),archetype:cleanId(input.archetype,50),adversary:cleanId(input.adversary,50),contentVersion:cleanId(input.contentVersion,30),
  outcome:input.outcome==="victory"?"victory":input.outcome==="abandoned"?"abandoned":"defeat",days:Math.trunc(number(input.days,1,365)),deployable:Math.round(number(input.deployable,0,10_000_000)),openingDeployable:Math.round(number(input.openingDeployable,1,10_000_000)),
  front:number(input.front,-100,100),legitimacy:number(input.legitimacy,0,100),resistance:number(input.resistance,0,100),readiness:number(input.readiness,0,100),completedAt:Math.trunc(number(input.completedAt,1,Date.now()+86_400_000)),
  decisions:(Array.isArray(input.decisions)?input.decisions:[]).slice(0,240).map(row=>({decisionId:cleanId(row.decisionId,100),decisionLabel:clean(row.decisionLabel,120),choiceId:cleanId(row.choiceId,100),choiceLabel:clean(row.choiceLabel,120)})).filter(row=>row.decisionId&&row.choiceId),
  multiplayer:!!input.multiplayer,productionMin:number(input.productionMin,-100_000,1_000_000),productionMax:number(input.productionMax,-100_000,1_000_000),sufferedMin:number(input.sufferedMin,0,1_000_000),sufferedMax:number(input.sufferedMax,0,1_000_000),inflictedMin:number(input.inflictedMin,0,1_000_000),inflictedMax:number(input.inflictedMax,0,1_000_000),
  publicGeo:clean(input.publicGeo,120)||"LOCATION UNAVAILABLE",
});

export async function createCampaignRecord(user:ChatGPTUser,raw:CampaignRecordSubmission){
  const db=await getDb(),email=await ensureAccount(user),input=sanitizeSubmission(raw);
  const access=(await db.select({accountEnabled:users.accountEnabled}).from(users).where(eq(users.email,email)).limit(1))[0];
  if(!access?.accountEnabled)throw new Error("Account record services are disabled.");
  if(!input.submissionId||!input.campaignId||!input.theater||!input.contentVersion)throw new Error("Campaign record is incomplete.");
  const id=await digest(`delenda:record:${email}:${input.submissionId}`);
  const existing=(await db.select().from(campaignRecords).where(eq(campaignRecords.id,id)).limit(1))[0];
  if(existing)return decorateRecord(existing,await cohortFor(existing));
  const account=(await db.select({alias:users.alias}).from(users).where(eq(users.email,email)).limit(1))[0];
  const friendCount=await friendCountFor(email),computed=scoresFor(input,friendCount),publicSlug=token(),campaignKey=campaignKeyFor(input),pseudonym=account?.alias??"UnknownCommander";
  const{breakdown,...scores}=computed;
  await db.insert(campaignRecords).values({id,ownerEmail:email,publicSlug,pseudonym,campaignKey,campaignId:input.campaignId,campaignSeed:input.campaignSeed,theater:input.theater,archetype:input.archetype,adversary:input.adversary,contentVersion:input.contentVersion,scoringVersion:SCORING_VERSION,outcome:input.outcome,days:input.days,...scores,scoreBreakdown:JSON.stringify(breakdown),friendCount,frontMillimeters:Math.round(input.front*1000),publicGeo:input.publicGeo??"LOCATION UNAVAILABLE",decisions:JSON.stringify(input.decisions),completedAt:input.completedAt}).onConflictDoNothing();
  const record=(await db.select().from(campaignRecords).where(eq(campaignRecords.id,id)).limit(1))[0];
  if(!record)throw new Error("Campaign record could not be issued.");
  return decorateRecord(record,await cohortFor(record));
}

async function cohortFor(record:StoredRecord){
  const db=await getDb();
  const cohort=await db.select().from(campaignRecords).where(and(eq(campaignRecords.campaignKey,record.campaignKey),eq(campaignRecords.scoringVersion,record.scoringVersion)));
  return cohort;
}

const decisionComparisons=(record:StoredRecord,cohort:StoredRecord[])=>{
  const own=parseDecisions(record.decisions);
  return own.map(decision=>{
    const choices=new Map<string,{choiceId:string;choiceLabel:string;count:number}>();let encountered=0;
    for(const candidate of cohort){
      const match=parseDecisions(candidate.decisions).find(row=>row.decisionId===decision.decisionId);
      if(!match)continue;encountered++;
      const current=choices.get(match.choiceId)??{choiceId:match.choiceId,choiceLabel:match.choiceLabel,count:0};current.count++;choices.set(match.choiceId,current);
    }
    return{...decision,encountered,choices:[...choices.values()].sort((a,b)=>b.count-a.count).map(choice=>({...choice,percent:encountered?Math.round(choice.count/encountered*100):0}))};
  });
};

const decorateRecord=(record:StoredRecord,cohort:StoredRecord[])=>({
  id:record.id,publicSlug:record.publicSlug,pseudonym:record.pseudonym,campaignId:record.campaignId,campaignKey:record.campaignKey,campaignSeed:record.campaignSeed,theater:record.theater,archetype:record.archetype,adversary:record.adversary,contentVersion:record.contentVersion,scoringVersion:record.scoringVersion,outcome:record.outcome,days:record.days,campaignScore:record.campaignScore,scoreBreakdown:parseScoreBreakdown(record.scoreBreakdown,record.campaignScore,record.days),baseUberscore:record.baseUberscore,friendCount:record.friendCount,friendMultiplier:record.friendMultiplier/100,uberscoreEarned:record.uberscoreEarned,forcePreserved:record.forcePreserved/10,front:record.frontMillimeters/1000,publicGeo:record.publicGeo,completedAt:record.completedAt,
  campaignRank:1+cohort.filter(item=>item.campaignScore>record.campaignScore).length,cohortSize:cohort.length,decisionComparisons:decisionComparisons(record,cohort),
});

async function globalStandings(){
  const db=await getDb(),rows=await db.select({ownerEmail:campaignRecords.ownerEmail,uberscoreEarned:campaignRecords.uberscoreEarned}).from(campaignRecords);
  const totals=new Map<string,number>();for(const row of rows)totals.set(row.ownerEmail,(totals.get(row.ownerEmail)??0)+row.uberscoreEarned);
  return[...totals.entries()].sort((a,b)=>b[1]-a[1]);
}

export async function serviceRecordFor(user:ChatGPTUser){
  const db=await getDb(),email=await ensureAccount(user),rows=await db.select().from(campaignRecords).where(eq(campaignRecords.ownerEmail,email)).orderBy(desc(campaignRecords.completedAt));
  const standings=await globalStandings(),uberscore=rows.reduce((sum,row)=>sum+row.uberscoreEarned,0),globalRank=Math.max(1,standings.findIndex(([owner])=>owner===email)+1),decorated=[];
  for(const row of rows)decorated.push(decorateRecord(row,await cohortFor(row)));
  return{uberscore,globalRank,commanderCount:standings.length,records:decorated};
}

export async function publicCampaignRecord(slug:string){
  const db=await getDb(),record=(await db.select().from(campaignRecords).where(eq(campaignRecords.publicSlug,clean(slug,30))).limit(1))[0];
  if(!record)return null;
  const cohort=await cohortFor(record),standings=await globalStandings(),ownerRows=await db.select({uberscoreEarned:campaignRecords.uberscoreEarned}).from(campaignRecords).where(eq(campaignRecords.ownerEmail,record.ownerEmail)),uberscore=ownerRows.reduce((sum,row)=>sum+row.uberscoreEarned,0),globalRank=Math.max(1,standings.findIndex(([owner])=>owner===record.ownerEmail)+1);
  return{...decorateRecord(record,cohort),uberscore,globalRank,commanderCount:standings.length};
}

export async function campaignChallenge(slug:string){
  const record=await publicCampaignRecord(slug);if(!record)return null;
  return{campaignSeed:record.campaignSeed,theater:record.theater,archetype:record.archetype,adversary:record.adversary,campaignId:record.campaignId,challenger:record.pseudonym,publicSlug:record.publicSlug};
}
