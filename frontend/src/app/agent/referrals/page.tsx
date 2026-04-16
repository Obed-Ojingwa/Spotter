// C:\Users\Melody\Documents\Spotter\frontend\src\app\agent\referrals\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, ArrowLeft, Loader2, Copy, Check,
  Share2, ChevronRight, Star, Gift
} from "lucide-react";
import toast from "react-hot-toast";
import { agentApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface Referral {
  name: string;
  plan: string;
  joined_at: string;
}

interface ReferralData {
  total_direct_referrals: number;
  referral_code: string;
  referrals: Referral[];
}

// ── Level multipliers (mirrors backend) ───────────────────────────────────
const LEVEL_INFO = [
  { level: 1, multiplier: "100%", desc: "Your direct referrals",       pts: "Full points"        },
  { level: 2, multiplier: "50%",  desc: "Their referrals",             pts: "Half points"        },
  { level: 3, multiplier: "25%",  desc: "3 levels deep",               pts: "Quarter points"     },
  { level: 4, multiplier: "12%",  desc: "4 levels deep",               pts: "12% of base points" },
  { level: 5, multiplier: "6%",   desc: "5 levels deep (max)",         pts: "6% of base points"  },
];

// ── Page ───────────────────────────────────────────────────────────────────
export default function AgentReferralsPage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [data,    setData]    = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "agent") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "agent") return;
    agentApi.getReferrals()
      .then((r) => setData(r.data))
      .catch(() => toast.error("Failed to load referrals"))
      .finally(() => setLoading(false));
  }, [isLoggedIn, user]);

  function copyLink() {
    if (!data) return;
    const link = `${window.location.origin}/register?ref=${data.referral_code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function shareLink() {
    if (!data) return;
    const link = `${window.location.origin}/register?ref=${data.referral_code}`;
    const text = `Join me on SPOTTER — Nigeria's top talent matching platform! Use my referral code ${data.referral_code} to register.`;
    if (navigator.share) {
      navigator.share({ title: "Join SPOTTER", text, url: link }).catch(() => {});
    } else {
      copyLink();
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Link
              href="/agent/dashboard"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">My Referrals</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Earn points from everyone in your 5-level network
              </p>
            </div>
          </div>

          {/* Referral code hero */}
          <div className="bg-gradient-to-br from-red-700 to-red-900 text-white rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-red-200 text-sm font-medium">Your referral code</p>
              <p className="text-4xl font-black font-mono tracking-widest mt-1">
                {data?.referral_code}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-white/10 rounded-xl px-4 py-2.5 text-sm font-mono truncate text-red-100">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/register?ref=${data?.referral_code}`
                  : `spotter.ng/register?ref=${data?.referral_code}`}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 bg-white text-red-700 font-bold px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-sm"
                >
                  {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy</>}
                </button>
                <button
                  onClick={shareLink}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
                >
                  <Share2 size={15} /> Share
                </button>
              </div>
            </div>

            <p className="text-red-200 text-xs">
              Share this link with agents. When they register and earn points, you automatically earn too — up to 5 levels deep.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card text-center py-5">
              <p className="text-4xl font-black text-red-700">
                {data?.total_direct_referrals ?? 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">Direct referrals (Level 1)</p>
            </div>
            <div className="card text-center py-5">
              <p className="text-4xl font-black text-green-700">5</p>
              <p className="text-sm text-gray-500 mt-1">Levels in your network</p>
            </div>
          </div>

          {/* Level breakdown */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-amber-500" />
              <h2 className="font-bold text-gray-900">How your earnings cascade</h2>
            </div>

            <div className="space-y-2">
              {LEVEL_INFO.map(({ level, multiplier, desc, pts }) => (
                <div
                  key={level}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-xl",
                    level === 1 ? "bg-red-50 border border-red-100" : "bg-gray-50"
                  )}
                >
                  {/* Level indicator */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0",
                    level === 1 ? "bg-red-700 text-white" : "bg-gray-200 text-gray-600"
                  )}>
                    {level}
                  </div>

                  {/* Arrow chain */}
                  {level > 1 && (
                    <ChevronRight size={14} className="text-gray-300 -mx-2 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{desc}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{pts}</p>
                  </div>

                  <span className={cn(
                    "text-sm font-black px-3 py-1 rounded-full shrink-0",
                    level === 1
                      ? "bg-red-700 text-white"
                      : "bg-gray-200 text-gray-600"
                  )}>
                    {multiplier}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-2">
              <Gift size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <p>
                Example: Your L1 referral earns 10 points for a successful match →
                you earn <strong>10 pts</strong>. Their referral (your L2) earns 10 pts →
                you earn <strong>5 pts</strong>. And so on down to Level 5.
              </p>
            </div>
          </div>

          {/* Direct referral list */}
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">
              Direct Referrals ({data?.total_direct_referrals ?? 0})
            </h2>

            {!data?.referrals || data.referrals.length === 0 ? (
              <div className="card text-center py-14">
                <Users size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="font-semibold text-gray-600 mb-2">No referrals yet</p>
                <p className="text-sm text-gray-400 mb-5">
                  Share your referral link with other agents to start building your network.
                </p>
                <button onClick={copyLink} className="btn-primary text-sm inline-flex items-center gap-2">
                  <Copy size={14} /> Copy Referral Link
                </button>
              </div>
            ) : (
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["Agent", "Plan", "Joined"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.referrals.map((ref, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {ref.name}
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-semibold capitalize",
                            ref.plan === "pro"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-500"
                          )}>
                            {ref.plan}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs">
                          {new Date(ref.joined_at).toLocaleDateString("en-NG", {
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

        </div>
      </div>
    </>
  );
}
