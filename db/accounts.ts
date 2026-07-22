import { and, eq, inArray, or } from "drizzle-orm";
import type { ChatGPTUser } from "../app/chatgpt-auth";
import { getDb } from "./index";
import { friendInvites, friendships, users } from "./schema";

const normalizeEmail=(value:string)=>value.trim().toLowerCase();
const pair=(a:string,b:string)=>[normalizeEmail(a),normalizeEmail(b)].sort() as [string,string];
const pairId=(a:string,b:string)=>pair(a,b).join("::");

export async function ensureAccount(user:ChatGPTUser){
  const db=await getDb(),now=Date.now(),email=normalizeEmail(user.email);
  await db.insert(users).values({email,displayName:user.displayName,createdAt:now,lastSeenAt:now}).onConflictDoUpdate({target:users.email,set:{displayName:user.displayName,lastSeenAt:now}});
  const account=(await db.select({allowFriends:users.allowFriends}).from(users).where(eq(users.email,email)).limit(1))[0];
  if(!account?.allowFriends)return email;
  const pending=await db.select().from(friendInvites).where(and(eq(friendInvites.inviteeEmail,email),eq(friendInvites.status,"pending")));
  for(const invite of pending){
    const[a,b]=pair(invite.inviterEmail,email);
    await db.insert(friendships).values({id:pairId(a,b),userA:a,userB:b,createdAt:now}).onConflictDoNothing();
    await db.update(friendInvites).set({status:"accepted",acceptedAt:now}).where(eq(friendInvites.id,invite.id));
  }
  return email;
}

export async function accountSnapshot(user:ChatGPTUser){
  const db=await getDb(),email=await ensureAccount(user);
  const links=await db.select().from(friendships).where(or(eq(friendships.userA,email),eq(friendships.userB,email)));
  const friendEmails=links.map(link=>link.userA===email?link.userB:link.userA);
  const records=friendEmails.length?await db.select().from(users).where(inArray(users.email,friendEmails)):[];
  const names=new Map(records.map(record=>[record.email,record.displayName]));
  const pending=await db.select().from(friendInvites).where(and(eq(friendInvites.inviterEmail,email),eq(friendInvites.status,"pending")));
  const account=(await db.select({allowFriends:users.allowFriends}).from(users).where(eq(users.email,email)).limit(1))[0];
  return{email,displayName:user.displayName,allowFriends:account?.allowFriends??true,friends:friendEmails.map(friendEmail=>({email:friendEmail,displayName:names.get(friendEmail)??friendEmail})),pending:pending.map(invite=>({email:invite.inviteeEmail,createdAt:invite.createdAt}))};
}

export async function inviteFriend(user:ChatGPTUser,rawEmail:string){
  const db=await getDb(),inviterEmail=await ensureAccount(user),inviteeEmail=normalizeEmail(rawEmail),now=Date.now();
  if(!/^\S+@\S+\.\S+$/.test(inviteeEmail))throw new Error("Enter a valid email address.");
  if(inviteeEmail===inviterEmail)throw new Error("You are already on your own friends list.");
  const invitee=(await db.select({email:users.email,allowFriends:users.allowFriends}).from(users).where(eq(users.email,inviteeEmail)).limit(1))[0];
  const registered=!!invitee;
  if(invitee&&!invitee.allowFriends)throw new Error("That account is not accepting friend invitations.");
  const id=`${inviterEmail}::${inviteeEmail}`;
  await db.insert(friendInvites).values({id,inviterEmail,inviteeEmail,status:registered?"accepted":"pending",createdAt:now,acceptedAt:registered?now:null}).onConflictDoUpdate({target:[friendInvites.inviterEmail,friendInvites.inviteeEmail],set:{status:registered?"accepted":"pending",createdAt:now,acceptedAt:registered?now:null}});
  if(registered){const[a,b]=pair(inviterEmail,inviteeEmail);await db.insert(friendships).values({id:pairId(a,b),userA:a,userB:b,createdAt:now}).onConflictDoNothing();}
  return{registered,inviteeEmail,subject:"Join me in DELENDA.QUEST",body:registered?`${user.displayName} added you as a friend in DELENDA.QUEST. Sign in to see the connection.`:`${user.displayName} invited you to DELENDA.QUEST. Register with ${inviteeEmail}; the friendship will be waiting automatically.`};
}

export async function removeFriend(user:ChatGPTUser,rawEmail:string){
  const db=await getDb(),email=await ensureAccount(user),friendEmail=normalizeEmail(rawEmail);const[a,b]=pair(email,friendEmail);
  await db.delete(friendships).where(and(eq(friendships.userA,a),eq(friendships.userB,b)));
  await db.delete(friendInvites).where(or(and(eq(friendInvites.inviterEmail,email),eq(friendInvites.inviteeEmail,friendEmail)),and(eq(friendInvites.inviterEmail,friendEmail),eq(friendInvites.inviteeEmail,email))));
}

export async function updateAllowFriends(user:ChatGPTUser,allowFriends:boolean){
  const db=await getDb(),email=await ensureAccount(user);
  await db.update(users).set({allowFriends,lastSeenAt:Date.now()}).where(eq(users.email,email));
  return{allowFriends};
}
