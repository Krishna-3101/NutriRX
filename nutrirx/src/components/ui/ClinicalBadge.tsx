import { CLINICAL_COLORS } from "@/lib/constants";
import type { ClinicalTarget } from "@/lib/types";

interface Props {
  target: ClinicalTarget;
  size?: "sm" | "md";
}

export function ClinicalBadge({ target, size = "md" }: Props) {
  const config = CLINICAL_COLORS[target];
  return (
    <span
      className={`badge-clinical border ${config.tailwind} ${
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : ""
      }`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{ backgroundColor: config.hex }}
      />
      {config.label}
    </span>
  );
}
