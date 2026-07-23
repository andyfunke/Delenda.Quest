"use client";

import {
  maneuverById,
  projectOperations,
  situationForState,
  type GameState,
} from "./game";

type Props = { s: GameState; variant?: "briefing" | "command" };
type Point = readonly [number, number];
type Primitive = "rectangle" | "trapezoid" | "rhombus" | "triangle";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));
const quantize = (value: number, step = 10) =>
  Math.round(value / step) * step;
const hash = (text: string) => {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) / 4294967295;
};
const pointList = (points: readonly Point[]) =>
  points.map(([x, y]) => `${x},${y}`).join(" ");
const segmentIsEuclidean = (left: Point, right: Point) => {
  const dx = Math.abs(right[0] - left[0]);
  const dy = Math.abs(right[1] - left[1]);
  return dx === 0 || dy === 0 || dx === dy;
};
export const geometrySegmentsAreValid = (
  points: readonly Point[],
  closed = false,
) => {
  const pairs = points.slice(1).map((point, index) => [points[index], point] as const);
  if (closed && points.length > 2)
    pairs.push([points.at(-1)!, points[0]] as const);
  return pairs.every(([left, right]) => segmentIsEuclidean(left, right));
};
const beveledRectangle = (
  x: number,
  y: number,
  width: number,
  height: number,
  bevel = 10,
): Point[] => {
  const safeBevel = Math.min(bevel, width / 2, height / 2);
  return [
    [x + safeBevel, y],
    [x + width - safeBevel, y],
    [x + width, y + safeBevel],
    [x + width, y + height - safeBevel],
    [x + width - safeBevel, y + height],
    [x + safeBevel, y + height],
    [x, y + height - safeBevel],
    [x, y + safeBevel],
  ];
};

export type TheaterGeometryModel = {
  friendly: Point[];
  enemy: Point[];
  front: Point[];
  activeSurface: Point[];
  corridor: Point[];
  friendlyArrow: Point[];
  adjacentArrow: Point[];
  enemyArrow: Point[];
  primitive: Primitive;
  posture: "advance" | "hold" | "withdraw" | "disperse";
  dispatch: string;
  entropy: number;
  committed: number;
  frontageDemand: number;
  frontageRatio: number;
  committedSurfacePercent: number;
  routeY: number;
  relayMission: boolean;
  routeBroken: boolean;
};

const primitiveFor = (terrain: string): Primitive => {
  const value = terrain.toLowerCase();
  if (value.includes("ridge") || value.includes("height")) return "triangle";
  if (value.includes("river") || value.includes("crossing")) return "rhombus";
  if (
    value.includes("industrial") ||
    value.includes("foundry") ||
    value.includes("worker")
  )
    return "rectangle";
  return "trapezoid";
};

export const compileTheaterGeometry = (
  state: GameState,
): TheaterGeometryModel => {
  const situation = situationForState(state);
  const sector =
    state.theaterSectors.find((item) => item.id === situation.sectorId) ??
    state.theaterSectors[0];
  const latest = [...state.situationHistory].sort((left, right) => right.day - left.day)[0];
  const maneuverId = state.maneuver ?? latest?.maneuverId ?? null;
  const maneuver = maneuverById(maneuverId);
  const operation = projectOperations(state, maneuver ?? null);
  const entropy = hash(
    `${state.campaignSeed}:${state.day}:${sector.id}:${sector.ground}:${sector.network}:${Math.round(sector.supplyAccess)}:${Math.round(state.front * 10)}`,
  );
  const frontX = quantize(
    clamp(350 + state.front * 8 + sector.control * 40, 270, 470),
  );
  const frontDogleg = entropy >= 0.5 ? 20 : -20;
  const front: Point[] = [
    [frontX, 20],
    [frontX + frontDogleg, 40],
    [frontX + frontDogleg, 190],
    [frontX, 210],
  ];
  const friendly: Point[] = [
    [20, 20],
    ...front,
    [20, 210],
  ];
  const enemy: Point[] = [
    [frontX, 20],
    [680, 20],
    [680, 210],
    [frontX, 210],
    [frontX + frontDogleg, 190],
    [frontX + frontDogleg, 40],
  ];
  const frontageRatio = operation.committed / Math.max(1, operation.frontageDemand);
  const surfaceWidth = quantize(clamp(50 + frontageRatio * 45, 60, 130));
  const surfaceHeight = quantize(
    clamp(50 + operation.commitmentShare * 110, 60, 150),
  );
  const posture =
    maneuverId === "abandon"
      ? "withdraw"
      : maneuverId === "exploit" || maneuverId === "breach"
        ? "advance"
        : maneuverId === "network"
          ? "disperse"
          : "hold";
  const surfaceDirection = posture === "withdraw" ? -1 : posture === "advance" ? 1 : 0;
  const surfaceX = quantize(
    clamp(
      frontX + frontDogleg + surfaceDirection * 30 - surfaceWidth / 2,
      180,
      520,
    ),
  );
  const surfaceY = quantize(clamp(115 - surfaceHeight / 2, 40, 130));
  const activeSurface = beveledRectangle(
    surfaceX,
    surfaceY,
    surfaceWidth,
    surfaceHeight,
    10,
  );
  const routeY = quantize(clamp(120 + (50 - sector.supplyAccess) * 0.4, 70, 170));
  const activeCenterX = quantize(surfaceX + surfaceWidth / 2);
  const activeCenterY = quantize(surfaceY + surfaceHeight / 2);
  const corridor: Point[] = [
    [50, routeY],
    [frontX - 60, routeY],
    [frontX - 40, routeY + 20],
    [activeCenterX, routeY + 20],
  ];
  const friendlyArrow: Point[] = [
    [90, 160],
    [170, 160],
    [190, 140],
    [activeCenterX - 20, 140],
    [activeCenterX, 120],
  ];
  const adjacentArrow: Point[] = [
    [90, 70],
    [180, 70],
    [200, 50],
    [frontX - 20, 50],
  ];
  const enemyArrow: Point[] = [
    [620, 170],
    [560, 170],
    [540, 150],
    [activeCenterX + 20, 150],
    [activeCenterX, 130],
  ];
  const activeFacts = state.operationalFacts.filter(
    (fact) =>
      fact.visible &&
      (fact.sectorId === sector.id || fact.sectorId === null) &&
      (fact.expiresDay === null || fact.expiresDay >= state.day),
  );
  const routeBroken =
    sector.supplyAccess < 42 ||
    activeFacts.some((fact) =>
      /infrastructure_severed|enemy_fires_registered/.test(fact.id),
    );
  const relayMission =
    situation.problemClass === "command" ||
    /relay|network/.test(`${situation.blueprintId}:${situation.headline}`.toLowerCase());
  const dispatch =
    maneuverId === "reinforce"
      ? "RESERVE TO CENTER"
      : maneuverId === "interdict"
        ? "FIRES ACROSS FRONT"
        : maneuverId === "route"
          ? "OPEN ADJACENT ROUTE"
          : maneuverId === "abandon"
            ? "FORMATION WITHDRAWAL"
            : maneuverId === "exploit"
              ? "MOBILE FORCE FORWARD"
              : maneuverId === "breach"
                ? "ASSAULT THROUGH CENTER"
                : maneuverId === "network"
                  ? "RELAYS DISPERSED"
                  : "FORMATION HOLDING";
  const geometryContract = [
    [friendly, true],
    [enemy, true],
    [front, false],
    [activeSurface, true],
    [corridor, false],
    [friendlyArrow, false],
    [adjacentArrow, false],
    [enemyArrow, false],
  ] as const;
  if (
    !geometryContract.every(([points, closed]) =>
      geometrySegmentsAreValid(points, closed),
    )
  )
    throw new Error("Theater geometry violated the 45/90-degree angle contract.");
  return {
    friendly,
    enemy,
    front,
    activeSurface,
    corridor,
    friendlyArrow,
    adjacentArrow,
    enemyArrow,
    primitive: primitiveFor(sector.terrain),
    posture,
    dispatch,
    entropy,
    committed: operation.committed,
    frontageDemand: operation.frontageDemand,
    frontageRatio,
    committedSurfacePercent: clamp(frontageRatio * 100, 0, 180),
    routeY,
    relayMission,
    routeBroken,
  };
};

function TerrainMark({
  primitive,
  index,
}: {
  primitive: Primitive;
  index: number;
}) {
  const x = 245 + index * 70;
  if (primitive === "triangle")
    return <polygon points={`${x},185 ${x + 25},160 ${x + 50},185`} />;
  if (primitive === "rhombus")
    return <polygon points={`${x + 25},155 ${x + 50},180 ${x + 25},205 ${x},180`} />;
  if (primitive === "trapezoid")
    return <polygon points={`${x + 10},160 ${x + 40},160 ${x + 50},170 ${x + 50},195 ${x},195 ${x},170`} />;
  return <rect x={x} y="165" width="45" height="30" />;
}

export function TheaterGeometry({
  s,
  variant = "briefing",
}: Props) {
  const situation = situationForState(s);
  const sector =
    s.theaterSectors.find((item) => item.id === situation.sectorId) ??
    s.theaterSectors[0];
  const geometry = compileTheaterGeometry(s);
  return (
    <div
      className={`theater-plate briefing-plate ${variant} posture-${geometry.posture}`}
      data-geometry={`${sector.id}:${geometry.posture}:${Math.round(geometry.entropy * 100)}`}
      data-angle-contract="45-90-only"
      data-committed-surface={geometry.committedSurfacePercent.toFixed(1)}
    >
      <svg
        viewBox="0 0 700 250"
        role="img"
        aria-label={`${s.theater} theater deterministic geometry, ${geometry.dispatch.toLowerCase()}, active sector ${situation.sector}`}
      >
        <defs>
          <marker
            id={`friendly-arrow-${variant}`}
            viewBox="0 0 10 20"
            refX="10"
            refY="10"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path className="arrow-head" d="M0 0L10 10L0 20Z" />
          </marker>
          <marker
            id={`enemy-arrow-${variant}`}
            viewBox="0 0 10 20"
            refX="10"
            refY="10"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path className="enemy-arrow-head" d="M0 0L10 10L0 20Z" />
          </marker>
        </defs>
        <rect className="plate-ground" width="700" height="250" />
        <g className="grid">
          <path d="M100 0V220M200 0V220M300 0V220M400 0V220M500 0V220M600 0V220M0 55H700M0 110H700M0 165H700" />
        </g>
        <polygon className="friendly" points={pointList(geometry.friendly)} />
        <polygon className="enemy" points={pointList(geometry.enemy)} />
        <polygon className="salient" points={pointList(geometry.activeSurface)} />
        <polyline
          className={`corridor ${geometry.routeBroken ? "broken" : ""}`}
          points={pointList(geometry.corridor)}
        />
        <polyline className="front-line" points={pointList(geometry.front)} />
        <polyline
          className="formation-arrow primary"
          markerEnd={`url(#friendly-arrow-${variant})`}
          points={pointList(geometry.friendlyArrow)}
        />
        <polyline
          className="formation-arrow adjacent"
          markerEnd={`url(#friendly-arrow-${variant})`}
          points={pointList(geometry.adjacentArrow)}
        />
        <polyline
          className="enemy-formation-arrow"
          markerEnd={`url(#enemy-arrow-${variant})`}
          points={pointList(geometry.enemyArrow)}
        />
        <g className={`terrain-marks ${geometry.primitive}`}>
          <TerrainMark primitive={geometry.primitive} index={0} />
          <TerrainMark primitive={geometry.primitive} index={1} />
        </g>
        <rect className="formation friendly-unit" x="70" y="150" width="40" height="20" />
        <text x="90" y="164">RES</text>
        <rect
          className="formation active"
          x={geometry.activeSurface[0][0] + 5}
          y={geometry.activeSurface[0][1] + 15}
          width="40"
          height="20"
        />
        <text
          x={geometry.activeSurface[0][0] + 25}
          y={geometry.activeSurface[0][1] + 29}
        >
          18th
        </text>
        {geometry.relayMission && (
          <g className="emitter">
            <rect x="565" y="55" width="20" height="20" />
            <rect x="570" y="60" width="10" height="10" />
          </g>
        )}
        <text className="enemy-label" x="575" y="45">
          {geometry.relayMission ? "RELAY OBJECTIVE" : "ENEMY POSITION"}
        </text>
        <text className="caption" x="24" y="232">
          {situation.sector.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
