// C:\Users\Melody\Documents\Spotter\frontend\src\app\admin\super\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield, Users, Building2, UserCheck, ShieldCheck,
  Target, DollarSign, Key, Lock, Unlock, RefreshCw,
  TrendingUp, ArrowRight, Loader2, AlertCircle, Gift,
  Settings, Database, Activity, Crown
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { GrowthCard } from "@/components/admin/GrowthCard";
import { WeeklyGrowthChart } from "@/components/admin/WeeklyGrowthChart";
import { MatchBreakdownChart } from "@/components/admin/MatchBreakdownChart";
import { formatNaira } from "@/lib/utils";

interface Stats {
  users:   { seekers: number; organizations: number; agents: number; spotters: number };
  jobs:    { active: number };
  matches: { total: number; approved: number; pending_review: number };
  revenue: { total_naira: number };
}
interface Analytics {
  summary: {
    seekers:  { total: number; new_this_week: number };
    orgs:     { total: number; new_this_week: number };
    agents:   { total: number; new_this_week: number };
    matches:  { total: number; new_this_week: number };
  };
  weekly_growth: any[];
  match_breakdown: { name: string; value: number; color: string }[];
}
interface Role { id: number; name: string; slug: string; hierarchy_level: number }

export default function SuperAdminDashboard() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [roles,     setRoles]     = useState<Role[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "super_admin") { router.push("/admin/dashboard"); return; }
  }, [isLoggedIn, user, router]);

  async function loadData(showRefresh = false) {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [s, a, r] = await Promise.all([
        adminApi.getStats(),
        adminApi.getAnalytics(),
        api.get("/rbac/roles"),
      ]);
      setStats(s.data); setAnalytics(a.data); setRoles(r.data);
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => {
    if (isLoggedIn() && user?.role === "super_admin") loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user]);

  if (loading) return (
    <><Navbar /><div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-red-600" /></div></>
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-red-700 text-white p-2.5 rounded-xl">
                <Crown size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Super Admin Control Centre</h1>
                <p className="text-sm text-gray-500 mt-0.5">Full platform authority · All systems visible</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => loadData(true)} disabled={refreshing}
                className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:border-red-300 transition-colors">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "…" : "Refresh"}
              </button>
              <Link href="/admin/users"   className="btn-secondary text-sm">Users</Link>
              <Link href="/admin/reports" className="btn-primary  text-sm">Reports</Link>
            </div>
          </div>

          {/* Authority banner */}
          <div className="bg-gradient-to-r from-red-900 to-red-700 text-white rounded-2xl p-5 flex items-center gap-5">
            <Shield size={40} className="text-red-300 shrink-0" />
            <div>
              <p className="font-black text-lg">Super Admin Override Active</p>
              <p className="text-red-200 text-sm mt-0.5">
                You have unrestricted access to all platform functions, user management,
                role assignment, permission overrides, and system configuration.
              </p>
            </div>
          </div>

          {/* Growth cards */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Platform Growth</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <GrowthCard label="Job Seekers"    total={analytics?.summary.seekers.total ?? 0}  newThisWeek={analytics?.summary.seekers.new_this_week ?? 0}  icon={Users}      color="red"    suffix="seekers"  />
              <GrowthCard label="Organisations"  total={analytics?.summary.orgs.total ?? 0}     newThisWeek={analytics?.summary.orgs.new_this_week ?? 0}     icon={Building2}  color="blue"   suffix="orgs"     />
              <GrowthCard label="Agents"         total={analytics?.summary.agents.total ?? 0}   newThisWeek={analytics?.summary.agents.new_this_week ?? 0}   icon={UserCheck}  color="green"  suffix="agents"   />
              <GrowthCard label="Total Matches"  total={analytics?.summary.matches.total ?? 0}  newThisWeek={analytics?.summary.matches.new_this_week ?? 0}  icon={Target}     color="yellow" suffix="all time" />
            </div>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <WeeklyGrowthChart data={analytics?.weekly_growth ?? []} />
            </div>
            <MatchBreakdownChart data={analytics?.match_breakdown ?? []} total={analytics?.summary.matches.total ?? 0} />
          </div>

          {/* Revenue */}
          <div className="card bg-gradient-to-br from-red-700 to-red-900 text-white flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex-1">
              <p className="text-red-200 text-sm">Total Platform Revenue</p>
              <p className="text-4xl font-black mt-1">{formatNaira((stats?.revenue.total_naira ?? 0) * 100)}</p>
            </div>
            <DollarSign size={56} className="text-white/10 hidden sm:block" />
          </div>

          {/* Bottom grid */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* RBAC control panel */}
            <div className="card space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Key size={16} className="text-red-700" />
                <h3 className="font-bold text-gray-900">Role & Permission Control</h3>
              </div>
              <p className="text-xs text-gray-400">Manage roles, permissions, temporary elevations</p>
              <div className="space-y-1.5">
                {roles.sort((a, b) => a.hierarchy_level - b.hierarchy_level).map((role) => (
                  <div key={role.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-300 w-4">{role.hierarchy_level}</span>
                      <span className="text-sm font-medium text-gray-700">{role.name}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{role.slug}</span>
                  </div>
                ))}
              </div>
              <Link href="/admin/users" className="btn-primary text-sm w-full text-center block mt-2">
                Manage Roles & Users →
              </Link>
            </div>

            {/* Quick super-admin actions */}
            <div className="card space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Settings size={16} className="text-red-700" />
                <h3 className="font-bold text-gray-900">Super Admin Actions</h3>
              </div>
              {[
                { href: "/admin/users",      icon: Users,       label: "Manage all users",         sub: "Create, edit, disable any account"  },
                { href: "/admin/agents",     icon: UserCheck,   label: "Manage agents",            sub: "Points, referrals, promotions"      },
                { href: "/admin/promotions", icon: Gift,        label: "Run promotions",           sub: "Grant bonus points to all agents"   },
                { href: "/admin/reports",    icon: TrendingUp,  label: "Export reports",           sub: "Full platform CSV exports"          },
                { href: "/api/docs#/rbac",   icon: Lock,        label: "RBAC API (advanced)",      sub: "Direct permission management"       },
              ].map(({ href, icon: Icon, label, sub }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-red-50 group transition-colors">
                  <Icon size={15} className="text-gray-400 group-hover:text-red-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 group-hover:text-red-700">{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                  <ArrowRight size={13} className="text-gray-300 group-hover:text-red-400 shrink-0" />
                </Link>
              ))}
            </div>

            {/* System health */}
            <div className="card space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Activity size={16} className="text-red-700" />
                <h3 className="font-bold text-gray-900">System Health</h3>
              </div>
              {[
                { label: "Active Jobs",      value: stats?.jobs.active ?? 0,              color: "text-blue-700"  },
                { label: "Approved Matches", value: stats?.matches.approved ?? 0,         color: "text-green-700" },
                { label: "Pending Review",   value: stats?.matches.pending_review ?? 0,   color: "text-yellow-600"},
                { label: "Spotters",         value: stats?.users.spotters ?? 0,           color: "text-purple-700"},
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className={`text-lg font-black ${color}`}>{value}</span>
                </div>
              ))}
              {(stats?.matches.pending_review ?? 0) > 0 && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 mt-2">
                  <AlertCircle size={14} className="text-yellow-600 shrink-0" />
                  <p className="text-xs text-yellow-700 font-medium">
                    {stats?.matches.pending_review} match{stats?.matches.pending_review !== 1 ? "es" : ""} need Spotter review
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
