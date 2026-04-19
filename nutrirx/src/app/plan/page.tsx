"use client";

import { motion } from "framer-motion";
import { Clock, DollarSign, List, Utensils, HeartPulse, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { Button } from "@/components/ui/Button";
import { useNutriRx } from "@/hooks/useNutriRx";
import type { Meal, ShoppingCategory, ShoppingItem, ClinicalTarget } from "@/lib/types";

function MealCard({ meal, index }: { meal: Meal; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index }}
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-background-card p-0 transition-colors hover:border-accent/40"
    >
      <div className="relative h-48 w-full bg-background-surface">
        {meal.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meal.imageUrl}
            alt={meal.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-background-surface text-text-muted">
            <Utensils className="mb-2 h-8 w-8 opacity-50" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <div className="rounded-full bg-background-surface/80 px-2.5 py-1 backdrop-blur-md text-xs font-semibold capitalize text-text-primary shadow-sm border border-border/50">
            {meal.mealType}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-start justify-between gap-4">
          <h3 className="font-display text-lg font-bold text-text-primary">{meal.name}</h3>
          <div className="flex shrink-0 items-center gap-1 mt-1 text-xs font-medium text-text-muted">
            <Clock className="h-3 w-3" />
            {meal.prepTimeMinutes}m
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {meal.clinicalTargets?.map((tgt) => (
            <ClinicalBadge key={tgt} target={tgt} size="sm" />
          ))}
        </div>

        <p className="mb-4 text-sm leading-relaxed text-text-secondary line-clamp-3">
          {meal.clinicalRationale}
        </p>

        {meal.nutrition && (
          <div className="mb-5 grid grid-cols-4 gap-2 rounded-lg bg-background-surface p-3 text-center text-xs">
            <div>
              <div className="font-semibold text-text-primary">{meal.nutrition.calories_kcal || "-"}</div>
              <div className="text-text-muted">kcal</div>
            </div>
            <div>
              <div className="font-semibold text-text-primary">{meal.nutrition.protein_g || "-"}g</div>
              <div className="text-text-muted">Pro</div>
            </div>
            <div>
              <div className="font-semibold text-text-primary">{meal.nutrition.carbs_g || "-"}g</div>
              <div className="text-text-muted">Carb</div>
            </div>
            <div>
              <div className="font-semibold text-text-primary">{meal.nutrition.fat_g || "-"}g</div>
              <div className="text-text-muted">Fat</div>
            </div>
          </div>
        )}

        <div className="mt-auto">
          <Button
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="w-full justify-between text-xs"
          >
            {expanded ? "Hide Recipe & Ingredients" : "View Recipe & Ingredients"}
            <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </Button>

          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mt-3 overflow-hidden border-t border-border pt-4 text-sm text-text-secondary"
            >
              <h4 className="mb-2 font-semibold text-text-primary">Ingredients</h4>
              <ul className="mb-4 list-disc space-y-1 pl-4 text-xs">
                {meal.ingredients?.map((ing, i) => (
                  <li key={i}>
                    {ing.amount} <span className="font-medium text-text-primary">{ing.name}</span>
                  </li>
                ))}
              </ul>
              <h4 className="mb-2 font-semibold text-text-primary">Instructions</h4>
              <ol className="list-decimal space-y-2 pl-4 text-xs">
                {meal.instructions?.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ol>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ShoppingItemRow({ item }: { item: ShoppingItem }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0 hover:bg-background-surface/50 px-2 transition-colors rounded-md -mx-2">
      <div className="flex flex-1 flex-col truncate pr-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary truncate">{item.name}</span>
          {item.isWicEligible && (
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-500 border border-blue-500/20">
              WIC
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <span>{item.quantity}</span>
          {item.whyInRx && (
            <>
              <span className="opacity-50">•</span>
              <span className="truncate flex-1 min-w-0 flex items-center gap-1.5">
                <HeartPulse className="h-3 w-3 text-accent" />
                <span className="truncate">{item.whyInRx}</span>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right font-mono text-sm font-semibold text-text-primary">
        ${item.estimatedCostUSD?.toFixed(2) || "0.00"}
      </div>
    </div>
  );
}

export default function PlanPage() {
  const router = useRouter();
  const { weeklyPlan } = useNutriRx();
  
  useEffect(() => {
    if (!weeklyPlan) {
      router.replace("/intake");
    }
  }, [weeklyPlan, router]);

  if (!weeklyPlan) return null;

  const allMeals = weeklyPlan.days.flatMap((d) => d.meals);
  const { shoppingList, totalEstimatedCost, snapBudget, intakeSnapshot } = weeklyPlan;

  const isOverBudget = totalEstimatedCost > snapBudget;

  return (
    <main className="min-h-screen bg-background pb-20 selection:bg-accent/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-background to-background opacity-60" />
      
      <div className="relative mx-auto max-w-6xl px-6 pt-16">
        {/* Header */}
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 inline-flex items-center justify-center rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent"
          >
            Plan Generation Complete
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4 font-display text-4xl font-extrabold tracking-tight text-text-primary md:text-5xl"
          >
            Your Custom NutriRx Plan
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl text-lg text-text-secondary leading-relaxed"
          >
            Designed for <strong className="text-text-primary">{intakeSnapshot?.household.length || 1} people</strong> prioritizing <strong className="text-text-primary">{intakeSnapshot?.cuisines || "diverse"}</strong> cuisine.
          </motion.p>
        </header>

        {/* Meals Section */}
        <section className="mb-20">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-text-primary">
              <Utensils className="h-6 w-6 text-accent" />
              Prescribed Meals
            </h2>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allMeals.length > 0 ? (
              allMeals.map((meal, index) => (
                <MealCard key={meal.id} meal={meal} index={index} />
              ))
            ) : (
              <div className="col-span-full rounded-xl border border-border border-dashed p-12 text-center text-text-muted">
                No meals were generated.
              </div>
            )}
          </div>
        </section>

        {/* Shopping List Section */}
        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-text-primary">
              <List className="h-6 w-6 text-accent" />
              Smart Grocery List
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-12 items-start">
            {/* List */}
            <div className="lg:col-span-8 rounded-2xl border border-border bg-background-card p-6 md:p-8 shadow-card">
              {shoppingList.length > 0 ? (
                <div className="space-y-10">
                  {shoppingList.map((category) => (
                    category.items.length > 0 && (
                      <div key={category.category}>
                        <h3 className="mb-4 font-display text-lg font-bold capitalize text-text-primary px-2 pb-2 border-b border-border">
                          {category.category}
                        </h3>
                        <div className="flex flex-col">
                          {category.items.map((item, i) => (
                            <ShoppingItemRow key={i} item={item} />
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-text-muted">Shopping list empty or missing.</div>
              )}
            </div>

            {/* Budget Sticky Sidebar */}
            <div className="lg:col-span-4 lg:sticky lg:top-8">
              <div className="rounded-2xl border border-border bg-background-card p-6 shadow-card overflow-hidden relative">
                {/* Decorative background glow based on budget status */}
                <div className={`absolute -right-20 -top-20 h-40 w-40 rounded-full blur-3xl opacity-20 ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`} />

                <h3 className="mb-6 flex items-center gap-2 font-display text-lg font-bold text-text-primary">
                  <DollarSign className="h-5 w-5 opacity-70" />
                  Budget Summary
                </h3>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Weekly SNAP Budget</span>
                    <span className="font-mono text-lg text-text-primary">${snapBudget?.toFixed(2)}</span>
                  </div>
                  
                  <div className="h-px w-full bg-border" />
                  
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary">Estimated Total</span>
                    <span className={`font-mono text-2xl font-bold ${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>
                      ${totalEstimatedCost.toFixed(2)}
                    </span>
                  </div>
                </div>

                {isOverBudget ? (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">
                    <strong className="block mb-1 font-semibold text-red-200">Over Budget</strong>
                    The AI-generated list exceeds your SNAP budget. Look for non-SNAP or discretionary items you can swap.
                  </div>
                ) : (
                  <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-300">
                    <strong className="block mb-1 font-semibold text-green-200">On Budget</strong>
                    Your curated shopping list fits within your weekly SNAP allocation.
                  </div>
                )}
                
                <Button variant="primary" className="w-full mt-6 h-12 text-sm">
                  Export to Instacart
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
