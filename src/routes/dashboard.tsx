import { createFileRoute } from "@tanstack/react-router";
import { useSimulator } from "@/hooks/use-simulator";
import { StatCard } from "@/components/StatCard";
import { TrafficLightIcon } from "@/components/TrafficLightIcon";
import { simulator } from "@/lib/sim/simulator";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — SmartTraffic" },
      { name: "description", content: "Realtime operations dashboard." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const snap = useSimulator();
  const isAdmin = true;

  const { stats } = snap;

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Operations Dashboard</h1>
        <p className="text-xs text-muted-foreground font-mono mt-1">
          tick {snap.tick} · open access
        </p>
      </header>


      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total vehicles" value={stats.totalVehicles} hint="queued + in transit" />
        <StatCard label="Passed" value={stats.vehiclesPassed} tone="good" />
        <StatCard label="Avg wait" value={`${stats.avgWaitSeconds.toFixed(1)}s`}
          tone={stats.avgWaitSeconds < 15 ? "good" : stats.avgWaitSeconds < 30 ? "warn" : "bad"} />
        <StatCard label="Congestion" value={`${Math.round(stats.congestionScore * 100)}%`}
          tone={stats.congestionScore < 0.3 ? "good" : stats.congestionScore < 0.6 ? "warn" : "bad"} />
      </div>

      {stats.emergencyActive && (
        <div className="card-ops glow-red border-signal-red/40 p-4">
          <div className="text-xs uppercase font-mono text-signal-red">Emergency active</div>
          <div className="text-sm mt-1">Ambulance corridor in progress. Lights are forced green along the route.</div>
        </div>
      )}

      <section className="card-ops overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Intersections</h2>
          {isAdmin && <span className="text-xs text-muted-foreground">Click an axis to force green</span>}
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase font-mono text-muted-foreground bg-surface-2/50">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Algo</th>
              <th className="text-left px-4 py-2">Lights</th>
              <th className="text-right px-4 py-2">N</th>
              <th className="text-right px-4 py-2">S</th>
              <th className="text-right px-4 py-2">E</th>
              <th className="text-right px-4 py-2">W</th>
              <th className="text-right px-4 py-2">Passed</th>
              {isAdmin && <th className="text-right px-4 py-2">Override</th>}
            </tr>
          </thead>
          <tbody>
            {snap.intersections.map((i) => (
              <tr key={i.id} className="border-t border-border/60">
                <td className="px-4 py-2.5">{i.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs uppercase">{i.algorithm}</td>
                <td className="px-4 py-2.5"><TrafficLightIcon intersection={i} /></td>
                <td className="px-4 py-2.5 text-right font-mono">{i.approaches.N.queueLength}</td>
                <td className="px-4 py-2.5 text-right font-mono">{i.approaches.S.queueLength}</td>
                <td className="px-4 py-2.5 text-right font-mono">{i.approaches.E.queueLength}</td>
                <td className="px-4 py-2.5 text-right font-mono">{i.approaches.W.queueLength}</td>
                <td className="px-4 py-2.5 text-right font-mono text-signal-green">{i.passed}</td>
                {isAdmin && (
                  <td className="px-4 py-2.5 text-right space-x-1">
                    <button
                      onClick={() => { simulator.manualOverride(i.id, "NS"); toast.success(`${i.name}: NS green`); }}
                      className="text-xs px-2 py-1 rounded border border-border hover:border-signal-green hover:text-signal-green"
                    >NS</button>
                    <button
                      onClick={() => { simulator.manualOverride(i.id, "EW"); toast.success(`${i.name}: EW green`); }}
                      className="text-xs px-2 py-1 rounded border border-border hover:border-signal-green hover:text-signal-green"
                    >EW</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

