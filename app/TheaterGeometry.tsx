"use client";

import { situationForState, type GameState } from "./game";

type Props = { s: GameState; variant?: "briefing" | "command" };

export function TheaterGeometry({ s, variant = "briefing" }: Props) {
  const situation = situationForState(s);
  return (
    <div className={`theater-plate briefing-plate ${variant}`}>
      <svg
        viewBox="0 0 700 210"
        role="img"
        aria-label={`${s.theater} theater situation map, active sector ${situation.sector}, intelligence ${s.intelligence.toFixed(0)} percent`}
      >
        <rect className="plate-ground" width="700" height="210" />
        <g className="grid">
          <path d="M100 0v210M200 0v210M300 0v210M400 0v210M500 0v210M600 0v210M0 52h700M0 105h700M0 158h700" />
        </g>
        <path className="friendly" d="M40 20L240 20L300 105L240 190L40 190Z" />
        <path className="salient" d="M300 105L430 70L470 105L430 140Z" />
        <path className="enemy" d="M520 20L670 20L670 190L520 190L470 105Z" />
        <path className="corridor" d="M240 92L430 70M240 118L430 140" />
        <line className="interdiction" x1="240" y1="52" x2="520" y2="52" />
        <g className="interdiction-mark">
          <line x1="330" y1="44" x2="346" y2="60" />
          <line x1="346" y1="44" x2="330" y2="60" />
          <line x1="410" y1="44" x2="426" y2="60" />
          <line x1="426" y1="44" x2="410" y2="60" />
        </g>
        <rect
          className="formation friendly-unit"
          x="150"
          y="90"
          width="34"
          height="20"
        />
        <text x="167" y="104">
          RES
        </text>
        <rect
          className="formation active"
          x="425"
          y="95"
          width="34"
          height="20"
        />
        <text x="442" y="109">
          18th
        </text>
        <g className="emitter">
          <circle cx="590" cy="70" r="6" />
          <circle cx="590" cy="70" r="2" />
        </g>
        <text className="enemy-label" x="590" y="56">
          EMITTER?
        </text>
        <text className="caption" x="30" y="204">
          {situation.sector.toUpperCase()} — {situation.ground.toUpperCase()} —
          INTEL {s.intelligence.toFixed(0)}%
        </text>
      </svg>
      <div className="briefing-map-legend">
        <span>
          <i className="friendly" />
          FRIENDLY
        </span>
        <span>
          <i className="salient" />
          SALIENT / CORRIDOR
        </span>
        <span>
          <i className="enemy" />
          ENEMY / INTERDICTED
        </span>
      </div>
    </div>
  );
}
