// C:\Users\Melody\Documents\Spotter\frontend\src\app\org\dashboard\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase, Users, Target, Plus, ArrowRight,
  Loader2, Building2, MapPin, CheckCircle, Clock
} from "lucide-react";
import toast from "react-hot-toast";
import { orgApi, jobsApi } from "@/lib/api";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface OrgProfile {
  id: string;
  name: string;
  city?: string;
  state?: string;
  free_posts_left: number;
  free_matches_left: number;
  is_verified: boolean;
  industry?: string;
}

interface Job {
  id: string;
  title: string;
  city?: string;
  state?: string;
  work_mode?: string;
  employment_type?: string;
  status: string;
  created_at: string;
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function OrgDashboard() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [jobs,    setJobs]    = useState<Job[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "org") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "org") return;
    Promise.all([
      api.get("/org/profile"),
      orgApi.listJobs({ limit: 5, page: 1 }),
      orgApi.getJobMatchCounts().catch(() => ({ data: { counts: {} as Record<string, number> } })),
    ])
      .then(([profileRes, jobsRes, countsRes]) => {
        setProfile(profileRes.data);
        setJobs(jobsRes.data.jobs ?? []);
        setMatchCounts(countsRes.data?.counts ?? {});
      })
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [isLoggedIn, user]);

  async function handleCloseJob(jobId: string) {
    try {
      await jobsApi.delete(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success("Job closed.");
    } catch {
      toast.error("Could not close job.");
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

  const activeJobs  = jobs.filter((j) => j.status === "active");
  const closedJobs  = jobs.filter((j) => j.status !== "active");

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

          {/* ── Header ──────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <Building2 size={26} className="text-red-600" />
                {profile?.name ?? "My Organisation"}
              </h1>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                {profile?.city && profile?.state
                  ? <><MapPin size={13} />{profile.city}, {profile.state}</>
                  : "Update your organisation profile"}
                {profile?.is_verified && (
                  <span className="ml-2 flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle size={13} /> Verified
                  </span>
                )}
              </p>
            </div>
            <Link href="/org/jobs/new" className="btn-primary flex items-center gap-2 self-start sm:self-auto">
              <Plus size={16} /> Post a Job
            </Link>
          </div>

          {/* ── Free quota banner ───────────────────────────── */}
          {(profile?.free_posts_left ?? 0) > 0 || (profile?.free_matches_left ?? 0) > 0 ? (
            <div className="bg-gradient-to-r from-red-700 to-red-600 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-bold text-lg">Welcome to SPOTTER! 🎉</p>
                <p className="text-red-100 text-sm mt-1">
                  You have free credits to get started — no payment needed yet.
                </p>
              </div>
              <div className="flex gap-4 text-center shrink-0">
                <div className="bg-white/20 rounded-xl px-5 py-3">
                  <p className="text-2xl font-black">{profile?.free_posts_left}</p>
                  <p className="text-xs text-red-100">Free posts</p>
                </div>
                <div className="bg-white/20 rounded-xl px-5 py-3">
                  <p className="text-2xl font-black">{profile?.free_matches_left}</p>
                  <p className="text-xs text-red-100">Free matches</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Stats ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Active Jobs"
              value={activeJobs.length}
              icon={Briefcase}
              color="red"
            />
            <StatCard
              label="Total Jobs Posted"
              value={jobs.length}
              icon={Target}
              color="blue"
            />
            <StatCard
              label="Free Posts Left"
              value={profile?.free_posts_left ?? 0}
              icon={CheckCircle}
              color={profile?.free_posts_left ? "green" : "yellow"}
            />
            <StatCard
              label="Free Matches Left"
              value={profile?.free_matches_left ?? 0}
              icon={Users}
              color={profile?.free_matches_left ? "green" : "yellow"}
            />
          </div>

          {/* ── Main content ────────────────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Job listings (2/3) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">Your Jobs</h2>
                <Link href="/org/jobs" className="text-sm text-red-700 font-semibold hover:underline">
                  Manage all →
                </Link>
              </div>

              {jobs.length === 0 ? (
                <div className="card text-center py-14">
                  <Briefcase size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="font-semibold text-gray-600 mb-2">No jobs posted yet</p>
                  <p className="text-sm text-gray-400 mb-5">
                    Post your first job — your first 2 are free!
                  </p>
                  <Link href="/org/jobs/new" className="btn-primary inline-flex items-center gap-2 text-sm">
                    <Plus size={15} /> Post a Job
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <OrgJobRow
                      key={job.id}
                      job={job}
                      matchCount={matchCounts[job.id] ?? 0}
                      onClose={() => handleCloseJob(job.id)}
                    />
                  ))}
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
                  { href: "/org/jobs/new",      icon: Plus,       label: "Post a new job" },
                  { href: "/org/candidates",    icon: Users,      label: "Browse candidates" },
                  { href: "/org/profile",       icon: Building2,  label: "Update org profile" },
                  { href: "/org/billing",       icon: CheckCircle,label: "Billing & payments" },
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

              {/* How matching works */}
              <div className="card bg-red-50 border-red-100 space-y-2">
                <h3 className="font-bold text-red-900 text-sm">How matching works</h3>
                <ul className="space-y-1.5 text-xs text-red-700">
                  {[
                    "Post a job with detailed requirements",
                    "Our engine scores candidates 0–100%",
                    "A Spotter reviews every match",
                    "Top candidates revealed to you",
                    "Scores ≥ 90% → premium access required",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="bg-red-700 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── OrgJobRow ──────────────────────────────────────────────────────────────
function OrgJobRow({
  job, matchCount, onClose,
}: {
  job: Job;
  matchCount: number;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const daysAgo = Math.floor(
    (Date.now() - new Date(job.created_at).getTime()) / 86400000
  );

  return (
    <div className={cn(
      "card flex flex-col sm:flex-row sm:items-center gap-4 py-4",
      job.status !== "active" && "opacity-60"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
          <StatusBadge status={job.status} />
          <span
            className={cn(
              "text-[11px] font-bold px-2 py-0.5 rounded-full border",
              matchCount > 0
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-gray-50 text-gray-400 border-gray-200"
            )}
            title="Approved matches (revealed to you)"
          >
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
          {(job.city || job.state) && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {[job.city, job.state].filter(Boolean).join(", ")}
            </span>
          )}
          {job.work_mode && (
            <span className="capitalize">{job.work_mode}</span>
          )}
          <span className="flex items-center gap-1 text-gray-400">
            <Clock size={12} />
            {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/org/candidates?job=${job.id}`}
          className="text-sm font-semibold text-red-700 hover:underline flex items-center gap-1"
        >
          <Users size={14} /> Candidates
        </Link>

        {job.status === "active" && (
          <>
            {confirming ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={onClose}
                  className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-700"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-xs text-gray-500 px-2 py-1.5 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 transition-colors"
              >
                Close job
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:  "bg-green-100 text-green-700",
    closed:  "bg-gray-100 text-gray-500",
    expired: "bg-yellow-100 text-yellow-700",
    draft:   "bg-blue-100 text-blue-600",
  };
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", map[status] ?? "bg-gray-100 text-gray-500")}>
      {status}
    </span>
  );
}
