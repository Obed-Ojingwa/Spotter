// // C:\Users\Melody\Documents\Spotter\frontend\src\app\org\jobs\page.tsx


"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { CheckCircle2, Clock, AlertCircle, Zap, ExternalLink } from "lucide-react";
import api from "@/lib/api";

interface OrgJob {
  id: string;
  title: string;
  description: string;
  status: "pending_approval" | "approved" | "rejected" | "published";
  created_at: string;
  approved_at?: string;
  rejected_reason?: string;
  auto_matched_count?: number;
  rejection_feedback?: string;
}

export default function OrgJobsPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuthStore();
  const [jobs, setJobs] = useState<OrgJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">(
    "all"
  );

  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "organization") {
      router.push("/login");
      return;
    }
    fetchOrgJobs();
  }, []);

  const fetchOrgJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/org/jobs");
      setJobs(res.data.jobs || []);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs =
    filter === "all"
      ? jobs
      : jobs.filter((job) => job.status === filter);

  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "pending_approval").length,
    approved: jobs.filter(
      (j) => j.status === "approved" || j.status === "published"
    ).length,
    rejected: jobs.filter((j) => j.status === "rejected").length,
  };

  const getStatusBadge = (status: string) => {
    const badgeConfig = {
      pending_approval: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        icon: Clock,
        label: "Pending Review",
      },
      approved: {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: CheckCircle2,
        label: "Approved",
      },
      published: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        icon: CheckCircle2,
        label: "Live",
      },
      rejected: {
        bg: "bg-red-100",
        text: "text-red-800",
        icon: AlertCircle,
        label: "Rejected",
      },
    };

    const config =
      badgeConfig[status as keyof typeof badgeConfig] || badgeConfig.pending_approval;
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.bg} ${config.text}`}>
        <Icon size={16} />
        <span className="text-xs font-semibold">{config.label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Job Postings</h1>
          <p className="text-gray-600">
            Monitor approval status and auto-matched candidates
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Posted", value: stats.total, color: "bg-blue-100 text-blue-700" },
            {
              label: "Pending Approval",
              value: stats.pending,
              color: "bg-yellow-100 text-yellow-700",
            },
            {
              label: "Approved",
              value: stats.approved,
              color: "bg-green-100 text-green-700",
            },
            {
              label: "Rejected",
              value: stats.rejected,
              color: "bg-red-100 text-red-700",
            },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-lg p-4 ${stat.color}`}>
              <p className="text-sm font-medium opacity-75">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 w-fit border border-gray-200">
          {[
            { label: "All", value: "all" as const },
            { label: "Pending", value: "pending" as const },
            { label: "Approved", value: "approved" as const },
            { label: "Rejected", value: "rejected" as const },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                filter === tab.value
                  ? "bg-red-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <AlertCircle className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-600">No jobs found in this category</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                {/* Description Preview */}
                <p className="text-gray-700 text-sm mb-4 line-clamp-2">{job.description}</p>

                {/* Status-Specific Info */}
                {job.status === "pending_approval" && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Under Review:</strong> Our admins are reviewing your job posting.
                      You'll be notified once it's approved or if changes are needed.
                    </p>
                  </div>
                )}

                {job.status === "rejected" && job.rejection_feedback && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <p className="text-sm font-semibold text-red-800 mb-1">Rejection Feedback:</p>
                    <p className="text-sm text-red-700">{job.rejection_feedback}</p>
                  </div>
                )}

                {(job.status === "approved" || job.status === "published") && (
                  <div className="flex items-start gap-4 mb-4">
                    {job.auto_matched_count ? (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap size={16} className="text-blue-600" />
                          <p className="text-sm font-semibold text-blue-900">Auto-Matches</p>
                        </div>
                        <p className="text-sm text-blue-700">
                          {job.auto_matched_count} candidate(s) automatically matched
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {job.status === "approved" || job.status === "published" ? (
                    <>
                      <button
                        onClick={() => router.push(`/org/jobs/${job.id}`)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={16} />
                        View Details
                      </button>
                      <button
                        onClick={() => router.push(`/org/jobs/${job.id}/matches`)}
                        className="flex-1 px-4 py-2 border border-red-600 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                      >
                        View Matches
                      </button>
                    </>
                  ) : (
                    <button
                      disabled
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
                    >
                      Awaiting Approval
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// "use client";

// import { useEffect, useState, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import {
//   Briefcase, Plus, Users, MapPin, Clock,
//   ArrowLeft, Loader2, Search, Filter
// } from "lucide-react";
// import toast from "react-hot-toast";
// import { jobsApi, orgApi } from "@/lib/api";
// import { useAuthStore } from "@/store/authStore";
// import Navbar from "@/components/layout/Navbar";
// import { cn } from "@/lib/utils";

// interface Job {
//   id: string;
//   title: string;
//   poster_type?: string;
//   agent_id?: string | null;
//   city?: string;
//   state?: string;
//   work_mode?: string;
//   employment_type?: string;
//   status: string;
//   required_skills?: string[];
//   created_at: string;
// }

// const STATUS_TABS = ["all", "active", "closed", "expired"];

// export default function OrgJobsPage() {
//   const router               = useRouter();
//   const { user, isLoggedIn } = useAuthStore();

//   const [jobs,     setJobs]     = useState<Job[]>([]);
//   const [loading,  setLoading]  = useState(true);
//   const [search,   setSearch]   = useState("");
//   const [filter,   setFilter]   = useState("all");
//   const [closing,  setClosing]  = useState<string | null>(null);

//   useEffect(() => {
//     if (!isLoggedIn()) { router.push("/login"); return; }
//     if (user?.role !== "org") { router.push("/"); return; }
//   }, [isLoggedIn, user, router]);

//   const fetchJobs = useCallback(async () => {
//     setLoading(true);
//     try {
//       const res = await orgApi.listJobs({ limit: 50, page: 1 });
//       setJobs(res.data.jobs);
//     } catch {
//       toast.error("Failed to load jobs");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     if (isLoggedIn() && user?.role === "org") fetchJobs();
//   }, [fetchJobs, isLoggedIn, user]);

//   async function handleClose(jobId: string) {
//     setClosing(jobId);
//     try {
//       await jobsApi.delete(jobId);
//       setJobs((prev) => prev.map((j) =>
//         j.id === jobId ? { ...j, status: "closed" } : j
//       ));
//       toast.success("Job closed.");
//     } catch {
//       toast.error("Failed to close job.");
//     } finally {
//       setClosing(null);
//     }
//   }

//   const displayed = jobs.filter((j) => {
//     const matchesFilter = filter === "all" || j.status === filter;
//     const matchesSearch = search === "" ||
//       j.title.toLowerCase().includes(search.toLowerCase()) ||
//       j.city?.toLowerCase().includes(search.toLowerCase()) ||
//       j.state?.toLowerCase().includes(search.toLowerCase());
//     return matchesFilter && matchesSearch;
//   });

//   const counts = jobs.reduce<Record<string, number>>((acc, j) => {
//     acc[j.status] = (acc[j.status] ?? 0) + 1;
//     return acc;
//   }, {});

//   return (
//     <>
//       <Navbar />
//       <div className="min-h-screen bg-gray-50">
//         <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

//           {/* Header */}
//           <div className="flex items-center justify-between gap-4">
//             <div className="flex items-center gap-4">
//               <Link href="/org/dashboard"
//                 className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
//                 <ArrowLeft size={20} className="text-gray-600" />
//               </Link>
//               <div>
//                 <h1 className="text-2xl font-black text-gray-900">My Jobs</h1>
//                 <p className="text-sm text-gray-500 mt-0.5">
//                   {jobs.length} total · {counts.active ?? 0} active
//                 </p>
//               </div>
//             </div>
//             <Link href="/org/jobs/new" className="btn-primary flex items-center gap-2 text-sm">
//               <Plus size={15} /> Post New Job
//             </Link>
//           </div>

//           {/* Search + filter */}
//           <div className="flex flex-col sm:flex-row gap-3">
//             <div className="relative flex-1 max-w-sm">
//               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//               <input value={search} onChange={(e) => setSearch(e.target.value)}
//                 placeholder="Search jobs…" className="input pl-9 text-sm py-2" />
//             </div>
//             <div className="flex gap-1.5 flex-wrap">
//               {STATUS_TABS.map((s) => (
//                 <button key={s} onClick={() => setFilter(s)}
//                   className={cn(
//                     "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize",
//                     filter === s
//                       ? "bg-red-700 text-white"
//                       : "bg-white border border-gray-200 text-gray-600 hover:border-red-300"
//                   )}>
//                   {s} {s !== "all" && counts[s] ? `(${counts[s]})` : ""}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Content */}
//           {loading ? (
//             <div className="flex items-center justify-center py-24">
//               <Loader2 size={32} className="animate-spin text-red-600" />
//             </div>
//           ) : displayed.length === 0 ? (
//             <div className="text-center py-20">
//               <Briefcase size={48} className="mx-auto text-gray-200 mb-4" />
//               <h3 className="font-semibold text-gray-700 mb-2">
//                 {jobs.length === 0 ? "No jobs posted yet" : "No jobs match your filters"}
//               </h3>
//               {jobs.length === 0 && (
//                 <Link href="/org/jobs/new" className="btn-primary inline-flex items-center gap-2 text-sm mt-4">
//                   <Plus size={14} /> Post your first job
//                 </Link>
//               )}
//             </div>
//           ) : (
//             <div className="space-y-3">
//               {displayed.map((job) => (
//                 <JobRow
//                   key={job.id}
//                   job={job}
//                   closing={closing === job.id}
//                   onClose={() => handleClose(job.id)}
//                 />
//               ))}
//             </div>
//           )}

//         </div>
//       </div>
//     </>
//   );
// }

// // ── JobRow ─────────────────────────────────────────────────────────────────
// function JobRow({
//   job, closing, onClose,
// }: { job: Job; closing: boolean; onClose: () => void }) {
//   const [confirming, setConfirming] = useState(false);

//   const daysAgo = Math.floor(
//     (Date.now() - new Date(job.created_at).getTime()) / 86400000
//   );

//   const statusCls: Record<string, string> = {
//     active:  "bg-green-100 text-green-700",
//     closed:  "bg-gray-100 text-gray-500",
//     expired: "bg-yellow-100 text-yellow-700",
//     draft:   "bg-blue-100 text-blue-600",
//   };

//   return (
//     <div className={cn("card flex flex-col sm:flex-row sm:items-center gap-4",
//       job.status !== "active" && "opacity-60")}>

//       <div className="flex-1 min-w-0 space-y-1.5">
//         <div className="flex items-center gap-2 flex-wrap">
//           <h3 className="font-semibold text-gray-900">{job.title}</h3>
//           <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold capitalize",
//             statusCls[job.status] ?? "bg-gray-100 text-gray-500")}>
//             {job.status}
//           </span>
//           {job.poster_type === "agent" && (
//             <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-100">
//               Posted by Agent
//             </span>
//           )}
//         </div>
//         <div className="flex flex-wrap gap-3 text-sm text-gray-500">
//           {(job.city || job.state) && (
//             <span className="flex items-center gap-1">
//               <MapPin size={12} />
//               {[job.city, job.state].filter(Boolean).join(", ")}
//             </span>
//           )}
//           {job.work_mode && (
//             <span className="capitalize">{job.work_mode}</span>
//           )}
//           {job.employment_type && (
//             <span className="capitalize">{job.employment_type}</span>
//           )}
//           <span className="flex items-center gap-1 text-gray-400">
//             <Clock size={12} />
//             {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
//           </span>
//         </div>
//         {job.required_skills && job.required_skills.length > 0 && (
//           <div className="flex flex-wrap gap-1">
//             {job.required_skills.slice(0, 4).map((s) => (
//               <span key={s} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">
//                 {s}
//               </span>
//             ))}
//             {job.required_skills.length > 4 && (
//               <span className="text-xs text-gray-400">+{job.required_skills.length - 4}</span>
//             )}
//           </div>
//         )}
//       </div>

//       <div className="flex items-center gap-3 shrink-0">
//         <Link href={`/org/candidates?job=${job.id}`}
//           className="text-sm font-semibold text-red-700 hover:underline flex items-center gap-1.5">
//           <Users size={14} /> Candidates
//         </Link>
//         <Link href={`/jobs/${job.id}`}
//           className="text-sm text-gray-400 hover:text-gray-600">
//           View →
//         </Link>
//         {job.status === "active" && (
//           confirming ? (
//             <div className="flex items-center gap-1">
//               <button onClick={() => { onClose(); setConfirming(false); }} disabled={closing}
//                 className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50">
//                 {closing ? "…" : "Confirm close"}
//               </button>
//               <button onClick={() => setConfirming(false)}
//                 className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5">
//                 Cancel
//               </button>
//             </div>
//           ) : (
//             <button onClick={() => setConfirming(true)}
//               className="text-xs text-gray-400 hover:text-red-500 transition-colors">
//               Close job
//             </button>
//           )
//         )}
//       </div>
//     </div>
//   );
// }
