"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BarChart2,
  Check,
  Receipt,
  ScanText,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { gradeReceiptParsed } from "@/lib/api";
import { useNutriRx } from "@/hooks/useNutriRx";
import type { ReceiptGrade } from "@/lib/types";

type Phase = "upload" | "grading" | "results";

const MAX_BYTES = 10 * 1024 * 1024;
const CYCLE = ["Decoding store abbreviations...", "Comparing to your prescription...", "Finding your best swap..."];

function AdherenceRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#14B8A6" : score >= 60 ? "#F59E0B" : "#F43F5E";

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg width="144" height="144" viewBox="0 0 144 144" className="mx-auto">
        <circle cx="72" cy="72" r="54" fill="none" stroke="#1E1E35" strokeWidth="8" />
        <motion.circle
          cx="72"
          cy="72"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          transform="rotate(-90 72 72)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-display text-4xl font-bold"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {Math.round(score)}
        </motion.span>
        <span className="font-mono text-xs text-text-muted">%</span>
      </div>
    </div>
  );
}

function gradeLabel(score: number): { text: string; className: string } {
  if (score >= 90) return { text: "Excellent 🎯", className: "text-clinical-pediatric" };
  if (score >= 75) return { text: "Great work", className: "text-clinical-pediatric" };
  if (score >= 60) return { text: "Good start", className: "text-clinical-glycemic" };
  if (score >= 40) return { text: "Needs improvement", className: "text-clinical-glycemic" };
  return { text: "Let's keep trying", className: "text-clinical-iron" };
}

export default function ReceiptPage() {
  const router = useRouter();
  const { weeklyPlan, intake, setIntake, setReceiptGrade } = useNutriRx();
  const [phase, setPhase] = useState<Phase>("upload");
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grade, setGrade] = useState<ReceiptGrade | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [missOpen, setMissOpen] = useState(false);
  const [cycleIdx, setCycleIdx] = useState(0);
  const [gradingTick, setGradingTick] = useState(0);

  useEffect(() => {
    if (!weeklyPlan) router.replace("/intake");
  }, [weeklyPlan, router]);

  useEffect(() => {
    if (phase !== "grading") return;
    const t = window.setInterval(() => setCycleIdx((i) => (i + 1) % CYCLE.length), 2000);
    const t2 = window.setInterval(() => setGradingTick((x) => x + 1), 1500);
    return () => {
      window.clearInterval(t);
      window.clearInterval(t2);
    };
  }, [phase]);

  const onFile = useCallback((f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!/^image\/(jpeg|png|heic|heif)$/i.test(f.type) && !f.name.match(/\.(jpg|jpeg|png|heic)$/i)) {
      setError("File must be a JPG, PNG, or HEIC under 10MB.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("File must be a JPG, PNG, or HEIC under 10MB.");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }, []);

  const submit = useCallback(() => {
    if (!file || !weeklyPlan) return;
    setPhase("grading");
    setError(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const res = await gradeReceiptParsed(weeklyPlan.id, base64);
      if (!res.ok) {
        setError(res.message);
        setPhase("upload");
        return;
      }
      setGrade(res.grade);
      setReceiptGrade(res.grade);
      setPhase("results");
    };
    reader.readAsDataURL(file);
  }, [file, weeklyPlan, setReceiptGrade]);

  const totalRx = useMemo(() => {
    if (!grade) return 0;
    return grade.rxItemsBought + grade.rxItemsMissed;
  }, [grade]);

  if (!weeklyPlan) return null;

  return (
    <main className="min-h-screen bg-background px-6 py-10 selection:bg-accent/20">
      <div className="mx-auto max-w-xl">
        <AnimatePresence mode="wait">
          {phase === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex min-h-[60vh] flex-col justify-center"
            >
              <h1 className="font-display text-3xl font-bold text-text-primary">How did you do?</h1>
              <p className="mt-2 text-text-secondary">
                Upload your grocery receipt. We&apos;ll score how well you followed your Rx and suggest one swap for
                next week.
              </p>

              {error && (
                <div className="mt-4 flex items-start gap-2 text-sm text-clinical-iron">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!previewUrl ? (
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) onFile(f);
                  }}
                  className={`mt-8 flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed transition-all duration-200 ${
                    drag ? "border-accent bg-accent/10" : "border-border hover:border-accent/50 hover:bg-accent/5"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                  />
                  <Receipt className={`h-12 w-12 ${drag ? "text-accent" : "text-text-muted"}`} />
                  <div className="text-center">
                    <div className="font-display text-lg font-semibold text-text-primary">Drop your receipt photo here</div>
                    <div className="mt-1 font-mono text-sm text-text-muted">or click to browse</div>
                    <div className="mt-2 font-mono text-xs text-text-muted">JPG, PNG, HEIC · Max 10MB</div>
                  </div>
                </label>
              ) : (
                <div className="mt-8">
                  <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-background-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Receipt preview" className="max-h-[420px] w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => onFile(null)}
                      className="no-print absolute right-3 top-3 rounded-lg border border-border bg-background px-3 py-1 text-sm text-text-secondary hover:text-text-primary"
                    >
                      ✕ Remove
                    </button>
                  </div>
                  <Button variant="primary" className="mt-6 w-full" onClick={submit}>
                    Looks good — grade it →
                  </Button>
                  <p className="mt-2 text-center font-mono text-xs text-text-muted">
                    Make sure the full receipt is visible and well-lit
                  </p>
                </div>
              )}

              <ul className="mt-8 space-y-2 font-mono text-xs text-text-muted">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-clinical-pediatric" /> Full receipt visible (not cropped)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-clinical-pediatric" /> Text readable (not blurry)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-clinical-pediatric" /> Good lighting (not too dark)
                </li>
              </ul>
            </motion.div>
          )}

          {phase === "grading" && (
            <motion.div
              key="grading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[60vh] flex-col items-center justify-center text-center"
            >
              <motion.div
                animate={{ rotate: [0, 2, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Receipt className="h-16 w-16 text-accent" />
              </motion.div>
              <h2 className="mt-8 font-display text-xl font-semibold text-text-primary">Grading Agent is reviewing...</h2>
              <GradingSteps tick={gradingTick} />
              <motion.p
                key={cycleIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 font-mono text-sm text-text-muted"
              >
                {CYCLE[cycleIdx]}
              </motion.p>
            </motion.div>
          )}

          {phase === "results" && grade && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative pb-12"
            >
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => setLightbox(true)}
                  className="absolute right-0 top-0 h-20 w-16 overflow-hidden rounded-lg border border-border opacity-60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                </button>
              )}

              <AdherenceRing score={grade.adherenceScore} />
              {(() => {
                const gl = gradeLabel(grade.adherenceScore);
                return (
                  <p className={`mt-4 text-center font-display text-lg font-semibold ${gl.className}`}>{gl.text}</p>
                );
              })()}
              <p className="mt-2 text-center text-sm text-text-secondary">
                You bought {grade.rxItemsBought} of {totalRx || "—"} items on your NutriRx this week.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-clinical-pediatric/30 bg-clinical-pediatric/10 p-4 text-center">
                  <div className="font-display text-4xl font-bold text-text-primary">{grade.rxItemsBought}</div>
                  <div className="font-mono text-xs text-text-muted">items bought from your Rx</div>
                </div>
                <div className="rounded-xl border border-clinical-iron/30 bg-clinical-iron/10 p-4 text-center">
                  <div className="font-display text-4xl font-bold text-text-primary">{grade.rxItemsMissed}</div>
                  <div className="font-mono text-xs text-text-muted">items missed from your Rx</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMissOpen((o) => !o)}
                className="mt-4 flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 font-mono text-xs uppercase text-text-muted"
              >
                What did you miss?
                <span>{missOpen ? "▲" : "▼"}</span>
              </button>
              <AnimatePresence>
                {missOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden text-sm text-text-secondary"
                  >
                    <p className="py-3">
                      {grade.rxItemsMissed > 0
                        ? `${grade.rxItemsMissed} Rx items were not matched on this receipt. Review your shopping list for items to prioritize next trip.`
                        : "No missed Rx items detected."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {grade.offRxItems.length > 0 && (
                <div className="mt-6">
                  <div className="font-mono text-xs uppercase text-text-muted">Not on your Rx</div>
                  <ul className="mt-2 space-y-1">
                    {grade.offRxItems.slice(0, 5).map((name) => (
                      <li key={name} className="flex items-center gap-2 text-sm text-text-secondary">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {name}
                      </li>
                    ))}
                  </ul>
                  {grade.offRxItems.length > 5 && (
                    <p className="mt-1 font-mono text-xs text-text-muted">+{grade.offRxItems.length - 5} more</p>
                  )}
                </div>
              )}

              <div className="mt-8 rounded-2xl border border-accent/30 bg-accent/10 p-6">
                <div className="font-mono text-xs uppercase tracking-widest text-accent">One swap for next week</div>
                <div className="mt-4 flex flex-col items-stretch gap-4 md:flex-row md:items-center">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-secondary">{grade.swapSuggestion.bought}</div>
                  </div>
                  <div className="text-center font-display text-3xl text-accent">→</div>
                  <div className="flex-1 text-right">
                    <div className="text-sm font-bold text-text-primary">{grade.swapSuggestion.swapFor}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm italic text-text-secondary">{grade.swapSuggestion.reason}</p>
                {grade.swapSuggestion.sameStoreLikely && (
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-clinical-pediatric/10 px-2 py-1 font-mono text-xs text-clinical-pediatric">
                    <Check className="h-3 w-3" /> Same store, same price tier
                  </span>
                )}
              </div>

              {grade.weeklyPattern && (
                <div className="mt-4 rounded-xl border border-clinical-glycemic/30 bg-clinical-glycemic/10 px-4 py-3 font-mono text-xs text-text-secondary">
                  ⚠ Recurring pattern: &quot;{grade.weeklyPattern}&quot;
                </div>
              )}

              <div className="mt-10 flex flex-col gap-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    const snap = intake ?? weeklyPlan.intakeSnapshot;
                    setIntake(snap);
                    router.push("/generate");
                  }}
                >
                  See next week&apos;s updated plan →
                </Button>
                <Link href="/plan" className="w-full">
                  <Button variant="ghost" className="w-full">
                    Back to my plan
                  </Button>
                </Link>
              </div>
              <p className="mt-3 text-center font-mono text-xs text-text-muted">
                Next week&apos;s plan will incorporate what you actually bought.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {lightbox && previewUrl && (
        <button
          type="button"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightbox(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Receipt" className="max-h-full max-w-full object-contain" />
        </button>
      )}
    </main>
  );
}

function GradingSteps({ tick }: { tick: number }) {
  const steps = [
    { Icon: ScanText, text: "Reading your receipt..." },
    { Icon: Search, text: "Matching items to your NutriRx..." },
    { Icon: BarChart2, text: "Calculating your adherence score..." },
  ];
  return (
    <div className="mt-8 w-full max-w-sm space-y-3 text-left">
      {steps.map((s, i) => {
        const done = tick > i;
        const active = tick === i;
        return (
          <motion.div
            key={s.text}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.2 }}
            className={`flex items-center gap-3 font-mono text-sm ${done || active ? "text-text-primary" : "text-text-muted"}`}
          >
            {done ? <Check className="h-4 w-4 text-clinical-pediatric" /> : <s.Icon className="h-4 w-4 text-accent" />}
            <span className={done ? "text-text-muted" : ""}>{s.text}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
