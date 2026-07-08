import { createFileRoute } from "@tanstack/react-router";
import { SchematicCanvas, useSchematic } from "@/components/SchematicCanvas";
import { schematicSim, DIRS, type Algorithm, type Direction } from "@/lib/sim/schematic";
import { StatCard } from "@/components/StatCard";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — SmartTraffic" },
      { name: "description", content: "Realtime traffic simulation dashboard." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const snap = useSchematic();
  const p = snap.params;

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Traffic Simulation</h1>
        <p className="text-xs text-muted-foreground font-mono mt-1">
          tick {snap.tick} · {p.running ? "running" : "paused"} · algo <span className="text-primary">{p.algorithm}</span>
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Cars on road" value={snap.stats.total} hint="live vehicles" />
        <StatCard label="Passed" value={snap.stats.passed} tone="good" />
        <StatCard label="Avg wait" value={`${snap.stats.avgWait.toFixed(1)}s`}
          tone={snap.stats.avgWait < 6 ? "good" : snap.stats.avgWait < 15 ? "warn" : "bad"} />
        <StatCard label="Congestion" value={`${Math.round(snap.stats.congestion * 100)}%`}
          tone={snap.stats.congestion < 0.3 ? "good" : snap.stats.congestion < 0.6 ? "warn" : "bad"} />
      </div>

      {/* Controls */}
      <section className="card-ops p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-sm">Input & control</h2>
          <div className="flex gap-2">
            <button
              onClick={() => schematicSim.setParam("running", !p.running)}
              className="text-xs px-3 py-1.5 rounded border border-border hover:border-primary hover:text-primary"
            >{p.running ? "Pause" : "Resume"}</button>
            <button
              onClick={() => { schematicSim.reset(); toast.success("Simulation reset"); }}
              className="text-xs px-3 py-1.5 rounded border border-border hover:border-signal-amber hover:text-signal-amber"
            >Reset</button>
            <button
              onClick={() => { schematicSim.floodAll(3); toast.success("+3 cars on every approach"); }}
              className="text-xs px-3 py-1.5 rounded border border-border hover:border-signal-red hover:text-signal-red"
            >Flood +3</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Arrival rate */}
          <label className="space-y-1.5 block">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Arrival rate</span>
              <span className="font-mono text-primary">{p.arrivalRate.toFixed(2)} veh/s per lane</span>
            </div>
            <input
              type="range" min={0} max={2} step={0.05}
              value={p.arrivalRate}
              onChange={(e) => schematicSim.setParam("arrivalRate", parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
          </label>

          {/* Speed */}
          <label className="space-y-1.5 block">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Vehicle speed</span>
              <span className="font-mono text-primary">{p.speed.toFixed(0)} px/s</span>
            </div>
            <input
              type="range" min={10} max={220} step={5}
              value={p.speed}
              onChange={(e) => schematicSim.setParam("speed", parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
          </label>

          {/* Algorithm */}
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">Signal algorithm</div>
            <div className="flex gap-2">
              {(["fixed", "greedy"] as Algorithm[]).map((a) => (
                <button
                  key={a}
                  onClick={() => schematicSim.setParam("algorithm", a)}
                  className={`text-xs px-3 py-1.5 rounded border font-mono uppercase flex-1 ${
                    p.algorithm === a
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border hover:border-primary/60"
                  }`}
                >{a}</button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight pt-1">
              <b>Fixed:</b> mỗi trục xanh 12s cố định. <b>Greedy:</b> thời gian xanh tỉ lệ với số xe đang chờ.
            </p>
          </div>
        </div>
      </section>

      {/* Canvas */}
      <section className="card-ops overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Live network</h2>
          <div className="flex gap-3 text-[10px] text-muted-foreground font-mono">
            <span><span className="inline-block w-2 h-2 rounded-full bg-signal-red mr-1" />vehicle</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-signal-green mr-1" />green</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-signal-amber mr-1" />amber</span>
          </div>
        </div>
        <div className="w-full">
          <SchematicCanvas snapshot={snap} className="w-full h-auto block" />
        </div>
      </section>

      {/* Per-intersection injectors */}
      <section className="card-ops p-4 space-y-3">
        <h2 className="font-semibold text-sm">Inject vehicles per intersection</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {snap.intersections.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-2 border border-border/60 rounded px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm truncate">{i.name}</div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  passed {i.passed} · phase {i.phase}
                </div>
              </div>
              <div className="flex gap-1">
                {DIRS.map((d: Direction) => (
                  <button
                    key={d}
                    onClick={() => { schematicSim.inject(i.id, d, 3); }}
                    className="text-xs px-2 py-1 rounded border border-border hover:border-signal-amber hover:text-signal-amber font-mono"
                  >+{d}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
