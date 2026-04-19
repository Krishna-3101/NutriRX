"use client";

import type { NutrientTargets } from "@/lib/types";

interface Metric {
  label: string;
  value: number | undefined;
  target: number | undefined;
  color: string;
  unit: string;
  inverted?: boolean;
}

interface DailyNutritionBarProps {
  summary: Partial<NutrientTargets>;
  targets: Partial<NutrientTargets>;
}

export function DailyNutritionBar({ summary, targets }: DailyNutritionBarProps) {
  const metrics: Metric[] = [
    { label: "Fiber", value: summary.fiber_g, target: targets.fiber_g, color: "#14B8A6", unit: "g" },
    { label: "Iron", value: summary.iron_mg, target: targets.iron_mg, color: "#F43F5E", unit: "mg" },
    {
      label: "Sodium",
      value: summary.sodium_mg,
      target: targets.sodium_mg,
      color: "#3B82F6",
      unit: "mg",
      inverted: true,
    },
    { label: "Calories", value: summary.calories_kcal, target: targets.calories_kcal, color: "#F59E0B", unit: "kcal" },
  ];

  return (
    <div className="mx-6 mt-6 rounded-xl border border-border bg-background-surface p-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-text-muted">
        Today&apos;s nutrition targets
      </div>
      <div className="space-y-2">
        {metrics.map((m) => {
          const t = m.target && m.target > 0 ? m.target : 1;
          const v = m.value ?? 0;
          let pct = Math.min(100, (v / t) * 100);
          let barColor = m.color;
          if (m.inverted) {
            pct = Math.min(100, (v / t) * 100);
            if (v > t) barColor = "#EF4444";
          }
          return (
            <div key={m.label} className="flex items-center gap-3">
              <span className="w-14 font-mono text-[11px] text-text-muted">{m.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
              <span className="w-16 text-right font-mono text-[11px] text-text-muted">
                {m.value ?? "—"}
                {m.unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
