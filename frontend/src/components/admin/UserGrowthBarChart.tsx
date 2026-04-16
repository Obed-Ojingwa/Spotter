// C:\Users\Melody\Documents\Spotter\frontend\src\components\admin\UserGrowthBarChart.tsx

"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";

interface WeeklyPoint {
  week:          string;
  seekers:       number;
  organizations: number;
  agents:        number;
}

interface Props {
  data: WeeklyPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span
            className="w-2.5 h-2.5 rounded shrink-0"
            style={{ backgroundColor: entry.fill }}
          />
          <span className="text-gray-500">{entry.name}:</span>
          <span className="font-bold text-gray-900">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function UserGrowthBarChart({ data }: Props) {
  const hasData = data.some(
    (w) => w.seekers > 0 || w.organizations > 0 || w.agents > 0
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div>
        <h3 className="font-bold text-gray-900 text-base">New Users per Week</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Side-by-side comparison of new Seekers, Orgs, and Agents
        </p>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-52 flex-col gap-2 text-gray-300">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3" y="3" width="4" height="18" /><rect x="10" y="8" width="4" height="13" /><rect x="17" y="5" width="4" height="16" />
          </svg>
          <p className="text-sm text-gray-400 font-medium">No data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              formatter={(value) => (
                <span style={{ color: "#6b7280", fontSize: "11px" }}>{value}</span>
              )}
            />
            <Bar dataKey="seekers"       name="Job Seekers"   fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar dataKey="organizations" name="Organisations" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar dataKey="agents"        name="Agents"        fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
