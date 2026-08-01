import { and, eq } from "drizzle-orm";
import type { AuthenticatedUser } from "../app/auth";
import { isCampaignIdentifier } from "../app/campaign-id";
import { ensureAccount } from "./accounts";
import { getDb } from "./index";
import { activeCampaigns, users } from "./schema";

export type ActiveCampaignSubmission={
  state:unknown;
  clock?:{start?:unknown;end?:unknown};
  runToken?:unknown;
  multiplayerRun?:unknown;
  expectedRevision?:unknown;
};

const clean=(value:unknown,max:number)=>typeof value==="string"?value.trim().replace(/[^a-zA-Z0-9._:-]+/g,"").slice(0,max):"";
const finite=(value:unknown)=>Number.isFinite(Number(value))?Math.trunc(Number(value)):0;
const cleanOwner=(value:unknown)=>typeof value==="string"&&/^[^\s@]+@[^\s@]+$/.test(value)&&value.length<=320?value.toLowerCase():"";
const revision=(value:unknown)=>{
  const parsed=Number(value);
  if(!Number.isInteger(parsed)||parsed<0)throw new Error("An expected campaign revision is required.");
  return parsed;
};
const stateMeta=(value:unknown)=>{
  if(!value||typeof value!=="object"||Array.isArray(value))
    throw new Error("Campaign state is required.");
  const state=value as {
    campaignId?:unknown;
    day?:unknown;
    status?:unknown;
    resolutionHistory?:unknown;
  };
  const campaignId=isCampaignIdentifier(state.campaignId)
    ?state.campaignId
    :"";
  const day=Number(state.day);
  const status=String(state.status);
  const resolutionCount=Array.isArray(state.resolutionHistory)
    ?state.resolutionHistory.length
    :-1;
  if(
    !campaignId||
    !Number.isInteger(day)||
    day<1||
    !["active","victory","defeat"].includes(status)||
    resolutionCount<0
  )throw new Error("Campaign state is incomplete.");
  return{campaignId,day,status,resolutionCount};
};

const prepareCampaign=(input:ActiveCampaignSubmission)=>{
  const meta=stateMeta(input.state);
  const campaignId=meta.campaignId,runToken=clean(input.runToken,120);
  if(!runToken)throw new Error("Campaign state is incomplete.");
  const payload=JSON.stringify(input.state);
  if(payload.length>750_000)throw new Error("Campaign state exceeds the account save limit.");
  const clockStart=finite(input.clock?.start),clockEnd=finite(input.clock?.end);
  if(clockStart<1||clockEnd<clockStart)throw new Error("Campaign clock is invalid.");
  return{
    campaign:{campaignId,runToken,state:payload,clockStart,clockEnd,multiplayerRun:!!input.multiplayerRun},
    expectedRevision:revision(input.expectedRevision),
    meta,
  };
};

export const restoreActiveCampaignRow=(row:typeof activeCampaigns.$inferSelect)=>{
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

export class ActiveCampaignConflictError extends Error{
  readonly code="CAMPAIGN_REVISION_CONFLICT";
  constructor(
    readonly campaign:ReturnType<typeof restoreActiveCampaignRow>,
    readonly conflict:"modified"|"deleted",
  ){
    super(
      conflict==="deleted"
        ?"The active campaign was deleted by another session."
        :"The active campaign changed in another session.",
    );
    this.name="ActiveCampaignConflictError";
  }
}

export async function activeCampaignForOwner(ownerInput:string){
  const ownerEmail=cleanOwner(ownerInput);
  if(!ownerEmail)throw new Error("Campaign owner is invalid.");
  const db=await getDb();
  const row=(await db.select().from(activeCampaigns).where(eq(activeCampaigns.ownerEmail,ownerEmail)).limit(1))[0];
  return{accountKey:ownerEmail,campaign:row?restoreActiveCampaignRow(row):null};
}

export async function saveActiveCampaignForOwner(ownerInput:string,input:ActiveCampaignSubmission){
  const ownerEmail=cleanOwner(ownerInput);
  if(!ownerEmail)throw new Error("Campaign owner is invalid.");
  const db=await getDb(),prepared=prepareCampaign(input),now=Date.now();
  const account=(await db.select({accountEnabled:users.accountEnabled}).from(users).where(eq(users.email,ownerEmail)).limit(1))[0];
  if(!account?.accountEnabled)throw new Error("Account campaign services are disabled.");
  if(prepared.expectedRevision===0){
    if(
      prepared.meta.day!==1||
      prepared.meta.resolutionCount!==0||
      prepared.meta.status!=="active"
    )throw new Error("A new campaign must begin at unresolved day one.");
    const inserted=await db
      .insert(activeCampaigns)
      .values({
        ownerEmail,
        ...prepared.campaign,
        revision:1,
        createdAt:now,
        updatedAt:now,
      })
      .onConflictDoNothing()
      .returning();
    if(inserted[0])
      return{accountKey:ownerEmail,campaign:restoreActiveCampaignRow(inserted[0])};
  }else{
    const existing=(await db.select().from(activeCampaigns).where(eq(activeCampaigns.ownerEmail,ownerEmail)).limit(1))[0];
    if(!existing||existing.revision!==prepared.expectedRevision)
      throw new ActiveCampaignConflictError(
        existing?restoreActiveCampaignRow(existing):null,
        existing?"modified":"deleted",
      );
    const currentMeta=stateMeta(JSON.parse(existing.state) as unknown);
    const replacingCampaign=prepared.meta.campaignId!==currentMeta.campaignId;
    if(
      replacingCampaign
        ?prepared.meta.day!==1||
          prepared.meta.resolutionCount!==0||
          prepared.meta.status!=="active"
        :prepared.meta.day!==currentMeta.day||
          prepared.meta.resolutionCount!==currentMeta.resolutionCount||
          prepared.meta.status!==currentMeta.status
    )
      throw new Error(
        "Campaign day transitions require an atomic resolution redemption.",
      );
    const updated=await db
      .update(activeCampaigns)
      .set({
        ...prepared.campaign,
        lastResolutionGrantMarker:replacingCampaign
          ?null
          :existing.lastResolutionGrantMarker,
        revision:prepared.expectedRevision+1,
        updatedAt:now,
      })
      .where(
        and(
          eq(activeCampaigns.ownerEmail,ownerEmail),
          eq(activeCampaigns.revision,prepared.expectedRevision),
        ),
      )
      .returning();
    if(updated[0])
      return{accountKey:ownerEmail,campaign:restoreActiveCampaignRow(updated[0])};
  }
  const current=(await db.select().from(activeCampaigns).where(eq(activeCampaigns.ownerEmail,ownerEmail)).limit(1))[0];
  throw new ActiveCampaignConflictError(
    current?restoreActiveCampaignRow(current):null,
    current?"modified":"deleted",
  );
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
