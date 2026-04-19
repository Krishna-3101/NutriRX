"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DailyNutritionBar } from "@/components/plan/DailyNutritionBar";
import { MealCard } from "@/components/plan/MealCard";
import { NutritionRadar } from "@/components/plan/NutritionRadar";
import { RecipeDrawer } from "@/components/plan/RecipeDrawer";
import { Button } from "@/components/ui/Button";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { useNutriRx } from "@/hooks/useNutriRx";
import { dominantMemberTint, monogramFromNickname } from "@/lib/intakeUtils";
import {
  DEFAULT_DAY_TARGETS,
  daySummaryWithFallback,
  dominantTargetHex,
  householdLabel,
  intakeConditionFlags,
  topClinicalTargetsFromPlan,
} from "@/lib/planUtils";
import type { ClinicalTarget, DayPlan, Meal } from "@/lib/types";

const MEAL_ORDER: Meal["mealType"][] = ["breakfast", "lunch", "dinner", "snack"];

const TINT_RING: Record<ReturnType<typeof dominantMemberTint>, string> = {
  amber: "bg-clinical-glycemic/20 text-clinical-glycemic ring-1 ring-clinical-glycemic/40",
  blue: "bg-clinical-bp/20 text-clinical-bp ring-1 ring-clinical-bp/40",
  violet: "bg-clinical-folate/20 text-clinical-folate ring-1 ring-clinical-folate/40",
  rose: "bg-clinical-iron/20 text-clinical-iron ring-1 ring-clinical-iron/40",
  teal: "bg-clinical-pediatric/20 text-clinical-pediatric ring-1 ring-clinical-pediatric/40",
  accent: "bg-accent/15 text-accent ring-1 ring-accent/40",
};

function snapBarColor(ratio: number): string {
  if (ratio > 1) return "bg-red-500";
  if (ratio >= 0.8) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function PlanPage() {
  const router = useRouter();
  const { weeklyPlan } = useNutriRx();
  const [activeDay, setActiveDay] = useState(0);
  const [drawerMeal, setDrawerMeal] = useState<Meal | null>(null);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const attemptedImages = useRef(new Set<string>());
  const imageOverridesRef = useRef(imageOverrides);
  imageOverridesRef.current = imageOverrides;

  useEffect(() => {
    if (!weeklyPlan) {
      router.replace("/intake");
    }
  }, [weeklyPlan, router]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    if (!weeklyPlan?.days[activeDay]) return;
    const dayMeals = weeklyPlan.days[activeDay].meals;
    let cancelled = false;

    for (const meal of dayMeals) {
      if (meal.imageUrl || imageOverridesRef.current[meal.id]) continue;
      if (attemptedImages.current.has(meal.id)) continue;

      attemptedImages.current.add(meal.id);
      setLoadingMap((m) => ({ ...m, [meal.id]: true }));

      const query = meal.imageQuery?.trim() || meal.name;
      void fetch(`${apiBase}/api/image?query=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data: { url?: string }) => {
          if (cancelled) return;
          if (!data?.url) {
            attemptedImages.current.delete(meal.id);
            return;
          }
          setImageOverrides((prev) => ({ ...prev, [meal.id]: data.url! }));
        })
        .catch(() => {
          attemptedImages.current.delete(meal.id);
        })
        .finally(() => {
          if (!cancelled) {
            setLoadingMap((m) => {
              const next = { ...m };
              delete next[meal.id];
              return next;
            });
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [activeDay, weeklyPlan, apiBase]);

  const flags = useMemo(() => {
    if (!weeklyPlan?.intakeSnapshot) {
      return intakeConditionFlags({
        household: [],
        snapWeeklyBudget: 0,
        wicEligible: false,
        zipCode: "",
        cuisines: "",
      });
    }
    return intakeConditionFlags(weeklyPlan.intakeSnapshot);
  }, [weeklyPlan]);

  if (!weeklyPlan) return null;

  const { intakeSnapshot, days, totalEstimatedCost, snapBudget, nutritionCoverage } = weeklyPlan;
  const totalMeals = days.reduce((n, d) => n + d.meals.length, 0);
  const budget = snapBudget > 0 ? snapBudget : intakeSnapshot.snapWeeklyBudget || 1;
  const costRatio = totalEstimatedCost / budget;
  const topTargets = topClinicalTargetsFromPlan(weeklyPlan, 3);
  const active: DayPlan | undefined = days[activeDay];
  const sortedMeals = active
    ? [...active.meals].sort(
        (a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType)
      )
    : [];

  const openRecipe = (meal: Meal) => {
    setDrawerMeal(meal);
  };

  return (
    <main className="min-h-screen bg-background pb-36 selection:bg-accent/20 md:pb-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-background to-background opacity-60" />

      <div className="relative mx-auto max-w-6xl px-0 pt-6 md:pt-10">
        {/* Household + radar header */}
        <section className="border-b border-border bg-background-surface px-6 py-4">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="flex -space-x-2">
                    {intakeSnapshot.household.map((m) => {
                      const tint = dominantMemberTint(m);
                      return (
                        <div
                          key={m.id}
                          className={`relative flex h-10 w-10 items-center justify-center rounded-full font-mono text-[11px] font-medium ring-2 ring-background-surface ${TINT_RING[tint]}`}
                          title={m.nickname}
                        >
                          {monogramFromNickname(m.nickname)}
                        </div>
                      );
                    })}
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-display text-xl font-bold text-text-primary md:text-2xl">
                      {householdLabel(intakeSnapshot)}
                    </h1>
                    <p className="mt-1 font-mono text-xs text-text-secondary md:text-sm">
                      {days.length} days · {totalMeals} meals · Est. ${totalEstimatedCost.toFixed(2)} ·{" "}
                      {intakeSnapshot.cuisines?.trim() || "Diverse cuisine"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {topTargets.map((t) => (
                    <ClinicalBadge key={t} target={t} size="sm" />
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:pt-0">
              <NutritionRadar coverage={nutritionCoverage} />
            </div>
          </div>
        </section>

        {/* Shopping CTA */}
        <div className="mx-6 mt-4 flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent/10 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-text-primary">Ready to shop?</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Your SNAP shopping list is sized to your ${budget.toFixed(0)}/week budget.
            </p>
            <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-border">
              <div
                className={`h-full rounded-full transition-all ${snapBarColor(costRatio)}`}
                style={{ width: `${Math.min(100, costRatio * 100)}%` }}
              />
            </div>
          </div>
          <Link href="/plan/shopping" className="shrink-0">
            <Button variant="primary" className="w-full md:w-auto">
              View shopping list →
            </Button>
          </Link>
        </div>

        {/* Day tabs */}
        <div className="sticky top-[52px] z-30 border-b border-border bg-background/95 backdrop-blur-md md:top-14">
          <div className="flex gap-0 overflow-x-auto px-2 pb-0 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory md:px-6 [&::-webkit-scrollbar]:hidden">
            {days.map((day, i) => {
              const dot = dominantTargetHex(day.dominantClinicalTarget);
              const activeTab = i === activeDay;
              return (
                <button
                  key={day.dayIndex}
                  type="button"
                  onClick={() => setActiveDay(i)}
                  className={`flex min-w-[4.5rem] shrink-0 snap-start flex-col items-center border-b-2 px-3 py-2 transition-colors ${
                    activeTab
                      ? "border-accent bg-background-elevated text-text-primary"
                      : "border-transparent text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-wide">
                    {day.dayLabel.slice(0, 3)}
                  </span>
                  <span className="font-display text-lg font-bold">{i + 1}</span>
                  <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Meals */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDay}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="px-4 pt-6 md:px-6"
          >
            {!active || sortedMeals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-16 text-center text-text-muted">
                No meals planned for this day.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {sortedMeals.map((meal, index) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    index={index}
                    dayPlaceholderTarget={active.dominantClinicalTarget}
                    flags={flags}
                    displayUrl={meal.imageUrl || imageOverrides[meal.id]}
                    imageLoading={!!loadingMap[meal.id]}
                    onRecipeClick={() => openRecipe(meal)}
                  />
                ))}
              </div>
            )}

            {active && (
              <DailyNutritionBar
                summary={daySummaryWithFallback(active)}
                targets={DEFAULT_DAY_TARGETS}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-center font-mono text-xs text-text-muted md:text-left">
            Week 1 · {totalMeals} meals planned
          </p>
          <div className="flex flex-col gap-2 md:flex-row md:justify-end">
            <Link href="/intake" className="order-2 md:order-1">
              <Button variant="ghost" className="w-full md:w-auto">
                ← Back to adjust
              </Button>
            </Link>
            <Link href="/plan/shopping" className="order-1 md:order-2">
              <Button variant="primary" className="w-full md:w-auto">
                View shopping list →
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <RecipeDrawer
        meal={drawerMeal}
        open={!!drawerMeal}
        onClose={() => setDrawerMeal(null)}
        heroImageUrl={
          drawerMeal ? drawerMeal.imageUrl || imageOverrides[drawerMeal.id] : undefined
        }
      />
    </main>
  );
}
