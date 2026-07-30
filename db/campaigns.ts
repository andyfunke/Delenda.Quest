import { eq, sql } from "drizzle-orm";
import type { AuthenticatedUser } from "../app/auth";
import { ensureAccount } from "./accounts";
import { getDb } from "./index";
import { activeCampaigns, users } from "./schema";

export type ActiveCampaignSubmission={
  state:unknown;
  clock?:{start?:unknown;end?:unknown};
  runToken?:unknown;
  multiplayerRun?:unknown;
};

const clean=(value:unknown,max:number)=>typeof value==="string"?value.trim().replace(/[^a-zA-Z0-9._:-]+/g,"").slice(0,max):"";
const finite=(value:unknown)=>Number.isFinite(Number(value))?Math.trunc(Number(value)):0;
const cleanOwner=(value:unknown)=>typeof value==="string"&&/^[^\s@]+@[^\s@]+$/.test(value)&&value.length<=320?value.toLowerCase():"";

const prepareCampaign=(input:ActiveCampaignSubmission)=>{
  if(!input.state||typeof input.state!=="object"||Array.isArray(input.state))throw new Error("Campaign state is required.");
  const state=input.state as {campaignId?:unknown;day?:unknown;status?:unknown};
  const campaignId=clean(state.campaignId,100),runToken=clean(input.runToken,120);
  if(!campaignId||!runToken||!Number.isFinite(Number(state.day))||!["active","victory","defeat"].includes(String(state.status)))throw new Error("Campaign state is incomplete.");
  const payload=JSON.stringify(input.state);
  if(payload.length>750_000)throw new Error("Campaign state exceeds the account save limit.");
  const clockStart=finite(input.clock?.start),clockEnd=finite(input.clock?.end);
  if(clockStart<1||clockEnd<clockStart)throw new Error("Campaign clock is invalid.");
  return{campaignId,runToken,state:payload,clockStart,clockEnd,multiplayerRun:!!input.multiplayerRun};
};

const restore=(row:typeof activeCampaigns.$inferSelect)=>{
  try{
    return{
      state:JSON.parse(row.state) as unknown,
      clock:{start:row.clockStart,end:row.clockEnd},
      runToken:row.runToken,
      multiplayerRun:row.multiplayerRun,
      revision:row.revision,
      updatedAt:row.updatedAt,
    };
  }catch{return null}
};

export async function activeCampaignForOwner(ownerInput:string){
  const ownerEmail=cleanOwner(ownerInput);
  if(!ownerEmail)throw new Error("Campaign owner is invalid.");
  const db=await getDb();
  const row=(await db.select().from(activeCampaigns).where(eq(activeCampaigns.ownerEmail,ownerEmail)).limit(1))[0];
  return{accountKey:ownerEmail,campaign:row?restore(row):null};
}

export async function saveActiveCampaignForOwner(ownerInput:string,input:ActiveCampaignSubmission){
  const ownerEmail=cleanOwner(ownerInput);
  if(!ownerEmail)throw new Error("Campaign owner is invalid.");
  const db=await getDb(),campaign=prepareCampaign(input),now=Date.now();
  const account=(await db.select({accountEnabled:users.accountEnabled}).from(users).where(eq(users.email,ownerEmail)).limit(1))[0];
  if(!account?.accountEnabled)throw new Error("Account campaign services are disabled.");
  await db.insert(activeCampaigns).values({ownerEmail,...campaign,revision:1,createdAt:now,updatedAt:now}).onConflictDoUpdate({
    target:activeCampaigns.ownerEmail,
    set:{...campaign,revision:sql`${activeCampaigns.revision}+1`,updatedAt:now},
  });
  const row=(await db.select().from(activeCampaigns).where(eq(activeCampaigns.ownerEmail,ownerEmail)).limit(1))[0];
  return{accountKey:ownerEmail,campaign:row?restore(row):null};
}

export async function activeCampaignFor(user:AuthenticatedUser){
  return activeCampaignForOwner(await ensureAccount(user));
}

export async function saveActiveCampaign(user:AuthenticatedUser,input:ActiveCampaignSubmission){
  return saveActiveCampaignForOwner(await ensureAccount(user),input);
}

export async function deleteActiveCampaign(user:AuthenticatedUser){
  const db=await getDb(),ownerEmail=await ensureAccount(user);
  await db.delete(activeCampaigns).where(eq(activeCampaigns.ownerEmail,ownerEmail));
  return{ok:true};
}
