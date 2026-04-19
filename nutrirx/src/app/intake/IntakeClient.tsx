"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddMemberButton } from "@/components/intake/AddMemberButton";
import { AddMemberSheet } from "@/components/intake/AddMemberSheet";
import { IntakeSummary } from "@/components/intake/IntakeSummary";
import { MemberCard } from "@/components/intake/MemberCard";
import { Button } from "@/components/ui/Button";
import { DEMO_PERSONAS } from "@/lib/constants";
import {
  INPUT_FIELD_CLASS,
  snapApproxWeeklyFromMonthly,
  snapMonthlyMaxForHouseholdSize,
} from "@/lib/intakeUtils";
import { resolveZipLabel } from "@/lib/zipLookup";
import type { HouseholdMember, IntakeForm } from "@/lib/types";
import { useNutriRx } from "@/hooks/useNutriRx";

const CUISINE_PILLS = [
  "Dominican",
  "Puerto Rican",
  "Mexican",
  "Bangladeshi",
  "Ethiopian",
  "Somali",
  "West African",
  "Southern American",
  "Korean",
  "Chinese",
  "Indian",
  "Haitian",
  "Jamaican",
  "Vietnamese",
  "Filipino",
] as const;

type DemoKey = keyof typeof DEMO_PERSONAS;

function householdFromDemo(key: DemoKey): HouseholdMember[] {
  const raw = DEMO_PERSONAS[key].household;
  return raw.map((entry) => {
    const m = entry as unknown as HouseholdMember;
    return {
      ...m,
      id: crypto.randomUUID(),
      conditions: [...m.conditions],
    };
  });
}

function snapBudgetNote(amount: number): string {
  if (amount < 50) return "Solo SNAP budget. We'll maximize every dollar.";
  if (amount <= 150) return "We'll build nutritious meals within your budget.";
  return "Good budget — we'll focus on quality and variety.";
}

export function IntakeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setIntake } = useNutriRx();

  const isBudgetStep = searchParams.get("step") === "2";

  const [household, setHousehold] = useState<HouseholdMember[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetNonce, setSheetNonce] = useState(0);
  const [editingMember, setEditingMember] = useState<HouseholdMember | null>(null);

  const [snapWeeklyBudget, setSnapWeeklyBudget] = useState("");
  /** Manual WIC opt-in when household is not auto-eligible. */
  const [wicOptIn, setWicOptIn] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [cuisines, setCuisines] = useState("");

  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step2Errors, setStep2Errors] = useState<{
    snap?: string;
    zip?: string;
    cuisine?: string;
  }>({});

  const wicEligibleHousehold = useMemo(
    () =>
      household.some(
        (m) =>
          m.conditions.includes("pregnancy") ||
          m.conditions.includes("postpartum") ||
          Boolean(m.isPregnant) ||
          Boolean(m.isBreastfeeding)
      ),
    [household]
  );

  const wicEligible = wicEligibleHousehold || wicOptIn;

  useEffect(() => {
    if (isBudgetStep && household.length === 0) {
      router.replace("/intake");
    }
  }, [isBudgetStep, household.length, router]);

  const snapNum = snapWeeklyBudget === "" ? NaN : Number(snapWeeklyBudget);
  const snapNote = !Number.isNaN(snapNum) && snapNum > 0 ? snapBudgetNote(snapNum) : null;
  const monthlyMax = snapMonthlyMaxForHouseholdSize(household.length);
  const weeklyMaxHint = snapApproxWeeklyFromMonthly(monthlyMax);
  const zipResolved = resolveZipLabel(zipCode);

  const appendCuisine = useCallback((label: string) => {
    setCuisines((prev) => {
      const t = prev.trim();
      if (!t) return label;
      if (t.toLowerCase().includes(label.toLowerCase())) return prev;
      return `${prev.trimEnd()}, ${label}`;
    });
  }, []);

  const loadDemoPersona = (key: DemoKey) => {
    const demo = DEMO_PERSONAS[key];
    setHousehold(householdFromDemo(key));
    setSnapWeeklyBudget(String(demo.snapWeeklyBudget));
    setWicOptIn(demo.wicEligible);
    setZipCode(demo.zipCode);
    setCuisines(demo.cuisines);
    setStep1Error(null);
    setStep2Errors({});
    window.setTimeout(() => {
      router.push("/intake?step=2");
    }, 300);
  };

  const goBudgetStep = () => {
    if (household.length === 0) {
      setStep1Error("Add at least one household member to continue.");
      return;
    }
    setStep1Error(null);
    router.push("/intake?step=2");
  };

  const goHouseholdStep = () => {
    router.push("/intake");
  };

  const handleMemberSaved = (member: HouseholdMember) => {
    setHousehold((prev) => {
      const idx = prev.findIndex((m) => m.id === member.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = member;
        return next;
      }
      return [...prev, member];
    });
    setEditingMember(null);
  };

  const validateStep2 = (): boolean => {
    const errors: typeof step2Errors = {};
    if (snapWeeklyBudget === "" || Number.isNaN(snapNum) || snapNum < 1 || snapNum > 2000) {
      errors.snap = "Enter a weekly SNAP budget between $1 and $2,000.";
    }
    if (!/^\d{5}$/.test(zipCode.trim())) {
      errors.zip = "Enter a valid 5-digit U.S. ZIP code.";
    }
    if (!cuisines.trim()) {
      errors.cuisine = "Tell us what your family eats.";
    }
    setStep2Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateStep2()) return;
    const form: IntakeForm = {
      household,
      snapWeeklyBudget: snapNum,
      wicEligible,
      zipCode: zipCode.trim(),
      cuisines: cuisines.trim(),
    };
    setIntake(form);
    router.push("/generate");
  };

  return (
    <main className="min-h-screen bg-background pb-24 pt-6">
      <div className="mx-auto max-w-2xl px-6">
        <AnimatePresence mode="wait">
          {!isBudgetStep ? (
            <motion.div
              key="household"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <h1 className="font-display text-3xl font-bold text-text-primary md:text-4xl">Who&apos;s at your table?</h1>
              <p className="mt-2 text-text-secondary">
                Add each person in your household. We&apos;ll tailor the plan to everyone&apos;s needs.
              </p>

              <div className="mt-8 space-y-3">
                <AnimatePresence initial={false}>
                  {household.map((m) => (
                    <motion.div
                      key={m.id}
                      layout
                      initial={{ opacity: 0, y: -12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <MemberCard
                        member={m}
                        onEdit={(mem) => {
                          setEditingMember(mem);
                          setSheetNonce((n) => n + 1);
                          setSheetOpen(true);
                        }}
                        onRemove={(id) => setHousehold((prev) => prev.filter((x) => x.id !== id))}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="mt-4">
                <AddMemberButton
                  onClick={() => {
                    setEditingMember(null);
                    setSheetNonce((n) => n + 1);
                    setSheetOpen(true);
                  }}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="font-mono text-xs"
                  onClick={() => loadDemoPersona("maria")}
                >
                  Load Maria&apos;s family
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="font-mono text-xs"
                  onClick={() => loadDemoPersona("rashida")}
                >
                  Load Rashida&apos;s family
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="font-mono text-xs"
                  onClick={() => loadDemoPersona("james")}
                >
                  Load James
                </Button>
              </div>

              {step1Error && <p className="mt-4 text-sm text-clinical-iron">{step1Error}</p>}

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="primary" size="lg" onClick={goBudgetStep}>
                  Continue →
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="budget"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Button type="button" variant="ghost" size="sm" className="mb-6 px-0" onClick={goHouseholdStep}>
                ← Back
              </Button>

              <h1 className="font-display text-3xl font-bold text-text-primary md:text-4xl">Your budget and table.</h1>
              <p className="mt-2 text-text-secondary">
                We&apos;ll size every meal to what you actually have — and to food your family loves.
              </p>

              <div className="mt-10 space-y-8">
                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium uppercase tracking-wide text-text-secondary">
                    Weekly SNAP budget
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-body text-text-muted">
                      $
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={2000}
                      className={`${INPUT_FIELD_CLASS} pl-8`}
                      placeholder="e.g. 180"
                      value={snapWeeklyBudget}
                      onChange={(e) => {
                        setSnapWeeklyBudget(e.target.value);
                        setStep2Errors((s) => ({ ...s, snap: undefined }));
                      }}
                    />
                  </div>
                  {snapNote && <p className="mt-2 text-xs text-text-muted">{snapNote}</p>}
                  {household.length > 0 && (
                    <p className="mt-2 text-xs text-text-muted">
                      For a household of {household.length}, SNAP max is ${monthlyMax}/month (${weeklyMaxHint}
                      /week). Adjust if needed.
                    </p>
                  )}
                  {step2Errors.snap && <p className="mt-1 text-sm text-clinical-iron">{step2Errors.snap}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium uppercase tracking-wide text-text-secondary">
                    Is anyone in your household WIC-eligible?
                  </label>
                  <p className="mb-3 text-xs text-text-muted">
                    WIC provides free vouchers for specific healthy foods. We&apos;ll include WIC-approved items in your
                    plan at no SNAP cost.
                  </p>
                  {wicEligibleHousehold && (
                    <p className="mb-3 text-xs text-text-secondary">Auto-enabled — you have a WIC-eligible household member.</p>
                  )}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background-surface px-4 py-3">
                    <span className="font-body text-sm text-text-primary">WIC eligible</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={wicEligible}
                      disabled={wicEligibleHousehold}
                      onClick={() => !wicEligibleHousehold && setWicOptIn((v) => !v)}
                      className={`relative h-9 w-16 rounded-full transition-colors ${
                        wicEligible ? "bg-accent" : "bg-border-strong"
                      } ${wicEligibleHousehold ? "opacity-60" : ""}`}
                    >
                      <span
                        className={`absolute top-1 h-7 w-7 rounded-full bg-white transition-transform ${
                          wicEligible ? "left-8" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                  {wicEligible && (
                    <p className="mt-2 text-xs text-text-muted">WIC foods will be flagged in your shopping list.</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium uppercase tracking-wide text-text-secondary">
                    Your ZIP code
                  </label>
                  <p className="mb-2 text-xs text-text-muted">
                    We use this to estimate local grocery availability and seasonal produce.
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{5}"
                    maxLength={5}
                    className={INPUT_FIELD_CLASS}
                    placeholder="e.g. 10452"
                    value={zipCode}
                    onChange={(e) => {
                      setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5));
                      setStep2Errors((s) => ({ ...s, zip: undefined }));
                    }}
                  />
                  {zipResolved && (
                    <p className="mt-2 text-xs text-text-secondary">
                      📍 {zipResolved}
                    </p>
                  )}
                  {step2Errors.zip && <p className="mt-1 text-sm text-clinical-iron">{step2Errors.zip}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium uppercase tracking-wide text-text-secondary">
                    What does your family eat?
                  </label>
                  <p className="mb-2 text-xs text-text-muted">
                    Be as specific as you like. Our AI understands any cuisine.
                  </p>
                  <textarea
                    rows={2}
                    className={`${INPUT_FIELD_CLASS} min-h-[88px] resize-y`}
                    placeholder="e.g. Dominican and Puerto Rican mostly, sometimes Chinese takeout-style"
                    value={cuisines}
                    onChange={(e) => {
                      setCuisines(e.target.value);
                      setStep2Errors((s) => ({ ...s, cuisine: undefined }));
                    }}
                  />
                  <div className="mt-3 flex max-w-full flex-wrap gap-2 overflow-x-auto pb-1">
                    {CUISINE_PILLS.map((pill) => (
                      <button
                        key={pill}
                        type="button"
                        onClick={() => appendCuisine(pill)}
                        className="shrink-0 rounded-full border border-border bg-background-surface px-3 py-1 font-body text-xs text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                  {step2Errors.cuisine && <p className="mt-1 text-sm text-clinical-iron">{step2Errors.cuisine}</p>}
                </div>

                <IntakeSummary
                  household={household}
                  snapWeeklyBudget={Number.isNaN(snapNum) ? 0 : snapNum}
                  wicEligible={wicEligible}
                  zipCode={zipCode}
                  cuisines={cuisines}
                />

                <Button type="button" variant="primary" size="lg" className="w-full sm:w-auto" onClick={handleSubmit}>
                  Generate my NutriRx →
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AddMemberSheet
        key={sheetNonce}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setEditingMember(null);
        }}
        household={household}
        editingMember={editingMember}
        onSaved={handleMemberSaved}
      />
    </main>
  );
}
