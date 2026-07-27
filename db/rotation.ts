import { and, eq } from "drizzle-orm";
import type { AuthenticatedUser } from "../app/auth";
import { ensureAccount } from "./accounts";
import { getDb } from "./index";
import { accountRotationLedger } from "./schema";

export type RotationKind="opportunity"|"aphorism";

export async function rotationIds(user:AuthenticatedUser,kind:RotationKind){
  const db=await getDb(),ownerEmail=await ensureAccount(user);
  const rows=await db.select({itemId:accountRotationLedger.itemId}).from(accountRotationLedger).where(and(eq(accountRotationLedger.ownerEmail,ownerEmail),eq(accountRotationLedger.kind,kind)));
  return rows.map(row=>row.itemId);
}

export async function rotationEntries(user:AuthenticatedUser,kind:RotationKind){
  const db=await getDb(),ownerEmail=await ensureAccount(user);
  return db.select({itemId:accountRotationLedger.itemId,context:accountRotationLedger.context,status:accountRotationLedger.status,updatedAt:accountRotationLedger.updatedAt}).from(accountRotationLedger).where(and(eq(accountRotationLedger.ownerEmail,ownerEmail),eq(accountRotationLedger.kind,kind)));
}

export async function recordRotationItem(user:AuthenticatedUser,input:{kind:RotationKind;itemId:string;status:string;context?:string}){
  const db=await getDb(),ownerEmail=await ensureAccount(user),now=Date.now();
  const id=`${ownerEmail}::${input.kind}::${input.itemId}`;
  const update=input.context
    ? {status:input.status,context:input.context,updatedAt:now}
    : {status:input.status,updatedAt:now};
  await db.insert(accountRotationLedger).values({id,ownerEmail,kind:input.kind,itemId:input.itemId,status:input.status,context:input.context??"",firstSeenAt:now,updatedAt:now}).onConflictDoUpdate({target:[accountRotationLedger.ownerEmail,accountRotationLedger.kind,accountRotationLedger.itemId],set:update});
  return{itemId:input.itemId,status:input.status};
}
