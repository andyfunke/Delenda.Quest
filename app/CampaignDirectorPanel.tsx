"use client";

import { CAMPAIGN_PHASES, directorForState, type GameState } from "./game";

const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export function CampaignDirectorPanel({s,compact=false}:{s:GameState;compact?:boolean}){
  const director=directorForState(s);
  const isCrisis=director.event.category==="REACTIVE CRISIS";
  return <section className={`campaign-director os-window ${compact?"compact":""}`} aria-label="Campaign Event Director">
    <div className="os-titlebar"><span>CAMPAIGN EVENT DIRECTOR</span><b>DAY {s.day} // {isCrisis?"REACTIVE CRISIS":"SEEDED CONDITION"}</b></div>
    <nav className="phase-ribbon" aria-label="Campaign phases">
      {CAMPAIGN_PHASES.map(phase=>{
        const active=phase.id===director.phase.id;const elapsed=s.day>phase.days[1];
        return <a className={`${active?"active":""} ${elapsed?"elapsed":""}`} href={`?wiki=phase-${slug(phase.label)}`} target="_blank" rel="noreferrer" title={`${phase.brief} ${phase.exact.join("; ")}`} key={phase.id}>
          <span>{elapsed?"✓":active?"●":"○"} DAYS {phase.days[0]}–{phase.days[1]}</span><b>{phase.label}</b><small>{active?"CURRENT PHASE":elapsed?"CLOSED":"NOT YET ACTIVE"}</small>
        </a>;
      })}
    </nav>
    <div className="director-event">
      <article>
        <div className="director-classification"><span>{director.event.category}</span><b>{isCrisis?"STATE TRIGGERED":"SEED SELECTED"}</b></div>
        <h2>{director.event.label}</h2>
        <blockquote>“{director.event.quote}”</blockquote>
        <p>{director.event.brief}</p>
        <div className="director-trigger"><span>SELECTION BASIS</span><b>{director.trigger}</b><a href="?wiki=campaign-event-director" target="_blank" rel="noreferrer">HOW THE DIRECTOR SELECTS CONDITIONS ↗</a></div>
      </article>
      <div className="director-effects">
        <section><h3>AUTHORITATIVE EFFECTS // EXACT</h3>{director.event.exact.map(effect=><a href={`?wiki=event-${slug(director.event.label)}`} target="_blank" rel="noreferrer" title="This modifier is applied at day resolution." key={effect}>{effect}</a>)}</section>
        <section><h3>CONTINGENT EXPOSURE // DISCLOSED</h3>{director.event.risk.map(risk=><a href={`?wiki=event-${slug(director.event.label)}`} target="_blank" rel="noreferrer" title="This is an exposed risk, not a guaranteed additional state change." key={risk}>{risk}</a>)}</section>
      </div>
    </div>
    {!compact&&<div className="director-history">
      <header><span>RESOLVED CONDITION LEDGER</span><a href="?wiki=strategic-condition" target="_blank" rel="noreferrer">FIELD MANUAL ↗</a></header>
      {s.eventHistory.length?s.eventHistory.slice(0,4).map(entry=><a href={`?wiki=event-${slug(entry.event)}`} target="_blank" rel="noreferrer" key={`${entry.day}-${entry.eventId}`}><span>DAY {entry.day}</span><b>{entry.event}</b><small>{entry.phase} // {entry.trigger}</small></a>):<p>NO CONDITIONS HAVE RESOLVED // TODAY&apos;S EVENT ENTERS THIS LEDGER AT DAY RESOLUTION</p>}
    </div>}
    <footer className="os-status">PHASE + DAILY CONDITION → PRODUCTION // OPERATIONS // DESERTION // DOMESTIC STATE</footer>
  </section>;
}
