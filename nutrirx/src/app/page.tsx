"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { Button } from "@/components/ui/Button";
import { useNutriRx } from "@/hooks/useNutriRx";
import { DEMO_PERSONAS } from "@/lib/constants";
import type { ClinicalTarget } from "@/lib/types";

const ALL_TARGETS: ClinicalTarget[] = [
  "glycemic", "bp", "iron", "folate", "pediatric", "cholesterol", "general",
];

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "Build your household",
    desc: "Add each member's age, conditions, and optional lab values.",
  },
  {
    num: "02",
    title: "Set your budget",
    desc: "Tell us your SNAP balance, WIC status, and ZIP code.",
  },
  {
    num: "03",
    title: "Watch agents prescribe",
    desc: "Specialist AI agents negotiate your family's nutrient targets in real time.",
  },
  {
    num: "04",
    title: "Get your NutriRx",
    desc: "A 7-day plan: every meal tagged to the clinical marker it targets.",
  },
  {
    num: "05",
    title: "Close the loop",
    desc: "Upload your grocery receipt. Get graded. Next week's plan learns.",
  },
];

const STATS = [
  {
    stat: "1 in 3 SNAP adults has a diet-related chronic disease",
    source: "CDC",
  },
  {
    stat: "Less than 15% of patients follow dietary advice from their doctor",
    source: "JAMA",
  },
  {
    stat: "Food is Medicine is now a White House national priority",
    source: "WHC 2022",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { setIntake } = useNutriRx();

  function loadMariaDemo() {
    const persona = DEMO_PERSONAS.maria;
    setIntake({
      household: persona.household.map((m) => ({
        ...m,
        conditions: [...m.conditions],
        sex: m.sex,
      })),
      snapWeeklyBudget: persona.snapWeeklyBudget,
      wicEligible: persona.wicEligible,
      zipCode: persona.zipCode,
      cuisines: persona.cuisines,
    });
    router.push("/generate");
  }

  return (
    <main className="min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center bg-hero-glow bg-background overflow-hidden px-4">
        {/* subtle radial gradient layer */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(108,99,255,0.15), transparent)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center text-center max-w-3xl"
        >
          {/* Eyebrow badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-subtle px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-slow" />
            <span className="font-mono text-xs text-accent tracking-widest uppercase">
              FAO × UN Hackathon 2026
            </span>
          </div>

          {/* H1 */}
          <h1 className="font-display leading-none mb-6">
            <span className="block text-4xl md:text-6xl font-normal text-text-secondary">
              Food is
            </span>
            <span className="block text-6xl md:text-8xl font-bold text-text-primary">
              Medicine.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-text-secondary font-body text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
            Personalized weekly meal plans for SNAP families — prescribed by AI
            for your exact conditions and culture.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <Link href="/intake">
              <Button size="lg">Create my NutriRx →</Button>
            </Link>
            <Button variant="ghost" size="lg" onClick={loadMariaDemo}>
              See a live demo
            </Button>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {["10 specialist agents", "Live USDA nutrition data", "Any cuisine, any culture"].map(
              (pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-border bg-background-surface px-4 py-1.5 font-mono text-xs text-text-muted"
                >
                  {pill}
                </span>
              )
            )}
          </div>
        </motion.div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="bg-background-surface border-t border-border py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-xs uppercase tracking-widest text-text-muted mb-12 text-center">
            The Prescription Loop
          </p>

          <div className="relative flex flex-col md:flex-row gap-0 md:gap-0">
            {/* dashed connecting line (desktop) */}
            <div className="hidden md:block absolute top-5 left-[10%] right-[10%] border-t border-dashed border-border" />

            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative flex-1 flex flex-col items-center text-center px-4 py-6 md:py-0"
              >
                <div className="relative z-10 w-10 h-10 rounded-full bg-background-card border border-border flex items-center justify-center mb-4">
                  <span className="font-mono text-sm text-accent">{step.num}</span>
                </div>
                <h3 className="font-body font-semibold text-text-primary text-sm mb-2">
                  {step.title}
                </h3>
                <p className="font-body text-xs text-text-muted leading-relaxed max-w-[140px]">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why it matters ────────────────────────────────────────────── */}
      <section className="bg-background py-24 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          {/* Pull quote */}
          <motion.blockquote
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="font-display text-3xl md:text-5xl font-bold text-text-primary text-center leading-tight mb-16 max-w-3xl"
          >
            &ldquo;Between{" "}
            <span className="text-accent">&lsquo;eat better&rsquo;</span>
            {" "}and Tuesday&rsquo;s dinner — nothing exists.&rdquo;
          </motion.blockquote>

          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-16">
            {STATS.map((s, i) => (
              <motion.div
                key={s.source}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-xl border border-border bg-background-card p-6 shadow-card flex flex-col gap-3"
              >
                <p className="font-body text-text-primary text-sm leading-relaxed">
                  {s.stat}
                </p>
                <span className="font-mono text-xs text-text-muted">
                  — {s.source}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Clinical badges showcase */}
          <div className="flex flex-wrap justify-center gap-2 mb-16">
            {ALL_TARGETS.map((t) => (
              <ClinicalBadge key={t} target={t} />
            ))}
          </div>

          {/* Final CTA */}
          <Link href="/intake">
            <Button size="lg">Create your NutriRx — it&apos;s free.</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
