import { receiptGradeFromApi } from "@/lib/gradeFromApi";
import type { HistoryPlanListItem, ReceiptGrade, WeekTrendRow } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function generatePlan(intake: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intake }),
    signal,
  });
}

export async function gradeReceipt(planId: string, imageBase64: string): Promise<Response> {
  return fetch(`${BASE}/api/grade-receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId, image_base64: imageBase64 }),
  });
}

export async function gradeReceiptParsed(
  planId: string,
  imageBase64: string
): Promise<{ ok: true; gradeId: string; grade: ReceiptGrade } | { ok: false; status: number; message: string }> {
  const resp = await gradeReceipt(planId, imageBase64);
  if (!resp.ok) {
    let message = "Something went wrong grading your receipt. Please try again.";
    try {
      const err = (await resp.json()) as { detail?: string | unknown };
      if (typeof err.detail === "string") message = err.detail;
      else if (Array.isArray(err.detail)) message = String(err.detail[0]);
    } catch {
      /* ignore */
    }
    return { ok: false, status: resp.status, message };
  }
  const data = (await resp.json()) as { grade_id?: string; grade?: Record<string, unknown> };
  const gid = String(data.grade_id ?? "");
  const gradeRaw = data.grade;
  if (!gradeRaw || typeof gradeRaw !== "object") {
    return { ok: false, status: 500, message: "Invalid response from server." };
  }
  return { ok: true, gradeId: gid, grade: receiptGradeFromApi(gradeRaw) };
}

export async function getWeekHistory(limit = 8): Promise<Response> {
  return fetch(`${BASE}/api/history?limit=${limit}`);
}

export async function fetchHistoryPlans(limit = 8): Promise<HistoryPlanListItem[]> {
  const resp = await fetch(`${BASE}/api/history?limit=${limit}`);
  if (!resp.ok) return [];
  const data = (await resp.json()) as { plans?: unknown[] };
  const plans = Array.isArray(data.plans) ? data.plans : [];
  return plans.map((p) => {
    const row = p as Record<string, unknown>;
    const summary = (row.summary ?? {}) as Record<string, unknown>;
    return {
      id: String(row.id ?? ""),
      createdAt: String(row.created_at ?? row.createdAt ?? ""),
      adherenceScore:
        row.adherence_score != null
          ? Number(row.adherence_score)
          : row.adherenceScore != null
            ? Number(row.adherenceScore)
            : null,
      summary: {
        totalMeals: Number(summary.total_meals ?? summary.totalMeals ?? 0),
        estimatedCost:
          summary.estimated_cost != null
            ? Number(summary.estimated_cost)
            : summary.estimatedCost != null
              ? Number(summary.estimatedCost)
              : undefined,
        cuisines: summary.cuisines != null ? String(summary.cuisines) : undefined,
        householdSize:
          summary.household_size != null
            ? Number(summary.household_size)
            : summary.householdSize != null
              ? Number(summary.householdSize)
              : undefined,
      },
      intakeSnapshot: row.intake_snapshot as HistoryPlanListItem["intakeSnapshot"],
    };
  });
}

export async function fetchHistoryTrends(): Promise<WeekTrendRow[]> {
  const resp = await fetch(`${BASE}/api/history/trends?limit=12`);
  if (!resp.ok) return [];
  const data = (await resp.json()) as { weeks?: unknown[] };
  const weeks = Array.isArray(data.weeks) ? data.weeks : [];
  return weeks.map((w) => {
    const row = w as Record<string, unknown>;
    return {
      week: Number(row.week ?? 0),
      adherence: row.adherence != null ? Number(row.adherence) : null,
      glycemicLoad: row.glycemic_load != null ? Number(row.glycemic_load) : null,
      sodiumMg: row.sodium_mg != null ? Number(row.sodium_mg) : null,
      ironMg: row.iron_mg != null ? Number(row.iron_mg) : null,
      createdAt: String(row.created_at ?? row.createdAt ?? ""),
    };
  });
}

export async function fetchPlanPayload(planId: string): Promise<Record<string, unknown> | null> {
  const resp = await fetch(`${BASE}/api/plans/${encodeURIComponent(planId)}`);
  if (!resp.ok) return null;
  return (await resp.json()) as Record<string, unknown>;
}
