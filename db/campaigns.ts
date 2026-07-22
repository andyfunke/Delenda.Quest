import { and, eq, inArray, or } from "drizzle-orm";
import type { ChatGPTUser } from "../app/chatgpt-auth";
import { ensureAccount } from "./accounts";
import { getDb } from "./index";
import { campaignPacks, friendships } from "./schema";

export type CampaignPackInput={
  id:string;
  title:string;
  access:"private"|"friends";
  payload:string;
};

export async function campaignLibrary(user:ChatGPTUser){
  const db=await getDb(),email=await ensureAccount(user);
  const links=await db.select().from(friendships).where(or(eq(friendships.userA,email),eq(friendships.userB,email)));
  const friendEmails=links.map(link=>link.userA===email?link.userB:link.userA);
  const visible=friendEmails.length
    ?await db.select().from(campaignPacks).where(or(eq(campaignPacks.ownerEmail,email),and(eq(campaignPacks.access,"friends"),inArray(campaignPacks.ownerEmail,friendEmails))))
    :await db.select().from(campaignPacks).where(eq(campaignPacks.ownerEmail,email));
  return visible.sort((a,b)=>b.updatedAt-a.updatedAt).map(record=>({
    ...JSON.parse(record.payload) as Record<string,unknown>,
    ownerEmail:record.ownerEmail,
    editable:record.ownerEmail===email,
    updatedAt:new Date(record.updatedAt).toISOString(),
  }));
}

export async function saveCampaignPack(user:ChatGPTUser,input:CampaignPackInput){
  const db=await getDb(),ownerEmail=await ensureAccount(user),now=Date.now();
  const existing=(await db.select({ownerEmail:campaignPacks.ownerEmail,createdAt:campaignPacks.createdAt}).from(campaignPacks).where(eq(campaignPacks.id,input.id)).limit(1))[0];
  if(existing&&existing.ownerEmail!==ownerEmail)throw new Error("A friend-shared campaign must be copied before it can be edited.");
  await db.insert(campaignPacks).values({id:input.id,ownerEmail,title:input.title,access:input.access,payload:input.payload,createdAt:existing?.createdAt??now,updatedAt:now}).onConflictDoUpdate({target:campaignPacks.id,set:{title:input.title,access:input.access,payload:input.payload,updatedAt:now}});
  return{ok:true,id:input.id,ownerEmail,updatedAt:new Date(now).toISOString()};
}

export async function removeCampaignPack(user:ChatGPTUser,id:string){
  const db=await getDb(),ownerEmail=await ensureAccount(user);
  await db.delete(campaignPacks).where(and(eq(campaignPacks.id,id),eq(campaignPacks.ownerEmail,ownerEmail)));
  return{ok:true};
}
