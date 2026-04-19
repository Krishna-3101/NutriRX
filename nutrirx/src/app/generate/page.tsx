"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AgentCard, type AgentCardState } from "@/components/agents/AgentCard";
import { ConflictBanner } from "@/components/agents/ConflictBanner";
import { Button } from "@/components/ui/Button";
import { generatePlan } from "@/lib/api";
import { weeklyPlanFromApiPlan } from "@/lib/planFromApi";
import type { AgentName, AgentUpdate, IntakeForm } from "@/lib/types";
import { useNutriRx } from "@/hooks/useNutriRx";

const AGENT_ORDER: AgentName[] = [
  "Orchestrator",
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

function sortAgentStates(map: Map<string, AgentCardState>): AgentCardState[] {
  return Array.from(map.values()).sort((a, b) => {
    const ia = AGENT_ORDER.indexOf(a.agent);
    const ib = AGENT_ORDER.indexOf(b.agent);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

async function readSSE(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (eventName: string, data: string) => void,
  signal: AbortSignal
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    if (signal.aborted) return;
    const { done, value } = await reader.read();
    if (done) break;
    // sse-starlette 2.x sends \r\n line endings — normalise so the parser
    // always sees \n separators regardless of server implementation.
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      const data = dataLines.join("\n");
      if (data) onEvent(eventName, data);
    }
  }
}

export default function GeneratePage() {
  const { intake, pushAgentUpdate, clearAgentUpdates, setWeeklyPlan } = useNutriRx();
  const router = useRouter();
  const [agents, setAgents] = useState<Map<string, AgentCardState>>(new Map());
  const [logs, setLogs] = useState<string[]>([]);
  const [headerText, setHeaderText] = useState("Assembling your care team...");
  const [progress, setProgress] = useState(2);
  const [isComplete, setIsComplete] = useState(false);
  const [firstEventReceived, setFirstEventReceived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictBanner, setConflictBanner] = useState<string | null>(null);
  const conflictTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref to the latest intake so we can read it inside a stable effect
  const intakeRef = useRef<IntakeForm | null>(null);
  useEffect(() => {
    intakeRef.current = intake;
  }, [intake]);

  // Keep a ref to the latest router so we don't put it in effect deps
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const dismissConflictSoon = useCallback(() => {
    if (conflictTimer.current) clearTimeout(conflictTimer.current);
    conflictTimer.current = setTimeout(() => setConflictBanner(null), 4000);
  }, []);

  const handleAgentUpdate = useCallback(
    (update: AgentUpdate) => {
      pushAgentUpdate(update);

      setAgents((prev) => {
        const next = new Map(prev);
        next.set(update.agent, {
          agent: update.agent,
          status: update.status,
          message: update.message,
          nutrients: update.nutrients,
          arrivedAt: Date.now(),
        });
        return next;
      });

      setLogs((prev) => [`[${update.agent}] ${update.message}`, ...prev.slice(0, 7)]);

      if (update.status === "conflict") {
        setConflictBanner(update.message);
        dismissConflictSoon();
        setAgents((prev) => {
          const next = new Map(prev);
          const o = next.get("Orchestrator");
          if (o) next.set("Orchestrator", { ...o, status: "conflict" });
          return next;
        });
        setHeaderText("Resolving conflicts between recommendations...");
      } else {
        if (update.agent !== "Orchestrator") {
          setHeaderText("Your specialists are reviewing your household.");
        }
        if (update.agent === "CulturalAgent" && update.status === "thinking") {
          setHeaderText("Building your culturally-authentic meals...");
        }
        if (update.agent === "BudgetAgent" && update.status === "thinking") {
          setHeaderText("Sizing your plan to your SNAP budget...");
        }
      }

      setProgress((p) => Math.min(p + 100 / 16, 95));
    },
    [dismissConflictSoon, pushAgentUpdate]
  );

  // Keep latest handleAgentUpdate / setWeeklyPlan accessible inside stable refs
  const handleAgentUpdateRef = useRef(handleAgentUpdate);
  useEffect(() => { handleAgentUpdateRef.current = handleAgentUpdate; }, [handleAgentUpdate]);
  const setWeeklyPlanRef = useRef(setWeeklyPlan);
  useEffect(() => { setWeeklyPlanRef.current = setWeeklyPlan; }, [setWeeklyPlan]);

  const runGeneration = useCallback(async (signal: AbortSignal) => {
    const current = intakeRef.current;
    if (!current || signal.aborted) return;

    setError(null);
    setFirstEventReceived(false);
    setProgress(2);
    setHeaderText("Assembling your care team...");
    setIsComplete(false);
    setAgents(new Map());
    setLogs([]);

    let receivedComplete = false;
    try {
      const resp = await generatePlan(current, signal);
      if (signal.aborted) return;

      if (!resp.ok || !resp.body) {
        setError("Something went wrong generating your plan. Please try again.");
        return;
      }

      const reader = resp.body.getReader();
      await readSSE(
        reader,
        (eventName, data) => {
          if (signal.aborted) return;
          setFirstEventReceived(true);

          if (eventName === "complete") {
            receivedComplete = true;
            const payload = JSON.parse(data) as {
              plan_id?: string;
              plan?: Record<string, unknown>;
              error?: string;
            };
            if (payload.error || !payload.plan) {
              setError(payload.error ?? "Plan generation was interrupted. Please try again.");
              return;
            }
            const plan = weeklyPlanFromApiPlan(payload.plan);
            setWeeklyPlanRef.current(plan);
            setProgress(100);
            setHeaderText("Your NutriRx is ready.");
            setIsComplete(true);
            setAgents((prev) => {
              const next = new Map(prev);
              for (const [k, v] of next) next.set(k, { ...v, status: "done" });
              return next;
            });
            window.setTimeout(() => routerRef.current.push("/plan"), 1800);
            return;
          }

          if (eventName === "agent_update") {
            const update = JSON.parse(data) as AgentUpdate;
            handleAgentUpdateRef.current(update);
          }
        },
        signal
      );

      if (!receivedComplete && !signal.aborted) {
        setError("Plan generation was interrupted. Please try again.");
      }
    } catch (e) {
      if (signal.aborted) return; // StrictMode cleanup — ignore silently
      if (e instanceof TypeError && e.message.toLowerCase().includes("fetch")) {
        setError("Cannot reach the backend server. Make sure the API is running on port 8000.");
      } else {
        setError("Something went wrong generating your plan. Please try again.");
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally stable; reads via refs

  // Trigger generation exactly once on mount. The AbortController cleanup prevents
  // React 19 StrictMode's double-invoke from firing two simultaneous requests.
  useEffect(() => {
    const controller = new AbortController();

    // Give intakeRef one tick to settle (covers the setIntake → navigate race)
    const tid = setTimeout(() => {
      if (!intakeRef.current) {
        routerRef.current.replace("/intake");
        return;
      }
      clearAgentUpdates();
      void runGeneration(controller.signal);
    }, 0);

    return () => {
      clearTimeout(tid);
      controller.abort();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally run once

  const sorted = sortAgentStates(agents);

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 nutrirx-generate-ambient" aria-hidden />

      <motion.div
        className="relative z-10 flex h-full flex-col"
        animate={{ opacity: isComplete ? 0 : 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
            <div className="max-w-md rounded-2xl border border-border bg-background-card p-8 text-center shadow-card">
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-text-muted">
                Generation failed
              </p>
              <p className="mt-3 font-body text-base leading-relaxed text-text-secondary">
                {error}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    const controller = new AbortController();
                    clearAgentUpdates();
                    void runGeneration(controller.signal);
                  }}
                >
                  Try again
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/intake")}
                >
                  Go back and adjust
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <header className="flex h-[20vh] min-h-[140px] flex-col justify-center px-6 pt-4">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={headerText}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35 }}
                  className="font-display text-2xl font-bold text-text-primary md:text-4xl"
                >
                  {headerText}
                </motion.h1>
              </AnimatePresence>
              <div className="mx-auto mt-4 h-1 w-full max-w-3xl overflow-hidden rounded-full bg-border">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </header>

            <section
              className="relative flex min-h-0 flex-1 flex-col px-0 pb-4"
              style={{ maxHeight: "60vh" }}
            >
              <AnimatePresence mode="wait">
                {conflictBanner ? (
                  <ConflictBanner key="conflict" message={conflictBanner} />
                ) : null}
              </AnimatePresence>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence>
                  {!firstEventReceived &&
                    [0, 1, 2].map((i) => (
                      <motion.div
                        key={`ph-${i}`}
                        initial={{ opacity: 0.6 }}
                        animate={{ opacity: 1 }}
                        className="h-36 rounded-2xl border border-border bg-gradient-to-r from-background-card via-background-elevated to-background-card bg-[length:200%_100%] animate-shimmer"
                      />
                    ))}
                  {sorted.map((agent) => (
                    <motion.div
                      key={agent.agent}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <AgentCard state={agent} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {isComplete && (
                <motion.div
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent bg-background-card shadow-glow-accent">
                    <Check className="h-10 w-10 text-accent" strokeWidth={2.5} />
                  </div>
                </motion.div>
              )}
            </section>

            <footer className="h-[20vh] max-h-[200px] min-h-[120px] shrink-0 px-6 pb-6">
              <div
                className="mx-auto overflow-hidden rounded-xl border border-border bg-background-surface p-4"
                style={{ height: "140px" }}
              >
                <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  Live agent feed
                </div>
                <AnimatePresence initial={false}>
                  {logs.map((log, i) => (
                    <motion.div
                      key={`${log}-${i}`}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: i === 0 ? 1 : Math.max(0.35, 0.55 - i * 0.06) }}
                      className="mb-1 truncate font-mono text-[11px] text-text-secondary"
                    >
                      <span className="mr-2 text-accent">›</span>
                      {log}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </footer>
          </>
        )}
      </motion.div>
    </main>
  );
}
