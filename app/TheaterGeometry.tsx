"use client";

import { situationForState, type GameState } from "./game";

type Props = { s: GameState; variant?: "briefing" | "command" };

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const hash=(text:string)=>{let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0)/4294967295;};

type Geometry={
  friendlyEdge:number;enemyEdge:number;frontX:number;frontTop:number;frontBottom:number;
  salientX:number;salientY:number;reserveY:number;activeY:number;routeY:number;
  posture:"advance"|"hold"|"withdraw"|"disperse";dispatch:string;entropy:number;
};

export const compileTheaterGeometry=(s:GameState):Geometry=>{
  const situation=situationForState(s);
  const sector=s.theaterSectors.find(item=>item.id===situation.sectorId)??s.theaterSectors[0];
  const latest=[...s.situationHistory].sort((a,b)=>b.day-a.day)[0];
  const maneuver=s.maneuver??latest?.maneuverId??null;
  const entropy=hash(`${s.campaignSeed}:${s.day}:${sector.id}:${sector.ground}:${sector.network}:${Math.round(sector.supplyAccess)}:${Math.round(s.front*10)}`);
  const control=clamp(sector.control,-1,1);
  const frontX=clamp(350+s.front*9+control*54,265,470);
  const frontage=clamp(58+(100-sector.infrastructure)*.42+(100-sector.fortification)*.18,62,118);
  const lean=(entropy-.5)*32+(sector.network==="severed"?18:sector.network==="degraded"?10:sector.network==="restored"?-8:0);
  const posture=maneuver==="abandon"?"withdraw":maneuver==="exploit"||maneuver==="breach"?"advance":maneuver==="network"?"disperse":"hold";
  const dispatch=maneuver==="reinforce"?"RESERVE TO CENTER":maneuver==="interdict"?"FIRES ACROSS FRONT":maneuver==="route"?"OPEN ADJACENT ROUTE":maneuver==="abandon"?"FORMATION WITHDRAWAL":maneuver==="exploit"?"MOBILE FORCE FORWARD":maneuver==="breach"?"ASSAULT THROUGH CENTER":maneuver==="network"?"RELAYS DISPERSED":"FORMATION HOLDING";
  return{
    friendlyEdge:clamp(frontX-112-sector.supplyAccess*.22,145,285),
    enemyEdge:clamp(frontX+96+sector.enemyForceEstimate/5000,455,585),
    frontX,frontTop:105-frontage+lean*.25,frontBottom:105+frontage+lean*.25,
    salientX:clamp(frontX+(posture==="advance"?74:posture==="withdraw"?-34:42),245,520),
    salientY:clamp(105+lean,55,155),
    reserveY:clamp(142+(entropy-.5)*52,112,174),
    activeY:clamp(84+lean*.55,48,144),
    routeY:clamp(118+(sector.supplyAccess-50)*.45,78,158),
    posture,dispatch,entropy,
  };
};

export function TheaterGeometry({ s, variant = "briefing" }: Props) {
  const situation=situationForState(s),sector=s.theaterSectors.find(item=>item.id===situation.sectorId)??s.theaterSectors[0],g=compileTheaterGeometry(s);
  const latest=[...s.situationHistory].sort((a,b)=>b.day-a.day)[0],maneuver=s.maneuver??latest?.maneuverId??null;
  const activeFacts=s.operationalFacts.filter(fact=>fact.visible&&(fact.sectorId===sector.id||fact.sectorId===null)&&(fact.expiresDay===null||fact.expiresDay>=s.day));
  const routeBroken=sector.supplyAccess<42||activeFacts.some(fact=>/infrastructure_severed|enemy_fires_registered/.test(fact.id));
  const relayMission=maneuver==="network";
  const arrowEndX=g.posture==="withdraw"?g.friendlyEdge-34:g.posture==="advance"?g.salientX+48:g.salientX;
  const arrowEndY=g.posture==="disperse"?g.activeY-32:g.activeY;
  return (
    <div className={`theater-plate briefing-plate ${variant} posture-${g.posture}`} data-geometry={`${sector.id}:${g.posture}:${Math.round(g.entropy*100)}`}>
      <svg viewBox="0 0 700 230" role="img" aria-label={`${s.theater} theater live geometry, ${g.dispatch.toLowerCase()}, active sector ${situation.sector}`}>
        <defs>
          <marker id={`friendly-arrow-${variant}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path className="arrow-head" d="M0 0L10 5L0 10Z"/></marker>
          <marker id={`enemy-arrow-${variant}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path className="enemy-arrow-head" d="M0 0L10 5L0 10Z"/></marker>
        </defs>
        <rect className="plate-ground" width="700" height="230" />
        <g className="grid"><path d="M100 0v210M200 0v210M300 0v210M400 0v210M500 0v210M600 0v210M0 52h700M0 105h700M0 158h700" /></g>
        <path className="friendly" d={`M30 18L${g.friendlyEdge} 18L${g.frontX} ${g.frontTop}L${g.frontX} ${g.frontBottom}L${g.friendlyEdge} 192L30 192Z`} />
        <path className="salient" d={`M${g.frontX} ${g.frontTop}L${g.salientX} ${g.salientY-25}L${g.salientX+35} ${g.salientY}L${g.salientX} ${g.salientY+25}L${g.frontX} ${g.frontBottom}Z`} />
        <path className="enemy" d={`M${g.enemyEdge} 18L675 18L675 192L${g.enemyEdge} 192L${g.salientX+35} ${g.salientY}Z`} />
        <path className={`corridor ${routeBroken?"broken":""}`} d={`M${g.friendlyEdge-12} ${g.routeY-10}L${g.salientX} ${g.salientY-22}M${g.friendlyEdge-12} ${g.routeY+10}L${g.salientX} ${g.salientY+22}`} />
        <path className="front-line" d={`M${g.frontX} ${g.frontTop}L${g.frontX} 105L${g.frontX} ${g.frontBottom}`} />
        <path className="formation-arrow primary" markerEnd={`url(#friendly-arrow-${variant})`} d={`M${g.friendlyEdge-70} ${g.reserveY}L${g.frontX-70} ${g.activeY+28}L${arrowEndX} ${arrowEndY}`} />
        <path className="formation-arrow adjacent" markerEnd={`url(#friendly-arrow-${variant})`} d={`M${g.friendlyEdge-40} ${g.reserveY-48}L${g.frontX-15} ${g.frontTop-12}L${g.salientX-5} ${g.salientY-42}`} />
        <path className="enemy-formation-arrow" markerEnd={`url(#enemy-arrow-${variant})`} d={`M${g.enemyEdge+72} ${g.salientY+46}L${g.enemyEdge-10} ${g.salientY+20}L${g.salientX+42} ${g.salientY+8}`} />
        <rect className="formation friendly-unit" x={g.friendlyEdge-92} y={g.reserveY-10} width="42" height="20" /><text x={g.friendlyEdge-71} y={g.reserveY+4}>RES</text>
        <rect className="formation active" x={g.salientX-17} y={g.activeY-10} width="42" height="20" /><text x={g.salientX+4} y={g.activeY+4}>18th</text>
        {relayMission&&<g className="emitter"><rect x={g.enemyEdge+36} y={54+g.entropy*35} width="12" height="12"/><rect x={g.enemyEdge+40} y={58+g.entropy*35} width="4" height="4"/></g>}
        <text className="enemy-label" x={g.enemyEdge+25} y={48+g.entropy*35}>{relayMission?"RELAY":"FIRES"}</text>
        <text className="caption" x="24" y="207">{situation.sector.toUpperCase()} // {g.dispatch} // FRONT {s.front>=0?"+":""}{s.front.toFixed(1)} KM</text>
        <text className="subcaption" x="24" y="222">{situation.terrain.toUpperCase()} // {situation.ground.toUpperCase()} // SUPPLY {sector.supplyAccess.toFixed(0)} // NETWORK {sector.network.toUpperCase()}</text>
      </svg>
      <div className="briefing-map-legend">
        <span><i className="friendly" />FRIENDLY / FORMATION MOVEMENT</span>
        <span><i className="salient" />MUTABLE FRONT / SALIENT</span>
        <span><i className="enemy" />ENEMY PRESSURE</span>
      </div>
    </div>
  );
}
