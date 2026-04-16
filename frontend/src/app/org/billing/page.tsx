// C:\Users\Melody\Documents\Spotter\frontend\src\app\org\billing\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Briefcase, Users, CreditCard,
  CheckCircle, Loader2, DollarSign, Lock
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { paymentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

interface OrgProfile {
  free_posts_left: number;
  free_matches_left: number;
  name: string;
}

const PLANS = [
  {
    id:    "org_job_post" as const,
    label: "Job Post",
    price: "₦5,000",
    kobo:  500000,
    icon:  Briefcase,
    desc:  "Post one additional job listing that stays active for 30 days.",
    perks: ["30-day listing", "Unlimited applicants", "Candidate matching enabled"],
  },
  {
    id:    "org_unlock" as const,
    label: "Unlock Premium Candidates",
    price: "₦15,000",
    kobo:  1500000,
    icon:  Users,
    desc:  "Unlock all candidates scoring ≥ 90% for one specific job.",
    perks: ["All premium candidates revealed", "Full profile access", "CV download enabled"],
  },
];

export default function OrgBillingPage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [profile,  setProfile]  = useState<OrgProfile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [paying,   setPaying]   = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "org") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "org") return;
    api.get("/org/profile")
      .then((r) => setProfile(r.data))
      .catch(() => toast.error("Failed to load billing info"))
      .finally(() => setLoading(false));
  }, [isLoggedIn, user]);

  async function handlePurchase(purposeKey: "org_job_post" | "org_unlock", jobId?: string) {
    setPaying(purposeKey);
    try {
      const metadata: Record<string, string> = {};
      if (jobId) metadata.job_id = jobId;
      const res = await paymentsApi.initiate(purposeKey, metadata);
      window.location.href = res.data.authorization_url;
    } catch {
      toast.error("Failed to initiate payment.");
    } finally {
      setPaying(null);
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
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/org/dashboard"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Billing & Credits</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage your job posts and candidate access
              </p>
            </div>
          </div>

          {/* Current quota */}
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900">Your Current Credits</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <QuotaCard
                icon={Briefcase}
                label="Free Job Posts"
                used={2 - (profile?.free_posts_left ?? 0)}
                total={2}
                remaining={profile?.free_posts_left ?? 0}
                color="red"
              />
              <QuotaCard
                icon={Users}
                label="Free Candidate Matches"
                used={2 - (profile?.free_matches_left ?? 0)}
                total={2}
                remaining={profile?.free_matches_left ?? 0}
                color="blue"
              />
            </div>
          </div>

          {/* Purchase options */}
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Buy More Credits</h2>
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <div key={plan.id} className="card flex flex-col sm:flex-row gap-5">
                  <div className="bg-red-50 rounded-xl p-4 flex items-center justify-center shrink-0 sm:w-16 sm:h-16">
                    <Icon size={24} className="text-red-700" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{plan.label}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{plan.desc}</p>
                      </div>
                      <p className="text-2xl font-black text-red-700 shrink-0">{plan.price}</p>
                    </div>
                    <ul className="space-y-1">
                      {plan.perks.map((perk) => (
                        <li key={perk} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle size={13} className="text-green-500 shrink-0" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handlePurchase(plan.id)}
                      disabled={paying === plan.id}
                      className="btn-primary text-sm flex items-center gap-2 w-full sm:w-auto justify-center mt-3"
                    >
                      {paying === plan.id
                        ? <Loader2 size={15} className="animate-spin" />
                        : <CreditCard size={15} />
                      }
                      {paying === plan.id ? "Redirecting…" : `Pay ${plan.price}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment note */}
          <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500">
            <Lock size={15} className="shrink-0 mt-0.5 text-gray-400" />
            <p>
              Payments are processed securely via Paystack. You will be redirected to their
              checkout page and returned here after completion.
              In dev mode, payments auto-approve instantly.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}

// ── QuotaCard ──────────────────────────────────────────────────────────────
function QuotaCard({
  icon: Icon, label, used, total, remaining, color,
}: {
  icon: React.ElementType;
  label: string;
  used: number;
  total: number;
  remaining: number;
  color: "red" | "blue";
}) {
  const pct = Math.round((used / total) * 100);
  const barColor = remaining === 0 ? "bg-red-400" : color === "red" ? "bg-red-600" : "bg-blue-600";
  const iconCls  = color === "red" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700";

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", iconCls)}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">{label}</p>
          <p className={cn(
            "text-xs font-medium",
            remaining === 0 ? "text-red-500" : "text-gray-400"
          )}>
            {remaining} of {total} remaining
          </p>
        </div>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
