// Leaflet map of Hà Đông with intersections, lights, and a congestion heat overlay.
// Uses react-leaflet. Renders client-side only (Leaflet touches window).

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { IntersectionState, SimSnapshot, Vehicle } from "@/lib/sim/types";

const HA_DONG_CENTER: [number, number] = [20.9712, 105.7790];

interface Props {
  snapshot: SimSnapshot;
  className?: string;
}

function lightColor(state: IntersectionState): string {
  // Highlight color = whichever axis is green/amber
  const axis = state.phase.startsWith("NS") ? "NS" : "EW";
  const amber = state.phase.endsWith("AMBER");
  if (amber) return "#f5b400";
  return axis === "NS" ? "#22e07a" : "#22d3ee";
}

function congestionColor(q: number): string {
  // q in [0..40]
  if (q < 10) return "#22e07a";
  if (q < 20) return "#f5b400";
  return "#ef4444";
}

export function TrafficMap({ snapshot, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const vehicleLayerRef = useRef<L.LayerGroup | null>(null);
  const lastDrawRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const pendingSnapRef = useRef<SimSnapshot>(snapshot);


  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: HA_DONG_CENTER,
      zoom: 15,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      },
    ).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    vehicleLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw intersections + heat each tick
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const i of snapshot.intersections) {
      const totalQ =
        i.approaches.N.queueLength +
        i.approaches.S.queueLength +
        i.approaches.E.queueLength +
        i.approaches.W.queueLength;

      // Heat halo
      L.circle([i.lat, i.lng], {
        radius: 80 + totalQ * 4,
        color: congestionColor(totalQ),
        fillColor: congestionColor(totalQ),
        fillOpacity: 0.12,
        weight: 1,
      }).addTo(layer);

      // Intersection marker
      const color = lightColor(i);
      const marker = L.circleMarker([i.lat, i.lng], {
        radius: 9,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 2,
      }).addTo(layer);

      // Queued cars: draw small dots along each approach axis
      for (const dir of ["N", "S", "E", "W"] as const) {
        const q = i.approaches[dir].queueLength;
        const shown = Math.min(q, 12);
        const isGreen = i.approaches[dir].light === "green";
        const dotColor = isGreen ? "#22e07a" : i.approaches[dir].light === "amber" ? "#f5b400" : "#94a3b8";
        for (let k = 0; k < shown; k++) {
          const pos = offsetLatLng(i.lat, i.lng, dir, 18 + k * 12);
          L.circleMarker(pos, {
            radius: 2.5,
            color: dotColor,
            fillColor: dotColor,
            fillOpacity: 0.9,
            weight: 0,
          }).addTo(layer);
        }
      }

      const html = `
        <div style="font-family: 'JetBrains Mono', monospace; min-width: 200px;">
          <div style="font-weight:600;color:#22d3ee;margin-bottom:4px;font-family:Inter,sans-serif">${escapeHtml(i.name)}</div>
          <div>algo: <b>${i.algorithm}</b> ${i.emergencyOverride ? "<span style='color:#ef4444'>· EMERGENCY</span>" : ""}</div>
          <div>phase: <b>${i.phase}</b> · ${i.phaseRemaining.toFixed(1)}s</div>
          <div style="margin-top:6px">
            N:${i.approaches.N.queueLength} S:${i.approaches.S.queueLength}
            E:${i.approaches.E.queueLength} W:${i.approaches.W.queueLength}
          </div>
          <div>passed: ${i.passed}</div>
        </div>`;
      marker.bindPopup(html);
    }
  }, [snapshot]);

  // Vehicles (ambulances)
  useEffect(() => {
    const layer = vehicleLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const v of snapshot.vehicles) {
      const inter = snapshot.intersections.find((i) => i.id === v.intersectionId);
      if (!inter) continue;
      const pos = offsetLatLng(inter.lat, inter.lng, v.direction, v.offset);
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#ef4444;color:white;border-radius:9999px;padding:2px 6px;font-size:10px;font-weight:700;box-shadow:0 0 12px #ef4444;font-family:Inter">${v.priority >= 10 ? "🚑" : "🚗"}</div>`,
        iconSize: [24, 16],
        iconAnchor: [12, 8],
      });
      L.marker(pos, { icon }).addTo(layer);
    }
  }, [snapshot]);

  return <div ref={containerRef} className={className} />;
}

// Convert offset (meters along approach axis) to a lat/lng near the intersection.
function offsetLatLng(
  lat: number,
  lng: number,
  dir: "N" | "S" | "E" | "W",
  offsetMeters: number,
): [number, number] {
  const dLat = offsetMeters / 111_111;
  const dLng = offsetMeters / (111_111 * Math.cos((lat * Math.PI) / 180));
  switch (dir) {
    case "N": return [lat - dLat, lng];
    case "S": return [lat + dLat, lng];
    case "E": return [lat, lng - dLng];
    case "W": return [lat, lng + dLng];
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
