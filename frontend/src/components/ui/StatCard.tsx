import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: "red" | "green" | "blue" | "yellow";
  sub?: string;
}

const colorMap = {
  red:    { bg: "bg-red-50",    icon: "bg-red-100 text-red-700",    value: "text-red-700" },
  green:  { bg: "bg-green-50",  icon: "bg-green-100 text-green-700", value: "text-green-700" },
  blue:   { bg: "bg-blue-50",   icon: "bg-blue-100 text-blue-700",   value: "text-blue-700" },
  yellow: { bg: "bg-yellow-50", icon: "bg-yellow-100 text-yellow-700", value: "text-yellow-700" },
};

export function StatCard({ label, value, icon: Icon, color = "red", sub }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={cn("rounded-xl border border-gray-100 p-5 shadow-sm", c.bg)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={cn("text-3xl font-bold mt-1", c.value)}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={cn("p-3 rounded-xl", c.icon)}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
