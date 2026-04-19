import type { ClinicalTarget } from "./types";

export const CLINICAL_COLORS: Record<ClinicalTarget, { hex: string; label: string; tailwind: string }> = {
  glycemic:    { hex: "#F59E0B", label: "Glycemic",     tailwind: "text-clinical-glycemic border-clinical-glycemic/30 bg-clinical-glycemic/10" },
  bp:          { hex: "#3B82F6", label: "Blood pressure", tailwind: "text-clinical-bp border-clinical-bp/30 bg-clinical-bp/10" },
  iron:        { hex: "#F43F5E", label: "Iron",         tailwind: "text-clinical-iron border-clinical-iron/30 bg-clinical-iron/10" },
  folate:      { hex: "#8B5CF6", label: "Folate",       tailwind: "text-clinical-folate border-clinical-folate/30 bg-clinical-folate/10" },
  pediatric:   { hex: "#14B8A6", label: "Growth",       tailwind: "text-clinical-pediatric border-clinical-pediatric/30 bg-clinical-pediatric/10" },
  cholesterol: { hex: "#6366F1", label: "Cholesterol",  tailwind: "text-clinical-cholesterol border-clinical-cholesterol/30 bg-clinical-cholesterol/10" },
  general:     { hex: "#64748B", label: "Nutrition",    tailwind: "text-clinical-general border-clinical-general/30 bg-clinical-general/10" },
};

export const AGENT_COLORS: Record<string, string> = {
  Orchestrator:        "#6C63FF",
  DiabetesAgent:       "#F59E0B",
  HypertensionAgent:   "#3B82F6",
  PregnancyAgent:      "#8B5CF6",
  PostpartumAgent:     "#8B5CF6",
  PediatricAgent:      "#14B8A6",
  IronDeficiencyAgent: "#F43F5E",
  PrediabetesAgent:    "#F59E0B",
  CholesterolAgent:    "#6366F1",
  ObesityAgent:        "#64748B",
  KidneyDiseaseAgent:  "#94A3B8",
  CulturalAgent:       "#EC4899",
  BudgetAgent:         "#22C55E",
  GradingAgent:        "#06B6D4",
};

export const DEMO_PERSONAS = {
  maria: {
    label: "Maria — Bronx, Dominican",
    zipCode: "10452",
    cuisines: "Dominican",
    snapWeeklyBudget: 180,
    wicEligible: true,
    household: [
      { id: "1", nickname: "Maria", age: 55, sex: "female" as const, conditions: ["diabetes", "hypertension"] as const, a1c: 8.2, systolicBP: 148, diastolicBP: 92 },
      { id: "2", nickname: "Daughter-in-law", age: 28, sex: "female" as const, conditions: ["pregnancy"] as const, isPregnant: true, weeksPregnant: 22 },
      { id: "3", nickname: "Grandson", age: 7, sex: "male" as const, conditions: ["none"] as const },
    ],
  },
  rashida: {
    label: "Rashida — Queens, Bangladeshi",
    zipCode: "11368",
    cuisines: "Bangladeshi",
    snapWeeklyBudget: 95,
    wicEligible: true,
    household: [
      { id: "1", nickname: "Rashida", age: 32, sex: "female" as const, conditions: ["iron_deficiency", "postpartum"] as const, isBreastfeeding: true },
      { id: "2", nickname: "Husband", age: 34, sex: "male" as const, conditions: ["none"] as const },
    ],
  },
  james: {
    label: "James — Harlem, Southern",
    zipCode: "10037",
    cuisines: "Southern American",
    snapWeeklyBudget: 45,
    wicEligible: false,
    household: [
      { id: "1", nickname: "James", age: 67, sex: "male" as const, conditions: ["prediabetes", "high_cholesterol"] as const, a1c: 6.1 },
    ],
  },
} as const;

export const SNAP_MAX_2026 = {
  1: 292, 2: 536, 3: 768, 4: 975, 5: 1158, 6: 1390,
  7: 1536, 8: 1756, additionalPerPerson: 219,
};
