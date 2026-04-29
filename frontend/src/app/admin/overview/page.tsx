// // C:\Users\Melody\Desktop\spotter_dashboards\spotter\frontend\src\app\admin\overview\page.tsx

// C:\Users\Melody\Desktop\spotter_dashboards\spotter\frontend\src\app\admin\overview\page.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useApprovalStore } from "@/store/approvalStore";
import {
  ClipboardList,
  Users,
  Zap,
  TrendingUp,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

export default function AdminOverviewPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuthStore();
  const { pendingJobs, fetchPendingJobs } = useApprovalStore();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    fetchPendingJobs();
  }, []);

  const pendingCount = pendingJobs.filter(
    (j) => j.status === "pending_approval"
  ).length;
  const autoMatchedCount = pendingJobs.reduce(
    (sum, job) => sum + (job.auto_matched_count || 0),
    0
  );

  // ✅ Fixed: user has no "name" field — fall back to email or role label
  const displayName = user?.email ?? "Admin";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back, {displayName}</p>
        </div>

        {/* Alerts */}
        {pendingCount > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-yellow-900">
                {pendingCount} job(s) awaiting approval
              </p>
              <p className="text-sm text-yellow-700">
                Review and approve job postings to make them live
              </p>
            </div>
            <Link
              href="/admin/approval"
              className="ml-auto px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 whitespace-nowrap"
            >
              Review Now
            </Link>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              icon: ClipboardList,
              label: "Pending Approvals",
              value: pendingCount,
              color: "bg-yellow-100 text-yellow-700",
              href: "/admin/approval",
            },
            {
              icon: Zap,
              label: "Auto-Matched Candidates",
              value: autoMatchedCount,
              color: "bg-blue-100 text-blue-700",
              href: "/admin/approval",
            },
            {
              icon: Users,
              label: "Total Users",
              value: "1,234",
              color: "bg-purple-100 text-purple-700",
              href: undefined,
            },
            {
              icon: TrendingUp,
              label: "Jobs Posted",
              value: pendingJobs.length,
              color: "bg-green-100 text-green-700",
              href: undefined,
            },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Link
                key={idx}
                href={stat.href || "#"}
                className={`rounded-lg p-6 transition-transform hover:scale-105 ${stat.color} ${
                  stat.href ? "cursor-pointer" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Icon size={24} className="mb-2 opacity-75" />
                    <p className="text-sm font-medium opacity-75">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  {stat.href && <ArrowRight size={20} className="opacity-50" />}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Approval Queue */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Approval Queue</h2>
              {pendingCount > 0 && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                  {pendingCount} Pending
                </span>
              )}
            </div>

            {pendingCount === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ClipboardList size={32} className="mx-auto mb-2 opacity-50" />
                <p>All jobs approved!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingJobs
                  .filter((j) => j.status === "pending_approval")
                  .slice(0, 5)
                  .map((job) => (
                    <Link
                      key={job.id}
                      href="/admin/approval"
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{job.title}</p>
                        <p className="text-sm text-gray-600">
                          {job.auto_matched_count || 0} auto-matches
                        </p>
                      </div>
                      <ArrowRight size={18} className="text-gray-400" />
                    </Link>
                  ))}
              </div>
            )}

            <Link
              href="/admin/approval"
              className="mt-4 block text-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View All Approvals
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Review Jobs", href: "/admin/approval", icon: "📋" },
                { label: "Manage Users", href: "/admin/agents", icon: "👥" },
                { label: "Grant Points", href: "/admin/promotions", icon: "⭐" },
                { label: "View Reports", href: "#", icon: "📊" },
              ].map((action, idx) => (
                <Link
                  key={idx}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <span className="text-lg">{action.icon}</span>
                  <span className="text-sm font-medium">{action.label}</span>
                  <ArrowRight size={16} className="ml-auto opacity-50" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import {
//   Wrench, Users, Building2, UserCheck, Target,
//   Briefcase, CheckCircle, Clock, ArrowRight,
//   Loader2, RefreshCw, AlertCircle, Gift,
//   FileText, Star, ShieldCheck, Flag
// } from "lucide-react";
// import toast from "react-hot-toast";
// import { adminApi } from "@/lib/api";
// import { useAuthStore } from "@/store/authStore";
// import Navbar from "@/components/layout/Navbar";
// import { StatCard } from "@/components/ui/StatCard";
// import { MatchBreakdownChart } from "@/components/admin/MatchBreakdownChart";
// import { formatNaira } from "@/lib/utils";

// interface Stats {
//   users:   { seekers: number; organizations: number; agents: number; spotters: number };
//   jobs:    { active: number };
//   matches: { total: number; approved: number; pending_review: number };
//   revenue: { total_naira: number };
// }
// interface Analytics {
//   summary: { seekers: any; orgs: any; agents: any; matches: any };
//   weekly_growth: any[];
//   match_breakdown: { name: string; value: number; color: string }[];
// }
// interface Payment { id: string; payer_type: string; purpose: string; amount_naira: number; status: string; created_at: string }

// export default function AdminOverviewDashboard() {
//   const router               = useRouter();
//   const { user, isLoggedIn } = useAuthStore();
//   const [stats,    setStats]    = useState<Stats | null>(null);
//   const [analytics,setAnalytics]= useState<Analytics | null>(null);
//   const [payments, setPayments] = useState<Payment[]>([]);
//   const [loading,  setLoading]  = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [bonusPoints, setBonusPoints] = useState("");
//   const [sendingBonus, setSendingBonus] = useState(false);

//   useEffect(() => {
//     if (!isLoggedIn()) { router.push("/login"); return; }
//   }, [isLoggedIn, user, router]);

//   async function loadData(refresh = false) {
//     if (refresh) setRefreshing(true); else setLoading(true);
//     try {
//       const [s, a, p] = await Promise.all([
//         adminApi.getStats(), adminApi.getAnalytics(), adminApi.listPayments({ limit: 5 })
//       ]);
//       setStats(s.data); setAnalytics(a.data); setPayments(p.data);
//     } catch { toast.error("Failed to load data"); }
//     finally { setLoading(false); setRefreshing(false); }
//   }

//   useEffect(() => { if (isLoggedIn()) loadData(); }, [isLoggedIn]);

//   async function grantBonus() {
//     const pts = parseFloat(bonusPoints);
//     if (!pts) { toast.error("Enter a valid amount"); return; }
//     setSendingBonus(true);
//     try {
//       const res = await adminApi.grantBonusPoints({ points: pts, reason: "admin_bonus" });
//       toast.success(res.data.message); setBonusPoints("");
//     } catch { toast.error("Failed"); }
//     finally { setSendingBonus(false); }
//   }

//   if (loading) return (
//     <><Navbar /><div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-red-600" /></div></>
//   );

//   return (
//     <>
//       <Navbar />
//       <div className="min-h-screen bg-gray-50">
//         <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

//           {/* Header */}
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//             <div className="flex items-center gap-3">
//               <div className="bg-green-700 text-white p-2.5 rounded-xl">
//                 <Wrench size={22} />
//               </div>
//               <div>
//                 <h1 className="text-2xl font-black text-gray-900">Admin Dashboard</h1>
//                 <p className="text-sm text-gray-500 mt-0.5">Platform operations · Jobs · Agents · Organisations</p>
//               </div>
//             </div>
//             <div className="flex gap-2">
//               <button onClick={() => loadData(true)} disabled={refreshing}
//                 className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:border-green-300 transition-colors">
//                 <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
//                 Refresh
//               </button>
//               <Link href="/admin/users"   className="btn-secondary text-sm">Users</Link>
//               <Link href="/admin/reports" className="btn-primary  text-sm">Reports</Link>
//             </div>
//           </div>

//           {/* Alert */}
//           {(stats?.matches.pending_review ?? 0) > 0 && (
//             <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
//               <AlertCircle size={20} className="text-yellow-600 shrink-0" />
//               <p className="text-sm font-semibold text-yellow-800">
//                 {stats?.matches.pending_review} match{stats?.matches.pending_review !== 1 ? "es" : ""} awaiting Spotter review
//               </p>
//             </div>
//           )}

//           {/* Stat cards */}
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//             <StatCard label="Active Jobs"      value={stats?.jobs.active ?? 0}            icon={Briefcase}   color="blue"   />
//             <StatCard label="Approved Matches" value={stats?.matches.approved ?? 0}        icon={CheckCircle} color="green"  sub={`${stats?.matches.total ? Math.round((stats.matches.approved/stats.matches.total)*100) : 0}% rate`} />
//             <StatCard label="Pending Review"   value={stats?.matches.pending_review ?? 0}  icon={Clock}       color="yellow" />
//             <StatCard label="Spotters"         value={stats?.users.spotters ?? 0}           icon={ShieldCheck} color="red"    />
//           </div>

//           {/* Main grid */}
//           <div className="grid lg:grid-cols-3 gap-6">

//             {/* Operations panel */}
//             <div className="lg:col-span-2 space-y-5">

//               {/* Recent payments */}
//               <div className="card space-y-3">
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-2">
//                     <FileText size={16} className="text-green-700" />
//                     <h3 className="font-bold text-gray-900">Recent Payments</h3>
//                   </div>
//                   <Link href="/admin/reports" className="text-xs text-green-700 font-semibold hover:underline">
//                     View all →
//                   </Link>
//                 </div>
//                 {payments.length === 0 ? (
//                   <p className="text-sm text-gray-400 text-center py-6">No payments yet</p>
//                 ) : (
//                   <div className="space-y-2">
//                     {payments.map((p) => (
//                       <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
//                         <div>
//                           <p className="text-sm font-medium text-gray-800 capitalize">
//                             {p.purpose.replace(/_/g, " ")}
//                           </p>
//                           <p className="text-xs text-gray-400 capitalize">{p.payer_type}</p>
//                         </div>
//                         <div className="text-right">
//                           <p className="text-sm font-bold text-gray-900">₦{p.amount_naira.toLocaleString()}</p>
//                           <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
//                             p.status === "success" ? "bg-green-100 text-green-700" :
//                             p.status === "pending" ? "bg-yellow-100 text-yellow-700" :
//                             "bg-red-100 text-red-500"
//                           }`}>{p.status}</span>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {/* Match breakdown */}
//               <MatchBreakdownChart
//                 data={analytics?.match_breakdown ?? []}
//                 total={analytics?.summary.matches.total ?? 0}
//               />
//             </div>

//             {/* Sidebar */}
//             <div className="space-y-4">

//               {/* Quick actions */}
//               <div className="card space-y-2">
//                 <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
//                   <Wrench size={16} className="text-green-700" />
//                   <h3 className="font-bold text-gray-900 text-sm">Operations</h3>
//                 </div>
//                 {[
//                   { href: "/admin/matches", icon: Target, label: "Match Review", sub: "Approve or reject seeker matches" },
//                   { href: "/admin/users",      icon: Users,      label: "Manage users",    sub: "View all accounts"       },
//                   { href: "/admin/agents",     icon: UserCheck,  label: "Manage agents",   sub: "Points & activity"       },
//                   { href: "/admin/promotions", icon: Star,       label: "Promotions",      sub: "Bonus point campaigns"   },
//                   { href: "/admin/reports",    icon: FileText,   label: "Reports",         sub: "Export CSV reports"      },
//                 ].map(({ href, icon: Icon, label, sub }) => (
//                   <Link key={href} href={href}
//                     className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-green-50 group transition-colors">
//                     <Icon size={15} className="text-gray-400 group-hover:text-green-600 shrink-0" />
//                     <div>
//                       <p className="text-sm font-medium text-gray-700 group-hover:text-green-700">{label}</p>
//                       <p className="text-xs text-gray-400">{sub}</p>
//                     </div>
//                   </Link>
//                 ))}
//               </div>

//               {/* Bonus points */}
//               <div className="card space-y-3 bg-amber-50 border border-amber-100">
//                 <div className="flex items-center gap-2">
//                   <Gift size={16} className="text-amber-600" />
//                   <h3 className="font-bold text-amber-900 text-sm">Quick Bonus Grant</h3>
//                 </div>
//                 <input type="number" value={bonusPoints}
//                   onChange={(e) => setBonusPoints(e.target.value)}
//                   placeholder="Points to grant all agents"
//                   className="input text-sm py-2" min="0.5" step="0.5"
//                 />
//                 <button onClick={grantBonus} disabled={sendingBonus || !bonusPoints}
//                   className="btn-primary w-full text-sm flex items-center justify-center gap-2">
//                   {sendingBonus ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />}
//                   {sendingBonus ? "Granting…" : "Grant to All Agents"}
//                 </button>
//               </div>

//               {/* User breakdown */}
//               <div className="card space-y-2">
//                 <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider pb-2 border-b border-gray-100">
//                   User Base
//                 </h3>
//                 {[
//                   { label: "Seekers",       value: stats?.users.seekers ?? 0,       color: "text-red-700"    },
//                   { label: "Organisations", value: stats?.users.organizations ?? 0, color: "text-blue-700"   },
//                   { label: "Agents",        value: stats?.users.agents ?? 0,        color: "text-green-700"  },
//                   { label: "Spotters",      value: stats?.users.spotters ?? 0,      color: "text-purple-700" },
//                 ].map(({ label, value, color }) => (
//                   <div key={label} className="flex items-center justify-between py-1">
//                     <span className="text-sm text-gray-500">{label}</span>
//                     <span className={`font-black ${color}`}>{value}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>

//         </div>
//       </div>
//     </>
//   );
// }
