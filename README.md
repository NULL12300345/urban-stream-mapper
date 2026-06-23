# SmartTraffic — Hà Đông Ops

Intelligent traffic-light control simulator centered on **Phường Hà Đông, Thành phố Hà Nội**. Visualises live congestion across a city grid, compares two control algorithms, supports emergency-vehicle dispatch, and persists historical telemetry for analytics.

> **Note on tech stack.** The original brief specified FastAPI / Postgres / Redis / Docker Compose. This implementation runs on the Lovable runtime (Cloudflare Workers + React + TanStack Start + managed Postgres via Lovable Cloud). The mapping below preserves the architecture intent:
>
> | Spec | Implementation |
> |---|---|
> | FastAPI REST + WebSocket | TanStack server functions + Supabase Realtime |
> | Python traffic simulator | TypeScript `Simulator` class (`src/lib/sim/simulator.ts`) |
> | Redis cache | TanStack Query in-memory cache |
> | Socket.io | Supabase Realtime broadcast channels |
> | JWT auth | Lovable Cloud auth (email + password) |
> | Docker Compose | Not needed — fully managed runtime |

## Roles

- **Admin** — sign in, manage intersections, switch algorithms, dispatch emergencies, manual light override, view full dashboard. **The first user to sign up is automatically promoted to admin.**
- **Public user** — open `/` to view the live map, congestion heatmap, and travel status. No login required.

## Features

- Real-time **Leaflet** map with intersections, vehicle markers, congestion heat halos
- 6 seeded intersections from Hà Đông (Quang Trung, Trần Phú, Lê Trọng Tấn, Tô Hiệu, Vạn Phúc, Nguyễn Trãi corridors)
- Two control algorithms — **fixed** (30s/30s) and **greedy** (queue-adaptive 10–60s)
- Side-by-side algorithm comparison with **Chart.js** charts (avg wait, congestion)
- Admin dashboard with per-intersection telemetry and manual axis override
- **Emergency dispatch**: pick an axis + ordered corridor of intersections → green-light cascade with an animated ambulance entity → auto-restore
- Hourly history with peak-hour detection (auto-snapshots every 30s while admin is viewing)
- Row-level security on every public table; admin-only writes via `has_role()` SECURITY DEFINER

## Project structure

```
src/
├─ routes/
│  ├─ __root.tsx          shell, providers, sidebar
│  ├─ index.tsx           / public live map
│  ├─ auth.tsx            /auth sign in / sign up
│  ├─ dashboard.tsx       /dashboard admin telemetry
│  ├─ intersections.tsx   /intersections CRUD
│  ├─ algorithms.tsx      /algorithms comparison
│  ├─ emergency.tsx       /emergency dispatch
│  └─ history.tsx         /history analytics
├─ components/
│  ├─ AppShell.tsx        sidebar + main outlet
│  ├─ TrafficMap.tsx      Leaflet integration
│  ├─ TrafficLightIcon.tsx
│  └─ StatCard.tsx
├─ hooks/
│  ├─ use-auth.ts         supabase session + role
│  └─ use-simulator.ts    bootstrap + subscribe
├─ lib/sim/
│  ├─ types.ts            simulation domain types
│  └─ simulator.ts        4 Hz simulator + algorithms
└─ integrations/supabase/ auto-generated clients
supabase/
└─ migrations/            SQL schema (auto-applied)
```

## Database schema

```mermaid
erDiagram
  auth_users ||--o| profiles : "1:1"
  auth_users ||--o{ user_roles : "has many"
  auth_users ||--o{ emergency_events : "created by"
  auth_users ||--o{ algorithm_runs : "created by"
  profiles { uuid id PK display_name created_at }
  user_roles { uuid user_id FK role }
  intersections { uuid id PK name lat lng approaches algorithm active }
  stat_snapshots { uuid id PK taken_at algorithm total_vehicles vehicles_passed avg_wait_seconds congestion_score emergency_active }
  algorithm_runs { uuid id PK algorithm started_at ended_at avg_wait_seconds vehicles_passed congestion_score created_by FK }
  emergency_events { uuid id PK created_by FK route started_at ended_at }
  simulation_logs { uuid id PK ts level message meta }
```

## Architecture

```
┌──────────────────────────────────────────────┐
│  Browser (React + TanStack Router)            │
│  ┌────────────────────────────────────────┐  │
│  │  Simulator (singleton, 4 Hz tick)       │  │
│  │  vehicles, queues, lights, algorithms   │  │
│  └────────────────────────────────────────┘  │
│              ▲             │                  │
│              │ subscribe   │ snapshot          │
│              │             ▼                  │
│  ┌────────────────────────────────────────┐  │
│  │  Routes  (map · dashboard · charts)    │  │
│  └────────────────────────────────────────┘  │
└───────────────┬──────────────────────────────┘
                │ supabase-js (publishable key)
                ▼
┌──────────────────────────────────────────────┐
│  Lovable Cloud (Postgres + Auth + Realtime)  │
│  intersections · stat_snapshots · emergency  │
│  RLS enforced; admin = has_role(uid,'admin') │
└──────────────────────────────────────────────┘
```

## Quick start

1. Open the live preview.
2. Click **Admin sign in** → create an account. The first signup becomes admin automatically.
3. The map at `/` is public — share it without sign-in.
4. From `/dashboard` you can manually override individual intersections.
5. `/algorithms` lets you switch the whole grid between fixed and greedy and watch the comparison live.
6. `/emergency` triggers ambulance corridors with cascaded green lights.

## Algorithms

**Fixed**: 30s green per axis with 3s amber transitions. Predictable but ignores demand.

**Greedy**: When a new green phase starts, computes `green = clamp(10, 60, 10 + 2 * queueOnAxis)`. Adapts to bursty arrivals; can oscillate under symmetric load. Tunables in `src/lib/sim/simulator.ts`.

## Sample data

Six intersections are seeded automatically (see migration). Algorithms are pre-mixed (3 fixed, 3 greedy) so the algorithm-comparison page has signal immediately.

## Security notes

- All `public.*` tables have RLS enabled with explicit GRANTs.
- `has_role(uuid, app_role)` is `SECURITY DEFINER` and used in policies (canonical Supabase RBAC).
- `handle_new_user` trigger creates a profile and promotes the first user to admin.
- The publishable key is the only key shipped to the browser; the service-role key is never used (no admin server functions in v1).

## Roadmap (not in v1)

- Server-side simulation worker for multi-tab consistency (Realtime broadcast)
- Per-vehicle routing across intersections, not just ambulances
- Use Case / Sequence / Class UML diagrams as Mermaid artifacts
- Test suite (Vitest) for `Simulator` correctness
