// Core simulation types.
// The simulator is deterministic per tick — given the same intersections and
// random seed it produces the same vehicle flow. See `simulator.ts`.

export type Direction = "N" | "S" | "E" | "W";
export const DIRECTIONS: Direction[] = ["N", "S", "E", "W"];

export type Algorithm = "fixed" | "greedy";
export type LightState = "green" | "amber" | "red";

export interface IntersectionConfig {
  id: string;
  name: string;
  lat: number;
  lng: number;
  algorithm: Algorithm;
}

export interface ApproachState {
  direction: Direction;
  queueLength: number;          // vehicles waiting
  light: LightState;
  /** Seconds remaining in the current light phase. */
  remaining: number;
}

export interface IntersectionState {
  id: string;
  name: string;
  lat: number;
  lng: number;
  algorithm: Algorithm;
  /** Currently green axis: "NS" or "EW". Amber transitions between them. */
  phase: "NS" | "EW" | "NS_AMBER" | "EW_AMBER";
  phaseRemaining: number;
  approaches: Record<Direction, ApproachState>;
  /** Total vehicles that have passed through this intersection. */
  passed: number;
  /** Accumulated wait seconds across all vehicles that have passed. */
  totalWaitSeconds: number;
  /** True when emergency override has forced lights. */
  emergencyOverride: boolean;
}

export interface Vehicle {
  id: string;
  intersectionId: string;
  direction: Direction;       // direction of approach into intersection
  speed: number;              // m/s (0 when queued)
  destination: Direction;     // exit direction
  waitingTime: number;        // seconds spent waiting
  priority: number;           // 0=normal, 10=ambulance
  /** Offset from intersection center in meters along approach axis. */
  offset: number;
}

export interface SimStats {
  totalVehicles: number;
  vehiclesPassed: number;
  avgWaitSeconds: number;
  congestionScore: number; // 0..1
  emergencyActive: boolean;
}

export interface SimSnapshot {
  tick: number;
  timestamp: number;
  intersections: IntersectionState[];
  vehicles: Vehicle[];
  stats: SimStats;
}
