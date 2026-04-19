"use client";

import { AnimatePresence, motion } from "framer-motion";

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-border bg-background-elevated px-5 py-2.5 shadow-card"
        >
          <span className="font-mono text-sm text-text-primary">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
