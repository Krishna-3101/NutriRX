"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { AGENT_COLORS } from "@/lib/constants";
import type { AgentName, AgentStatus, NutrientTargets } from "@/lib/types";

export interface AgentCardState {
  agent: AgentName;
  status: AgentStatus;
  message: string;
  nutrients?: Partial<NutrientTargets>;
  arrivedAt: number;
}

function NutrientPills({ nutrients }: { nutrients: Partial<NutrientTargets> }) {
  const important = ["fiber_g", "sodium_mg", "iron_mg", "folate_mcg", "carbs_g"] as const;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
      {important
        .filter((k) => nutrients[k] !== undefined)
        .map((k) => (
          <span
            key={k}
            className="rounded bg-background-surface px-2 py-0.5 font-mono text-[11px] text-text-muted"
          >
            {k.replace("_g", "g").replace("_mg", "mg").replace("_mcg", "µg")}: {nutrients[k] as number}
          </span>
        ))}
    </div>
  );
}

interface AgentCardProps {
  state: AgentCardState;
}

export function AgentCard({ state }: AgentCardProps) {
  const color = AGENT_COLORS[state.agent] ?? "#6C63FF";
  const { status, message, nutrients } = state;

  const shell =
    status === "waiting"
      ? "bg-background-card border-border opacity-50"
      : status === "thinking"
        ? "border-border-strong bg-background-elevated shadow-glow-sm"
        : status === "conflict"
          ? "border-amber-800/40 bg-amber-950/20 shadow-[0_0_24px_-8px_rgba(245,158,11,0.35)]"
          : "border-border bg-background-card";

  return (
    <div
      className={`rounded-2xl border border-l-4 p-5 transition-all duration-300 ${shell}`}
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-mono text-xs text-text-secondary">{state.agent}</div>
        <div className="flex shrink-0 items-center gap-1.5">
          {status === "thinking" && (
            <>
              <span className="h-2.5 w-2.5 animate-pulse-slow rounded-full bg-accent" />
              <span className="font-mono text-xs text-text-muted">analyzing</span>
            </>
          )}
          {status === "done" && <CheckCircle2 className="h-4 w-4" style={{ color }} strokeWidth={2} />}
          {status === "conflict" && <AlertTriangle className="h-4 w-4 text-clinical-glycemic" strokeWidth={2} />}
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">&ldquo;{message}&rdquo;</p>
      {nutrients && Object.keys(nutrients).length > 0 && <NutrientPills nutrients={nutrients} />}
    </div>
  );
}
