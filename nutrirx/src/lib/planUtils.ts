import { CLINICAL_COLORS } from "@/lib/constants";
import type { ClinicalTarget, DayPlan, IntakeForm, Meal, NutrientTargets, WeeklyPlan } from "@/lib/types";

const NUTRIENT_KEYS = [
  "calories_kcal",
  "protein_g",
  "carbs_g",
  "fiber_g",
  "fat_g",
  "saturated_fat_g",
  "sodium_mg",
  "potassium_mg",
  "calcium_mg",
  "iron_mg",
  "folate_mcg",
  "vitamin_d_iu",
  "omega3_g",
] as const satisfies readonly (keyof NutrientTargets)[];

type SummedNutrientKey = (typeof NUTRIENT_KEYS)[number];

export function aggregateMealsNutrition(meals: Meal[]): Partial<NutrientTargets> {
  const acc = {} as Partial<Pick<NutrientTargets, SummedNutrientKey>>;
  for (const meal of meals) {
    const n = meal.nutrition ?? {};
    for (const k of NUTRIENT_KEYS) {
      const v = n[k];
      if (typeof v === "number") {
        const prev = acc[k];
        acc[k] = (typeof prev === "number" ? prev : 0) + v;
      }
    }
  }
  return acc;
}

/** Default daily targets for summary bars when plan has no merged targets. */
export const DEFAULT_DAY_TARGETS: Partial<NutrientTargets> = {
  fiber_g: 30,
  iron_mg: 18,
  sodium_mg: 2300,
  calories_kcal: 2000,
};

export function householdLabel(intake: IntakeForm): string {
  const first = intake.household[0]?.nickname?.trim();
  if (!first) return "Your household";
  return `${first}'s household`;
}

export function topClinicalTargetsFromPlan(plan: WeeklyPlan, limit = 3): ClinicalTarget[] {
  const counts = new Map<ClinicalTarget, number>();
  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const t of meal.clinicalTargets ?? []) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
}

export function dominantTargetHex(target: ClinicalTarget): string {
  return CLINICAL_COLORS[target]?.hex ?? CLINICAL_COLORS.general.hex;
}

export function intakeConditionFlags(intake: IntakeForm): {
  diabetesLike: boolean;
  ironFocus: boolean;
  hypertension: boolean;
} {
  let diabetesLike = false;
  let ironFocus = false;
  let hypertension = false;
  for (const m of intake.household) {
    for (const c of m.conditions) {
      if (c === "diabetes" || c === "prediabetes") diabetesLike = true;
      if (c === "iron_deficiency") ironFocus = true;
      if (c === "hypertension") hypertension = true;
    }
  }
  return { diabetesLike, ironFocus, hypertension };
}

export function mealCardNutrientLine(
  meal: Meal,
  flags: ReturnType<typeof intakeConditionFlags>
): string {
  const parts: string[] = [`⏱ ${meal.prepTimeMinutes} min`];
  const n = meal.nutrition ?? {};
  if (flags.diabetesLike && n.fiber_g != null) parts.push(`Fiber ${n.fiber_g}g`);
  if (flags.ironFocus && n.iron_mg != null) parts.push(`Iron ${n.iron_mg}mg`);
  if (flags.hypertension && n.sodium_mg != null) parts.push(`Sodium ${n.sodium_mg}mg`);
  if (parts.length === 1) {
    if (n.fiber_g != null) parts.push(`Fiber ${n.fiber_g}g`);
    else if (n.protein_g != null) parts.push(`Protein ${n.protein_g}g`);
  }
  return parts.join("  ·  ");
}

export function daySummaryWithFallback(day: DayPlan): Partial<NutrientTargets> {
  const keys = Object.keys(day.dailyNutritionSummary ?? {}).length;
  if (keys > 0) return day.dailyNutritionSummary;
  return aggregateMealsNutrition(day.meals);
}
