"use client";

import { dominantMemberTint, agentsToActivateFromHousehold, agentPillStyle, monogramFromNickname } from "@/lib/intakeUtils";
import type { HouseholdMember } from "@/lib/types";

const TINT_RING: Record<ReturnType<typeof dominantMemberTint>, string> = {
  amber: "bg-clinical-glycemic/20 text-clinical-glycemic ring-1 ring-clinical-glycemic/40",
  blue: "bg-clinical-bp/20 text-clinical-bp ring-1 ring-clinical-bp/40",
  violet: "bg-clinical-folate/20 text-clinical-folate ring-1 ring-clinical-folate/40",
  rose: "bg-clinical-iron/20 text-clinical-iron ring-1 ring-clinical-iron/40",
  teal: "bg-clinical-pediatric/20 text-clinical-pediatric ring-1 ring-clinical-pediatric/40",
  accent: "bg-accent/15 text-accent ring-1 ring-accent/40",
};

interface IntakeSummaryProps {
  household: HouseholdMember[];
  snapWeeklyBudget: number;
  wicEligible: boolean;
  zipCode: string;
  cuisines: string;
}

export function IntakeSummary({ household, snapWeeklyBudget, wicEligible, zipCode, cuisines }: IntakeSummaryProps) {
  const agents = agentsToActivateFromHousehold(household);

  return (
    <div className="rounded-2xl border border-border-strong bg-background-elevated p-5">
      <div className="flex flex-wrap items-center gap-2">
        {household.map((m) => {
          const tint = dominantMemberTint(m);
          return (
            <div
              key={m.id}
              className={`flex h-9 w-9 items-center justify-center rounded-full font-mono text-[10px] font-medium ${TINT_RING[tint]}`}
              title={m.nickname}
            >
              {monogramFromNickname(m.nickname)}
            </div>
          );
        })}
      </div>
      <p className="mt-3 font-body text-sm text-text-secondary">
        {household.length} member{household.length === 1 ? "" : "s"} · ${snapWeeklyBudget}/week SNAP ·{" "}
        {wicEligible ? "WIC" : "No WIC"} · ZIP {zipCode || "—"}
      </p>
      <p className="mt-1 font-body text-sm text-text-primary">
        <span className="text-text-muted">Cuisine: </span>
        {cuisines.trim() || "—"}
      </p>
      <div className="mt-4">
        <p className="font-mono text-[10px] font-medium uppercase tracking-wide text-text-muted">Agents that will activate:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {agents.map((agent) => {
            const s = agentPillStyle(agent);
            return (
              <span
                key={agent}
                className="inline-flex items-center rounded-full border border-transparent px-2.5 py-1 font-mono text-[10px] font-medium"
                style={{
                  backgroundColor: s.backgroundColor,
                  color: s.color,
                  borderColor: s.borderColor ?? "transparent",
                }}
              >
                {agent.replace("Agent", "")}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
