import type { GameState } from "../game";

export const AVA_TEXT_SCHEMA_VERSION="delenda.quest.ava.text.v3" as const;

export type AvaEvidenceTag=
  | "NOW"
  | "PROJECTED"
  | "RESOLVED"
  | "OBSERVED"
  | "ESTIMATED"
  | "INFERRED"
  | "UNKNOWN"
  | "RULE"
  | "SEALED"
  | "LOCKED";

export type AvaTextBlockKind=
  | "direct"
  | "narrative"
  | "status"
  | "calculation"
  | "intelligence"
  | "options"
  | "recommendation"
  | "warning"
  | "confirmation"
  | "receipt"
  | "grammar"
  | "dependency";

export type AvaTextDatum={
  label:string;
  value:string;
  unit?:string;
  asOf?:string;
  source?:string;
  confidence?:number;
  evidence?:AvaEvidenceTag;
};

export type AvaTextBlock={
  kind:AvaTextBlockKind;
  title?:string;
  lines:string[];
  data?:AvaTextDatum[];
};

export type AvaTextFrame={
  schemaVersion:typeof AVA_TEXT_SCHEMA_VERSION;
  id:string;
  stateRevision:string;
  header:{day:number;status:string;ordersRemaining:number;ordersTotal:number};
  blocks:AvaTextBlock[];
};

const headingKind=(heading:string):AvaTextBlockKind=>{
  if(/COMMANDS|TRY|GRAMMAR/.test(heading))return"grammar";
  if(/RECOMMENDATION|NEAREST ALTERNATIVE/.test(heading))return"recommendation";
  if(/INTELLIGENCE|\[LEDGER|\[OBSERVED|\[INFERRED|\[UNKNOWN/.test(heading))return"intelligence";
  if(/MUTATION STAGED|TYPE CONFIRM|CONFIRMATION/.test(heading))return"confirmation";
  if(/MUTATION EXECUTED|RECEIPT/.test(heading))return"receipt";
  if(/REJECTED|WARNING|SEALED BOUNDARY|LOCKED/.test(heading))return"warning";
  if(/AVAILABLE|MISSIONS|PLAN|COMPARISON|TARGET OF OPPORTUNITY/.test(heading))return"options";
  if(/MECHANISM|CALCULATION|COST|STATE DIFF|OWNED|CONTINGENT|WHY IT RANKS/.test(heading))return"calculation";
  if(/STATUS|PROJECTION|STATE|POSITION/.test(heading))return"status";
  return"direct";
};

const isHeading=(line:string)=>line.length>0&&line.length<96&&(
  /^[A-Z0-9][A-Z0-9 /+\-[\]·:]+$/.test(line)||
  /^\[[A-Z]/.test(line)
);

export const terminalBlocks=(body:string):AvaTextBlock[]=>body.split(/\n{2,}/).filter(Boolean).map(section=>{
  const lines=section.split("\n"),first=lines[0],headed=isHeading(first)&&lines.length>1;
  return{kind:headingKind(first),title:headed?first:undefined,lines:headed?lines.slice(1):lines};
});

export const createAvaTextFrame=(state:GameState,stateRevision:string,body:string):AvaTextFrame=>({
  schemaVersion:AVA_TEXT_SCHEMA_VERSION,
  id:`ava-frame-${state.day}-${stateRevision}`,
  stateRevision,
  header:{day:state.day,status:state.status.toUpperCase(),ordersRemaining:state.actions,ordersTotal:3},
  blocks:terminalBlocks(body),
});

export const renderAvaTextFrame=(frame:AvaTextFrame)=>[
  `AVA // DAY ${frame.header.day} // ${frame.header.status} // ${frame.header.ordersRemaining} OF ${frame.header.ordersTotal} ORDERS REMAIN // STATE ${frame.stateRevision}`,
  ...frame.blocks.map(block=>[block.title,...block.lines].filter(Boolean).join("\n")),
].join("\n\n");

