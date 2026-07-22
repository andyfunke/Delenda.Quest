"use client";

import { situationForState, type GameState } from "./game";

type Props={s:GameState;variant?:"briefing"|"command"};
const positions=[{x:90,y:62},{x:270,y:48},{x:455,y:66},{x:170,y:160},{x:355,y:155},{x:585,y:145}];

export function TheaterGeometry({s,variant="briefing"}:Props){
  const sectors=s.theaterSectors.filter(sector=>sector.theater===s.theater);const active=situationForState(s).sectorId;
  const indexed=new Map(sectors.map((sector,index)=>[sector.id,positions[index%positions.length]]));
  const edges=sectors.flatMap(sector=>sector.neighbors.filter(neighbor=>sector.id<neighbor&&indexed.has(neighbor)).map(neighbor=>({from:indexed.get(sector.id)!,to:indexed.get(neighbor)!,id:`${sector.id}:${neighbor}`})));
  const front=Math.max(35,Math.min(665,350+s.front/12*285));
  return <div className={`theater-geometry ${variant}`}>
    <svg viewBox="0 0 700 220" role="img" aria-label={`${s.theater} theater sector graph, front ${s.front>=0?"+":""}${s.front.toFixed(1)} kilometers`}>
      <rect className="geometry-ground" width="700" height="220"/>
      <g className="geometry-grid"><path d="M100 0v220M200 0v220M300 0v220M400 0v220M500 0v220M600 0v220M0 55h700M0 110h700M0 165h700"/></g>
      <g className="geometry-edges">{edges.map(edge=><line key={edge.id} x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y}/>)}</g>
      <line className="geometry-front" x1={front} y1="20" x2={front} y2="195"/>
      <g className="geometry-sectors">{sectors.map((sector,index)=>{const point=positions[index%positions.length],tone=sector.control>.2?"friendly":sector.control<-.2?"enemy":"contested";return <g className={`${tone} ${sector.id===active?"active":""}`} key={sector.id} transform={`translate(${point.x} ${point.y})`}><path d="M-43 -19H31L44 0L31 19H-43L-54 0Z"/><circle r="4"/><text y="4">{sector.name.toUpperCase().slice(0,17)}</text><text className="geometry-sub" y="32">{sector.network.toUpperCase()} // {Math.round(sector.supplyAccess)} SUPPLY</text></g>})}</g>
      <text className="geometry-caption" x="20" y="211">{s.theater.toUpperCase()} THEATER // ACTIVE {sectors.find(sector=>sector.id===active)?.name.toUpperCase()??"UNCLASSIFIED"} // FRONT {s.front>=0?"+":""}{s.front.toFixed(1)} KM</text>
    </svg>
    <div className="theater-geometry-legend"><span><i className="friendly"/>FRIENDLY CONTROL</span><span><i className="contested"/>CONTESTED</span><span><i className="enemy"/>ENEMY CONTROL</span><b>LINES // SECTOR DEPENDENCIES</b></div>
  </div>;
}
