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
    <div className="os-titlebar"><span>{challenged?"SEALED FRIEND CHALLENGE":"NEW CAMPAIGN"}</span><b>{challenged?"THE SAME WAR AWAITS":"COMMAND AWAITS"}</b></div>
    <button className="campaign-setup-close" aria-label="Close campaign issuance" onClick={onClose}>×</button>
    <header>
      <span className="eyebrow">{challenged?"A WAR REMEMBERED // AN OUTCOME UNSETTLED":"THE FRONT HAS OUTLIVED ITS EXPLANATIONS"}</span>
      <h2 id="campaign-generator-title">{challenged?"Return to the line.":"Assume command."}</h2>
      <p>{challenged?"Another commander entered this war before you. The ground is the same. The enemy is the same. What survives your command will not be.":"The state has spent its confidence, the army has spent its reserves, and the enemy has mistaken endurance for surrender. The remaining question has been assigned to you."}</p>
    </header>
    <blockquote className="campaign-opening-quote">
      <p>“The commander does not choose whether men are spent, but whether they are spent before or after they are useful.”</p>
      <cite>Comm. Het Claxton, Command Ethics Appendix</cite>
    </blockquote>
    <footer className="campaign-generator-actions">
      <div><b>{hasSave?"COMMAND INTERRUPTED":"THE LINE IS OPEN"}</b><small>{hasSave?`The Day ${current.day} command may still be resumed.`:"There is no unfinished command to recover."}</small></div>
      {hasSave && <button onClick={onResume}>Resume campaign</button>}
      <button onClick={onClose}>Return</button>
      <button className="primary" onClick={()=>onStart(config)}>{challenged?"Accept challenge":"Begin campaign"}</button>
    </footer>
  </div>;
}
