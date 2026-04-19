"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { Button } from "@/components/ui/Button";
import { dominantTargetHex } from "@/lib/planUtils";
import type { ClinicalTarget, Meal, NutrientTargets } from "@/lib/types";

function NutritionGrid({ nutrition }: { nutrition: Partial<NutrientTargets> }) {
  const stats: { label: string; value: number | undefined; unit: string }[] = [
    { label: "Calories", value: nutrition.calories_kcal, unit: "kcal" },
    { label: "Protein", value: nutrition.protein_g, unit: "g" },
    { label: "Fiber", value: nutrition.fiber_g, unit: "g" },
    { label: "Carbs", value: nutrition.carbs_g, unit: "g" },
    { label: "Iron", value: nutrition.iron_mg, unit: "mg" },
    { label: "Sodium", value: nutrition.sodium_mg, unit: "mg" },
    { label: "Folate", value: nutrition.folate_mcg, unit: "µg" },
    { label: "Omega-3", value: nutrition.omega3_g, unit: "g" },
  ];
  const shown = stats.filter((s) => s.value != null && !Number.isNaN(s.value as number));
  if (shown.length === 0) return null;
  return (
    <div className="mx-6 mt-4 grid grid-cols-4 gap-2">
      {shown.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-border bg-background-card p-3 text-center"
        >
          <div className="font-mono text-sm font-medium text-text-primary">
            {s.value}
            {s.unit}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-text-muted">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

const MEAL_LABEL: Record<Meal["mealType"], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const fn = () => setDesktop(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return desktop;
}

export interface RecipeDrawerProps {
  meal: Meal | null;
  open: boolean;
  onClose: () => void;
  heroImageUrl?: string;
}

export function RecipeDrawer({ meal, open, onClose, heroImageUrl }: RecipeDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const desktop = useIsDesktop();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) return null;

  const placeholderTarget: ClinicalTarget = meal?.clinicalTargets?.[0] ?? "general";
  const hex = dominantTargetHex(placeholderTarget);
  const url = heroImageUrl || meal?.imageUrl;
  const targets = meal?.clinicalTargets ?? [];

  return createPortal(
    <AnimatePresence>
      {open && meal && (
        <>
          <motion.div
            key="backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="panel"
            initial={desktop ? { x: "100%" } : { y: "100%" }}
            animate={{ x: 0, y: 0 }}
            exit={desktop ? { x: "100%" } : { y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col overflow-hidden rounded-t-2xl border border-border bg-background-surface md:inset-x-auto md:bottom-auto md:left-auto md:right-0 md:top-0 md:h-full md:max-h-none md:max-w-lg md:rounded-none md:border-l md:border-t-0"
          >
            <div className="relative h-60 w-full shrink-0 overflow-hidden bg-background-surface">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `${hex}44` }}>
                  <span className="font-display text-6xl font-bold text-text-primary/25">
                    {meal.name.trim().charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(8,8,16,0.9) 0%, rgba(8,8,16,0.2) 55%, transparent 100%)",
                }}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-8">
              <div className="px-6 pt-5">
                <h2 className="font-display text-2xl font-bold text-text-primary">{meal.name}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-border bg-background-card px-2.5 py-0.5 text-xs text-text-secondary">
                    {meal.cuisine}
                  </span>
                  <span className="rounded-full border border-border bg-background-card px-2.5 py-0.5 font-mono text-[10px] uppercase text-text-muted">
                    {MEAL_LABEL[meal.mealType]}
                  </span>
                </div>
              </div>

              <div className="mx-6 mt-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
                <div className="font-mono text-[10px] uppercase tracking-wide text-accent">
                  Why this meal is in your Rx
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{meal.clinicalRationale}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {targets.map((t) => (
                    <ClinicalBadge key={t} target={t} size="sm" />
                  ))}
                </div>
              </div>

              <NutritionGrid nutrition={meal.nutrition ?? {}} />

              <h3 className="mx-6 mt-8 font-display font-semibold text-text-primary">Ingredients</h3>
              <ul className="mx-6 mt-3 space-y-2 border-b border-border pb-6">
                {meal.ingredients?.map((ing, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="shrink-0 font-mono text-accent">{ing.amount}</span>
                    <span className="min-w-0 flex-1 text-right text-text-primary">
                      {ing.name}
                      {ing.isWicEligible ? (
                        <span className="ml-2 inline-block rounded bg-teal-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-teal-400">
                          WIC
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>

              <h3 className="mx-6 mt-6 font-display font-semibold text-text-primary">How to make it</h3>
              <ol className="mx-6 mt-3 space-y-4 pb-6">
                {meal.instructions?.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-mono text-2xl font-bold leading-none text-border">{i + 1}</span>
                    <span className="text-sm leading-relaxed text-text-secondary">{step}</span>
                  </li>
                ))}
              </ol>

              <p className="mt-2 text-center font-mono text-sm text-text-muted">
                ⏱ Ready in {meal.prepTimeMinutes} minutes
              </p>
              <div className="mx-6 mt-4 flex justify-center">
                <Button type="button" variant="ghost" onClick={onClose} className="min-w-[120px]">
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
