"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { NutrientTargets } from "@/lib/types";

interface NutritionRadarProps {
  coverage: Record<keyof NutrientTargets, number>;
}

export function NutritionRadar({ coverage }: NutritionRadarProps) {
  const data = [
    { nutrient: "Fiber", value: Math.round((coverage.fiber_g ?? 0) * 100) },
    { nutrient: "Iron", value: Math.round((coverage.iron_mg ?? 0) * 100) },
    { nutrient: "Folate", value: Math.round((coverage.folate_mcg ?? 0) * 100) },
    { nutrient: "Calcium", value: Math.round((coverage.calcium_mg ?? 0) * 100) },
    { nutrient: "Protein", value: Math.round((coverage.protein_g ?? 0) * 100) },
    { nutrient: "Potassium", value: Math.round((coverage.potassium_mg ?? 0) * 100) },
    { nutrient: "Omega-3", value: Math.round((coverage.omega3_g ?? 0) * 100) },
    { nutrient: "Vit D", value: Math.round((coverage.vitamin_d_iu ?? 0) * 100) },
  ];

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#1E1E35" />
          <PolarAngleAxis
            dataKey="nutrient"
            tick={{ fill: "#8884A8", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
          />
          <Radar
            dataKey="value"
            stroke="#6C63FF"
            fill="#6C63FF"
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
        </RadarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center font-mono text-xs text-text-muted">% of weekly targets met</p>
    </div>
  );
}
