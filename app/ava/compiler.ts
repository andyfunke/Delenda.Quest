import { AvaCompileResult, AvaCompilerContext, AvaCompilerTrace, AvaEntity, AvaEntityKind, AvaInstruction, AvaModule } from "./schema";

const filler = new Set(["a","an","the","me","my","our","please","ava","now","current","currently","some","about"]);
const commandWords = new Set(["help","commands","status","condition","situation","report","brief","briefing","explain","what","does","mean","affect","affects","underpin","underpinnings","improve","raise","change","control","calculus","calculate","open","show","take","go","navigate","select","choose","prepare","stage","maneuver","manoeuvre","forecast","project","predict","compare","versus","vs","with","and","clear","cancel","unselect","commit","issue","execute","do","it","that","resolve","end","day","to","for","of","how","is","are","give"]);

export const normalizeAvaInput = (raw:string) => raw
  .normalize("NFKD")
  .toLowerCase()
  .replace(/[’']/g,"")
  .replace(/[^a-z0-9]+/g," ")
  .trim()
  .replace(/\s+/g," ");

const words=(value:string)=>normalizeAvaInput(value).split(" ").filter(Boolean);
const phraseSet=(entity:AvaEntity)=>[entity.id,entity.label,...(entity.aliases??[])].map(normalizeAvaInput).filter(Boolean);
const containsPhrase=(input:string,phrase:string)=>input===phrase||input.startsWith(`${phrase} `)||input.endsWith(` ${phrase}`)||input.includes(` ${phrase} `);

const entityMatches=(input:string,entities:AvaEntity[],kind?:AvaEntityKind)=>{
  const candidates=entities.filter(entity=>!kind||entity.kind===kind).map(entity=>{
    const phrases=phraseSet(entity);
    const exact=phrases.some(phrase=>containsPhrase(input,phrase));
    const inputTokens=new Set(words(input));
    const scored=phrases.map(phrase=>{
      const tokens=words(phrase);return tokens.length&&tokens.every(token=>inputTokens.has(token))?tokens.length:0;
    });
    return{entity,exact,score:Math.max(...scored,0)};
  }).filter(item=>item.score>0);
  const exact=candidates.filter(item=>item.exact);if(exact.length)return exact.map(item=>item.entity);
  const best=Math.max(...candidates.map(item=>item.score),0);
  return candidates.filter(item=>item.score===best).map(item=>item.entity);
};

const trace=(rule:string,input:string,entities:AvaEntity[]=[]):AvaCompilerTrace=>{
  const tokens=words(input);const known=new Set([...commandWords,...filler]);
  entities.flatMap(phraseSet).flatMap(words).forEach(token=>known.add(token));
  return{rule,tokenCount:tokens.length,entityKinds:[...new Set(entities.map(entity=>entity.kind))],unresolvedTokenCount:tokens.filter(token=>!known.has(token)).length};
};

const clarification=(input:string,failure:"missing-target"|"ambiguous-target"|"unsupported-combination"|"unrecognized",rule:string,prompt="Command not executed. Please clarify orders.",candidates?:AvaEntity[]):AvaCompileResult=>({status:"clarify",failure,prompt,candidates,trace:trace(rule,input,candidates)});
const compiled=(input:string,rule:string,instruction:AvaInstruction,entities:AvaEntity[]=[]):AvaCompileResult=>({status:"compiled",instruction,trace:trace(rule,input,entities)});

const moduleAliases:Record<string,AvaModule>={
  home:"dashboard",dashboard:"dashboard",overview:"dashboard",
  campaign:"campaign",front:"campaign",operations:"campaign",
  production:"national",industry:"national",industrial:"national",national:"national",
  military:"military",army:"military",forces:"military",
  diplomacy:"diplomacy",statecraft:"diplomacy",foreign:"diplomacy",
  doctrine:"doctrine",account:"account",wiki:"wiki",manual:"wiki",
};
const resolveModule=(input:string):AvaModule|null=>{
  const hits=Object.entries(moduleAliases).filter(([alias])=>containsPhrase(input,alias)).map(([,module])=>module);
  return [...new Set(hits)][0]??null;
};

const uniqueEntity=(input:string,context:AvaCompilerContext,kind?:AvaEntityKind)=>{
  const hits=entityMatches(input,context.entities,kind);return{hit:hits.length===1?hits[0]:null,hits};
};

export function compileAvaCommand(raw:string,context:AvaCompilerContext):AvaCompileResult{
  const input=normalizeAvaInput(raw);
  if(!input)return{status:"clarify",failure:"empty",prompt:"Command not executed. Please clarify orders.",trace:trace("empty",input)};

  if(/^(help|commands|command list|what can (you|i) do)/.test(input)){
    const subject=input.replace(/^(help|commands|command list|what can (you|i) do)\s*/,"")||undefined;
    return compiled(input,"help",{kind:"HELP",subject});
  }
  if(/^(status|command status|how are we doing|where do we stand|command situation)$/.test(input))return compiled(input,"status",{kind:"STATUS"});
  if(/^(condition|phase|field condition|current condition)$/.test(input))return compiled(input,"condition-report",{kind:"REPORT",scope:"current"});
  if(/\b(resolve|end|close)\b.*\bday\b/.test(input)||input==="resolve")return compiled(input,"resolve-day",{kind:"RESOLVE_DAY"});
  if(/^(clear|cancel|unselect)( selection| that| order| maneuver| manoeuvre)?$/.test(input))return compiled(input,"clear",{kind:"CLEAR"});
  if(/^(issue|commit|execute)( order| selection| maneuver| manoeuvre)?$/.test(input)||/^(do it|issue it|commit it|execute it)$/.test(input))return compiled(input,"commit",{kind:"COMMIT",entity:context.selected??undefined},context.selected?[context.selected]:[]);

  if(/\bcompare\b|\bversus\b|\bvs\b/.test(input)){
    const hits=entityMatches(input,context.entities,"maneuver");
    if(hits.length===2)return compiled(input,"compare",{kind:"COMPARE",entities:[hits[0],hits[1]]},hits);
    return clarification(input,hits.length>2?"ambiguous-target":"missing-target","compare","Command not executed. Name two authorized maneuvers to compare.",hits);
  }

  if(/\b(forecast|project|predict)\b/.test(input)){
    const{hit,hits}=uniqueEntity(input,context,"maneuver");
    if(hits.length>1)return clarification(input,"ambiguous-target","forecast","Command not executed. Clarify which maneuver requires a forecast.",hits);
    return compiled(input,"forecast",{kind:"FORECAST",entity:hit??context.selected??undefined},hit?[hit]:context.selected?[context.selected]:[]);
  }

  if(/^(report|brief|briefing)\b/.test(input)||/\b(report|briefing)$/.test(input)){
    const targetModule=resolveModule(input);return compiled(input,"report",{kind:"REPORT",scope:targetModule??"current"});
  }

  if(/^(open|go to|navigate to|take me to|show)\b/.test(input)){
    const targetModule=resolveModule(input);
    if(targetModule)return compiled(input,"open",{kind:"OPEN",module:targetModule});
    return clarification(input,"missing-target","open","Command not executed. Specify a command module.");
  }

  if(/^(explain|inspect|what|how)\b/.test(input)||/\b(mean|affect|affects|underpinnings|calculus)\b/.test(input)){
    const{hit,hits}=uniqueEntity(input,context,"metric");
    if(hits.length>1)return clarification(input,"ambiguous-target","explain","Command not executed. Clarify which metric requires inspection.",hits);
    if(!hit)return clarification(input,"missing-target","explain","Command not executed. Specify a metric or system to inspect.");
    const facet:"meaning"|"effects"|"levers"|"calculus" = /improve|raise|change|control|lever/.test(input)?"levers":/calculus|calculate|underpin/.test(input)?"calculus":/affect|effect/.test(input)?"effects":"meaning";
    return compiled(input,"explain",{kind:"EXPLAIN",entity:hit,facet},[hit]);
  }

  if(/^(select|choose|prepare|stage|maneuver|manoeuvre)\b/.test(input)){
    const hits=entityMatches(input,context.entities).filter(entity=>entity.kind==="maneuver"||entity.kind==="directive");
    if(hits.length===1)return compiled(input,"select",{kind:"SELECT",entity:hits[0]},hits);
    if(hits.length>1)return clarification(input,"ambiguous-target","select","Command not executed. Clarify which order is to be staged.",hits);
    return clarification(input,"missing-target","select","Command not executed. Specify an authorized maneuver or directive.");
  }

  const direct=entityMatches(input,context.entities).filter(entity=>entity.kind==="maneuver"||entity.kind==="directive");
  if(direct.length===1)return compiled(input,"implicit-select",{kind:"SELECT",entity:direct[0]},direct);
  return clarification(input,direct.length>1?"ambiguous-target":"unrecognized","fallback","Command not executed. Please clarify orders.",direct);
}
