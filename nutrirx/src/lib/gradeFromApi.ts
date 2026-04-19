import type { ReceiptGrade } from "@/lib/types";

function asNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

/** Normalize POST /api/grade-receipt `grade` payload (snake_case from LLM). */
export function receiptGradeFromApi(raw: Record<string, unknown>): ReceiptGrade {
  const swap = (raw.swap_suggestion ?? raw.swapSuggestion ?? {}) as Record<string, unknown>;
  const off = raw.off_rx_items ?? raw.offRxItems;
  const offList = Array.isArray(off) ? (off as string[]).map(String) : [];

  return {
    planId: String(raw.plan_id ?? raw.planId ?? ""),
    gradedAt: String(raw.graded_at ?? raw.gradedAt ?? new Date().toISOString()),
    adherenceScore: asNum(raw.adherence_score ?? raw.adherenceScore),
    rxItemsBought: asNum(raw.rx_items_bought ?? raw.rxItemsBought),
    rxItemsMissed: asNum(raw.rx_items_missed ?? raw.rxItemsMissed),
    offRxItems: offList,
    swapSuggestion: {
      bought: String(swap?.bought ?? ""),
      swapFor: String(swap?.swap_for ?? swap?.swapFor ?? ""),
      reason: String(swap?.reason ?? ""),
      sameStoreLikely:
        typeof swap?.same_store_likely === "boolean"
          ? swap.same_store_likely
          : typeof swap?.sameStoreLikely === "boolean"
            ? swap.sameStoreLikely
            : false,
    },
    weeklyPattern:
      raw.weekly_pattern != null
        ? String(raw.weekly_pattern)
        : raw.weeklyPattern != null
          ? String(raw.weeklyPattern)
          : undefined,
  };
}
