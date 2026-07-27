import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { cookies } from "next/headers";
import type { AuthenticatedUser } from "../app/auth";
import { getDb } from "./index";
import { accountTurnState, friendInvites, friendships, users } from "./schema";
import {
  ACCOUNT_TIME_ZONE_COOKIE,
  accountTimeZoneFromBootstrapCookie,
  accountDayBounds,
  legacyTurnGateBeforeTimeZoneChange,
  legacyTurnGateForPendingTimeZone,
  validTimeZone,
} from "../app/account-time";

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

const initialAccountTimeZone=async()=>accountTimeZoneFromBootstrapCookie(
  (await cookies()).get(ACCOUNT_TIME_ZONE_COOKIE)?.value,
);

export async function ensureAccount(user:AuthenticatedUser){
  const db=await getDb(),now=Date.now(),email=normalizeEmail(user.email);
  const[alias,initialTimeZone]=await Promise.all([generatedAlias(email),initialAccountTimeZone()]);
  if(!initialTimeZone.configured){
    const existing=(await db.select({email:users.email}).from(users).where(eq(users.email,email)).limit(1))[0];
    if(!existing)throw new Error("Account creation requires a valid browser time zone.");
  }
  await db.insert(users).values({email,displayName:user.displayName,alias,aliasChangedAt:now,timeZone:initialTimeZone.timeZone,timeZoneConfigured:initialTimeZone.configured,createdAt:now,lastSeenAt:now}).onConflictDoUpdate({target:users.email,set:{displayName:user.displayName,lastSeenAt:now}});
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

export async function accountSnapshot(user:AuthenticatedUser){
  const db=await getDb(),email=await ensureAccount(user);
  await settleTimeZoneForAccount(db,email);
  const links=await db.select().from(friendships).where(or(eq(friendships.userA,email),eq(friendships.userB,email)));
  const friendEmails=links.map(link=>link.userA===email?link.userB:link.userA);
  const records=friendEmails.length?await db.select({email:users.email,alias:users.alias}).from(users).where(inArray(users.email,friendEmails)):[];
  const aliases=new Map(records.map(record=>[record.email,record.alias]));
  const pending=await db.select().from(friendInvites).where(and(eq(friendInvites.inviterEmail,email),eq(friendInvites.status,"pending")));
  const account=(await db.select({alias:users.alias,aliasChangedAt:users.aliasChangedAt,timeZone:users.timeZone,timeZoneConfigured:users.timeZoneConfigured,pendingTimeZone:users.pendingTimeZone,timeZoneEffectiveAt:users.timeZoneEffectiveAt,allowFriends:users.allowFriends,accountEnabled:users.accountEnabled,socialEnabled:users.socialEnabled,telemetryEnabled:users.telemetryEnabled,aliasRenameUnlocked:users.aliasRenameUnlocked}).from(users).where(eq(users.email,email)).limit(1))[0];
  const nextAliasChangeAt=(account?.aliasChangedAt??0)+30*86_400_000;
  return{email,alias:account?.alias??await generatedAlias(email),timeZone:account?.timeZone??"UTC",timeZoneConfigured:account?.timeZoneConfigured??false,pendingTimeZone:account?.pendingTimeZone??null,timeZoneEffectiveAt:account?.timeZoneEffectiveAt??null,allowFriends:account?.allowFriends??true,accountEnabled:account?.accountEnabled??true,socialEnabled:account?.socialEnabled??true,telemetryEnabled:account?.telemetryEnabled??true,nextAliasChangeAt:account?.aliasRenameUnlocked?0:nextAliasChangeAt,friends:friendEmails.map(friendEmail=>({alias:aliases.get(friendEmail)??"UnknownCommander"})),pendingCount:pending.length};
}

const turnGateForAccount=async(db:Awaited<ReturnType<typeof getDb>>,email:string)=>
  (await db.select({lastResolvedDayKey:accountTurnState.lastResolvedDayKey,nextTurnAt:accountTurnState.nextTurnAt}).from(accountTurnState).where(eq(accountTurnState.ownerEmail,email)).limit(1))[0]??{lastResolvedDayKey:null,nextTurnAt:null};

const materializeLegacyTurnGate=(
  db:Awaited<ReturnType<typeof getDb>>,
  email:string,
  nextTurnAt:number,
)=>
  db.update(accountTurnState).set({nextTurnAt}).where(and(
    eq(accountTurnState.ownerEmail,email),
    isNull(accountTurnState.nextTurnAt),
    isNotNull(accountTurnState.lastResolvedDayKey),
  ));

export const settleTimeZoneForAccount=async(db:Awaited<ReturnType<typeof getDb>>,email:string)=>{
  const now=Date.now(),account=(await db.select({timeZone:users.timeZone,pendingTimeZone:users.pendingTimeZone,timeZoneEffectiveAt:users.timeZoneEffectiveAt}).from(users).where(eq(users.email,email)).limit(1))[0];
  if(!account?.pendingTimeZone||!validTimeZone(account.pendingTimeZone)||(account.timeZoneEffectiveAt??Infinity)>now)return;
  const effectiveAt=account.timeZoneEffectiveAt!;
  const turn=await turnGateForAccount(db,email);
  const legacyGate=legacyTurnGateForPendingTimeZone({...turn,effectiveAt});
  const accountUpdate=db.update(users).set({timeZone:account.pendingTimeZone,pendingTimeZone:null,timeZoneEffectiveAt:null,timeZoneConfigured:true,lastSeenAt:now}).where(and(
    eq(users.email,email),
    eq(users.pendingTimeZone,account.pendingTimeZone),
    eq(users.timeZoneEffectiveAt,effectiveAt),
  ));
  if(legacyGate===null)await accountUpdate;
  else{
    const gateUpdate=materializeLegacyTurnGate(db,email,legacyGate);
    await db.batch([gateUpdate, accountUpdate]);
  }
};

export async function updateAlias(user:AuthenticatedUser,rawAlias:string){
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

export async function inviteFriend(user:AuthenticatedUser,rawEmail:string){
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

export async function removeFriend(user:AuthenticatedUser,rawEmail:string){
  const db=await getDb(),email=await ensureAccount(user),friendEmail=normalizeEmail(rawEmail);const[a,b]=pair(email,friendEmail);
  await db.delete(friendships).where(and(eq(friendships.userA,a),eq(friendships.userB,b)));
  await db.delete(friendInvites).where(or(and(eq(friendInvites.inviterEmail,email),eq(friendInvites.inviteeEmail,friendEmail)),and(eq(friendInvites.inviterEmail,friendEmail),eq(friendInvites.inviteeEmail,email))));
}

export async function removeFriendByAlias(user:AuthenticatedUser,alias:string){
  const db=await getDb(),record=(await db.select({email:users.email}).from(users).where(eq(users.alias,alias)).limit(1))[0];
  if(record)await removeFriend(user,record.email);
}

export async function updateAllowFriends(user:AuthenticatedUser,allowFriends:boolean){
  const db=await getDb(),email=await ensureAccount(user);
  const account=(await db.select({accountEnabled:users.accountEnabled,socialEnabled:users.socialEnabled}).from(users).where(eq(users.email,email)).limit(1))[0];
  if(!account?.accountEnabled||!account.socialEnabled)throw new Error("Social account services are disabled.");
  await db.update(users).set({allowFriends,lastSeenAt:Date.now()}).where(eq(users.email,email));
  return{allowFriends};
}

export async function updateTimeZone(user:AuthenticatedUser,timeZone:string){
  if(!validTimeZone(timeZone))throw new Error("Select a valid IANA time zone.");
  const db=await getDb(),email=await ensureAccount(user);
  await settleTimeZoneForAccount(db,email);
  const account=(await db.select({accountEnabled:users.accountEnabled,timeZone:users.timeZone,timeZoneConfigured:users.timeZoneConfigured}).from(users).where(eq(users.email,email)).limit(1))[0];
  if(!account?.accountEnabled)throw new Error("Account services are disabled.");
  const now=Date.now();
  const turn=await turnGateForAccount(db,email);
  const legacyGate=legacyTurnGateBeforeTimeZoneChange({...turn,timeZone:account.timeZone,now});
  if(legacyGate!==null)await materializeLegacyTurnGate(db,email,legacyGate);
  if(!account.timeZoneConfigured&&turn.lastResolvedDayKey===null){
    await db.update(users).set({timeZone,timeZoneConfigured:true,pendingTimeZone:null,timeZoneEffectiveAt:null,lastSeenAt:now}).where(eq(users.email,email));
    return{timeZone,pendingTimeZone:null,timeZoneEffectiveAt:null};
  }
  const effectiveAt=accountDayBounds(account.timeZone,now).end;
  await db.update(users).set({pendingTimeZone:timeZone,timeZoneEffectiveAt:effectiveAt,timeZoneConfigured:true,lastSeenAt:now}).where(eq(users.email,email));
  return{timeZone:account.timeZone,pendingTimeZone:timeZone,timeZoneEffectiveAt:effectiveAt};
}

export async function telemetryAllowed(user:AuthenticatedUser){
  const db=await getDb(),email=await ensureAccount(user);
  const account=(await db.select({accountEnabled:users.accountEnabled,telemetryEnabled:users.telemetryEnabled}).from(users).where(eq(users.email,email)).limit(1))[0];
  return !!account?.accountEnabled&&!!account.telemetryEnabled;
}
