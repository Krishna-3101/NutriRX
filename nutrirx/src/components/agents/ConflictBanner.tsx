"use client";

import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface ConflictBannerProps {
  message: string;
}

export function ConflictBanner({ message }: ConflictBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mx-6 mb-4 flex items-start gap-3 rounded-xl border border-amber-800/40 bg-amber-950/30 px-5 py-3"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-clinical-glycemic" />
      <div>
        <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-clinical-glycemic">
          Conflict detected
        </div>
        <div className="text-sm text-text-secondary">{message}</div>
      </div>
    </motion.div>
  );
}
