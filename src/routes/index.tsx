import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useSimulator } from "@/hooks/use-simulator";
import { StatCard } from "@/components/StatCard";

const TrafficMap = lazy(() =>
  import("@/components/TrafficMap").then((m) => ({ default: m.TrafficMap })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Traffic Map — Hà Đông" },
      { name: "description", content: "Live congestion and traffic-light state across Phường Hà Đông, Hà Nội." },
      { property: "og:title", content: "Live Traffic Map — Hà Đông" },
      { property: "og:description", content: "Real-time congestion overlay and intersection telemetry for Hà Đông." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const snap = useSimulator();
  const { stats } = snap;
  const travelStatus =
    stats.congestionScore < 0.3 ? { label: "CLEAR", tone: "good" as const }
    : stats.congestionScore < 0.6 ? { label: "MODERATE", tone: "warn" as const }
    : { label: "CONGESTED", tone: "bad" as const };

  return (
    <div className="h-screen flex flex-col">
      <header className="px-6 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Live Traffic — Phường Hà Đông</h1>
          <p className="text-xs text-muted-foreground font-mono">
            tick {snap.tick} · {snap.intersections.length} intersections monitored
          </p>
        </div>
        <div className="flex gap-3">
          <MiniStat label="Travel" value={travelStatus.label} tone={travelStatus.tone} />
          <MiniStat label="Vehicles" value={stats.totalVehicles} />
          <MiniStat label="Passed" value={stats.vehiclesPassed} />
          <MiniStat label="Avg wait" value={`${stats.avgWaitSeconds.toFixed(1)}s`} />
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        <Suspense fallback={<div className="grid place-items-center text-muted-foreground">Loading map…</div>}>
          <TrafficMap snapshot={snap} className="w-full h-full" />
        </Suspense>

        <aside className="border-l border-border bg-surface-1/40 backdrop-blur p-4 overflow-y-auto space-y-3">
          <h2 className="text-xs uppercase tracking-widest font-mono text-muted-foreground">Intersections</h2>
          <div className="grid gap-2">
            <StatCard label="Congestion" value={`${Math.round(stats.congestionScore * 100)}%`}
              tone={travelStatus.tone} />
            {stats.emergencyActive && (
              <div className="card-ops p-3 glow-red border-signal-red/50">
                <div className="text-xs uppercase font-mono text-signal-red">Emergency in progress</div>
                <div className="text-sm">Ambulance corridor active.</div>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            {snap.intersections.map((i) => {
              const q = i.approaches.N.queueLength + i.approaches.S.queueLength + i.approaches.E.queueLength + i.approaches.W.queueLength;
              return (
                <div key={i.id} className="card-ops p-2.5 text-xs">
                  <div className="font-medium truncate">{i.name}</div>
                  <div className="font-mono text-muted-foreground mt-1 flex justify-between">
                    <span>{i.algorithm}</span>
                    <span>Q:{q} P:{i.passed}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone = "default" }: { label: string; value: React.ReactNode; tone?: "default" | "good" | "warn" | "bad" }) {
  const c = tone === "good" ? "text-signal-green" : tone === "warn" ? "text-signal-amber" : tone === "bad" ? "text-signal-red" : "text-primary";
  return (
    <div className="card-ops px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{label}</div>
      <div className={`text-sm font-mono font-semibold ${c}`}>{value}</div>
    </div>
  );
}
