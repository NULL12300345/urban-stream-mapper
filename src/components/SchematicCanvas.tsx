// SVG schematic renderer: intersections as circles, red dots as vehicles
// travelling along 4 approach lanes.

import { useEffect, useState } from "react";
import {
  DIRS,
  LANE_LENGTH,
  EXIT_LENGTH,
  isGreenFor,
  schematicSim,
  type Direction,
  type SchemIntersection,
  type SchemSnapshot,
  type SchemVehicle,
} from "@/lib/sim/schematic";

interface Props {
  snapshot: SchemSnapshot;
  className?: string;
}

// Vector for each approach direction: unit vector from stop line → outer end.
// "N" means car comes FROM the north, so lane extends upward from the center.
const DIR_VEC: Record<Direction, { x: number; y: number }> = {
  N: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  E: { x: 1, y: 0 },
  W: { x: -1, y: 0 },
};

const STOP_LINE_OFFSET = 22; // px from center where the stop line sits

function laneEndpoints(inter: SchemIntersection, dir: Direction) {
  const v = DIR_VEC[dir];
  const stopX = inter.x + v.x * STOP_LINE_OFFSET;
  const stopY = inter.y + v.y * STOP_LINE_OFFSET;
  const outerX = inter.x + v.x * (STOP_LINE_OFFSET + LANE_LENGTH);
  const outerY = inter.y + v.y * (STOP_LINE_OFFSET + LANE_LENGTH);
  const exitX = inter.x - v.x * (STOP_LINE_OFFSET + EXIT_LENGTH);
  const exitY = inter.y - v.y * (STOP_LINE_OFFSET + EXIT_LENGTH);
  return { stopX, stopY, outerX, outerY, exitX, exitY };
}

function vehiclePos(inter: SchemIntersection, v: SchemVehicle) {
  const { stopX, stopY, outerX, outerY, exitX, exitY } = laneEndpoints(inter, v.dir);
  if (v.progress <= 1) {
    // From outer → stop line
    const t = v.progress;
    return {
      x: outerX + (stopX - outerX) * t,
      y: outerY + (stopY - outerY) * t,
    };
  }
  // Crossing & exit: stop line → opposite side
  const t = Math.min(1, (v.progress - 1) / 0.4);
  return {
    x: stopX + (exitX - stopX) * t,
    y: stopY + (exitY - stopY) * t,
  };
}

function lightColor(inter: SchemIntersection, axis: "NS" | "EW"): string {
  if (inter.phase === "NS_AMBER" || inter.phase === "EW_AMBER") return "#f5b400";
  const dir: Direction = axis === "NS" ? "N" : "E";
  return isGreenFor(inter.phase, dir) ? "#22e07a" : "#ef4444";
}

export function SchematicCanvas({ snapshot, className }: Props) {
  const width = 1080;
  const height = 720;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      style={{ background: "hsl(220 25% 6%)" }}
    >
      {/* Roads (draw first, under nodes) */}
      {snapshot.intersections.map((i) =>
        DIRS.map((d) => {
          const { stopX, stopY, outerX, outerY, exitX, exitY } = laneEndpoints(i, d);
          return (
            <g key={`${i.id}-${d}`}>
              {/* incoming lane */}
              <line
                x1={outerX} y1={outerY} x2={stopX} y2={stopY}
                stroke="hsl(220 15% 22%)" strokeWidth={16} strokeLinecap="round"
              />
              {/* outgoing exit */}
              <line
                x1={stopX} y1={stopY} x2={exitX} y2={exitY}
                stroke="hsl(220 15% 18%)" strokeWidth={10} strokeLinecap="round" opacity={0.5}
              />
              {/* center dashed line */}
              <line
                x1={outerX} y1={outerY} x2={stopX} y2={stopY}
                stroke="hsl(48 90% 55% / 0.35)" strokeWidth={1}
                strokeDasharray="4 6"
              />
              {/* stop-line light indicator */}
              <circle
                cx={stopX} cy={stopY} r={3.5}
                fill={lightColor(i, d === "N" || d === "S" ? "NS" : "EW")}
              />
            </g>
          );
        })
      )}

      {/* Vehicles */}
      {snapshot.vehicles.map((v) => {
        const inter = snapshot.intersections.find((x) => x.id === v.interId);
        if (!inter) return null;
        const { x, y } = vehiclePos(inter, v);
        return (
          <circle
            key={v.id}
            cx={x} cy={y} r={4.5}
            fill="#ef4444"
            stroke="#fff2f2"
            strokeWidth={0.6}
            style={{ filter: "drop-shadow(0 0 4px #ef4444)" }}
          />
        );
      })}

      {/* Intersection nodes */}
      {snapshot.intersections.map((i) => {
        const nsC = lightColor(i, "NS");
        const ewC = lightColor(i, "EW");
        return (
          <g key={i.id}>
            <circle cx={i.x} cy={i.y} r={26} fill="hsl(220 20% 12%)" stroke="hsl(190 80% 55%)" strokeWidth={1.5} />
            {/* NS light (top-bottom half arc) */}
            <path
              d={`M ${i.x - 20} ${i.y} A 20 20 0 0 1 ${i.x + 20} ${i.y}`}
              fill="none" stroke={nsC} strokeWidth={4} strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${nsC})` }}
            />
            {/* EW light (bottom half arc) */}
            <path
              d={`M ${i.x + 20} ${i.y} A 20 20 0 0 1 ${i.x - 20} ${i.y}`}
              fill="none" stroke={ewC} strokeWidth={4} strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${ewC})` }}
            />
            <text
              x={i.x} y={i.y - 34}
              textAnchor="middle"
              fill="hsl(190 60% 75%)"
              fontSize={11}
              fontFamily="Inter, sans-serif"
              fontWeight={600}
            >{i.name}</text>
            <text
              x={i.x} y={i.y + 44}
              textAnchor="middle"
              fill="hsl(220 10% 60%)"
              fontSize={9}
              fontFamily="'JetBrains Mono', monospace"
            >{i.phase} · {i.phaseRemaining.toFixed(1)}s</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Hook to subscribe to the schematic simulator. */
export function useSchematic(): SchemSnapshot {
  const [snap, setSnap] = useState<SchemSnapshot>(() => schematicSim.snapshot());
  useEffect(() => {
    const unsub = schematicSim.subscribe(setSnap);
    return () => { unsub(); };
  }, []);
  return snap;
}
