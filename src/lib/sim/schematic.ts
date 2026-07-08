// Schematic traffic simulator.
// - Grid of intersections (circles).
// - Each intersection has 4 approach lanes (N/S/E/W).
// - Vehicles (red dots) spawn at the outer end of a lane and drive toward
//   the intersection. If the light for their axis is red, they stop behind
//   the car in front (or at the stop line). If green, they cross and exit.
// - Two algorithms control the lights: fixed-time and greedy (queue-based).

export type Direction = "N" | "S" | "E" | "W";
export const DIRS: Direction[] = ["N", "S", "E", "W"];

export type Algorithm = "fixed" | "greedy";
export type Phase = "NS" | "NS_AMBER" | "EW" | "EW_AMBER";

export interface SchemIntersection {
  id: string;
  name: string;
  /** Center position in canvas pixels. */
  x: number;
  y: number;
  algorithm: Algorithm;
  phase: Phase;
  phaseRemaining: number;
  passed: number;
  totalWait: number;
}

export interface SchemVehicle {
  id: number;
  interId: string;
  dir: Direction;
  /** 0..1 = spawn → stop line. 1..1.4 = crossing & exit. */
  progress: number;
  waited: number;
  priority: number;
}

export interface SchemSnapshot {
  tick: number;
  intersections: SchemIntersection[];
  vehicles: SchemVehicle[];
  stats: {
    total: number;
    passed: number;
    avgWait: number;
    congestion: number;
  };
  params: SimParams;
}

export interface SimParams {
  /** Vehicles per second per approach. */
  arrivalRate: number;
  /** Pixels per second along a lane. */
  speed: number;
  algorithm: Algorithm;
  running: boolean;
}

// Layout constants
export const LANE_LENGTH = 130;   // pixels from outer edge to stop line
export const EXIT_LENGTH = 55;    // pixels beyond stop line before despawn
export const MIN_GAP = 0.06;      // min progress spacing between cars in same lane
export const STOP_THRESHOLD = 0.97;

// Timing
const TICK_HZ = 20;
const TICK_MS = 1000 / TICK_HZ;
const AMBER = 2.5;
const FIXED_GREEN = 12;
const GREEDY_MIN = 6;
const GREEDY_MAX = 30;

function makeIntersections(): SchemIntersection[] {
  // 3 cols × 2 rows
  const cols = 3, rows = 2;
  const spacingX = 340, spacingY = 320;
  const offsetX = 200, offsetY = 200;
  const names = ["Nguyễn Trãi", "Trần Phú", "Quang Trung", "Lê Trọng Tấn", "Vạn Phúc", "Yết Kiêu"];
  const list: SchemIntersection[] = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      list.push({
        id: `i${idx + 1}`,
        name: names[idx] ?? `Node ${idx + 1}`,
        x: offsetX + c * spacingX,
        y: offsetY + r * spacingY,
        algorithm: "greedy",
        phase: "NS",
        phaseRemaining: FIXED_GREEN,
        passed: 0,
        totalWait: 0,
      });
      idx++;
    }
  }
  return list;
}

const isNSDir = (d: Direction) => d === "N" || d === "S";

export class SchematicSim {
  private intersections: SchemIntersection[] = makeIntersections();
  private vehicles: SchemVehicle[] = [];
  private nextId = 1;
  private tick = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private subs = new Set<(s: SchemSnapshot) => void>();
  params: SimParams = {
    arrivalRate: 0.4,
    speed: 60,
    algorithm: "greedy",
    running: true,
  };

  constructor() {
    // apply initial algorithm
    this.setAlgorithm(this.params.algorithm);
    this.start();
  }

  subscribe(fn: (s: SchemSnapshot) => void) {
    this.subs.add(fn);
    fn(this.snapshot());
    return () => this.subs.delete(fn);
  }

  setParam<K extends keyof SimParams>(k: K, v: SimParams[K]) {
    this.params[k] = v;
    if (k === "algorithm") this.setAlgorithm(v as Algorithm);
    if (k === "running") {
      if (v) this.start(); else this.stop();
    }
    this.emit();
  }

  setAlgorithm(a: Algorithm) {
    for (const i of this.intersections) i.algorithm = a;
  }

  inject(interId: string, dir: Direction, count: number) {
    const inter = this.intersections.find((x) => x.id === interId);
    if (!inter) return;
    // Place them near the outer end, spaced.
    for (let k = 0; k < count; k++) {
      this.vehicles.push({
        id: this.nextId++,
        interId,
        dir,
        progress: 0.02 + k * MIN_GAP * 0.9,
        waited: 0,
        priority: 0,
      });
    }
    this.emit();
  }

  floodAll(count = 3) {
    for (const i of this.intersections) {
      for (const d of DIRS) this.inject(i.id, d, count);
    }
  }

  reset() {
    this.stop();
    this.vehicles = [];
    this.tick = 0;
    for (const i of this.intersections) {
      i.passed = 0;
      i.totalWait = 0;
      i.phase = "NS";
      i.phaseRemaining = FIXED_GREEN;
    }
    this.start();
    this.emit();
  }

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => this.step(), TICK_MS);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  snapshot(): SchemSnapshot {
    const queued = this.vehicles.filter((v) => v.progress < STOP_THRESHOLD - 0.001 && v.waited > 0.5).length;
    const totalWait = this.intersections.reduce((a, i) => a + i.totalWait, 0);
    const passed = this.intersections.reduce((a, i) => a + i.passed, 0);
    return {
      tick: this.tick,
      intersections: this.intersections.map((i) => ({ ...i })),
      vehicles: this.vehicles.slice(),
      stats: {
        total: this.vehicles.length,
        passed,
        avgWait: passed > 0 ? totalWait / passed : 0,
        congestion: Math.min(1, queued / 60),
      },
      params: { ...this.params },
    };
  }

  private emit() {
    const snap = this.snapshot();
    this.subs.forEach((fn) => fn(snap));
  }

  private step() {
    this.tick++;
    const dt = 1 / TICK_HZ;
    const p = this.params;

    // 1. Spawn
    for (const inter of this.intersections) {
      for (const d of DIRS) {
        if (Math.random() < p.arrivalRate * dt) {
          // Only spawn if outer area is clear
          const laneCars = this.vehicles.filter((v) => v.interId === inter.id && v.dir === d);
          const minProg = laneCars.reduce((m, v) => Math.min(m, v.progress), 1);
          if (minProg > MIN_GAP + 0.01) {
            this.vehicles.push({
              id: this.nextId++,
              interId: inter.id,
              dir: d,
              progress: 0,
              waited: 0,
              priority: 0,
            });
          }
        }
      }
    }

    // 2. Advance intersections (phase countdown + algorithm)
    for (const inter of this.intersections) {
      inter.phaseRemaining -= dt;
      if (inter.phaseRemaining <= 0) this.advancePhase(inter);
    }

    // 3. Move vehicles
    // Group by (inter, dir), sort by progress desc so each car knows the car in front.
    const groups = new Map<string, SchemVehicle[]>();
    for (const v of this.vehicles) {
      const k = `${v.interId}:${v.dir}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(v);
    }

    const speedProg = p.speed / LANE_LENGTH; // progress per second

    for (const [k, list] of groups) {
      list.sort((a, b) => b.progress - a.progress);
      const [interId, dir] = k.split(":") as [string, Direction];
      const inter = this.intersections.find((i) => i.id === interId);
      if (!inter) continue;
      const green = isGreenFor(inter.phase, dir);

      for (let idx = 0; idx < list.length; idx++) {
        const v = list[idx];
        const ahead = list[idx - 1];
        // Max progress allowed
        let maxProg = ahead ? ahead.progress - MIN_GAP : 100;
        // If light not green, cannot pass stop line
        if (!green && v.progress < STOP_THRESHOLD) {
          maxProg = Math.min(maxProg, STOP_THRESHOLD);
        }
        const target = v.progress + speedProg * dt;
        if (target <= maxProg) {
          v.progress = target;
        } else {
          // Blocked
          v.progress = Math.max(v.progress, Math.min(target, maxProg));
          v.waited += dt;
          inter.totalWait += dt;
        }
      }
    }

    // 4. Mark passed & despawn
    const remaining: SchemVehicle[] = [];
    for (const v of this.vehicles) {
      const inter = this.intersections.find((i) => i.id === v.interId);
      if (!inter) continue;
      if (v.progress >= 1.0 && v.progress - (v as any)._passed_prog !== undefined) {
        // (no-op) fallback
      }
      remaining.push(v);
    }
    // Simpler: count passes by tracking crossings
    for (const v of this.vehicles) {
      // mark crossed the first time it exceeds 1.0
      const anyV = v as SchemVehicle & { _counted?: boolean };
      if (!anyV._counted && v.progress >= 1.0) {
        anyV._counted = true;
        const inter = this.intersections.find((i) => i.id === v.interId);
        if (inter) inter.passed++;
      }
    }
    this.vehicles = this.vehicles.filter((v) => v.progress < 1.4);

    this.emit();
  }

  private advancePhase(inter: SchemIntersection) {
    const next = (phase: Phase): Phase =>
      phase === "NS" ? "NS_AMBER"
      : phase === "NS_AMBER" ? "EW"
      : phase === "EW" ? "EW_AMBER"
      : "NS";
    inter.phase = next(inter.phase);
    if (inter.phase.endsWith("AMBER")) {
      inter.phaseRemaining = AMBER;
      return;
    }
    // Green phase entering
    inter.phaseRemaining = this.greenDuration(inter);
  }

  private greenDuration(inter: SchemIntersection): number {
    if (inter.algorithm === "fixed") return FIXED_GREEN;
    // greedy: length ∝ queue on that axis
    const axis = inter.phase === "NS" ? ["N", "S"] as const : ["E", "W"] as const;
    let q = 0;
    for (const v of this.vehicles) {
      if (v.interId !== inter.id) continue;
      if (!(axis as readonly string[]).includes(v.dir)) continue;
      if (v.progress < STOP_THRESHOLD) q++;
    }
    const dur = GREEDY_MIN + q * 1.5;
    return Math.max(GREEDY_MIN, Math.min(GREEDY_MAX, dur));
  }
}

export function isGreenFor(phase: Phase, dir: Direction): boolean {
  const onNS = isNSDir(dir);
  if (phase === "NS") return onNS;
  if (phase === "EW") return !onNS;
  return false; // amber = stop for both
}

// HMR-safe singleton
declare global {
  // eslint-disable-next-line no-var
  var __schematic_sim: SchematicSim | undefined;
}
export const schematicSim: SchematicSim =
  globalThis.__schematic_sim ?? (globalThis.__schematic_sim = new SchematicSim());
