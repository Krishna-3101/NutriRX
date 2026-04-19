"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface AdherencePoint {
  name: string;
  score: number | null;
}

export function AdherenceChart({ data }: { data: AdherencePoint[] }) {
  const chartData = data.map((d) => ({ name: d.name, score: d.score ?? 0 }));
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#1E1E35" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#8884A8", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#8884A8", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine y={80} stroke="#14B8A6" strokeDasharray="4 4" opacity={0.4} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#6C63FF"
            strokeWidth={2}
            dot={{ r: 4, fill: "#6C63FF", stroke: "#080810", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
          <Tooltip
            contentStyle={{
              background: "#151524",
              border: "1px solid #1E1E35",
              borderRadius: "8px",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "12px",
              color: "#F0EEF8",
            }}
            formatter={(value) => [`${Number(value ?? 0)}%`, "Adherence"]}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 font-mono text-xs text-text-muted">
        <span className="inline-block border-b border-dashed border-clinical-pediatric pb-0 text-clinical-pediatric">
          ───
        </span>{" "}
        80% target
      </p>
    </div>
  );
}

export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const bars = values.map((v) => Math.max(4, (v / max) * 28));
  return (
    <svg width={values.length * 8} height="32" className="mt-2">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 8}
          y={32 - h}
          width={5}
          height={h}
          rx={2}
          fill={color}
          opacity={i === bars.length - 1 ? 1 : 0.4}
        />
      ))}
    </svg>
  );
}
