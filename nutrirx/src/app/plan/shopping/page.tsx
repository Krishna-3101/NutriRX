"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Copy,
  CupSoda,
  Drumstick,
  Info,
  Leaf,
  Milk,
  Package,
  Printer,
  Snowflake,
  Wheat,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BudgetPanel } from "@/components/plan/BudgetPanel";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useNutriRx } from "@/hooks/useNutriRx";
import type { ShoppingCategory, ShoppingItem } from "@/lib/types";

const ICONS: Record<ShoppingCategory["category"], typeof Leaf> = {
  produce: Leaf,
  protein: Drumstick,
  grains: Wheat,
  dairy: Milk,
  pantry: Package,
  frozen: Snowflake,
  beverages: CupSoda,
};

function rowKey(cat: string, i: number, name: string): string {
  return `${cat}:${i}:${name}`;
}

function buildCopyText(
  generatedAt: string,
  snap: number,
  total: number,
  categories: ShoppingCategory[]
): string {
  const date = generatedAt ? new Date(generatedAt).toLocaleDateString() : "this week";
  const lines = [`NutriRx Shopping List — Week of ${date}`, `SNAP Budget: $${snap} | Estimated: $${total.toFixed(2)}`, ""];
  for (const c of categories) {
    if (!c.items.length) continue;
    lines.push(`${c.category.toUpperCase()} ($${(c.subtotal ?? 0).toFixed(2)})`);
    for (const it of c.items) {
      lines.push(`- ${it.name} — ${it.quantity} — $${(it.estimatedCostUSD ?? 0).toFixed(2)}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

export default function PlanShoppingPage() {
  const router = useRouter();
  const { weeklyPlan } = useNutriRx();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [popoverKey, setPopoverKey] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const popoverContainerRef = useRef<HTMLDivElement>(null);

  useClickOutside(popoverContainerRef, () => setPopoverKey(null), !!popoverKey);

  useEffect(() => {
    if (!weeklyPlan) router.replace("/intake");
  }, [weeklyPlan, router]);

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
    window.setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2000);
  }, []);

  const copyList = useCallback(() => {
    if (!weeklyPlan) return;
    const text = buildCopyText(
      weeklyPlan.generatedAt,
      weeklyPlan.snapBudget || weeklyPlan.intakeSnapshot.snapWeeklyBudget,
      weeklyPlan.totalEstimatedCost,
      weeklyPlan.shoppingList
    );
    void navigator.clipboard.writeText(text).then(() => showToast("Copied!"));
  }, [weeklyPlan, showToast]);

  const toggle = useCallback((key: string) => {
    setChecked((m) => ({ ...m, [key]: !m[key] }));
  }, []);

  const categories = weeklyPlan?.shoppingList ?? [];

  const sortedCats = useMemo(() => {
    const order: ShoppingCategory["category"][] = [
      "produce",
      "protein",
      "grains",
      "dairy",
      "pantry",
      "frozen",
      "beverages",
    ];
    return [...categories]
      .filter((c) => c.items.length > 0)
      .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
  }, [categories]);

  if (!weeklyPlan) return null;

  const { intakeSnapshot, totalEstimatedCost, snapBudget, generatedAt } = weeklyPlan;
  const budget = snapBudget || intakeSnapshot.snapWeeklyBudget || 1;

  return (
    <main className="min-h-screen bg-background pb-32 selection:bg-accent/20 lg:pb-24 print:bg-white print:text-black">
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-background to-background opacity-60 print:hidden" />

      <div className="relative mx-auto max-w-6xl px-4 pt-6 md:px-6 md:pt-10">
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/plan"
            className="font-mono text-sm text-text-secondary transition-colors hover:text-accent"
          >
            ← Back to plan
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-border p-2 text-text-muted transition-colors hover:border-accent/40 hover:text-accent"
              aria-label="Print list"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={copyList}
              className="rounded-lg border border-border p-2 text-text-muted transition-colors hover:border-accent/40 hover:text-accent"
              aria-label="Copy list"
            >
              <Copy className="h-5 w-5" />
            </button>
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold text-text-primary print:text-2xl">Shopping list</h1>
        <p className="mt-1 font-mono text-xs text-text-muted print:text-black">
          {new Date(generatedAt).toLocaleDateString()} · Est. ${totalEstimatedCost.toFixed(2)}
        </p>

        <div className="mt-8 lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-10">
          <div className="order-2 lg:order-1">
            <div className="no-print mb-6 lg:hidden">
              <BudgetPanel
                snapBudget={budget}
                totalEstimatedCost={totalEstimatedCost}
                shoppingList={weeklyPlan.shoppingList}
                intake={intakeSnapshot}
                showReceiptCta={false}
              />
            </div>

            {sortedCats.map((cat) => (
              <ShoppingCategorySection
                key={cat.category}
                category={cat}
                checked={checked}
                onToggle={toggle}
                popoverKey={popoverKey}
                setPopoverKey={setPopoverKey}
                popoverContainerRef={popoverContainerRef}
              />
            ))}
          </div>

          <aside className="no-print order-1 mb-8 lg:sticky lg:top-20 lg:order-2 lg:mb-0">
            <div className="hidden lg:block">
              <BudgetPanel
                snapBudget={budget}
                totalEstimatedCost={totalEstimatedCost}
                shoppingList={weeklyPlan.shoppingList}
                intake={intakeSnapshot}
              />
            </div>
          </aside>
        </div>
      </div>

      <div className="no-print fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="font-mono text-xs text-text-muted">
            <span className="text-text-primary">${totalEstimatedCost.toFixed(2)}</span>
            <span> / ${budget.toFixed(0)} SNAP</span>
          </div>
          <Link href="/receipt">
            <Button variant="primary" size="sm" className="whitespace-nowrap">
              Grade receipt →
            </Button>
          </Link>
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </main>
  );
}

function ShoppingCategorySection({
  category,
  checked,
  onToggle,
  popoverKey,
  setPopoverKey,
  popoverContainerRef,
}: {
  category: ShoppingCategory;
  checked: Record<string, boolean>;
  onToggle: (key: string) => void;
  popoverKey: string | null;
  setPopoverKey: (k: string | null) => void;
  popoverContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const Icon = ICONS[category.category] ?? Package;
  const nChecked = category.items.filter((it, i) => checked[rowKey(category.category, i, it.name)]).length;

  return (
    <section className="mb-10">
      <div className="sticky top-[52px] z-10 border-b border-border bg-background/90 py-3 backdrop-blur-sm md:top-16 print:static print:bg-white">
        <div className="flex items-center gap-2">
          <Icon className="h-[18px] w-[18px] text-accent" />
          <div>
            <h2 className="font-display text-base font-semibold capitalize text-text-primary">
              {category.category}
            </h2>
            <p className="font-mono text-xs text-text-muted">
              {category.items.length} item{category.items.length === 1 ? "" : "s"} · $
              {(category.subtotal ?? 0).toFixed(2)}
              {nChecked > 0 ? ` · ${nChecked} checked` : ""}
            </p>
          </div>
        </div>
      </div>

      <ul className="mt-2 divide-y divide-border print:divide-gray-300">
        {category.items.map((item, i) => (
          <ShoppingRow
            key={rowKey(category.category, i, item.name)}
            item={item}
            checked={!!checked[rowKey(category.category, i, item.name)]}
            onToggle={() => onToggle(rowKey(category.category, i, item.name))}
            popoverOpen={popoverKey === rowKey(category.category, i, item.name)}
            onPopoverToggle={() =>
              setPopoverKey(
                popoverKey === rowKey(category.category, i, item.name)
                  ? null
                  : rowKey(category.category, i, item.name)
              )
            }
            popoverContainerRef={popoverContainerRef}
          />
        ))}
      </ul>
    </section>
  );
}

function ShoppingRow({
  item,
  checked,
  onToggle,
  popoverOpen,
  onPopoverToggle,
  popoverContainerRef,
}: {
  item: ShoppingItem;
  checked: boolean;
  onToggle: () => void;
  popoverOpen: boolean;
  onPopoverToggle: () => void;
  popoverContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <li
      className={`group relative py-3 transition-opacity duration-200 hover:bg-background-elevated print:hover:bg-transparent ${
        checked ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-pressed={checked}
          onClick={onToggle}
          className={`no-print mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
            checked ? "border-accent bg-accent text-white" : "border-border bg-background-surface"
          }`}
        >
          {checked ? "✓" : ""}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              className={`text-sm text-text-primary print:text-black ${
                checked ? "font-body line-through text-text-muted" : "font-body"
              }`}
            >
              {item.name}
            </span>
            <span className="font-mono text-sm text-text-muted">· {item.quantity}</span>
            <span className="ml-auto font-mono text-sm font-medium text-text-primary print:text-black">
              ${(item.estimatedCostUSD ?? 0).toFixed(2)}
            </span>
            {item.isWicEligible && (
              <span className="rounded border border-clinical-pediatric/30 bg-clinical-pediatric/10 px-1.5 py-0.5 font-mono text-[10px] text-clinical-pediatric">
                WIC
              </span>
            )}
            <button
              ref={btnRef}
              type="button"
              aria-label="Why this item"
              onClick={onPopoverToggle}
              className="no-print text-text-muted transition-colors hover:text-accent"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {(item.clinicalTargets ?? []).map((t) => (
              <ClinicalBadge key={t} target={t} size="sm" />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {popoverOpen && (
          <motion.div
            ref={popoverOpen ? popoverContainerRef : undefined}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="no-print absolute left-8 top-full z-50 mt-2 max-w-xs rounded-xl border border-border bg-background-elevated p-4 shadow-card"
          >
            <p className="text-sm text-text-secondary">{item.whyInRx}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(item.clinicalTargets ?? []).map((t) => (
                <ClinicalBadge key={t} target={t} size="sm" />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
