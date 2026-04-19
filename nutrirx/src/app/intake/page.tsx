import { Suspense } from "react";
import { IntakeClient } from "./IntakeClient";

export default function IntakePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-6 py-10">
          <div className="mx-auto max-w-2xl animate-pulse rounded-xl border border-border bg-background-card p-8" />
        </main>
      }
    >
      <IntakeClient />
    </Suspense>
  );
}
