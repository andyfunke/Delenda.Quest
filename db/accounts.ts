import { and, eq, inArray, or } from "drizzle-orm";
import type { ChatGPTUser } from "../app/chatgpt-auth";
import { getDb } from "./index";
import { friendInvites, friendships, users } from "./schema";
import { validTimeZone } from "../app/account-time";

const normalizeEmail=(value:string)=>value.trim().toLowerCase();
const pair=(a:string,b:string)=>[normalizeEmail(a),normalizeEmail(b)].sort() as [string,string];
const pairId=(a:string,b:string)=>pair(a,b).join("::");
const ALIAS_FAMILIES=[
  ["Red","Aurora","Twilight","Rapture","Rupture","Electric"],
  ["Vague","Approximate","Hypothetical","Illustrative","Rhetorical","Facsimile"],
  ["Magistrate","Regent","Protectorate","Archon","Divine","Aristocrat","Aristotelian"],
  ["Armistice","Concord","Cordial","Attache","Proxy","Promulgated","Forthwith"],
  ["Mephistos","Baal","Persephone","Apostate","Anathema","Devour"],
  ["Soliloquy","Confabulate","Collusive","Corrosive","Assuage","Assay"],
  ["Facade","Armoire","Cache","Buttress","Proctored"],
  ["Hypotenuse","Quadratic","Approximate","Raptor","Aurora"],
] as const;
const digest=async(value:string)=>{
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map(byte=>byte.toString(16).padStart(2,"0")).join("");
};
const generatedAlias=async(email:string)=>{
  const hex=await digest(`delenda:alias:${email}`),family=ALIAS_FAMILIES[parseInt(hex.slice(0,4),16)%ALIAS_FAMILIES.length];
  const first=parseInt(hex.slice(4,8),16)%family.length;
  let second=parseInt(hex.slice(8,12),16)%family.length;
  if(second===first)second=(second+1)%family.length;
  const suffix=parseInt(hex.slice(12,16),16)%1000;
  return `${family[first]}${family[second]}${String(suffix).padStart(3,"0")}`.slice(0,28);
};

export async function ensureAccount(user:ChatGPTUser){
  const db=await getDb(),now=Date.now(),email=normalizeEmail(user.email);
  const alias=await generatedAlias(email);
  await db.insert(users).values({email,displayName:user.displayName,alias,aliasChangedAt:now,createdAt:now,lastSeenAt:now}).onConflictDoUpdate({target:users.email,set:{displayName:user.displayName,lastSeenAt:now}});
  const existing=(await db.select({alias:users.alias}).from(users).where(eq(users.email,email)).limit(1))[0];
  if(!existing?.alias)await db.update(users).set({alias,aliasChangedAt:now}).where(eq(users.email,email));
  const account=(await db.select({allowFriends:users.allowFriends,socialEnabled:users.socialEnabled}).from(users).where(eq(users.email,email)).limit(1))[0];
  if(!account?.allowFriends||!account.socialEnabled)return email;
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
  const records=friendEmails.length?await db.select({email:users.email,alias:users.alias}).from(users).where(inArray(users.email,friendEmails)):[];
  const aliases=new Map(records.map(record=>[record.email,record.alias]));
  const pending=await db.select().from(friendInvites).where(and(eq(friendInvites.inviterEmail,email),eq(friendInvites.status,"pending")));
  const account=(await db.select({alias:users.alias,aliasChangedAt:users.aliasChangedAt,timeZone:users.timeZone,allowFriends:users.allowFriends,accountEnabled:users.accountEnabled,socialEnabled:users.socialEnabled,telemetryEnabled:users.telemetryEnabled,aliasRenameUnlocked:users.aliasRenameUnlocked}).from(users).where(eq(users.email,email)).limit(1))[0];
  const nextAliasChangeAt=(account?.aliasChangedAt??0)+30*86_400_000;
  return{email,alias:account?.alias??await generatedAlias(email),timeZone:account?.timeZone??"UTC",allowFriends:account?.allowFriends??true,accountEnabled:account?.accountEnabled??true,socialEnabled:account?.socialEnabled??true,telemetryEnabled:account?.telemetryEnabled??true,nextAliasChangeAt:account?.aliasRenameUnlocked?0:nextAliasChangeAt,friends:friendEmails.map(friendEmail=>({alias:aliases.get(friendEmail)??"UnknownCommander"})),pendingCount:pending.length};
}

export async function updateAlias(user:ChatGPTUser,rawAlias:string){
  const db=await getDb(),email=await ensureAccount(user),now=Date.now();
  const account=(await db.select({aliasChangedAt:users.aliasChangedAt,aliasRenameUnlocked:users.aliasRenameUnlocked,accountEnabled:users.accountEnabled}).from(users).where(eq(users.email,email)).limit(1))[0];
  if(!account?.accountEnabled)throw new Error("Account services are disabled.");
  if(!account?.aliasRenameUnlocked&&now-account!.aliasChangedAt<30*86_400_000)throw new Error("Alias changes are available once every 30 days.");
  const alias=rawAlias.trim().replace(/[^A-Za-z0-9]/g,"").slice(0,28);
  if(alias.length<5)throw new Error("Alias must contain 5–28 letters or numbers.");
  const taken=(await db.select({email:users.email}).from(users).where(eq(users.alias,alias)).limit(1))[0];
  if(taken&&taken.email!==email)throw new Error("That alias is already assigned.");
  await db.update(users).set({alias,aliasChangedAt:now,aliasRenameUnlocked:false,lastSeenAt:now}).where(eq(users.email,email));
  return{alias,nextAliasChangeAt:now+30*86_400_000};
}

export async function inviteFriend(user:ChatGPTUser,rawEmail:string){
  const db=await getDb(),inviterEmail=await ensureAccount(user),inviteeEmail=normalizeEmail(rawEmail),now=Date.now();
  const inviter=(await db.select({accountEnabled:users.accountEnabled,socialEnabled:users.socialEnabled}).from(users).where(eq(users.email,inviterEmail)).limit(1))[0];
  if(!inviter?.accountEnabled||!inviter.socialEnabled)throw new Error("Social account services are disabled.");
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

export async function removeFriendByAlias(user:ChatGPTUser,alias:string){
  const db=await getDb(),record=(await db.select({email:users.email}).from(users).where(eq(users.alias,alias)).limit(1))[0];
  if(record)await removeFriend(user,record.email);
}

export async function updateAllowFriends(user:ChatGPTUser,allowFriends:boolean){
  const db=await getDb(),email=await ensureAccount(user);
  const account=(await db.select({accountEnabled:users.accountEnabled,socialEnabled:users.socialEnabled}).from(users).where(eq(users.email,email)).limit(1))[0];
  if(!account?.accountEnabled||!account.socialEnabled)throw new Error("Social account services are disabled.");
  await db.update(users).set({allowFriends,lastSeenAt:Date.now()}).where(eq(users.email,email));
  return{allowFriends};
}

export async function updateTimeZone(user:ChatGPTUser,timeZone:string){
  if(!validTimeZone(timeZone))throw new Error("Select a valid IANA time zone.");
  const db=await getDb(),email=await ensureAccount(user);
  const account=(await db.select({accountEnabled:users.accountEnabled}).from(users).where(eq(users.email,email)).limit(1))[0];
  if(!account?.accountEnabled)throw new Error("Account services are disabled.");
  await db.update(users).set({timeZone,lastSeenAt:Date.now()}).where(eq(users.email,email));
  return{timeZone};
}

export async function telemetryAllowed(user:ChatGPTUser){
  const db=await getDb(),email=await ensureAccount(user);
  const account=(await db.select({accountEnabled:users.accountEnabled,telemetryEnabled:users.telemetryEnabled}).from(users).where(eq(users.email,email)).limit(1))[0];
  return !!account?.accountEnabled&&!!account.telemetryEnabled;
}
