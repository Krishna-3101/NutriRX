import { aggregateMealsNutrition } from "@/lib/planUtils";
import type {
  ClinicalTarget,
  DayPlan,
  Ingredient,
  IntakeForm,
  Meal,
  NutrientTargets,
  ShoppingCategory,
  ShoppingItem,
  WeeklyPlan,
} from "@/lib/types";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const NUTRIENT_COVERAGE_KEYS: (keyof NutrientTargets)[] = [
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
];

/** Try several key spellings the LLM / Python stack may emit. */
function pickMergedNumber(merged: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = merged[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/[^\d.-]/g, ""));
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

function emptyNutritionCoverage(): WeeklyPlan["nutritionCoverage"] {
  const o = {} as WeeklyPlan["nutritionCoverage"];
  for (const k of NUTRIENT_COVERAGE_KEYS) {
    o[k] = 0;
  }
  o.glycemic_load_target = 0;
  return o;
}

function computeNutritionCoverage(
  meals: Meal[],
  negotiation: Record<string, unknown>
): WeeklyPlan["nutritionCoverage"] {
  const mergedRaw =
    (negotiation.merged_targets as Record<string, unknown> | undefined) ??
    (negotiation.mergedTargets as Record<string, unknown> | undefined) ??
    {};
  const weeklyTotals = aggregateMealsNutrition(meals);
  const out = emptyNutritionCoverage();

  const dailyTarget = (camel: keyof NutrientTargets): number => {
    const snake = camel.replace(/([A-Z])/g, "_$1").toLowerCase();
    return pickMergedNumber(mergedRaw, camel, snake);
  };

  for (const key of NUTRIENT_COVERAGE_KEYS) {
    const perDay = dailyTarget(key);
    const weekNeed = perDay > 0 ? perDay * 7 : 0;
    const raw = weeklyTotals[key];
    const actual = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    out[key] = weekNeed > 0 ? Math.min(1.25, actual / weekNeed) : 0;
  }
  out.glycemic_load_target = 0;
  return out;
}

function extractMealsRaw(plan: Record<string, unknown>): Record<string, unknown>[] {
  const days = plan.days as unknown[] | undefined;
  if (Array.isArray(days) && days.length > 0) {
    const first = days[0] as Record<string, unknown>;
    if (first && Array.isArray(first.meals)) {
      return days.flatMap((d) => {
        const day = d as Record<string, unknown>;
        return (Array.isArray(day.meals) ? day.meals : []) as Record<string, unknown>[];
      });
    }
  }
  const meals = plan.meals ?? plan.meal_plan;
  if (Array.isArray(meals)) return meals as Record<string, unknown>[];
  return [];
}

function normalizeNutrition(raw: unknown): Partial<NutrientTargets> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const num = (v: unknown): number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/[^\d.-]/g, ""));
      return Number.isNaN(n) ? undefined : n;
    }
    return undefined;
  };
  const out: Partial<NutrientTargets> = {};
  const o = out as Record<string, number>;
  const pick = (key: keyof NutrientTargets, ...aliases: string[]) => {
    for (const k of [String(key), ...aliases]) {
      const v = num(r[k]);
      if (v != null) {
        o[String(key)] = v;
        return;
      }
    }
  };
  pick("calories_kcal", "calories");
  pick("protein_g", "protein");
  pick("carbs_g", "carbs");
  pick("fiber_g", "fiber");
  pick("fat_g", "fat");
  pick("saturated_fat_g", "saturated_fat");
  pick("sodium_mg", "sodium");
  pick("potassium_mg", "potassium");
  pick("calcium_mg", "calcium");
  pick("iron_mg", "iron");
  pick("folate_mcg", "folate");
  pick("vitamin_d_iu", "vitamin_d", "vitaminD");
  pick("omega3_g", "omega3", "omega_3");
  return out;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function normalizeIngredient(raw: Record<string, unknown>): Ingredient {
  return {
    name: asString(raw.name),
    amount: asString(raw.amount),
    usdaFoodId: raw.usda_food_id != null ? asString(raw.usda_food_id) : raw.usdaFoodId != null ? asString(raw.usdaFoodId) : undefined,
    estimatedCostUSD:
      typeof raw.estimated_cost_usd === "number"
        ? raw.estimated_cost_usd
        : typeof raw.estimatedCostUSD === "number"
          ? raw.estimatedCostUSD
          : undefined,
  };
}

function normalizeMeal(raw: Record<string, unknown>, index: number): Meal {
  const clinicalTargets = (raw.clinical_targets ?? raw.clinicalTargets) as ClinicalTarget[] | undefined;
  const ingredientsRaw = (raw.ingredients as Record<string, unknown>[] | undefined) ?? [];
  const instructionsRaw = (raw.instructions as unknown[] | undefined) ?? [];

  return {
    id: asString(raw.id) || `meal-${index}`,
    name: asString(raw.name),
    cuisine: asString(raw.cuisine),
    mealType: (raw.meal_type ?? raw.mealType ?? "dinner") as Meal["mealType"],
    clinicalTargets: Array.isArray(clinicalTargets) ? clinicalTargets : [],
    clinicalRationale: asString(raw.clinical_rationale ?? raw.clinicalRationale),
    ingredients: ingredientsRaw.map((i) => normalizeIngredient(i)),
    instructions: instructionsRaw.map((s) => asString(s)),
    prepTimeMinutes: Number(raw.prep_time_minutes ?? raw.prepTimeMinutes ?? 30),
    nutrition: normalizeNutrition(raw.nutrition),
    imageQuery: asString(raw.image_query ?? raw.imageQuery ?? raw.name),
    imageUrl: raw.image_url != null ? asString(raw.image_url) : raw.imageUrl != null ? asString(raw.imageUrl) : undefined,
    isWicEligible:
      typeof raw.is_wic_eligible === "boolean"
        ? raw.is_wic_eligible
        : typeof raw.isWicEligible === "boolean"
          ? raw.isWicEligible
          : undefined,
  };
}

function normalizeShoppingItem(raw: Record<string, unknown>): ShoppingItem {
  return {
    name: asString(raw.name),
    quantity: asString(raw.quantity),
    estimatedCostUSD: Number(raw.estimated_cost_usd ?? raw.estimatedCostUSD ?? 0),
    clinicalTargets: (Array.isArray(raw.clinical_targets) ? raw.clinical_targets : raw.clinicalTargets) as ClinicalTarget[],
    whyInRx: asString(raw.why_in_rx ?? raw.whyInRx),
    isWicEligible:
      typeof raw.is_wic_eligible === "boolean"
        ? raw.is_wic_eligible
        : typeof raw.isWicEligible === "boolean"
          ? raw.isWicEligible
          : undefined,
    isSnapEligible:
      typeof raw.is_snap_eligible === "boolean"
        ? raw.is_snap_eligible
        : typeof raw.isSnapEligible === "boolean"
          ? raw.isSnapEligible
          : true,
  };
}

const SHOP_CATS = new Set<string>([
  "produce",
  "protein",
  "grains",
  "dairy",
  "pantry",
  "frozen",
  "beverages",
]);

function normalizeShoppingList(shopping: Record<string, unknown>): ShoppingCategory[] {
  const categories = (shopping.categories as Record<string, unknown>[] | undefined) ?? [];
  return categories.map((c) => ({
    category: (SHOP_CATS.has(asString(c.category)) ? asString(c.category) : "pantry") as ShoppingCategory["category"],
    items: ((c.items as Record<string, unknown>[] | undefined) ?? []).map(normalizeShoppingItem),
    subtotal: Number(c.subtotal ?? 0),
  }));
}

/** Backend `plan` payload from SSE `complete` event. */
export function weeklyPlanFromApiPlan(plan: Record<string, unknown>): WeeklyPlan {
  const mealsRaw = extractMealsRaw(plan);
  const meals = mealsRaw.map((m, i) => normalizeMeal(m, i));

  const days: DayPlan[] = [];
  for (let d = 0; d < 7; d++) {
    const dayMeals = meals.slice(d * 4, d * 4 + 4);
    const firstTarget = dayMeals[0]?.clinicalTargets?.[0];
    days.push({
      dayIndex: d,
      dayLabel: DAY_LABELS[d],
      meals: dayMeals,
      dailyNutritionSummary: {},
      dominantClinicalTarget: (firstTarget ?? "general") as ClinicalTarget,
    });
  }

  const shopping = (plan.shopping ?? {}) as Record<string, unknown>;
  const intake = (plan.intake_snapshot ?? plan.intakeSnapshot ?? {}) as IntakeForm;
  const negotiation = (plan.negotiation ?? {}) as Record<string, unknown>;

  return {
    id: asString(plan.id),
    generatedAt: asString(plan.generated_at ?? plan.generatedAt),
    intakeSnapshot: intake,
    days,
    shoppingList: normalizeShoppingList(shopping),
    totalEstimatedCost: Number(shopping.total_estimated_cost ?? shopping.totalEstimatedCost ?? 0),
    snapBudget: Number(intake.snapWeeklyBudget ?? 0),
    nutritionCoverage: computeNutritionCoverage(meals, negotiation),
  };
}

