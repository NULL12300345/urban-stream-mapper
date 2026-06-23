import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSimulator } from "@/hooks/use-simulator";
import { supabase } from "@/integrations/supabase/client";
import { Line, Bar } from "react-chartjs-2";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — SmartTraffic" },
      { name: "description", content: "Hourly and daily traffic history with peak-hour detection." },
    ],
  }),
  component: HistoryPage,
});

interface Row {
  taken_at: string;
  algorithm: "fixed" | "greedy";
  total_vehicles: number;
  vehicles_passed: number;
  avg_wait_seconds: number;
  congestion_score: number;
}

function HistoryPage() {
  const { user, isAdmin, loading } = useAuth();
  const snap = useSimulator();
  const [rows, setRows] = useState<Row[]>([]);

  // Persist a snapshot every 30s if admin
  useEffect(() => {
    if (!isAdmin) return;
    const id = setInterval(async () => {
      const s = snap.stats;
      const algo = snap.intersections[0]?.algorithm ?? "fixed";
      await supabase.from("stat_snapshots").insert({
        algorithm: algo,
        total_vehicles: s.totalVehicles,
        vehicles_passed: s.vehiclesPassed,
        avg_wait_seconds: s.avgWaitSeconds,
        congestion_score: s.congestionScore,
        emergency_active: s.emergencyActive,
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [isAdmin, snap]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from("stat_snapshots")
        .select("taken_at,algorithm,total_vehicles,vehicles_passed,avg_wait_seconds,congestion_score")
        .order("taken_at", { ascending: false })
        .limit(500);
      if (error) { toast.error(error.message); return; }
      if (active) setRows((data ?? []).reverse() as Row[]);
    }
    load();
    const id = setInterval(load, 15_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  if (loading) return <Center>Loading…</Center>;
  if (!user) return <Center><p className="text-muted-foreground mb-3">Sign in required.</p><Link to="/auth" className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm">Sign in</Link></Center>;

  // Bucket by hour
  const hourly = bucketBy(rows, 60 * 60 * 1000);
  const peakHour = hourly.reduce<{ label: string; vehicles: number } | null>(
    (best, h) => (!best || h.vehicles > best.vehicles ? { label: h.label, vehicles: h.vehicles } : best),
    null,
  );

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History & Analytics</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            {rows.length} snapshots {isAdmin && "· auto-saving every 30s"}
          </p>
        </div>
        {peakHour && (
          <div className="card-ops px-4 py-2">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Peak hour</div>
            <div className="text-sm font-mono text-signal-amber">{peakHour.label} · {peakHour.vehicles} veh</div>
          </div>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="card-ops p-8 text-center text-muted-foreground text-sm">
          No snapshots yet. {isAdmin ? "Snapshots auto-save every 30s while this page is open." : "An admin needs to leave this page open to record snapshots."}
        </div>
      ) : (
        <>
          <section className="card-ops p-4">
            <h2 className="text-sm font-semibold mb-3">Average wait time over time</h2>
            <Line data={{
              labels: rows.map((r) => new Date(r.taken_at).toLocaleTimeString()),
              datasets: [{
                label: "Avg wait (s)",
                data: rows.map((r) => r.avg_wait_seconds),
                borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,0.15)", fill: true, tension: 0.3,
              }],
            }} options={baseOpts("s")} />
          </section>

          <section className="card-ops p-4">
            <h2 className="text-sm font-semibold mb-3">Vehicles per hour</h2>
            <Bar data={{
              labels: hourly.map((h) => h.label),
              datasets: [{
                label: "Vehicles passed",
                data: hourly.map((h) => h.vehicles),
                backgroundColor: hourly.map((h) => h.label === peakHour?.label ? "#f5b400" : "#22d3ee"),
              }],
            }} options={baseOpts("")} />
          </section>
        </>
      )}
    </div>
  );
}

function bucketBy(rows: Row[], windowMs: number) {
  const buckets = new Map<number, { vehicles: number; count: number }>();
  for (const r of rows) {
    const t = new Date(r.taken_at).getTime();
    const k = Math.floor(t / windowMs) * windowMs;
    const b = buckets.get(k) ?? { vehicles: 0, count: 0 };
    b.vehicles = Math.max(b.vehicles, r.vehicles_passed);
    b.count += 1;
    buckets.set(k, b);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([k, v]) => ({
      label: new Date(k).toLocaleString([], { hour: "2-digit", day: "2-digit", month: "2-digit" }),
      vehicles: v.vehicles,
    }));
}

function baseOpts(unit: string): import("chart.js").ChartOptions<any> {
  return {
    responsive: true,
    plugins: { legend: { labels: { color: "#9ca3af" } } },
    scales: {
      x: { ticks: { color: "#6b7280", maxTicksLimit: 10 }, grid: { color: "rgba(255,255,255,0.05)" } },
      y: { ticks: { color: "#6b7280", callback: (v: string | number) => `${v}${unit}` }, grid: { color: "rgba(255,255,255,0.05)" } },
    },
  };
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen grid place-items-center text-center p-6">{children}</div>;
}
