// ─── Household ──────────────────────────────────────────────────────────────

export type Sex = "male" | "female" | "other";

export type Condition =
  | "diabetes"
  | "hypertension"
  | "prediabetes"
  | "pregnancy"
  | "postpartum"
  | "iron_deficiency"
  | "high_cholesterol"
  | "obesity"
  | "kidney_disease"
  | "pediatric_growth"
  | "none";

export interface HouseholdMember {
  id: string;
  nickname: string;
  age: number;
  sex: Sex;
  conditions: Condition[];
  isPregnant?: boolean;
  isBreastfeeding?: boolean;
  weeksPregnant?: number;
  // Optional lab values
  a1c?: number;         // e.g. 8.2
  systolicBP?: number;  // e.g. 148
  diastolicBP?: number; // e.g. 92
  ferritin?: number;    // µg/L
  ldl?: number;         // mg/dL
}

// ─── Intake form ────────────────────────────────────────────────────────────

export interface IntakeForm {
  household: HouseholdMember[];
  snapWeeklyBudget: number;
  wicEligible: boolean;
  zipCode: string;
  cuisines: string; // free text, e.g. "Dominican, some Chinese"
}

// ─── Agents ─────────────────────────────────────────────────────────────────

export type AgentStatus = "waiting" | "thinking" | "done" | "conflict";

export type AgentName =
  | "Orchestrator"
  | "DiabetesAgent"
  | "HypertensionAgent"
  | "PregnancyAgent"
  | "PostpartumAgent"
  | "PediatricAgent"
  | "IronDeficiencyAgent"
  | "PrediabetesAgent"
  | "CholesterolAgent"
  | "ObesityAgent"
  | "KidneyDiseaseAgent"
  | "CulturalAgent"
  | "BudgetAgent"
  | "GradingAgent";

export interface AgentUpdate {
  agent: AgentName;
  status: AgentStatus;
  message: string; // one-line description of what the agent is doing/decided
  nutrients?: Partial<NutrientTargets>;
}

// ─── Nutrition ───────────────────────────────────────────────────────────────

export interface NutrientTargets {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fiber_g: number;
  fat_g: number;
  saturated_fat_g: number;
  sodium_mg: number;
  potassium_mg: number;
  calcium_mg: number;
  iron_mg: number;
  folate_mcg: number;
  vitamin_d_iu: number;
  omega3_g: number;
  glycemic_load_target: "low" | "medium" | "unrestricted";
}

// ─── Meal plan ───────────────────────────────────────────────────────────────

export type ClinicalTarget =
  | "glycemic"
  | "bp"
  | "iron"
  | "folate"
  | "pediatric"
  | "cholesterol"
  | "general";

export interface Ingredient {
  name: string;
  amount: string;
  usdaFoodId?: string;
  estimatedCostUSD?: number;
  isWicEligible?: boolean;
}

export interface Meal {
  id: string;
  name: string;
  cuisine: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  clinicalTargets: ClinicalTarget[];
  clinicalRationale: string; // e.g. "High fiber + low glycemic index targets Maria's A1C"
  ingredients: Ingredient[];
  instructions: string[];
  prepTimeMinutes: number;
  nutrition: Partial<NutrientTargets>;
  imageQuery: string; // for Unsplash lookup, e.g. "habichuelas guisadas Dominican"
  imageUrl?: string; // populated after Unsplash fetch
  isWicEligible?: boolean;
}

export interface DayPlan {
  dayIndex: number; // 0 = Monday
  dayLabel: string;
  meals: Meal[];
  dailyNutritionSummary: Partial<NutrientTargets>;
  dominantClinicalTarget: ClinicalTarget; // used for day-level color tinting
}

export interface WeeklyPlan {
  id: string;
  generatedAt: string;
  intakeSnapshot: IntakeForm;
  days: DayPlan[];
  shoppingList: ShoppingCategory[];
  totalEstimatedCost: number;
  snapBudget: number;
  nutritionCoverage: Record<keyof NutrientTargets, number>; // 0–1, % of target met
}

// ─── Shopping ────────────────────────────────────────────────────────────────

export interface ShoppingItem {
  name: string;
  quantity: string;
  estimatedCostUSD: number;
  clinicalTargets: ClinicalTarget[];
  whyInRx: string;
  isWicEligible?: boolean;
  isSnapEligible: boolean;
}

export interface ShoppingCategory {
  category:
    | "produce"
    | "protein"
    | "grains"
    | "dairy"
    | "pantry"
    | "frozen"
    | "beverages";
  items: ShoppingItem[];
  subtotal: number;
}

// ─── Receipt & grading ───────────────────────────────────────────────────────

export interface ReceiptItem {
  rawText: string;        // as OCR'd, e.g. "GV WHL WHT BRD"
  parsedName: string;     // decoded, e.g. "Whole wheat bread"
  usdaFoodId?: string;
  price?: number;
  inRx: boolean;          // was this on the NutriRx list?
  matchedRxItem?: string; // if inRx, which item it matched
}

export interface ReceiptGrade {
  planId: string;
  gradedAt: string;
  adherenceScore: number;  // 0–100
  rxItemsBought: number;
  rxItemsMissed: number;
  offRxItems: string[];    // items bought that weren't in the Rx
  swapSuggestion: {
    bought: string;
    swapFor: string;
    reason: string;
    sameStoreLikely: boolean;
  };
  weeklyPattern?: string; // e.g. "3rd week with soda purchases"
}

// ─── Week history ────────────────────────────────────────────────────────────

export interface WeekRecord {
  weekNumber: number;
  planId: string;
  adherenceScore: number;
  avgGlycemicLoad: number;
  avgSodiumMg: number;
  avgIronMg: number;
  gradeId?: string;
}

/** One row from GET /api/history/trends */
export interface WeekTrendRow {
  week: number;
  adherence: number | null;
  glycemicLoad: number | null;
  sodiumMg: number | null;
  ironMg: number | null;
  createdAt: string;
}

/** One plan from GET /api/history */
export interface HistoryPlanListItem {
  id: string;
  createdAt: string;
  adherenceScore: number | null;
  summary: {
    totalMeals: number;
    estimatedCost?: number;
    cuisines?: string;
    householdSize?: number;
  };
  intakeSnapshot?: IntakeForm;
}
