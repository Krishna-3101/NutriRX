const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function generatePlan(intake: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intake }),
    signal,
  });
}

export async function gradeReceipt(
  planId: string,
  imageBase64: string
): Promise<Response> {
  return fetch(`${BASE}/api/grade-receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId, imageBase64 }),
  });
}

export async function getWeekHistory(limit = 8): Promise<Response> {
  return fetch(`${BASE}/api/history?limit=${limit}`);
}
