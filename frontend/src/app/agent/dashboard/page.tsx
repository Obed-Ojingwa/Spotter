// C:\Users\Melody\Documents\Spotter\frontend\src\app\agent\dashboard\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Star, Users, Briefcase, Copy, Check,
  ArrowRight, Loader2, TrendingUp, Wallet,
  CircleDollarSign
} from "lucide-react";
import toast from "react-hot-toast";
import { agentApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { StatCard } from "@/components/ui/StatCard";

// ── Types ──────────────────────────────────────────────────────────────────
interface AgentDashboard {
  name: string;
  referral_code: string;
  points: number;
  naira_value: number;
  plan: string;
  total_jobs_posted: number;
  total_referrals: number;
}

interface PointEntry {
  delta: number;
  reason: string;
  created_at: string;
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function AgentDashboard() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [data,         setData]         = useState<AgentDashboard | null>(null);
  const [pointHistory, setPointHistory] = useState<PointEntry[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [copied,       setCopied]       = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "agent") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "agent") return;
    Promise.all([
      agentApi.getDashboard(),
      agentApi.getPointsHistory(),
    ])
      .then(([dashRes, histRes]) => {
        setData(dashRes.data);
        setPointHistory(histRes.data.slice(0, 8));
      })
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [isLoggedIn, user]);

  function copyReferralLink() {
    if (!data) return;
    const link = `${window.location.origin}/register?ref=${data.referral_code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2500);
    });
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

  const naira = data?.naira_value ?? 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

          {/* ── Header ──────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-gray-900">
                Welcome, {data?.name?.split(" ")[0] ?? "Agent"} 👋
              </h1>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                Agent Dashboard
                <span className={`
                  text-xs px-2 py-0.5 rounded-full font-semibold capitalize
                  ${data?.plan === "pro"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-500"}
                `}>
                  {data?.plan ?? "basic"} plan
                </span>
              </p>
            </div>
            <Link href="/agent/points" className="btn-primary text-sm self-start sm:self-auto">
              Convert Points
            </Link>
          </div>

          {/* ── Points hero card ─────────────────────────────── */}
          <div className="bg-gradient-to-br from-red-700 to-red-900 text-white rounded-2xl p-6">
            <div className="grid sm:grid-cols-3 gap-6">

              {/* Points balance */}
              <div className="sm:col-span-2">
                <p className="text-red-200 text-sm font-medium">Points Balance</p>
                <p className="text-5xl font-black mt-1 tracking-tight">
                  {(data?.points ?? 0).toFixed(1)}
                  <span className="text-2xl text-red-300 ml-2 font-medium">pts</span>
                </p>
                <p className="text-red-100 text-lg font-semibold mt-1">
                  ≈ ₦{naira.toLocaleString()}
                </p>
                <p className="text-red-300 text-xs mt-3">
                  1 point = ₦2,000 · Minimum conversion: 10 points
                </p>
              </div>

              {/* Referral code */}
              <div className="bg-white/10 rounded-xl p-4 flex flex-col justify-between">
                <p className="text-red-200 text-xs font-semibold uppercase tracking-wider">
                  Your referral code
                </p>
                <div>
                  <p className="text-2xl font-black font-mono mt-2 tracking-widest">
                    {data?.referral_code}
                  </p>
                  <button
                    onClick={copyReferralLink}
                    className="mt-3 flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-lg font-medium w-full justify-center"
                  >
                    {copied
                      ? <><Check size={13} /> Copied!</>
                      : <><Copy size={13} /> Copy invite link</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats row ───────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Points Earned"
              value={(data?.points ?? 0).toFixed(1)}
              icon={Star}
              color="yellow"
            />
            <StatCard
              label="Naira Value"
              value={`₦${(naira / 1000).toFixed(0)}k`}
              icon={CircleDollarSign}
              color="green"
            />
            <StatCard
              label="Jobs Posted"
              value={data?.total_jobs_posted ?? 0}
              icon={Briefcase}
              color="blue"
            />
            <StatCard
              label="Direct Referrals"
              value={data?.total_referrals ?? 0}
              icon={Users}
              color="red"
            />
          </div>

          {/* ── How to earn points ──────────────────────────── */}
          <div className="card bg-amber-50 border border-amber-100">
            <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
              <Star size={16} className="text-amber-500" /> How to earn points
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { action: "Successful match",    pts: "5 pts",   desc: "When a match you triggered gets approved" },
                { action: "Job posted",           pts: "2 pts",   desc: "Each job listing you post on the platform" },
                { action: "Agent referral L1",    pts: "×1.0",    desc: "When your direct referral earns points" },
                { action: "Agent referral L2",    pts: "×0.5",    desc: "Your referral's referrals" },
                { action: "Agent referral L3–5",  pts: "×0.25–0.06", desc: "Up to 5 levels deep" },
                { action: "Weekly promotions",    pts: "Varies",  desc: "Admin grants bonus points periodically" },
              ].map(({ action, pts, desc }) => (
                <div key={action} className="bg-white rounded-xl p-3 border border-amber-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-800">{action}</p>
                    <span className="text-xs font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                      {pts}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Main grid ───────────────────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Points history (2/3) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">Points History</h2>
                <Link href="/agent/points" className="text-sm text-red-700 font-semibold hover:underline">
                  Full history →
                </Link>
              </div>

              {pointHistory.length === 0 ? (
                <div className="card text-center py-12">
                  <Wallet size={36} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-500 font-medium mb-1">No points activity yet</p>
                  <p className="text-sm text-gray-400">
                    Post a job or trigger a match to start earning
                  </p>
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
                      {pointHistory.map((entry, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700 capitalize">
                            {entry.reason.replace(/_/g, " ")}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${entry.delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                              {entry.delta >= 0 ? "+" : ""}{entry.delta.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {new Date(entry.created_at).toLocaleDateString("en-NG", {
                              day: "numeric", month: "short", year: "numeric"
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sidebar (1/3) */}
            <div className="space-y-4">

              {/* Quick actions */}
              <div className="card space-y-2">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-3">
                  Quick Actions
                </h3>
                {[
                  { href: "/agent/jobs/new",  icon: Briefcase,    label: "Post a job" },
                  { href: "/agent/referrals", icon: Users,        label: "My referrals" },
                  { href: "/agent/points",    icon: Wallet,       label: "Convert points" },
                  { href: "/jobs",            icon: TrendingUp,   label: "Browse all jobs" },
                ].map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-red-50 group transition-colors"
                  >
                    <Icon size={16} className="text-gray-400 group-hover:text-red-600 shrink-0" />
                    <span className="text-sm text-gray-700 group-hover:text-red-700">{label}</span>
                    <ArrowRight size={14} className="ml-auto text-gray-300 group-hover:text-red-400" />
                  </Link>
                ))}
              </div>

              {/* Conversion CTA */}
              {(data?.points ?? 0) >= 10 && (
                <div className="card bg-green-50 border border-green-100 text-center space-y-3">
                  <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto flex items-center justify-center">
                    <CircleDollarSign size={22} className="text-green-700" />
                  </div>
                  <div>
                    <p className="font-bold text-green-900 text-sm">Ready to cash out!</p>
                    <p className="text-xs text-green-700 mt-1">
                      You have enough points to convert to naira.
                    </p>
                  </div>
                  <Link href="/agent/points" className="block w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors">
                    Convert ₦{naira.toLocaleString()}
                  </Link>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </>
  );
}
