// C:\Users\Melody\Documents\Spotter\frontend\src\components\admin\WeeklyGrowthChart.tsx

"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface WeeklyPoint {
  week:          string;
  seekers:       number;
  organizations: number;
  agents:        number;
  matches:       number;
}

interface Props {
  data: WeeklyPoint[];
}

type Series = "seekers" | "organizations" | "agents" | "matches";

const SERIES_CONFIG: Record<Series, { label: string; color: string; activeColor: string }> = {
  seekers:       { label: "Job Seekers",    color: "#ef4444", activeColor: "#CC0000" },
  organizations: { label: "Organisations",  color: "#3b82f6", activeColor: "#1d4ed8" },
  agents:        { label: "Agents",         color: "#22c55e", activeColor: "#15803d" },
  matches:       { label: "Matches",        color: "#f59e0b", activeColor: "#b45309" },
};

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-500 capitalize">{entry.name}:</span>
          <span className="font-bold text-gray-900">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function WeeklyGrowthChart({ data }: Props) {
  const [active, setActive] = useState<Record<Series, boolean>>({
    seekers:       true,
    organizations: true,
    agents:        true,
    matches:       true,
  });

  function toggle(key: Series) {
    setActive((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Check if all data is zero (new platform)
  const hasData = data.some((w) =>
    w.seekers > 0 || w.organizations > 0 || w.agents > 0 || w.matches > 0
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Weekly Growth</h3>
          <p className="text-xs text-gray-400 mt-0.5">New registrations and matches per week (last 8 weeks)</p>
        </div>

        {/* Toggle buttons */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SERIES_CONFIG) as Series[]).map((key) => {
            const cfg = SERIES_CONFIG[key];
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
                  active[key]
                    ? "text-white border-transparent"
                    : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                )}
                style={active[key] ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: active[key] ? "white" : cfg.color }}
                />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="flex items-center justify-center h-64 text-gray-300 flex-col gap-2">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-sm text-gray-400 font-medium">No data yet</p>
          <p className="text-xs text-gray-300">Charts will populate as users register</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />

            {(Object.keys(SERIES_CONFIG) as Series[]).map((key) =>
              active[key] ? (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={SERIES_CONFIG[key].label}
                  stroke={SERIES_CONFIG[key].color}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: SERIES_CONFIG[key].color, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                  animationDuration={600}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
