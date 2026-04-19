"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import {
  dominantTargetHex,
  intakeConditionFlags,
  mealCardNutrientLine,
} from "@/lib/planUtils";
import type { ClinicalTarget, Meal } from "@/lib/types";

const MEAL_LABEL: Record<Meal["mealType"], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export interface MealCardProps {
  meal: Meal;
  index: number;
  dayPlaceholderTarget: ClinicalTarget;
  flags: ReturnType<typeof intakeConditionFlags>;
  displayUrl?: string;
  imageLoading?: boolean;
  onRecipeClick: () => void;
}

export function MealCard({
  meal,
  index,
  dayPlaceholderTarget,
  flags,
  displayUrl,
  imageLoading,
  onRecipeClick,
}: MealCardProps) {
  const [imageBroken, setImageBroken] = useState(false);
  const placeholderTarget = meal.clinicalTargets?.[0] ?? dayPlaceholderTarget;
  const hex = dominantTargetHex(placeholderTarget);
  const targets = meal.clinicalTargets ?? [];
  const visibleTargets = targets.slice(0, 3);
  const overflow = targets.length - visibleTargets.length;
  const showPhoto = displayUrl && !imageBroken;

  useEffect(() => {
    setImageBroken(false);
  }, [displayUrl, meal.id]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="group flex min-h-[168px] w-full flex-row overflow-hidden rounded-2xl border border-border bg-background-card transition-colors hover:border-accent/40 hover:shadow-glow-sm md:min-h-[400px] md:flex-col"
    >
      <div className="relative w-[38%] shrink-0 overflow-hidden md:h-[220px] md:w-full">
        {imageLoading && !displayUrl ? (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-border via-background-surface to-border" />
        ) : showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt={meal.name}
            className="h-full min-h-[168px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] md:min-h-0"
            onError={() => setImageBroken(true)}
          />
        ) : (
          <div
            className="flex h-full min-h-[168px] w-full items-center justify-center md:min-h-0"
            style={{ backgroundColor: `${hex}33` }}
          >
            <span className="font-display text-5xl font-bold text-text-primary/30">
              {meal.name.trim().charAt(0).toUpperCase() || "?"}
            </span>
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(8,8,16,0.95) 0%, rgba(8,8,16,0.4) 50%, transparent 100%)",
          }}
        />

        <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3">
          <span className="rounded-full bg-black/55 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
            {MEAL_LABEL[meal.mealType]}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between p-3 md:flex-[0.45] md:p-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold text-text-primary md:text-base">
            {meal.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {visibleTargets.map((t) => (
              <ClinicalBadge key={t} target={t} size="sm" />
            ))}
            {overflow > 0 && (
              <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                +{overflow} more
              </span>
            )}
          </div>
          <p className="mt-2 font-mono text-[11px] leading-snug text-text-muted">
            {mealCardNutrientLine(meal, flags)}
          </p>
        </div>
        <button
          type="button"
          onClick={onRecipeClick}
          className="mt-2 self-start text-left text-sm text-accent transition-colors hover:text-accent/90"
        >
          View recipe →
        </button>
      </div>
    </motion.article>
  );
}
