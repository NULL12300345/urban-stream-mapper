import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  LayoutDashboard,
  Map,
  Network,
  Siren,
  History,
  GitCompare,
} from "lucide-react";

const items = [
  { to: "/", label: "Live Map", icon: Map, public: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/intersections", label: "Intersections", icon: Network },
  { to: "/algorithms", label: "Algorithms", icon: GitCompare },
  { to: "/emergency", label: "Emergency", icon: Siren },
  { to: "/history", label: "History", icon: History },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (!mounted) {
    return <div className="flex min-h-screen w-full" />;
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside className="w-60 shrink-0 border-r border-border bg-surface-1/60 backdrop-blur flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary/15 border border-primary/40 grid place-items-center glow-cyan">
              <Activity className="size-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">SmartTraffic</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                Hà Đông Ops
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {items.map((it) => {
            const active = path === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition ${
                  active
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                }`}
              >
                <Icon className="size-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 text-[10px] uppercase tracking-widest font-mono text-muted-foreground text-center">
          Open Access Mode
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

