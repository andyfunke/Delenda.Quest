"use client";

import { useState } from "react";
import { ADVERSARY_PERSONALITIES, STATE_ARCHETYPES, THEATERS, sanitizeSeed, type CampaignConfig, type GameState } from "./game";

const randomNumber=()=>{
  if(typeof crypto!=="undefined"&&crypto.getRandomValues){const value=new Uint32Array(1);crypto.getRandomValues(value);return value[0]}
  return Date.now();
};
const select=<T,>(values:T[],salt:number)=>values[Math.abs(salt)%values.length];
const randomCampaign=(seedOverride?:number|null):CampaignConfig=>{
  const entropy=randomNumber(),seed=sanitizeSeed(seedOverride??entropy);
  return{seed,theater:select(THEATERS,entropy>>>2).id,archetype:select(STATE_ARCHETYPES,entropy>>>8).id,adversaryPersonality:select(ADVERSARY_PERSONALITIES,entropy>>>14).id};
};

export function CampaignSetup({current,hasSave,seedOverride,configOverride,onStart,onResume,onClose}:{
  current:GameState;hasSave:boolean;seedOverride?:number|null;configOverride?:CampaignConfig|null;
  onStart:(config:CampaignConfig)=>void;onResume:()=>void;onClose:()=>void;
}){
  const[config]=useState<CampaignConfig>(()=>configOverride??randomCampaign(seedOverride));
  const challenged=!!configOverride;
  return <div className="campaign-setup campaign-issuance os-window" role="dialog" aria-modal="true" aria-labelledby="campaign-generator-title">
    <div className="os-titlebar"><span>{challenged?"SEALED FRIEND CHALLENGE":"NEW CAMPAIGN"}</span><b>OPENING STATE ASSIGNED</b></div>
    <button className="campaign-setup-close" aria-label="Close campaign issuance" onClick={onClose}>×</button>
    <header>
      <span className="eyebrow">{challenged?"IDENTICAL CAMPAIGN CONDITIONS // COMPARATIVE RUN":"AUTHORED RANDOM CAMPAIGN // NO CONFIGURATION REQUIRED"}</span>
      <h2 id="campaign-generator-title">{challenged?"Accept the same war.":"Assume command."}</h2>
      <p>{challenged?"The opening state, enemy disposition, hidden opportunities, reinforcement schedule, and resolution sequence match the originating Campaign Record. Your orders alone create the divergence.":"DELENDA.QUEST has selected the state, theater, opposition, and concealed operational sequence. The campaign will disclose only what command would know."}</p>
    </header>
    <section className="campaign-sealed-brief">
      <small>CAMPAIGN ISSUANCE</small>
      <b>{challenged?"SEALED COMPARISON READY":"RANDOM ASSIGNMENT READY"}</b>
      <p>No generation variables are exposed. Renewing command issues a different authored campaign at any time.</p>
    </section>
    <footer className="campaign-generator-actions">
      <div><b>AUTOSAVE // THIS DEVICE</b><small>{hasSave?`Campaign ${current.campaignId}, Day ${current.day}, can be resumed.`:"No prior campaign is stored on this device."}</small></div>
      <button disabled={!hasSave} onClick={onResume}>Resume existing campaign</button>
      <button onClick={onClose}>Cancel</button>
      <button className="primary" onClick={()=>onStart(config)}>{challenged?"Accept challenge":"Begin campaign"}</button>
    </footer>
  </div>;
}
