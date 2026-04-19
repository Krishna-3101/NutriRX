import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import "./globals.css";
import { NutriRxProvider } from "@/hooks/useNutriRx";
import { ProgressStepper } from "@/components/layout/ProgressStepper";

export const metadata: Metadata = {
  title: "NutriRx — Food as Medicine",
  description:
    "Personalized weekly meal plans for SNAP families, prescribed by AI for your exact medical conditions and culture.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="noise-overlay bg-background font-body text-text-primary antialiased">
        <NutriRxProvider>
          <Suspense fallback={null}>
            <ProgressStepper />
          </Suspense>
          {children}
        </NutriRxProvider>
      </body>
    </html>
  );
}
