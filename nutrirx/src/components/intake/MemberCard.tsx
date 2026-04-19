"use client";

import { Pencil, X } from "lucide-react";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import {
  dominantMemberTint,
  memberConditionBadges,
  monogramFromNickname,
} from "@/lib/intakeUtils";
import type { HouseholdMember } from "@/lib/types";

const TINT_RING: Record<ReturnType<typeof dominantMemberTint>, string> = {
  amber: "bg-clinical-glycemic/20 text-clinical-glycemic ring-1 ring-clinical-glycemic/40",
  blue: "bg-clinical-bp/20 text-clinical-bp ring-1 ring-clinical-bp/40",
  violet: "bg-clinical-folate/20 text-clinical-folate ring-1 ring-clinical-folate/40",
  rose: "bg-clinical-iron/20 text-clinical-iron ring-1 ring-clinical-iron/40",
  teal: "bg-clinical-pediatric/20 text-clinical-pediatric ring-1 ring-clinical-pediatric/40",
  accent: "bg-accent/15 text-accent ring-1 ring-accent/40",
};

interface MemberCardProps {
  member: HouseholdMember;
  onEdit: (member: HouseholdMember) => void;
  onRemove: (id: string) => void;
}

export function MemberCard({ member, onEdit, onRemove }: MemberCardProps) {
  const tint = dominantMemberTint(member);
  const badges = memberConditionBadges(member.conditions);

  return (
    <div className="flex items-stretch gap-4 bg-background-card border border-border rounded-xl p-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-mono text-sm font-medium ${TINT_RING[tint]}`}
      >
        {monogramFromNickname(member.nickname)}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="font-body font-medium text-text-primary">{member.nickname}</div>
        <div className="text-sm text-text-secondary capitalize">
          {member.age} yrs · {member.sex}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {badges.map((t) => (
            <ClinicalBadge key={t} target={t} size="sm" />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {member.conditions.includes("pregnancy") && member.weeksPregnant != null && (
            <span className="inline-flex items-center rounded-full border border-clinical-folate/30 bg-clinical-folate/10 px-2 py-0.5 font-mono text-[10px] text-clinical-folate">
              {member.weeksPregnant} weeks pregnant
            </span>
          )}
          {member.isBreastfeeding && member.conditions.includes("postpartum") && (
            <span className="inline-flex items-center rounded-full border border-clinical-pediatric/30 bg-clinical-pediatric/10 px-2 py-0.5 font-mono text-[10px] text-clinical-pediatric">
              Breastfeeding
            </span>
          )}
          {(member.conditions.includes("diabetes") || member.conditions.includes("prediabetes")) &&
            member.a1c != null && (
              <span className="inline-flex items-center rounded-full border border-clinical-glycemic/30 bg-clinical-glycemic/10 px-2 py-0.5 font-mono text-[10px] text-clinical-glycemic">
                A1C {member.a1c}
              </span>
            )}
          {member.conditions.includes("hypertension") &&
            member.systolicBP != null &&
            member.diastolicBP != null && (
              <span className="inline-flex items-center rounded-full border border-clinical-bp/30 bg-clinical-bp/10 px-2 py-0.5 font-mono text-[10px] text-clinical-bp">
                BP {member.systolicBP}/{member.diastolicBP}
              </span>
            )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          onClick={() => onEdit(member)}
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-background-surface hover:text-text-primary"
          aria-label={`Edit ${member.nickname}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(member.id)}
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-background-surface hover:text-clinical-iron"
          aria-label={`Remove ${member.nickname}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
