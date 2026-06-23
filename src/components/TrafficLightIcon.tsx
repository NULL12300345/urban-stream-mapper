import type { IntersectionState } from "@/lib/sim/types";

export function TrafficLightIcon({ intersection: i }: { intersection: IntersectionState }) {
  const nsActive = i.phase.startsWith("NS");
  const amber = i.phase.endsWith("AMBER");
  const nsColor = amber && nsActive ? "amber" : nsActive ? "green" : "red";
  const ewColor = amber && !nsActive ? "amber" : !nsActive ? "green" : "red";
  return (
    <div className="flex gap-2 items-center font-mono text-xs">
      <Pill axis="NS" color={nsColor} />
      <Pill axis="EW" color={ewColor} />
    </div>
  );
}

function Pill({ axis, color }: { axis: string; color: "green" | "amber" | "red" }) {
  const c =
    color === "green" ? "bg-signal-green/20 text-signal-green border-signal-green/40"
    : color === "amber" ? "bg-signal-amber/20 text-signal-amber border-signal-amber/40"
    : "bg-signal-red/20 text-signal-red border-signal-red/40";
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 ${c}`}>
      <span className="size-1.5 rounded-full" style={{ background: "currentColor" }} />
      {axis}
    </span>
  );
}
