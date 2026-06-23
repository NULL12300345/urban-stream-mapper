import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSimulator } from "@/hooks/use-simulator";
import { simulator } from "@/lib/sim/simulator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Siren } from "lucide-react";

export const Route = createFileRoute("/emergency")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Emergency Dispatch — SmartTraffic" },
      { name: "description", content: "Trigger an ambulance corridor with cascaded green lights." },
    ],
  }),
  component: EmergencyPage,
});

function EmergencyPage() {
  const snap = useSimulator();
  const [axis, setAxis] = useState<"NS" | "EW">("NS");
  const [picked, setPicked] = useState<string[]>([]);
  const [dispatching, setDispatching] = useState(false);

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function dispatch() {
    if (picked.length === 0) { toast.error("Pick at least one intersection."); return; }
    setDispatching(true);
    try {
      simulator.triggerEmergency(picked, axis);
      // Best-effort persistence; ignore RLS errors in open-access mode.
      await supabase.from("emergency_events").insert({
        route: { intersection_ids: picked, axis },
      } as never).then(() => {}, () => {});
      toast.success("🚑 Ambulance dispatched. Corridor active.");
      setPicked([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Dispatch failed");
    } finally {
      setDispatching(false);
    }
  }


  function clearAll() {
    simulator.clearEmergency();
    toast.success("Cleared emergency state.");
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-md grid place-items-center bg-signal-red/15 border border-signal-red/40 glow-red">
          <Siren className="size-5 text-signal-red" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emergency Dispatch</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Cascade green along the selected corridor. {snap.stats.emergencyActive && <span className="text-signal-red">ACTIVE</span>}
          </p>
        </div>
      </header>

      <section className="card-ops p-4 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest font-mono text-muted-foreground mb-2">Axis</div>
          <div className="flex gap-2">
            {(["NS", "EW"] as const).map((a) => (
              <button key={a} onClick={() => setAxis(a)}
                className={`px-3 py-1.5 rounded border text-sm font-mono ${axis === a ? "bg-signal-red/15 border-signal-red text-signal-red" : "border-border"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest font-mono text-muted-foreground mb-2">Route (in order)</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {snap.intersections.map((i, idx) => {
              const sel = picked.indexOf(i.id);
              return (
                <button key={i.id} onClick={() => toggle(i.id)}
                  className={`text-left p-2.5 rounded border transition ${sel >= 0 ? "bg-signal-red/10 border-signal-red text-foreground" : "border-border hover:border-primary"}`}>
                  <div className="text-sm font-medium flex items-center justify-between gap-2">
                    <span className="truncate">{i.name}</span>
                    {sel >= 0 && <span className="text-xs font-mono text-signal-red">#{sel + 1}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{idx + 1} · {i.algorithm}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={dispatch} disabled={dispatching}
            className="px-4 py-2 rounded bg-signal-red text-white font-medium disabled:opacity-50 glow-red">
            🚑 Dispatch ambulance
          </button>
          <button onClick={clearAll} className="px-4 py-2 rounded border border-border">Clear emergency</button>
        </div>
      </section>

      <section className="card-ops p-4">
        <h3 className="text-sm font-semibold">How it works</h3>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          The controller flips the selected axis to green at every intersection along the corridor and
          spawns an ambulance entity that progresses through them. Discharge rate doubles on the
          override axis. Once the ambulance clears the last intersection, normal cycle automatically resumes.
        </p>
      </section>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen grid place-items-center text-center p-6">{children}</div>;
}
