import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSimulator } from "@/hooks/use-simulator";
import { simulator } from "@/lib/sim/simulator";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/intersections")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Intersections — SmartTraffic" },
      { name: "description", content: "Manage intersections in the city grid." },
    ],
  }),
  component: IntersectionsPage,
});

function IntersectionsPage() {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const snap = useSimulator();

  const { data: rows = [] } = useQuery({
    queryKey: ["intersections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("intersections").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <Center>Loading…</Center>;
  if (!user) return <Center><p className="text-muted-foreground mb-3">Sign in required.</p><Link to="/auth" className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm">Sign in</Link></Center>;

  async function setAlgo(id: string, algo: "fixed" | "greedy") {
    const { error } = await supabase.from("intersections").update({ algorithm: algo }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    simulator.setAlgorithm(id, algo);
    qc.invalidateQueries({ queryKey: ["intersections"] });
    toast.success("Algorithm updated");
  }

  async function toggleActive(id: string, active: boolean) {
    const { error } = await supabase.from("intersections").update({ active: !active }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["intersections"] });
    toast.success(active ? "Disabled" : "Enabled");
  }

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Intersections</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">{rows.length} configured</p>
        </div>
        {isAdmin && <NewIntersectionForm onCreated={() => qc.invalidateQueries({ queryKey: ["intersections"] })} />}
      </header>

      <section className="card-ops overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase font-mono text-muted-foreground bg-surface-2/50">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Lat / Lng</th>
              <th className="text-left px-4 py-2">Algorithm</th>
              <th className="text-right px-4 py-2">Live Queue</th>
              <th className="text-right px-4 py-2">Status</th>
              {isAdmin && <th className="text-right px-4 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const live = snap.intersections.find((i) => i.id === r.id);
              const q = live ? live.approaches.N.queueLength + live.approaches.S.queueLength + live.approaches.E.queueLength + live.approaches.W.queueLength : 0;
              return (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-4 py-2.5">{r.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</td>
                  <td className="px-4 py-2.5">
                    {isAdmin ? (
                      <select
                        value={r.algorithm}
                        onChange={(e) => setAlgo(r.id, e.target.value as "fixed" | "greedy")}
                        className="bg-surface-2 border border-border rounded px-2 py-1 text-xs font-mono"
                      >
                        <option value="fixed">fixed</option>
                        <option value="greedy">greedy</option>
                      </select>
                    ) : (
                      <span className="font-mono text-xs uppercase">{r.algorithm}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{q}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`text-xs font-mono ${r.active ? "text-signal-green" : "text-muted-foreground"}`}>
                      {r.active ? "ACTIVE" : "OFF"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => toggleActive(r.id, r.active)} className="text-xs px-2 py-1 rounded border border-border hover:border-primary">
                        {r.active ? "Disable" : "Enable"}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function NewIntersectionForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("20.9712");
  const [lng, setLng] = useState("105.7790");

  async function create() {
    const { error } = await supabase.from("intersections").insert({
      name,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      algorithm: "fixed",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Created. Reload sim for it to appear.");
    setOpen(false); setName("");
    onCreated();
  }

  if (!open) return <button onClick={() => setOpen(true)} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm">+ New intersection</button>;
  return (
    <div className="card-ops p-3 flex gap-2 items-end flex-wrap">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="px-2 py-1.5 bg-surface-2 border border-border rounded text-sm" />
      <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="lat" className="w-24 px-2 py-1.5 bg-surface-2 border border-border rounded text-sm font-mono" />
      <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="lng" className="w-24 px-2 py-1.5 bg-surface-2 border border-border rounded text-sm font-mono" />
      <button onClick={create} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm">Create</button>
      <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded border border-border text-sm">Cancel</button>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen grid place-items-center text-center p-6">{children}</div>;
}
