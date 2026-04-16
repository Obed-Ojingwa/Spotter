// C:\Users\Melody\Documents\Spotter\frontend\src\app\org\jobs\page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase, Plus, Users, MapPin, Clock,
  ArrowLeft, Loader2, Search, Filter
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { jobsApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  city?: string;
  state?: string;
  work_mode?: string;
  employment_type?: string;
  status: string;
  required_skills?: string[];
  created_at: string;
}

const STATUS_TABS = ["all", "active", "closed", "expired"];

export default function OrgJobsPage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [jobs,     setJobs]     = useState<Job[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [closing,  setClosing]  = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "org") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/jobs", { params: { limit: 50 } });
      setJobs(res.data.jobs);
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn() && user?.role === "org") fetchJobs();
  }, [fetchJobs, isLoggedIn, user]);

  async function handleClose(jobId: string) {
    setClosing(jobId);
    try {
      await jobsApi.delete(jobId);
      setJobs((prev) => prev.map((j) =>
        j.id === jobId ? { ...j, status: "closed" } : j
      ));
      toast.success("Job closed.");
    } catch {
      toast.error("Failed to close job.");
    } finally {
      setClosing(null);
    }
  }

  const displayed = jobs.filter((j) => {
    const matchesFilter = filter === "all" || j.status === filter;
    const matchesSearch = search === "" ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.city?.toLowerCase().includes(search.toLowerCase()) ||
      j.state?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/org/dashboard"
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                <ArrowLeft size={20} className="text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-black text-gray-900">My Jobs</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {jobs.length} total · {counts.active ?? 0} active
                </p>
              </div>
            </div>
            <Link href="/org/jobs/new" className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={15} /> Post New Job
            </Link>
          </div>

          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs…" className="input pl-9 text-sm py-2" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_TABS.map((s) => (
                <button key={s} onClick={() => setFilter(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize",
                    filter === s
                      ? "bg-red-700 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-red-300"
                  )}>
                  {s} {s !== "all" && counts[s] ? `(${counts[s]})` : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-red-600" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20">
              <Briefcase size={48} className="mx-auto text-gray-200 mb-4" />
              <h3 className="font-semibold text-gray-700 mb-2">
                {jobs.length === 0 ? "No jobs posted yet" : "No jobs match your filters"}
              </h3>
              {jobs.length === 0 && (
                <Link href="/org/jobs/new" className="btn-primary inline-flex items-center gap-2 text-sm mt-4">
                  <Plus size={14} /> Post your first job
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  closing={closing === job.id}
                  onClose={() => handleClose(job.id)}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ── JobRow ─────────────────────────────────────────────────────────────────
function JobRow({
  job, closing, onClose,
}: { job: Job; closing: boolean; onClose: () => void }) {
  const [confirming, setConfirming] = useState(false);

  const daysAgo = Math.floor(
    (Date.now() - new Date(job.created_at).getTime()) / 86400000
  );

  const statusCls: Record<string, string> = {
    active:  "bg-green-100 text-green-700",
    closed:  "bg-gray-100 text-gray-500",
    expired: "bg-yellow-100 text-yellow-700",
    draft:   "bg-blue-100 text-blue-600",
  };

  return (
    <div className={cn("card flex flex-col sm:flex-row sm:items-center gap-4",
      job.status !== "active" && "opacity-60")}>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900">{job.title}</h3>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold capitalize",
            statusCls[job.status] ?? "bg-gray-100 text-gray-500")}>
            {job.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
          {(job.city || job.state) && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {[job.city, job.state].filter(Boolean).join(", ")}
            </span>
          )}
          {job.work_mode && (
            <span className="capitalize">{job.work_mode}</span>
          )}
          {job.employment_type && (
            <span className="capitalize">{job.employment_type}</span>
          )}
          <span className="flex items-center gap-1 text-gray-400">
            <Clock size={12} />
            {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
          </span>
        </div>
        {job.required_skills && job.required_skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.required_skills.slice(0, 4).map((s) => (
              <span key={s} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">
                {s}
              </span>
            ))}
            {job.required_skills.length > 4 && (
              <span className="text-xs text-gray-400">+{job.required_skills.length - 4}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Link href={`/org/candidates?job=${job.id}`}
          className="text-sm font-semibold text-red-700 hover:underline flex items-center gap-1.5">
          <Users size={14} /> Candidates
        </Link>
        <Link href={`/jobs/${job.id}`}
          className="text-sm text-gray-400 hover:text-gray-600">
          View →
        </Link>
        {job.status === "active" && (
          confirming ? (
            <div className="flex items-center gap-1">
              <button onClick={() => { onClose(); setConfirming(false); }} disabled={closing}
                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {closing ? "…" : "Confirm close"}
              </button>
              <button onClick={() => setConfirming(false)}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              Close job
            </button>
          )
        )}
      </div>
    </div>
  );
}
