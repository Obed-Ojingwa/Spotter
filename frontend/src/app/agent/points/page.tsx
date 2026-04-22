// C:\Users\Melody\Documents\Spotter\frontend\src\app\agent\points\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wallet, ArrowLeft, Loader2, TrendingUp,
  TrendingDown, CircleDollarSign, AlertCircle, CheckCircle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { agentApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface PointEntry {
  delta: number;
  reason: string;
  created_at: string;
}

interface DashSummary {
  points: number;
  naira_value: number;
}

// ── Convert schema ─────────────────────────────────────────────────────────
const convertSchema = z.object({
  points_to_convert:   z.coerce.number().min(10, "Minimum 10 points"),
  bank_account_name:   z.string().min(3, "Account name is required"),
  bank_account_number: z.string().length(10, "Must be 10 digits").regex(/^\d+$/, "Digits only"),
  bank_name:           z.string().min(3, "Bank name is required"),
});
type ConvertForm = z.infer<typeof convertSchema>;

const BANKS = [
  "Access Bank","Citibank","Ecobank","Fidelity Bank","First Bank",
  "First City Monument Bank","Guaranty Trust Bank","Heritage Bank",
  "Keystone Bank","Polaris Bank","Stanbic IBTC Bank","Standard Chartered",
  "Sterling Bank","Union Bank","United Bank for Africa","Unity Bank",
  "Wema Bank","Zenith Bank",
];

// ── Page ───────────────────────────────────────────────────────────────────
export default function AgentPointsPage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [history,  setHistory]  = useState<PointEntry[]>([]);
  const [summary,  setSummary]  = useState<DashSummary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [submitted, setSubmitted] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "agent") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "agent") return;
    Promise.all([agentApi.getPointsHistory(), agentApi.getDashboard()])
      .then(([histRes, dashRes]) => {
        setHistory(histRes.data);
        setSummary({ points: dashRes.data.points, naira_value: dashRes.data.naira_value });
      })
      .catch(() => toast.error("Failed to load points data"))
      .finally(() => setLoading(false));
  }, [isLoggedIn, user]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConvertForm>({ resolver: zodResolver(convertSchema) });

  const watchPoints = watch("points_to_convert");
  const nairaPreview = watchPoints ? Number(watchPoints) * 2000 : 0;

  async function onConvert(data: ConvertForm) {
    try {
      const res = await agentApi.convertPoints(data);
      toast.success(res.data.message);
      setSubmitted(true);
      reset();
      // Refresh balance
      agentApi.getDashboard().then((r) =>
        setSummary({ points: r.data.points, naira_value: r.data.naira_value })
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Conversion failed.");
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-red-600" />
        </div>
      </>
    );
  }

  // Separate credits vs debits
  const credits = history.filter((e) => e.delta > 0);
  const debits  = history.filter((e) => e.delta < 0);
  const canConvert = (summary?.points ?? 0) >= 10;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Link
              href="/agent/dashboard"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Points & Payouts</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                View your earnings and request naira payouts
              </p>
            </div>
          </div>

          {/* Balance hero */}
          <div className="bg-gradient-to-br from-red-700 to-red-900 text-white rounded-2xl p-6">
            <div className="grid sm:grid-cols-3 gap-6 items-center">
              <div className="sm:col-span-2">
                <p className="text-red-200 text-sm">Available balance</p>
                <p className="text-5xl font-black mt-1">
                  {(summary?.points ?? 0).toFixed(2)}
                  <span className="text-2xl text-red-300 ml-2 font-normal">pts</span>
                </p>
                <p className="text-red-100 text-xl font-semibold mt-1">
                  ≈ ₦{(summary?.naira_value ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white/10 rounded-xl p-3">
                  <TrendingUp size={18} className="mx-auto mb-1 text-green-300" />
                  <p className="text-lg font-black">{credits.length}</p>
                  <p className="text-xs text-red-200">Credits</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <TrendingDown size={18} className="mx-auto mb-1 text-red-300" />
                  <p className="text-lg font-black">{debits.length}</p>
                  <p className="text-xs text-red-200">Payouts</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">

            {/* History (3/5) */}
            <div className="lg:col-span-3 space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">Transaction History</h2>

              {history.length === 0 ? (
                <div className="card text-center py-12">
                  <Wallet size={36} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm">No transactions yet</p>
                </div>
              ) : (
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {["Activity", "Points", "Date"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {history.map((entry, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {entry.delta >= 0
                                ? <TrendingUp size={14} className="text-green-500 shrink-0" />
                                : <TrendingDown size={14} className="text-red-400 shrink-0" />
                              }
                              <span className="text-gray-700 capitalize">
                                {entry.reason.replace(/_/g, " ")}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "font-bold",
                              entry.delta >= 0 ? "text-green-600" : "text-red-500"
                            )}>
                              {entry.delta >= 0 ? "+" : ""}{entry.delta.toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">pts</span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {new Date(entry.created_at).toLocaleDateString("en-NG", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Convert form (2/5) */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">Convert to Naira</h2>

              {submitted && (
                <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                  <CheckCircle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Payout request submitted!</p>
                    <p className="text-green-600 text-xs mt-0.5">
                      Admin will process within 2 business days.
                    </p>
                  </div>
                </div>
              )}

              {!canConvert && (
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>You need at least <strong>10 points</strong> to request a payout.</p>
                </div>
              )}

              <form
                onSubmit={handleSubmit(onConvert)}
                className={cn("card space-y-4", !canConvert && "opacity-60 pointer-events-none")}
              >
                {/* Points amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Points to convert
                    <span className="text-gray-400 font-normal ml-1">
                      (max {(summary?.points ?? 0).toFixed(2)})
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="10"
                    max={summary?.points}
                    {...register("points_to_convert",{ valueAsNumber: true })}
                    className="input"
                    placeholder="e.g. 10"
                  />
                  {errors.points_to_convert && (
                    <p className="text-red-500 text-xs mt-1">{errors.points_to_convert.message}</p>
                  )}
                  {watchPoints >= 10 && (
                    <p className="text-green-600 text-xs mt-1.5 font-medium">
                      You will receive ≈ ₦{nairaPreview.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Bank account name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Account name
                  </label>
                  <input
                    {...register("bank_account_name")}
                    className="input"
                    placeholder="John Doe"
                  />
                  {errors.bank_account_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.bank_account_name.message}</p>
                  )}
                </div>

                {/* Account number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Account number
                  </label>
                  <input
                    {...register("bank_account_number")}
                    className="input"
                    placeholder="0123456789"
                    maxLength={10}
                  />
                  {errors.bank_account_number && (
                    <p className="text-red-500 text-xs mt-1">{errors.bank_account_number.message}</p>
                  )}
                </div>

                {/* Bank name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Bank
                  </label>
                  <select {...register("bank_name")} className="input">
                    <option value="">Select your bank</option>
                    {BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {errors.bank_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.bank_name.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !canConvert}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting
                    ? <Loader2 size={16} className="animate-spin" />
                    : <CircleDollarSign size={16} />
                  }
                  {isSubmitting ? "Submitting…" : "Request Payout"}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Payouts are reviewed and sent by admin within 2 business days.
                  1 point = ₦2,000.
                </p>
              </form>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
