"use client";

import { FACT_CATALOG, type GameState, situationForState } from "./game";

const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const wiki=(id:string)=>`?wiki=${id}`;

function ManualLink({id,label,detail}:{id:string;label:string;detail:string}){
  return <a className="substrate-link" href={wiki(id)} target="_blank" rel="noreferrer" title={detail}><span>{label}</span><small>{detail}</small></a>;
}

export function CampaignSituationPanel({s,compact=false}:{s:GameState;compact?:boolean}){
  const situation=situationForState(s);
  const sector=s.theaterSectors.find(x=>x.id===situation.sectorId);
  const activeFacts=s.operationalFacts.filter(x=>(x.expiresDay===null||x.expiresDay>=s.day)&&(x.sectorId===null||x.sectorId===situation.sectorId));
  const bands=Object.entries(situation.bands);
  return <section className={`campaign-substrate ${compact?"compact":""}`}>
    <header>
      <div><small>DETERMINISTIC SITUATION PACKET</small><b>{situation.problemClass.replaceAll("-"," ").toUpperCase()} // {situation.sector.toUpperCase()}</b></div>
      <ManualLink id="campaign-situation-substrate" label={`PACK ${situation.contentPackVersion}`} detail="The rules engine that selects, stores, and resolves daily operational problems."/>
    </header>
    <div className="substrate-ledger">
      <ManualLink id={`situation-${slug(situation.blueprintId)}`} label={situation.blueprintId.toUpperCase()} detail={`Authored blueprint selected at score ${situation.selectionScore.toFixed(2)} from ${situation.candidateCount} eligible problems.`}/>
      <ManualLink id="situation-gate" label={`${situation.candidateCount} ELIGIBLE`} detail="Blueprint gates were evaluated against the current theater, bands, persistent facts, history, and strategic condition."/>
      <ManualLink id="resolution-ticket" label={situation.resolutionTicket.split(":").at(-1)?.toUpperCase()??"SEALED"} detail="Stored deterministic ticket. The same ticket is used by every preview and the final resolution; reopening the screen cannot reroll it."/>
      <ManualLink id="standing-order" label="STANDING ORDER" detail={situation.standingOrder}/>
    </div>
    <div className="substrate-body">
      <article>
        <div className="substrate-path">WHY THIS PROBLEM // {situation.selectionBasis}</div>
        <h3>{situation.headline}</h3>
        <p>{situation.question}</p>
        <div className="band-grid">{bands.map(([key,value])=><ManualLink key={key} id="operational-band" label={String(value).toUpperCase()} detail={`${key.replaceAll(/([A-Z])/g," $1")} is the current operational band used by situation gates and resolution calculus.`}/>)}</div>
      </article>
      <aside>
        <h3>THEATER MEMORY</h3>
        {sector?<>
          <ManualLink id={`sector-${sector.id}`} label={sector.name.toUpperCase()} detail={`${sector.terrain}. Supply access ${sector.supplyAccess}/100; infrastructure ${sector.infrastructure}/100; fortification ${sector.fortification}/100; local control ${sector.control>=0?"+":""}${sector.control.toFixed(2)}.`}/>
          <div className="sector-stat"><span>LOCAL FORCE</span><b>{sector.friendlyForce.toLocaleString()} / {sector.enemyForceEstimate.toLocaleString()} EST.</b></div>
          <div className="sector-stat"><span>CONNECTED SECTORS</span><b>{sector.neighbors.map(id=>s.theaterSectors.find(x=>x.id===id)?.name??id).join(" // ")}</b></div>
        </>:<p>Sector record unavailable. The compiler will restore the theater baseline at the next migration boundary.</p>}
        <h3>ACTIVE FACTS</h3>
        <div className="fact-stack">{activeFacts.length?activeFacts.map(f=>{const definition=FACT_CATALOG[f.id];return <ManualLink key={`${f.id}-${f.sectorId}`} id={`fact-${f.id}`} label={definition?.label.toUpperCase()??f.id.toUpperCase()} detail={`${definition?.consequence??"Persistent operational condition."} Source: ${f.source}. ${f.expiresDay===null?"No scheduled expiry.":`Expires after Day ${f.expiresDay}.`}`}/>;}):<span className="substrate-empty">NO ACTIVE FACTS AT TARGET // BASELINE CONDITIONS ONLY</span>}</div>
      </aside>
    </div>
    {!compact&&<footer><span>STORED DAY {situation.day}</span><span>{situation.aftermathFacts.length} POSSIBLE AFTERMATH FACTS</span><span>NO LLM AUTHORITY // NARRATIVE MAY EXPLAIN, NEVER RESOLVE</span></footer>}
  </section>;
}
