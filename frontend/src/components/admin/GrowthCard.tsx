// C:\Users\Melody\Documents\Spotter\frontend\src\components\admin\GrowthCard.tsx

"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface GrowthCardProps {
  label:       string;
  total:       number;
  newThisWeek: number;
  icon:        React.ElementType;
  color:       "red" | "blue" | "green" | "yellow" | "purple";
  suffix?:     string;   // e.g. "orgs", "seekers"
}

const COLOR_MAP = {
  red:    { bg: "bg-red-50",    icon: "bg-red-100 text-red-700",     value: "text-red-700",    badge: "bg-red-100 text-red-700"    },
  blue:   { bg: "bg-blue-50",   icon: "bg-blue-100 text-blue-700",   value: "text-blue-700",   badge: "bg-blue-100 text-blue-700"  },
  green:  { bg: "bg-green-50",  icon: "bg-green-100 text-green-700", value: "text-green-700",  badge: "bg-green-100 text-green-700"},
  yellow: { bg: "bg-amber-50",  icon: "bg-amber-100 text-amber-700", value: "text-amber-700",  badge: "bg-amber-100 text-amber-700"},
  purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-700", value: "text-purple-700", badge: "bg-purple-100 text-purple-700"},
};

export function GrowthCard({
  label, total, newThisWeek, icon: Icon, color, suffix,
}: GrowthCardProps) {
  const c = COLOR_MAP[color];

  // Growth direction indicator
  const isNew      = newThisWeek > 0;
  const TrendIcon  = isNew ? TrendingUp : newThisWeek < 0 ? TrendingDown : Minus;
  const trendColor = isNew ? "text-green-600" : "text-gray-400";

  return (
    <div className={cn("rounded-xl border border-gray-100 p-5 shadow-sm space-y-3", c.bg)}>

      {/* Header row */}
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={cn("p-2.5 rounded-xl shrink-0", c.icon)}>
          <Icon size={20} />
        </div>
      </div>

      {/* Total */}
      <div>
        <p className={cn("text-4xl font-black tracking-tight", c.value)}>
          {total.toLocaleString()}
        </p>
        {suffix && (
          <p className="text-xs text-gray-400 mt-0.5">{suffix}</p>
        )}
      </div>

      {/* New this week */}
      <div className="flex items-center justify-between pt-1 border-t border-white/60">
        <div className="flex items-center gap-1.5">
          <TrendIcon size={13} className={trendColor} />
          <span className={cn("text-xs font-semibold", trendColor)}>
            +{newThisWeek}
          </span>
          <span className="text-xs text-gray-400">new this week</span>
        </div>
        {newThisWeek > 0 && (
          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", c.badge)}>
            Live
          </span>
        )}
      </div>
    </div>
  );
}
