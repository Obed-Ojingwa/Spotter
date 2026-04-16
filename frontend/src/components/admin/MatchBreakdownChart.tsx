// C:\Users\Melody\Documents\Spotter\frontend\src\components\admin\MatchBreakdownChart.tsx

"use client";

import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

interface BreakdownItem {
  name:  string;
  value: number;
  color: string;
}

interface Props {
  data: BreakdownItem[];
  total: number;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: item.payload.color }}
        />
        <span className="font-semibold text-gray-700">{item.name}</span>
      </div>
      <p className="text-gray-500 mt-1">
        <span className="text-xl font-black text-gray-900">{item.value}</span> matches
      </p>
    </div>
  );
}

function CustomLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.4em" fontSize="28" fontWeight="900" fill="#1f2937">
        {total}
      </tspan>
      <tspan x={cx} dy="1.4em" fontSize="11" fill="#9ca3af">
        total
      </tspan>
    </text>
  );
}

export function MatchBreakdownChart({ data, total }: Props) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4 h-full">
      <div>
        <h3 className="font-bold text-gray-900 text-base">Match Status</h3>
        <p className="text-xs text-gray-400 mt-0.5">Breakdown of all matches by current status</p>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-52 flex-col gap-2 text-gray-300">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" />
          </svg>
          <p className="text-sm text-gray-400 font-medium">No matches yet</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                animationBegin={0}
                animationDuration={600}
                label={false}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Custom centre label — drawn over chart */}
          <div className="relative -mt-[calc(200px+1rem)]" style={{ height: 200, pointerEvents: "none" }}>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <p className="text-3xl font-black text-gray-900 leading-none">{total}</p>
              <p className="text-xs text-gray-400 mt-1">total</p>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2 pt-2">
            {data.map((item) => {
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-6 text-right">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
