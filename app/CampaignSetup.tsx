"use client";

import { useMemo, useState } from "react";
import {
  ADVERSARY_PERSONALITIES,
  STATE_ARCHETYPES,
  THEATERS,
  initialState,
  sanitizeSeed,
  type CampaignConfig,
  type GameState,
  type Theater,
} from "./game";

const randomSeed=()=>{
  if(typeof crypto!=="undefined"&&crypto.getRandomValues){const value=new Uint32Array(1);crypto.getRandomValues(value);return sanitizeSeed(value[0]);}
  return sanitizeSeed(Date.now());
};

export function CampaignSetup({current,hasSave,seedOverride,onStart,onResume,onClose}:{
  current:GameState;hasSave:boolean;seedOverride?:number|null;
  onStart:(config:CampaignConfig)=>void;onResume:()=>void;onClose:()=>void;
}){
  const[config,setConfig]=useState<CampaignConfig>({
    seed:sanitizeSeed(seedOverride??randomSeed()),
    archetype:current.stateArchetype,
    adversaryPersonality:current.adversaryPersonality,
    theater:current.theater,
  });
  const preview=useMemo(()=>initialState(config),[config]);
  const archetype=STATE_ARCHETYPES.find(x=>x.id===config.archetype)!;
  const adversary=ADVERSARY_PERSONALITIES.find(x=>x.id===config.adversaryPersonality)!;
  const theater=THEATERS.find(x=>x.id===config.theater)!;
  const set=<K extends keyof CampaignConfig>(key:K,value:CampaignConfig[K])=>setConfig(old=>({...old,[key]:value}));
  return <div className="campaign-setup os-window" role="dialog" aria-modal="true" aria-labelledby="campaign-generator-title">
    <div className="os-titlebar"><span>NEW CAMPAIGN</span><b>CONFIGURE OPENING STATE</b></div>
    <button className="campaign-setup-close" aria-label="Close campaign generator" onClick={onClose}>×</button>
    <header>
      <span className="eyebrow">CAMPAIGN GENERATOR // OPENING CONDITIONS</span>
      <h2 id="campaign-generator-title">Select the state that will be spent.</h2>
      <p>Theater changes the operational problems you face. State archetype changes your opening ledger. Enemy system changes how the opposition learns and prosecutes the war.</p>
    </header>
    <div className="campaign-generator-layout">
      <nav className="campaign-config-tree" aria-label="Campaign parameters">
        <section><h3>1 // THEATER <a href="?wiki=campaign-theater" target="_blank" rel="noreferrer">?</a></h3>{THEATERS.map(x=><button className={config.theater===x.id?"selected":""} onClick={()=>set("theater",x.id as Theater)} key={x.id}><span>{config.theater===x.id?"●":"○"}</span><b>{x.label}</b><small>{x.pressure}</small></button>)}</section>
        <section><h3>2 // STATE ARCHETYPE <a href="?wiki=state-archetype" target="_blank" rel="noreferrer">?</a></h3>{STATE_ARCHETYPES.map(x=><button className={config.archetype===x.id?"selected":""} onClick={()=>set("archetype",x.id)} key={x.id}><span>{config.archetype===x.id?"●":"○"}</span><b>{x.label}</b><small>{x.difficulty}</small></button>)}</section>
        <section><h3>3 // ADVERSARY SYSTEM <a href="?wiki=adversary-personality" target="_blank" rel="noreferrer">?</a></h3>{ADVERSARY_PERSONALITIES.map(x=><button className={config.adversaryPersonality===x.id?"selected":""} onClick={()=>set("adversaryPersonality",x.id)} key={x.id}><span>{config.adversaryPersonality===x.id?"●":"○"}</span><b>{x.label}</b><small>{x.difficulty}</small></button>)}</section>
      </nav>
      <article className="campaign-config-inspector">
        <div className="menu-path">NEW CAMPAIGN // {theater.label.toUpperCase()} // {archetype.label.toUpperCase()}</div>
        <h2>{archetype.label}</h2>
        <blockquote>“{archetype.quote}”</blockquote>
        <p>{archetype.brief}</p>
        <div className="campaign-selection-grid">
          <section><small>THEATER</small><h3>{theater.label}</h3><p>{theater.brief}</p><b>PRIMARY PRESSURE // {theater.pressure.toUpperCase()}</b></section>
          <section><small>ADVERSARY</small><h3>{adversary.label}</h3><p>{adversary.brief}</p><b>DOCTRINE // {adversary.doctrine.toUpperCase()}</b></section>
        </div>
        <div className="campaign-modifiers">
          <section><h3>OWNED OPENING EFFECTS</h3>{archetype.modifiers.map(x=><span key={x}>{x}</span>)}</section>
          <section><h3>ENEMY RULE CHANGES</h3>{adversary.modifiers.map(x=><span key={x}>{x}</span>)}</section>
        </div>
        <section className="campaign-opening-ledger">
          <h3>OPENING AUTHORITY</h3>
          <div><small>DEPLOYABLE</small><b>{preview.deployable.toLocaleString()}</b></div><div><small>READINESS</small><b>{preview.readiness.toFixed(0)}%</b></div><div><small>EQUIPMENT</small><b>{preview.equipment.toFixed(0)}%</b></div><div><small>MUNITIONS</small><b>{preview.production.munitions.stock.toLocaleString()}</b></div><div><small>LEGITIMACY</small><b>{preview.legitimacy.toFixed(0)}%</b></div><div><small>ENEMY FORCE</small><b>{preview.enemy.toLocaleString()}</b></div>
        </section>
      </article>
    </div>
    <footer className="campaign-generator-actions">
      <div><b>AUTOSAVE // THIS DEVICE <a href="?wiki=campaign-autosave" target="_blank" rel="noreferrer">?</a></b><small>{hasSave?`Campaign ${current.campaignId}, Day ${current.day}, can be resumed.`:"No prior campaign record is stored on this device."}</small></div>
      <button disabled={!hasSave} onClick={onResume}>Resume existing campaign</button>
      <button onClick={onClose}>Cancel</button>
      <button className="primary" onClick={()=>onStart({...config,seed:sanitizeSeed(config.seed)})}>Begin generated campaign</button>
    </footer>
  </div>;
}
