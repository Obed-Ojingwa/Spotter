// C:\Users\Melody\Documents\Spotter\frontend\src\app\admin\promotions\page.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Loader2, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import Navbar from "@/components/layout/Navbar";

const schema = z.object({
  // points:    z.coerce.number().min(0.5, "Enter at least 0.5 points"),
  points: z.number().min(0.5, "Enter at least 0.5 points"),
  reason:    z.string().min(1),
  agent_id:  z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const REASONS = [
  { value: "weekly_promotion",  label: "Weekly Promotion"  },
  { value: "milestone_bonus",   label: "Milestone Bonus"   },
  { value: "holiday_bonus",     label: "Holiday Bonus"     },
  { value: "performance_bonus", label: "Performance Bonus" },
  { value: "admin_bonus",       label: "Admin Bonus"       },
];

export default function AdminPromotionsPage() {
  const [lastGrant, setLastGrant] = useState<{ points: number; count: number } | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { reason: "weekly_promotion" } });

  const watchPoints = watch("points");
  const watchAgentId = watch("agent_id");

  async function onSubmit(data: FormData) {
    try {
      const payload: Record<string, unknown> = { points: data.points, reason: data.reason };
      if (data.agent_id?.trim()) payload.agent_id = data.agent_id.trim();
      const res = await adminApi.grantBonusPoints(payload);
      toast.success(res.data.message);
      setLastGrant({ points: data.points, count: data.agent_id ? 1 : 99 });
      reset();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to grant points.");
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Promotions</h1>
              <p className="text-sm text-gray-500 mt-0.5">Grant bonus points to agents</p>
            </div>
          </div>

          {lastGrant && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
              <CheckCircle size={20} className="text-green-600 shrink-0" />
              <p className="text-sm text-green-800 font-medium">
                Successfully granted <strong>{lastGrant.points} points</strong> to{" "}
                {lastGrant.count === 1 ? "1 agent" : "all active agents"}.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
              <Gift size={18} className="text-amber-500" />
              <h2 className="font-bold text-gray-900">Grant Bonus Points</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Points to grant
              </label>
              <input type="number" step="0.5" min="0.5" {...register("points", { valueAsNumber: true })}
                className="input" placeholder="e.g. 5" />
              {errors.points && <p className="text-red-500 text-xs mt-1">{errors.points.message}</p>}
              {watchPoints >= 0.5 && (
                <p className="text-xs text-gray-400 mt-1">
                  Worth ₦{(watchPoints * 2000).toLocaleString()} per agent
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
              <select {...register("reason")} className="input">
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Specific agent ID{" "}
                <span className="text-gray-400 font-normal">(leave blank to grant to ALL agents)</span>
              </label>
              <input {...register("agent_id")} className="input"
                placeholder="Paste agent UUID to target one agent" />
            </div>

            <div className={`rounded-xl p-4 text-sm font-medium ${watchAgentId?.trim()
              ? "bg-blue-50 text-blue-700"
              : "bg-amber-50 text-amber-700"}`}>
              {watchAgentId?.trim()
                ? "⚡ Will grant points to ONE specific agent."
                : "📢 Will grant points to ALL active agents on the platform."}
            </div>

            <button type="submit" disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
              {isSubmitting ? "Granting…" : "Grant Points"}
            </button>
          </form>

        </div>
      </div>
    </>
  );
}
