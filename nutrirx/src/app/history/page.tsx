"use client";

import { motion } from "framer-motion";
import {
  Award,
  Eye,
  Flame,
  Lock,
  RefreshCw,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdherenceChart, Sparkline } from "@/components/history/AdherenceChart";
import { Button } from "@/components/ui/Button";
import { useNutriRx } from "@/hooks/useNutriRx";
import { fetchHistoryPlans, fetchHistoryTrends, fetchPlanPayload } from "@/lib/api";
import { agentsToActivateFromHousehold, agentPillStyle } from "@/lib/intakeUtils";
import { weeklyPlanFromApiPlan } from "@/lib/planFromApi";
import type { AgentName, HistoryPlanListItem, IntakeForm, WeekTrendRow } from "@/lib/types";

const BADGE_BG = ["bg-accent", "bg-teal-500", "bg-rose-500", "bg-amber-500"];

function computeMilestones(plans: HistoryPlanListItem[]) {
  const adherences = plans.map((p) => p.adherenceScore).filter((x): x is number => x != null);
  return {
    firstRx: plans.length >= 1,
    consistent: plans.length >= 3,
    onTarget: adherences.some((s) => s >= 80),
    streak: plans.length >= 4,
    committed: plans.length >= 8,
  };
}

function trendDir(values: number[]): { arrow: string; pct: number } {
  if (values.length < 2) return { arrow: "→", pct: 0 };
  const a = values[values.length - 2]!;
  const b = values[values.length - 1]!;
  if (a === 0 && b === 0) return { arrow: "→", pct: 0 };
  const pct = a !== 0 ? Math.round(((b - a) / Math.max(a, 0.001)) * 100) : 0;
  if (b > a * 1.05) return { arrow: "↑", pct: Math.abs(pct) };
  if (b < a * 0.95) return { arrow: "↓", pct: Math.abs(pct) };
  return { arrow: "→", pct: 0 };
}

export default function HistoryPage() {
  const router = useRouter();
  const { setWeeklyPlan, setIntake } = useNutriRx();
  const [plans, setPlans] = useState<HistoryPlanListItem[]>([]);
  const [trends, setTrends] = useState<WeekTrendRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [p, t] = await Promise.all([
          fetchHistoryPlans(8),
          fetchHistoryTrends().catch(() => [] as WeekTrendRow[]),
        ]);
        if (!cancelled) {
          setPlans(p);
          setTrends(t);
        }
      } catch {
        /* keep partial UI */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const milestones = useMemo(() => computeMilestones(plans), [plans]);

  const latestIntake: IntakeForm | null = plans[0]?.intakeSnapshot ?? null;
  const agents = useMemo(
    () => (latestIntake?.household ? agentsToActivateFromHousehold(latestIntake.household) : []),
    [latestIntake]
  );

  const adherenceSeries = useMemo(() => {
    if (trends.length > 0) {
      return trends.map((t, i) => ({ name: `Wk ${i + 1}`, score: t.adherence }));
    }
    const chrono = [...plans].reverse();
    return chrono.map((p, i) => ({ name: `Wk ${i + 1}`, score: p.adherenceScore }));
  }, [trends, plans]);

  const latestScore = plans[0]?.adherenceScore;

  const heroDelta = useMemo(() => {
    const a = plans[0]?.adherenceScore;
    const b = plans[1]?.adherenceScore;
    if (a == null || b == null) return null;
    return Math.round(a - b);
  }, [plans]);

  const heroMessage = useMemo(() => {
    if (plans.length <= 1) return "First week complete!";
    if (heroDelta == null) return "Consistent effort. Keep going.";
    if (heroDelta >= 10) return "You're on a streak. Your plan is working.";
    if (heroDelta <= -10) return "A harder week. Your next plan adjusts.";
    return "Consistent effort. Keep going.";
  }, [heroDelta, plans.length]);

  const openPlan = useCallback(
    async (planId: string) => {
      const raw = await fetchPlanPayload(planId);
      if (!raw) return;
      const wp = weeklyPlanFromApiPlan(raw);
      setWeeklyPlan(wp);
      router.push("/plan");
    },
    [router, setWeeklyPlan]
  );

  const regen = useCallback(
    (intake: IntakeForm | undefined) => {
      if (!intake) return;
      setIntake(intake);
      router.push("/generate");
    },
    [router, setIntake]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background font-mono text-sm text-text-muted">
        Loading history…
      </main>
    );
  }

  if (plans.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="font-display text-2xl font-bold text-text-primary">No history yet.</h1>
        <p className="mt-2 text-text-secondary">Create your first NutriRx to see progress here.</p>
        <Link href="/intake" className="mt-8">
          <Button variant="primary">Create your NutriRx →</Button>
        </Link>
      </main>
    );
  }

  const showCharts = adherenceSeries.length > 0;

  return (
    <main className="min-h-screen bg-background pb-20 selection:bg-accent/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-background to-background opacity-60" />

      <div className="relative mx-auto max-w-3xl px-6 pt-4">
        <p className="font-mono text-xs text-text-muted">
          Plan → Shopping → Receipt → <span className="text-text-secondary">History</span>
        </p>

        <section className="mt-6 rounded-2xl border border-border bg-background-elevated p-8">
          <div className="font-mono text-xs uppercase tracking-widest text-text-muted">Your progress</div>
          <div className="mt-4 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              {latestScore != null ? (
                <div className="flex items-baseline gap-1">
                  <span
                    className={`font-display text-7xl font-bold ${
                      latestScore >= 80 ? "text-teal-400" : latestScore >= 60 ? "text-amber-400" : "text-rose-400"
                    }`}
                  >
                    {Math.round(latestScore)}
                  </span>
                  <span className="text-3xl text-text-muted">%</span>
                </div>
              ) : (
                <div className="font-display text-4xl font-bold text-text-muted">—</div>
              )}
              <p className="mt-1 font-mono text-sm text-text-muted">adherence this week</p>
            </div>
            <div className="max-w-xs text-right md:text-right">
              <p className="text-sm text-text-secondary">{heroMessage}</p>
              {plans.length > 1 && heroDelta != null ? (
                <span
                  className={`mt-3 inline-block rounded-full px-3 py-1 font-mono text-xs ${
                    heroDelta >= 10
                      ? "bg-teal-500/15 text-teal-400"
                      : heroDelta <= -10
                        ? "bg-rose-500/15 text-rose-400"
                        : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {heroDelta > 0 ? `+${heroDelta} pts` : heroDelta < 0 ? `−${Math.abs(heroDelta)} pts` : "→ stable"}
                </span>
              ) : (
                <span className="mt-3 inline-block font-mono text-sm text-accent">First week complete!</span>
              )}
            </div>
          </div>
        </section>

        {showCharts && (
          <section className="mt-10">
            <h2 className="font-display text-lg font-semibold text-text-primary">Adherence over time</h2>
            <div className="mt-4 rounded-xl border border-border bg-background-card p-4">
              <AdherenceChart data={adherenceSeries} />
            </div>
          </section>
        )}

        <ClinicalTrends agents={agents} trends={trends} hasSinglePlan={plans.length === 1} />

        <MilestoneRow milestones={milestones} />

        <section className="mt-12">
          <h2 className="font-display text-lg font-semibold text-text-primary">Your weekly plans</h2>
          <div className="mt-4 space-y-4">
            {plans.map((p, index) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07, duration: 0.4 }}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-background-card p-5 sm:flex-row sm:items-center"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold text-white ${
                    BADGE_BG[index % BADGE_BG.length]
                  }`}
                >
                  W{plans.length - index}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-display font-semibold text-text-primary">Week {plans.length - index}</span>
                    <span className="font-mono text-xs text-text-muted">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {p.summary.cuisines || "—"} · {p.summary.householdSize ?? "?"} members
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(p.intakeSnapshot?.household ? agentsToActivateFromHousehold(p.intakeSnapshot.household) : []).map(
                      (a) => {
                        const st = agentPillStyle(a);
                        return (
                          <span
                            key={a}
                            className="rounded-full border px-2 py-0.5 font-mono text-[9px]"
                            style={{
                              backgroundColor: st.backgroundColor,
                              color: st.color,
                              borderColor: st.borderColor,
                            }}
                          >
                            {a.replace("Agent", "")}
                          </span>
                        );
                      }
                    )}
                  </div>
                  {p.adherenceScore != null && (
                    <p className="mt-2 font-mono text-sm text-teal-400">Graded: {Math.round(p.adherenceScore)}%</p>
                  )}
                </div>
                <div className="flex gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => void openPlan(p.id)}
                    className="rounded-lg border border-border p-2 text-text-muted hover:border-accent/40 hover:text-accent"
                    aria-label="View plan"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => regen(p.intakeSnapshot)}
                    className="rounded-lg border border-border p-2 text-text-muted hover:border-accent/40 hover:text-accent"
                    aria-label="Regenerate"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-16 text-center">
          <h2 className="font-display text-xl font-semibold text-text-primary">Ready for a new week?</h2>
          <p className="mt-2 text-text-secondary">
            Generate a fresh plan — same household, adjusted for what you&apos;ve learned.
          </p>
          <Button
            variant="primary"
            className="mt-6"
            onClick={() => regen(plans[0]?.intakeSnapshot ?? latestIntake ?? undefined)}
          >
            Generate next week →
          </Button>
          <div className="mt-4">
            <Link href="/intake">
              <Button variant="ghost">Update my household info →</Button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function MilestoneRow({ milestones }: { milestones: ReturnType<typeof computeMilestones> }) {
  const items: { key: keyof typeof milestones; label: string; Icon: typeof Award }[] = [
    { key: "firstRx", label: "First Rx", Icon: Award },
    { key: "consistent", label: "Consistent", Icon: Zap },
    { key: "onTarget", label: "On target", Icon: Target },
    { key: "streak", label: "Streak", Icon: Flame },
    { key: "committed", label: "Committed", Icon: Trophy },
  ];
  return (
    <div className="mt-10 flex flex-wrap justify-center gap-2">
      {items.map(({ key, label, Icon }) => {
        const on = milestones[key];
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-mono text-[10px] ${
              on ? "text-text-primary opacity-100" : "text-text-muted opacity-30"
            }`}
          >
            {on ? <Icon className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {label}
          </span>
        );
      })}
    </div>
  );
}

function ClinicalTrends({
  agents,
  trends,
  hasSinglePlan,
}: {
  agents: AgentName[];
  trends: WeekTrendRow[];
  hasSinglePlan: boolean;
}) {
  const hasTrendData = trends.length >= 2;

  const wantGlycemic = agents.some((a) => a === "DiabetesAgent" || a === "PrediabetesAgent");
  const wantSodium = agents.includes("HypertensionAgent");
  const wantIron = agents.some((a) =>
    ["IronDeficiencyAgent", "PregnancyAgent", "PostpartumAgent"].includes(a)
  );
  const wantPediatric = agents.includes("PediatricAgent");

  const gly = trends.map((t) => t.glycemicLoad ?? 0);
  const na = trends.map((t) => t.sodiumMg ?? 0);
  const fe = trends.map((t) => t.ironMg ?? 0);

  const cards: { title: string; color: string; values: number[]; unit: string }[] = [];
  if (wantGlycemic) cards.push({ title: "Glycemic proxy", color: "#F59E0B", values: gly.length ? gly : [0], unit: "" });
  if (wantSodium) cards.push({ title: "Avg sodium", color: "#3B82F6", values: na.length ? na : [0], unit: "mg" });
  if (wantIron) cards.push({ title: "Avg iron", color: "#F43F5E", values: fe.length ? fe : [0], unit: "mg" });
  if (wantPediatric && cards.length < 3)
    cards.push({ title: "Calcium proxy", color: "#14B8A6", values: gly.length ? gly.map((v) => v * 50) : [0], unit: "" });
  while (cards.length < 3) {
    cards.push({
      title: cards.length === 0 ? "Fiber proxy" : cards.length === 1 ? "Protein proxy" : "Calories proxy",
      color: "#6C63FF",
      values: [0, 0, 0, 0, 1],
      unit: "",
    });
  }

  const three = cards.slice(0, 3);

  if (hasSinglePlan && !hasTrendData) {
    return (
      <section className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
        {three.map((c) => (
          <div key={c.title} className="rounded-xl border border-border bg-background-card p-4">
            <div className="font-mono text-[10px] uppercase" style={{ color: c.color }}>
              {c.title}
            </div>
            <p className="mt-3 font-mono text-xs text-text-muted">No trend yet — grade your first receipt.</p>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
      {three.map((c) => {
        const vals = c.values.length >= 2 ? c.values : [...c.values, ...c.values, ...c.values].slice(0, 5);
        const { arrow, pct } = trendDir(vals);
        return (
          <div key={c.title} className="rounded-xl border border-border bg-background-card p-4">
            <div className="font-mono text-[10px] uppercase" style={{ color: c.color }}>
              {c.title}
            </div>
            <div className="mt-2 font-display text-2xl" style={{ color: c.color }}>
              {arrow} {pct ? `${pct}%` : "—"}
            </div>
            <p className="font-mono text-xs text-text-muted">vs last week</p>
            <Sparkline values={vals.map((v) => v || 0.01)} color={c.color} />
          </div>
        );
      })}
    </section>
  );
}
