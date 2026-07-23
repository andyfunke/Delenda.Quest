import { desc, eq } from "drizzle-orm";
import type { ChatGPTUser } from "../app/chatgpt-auth";
import { getDb } from "./index";
import { bugReports, campaignOutcomes, telemetryCounters, users } from "./schema";

export async function isAdmin(user:ChatGPTUser){
  const {env}=await import("cloudflare:workers");
  const allowed=(env.DELENDA_ADMIN_EMAILS??"").split(",").map(value=>value.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(user.email.trim().toLowerCase());
}

export async function requireAdmin(user:ChatGPTUser){
  if(!await isAdmin(user))throw new Error("Administrator access required.");
}

export async function adminSnapshot(user:ChatGPTUser){
  await requireAdmin(user);
  const db=await getDb();
  const telemetry=await db.select().from(telemetryCounters).orderBy(desc(telemetryCounters.count)).limit(300);
  const outcomes=await db.select().from(campaignOutcomes).orderBy(desc(campaignOutcomes.createdAt)).limit(1000);
  const reports=await db.select().from(bugReports).orderBy(desc(bugReports.createdAt)).limit(100);
  const aggregate=new Map<string,{outcome:string;count:number;days:number}>();
  for(const row of outcomes){
    let decisions:Record<string,number>={};try{decisions=JSON.parse(row.decisions)}catch{}
    for(const [decision,count] of Object.entries(decisions)){
      const key=`${row.outcome}:${decision}`,item=aggregate.get(key)??{outcome:row.outcome,count:0,days:0};
      item.count+=count;item.days+=row.days;aggregate.set(key,item);
    }
  }
  const outcomeGroups=new Map<string,typeof outcomes>();
  for(const row of outcomes)outcomeGroups.set(row.outcome,[...(outcomeGroups.get(row.outcome)??[]),row]);
  return{
    telemetry,
    outcomeSummary:[...outcomeGroups.entries()].map(([outcome,rows])=>({outcome,campaigns:rows.length,averageDays:rows.length?Math.round(rows.reduce((sum,row)=>sum+row.days,0)/rows.length):0})),
    decisionClusters:[...aggregate.entries()].map(([key,value])=>({decision:key.slice(key.indexOf(":")+1),...value})).sort((a,b)=>b.count-a.count).slice(0,100),
    bugReports:reports.map(report=>({...report})),
  };
}

export async function updatePlayerSupport(user:ChatGPTUser,input:{alias:string;field:string;value:boolean}){
  await requireAdmin(user);
  const db=await getDb(),alias=input.alias.trim();
  const allowed={accountEnabled:users.accountEnabled,socialEnabled:users.socialEnabled,telemetryEnabled:users.telemetryEnabled,aliasRenameUnlocked:users.aliasRenameUnlocked} as const;
  const column=allowed[input.field as keyof typeof allowed];
  if(!column)throw new Error("Unsupported support override.");
  const target=(await db.select({alias:users.alias}).from(users).where(eq(users.alias,alias)).limit(1))[0];
  if(!target)throw new Error("Player alias not found.");
  await db.update(users).set({[input.field]:input.value,lastSeenAt:Date.now()}).where(eq(users.alias,alias));
  return{alias,field:input.field,value:input.value};
}

export async function updateBugStatus(user:ChatGPTUser,id:string,status:"open"|"reviewed"|"closed"){
  await requireAdmin(user);
  const db=await getDb();await db.update(bugReports).set({status}).where(eq(bugReports.id,id));return{id,status};
}
