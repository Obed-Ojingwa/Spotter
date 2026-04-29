// C:\Users\Melody\Documents\Spotter\frontend\src\app\admin\executive\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart2, Users, UserCheck, Building2, Target,
  TrendingUp, Clock, CheckCircle, ArrowRight,
  Loader2, RefreshCw, Eye, FileText, Briefcase,
  Activity, Star
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { StatCard } from "@/components/ui/StatCard";
import { GrowthCard } from "@/components/admin/GrowthCard";
import { WeeklyGrowthChart } from "@/components/admin/WeeklyGrowthChart";
import { UserGrowthBarChart } from "@/components/admin/UserGrowthBarChart";

interface Stats {
  users:   { seekers: number; organizations: number; agents: number; spotters: number };
  jobs:    { active: number };
  matches: { total: number; approved: number; pending_review: number };
  revenue: { total_naira: number };
}
interface Analytics {
  summary: { seekers: any; orgs: any; agents: any; matches: any };
  weekly_growth: any[];
  match_breakdown: any[];
}

export default function ExecutiveAdminDashboard() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    // Executive admin uses legacy "admin" role
  }, [isLoggedIn, user, router]);

  async function loadData(showRefresh = false) {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [s, a] = await Promise.all([adminApi.getStats(), adminApi.getAnalytics()]);
      setStats(s.data); setAnalytics(a.data);
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => {
    if (isLoggedIn()) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  if (loading) return (
    <><Navbar /><div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-red-600" /></div></>
  );

  const approvalRate = stats && stats.matches.total > 0
    ? Math.round((stats.matches.approved / stats.matches.total) * 100)
    : 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-700 text-white p-2.5 rounded-xl">
                <BarChart2 size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Executive Admin Dashboard</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Monitor platform health · Manage admins · Review activity
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => loadData(true)} disabled={refreshing}
                className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:border-blue-300 transition-colors">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
              <Link href="/admin/reports" className="btn-primary text-sm">Export Reports</Link>
            </div>
          </div>

          {/* Executive scope banner */}
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white rounded-2xl p-5 flex items-center gap-5">
            <BarChart2 size={36} className="text-blue-300 shrink-0" />
            <div>
              <p className="font-bold text-base">Executive Administration</p>
              <p className="text-blue-100 text-sm mt-0.5">
                You can manage Admin accounts, monitor Agents and Spotters,
                view analytics, and assign Admin roles. Contact Super Admin for elevated privileges.
              </p>
            </div>
          </div>

          {/* Growth cards */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Platform Overview</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <GrowthCard label="Job Seekers"   total={analytics?.summary.seekers.total ?? 0} newThisWeek={analytics?.summary.seekers.new_this_week ?? 0} icon={Users}      color="red"    />
              <GrowthCard label="Organisations" total={analytics?.summary.orgs.total ?? 0}    newThisWeek={analytics?.summary.orgs.new_this_week ?? 0}    icon={Building2}  color="blue"   />
              <GrowthCard label="Agents"        total={analytics?.summary.agents.total ?? 0}  newThisWeek={analytics?.summary.agents.new_this_week ?? 0}  icon={UserCheck}  color="green"  />
              <GrowthCard label="Matches"       total={analytics?.summary.matches.total ?? 0} newThisWeek={analytics?.summary.matches.new_this_week ?? 0} icon={Target}     color="yellow" />
            </div>
          </div>

          {/* Charts */}
          <WeeklyGrowthChart data={analytics?.weekly_growth ?? []} />
          <UserGrowthBarChart data={(analytics?.weekly_growth ?? []).map((w: any) => ({
            week: w.week, seekers: w.seekers, organizations: w.organizations, agents: w.agents,
          }))} />

          {/* Bottom grid */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Activity stats */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Activity size={16} className="text-blue-700" />
                <h3 className="font-bold text-gray-900">Platform Activity</h3>
              </div>
              {[
                { label: "Active Jobs",      value: stats?.jobs.active ?? 0,            icon: Briefcase,   color: "text-blue-700"   },
                { label: "Approval Rate",    value: `${approvalRate}%`,                 icon: CheckCircle, color: "text-green-700"  },
                { label: "Pending Review",   value: stats?.matches.pending_review ?? 0, icon: Clock,       color: "text-yellow-600" },
                { label: "Spotters Online",  value: stats?.users.spotters ?? 0,         icon: Eye,         color: "text-purple-700" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={color} />
                    <span className="text-sm text-gray-500">{label}</span>
                  </div>
                  <span className={`font-black text-lg ${color}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Manage admins panel */}
            <div className="card space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Users size={16} className="text-blue-700" />
                <h3 className="font-bold text-gray-900">Manage Admins & Team</h3>
              </div>
              {[
                { href: "/admin/users?role=admin",   icon: Users,      label: "View admin accounts",  sub: "List and monitor all admins"      },
                { href: "/admin/jobs",                icon: Briefcase,  label: "Pending jobs",        sub: "Approve or edit new jobs"         },
                { href: "/admin/agents",              icon: UserCheck,  label: "Monitor agents",       sub: "Agent activity and points"         },
                { href: "/admin/users?role=spotter",  icon: Eye,        label: "Monitor spotters",     sub: "Review queue performance"         },
                { href: "/admin/users?role=org",      icon: Building2,  label: "Approve organisations",sub: "Pending org account approvals"    },
              ].map(({ href, icon: Icon, label, sub }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 group transition-colors">
                  <Icon size={15} className="text-gray-400 group-hover:text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                  <ArrowRight size={13} className="text-gray-300 group-hover:text-blue-400 shrink-0" />
                </Link>
              ))}
            </div>

            {/* Reports panel */}
            <div className="card space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <FileText size={16} className="text-blue-700" />
                <h3 className="font-bold text-gray-900">Reports & Analytics</h3>
              </div>
              {[
                { href: "/admin/reports",    icon: TrendingUp, label: "Payment reports",   sub: "All transactions & revenue"  },
                { href: "/admin/promotions", icon: Star,       label: "Run promotions",    sub: "Bonus point campaigns"       },
              ].map(({ href, icon: Icon, label, sub }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 group transition-colors">
                  <Icon size={15} className="text-gray-400 group-hover:text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                  <ArrowRight size={13} className="text-gray-300 group-hover:text-blue-400 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
