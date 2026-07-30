import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { AuthenticatedUser } from "../app/auth";
import { ensureAccount } from "./accounts";
import { getDb } from "./index";
import { sshCredentials, sshPairingChallenges, sshSessionAudits } from "./schema";

const PAIRING_TTL_MS=10*60*1000;
const CODE_ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const cleanFingerprint=(value:string)=>{
  const fingerprint=value.trim();
  if(!/^SHA256:[A-Za-z0-9+/]{20,60}={0,2}$/.test(fingerprint))throw new Error("Invalid SSH fingerprint.");
  return fingerprint;
};
const cleanAlgorithm=(value:string)=>{
  const algorithm=value.trim();
  if(!/^(ssh-ed25519|ecdsa-sha2-nistp(256|384|521)|rsa-sha2-(256|512)|ssh-rsa)$/.test(algorithm))throw new Error("Unsupported SSH key algorithm.");
  return algorithm;
};
const cleanKey=(algorithm:string,value:string)=>{
  const publicKey=value.trim();
  const [declared,blob]=publicKey.split(/\s+/,3);
  if(declared!==algorithm||!/^[A-Za-z0-9+/]+={0,2}$/.test(blob??"")||publicKey.length>16_384)throw new Error("Invalid SSH public key.");
  return `${declared} ${blob}`;
};
const cleanLabel=(value:string)=>value.trim().replace(/[\u0000-\u001f\u007f]/g,"").slice(0,64)||"SSH device";
const code=()=>{
  const bytes=crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes,byte=>CODE_ALPHABET[byte%CODE_ALPHABET.length]).join("");
};

export async function credentialForFingerprint(rawFingerprint:string,now=Date.now()){
  const db=await getDb(),fingerprint=cleanFingerprint(rawFingerprint);
  const credential=(await db.select().from(sshCredentials).where(and(eq(sshCredentials.fingerprint,fingerprint),isNull(sshCredentials.revokedAt))).limit(1))[0];
  if(!credential)return null;
  await db.update(sshCredentials).set({lastUsedAt:now}).where(eq(sshCredentials.id,credential.id));
  return{...credential,lastUsedAt:now};
}

export async function startPairingChallenge(input:{fingerprint:string;algorithm:string;publicKey:string},now=Date.now()){
  const db=await getDb(),fingerprint=cleanFingerprint(input.fingerprint),algorithm=cleanAlgorithm(input.algorithm),publicKey=cleanKey(algorithm,input.publicKey);
  const existing=(await db.select().from(sshPairingChallenges).where(and(eq(sshPairingChallenges.fingerprint,fingerprint),gt(sshPairingChallenges.expiresAt,now),isNull(sshPairingChallenges.completedAt))).orderBy(desc(sshPairingChallenges.createdAt)).limit(1))[0];
  if(existing)return existing;
  for(let attempt=0;attempt<4;attempt++){
    const nextCode=code();
    try{
      const challenge={code:nextCode,fingerprint,algorithm,publicKey,createdAt:now,expiresAt:now+PAIRING_TTL_MS};
      await db.insert(sshPairingChallenges).values(challenge);
      return challenge;
    }catch{
      if(attempt===3)throw new Error("Could not allocate an SSH pairing code.");
    }
  }
  throw new Error("Could not allocate an SSH pairing code.");
}

export async function approvePairingChallenge(user:AuthenticatedUser,rawCode:string,rawLabel:string){
  const db=await getDb(),ownerEmail=await ensureAccount(user),now=Date.now(),pairingCode=rawCode.trim().toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,8);
  const challenge=(await db.select().from(sshPairingChallenges).where(eq(sshPairingChallenges.code,pairingCode)).limit(1))[0];
  if(!challenge)throw new Error("Pairing code not found.");
  if(challenge.expiresAt<=now)throw new Error("Pairing code expired.");
  if(challenge.completedAt)throw new Error("Pairing code was already used.");
  const existing=(await db.select().from(sshCredentials).where(eq(sshCredentials.fingerprint,challenge.fingerprint)).limit(1))[0];
  if(existing&&existing.ownerEmail!==ownerEmail)throw new Error("That SSH key belongs to another account.");
  const credentialId=existing?.id??crypto.randomUUID();
  if(existing){
    await db.update(sshCredentials).set({label:cleanLabel(rawLabel),algorithm:challenge.algorithm,publicKey:challenge.publicKey,revokedAt:null,lastUsedAt:null}).where(eq(sshCredentials.id,credentialId));
  }else{
    await db.insert(sshCredentials).values({id:credentialId,ownerEmail,label:cleanLabel(rawLabel),algorithm:challenge.algorithm,publicKey:challenge.publicKey,fingerprint:challenge.fingerprint,createdAt:now});
  }
  await db.update(sshPairingChallenges).set({ownerEmail,completedAt:now,consumedAt:now}).where(eq(sshPairingChallenges.code,pairingCode));
  return{ok:true,credential:{id:credentialId,label:cleanLabel(rawLabel),fingerprint:challenge.fingerprint,algorithm:challenge.algorithm,createdAt:existing?.createdAt??now,lastUsedAt:null}};
}

export async function sshCredentialsFor(user:AuthenticatedUser){
  const db=await getDb(),ownerEmail=await ensureAccount(user);
  return db.select({id:sshCredentials.id,label:sshCredentials.label,algorithm:sshCredentials.algorithm,fingerprint:sshCredentials.fingerprint,createdAt:sshCredentials.createdAt,lastUsedAt:sshCredentials.lastUsedAt,revokedAt:sshCredentials.revokedAt}).from(sshCredentials).where(eq(sshCredentials.ownerEmail,ownerEmail)).orderBy(desc(sshCredentials.createdAt));
}

export async function revokeSshCredential(user:AuthenticatedUser,id:string){
  const db=await getDb(),ownerEmail=await ensureAccount(user),now=Date.now();
  const updated=await db.update(sshCredentials).set({revokedAt:now}).where(and(eq(sshCredentials.id,id),eq(sshCredentials.ownerEmail,ownerEmail))).returning({id:sshCredentials.id});
  if(!updated.length)throw new Error("SSH credential not found.");
  return{ok:true,id};
}

export async function openSshAudit(input:{ownerEmail:string;credentialId:string;remoteRiskHash?:string;clientVersion?:string},now=Date.now()){
  const db=await getDb(),id=crypto.randomUUID();
  await db.insert(sshSessionAudits).values({id,ownerEmail:input.ownerEmail,credentialId:input.credentialId,connectedAt:now,remoteRiskHash:input.remoteRiskHash?.slice(0,128),clientVersion:input.clientVersion?.slice(0,128),commandsRead:0,consequentialAttempts:0});
  return{id,connectedAt:now};
}

export async function sshAudit(id:string){
  const db=await getDb();
  return (await db.select().from(sshSessionAudits).where(and(eq(sshSessionAudits.id,id),isNull(sshSessionAudits.disconnectedAt))).limit(1))[0]??null;
}

export async function updateSshAudit(id:string,input:{commandsRead:number;consequentialAttempts:number}){
  const db=await getDb();
  await db.update(sshSessionAudits).set({commandsRead:Math.max(0,Math.trunc(input.commandsRead)),consequentialAttempts:Math.max(0,Math.trunc(input.consequentialAttempts))}).where(eq(sshSessionAudits.id,id));
}

export async function closeSshAudit(id:string,input?:{commandsRead?:number;consequentialAttempts?:number},now=Date.now()){
  const db=await getDb();
  await db.update(sshSessionAudits).set({disconnectedAt:now,commandsRead:Math.max(0,Math.trunc(input?.commandsRead??0)),consequentialAttempts:Math.max(0,Math.trunc(input?.consequentialAttempts??0))}).where(eq(sshSessionAudits.id,id));
  return{ok:true};
}
