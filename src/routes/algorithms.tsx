// Algorithm comparison page. Runs both fixed and greedy simulations in
// parallel by setting all intersections to the chosen algorithm, then
// recording stats over time. The chart shows live avg wait + congestion.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSimulator } from "@/hooks/use-simulator";
import { simulator } from "@/lib/sim/simulator";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from "chart.js";
import { StatCard } from "@/components/StatCard";
import { toast } from "sonner";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export const Route = createFileRoute("/algorithms")({
  head: () => ({
    meta: [
      { title: "Algorithm Comparison — SmartTraffic" },
      { name: "description", content: "Compare fixed-timing vs greedy traffic-light control algorithms in real time." },
    ],
  }),
  component: AlgorithmsPage,
});

interface Sample { t: number; wait: number; cong: number; passed: number; }

function AlgorithmsPage() {
  const { user, isAdmin, loading } = useAuth();
  const snap = useSimulator();
  const [current, setCurrent] = useState<"fixed" | "greedy">("fixed");
  const [samples, setSamples] = useState<{ fixed: Sample[]; greedy: Sample[] }>({ fixed: [], greedy: [] });
  const sampleRef = useRef(samples);
  sampleRef.current = samples;

  useEffect(() => {
    const id = setInterval(() => {
      const s: Sample = {
        t: Date.now(),
        wait: snap.stats.avgWaitSeconds,
        cong: snap.stats.congestionScore * 100,
        passed: snap.stats.vehiclesPassed,
      };
      setSamples((prev) => ({
        ...prev,
        [current]: [...prev[current].slice(-59), s],
      }));
    }, 1000);
    return () => clearInterval(id);
  }, [current, snap]);

  if (loading) return <Center>Loading…</Center>;
  if (!user) return <Center><p className="text-muted-foreground mb-3">Sign in required.</p><Link to="/auth" className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm">Sign in</Link></Center>;

  function switchAlgo(algo: "fixed" | "greedy") {
    simulator.setGlobalAlgorithm(algo);
    simulator.reset();
    setCurrent(algo);
    setSamples((s) => ({ ...s, [algo]: [] }));
    toast.success(`Running ${algo} algorithm`);
  }

  const labels = Array.from({ length: 60 }, (_, i) => `${60 - i}s`).reverse();
  const fixedPad = pad(samples.fixed.map((s) => s.wait));
  const greedyPad = pad(samples.greedy.map((s) => s.wait));
  const fixedCong = pad(samples.fixed.map((s) => s.cong));
  const greedyCong = pad(samples.greedy.map((s) => s.cong));

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Algorithm Comparison</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">Running: {current.toUpperCase()}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => switchAlgo("fixed")}
              className={`px-3 py-1.5 rounded border text-sm ${current === "fixed" ? "bg-primary/15 border-primary text-primary" : "border-border"}`}>
              Run FIXED
            </button>
            <button onClick={() => switchAlgo("greedy")}
              className={`px-3 py-1.5 rounded border text-sm ${current === "greedy" ? "bg-primary/15 border-primary text-primary" : "border-border"}`}>
              Run GREEDY
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Avg wait (now)" value={`${snap.stats.avgWaitSeconds.toFixed(1)}s`} />
        <StatCard label="Vehicles passed" value={snap.stats.vehiclesPassed} tone="good" />
        <StatCard label="Congestion" value={`${Math.round(snap.stats.congestionScore * 100)}%`}
          tone={snap.stats.congestionScore < 0.3 ? "good" : snap.stats.congestionScore < 0.6 ? "warn" : "bad"} />
        <StatCard label="Active algo" value={current.toUpperCase()} />
      </div>

      <section className="card-ops p-4">
        <h2 className="text-sm font-semibold mb-3">Average waiting time (60s window)</h2>
        <Line data={{
          labels,
          datasets: [
            { label: "Fixed", data: fixedPad, borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,0.15)", fill: true, tension: 0.3 },
            { label: "Greedy", data: greedyPad, borderColor: "#22e07a", backgroundColor: "rgba(34,224,122,0.15)", fill: true, tension: 0.3 },
          ],
        }} options={chartOpts("seconds")} />
      </section>

      <section className="card-ops p-4">
        <h2 className="text-sm font-semibold mb-3">Congestion (60s window)</h2>
        <Line data={{
          labels,
          datasets: [
            { label: "Fixed", data: fixedCong, borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,0.15)", fill: true, tension: 0.3 },
            { label: "Greedy", data: greedyCong, borderColor: "#22e07a", backgroundColor: "rgba(34,224,122,0.15)", fill: true, tension: 0.3 },
          ],
        }} options={chartOpts("%")} />
      </section>

      <section className="card-ops p-4">
        <h3 className="text-sm font-semibold">Methodology</h3>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          Both algorithms drive the same Poisson-arrival traffic stream across {snap.intersections.length} intersections.
          <b className="text-foreground"> Fixed</b> uses a 30s green / 3s amber cycle per axis.
          <b className="text-foreground"> Greedy</b> sizes each green phase by the queue length on the active axis,
          clamped to [10s, 60s]. The greedy strategy reduces average wait under uneven demand
          but oscillates more under symmetric load.
        </p>
      </section>
    </div>
  );
}

function pad(arr: number[]): (number | null)[] {
  const out: (number | null)[] = Array(60).fill(null);
  for (let i = 0; i < arr.length; i++) out[60 - arr.length + i] = arr[i];
  return out;
}

function chartOpts(unit: string): import("chart.js").ChartOptions<"line"> {
  return {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { labels: { color: "#9ca3af" } },
    },
    scales: {
      x: { ticks: { color: "#6b7280", maxTicksLimit: 8 }, grid: { color: "rgba(255,255,255,0.05)" } },
      y: { ticks: { color: "#6b7280", callback: (v) => `${v}${unit === "%" ? "%" : "s"}` }, grid: { color: "rgba(255,255,255,0.05)" } },
    },
  };
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen grid place-items-center text-center p-6">{children}</div>;
}
