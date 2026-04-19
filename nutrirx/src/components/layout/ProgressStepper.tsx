"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

const STEPS = [
  { label: "Household",        routes: ["/intake"] },
  { label: "Budget & culture", routes: ["/intake"] },
  { label: "Generating",       routes: ["/generate"] },
  { label: "Your NutriRx",     routes: ["/plan", "/plan/shopping"] },
  { label: "Receipt & history", routes: ["/receipt", "/history"] },
];

function getStepIndex(pathname: string, intakeSubStep: number): number {
  if (pathname.startsWith("/intake")) return intakeSubStep === 2 ? 2 : 1;
  if (pathname.startsWith("/generate")) return 3;
  if (pathname.startsWith("/plan")) return 4;
  if (pathname.startsWith("/receipt")) return 5;
  if (pathname.startsWith("/history")) return 5;
  return 0;
}

export function ProgressStepper() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const intakeSubStep =
    pathname.startsWith("/intake") && searchParams.get("step") === "2" ? 2 : 1;
  const currentStep = getStepIndex(pathname, intakeSubStep);

  if (currentStep === 0) return null;

  const progressPct = Math.max(0, ((currentStep - 1) / (STEPS.length - 1)) * 100);

  return (
    <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="relative flex items-center justify-between">
          {/* connecting track */}
          <div className="absolute left-4 right-4 top-4 h-px bg-border z-0">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {STEPS.map((step, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent   = stepNum === currentStep;

            return (
              <div key={step.label} className="relative z-10 flex flex-col items-center gap-1.5">
                {/* dot */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border transition-all duration-300 ${
                    isCompleted
                      ? "bg-accent border-accent text-white"
                      : isCurrent
                      ? "bg-accent border-accent text-white shadow-glow-sm"
                      : "bg-background-surface border-border text-text-muted"
                  }`}
                >
                  {isCompleted ? <Check size={14} strokeWidth={2.5} /> : stepNum}
                </div>

                {/* label */}
                <span
                  className={`text-xs font-mono whitespace-nowrap hidden sm:block ${
                    isCurrent ? "text-text-secondary" : "text-text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
