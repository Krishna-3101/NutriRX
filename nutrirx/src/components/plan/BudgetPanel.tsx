"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import type { IntakeForm, ShoppingCategory } from "@/lib/types";

const CAT_ORDER: ShoppingCategory["category"][] = [
  "produce",
  "protein",
  "grains",
  "dairy",
  "pantry",
  "frozen",
  "beverages",
];

function wicSavingsAndNames(categories: ShoppingCategory[]): { savings: number; names: string[] } {
  let savings = 0;
  const names: string[] = [];
  for (const c of categories) {
    for (const it of c.items) {
      if (it.isWicEligible) {
        savings += it.estimatedCostUSD ?? 0;
        names.push(it.name);
      }
    }
  }
  return { savings, names };
}

export interface BudgetPanelProps {
  snapBudget: number;
  totalEstimatedCost: number;
  shoppingList: ShoppingCategory[];
  intake: IntakeForm;
  onGradeReceipt?: () => void;
  showReceiptCta?: boolean;
  className?: string;
}

export function BudgetPanel({
  snapBudget,
  totalEstimatedCost,
  shoppingList,
  intake,
  onGradeReceipt,
  showReceiptCta = true,
  className = "",
}: BudgetPanelProps) {
  const budget = snapBudget > 0 ? snapBudget : intake.snapWeeklyBudget || 1;
  const ratio = Math.min(1.5, totalEstimatedCost / budget);
  const pct = Math.min(100, ratio * 100);

  const { savings: wicSavings, names: wicNames } = useMemo(
    () => wicSavingsAndNames(shoppingList),
    [shoppingList]
  );

  const subtotals = useMemo(() => {
    const map = new Map<ShoppingCategory["category"], number>();
    for (const c of shoppingList) {
      map.set(c.category, c.subtotal ?? 0);
    }
    return map;
  }, [shoppingList]);

  const snapAfterWic = Math.max(0, totalEstimatedCost - wicSavings);

  const barGradient =
    ratio < 0.8
      ? "from-teal-600 to-teal-500"
      : ratio <= 1
        ? "from-amber-600 to-amber-500"
        : "from-rose-600 to-rose-500";

  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 20 });
  const widthPct = useTransform(spring, (v) => `${v}%`);

  useEffect(() => {
    mv.set(0);
    const t = window.setTimeout(() => mv.set(pct), 80);
    return () => window.clearTimeout(t);
  }, [mv, pct]);

  return (
    <div className={`rounded-2xl border border-border bg-background-card p-6 shadow-card ${className}`}>
      <div className="font-display text-lg font-bold text-text-primary">SNAP Budget</div>

      <div className="relative mt-4">
        <div className="mb-1 flex justify-center">
          <span className="rounded-full border border-border bg-background-surface px-2 py-0.5 font-mono text-[11px] text-text-muted">
            {Math.round(ratio * 100)}% of budget
          </span>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-border">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${barGradient}`}
            style={{ width: widthPct }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-sm">
          <span className="text-text-primary">${totalEstimatedCost.toFixed(2)} estimated</span>
          <span className="text-text-muted">of ${budget.toFixed(0)} SNAP/week</span>
        </div>
      </div>

      {intake.wicEligible && wicNames.length > 0 && (
        <div className="mt-4 rounded-xl border border-clinical-pediatric/30 bg-clinical-pediatric/10 p-4">
          <div className="font-mono text-xs uppercase text-clinical-pediatric">WIC items in this plan</div>
          <p className="mt-2 text-sm text-text-secondary">
            {wicNames.length} item{wicNames.length === 1 ? "" : "s"} eligible for WIC vouchers
          </p>
          <p className="mt-1 font-mono text-[11px] text-text-muted">
            WIC items are free with your vouchers and are not counted toward your SNAP budget.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {wicNames.slice(0, 6).map((n) => (
              <span
                key={n}
                className="rounded-full border border-clinical-pediatric/30 bg-clinical-pediatric/15 px-2 py-0.5 font-mono text-[10px] text-clinical-pediatric"
              >
                {n}
              </span>
            ))}
            {wicNames.length > 6 && (
              <span className="font-mono text-[10px] text-text-muted">+ {wicNames.length - 6} more</span>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-1 font-mono text-sm">
        {CAT_ORDER.map((cat) => {
          const amt = subtotals.get(cat) ?? 0;
          if (amt <= 0 && !shoppingList.some((c) => c.category === cat && c.items.length)) return null;
          return (
            <div key={cat} className="flex justify-between capitalize text-text-secondary">
              <span>{cat}</span>
              <span className="text-text-primary">${amt.toFixed(2)}</span>
            </div>
          );
        })}
        <div className="border-t border-border pt-2" />
        <div className="flex justify-between font-bold text-text-primary">
          <span>Total</span>
          <span>${totalEstimatedCost.toFixed(2)}</span>
        </div>
        {intake.wicEligible && wicSavings > 0 && (
          <div className="flex justify-between text-clinical-pediatric">
            <span>WIC savings</span>
            <span>-${wicSavings.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-border pt-2" />
        <div className="flex justify-between font-semibold text-text-primary">
          <span>Your SNAP cost</span>
          <span>${snapAfterWic.toFixed(2)}</span>
        </div>
      </div>

      {showReceiptCta && (
        <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/10 p-5">
          <div className="font-display text-base font-semibold text-text-primary">Already shopped?</div>
          <p className="mt-1 text-sm text-text-secondary">
            Upload your grocery receipt and we&apos;ll grade how well you followed your Rx.
          </p>
          {onGradeReceipt ? (
            <Button type="button" variant="primary" className="mt-4 w-full" onClick={onGradeReceipt}>
              Grade my receipt →
            </Button>
          ) : (
            <Link href="/receipt" className="mt-4 block">
              <Button variant="primary" className="w-full">
                Grade my receipt →
              </Button>
            </Link>
          )}
          <p className="mt-2 text-center font-mono text-[11px] text-text-muted">
            Photo of your receipt · takes 30 seconds
          </p>
        </div>
      )}
    </div>
  );
}
