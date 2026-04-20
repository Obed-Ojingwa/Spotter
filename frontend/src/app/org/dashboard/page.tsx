// C:\Users\Melody\Documents\Spotter\frontend\src\app\org\dashboard\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  Users,
  Target,
  Plus,
  ArrowRight,
  Loader2,
  Building2,
  MapPin,
  CheckCircle,
  Clock,
  Wallet,
  CreditCard,
  FileText,
  Shield,
  Settings2,
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
  poster_type?: string;
  agent_id?: string | null;
  city?: string;
  state?: string;
  work_mode?: string;
  employment_type?: string;
  status: string;
  created_at: string;
  daysAgo?: number;
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function OrgDashboard() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    if (user?.role !== "org") {
      router.push("/");
      return;
    }
  }, [isLoggedIn, user, router]);

  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "org") return;

    Promise.all([
      api.get("/org/profile"),
      orgApi.listJobs({ limit: 5, page: 1 }),
      orgApi.getJobMatchCounts().catch(() => ({
        data: { counts: {} as Record<string, number> },
      })),
    ])
      .then(([profileRes, jobsRes, countsRes]) => {
        const fetchedJobs = (jobsRes.data.jobs ?? []).map((job: Job) => ({
          ...job,
          daysAgo: Math.floor(
            (Date.now() - new Date(job.created_at).getTime()) / 86400000
          ),
        }));

        setProfile(profileRes.data);
        setJobs(fetchedJobs);
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

  const activeJobs = jobs.filter((j) => j.status === "active");
  const totalJobPointsLeft = profile?.free_posts_left ?? 0;
  const totalMatchCreditsLeft = profile?.free_matches_left ?? 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* ── Hero / Profile summary ─────────────────────── */}
          <section className="rounded-3xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-gray-950 via-red-800 to-red-700 px-6 py-7 text-white">
              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold">
                      <Wallet size={15} />
                      Total job point left:
                      <span className="text-white font-black">{totalJobPointsLeft}</span>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-red-50">
                      <Users size={15} />
                      Free matches left:
                      <span className="font-bold">{totalMatchCreditsLeft}</span>
                    </span>
                  </div>

                  <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                      <Building2 size={28} className="text-red-100" />
                      {profile?.name ?? "My Organisation"}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-red-50">
                      {profile?.city && profile?.state ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={13} />
                          {profile.city}, {profile.state}
                        </span>
                      ) : (
                        <span>Update your organisation profile</span>
                      )}

                      {profile?.industry ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Briefcase size={13} />
                          {profile.industry}
                        </span>
                      ) : null}

                      {profile?.is_verified && (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                          <CheckCircle size={14} />
                          Verified organisation
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/org/jobs/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50"
                  >
                    <Plus size={16} />
                    Post a Job
                  </Link>
                  <Link
                    href="/org/billing"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                  >
                    <Wallet size={16} />
                    Purchase Job Point
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 px-6 py-5 bg-white">
              <ProfileInfoCard
                icon={Briefcase}
                title="Job posting credit"
                value={`${totalJobPointsLeft} point${totalJobPointsLeft === 1 ? "" : "s"} left`}
                sub="Use available credits to publish new jobs before buying more."
                accent="red"
              />
              <ProfileInfoCard
                icon={Users}
                title="Candidate access"
                value={`${totalMatchCreditsLeft} free match${totalMatchCreditsLeft === 1 ? "" : "es"} left`}
                sub="Keep using your matching allowance before premium unlocks are needed."
                accent="blue"
              />
              <ProfileInfoCard
                icon={Building2}
                title="Organisation profile"
                value={profile?.is_verified ? "Verified and active" : "Needs attention"}
                sub="Keep your company identity current before posting new roles."
                accent={profile?.is_verified ? "green" : "yellow"}
                href="/org/profile"
              />
            </div>
          </section>

          {/* ── Stats ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
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
              label="Total Job Point Left"
              value={totalJobPointsLeft}
              icon={Wallet}
              color={totalJobPointsLeft ? "green" : "yellow"}
            />
            <StatCard
              label="Free Matches Left"
              value={totalMatchCreditsLeft}
              icon={Users}
              color={totalMatchCreditsLeft ? "green" : "yellow"}
            />
          </div>

          {/* ── Workspace layout ────────────────────────────── */}
          <div className="grid xl:grid-cols-[320px,1fr] gap-6">
            {/* Left rail */}
            <aside className="space-y-4">
              <div className="card space-y-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-gray-900">
                    Organisation workspace
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Core actions for hiring, billing, and company setup.
                  </p>
                </div>

                <div className="space-y-3">
                  <ActionLinkCard
                    href="/org/billing"
                    icon={Wallet}
                    title="Purchase job point"
                    description="Buy more job-post credits using the existing billing flow."
                    tone="red"
                  />
                  <ActionLinkCard
                    href="/org/jobs"
                    icon={Settings2}
                    title="Manage jobs"
                    description="Review active roles, track status, and take down listings when needed."
                    tone="gray"
                  />
                  <ActionLinkCard
                    href="/org/jobs/new"
                    icon={Plus}
                    title="Post a job"
                    description="Create a new organisation job listing with your current posting flow."
                    tone="red"
                  />
                  <ActionLinkCard
                    href="/org/candidates"
                    icon={Users}
                    title="Browse candidates"
                    description="Open candidate discovery and review matching pipelines."
                    tone="blue"
                  />
                  <ActionLinkCard
                    href="/org/billing"
                    icon={CreditCard}
                    title="Transactions"
                    description="Open billing records and payment activity from the existing billing screen."
                    tone="blue"
                  />
                  <ActionLinkCard
                    href="/org/billing"
                    icon={FileText}
                    title="Invoices"
                    description="Use the billing area as your current source of payment and purchase records."
                    tone="blue"
                  />
                </div>
              </div>

              <div className="card bg-amber-50 border-amber-100 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-100 text-amber-700 p-2">
                    <Shield size={16} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-amber-900">Posting identity</h3>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      Your current posting flow uses the saved organisation profile.
                      Review the company details before creating a new listing.
                    </p>
                  </div>
                </div>
                <Link
                  href="/org/profile"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900 hover:underline"
                >
                  Update organisation profile
                  <ArrowRight size={14} />
                </Link>
              </div>

              {(profile?.free_posts_left ?? 0) > 0 || (profile?.free_matches_left ?? 0) > 0 ? (
                <div className="rounded-2xl bg-gradient-to-r from-red-700 to-red-600 text-white p-5 space-y-3 shadow-sm">
                  <div>
                    <p className="font-bold text-lg">Credits still available</p>
                    <p className="text-sm text-red-100 mt-1">
                      You can keep hiring without payment until your current free allocation runs out.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
                      <p className="text-2xl font-black">{profile?.free_posts_left ?? 0}</p>
                      <p className="text-xs text-red-100">Job points</p>
                    </div>
                    <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
                      <p className="text-2xl font-black">{profile?.free_matches_left ?? 0}</p>
                      <p className="text-xs text-red-100">Match credits</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </aside>

            {/* Main column */}
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="card space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-gray-900">Job point balance</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Your next job post uses one available job point.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-red-50 text-red-700 px-4 py-3 text-right min-w-[110px]">
                      <p className="text-xs font-semibold uppercase tracking-wide">Left</p>
                      <p className="text-3xl font-black leading-none mt-1">{totalJobPointsLeft}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/org/billing"
                      className="btn-primary inline-flex items-center gap-2 text-sm"
                    >
                      <Wallet size={15} />
                      Purchase Job Point
                    </Link>
                    <Link
                      href="/org/jobs/new"
                      className="btn-secondary inline-flex items-center gap-2 text-sm"
                    >
                      <Plus size={15} />
                      Post a Job
                    </Link>
                  </div>
                </div>

                <div className="card space-y-3">
                  <div>
                    <h3 className="font-bold text-gray-900">Job management</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Open your hiring workspace to monitor listings and control active roles.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <MiniMetric
                      label="Active roles"
                      value={activeJobs.length}
                      tone="green"
                    />
                    <MiniMetric
                      label="Recent listings"
                      value={jobs.length}
                      tone="blue"
                    />
                  </div>
                  <Link
                    href="/org/jobs"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline"
                  >
                    Manage jobs
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              <div className="card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">Recent job activity</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Keep track of open roles, candidate visibility, and listing status.
                    </p>
                  </div>
                  <Link
                    href="/org/jobs"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline"
                  >
                    Manage all jobs
                    <ArrowRight size={14} />
                  </Link>
                </div>

                {jobs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center py-14">
                    <Briefcase size={40} className="mx-auto text-gray-200 mb-3" />
                    <p className="font-semibold text-gray-700 mb-2">No jobs posted yet</p>
                    <p className="text-sm text-gray-400 mb-5">
                      Start with your first listing. Your available job points are ready to use.
                    </p>
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <Link
                        href="/org/jobs/new"
                        className="btn-primary inline-flex items-center gap-2 text-sm"
                      >
                        <Plus size={15} />
                        Post a Job
                      </Link>
                      <Link
                        href="/org/billing"
                        className="btn-secondary inline-flex items-center gap-2 text-sm"
                      >
                        <Wallet size={15} />
                        Purchase Job Point
                      </Link>
                    </div>
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

              <div className="card bg-red-50 border-red-100 space-y-2">
                <h3 className="font-bold text-red-900 text-sm">How hiring works on Spotter</h3>
                <ul className="space-y-1.5 text-sm text-red-700">
                  {[
                    "Use available job points to publish roles quickly.",
                    "Monitor job status from your management workspace.",
                    "Review candidate activity and approved match counts per role.",
                    "Use billing for purchases, transactions, and payment records.",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="bg-red-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        {i + 1}
                      </span>
                      <span>{step}</span>
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

// ── Small cards ────────────────────────────────────────────────────────────
function ProfileInfoCard({
  icon: Icon,
  title,
  value,
  sub,
  accent,
  href,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  sub: string;
  accent: "red" | "blue" | "green" | "yellow";
  href?: string;
}) {
  const styles: Record<string, string> = {
    red: "bg-red-50 border-red-100 text-red-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    green: "bg-green-50 border-green-100 text-green-700",
    yellow: "bg-amber-50 border-amber-100 text-amber-700",
  };

  const content = (
    <div className="h-full rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <div className={cn("rounded-xl border p-2.5", styles[accent])}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-700">{title}</p>
          <p className="mt-1 text-base font-black text-gray-900">{value}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{sub}</p>
        </div>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block transition-transform hover:-translate-y-0.5">
      {content}
    </Link>
  );
}

function ActionLinkCard({
  href,
  icon: Icon,
  title,
  description,
  tone,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  tone: "red" | "blue" | "gray";
}) {
  const toneStyles: Record<string, string> = {
    red: "bg-red-50 text-red-700 border-red-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 transition-all hover:border-red-200 hover:shadow-sm"
    >
      <div className={cn("shrink-0 rounded-xl border p-2.5", toneStyles[tone])}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
      </div>
      <ArrowRight size={15} className="mt-1 shrink-0 text-gray-300" />
    </Link>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "blue";
}) {
  const styles =
    tone === "green"
      ? "bg-green-50 border-green-100 text-green-700"
      : "bg-blue-50 border-blue-100 text-blue-700";

  return (
    <div className={cn("rounded-xl border px-4 py-3", styles)}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

// ── OrgJobRow ──────────────────────────────────────────────────────────────
function OrgJobRow({
  job,
  matchCount,
  onClose,
}: {
  job: Job;
  matchCount: number;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const daysAgo = job.daysAgo ?? 0;

  return (
    <div
      className={cn(
        "card flex flex-col gap-4 py-4 sm:flex-row sm:items-center",
        job.status !== "active" && "opacity-60"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-gray-900">{job.title}</h3>
          <StatusBadge status={job.status} />
          {job.poster_type === "agent" && (
            <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              Posted by Agent
            </span>
          )}
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-bold",
              matchCount > 0
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-gray-200 bg-gray-50 text-gray-400"
            )}
            title="Approved matches revealed to you"
          >
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </span>
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          {(job.city || job.state) && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {[job.city, job.state].filter(Boolean).join(", ")}
            </span>
          )}
          {job.work_mode && <span className="capitalize">{job.work_mode}</span>}
          {job.employment_type && <span className="capitalize">{job.employment_type}</span>}
          <span className="flex items-center gap-1 text-gray-400">
            <Clock size={12} />
            {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link
          href={`/org/candidates?job=${job.id}`}
          className="flex items-center gap-1 text-sm font-semibold text-red-700 hover:underline"
        >
          <Users size={14} />
          Candidates
        </Link>

        <Link
          href="/org/jobs"
          className="text-sm font-semibold text-gray-500 hover:text-gray-700"
        >
          Manage
        </Link>

        {job.status === "active" &&
          (confirming ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onClose}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="px-2 py-1.5 text-xs text-gray-400 transition-colors hover:text-red-500"
            >
              Close job
            </button>
          ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-500",
    expired: "bg-yellow-100 text-yellow-700",
    draft: "bg-blue-100 text-blue-600",
  };

  return (
    <span
      className={cn(
        "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
        map[status] ?? "bg-gray-100 text-gray-500"
      )}
    >
      {status}
    </span>
  );
}
