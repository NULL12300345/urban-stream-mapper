import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-primary",
  good: "text-signal-green",
  warn: "text-signal-amber",
  bad: "text-signal-red",
};

export function StatCard({ label, value, hint, tone = "default" }: Props) {
  return (
    <div className="card-ops p-4 flex flex-col gap-1 transition hover:glow-cyan">
      <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
        {label}
      </div>
      <div className={`text-3xl font-mono font-semibold ${toneClass[tone]}`}>
        {value}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
