
# Smart Traffic Management System — Hà Đông, Hà Nội

A real-time traffic control simulator centered on **Phường Hà Đông, Hà Nội**, built on the Lovable stack (React + TanStack Start + Lovable Cloud). All four feature sets in scope.

## Stack mapping (vs. your original spec)

| Original spec | Lovable equivalent |
|---|---|
| FastAPI REST + WebSocket | TanStack server functions + Supabase Realtime |
| PostgreSQL | Lovable Cloud (Postgres) |
| Redis cache | TanStack Query cache (client) |
| Python simulator | TypeScript simulator running in a Web Worker |
| Socket.io | Supabase Realtime channels |
| JWT auth | Lovable Cloud auth (email/password + Google) |
| Docker Compose | Not needed — managed runtime |

Everything runs live in the preview. No local setup.

## Scope (v1)

1. **Live Leaflet map** of Hà Đông with 6 simulated intersections on real road geometry, animated vehicles, traffic-light state, congestion heatmap overlay.
2. **Traffic simulator** (Web Worker, ~10 Hz tick): vehicles with id/speed/direction/destination/waiting time/priority; queues per approach (N/S/E/W).
3. **Algorithm comparison**: Fixed-timing (30s/30s) vs Greedy (green time scales with queue length). Side-by-side live metrics + Chart.js charts: avg waiting time, vehicles passed, congestion score.
4. **Admin dashboard** (auth-gated): realtime stats cards, per-intersection table, manual light override, **Emergency mode** (pick an ambulance route → cascade green lights → auto-restore).
5. **Persistence + history**: every 60s, snapshot stats to DB. History view with hourly/daily charts + peak-hour detection.
6. **Public view**: map + congestion + simple "travel status" indicator. No login required.

## UI direction

Dark "smart city ops" aesthetic — near-black background (#0A0E14), neon cyan/amber/red signal accents, monospace data readouts (JetBrains Mono) + Inter for UI. Sidebar nav, map dominates viewport, floating stat cards with subtle glow, animated traffic-light SVGs. Mobile-responsive (sidebar collapses).

## Architecture

```text
┌─────────────────────────────────────────────────┐
│  React UI (TanStack Router)                     │
│  ├─ /            public live map                │
│  ├─ /auth        login                          │
│  └─ /_auth/                                     │
│     ├─ dashboard   stats + control              │
│     ├─ intersections  CRUD                      │
│     ├─ algorithms     compare runs              │
│     ├─ emergency      ambulance dispatch        │
│     └─ history        charts                    │
├─────────────────────────────────────────────────┤
│  Simulation Web Worker (TS)                     │
│  └─ vehicles, lights, algorithms, 10Hz tick     │
├─────────────────────────────────────────────────┤
│  Supabase Realtime (broadcast channel)          │
│  └─ multi-tab sync of sim state                 │
├─────────────────────────────────────────────────┤
│  TanStack server fns + Lovable Cloud Postgres   │
│  └─ users, intersections, snapshots, events     │
└─────────────────────────────────────────────────┘
```

## Database schema

- `profiles` (id → auth.users, display_name)
- `user_roles` (user_id, role enum: admin | viewer) + `has_role()` SECURITY DEFINER
- `intersections` (id, name, lat, lng, approaches jsonb, algorithm enum)
- `algorithm_runs` (id, started_at, ended_at, algorithm, avg_wait, vehicles_passed, congestion_score)
- `stat_snapshots` (id, taken_at, total_vehicles, avg_wait, congestion)
- `emergency_events` (id, created_by, route jsonb, started_at, ended_at)
- `simulation_logs` (id, ts, level, message, meta jsonb)

All `public.` tables get explicit GRANTs + RLS. Public read on `intersections` + `stat_snapshots`; admin-only writes via `has_role(uid,'admin')`.

## Build order

1. Enable Lovable Cloud, run schema migration, seed 6 Hà Đông intersections.
2. Design system in `src/styles.css` (dark ops theme, tokens, fonts).
3. Core types + simulator Web Worker (vehicles, lights, both algorithms).
4. Leaflet map component with vehicle/light/heatmap layers.
5. Public landing route `/` with live map + congestion summary.
6. Auth route + `_authenticated` layout (managed gate).
7. Admin dashboard: stat cards, intersection table, manual override.
8. Algorithm comparison page with Chart.js charts.
9. Emergency mode UI + route-cascade logic.
10. History page (loads `stat_snapshots`, charts hourly/daily/peak).
11. Sidebar + routing polish, mobile collapse.
12. Snapshot persistence server fn + 60s interval.
13. README with architecture notes, ER diagram (Mermaid artifact), quick-start.

## What I will NOT generate (and why)

- Python/FastAPI source, Docker Compose, separate `backend/` folder, raw SQL files outside migrations — they cannot run in the Lovable runtime and would be dead code. The README will document the architecture equivalence so it still reads as a complete SE project.
- Use-case / sequence / class diagrams as separate deliverables — I'll include the ER diagram (Mermaid) and an architecture diagram in the README. If you want the other UML diagrams, say so and I'll add them as Mermaid artifacts after v1 ships.

## Confirm

Approve and I'll start with step 1 (enable Cloud + schema). I'll ship the full v1 in one pass rather than pausing per module — pausing would 3-4x the turn count for no benefit. Tell me if you'd rather I pause at checkpoints (e.g. after the map, after auth, after algorithms).
