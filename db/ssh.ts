import { and, desc, eq, isNull } from "drizzle-orm";
import type { AuthenticatedUser } from "../app/auth";
import { ensureAccount } from "./accounts";
import { getDb } from "./index";
import { sshCredentials, sshSessionAudits } from "./schema";

const ALGORITHMS=new Set(["ssh-ed25519","ecdsa-sha2-nistp256","ssh-rsa"]);
const cleanLabel=(value:unknown)=>typeof value==="string"?value.trim().replace(/[\u0000-\u001f\u007f]/g,"").slice(0,60):"";
const cleanId=(value:unknown)=>typeof value==="string"&&/^[a-zA-Z0-9._:-]{1,160}$/.test(value)?value:"";
const cleanOwner=(value:unknown)=>typeof value==="string"&&/^[^\s@]+@[^\s@]+$/.test(value)&&value.length<=320?value.toLowerCase():"";

export type ParsedSshPublicKey={algorithm:string;keyData:string;normalized:string;fingerprint:string};
export type SshCredentialSummary={id:string;label:string;algorithm:string;fingerprint:string;createdAt:number;lastUsedAt:number|null;revokedAt:number|null};

const bytesToBase64=(bytes:Uint8Array)=>{
  let binary="";
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary);
};

const fingerprintFor=async(keyData:string)=>{
  let binary:string;
  try{binary=atob(keyData)}catch{throw new Error("SSH public key data is not valid base64.")}
  const bytes=Uint8Array.from(binary,character=>character.charCodeAt(0));
  if(bytes.length<32||bytes.length>16_384)throw new Error("SSH public key has an invalid encoded length.");
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
  return `SHA256:${bytesToBase64(digest).replace(/=+$/g,"")}`;
};

export async function parseSshPublicKey(input:unknown):Promise<ParsedSshPublicKey>{
  if(typeof input!=="string")throw new Error("SSH public key is required.");
  const parts=input.trim().split(/\s+/);
  const algorithm=parts[0]??"",keyData=parts[1]??"";
  if(!ALGORITHMS.has(algorithm))throw new Error("Use an Ed25519, ECDSA P-256, or RSA public key.");
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(keyData))throw new Error("SSH public key data is malformed.");
  return{algorithm,keyData,normalized:`${algorithm} ${keyData}`,fingerprint:await fingerprintFor(keyData)};
}

const summary=(row:typeof sshCredentials.$inferSelect):SshCredentialSummary=>({
  id:row.id,label:row.label,algorithm:row.algorithm,fingerprint:row.fingerprint,
  createdAt:row.createdAt,lastUsedAt:row.lastUsedAt??null,revokedAt:row.revokedAt??null,
});

export async function listSshCredentials(user:AuthenticatedUser){
  const db=await getDb(),ownerEmail=await ensureAccount(user);
  const rows=await db.select().from(sshCredentials).where(eq(sshCredentials.ownerEmail,ownerEmail)).orderBy(desc(sshCredentials.createdAt));
  return{credentials:rows.map(summary)};
}

export async function addSshCredential(user:AuthenticatedUser,input:{label?:unknown;publicKey?:unknown}){
  const db=await getDb(),ownerEmail=await ensureAccount(user),parsed=await parseSshPublicKey(input.publicKey),now=Date.now();
  const label=cleanLabel(input.label)||"Commander key";
  const existing=(await db.select().from(sshCredentials).where(eq(sshCredentials.fingerprint,parsed.fingerprint)).limit(1))[0];
  if(existing){
    if(existing.ownerEmail!==ownerEmail)throw new Error("That SSH key is already assigned to another command identity.");
    if(existing.revokedAt){
      await db.update(sshCredentials).set({label,algorithm:parsed.algorithm,publicKey:parsed.normalized,revokedAt:null}).where(eq(sshCredentials.id,existing.id));
      const restored={...existing,label,algorithm:parsed.algorithm,publicKey:parsed.normalized,revokedAt:null};
      return{credential:summary(restored)};
    }
    throw new Error("That SSH key is already registered.");
  }
  const row={id:crypto.randomUUID(),ownerEmail,label,algorithm:parsed.algorithm,publicKey:parsed.normalized,fingerprint:parsed.fingerprint,createdAt:now,lastUsedAt:null,revokedAt:null};
  await db.insert(sshCredentials).values(row);
  return{credential:summary(row)};
}

export async function revokeSshCredential(user:AuthenticatedUser,idInput:unknown){
  const db=await getDb(),ownerEmail=await ensureAccount(user),id=cleanId(idInput);
  if(!id)throw new Error("SSH credential id is invalid.");
  const row=(await db.select().from(sshCredentials).where(and(eq(sshCredentials.id,id),eq(sshCredentials.ownerEmail,ownerEmail))).limit(1))[0];
  if(!row)throw new Error("SSH credential was not found.");
  if(!row.revokedAt)await db.update(sshCredentials).set({revokedAt:Date.now()}).where(eq(sshCredentials.id,id));
  return{ok:true,id};
}

export async function authorizeSshCredential(algorithmInput:unknown,keyDataInput:unknown){
  const algorithm=typeof algorithmInput==="string"?algorithmInput:"";
  const keyData=typeof keyDataInput==="string"?keyDataInput:"";
  if(!ALGORITHMS.has(algorithm)||!/^[A-Za-z0-9+/]+={0,2}$/.test(keyData))return null;
  const db=await getDb(),publicKey=`${algorithm} ${keyData}`;
  const row=(await db.select().from(sshCredentials).where(and(eq(sshCredentials.publicKey,publicKey),isNull(sshCredentials.revokedAt))).limit(1))[0];
  if(!row)return null;
  await db.update(sshCredentials).set({lastUsedAt:Date.now()}).where(eq(sshCredentials.id,row.id));
  return{credentialId:row.id,playerId:row.ownerEmail,label:row.label,fingerprint:row.fingerprint};
}

export async function openSshSessionAudit(input:{id?:unknown;playerId?:unknown;credentialId?:unknown;remoteRiskHash?:unknown;clientVersion?:unknown}){
  const id=cleanId(input.id)||crypto.randomUUID(),ownerEmail=cleanOwner(input.playerId),credentialId=cleanId(input.credentialId);
  if(!ownerEmail||!credentialId)throw new Error("SSH audit identity is incomplete.");
  const db=await getDb(),now=Date.now();
  await db.insert(sshSessionAudits).values({
    id,ownerEmail,credentialId,connectedAt:now,disconnectedAt:null,
    remoteRiskHash:cleanId(input.remoteRiskHash)||null,
    clientVersion:typeof input.clientVersion==="string"?input.clientVersion.slice(0,120):null,
    commandsRead:0,consequentialAttempts:0,
  }).onConflictDoNothing();
  return{id,connectedAt:now};
}

export async function closeSshSessionAudit(input:{id?:unknown;commandsRead?:unknown;consequentialAttempts?:unknown}){
  const id=cleanId(input.id);
  if(!id)throw new Error("SSH audit id is invalid.");
  const finite=(value:unknown)=>Math.max(0,Math.min(100_000,Number.isFinite(Number(value))?Math.trunc(Number(value)):0));
  const db=await getDb();
  await db.update(sshSessionAudits).set({
    disconnectedAt:Date.now(),commandsRead:finite(input.commandsRead),consequentialAttempts:finite(input.consequentialAttempts),
  }).where(eq(sshSessionAudits.id,id));
  return{ok:true,id};
}
