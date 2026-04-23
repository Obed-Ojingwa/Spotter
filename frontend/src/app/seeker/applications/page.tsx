// C:\Users\Melody\Documents\Spotter\frontend\src\app\seeker\applications\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, ArrowLeft, Loader2, MapPin,
  Briefcase, Clock, CheckCircle, XCircle, Eye
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface Application {
  application_id: string;
  status: string;
  applied_at: string;
  job: {
    id: string;
    title: string;
    city?: string;
    state?: string;
    work_mode?: string;
  };
}

// "viewed" added — must match every value used in the summary cards array
type FilterStatus = "all" | "applied" | "viewed" | "shortlisted" | "rejected";

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  applied:     { label: "Applied",     cls: "bg-blue-100 text-blue-700",     icon: FileText    },
  viewed:      { label: "Viewed",      cls: "bg-purple-100 text-purple-700", icon: Eye         },
  shortlisted: { label: "Shortlisted", cls: "bg-green-100 text-green-700",   icon: CheckCircle },
  rejected:    { label: "Rejected",    cls: "bg-red-100 text-red-500",       icon: XCircle     },
};

// ── Page ───────────────────────────────────────────────────────────────────
export default function SeekerApplicationsPage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<FilterStatus>("all");

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "seeker") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "seeker") return;
    api.get("/applications/mine")
      .then((r) => setApplications(r.data))
      .catch(() => toast.error("Failed to load applications"))
      .finally(() => setLoading(false));
  }, [isLoggedIn, user]);

  const filtered = applications.filter((a) =>
    filter === "all" ? true : a.status === filter
  );

  // Per-status counts for summary cards
  const counts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  // All four statuses used in summary cards — type is now FilterStatus[] ✓
  const SUMMARY_STATUSES: FilterStatus[] = ["applied", "viewed", "shortlisted", "rejected"];

  // Filter tab options — includes "viewed" so the tab bar can also filter by it
  const FILTER_TABS: FilterStatus[] = ["all", "applied", "viewed", "shortlisted", "rejected"];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Link
              href="/seeker/dashboard"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">My Applications</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {applications.length} total application{applications.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Summary cards */}
          {applications.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SUMMARY_STATUSES.map((s) => {
                const cfg  = STATUS_CONFIG[s];
                const Icon = cfg.icon;
                return (
                  <button
                    key={s}
                    onClick={() => setFilter(s === filter ? "all" : s)}
                    className={cn(
                      "card text-center py-4 transition-all cursor-pointer",
                      filter === s ? "ring-2 ring-red-500" : "hover:shadow-md"
                    )}
                  >
                    <Icon
                      size={20}
                      className={cn(
                        "mx-auto mb-1",
                        s === "shortlisted" ? "text-green-500"  :
                        s === "rejected"    ? "text-red-400"    :
                        s === "viewed"      ? "text-purple-500" : "text-blue-500"
                      )}
                    />
                    <p className="text-2xl font-black text-gray-900">{counts[s] ?? 0}</p>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">{cfg.label}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Filter tabs */}
          {applications.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {FILTER_TABS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize",
                    filter === f
                      ? "bg-red-700 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-red-300"
                  )}
                >
                  {f === "all" ? `All (${applications.length})` : f}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-red-600" />
            </div>
          ) : applications.length === 0 ? (
            <EmptyApplications />
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p>No {filter} applications.</p>
              <button
                onClick={() => setFilter("all")}
                className="text-red-600 underline text-sm mt-2"
              >
                View all
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered
                .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
                .map((app) => (
                  <ApplicationRow key={app.application_id} application={app} />
                ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ── ApplicationRow ─────────────────────────────────────────────────────────
function ApplicationRow({ application }: { application: Application }) {
  const cfg  = STATUS_CONFIG[application.status] ?? STATUS_CONFIG.applied;
  const Icon = cfg.icon;

  const daysAgo = Math.floor(
    (Date.now() - new Date(application.applied_at).getTime()) / 86400000
  );

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Status icon */}
      <div className={cn("p-3 rounded-xl shrink-0", cfg.cls.split(" ")[0])}>
        <Icon size={18} className={cfg.cls.split(" ")[1]} />
      </div>

      {/* Job info */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/jobs/${application.job.id}`}
          className="font-semibold text-gray-900 hover:text-red-700 transition-colors line-clamp-1"
        >
          {application.job.title}
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
          {(application.job.city || application.job.state) && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {[application.job.city, application.job.state].filter(Boolean).join(", ")}
            </span>
          )}
          {application.job.work_mode && (
            <span className="flex items-center gap-1 capitalize">
              <Briefcase size={12} />
              {application.job.work_mode}
            </span>
          )}
          <span className="flex items-center gap-1 text-gray-400">
            <Clock size={12} />
            {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
          </span>
        </div>
      </div>

      {/* Status badge + action */}
      <div className="flex items-center gap-3 shrink-0">
        <span className={cn("text-xs px-3 py-1 rounded-full font-semibold", cfg.cls)}>
          {cfg.label}
        </span>
        <Link
          href={`/jobs/${application.job.id}`}
          className="text-xs text-gray-400 hover:text-red-600 font-medium"
        >
          View job →
        </Link>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyApplications() {
  return (
    <div className="text-center py-20">
      <FileText size={48} className="mx-auto text-gray-200 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">No applications yet</h3>
      <p className="text-sm text-gray-400 mb-6">
        Browse jobs and hit Apply to start tracking your applications here.
      </p>
      <Link href="/jobs" className="btn-primary text-sm inline-block">
        Browse Jobs
      </Link>
    </div>
  );
}