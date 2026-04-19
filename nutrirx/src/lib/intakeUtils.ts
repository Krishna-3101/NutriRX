import { AGENT_COLORS } from "@/lib/constants";
import { SNAP_MAX_2026 } from "@/lib/constants";
import type { AgentName, ClinicalTarget, Condition, HouseholdMember, Sex } from "@/lib/types";

export const INPUT_FIELD_CLASS =
  "bg-background-surface border border-border text-text-primary rounded-lg px-4 py-3 text-base font-body placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-colors duration-150 w-full";

export function conditionToClinicalTargets(c: Condition): ClinicalTarget[] {
  switch (c) {
    case "diabetes":
    case "prediabetes":
      return ["glycemic"];
    case "hypertension":
      return ["bp"];
    case "iron_deficiency":
      return ["iron"];
    case "pregnancy":
    case "postpartum":
      return ["folate"];
    case "pediatric_growth":
      return ["pediatric"];
    case "high_cholesterol":
      return ["cholesterol"];
    case "obesity":
    case "kidney_disease":
      return ["general"];
    default:
      return [];
  }
}

export function memberConditionBadges(conditions: Condition[]): ClinicalTarget[] {
  const seen = new Set<ClinicalTarget>();
  const out: ClinicalTarget[] = [];
  for (const c of conditions) {
    if (c === "none") continue;
    for (const t of conditionToClinicalTargets(c)) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  return out;
}

/** Avatar / tint priority per PRD-02 §2.2 */
export function dominantMemberTint(member: HouseholdMember): "amber" | "blue" | "violet" | "rose" | "teal" | "accent" {
  const { conditions, age } = member;
  const has = (c: Condition) => conditions.includes(c);

  if (has("diabetes") || has("prediabetes")) return "amber";
  if (has("hypertension")) return "blue";
  if (has("pregnancy") || has("postpartum")) return "violet";
  if (has("iron_deficiency")) return "rose";
  if (age < 18 && (conditions.includes("none") || conditions.length === 0 || !conditions.some((c) => c !== "none")))
    return "teal";
  if (has("pediatric_growth")) return "teal";
  return "accent";
}

export function monogramFromNickname(nickname: string): string {
  const parts = nickname.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AGENT_PREVIEW_ORDER: AgentName[] = [
  "DiabetesAgent",
  "HypertensionAgent",
  "PregnancyAgent",
  "PostpartumAgent",
  "PediatricAgent",
  "IronDeficiencyAgent",
  "PrediabetesAgent",
  "CholesterolAgent",
  "ObesityAgent",
  "KidneyDiseaseAgent",
  "CulturalAgent",
  "BudgetAgent",
];

export function agentsToActivateFromHousehold(household: HouseholdMember[]): AgentName[] {
  const set = new Set<AgentName>();
  set.add("CulturalAgent");
  set.add("BudgetAgent");

  for (const m of household) {
    for (const c of m.conditions) {
      if (c === "none") continue;
      switch (c) {
        case "diabetes":
          set.add("DiabetesAgent");
          break;
        case "prediabetes":
          set.add("PrediabetesAgent");
          break;
        case "hypertension":
          set.add("HypertensionAgent");
          break;
        case "pregnancy":
          set.add("PregnancyAgent");
          break;
        case "postpartum":
          set.add("PostpartumAgent");
          break;
        case "iron_deficiency":
          set.add("IronDeficiencyAgent");
          break;
        case "high_cholesterol":
          set.add("CholesterolAgent");
          break;
        case "obesity":
          set.add("ObesityAgent");
          break;
        case "kidney_disease":
          set.add("KidneyDiseaseAgent");
          break;
        case "pediatric_growth":
          set.add("PediatricAgent");
          break;
        default:
          break;
      }
    }
    if (m.age < 18) set.add("PediatricAgent");
  }

  return AGENT_PREVIEW_ORDER.filter((a) => set.has(a));
}

export function agentPillStyle(agent: AgentName): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  const hex = AGENT_COLORS[agent] ?? "#6C63FF";
  return {
    backgroundColor: `${hex}22`,
    color: hex,
    borderColor: `${hex}44`,
  };
}

export function snapMonthlyMaxForHouseholdSize(size: number): number {
  if (size <= 0) return SNAP_MAX_2026[1];
  if (size <= 8) return SNAP_MAX_2026[size as keyof typeof SNAP_MAX_2026];
  return SNAP_MAX_2026[8] + (size - 8) * SNAP_MAX_2026.additionalPerPerson;
}

export function snapApproxWeeklyFromMonthly(monthly: number): number {
  return Math.round(monthly / 4);
}

export interface MemberDraftErrors {
  nickname?: string;
  age?: string;
  sex?: string;
  conditions?: string;
  weeksPregnant?: string;
  a1c?: string;
  systolicBP?: string;
  diastolicBP?: string;
  duplicateNickname?: string;
}

export interface MemberDraft {
  id?: string;
  nickname: string;
  age: string;
  sex: Sex | "";
  conditions: Condition[];
  isPregnant: boolean;
  isBreastfeeding: boolean;
  weeksPregnant: string;
  a1c: string;
  systolicBP: string;
  diastolicBP: string;
  ferritin: string;
  ldl: string;
  labsOpen: boolean;
}

export function emptyMemberDraft(): MemberDraft {
  return {
    nickname: "",
    age: "",
    sex: "",
    conditions: [],
    isPregnant: false,
    isBreastfeeding: false,
    weeksPregnant: "",
    a1c: "",
    systolicBP: "",
    diastolicBP: "",
    ferritin: "",
    ldl: "",
    labsOpen: false,
  };
}

export function memberToDraft(m: HouseholdMember): MemberDraft {
  return {
    id: m.id,
    nickname: m.nickname,
    age: String(m.age),
    sex: m.sex,
    conditions: [...m.conditions],
    isPregnant: Boolean(m.isPregnant),
    isBreastfeeding: Boolean(m.isBreastfeeding),
    weeksPregnant: m.weeksPregnant != null ? String(m.weeksPregnant) : "",
    a1c: m.a1c != null ? String(m.a1c) : "",
    systolicBP: m.systolicBP != null ? String(m.systolicBP) : "",
    diastolicBP: m.diastolicBP != null ? String(m.diastolicBP) : "",
    ferritin: m.ferritin != null ? String(m.ferritin) : "",
    ldl: m.ldl != null ? String(m.ldl) : "",
    labsOpen: false,
  };
}

export function validateMemberDraft(
  draft: MemberDraft,
  household: HouseholdMember[],
  editingId?: string
): MemberDraftErrors {
  const errors: MemberDraftErrors = {};
  const nick = draft.nickname.trim();
  if (nick.length < 1 || nick.length > 30) errors.nickname = "Name must be 1–30 characters.";
  const ageNum = Number(draft.age);
  if (draft.age === "" || Number.isNaN(ageNum) || ageNum < 0 || ageNum > 120) errors.age = "Enter an age from 0–120.";
  if (draft.sex === "") errors.sex = "Select a sex.";

  const dup = household.some(
    (m) => m.nickname.trim().toLowerCase() === nick.toLowerCase() && m.id !== editingId
  );
  if (nick && dup) errors.duplicateNickname = "That nickname is already used for someone else.";

  if (draft.conditions.length === 0) errors.conditions = "Select at least one option (including None / Healthy).";

  if (draft.conditions.includes("pregnancy")) {
    const w = Number(draft.weeksPregnant);
    if (draft.weeksPregnant === "" || Number.isNaN(w) || w < 1 || w > 42)
      errors.weeksPregnant = "Weeks pregnant must be 1–42.";
  }

  if (draft.a1c !== "") {
    const a = Number(draft.a1c);
    if (Number.isNaN(a) || a < 4 || a > 15) errors.a1c = "A1C must be between 4.0 and 15.0.";
  }
  if (draft.systolicBP !== "") {
    const s = Number(draft.systolicBP);
    if (Number.isNaN(s) || s < 70 || s > 250) errors.systolicBP = "Systolic must be 70–250.";
  }
  if (draft.diastolicBP !== "") {
    const d = Number(draft.diastolicBP);
    if (Number.isNaN(d) || d < 40 || d > 150) errors.diastolicBP = "Diastolic must be 40–150.";
  }

  return errors;
}

export function finalizeMemberFromDraft(draft: MemberDraft, household: HouseholdMember[]): HouseholdMember | null {
  const editingId = draft.id;
  const errs = validateMemberDraft(draft, household, editingId);
  if (
    errs.nickname ||
    errs.age ||
    errs.sex ||
    errs.conditions ||
    errs.weeksPregnant ||
    errs.a1c ||
    errs.systolicBP ||
    errs.diastolicBP ||
    errs.duplicateNickname
  )
    return null;

  let conditions = [...draft.conditions];
  if (conditions.includes("none")) conditions = ["none"];
  const ageNum = Number(draft.age);
  if (ageNum < 13 && !conditions.includes("none")) {
    if (!conditions.includes("pediatric_growth")) conditions = [...conditions, "pediatric_growth"];
  }

  const member: HouseholdMember = {
    id: draft.id ?? crypto.randomUUID(),
    nickname: draft.nickname.trim(),
    age: ageNum,
    sex: draft.sex as Sex,
    conditions,
    isPregnant: draft.conditions.includes("pregnancy") ? true : undefined,
    isBreastfeeding: draft.conditions.includes("postpartum") ? draft.isBreastfeeding : undefined,
    weeksPregnant:
      draft.conditions.includes("pregnancy") && draft.weeksPregnant !== "" ? Number(draft.weeksPregnant) : undefined,
  };

  if (draft.a1c !== "") member.a1c = Number(draft.a1c);
  if (draft.systolicBP !== "") member.systolicBP = Number(draft.systolicBP);
  if (draft.diastolicBP !== "") member.diastolicBP = Number(draft.diastolicBP);
  if (draft.ferritin !== "") member.ferritin = Number(draft.ferritin);
  if (draft.ldl !== "") member.ldl = Number(draft.ldl);

  return member;
}
