"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { IntakeForm, WeeklyPlan, ReceiptGrade, AgentUpdate } from "@/lib/types";

interface NutriRxState {
  intake: IntakeForm | null;
  setIntake: (f: IntakeForm) => void;
  agentUpdates: AgentUpdate[];
  pushAgentUpdate: (u: AgentUpdate) => void;
  clearAgentUpdates: () => void;
  weeklyPlan: WeeklyPlan | null;
  setWeeklyPlan: (p: WeeklyPlan) => void;
  receiptGrade: ReceiptGrade | null;
  setReceiptGrade: (g: ReceiptGrade) => void;
}

const NutriRxContext = createContext<NutriRxState | null>(null);

export function NutriRxProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [intake, setIntakeState] = useState<IntakeForm | null>(null);
  const [agentUpdates, setAgentUpdates] = useState<AgentUpdate[]>([]);
  const [weeklyPlan, setWeeklyPlanState] = useState<WeeklyPlan | null>(null);
  const [receiptGrade, setReceiptGradeState] = useState<ReceiptGrade | null>(null);

  const setIntake = useCallback((f: IntakeForm) => {
    setIntakeState(f);
  }, []);

  const pushAgentUpdate = useCallback((u: AgentUpdate) => {
    setAgentUpdates((prev) => [...prev, u]);
  }, []);

  const clearAgentUpdates = useCallback(() => {
    setAgentUpdates([]);
  }, []);

  const setWeeklyPlan = useCallback((p: WeeklyPlan) => {
    setWeeklyPlanState(p);
  }, []);

  const setReceiptGrade = useCallback((g: ReceiptGrade) => {
    setReceiptGradeState(g);
  }, []);

  const value = useMemo(
    () => ({
      intake,
      setIntake,
      agentUpdates,
      pushAgentUpdate,
      clearAgentUpdates,
      weeklyPlan,
      setWeeklyPlan,
      receiptGrade,
      setReceiptGrade,
    }),
    [
      intake,
      setIntake,
      agentUpdates,
      pushAgentUpdate,
      clearAgentUpdates,
      weeklyPlan,
      setWeeklyPlan,
      receiptGrade,
      setReceiptGrade,
    ]
  );

  return <NutriRxContext.Provider value={value}>{children}</NutriRxContext.Provider>;
}

export function useNutriRx() {
  const ctx = useContext(NutriRxContext);
  if (!ctx) throw new Error("useNutriRx must be used inside NutriRxProvider");
  return ctx;
}
