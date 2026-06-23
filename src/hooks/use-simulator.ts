// React hook wrapper around the global simulator.
// Loads intersections from Lovable Cloud, configures the simulator, and
// subscribes the component to per-tick snapshots.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { simulator } from "@/lib/sim/simulator";
import type { IntersectionConfig, SimSnapshot } from "@/lib/sim/types";

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap() {
  if (bootstrapped) return;
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const { data, error } = await supabase
      .from("intersections")
      .select("id,name,lat,lng,algorithm,active")
      .eq("active", true);
    if (error) {
      console.error("Failed to load intersections", error);
      return;
    }
    const configs: IntersectionConfig[] = (data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      lat: d.lat,
      lng: d.lng,
      algorithm: d.algorithm,
    }));
    simulator.load(configs);
    simulator.start();
    bootstrapped = true;
  })();
  return bootstrapPromise;
}

export function useSimulator() {
  const [snapshot, setSnapshot] = useState<SimSnapshot>(() => simulator.snapshot());

  useEffect(() => {
    let cancelled = false;
    bootstrap().then(() => {
      if (cancelled) return;
    });
    const unsub = simulator.subscribe(setSnapshot);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return snapshot;
}
