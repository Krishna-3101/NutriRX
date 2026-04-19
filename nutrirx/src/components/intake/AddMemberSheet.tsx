"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  Baby,
  Check,
  Droplets,
  FlaskConical,
  Heart,
  HeartPulse,
  Pill,
  Scale,
  TestTube2,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CLINICAL_COLORS } from "@/lib/constants";
import {
  INPUT_FIELD_CLASS,
  conditionToClinicalTargets,
  emptyMemberDraft,
  finalizeMemberFromDraft,
  memberToDraft,
  validateMemberDraft,
  type MemberDraft,
} from "@/lib/intakeUtils";
import type { Condition, HouseholdMember } from "@/lib/types";

const CONDITION_CARDS: {
  id: Condition;
  title: string;
  description: string;
  Icon: LucideIcon;
}[] = [
  { id: "diabetes", title: "Type 2 Diabetes", description: "Managing blood sugar", Icon: Droplets },
  { id: "hypertension", title: "Hypertension", description: "High blood pressure", Icon: Heart },
  { id: "prediabetes", title: "Prediabetes", description: "Borderline blood sugar", Icon: Activity },
  { id: "pregnancy", title: "Pregnancy", description: "Expecting", Icon: Baby },
  { id: "postpartum", title: "Postpartum", description: "Recently gave birth", Icon: HeartPulse },
  { id: "iron_deficiency", title: "Iron Deficiency", description: "Low iron / anemia", Icon: TestTube2 },
  { id: "high_cholesterol", title: "High Cholesterol", description: "Elevated LDL", Icon: Pill },
  { id: "obesity", title: "Obesity", description: "Weight management focus", Icon: Scale },
  { id: "kidney_disease", title: "Kidney Disease", description: "CKD dietary restrictions", Icon: FlaskConical },
  { id: "pediatric_growth", title: "Pediatric Growth", description: "Growth and development", Icon: Users },
  { id: "none", title: "None / Healthy", description: "No listed conditions", Icon: Check },
];

function cardAccentHex(cardId: Condition): string | null {
  if (cardId === "none") return null;
  const targets = conditionToClinicalTargets(cardId);
  const t = targets[0];
  if (!t) return null;
  return CLINICAL_COLORS[t].hex;
}

interface AddMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  household: HouseholdMember[];
  editingMember: HouseholdMember | null;
  onSaved: (member: HouseholdMember) => void;
}

export function AddMemberSheet({ open, onOpenChange, household, editingMember, onSaved }: AddMemberSheetProps) {
  const [draft, setDraft] = useState<MemberDraft>(() =>
    editingMember ? memberToDraft(editingMember) : emptyMemberDraft()
  );
  const [errors, setErrors] = useState<ReturnType<typeof validateMemberDraft>>({});

  const ageNum = draft.age === "" ? NaN : Number(draft.age);
  const showPediatricCard = !Number.isNaN(ageNum) && ageNum >= 13;
  const visibleCards = CONDITION_CARDS.filter((c) => c.id !== "pediatric_growth" || showPediatricCard);

  function toggleCondition(id: Condition) {
    setErrors({});
    if (id === "none") {
      setDraft((d) => ({ ...d, conditions: ["none"] }));
      return;
    }
    setDraft((d) => {
      let next = d.conditions.filter((c) => c !== "none");
      if (next.includes(id)) next = next.filter((c) => c !== id);
      else next = [...next, id];
      return { ...d, conditions: next };
    });
  }

  function handleSave() {
    const e = validateMemberDraft(draft, household, draft.id);
    setErrors(e);
    if (
      e.nickname ||
      e.age ||
      e.sex ||
      e.conditions ||
      e.weeksPregnant ||
      e.a1c ||
      e.systolicBP ||
      e.diastolicBP ||
      e.duplicateNickname
    )
      return;
    const member = finalizeMemberFromDraft(draft, household);
    if (!member) return;
    onSaved(member);
    onOpenChange(false);
  }

  const showDiabetesLabs = draft.conditions.includes("diabetes") || draft.conditions.includes("prediabetes");
  const showBpLabs = draft.conditions.includes("hypertension");
  const showIronLabs = draft.conditions.includes("iron_deficiency");
  const showLdlLabs = draft.conditions.includes("high_cholesterol");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[101] max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-border bg-background-card p-6 shadow-card sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          <Dialog.Description className="sr-only">
            Enter details for a household member including conditions and optional lab values.
          </Dialog.Description>
          <div className="mb-4 flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-xl font-semibold text-text-primary">
              {editingMember ? "Edit household member" : "Add household member"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-background-surface hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block font-body text-sm font-medium uppercase tracking-wide text-text-secondary">
                What should we call them?
              </label>
              <input
                className={INPUT_FIELD_CLASS}
                placeholder="Mom, Dad, Baby Sofia..."
                value={draft.nickname}
                onChange={(e) => setDraft((d) => ({ ...d, nickname: e.target.value }))}
              />
              {errors.nickname && <p className="mt-1 text-sm text-clinical-iron">{errors.nickname}</p>}
              {errors.duplicateNickname && <p className="mt-1 text-sm text-clinical-iron">{errors.duplicateNickname}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block font-body text-sm font-medium uppercase tracking-wide text-text-secondary">
                  Age
                </label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  className={INPUT_FIELD_CLASS}
                  value={draft.age}
                  onChange={(e) => setDraft((d) => ({ ...d, age: e.target.value }))}
                />
                {errors.age && <p className="mt-1 text-sm text-clinical-iron">{errors.age}</p>}
              </div>
              <div>
                <label className="mb-1.5 block font-body text-sm font-medium uppercase tracking-wide text-text-secondary">
                  Sex
                </label>
                <div className="flex rounded-lg border border-border p-1">
                  {(["male", "female", "other"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, sex: s }))}
                      className={`flex-1 rounded-md py-2 text-sm capitalize transition-colors ${
                        draft.sex === s ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {errors.sex && <p className="mt-1 text-sm text-clinical-iron">{errors.sex}</p>}
              </div>
            </div>

            <div>
              <p className="font-mono text-xs uppercase text-text-muted">Any health conditions?</p>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                {visibleCards.map((card) => {
                  const selected = draft.conditions.includes(card.id);
                  const hex = cardAccentHex(card.id);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => toggleCondition(card.id)}
                      className={`relative rounded-xl border p-3 text-left transition-all duration-200 ${
                        selected ? "shadow-sm" : "border-border bg-background-surface"
                      }`}
                      style={
                        selected && hex
                          ? {
                              borderColor: hex,
                              backgroundColor: `${hex}1A`,
                            }
                          : selected && card.id === "none"
                            ? {
                                borderColor: CLINICAL_COLORS.general.hex,
                                backgroundColor: `${CLINICAL_COLORS.general.hex}1A`,
                              }
                            : undefined
                      }
                    >
                      <span
                        className={`absolute right-2 top-2 transition-opacity duration-200 ${
                          selected ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        <Check className="h-4 w-4 text-text-primary" />
                      </span>
                      <card.Icon className="mb-2 h-5 w-5 text-text-secondary" />
                      <div className="font-body text-sm font-medium text-text-primary">{card.title}</div>
                      <div className="mt-0.5 text-xs text-text-muted">{card.description}</div>
                    </button>
                  );
                })}
              </div>
              {errors.conditions && <p className="mt-2 text-sm text-clinical-iron">{errors.conditions}</p>}
            </div>

            {draft.conditions.includes("pregnancy") && (
              <div>
                <label className="mb-1.5 block font-body text-sm font-medium uppercase tracking-wide text-text-secondary">
                  Weeks pregnant
                </label>
                <input
                  type="number"
                  min={1}
                  max={42}
                  className={INPUT_FIELD_CLASS}
                  placeholder="e.g. 22"
                  value={draft.weeksPregnant}
                  onChange={(e) => setDraft((d) => ({ ...d, weeksPregnant: e.target.value }))}
                />
                {errors.weeksPregnant && <p className="mt-1 text-sm text-clinical-iron">{errors.weeksPregnant}</p>}
              </div>
            )}

            {draft.conditions.includes("postpartum") && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-background-surface px-4 py-3">
                <span className="font-body text-sm text-text-primary">Breastfeeding?</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.isBreastfeeding}
                  onClick={() => setDraft((d) => ({ ...d, isBreastfeeding: !d.isBreastfeeding }))}
                  className={`relative h-8 w-14 rounded-full transition-colors ${
                    draft.isBreastfeeding ? "bg-accent" : "bg-border-strong"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${
                      draft.isBreastfeeding ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, labsOpen: !d.labsOpen }))}
                className="font-body text-sm text-accent hover:text-accent-hover"
              >
                {draft.labsOpen ? "Hide lab values ↑" : "Add lab values (optional) ↓"}
              </button>
              {draft.labsOpen && (
                <div className="mt-3 space-y-3 rounded-lg border border-border bg-background-surface p-4">
                  {showDiabetesLabs && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                        A1C (%)
                      </label>
                      <input
                        type="number"
                        step={0.1}
                        min={4}
                        max={15}
                        className={INPUT_FIELD_CLASS}
                        placeholder="e.g. 8.2"
                        value={draft.a1c}
                        onChange={(e) => setDraft((d) => ({ ...d, a1c: e.target.value }))}
                      />
                      {errors.a1c && <p className="mt-1 text-sm text-clinical-iron">{errors.a1c}</p>}
                      <p className="mt-1 text-xs text-text-muted">
                        If you don&apos;t know this, skip it — your plan will still work.
                      </p>
                    </div>
                  )}
                  {showBpLabs && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                          Systolic
                        </label>
                        <input
                          type="number"
                          className={INPUT_FIELD_CLASS}
                          value={draft.systolicBP}
                          onChange={(e) => setDraft((d) => ({ ...d, systolicBP: e.target.value }))}
                        />
                        {errors.systolicBP && <p className="mt-1 text-sm text-clinical-iron">{errors.systolicBP}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                          Diastolic
                        </label>
                        <input
                          type="number"
                          className={INPUT_FIELD_CLASS}
                          value={draft.diastolicBP}
                          onChange={(e) => setDraft((d) => ({ ...d, diastolicBP: e.target.value }))}
                        />
                        {errors.diastolicBP && <p className="mt-1 text-sm text-clinical-iron">{errors.diastolicBP}</p>}
                      </div>
                      <p className="col-span-2 text-xs text-text-muted">
                        If you don&apos;t know this, skip it — your plan will still work.
                      </p>
                    </div>
                  )}
                  {showIronLabs && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                        Ferritin (µg/L)
                      </label>
                      <input
                        type="number"
                        className={INPUT_FIELD_CLASS}
                        value={draft.ferritin}
                        onChange={(e) => setDraft((d) => ({ ...d, ferritin: e.target.value }))}
                      />
                      <p className="mt-1 text-xs text-text-muted">
                        If you don&apos;t know this, skip it — your plan will still work.
                      </p>
                    </div>
                  )}
                  {showLdlLabs && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                        LDL (mg/dL)
                      </label>
                      <input
                        type="number"
                        className={INPUT_FIELD_CLASS}
                        value={draft.ldl}
                        onChange={(e) => setDraft((d) => ({ ...d, ldl: e.target.value }))}
                      />
                      <p className="mt-1 text-xs text-text-muted">
                        If you don&apos;t know this, skip it — your plan will still work.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button type="button" variant="primary" className="w-full" size="lg" onClick={handleSave}>
              Add to household
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
