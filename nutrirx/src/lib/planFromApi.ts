import type {
  ClinicalTarget,
  DayPlan,
  Ingredient,
  IntakeForm,
  Meal,
  ShoppingCategory,
  ShoppingItem,
  WeeklyPlan,
} from "@/lib/types";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
    nutrition: (raw.nutrition as Meal["nutrition"]) ?? {},
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
  const mealsRaw = (plan.meals as Record<string, unknown>[] | undefined) ?? [];
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
  const intake = (plan.intake_snapshot ?? {}) as IntakeForm;

  return {
    id: asString(plan.id),
    generatedAt: asString(plan.generated_at ?? plan.generatedAt),
    intakeSnapshot: intake,
    days,
    shoppingList: normalizeShoppingList(shopping),
    totalEstimatedCost: Number(shopping.total_estimated_cost ?? shopping.totalEstimatedCost ?? 0),
    snapBudget: Number(intake.snapWeeklyBudget ?? 0),
    nutritionCoverage: {} as WeeklyPlan["nutritionCoverage"],
  };
}

