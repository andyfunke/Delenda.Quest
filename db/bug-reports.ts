import { getDb } from "./index";
import { bugReports } from "./schema";

const clean=(value:unknown,max:number)=>typeof value==="string"?value.trim().slice(0,max):"";
export async function createBugReport(input:{route?:unknown;elementKey?:unknown;elementText?:unknown;gridX?:unknown;gridY?:unknown;module?:unknown;interfaceMode?:unknown;reportText?:unknown}){
  const db=await getDb(),now=Date.now(),reportText=clean(input.reportText,2000);
  if(!reportText)throw new Error("Describe the bug before sending.");
  const id=crypto.randomUUID();
  await db.insert(bugReports).values({
    id,route:clean(input.route,240),elementKey:clean(input.elementKey,180),elementText:clean(input.elementText,240),
    gridX:Math.max(0,Math.min(9,Math.trunc(Number(input.gridX)||0))),gridY:Math.max(0,Math.min(9,Math.trunc(Number(input.gridY)||0))),
    module:clean(input.module,40),interfaceMode:clean(input.interfaceMode,40),reportText,status:"open",createdAt:now,
  });
  return{id};
}
