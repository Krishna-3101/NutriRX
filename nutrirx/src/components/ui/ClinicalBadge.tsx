import { CLINICAL_COLORS } from "@/lib/constants";
import type { ClinicalTarget } from "@/lib/types";

interface Props {
  target: ClinicalTarget;
  size?: "sm" | "md";
}

export function ClinicalBadge({ target, size = "md" }: Props) {
  const isRecognized = !!CLINICAL_COLORS[target];
  const config = CLINICAL_COLORS[target] || CLINICAL_COLORS.general;
  const labelText = isRecognized ? config.label : String(target).charAt(0).toUpperCase() + String(target).slice(1);

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
      {labelText}
    </span>
  );
}
