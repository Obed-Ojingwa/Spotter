// C:\Users\Melody\Documents\Spotter\frontend\src\app\seeker\dashboard\page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase, Target, FileText, User,
  CheckCircle, AlertCircle, ArrowRight, Loader2
} from "lucide-react";
import { seekerApi, jobsApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { StatCard } from "@/components/ui/StatCard";
import { ScoreBadge } from "@/components/matching/MatchCard";
import Navbar from "@/components/layout/Navbar";

// ── Types ──────────────────────────────────────────────────────────────────
interface Profile {
  name: string;
  city?: string;
  state?: string;
  profile_complete: boolean;
  free_matches_used: number;
  skills?: string[];
  available: boolean;
}

interface Match {
  id: string;
  job_id: string;
  score: number;
  status: string;
  certificate_issued: boolean;
  matched_at: string;
}

interface Job {
  id: string;
  title: string;
  city?: string;
  state?: string;
  work_mode?: string;
}

// ── Profile completeness ───────────────────────────────────────────────────
const PROFILE_FIELDS = [
  { key: "name",         label: "Full name" },
  { key: "city",         label: "City" },
  { key: "state",        label: "State" },
  { key: "gender",       label: "Gender" },
  { key: "age",          label: "Age" },
  { key: "education",    label: "Education" },
  { key: "skills",       label: "Skills" },
  { key: "work_mode",    label: "Work preference" },
];

function profileScore(profile: Record<string, unknown>): number {
  const filled = PROFILE_FIELDS.filter(
    ({ key }) => {
      const v = profile[key];
      return v !== null && v !== undefined && v !== "" &&
             !(Array.isArray(v) && v.length === 0);
    }
  ).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function SeekerDashboard() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [matches,      setMatches]      = useState<Match[]>([]);
  const [recentJobs,   setRecentJobs]   = useState<Job[]>([]);
  const [loading,      setLoading]      = useState(true);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "seeker") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  // Fetch data
  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "seeker") return;

    Promise.all([
      seekerApi.getProfile(),
      seekerApi.getMatches(),
      jobsApi.list({ limit: 4 }),
    ])
      .then(([profileRes, matchesRes, jobsRes]) => {
        setProfile(profileRes.data);
        setMatches(matchesRes.data);
        setRecentJobs(jobsRes.data.jobs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn, user]);

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

  const completeness = profile ? profileScore(profile as unknown as Record<string, unknown>) : 0;
  const topMatches   = matches.slice(0, 3);
  const freeMatchLeft = (profile?.free_matches_used ?? 1) < 1;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

          {/* ── Welcome header ──────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900">
                Welcome back, {profile?.name?.split(" ")[0] ?? "there"} 👋
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {profile?.city && profile?.state
                  ? `${profile.city}, ${profile.state}`
                  : "Complete your profile to get better matches"}
              </p>
            </div>
            <div className="flex gap-2">
              {!profile?.available && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full font-medium">
                  <AlertCircle size={13} /> Marked unavailable
                </span>
              )}
              <Link href="/seeker/profile" className="btn-primary text-sm">
                Edit Profile
              </Link>
            </div>
          </div>

          {/* ── Profile completeness bar ─────────────────────── */}
          {completeness < 100 && (
            <div className="card border-l-4 border-l-red-500 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-800">
                    Profile {completeness}% complete
                  </p>
                  <span className="text-xs text-gray-400">
                    Complete your profile to unlock better matches
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full transition-all duration-500"
                    style={{ width: `${completeness}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {PROFILE_FIELDS.filter(({ key }) => {
                    const v = (profile as unknown as Record<string, unknown>)?.[key];
                    return !v || (Array.isArray(v) && v.length === 0);
                  }).map(({ label }) => (
                    <span key={label} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">
                      Missing: {label}
                    </span>
                  ))}
                </div>
              </div>
              <Link href="/seeker/profile" className="btn-secondary text-sm shrink-0">
                Complete Profile <ArrowRight size={14} className="inline ml-1" />
              </Link>
            </div>
          )}

          {/* ── Stats row ───────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Matches"
              value={matches.length}
              icon={Target}
              color="red"
            />
            <StatCard
              label="Top Match Score"
              value={matches.length > 0 ? `${Math.max(...matches.map((m) => m.score)).toFixed(0)}%` : "—"}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              label="Free Match"
              value={freeMatchLeft ? "Available" : "Used"}
              icon={Briefcase}
              color={freeMatchLeft ? "green" : "yellow"}
              sub={freeMatchLeft ? "Your first match is free" : "₦500 per match"}
            />
            <StatCard
              label="Certificates"
              value={matches.filter((m) => m.certificate_issued).length}
              icon={FileText}
              color="blue"
            />
          </div>

          {/* ── Main content: two columns ────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Recent matches (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">Recent Matches</h2>
                <Link href="/seeker/matches" className="text-sm text-red-700 font-semibold hover:underline">
                  View all →
                </Link>
              </div>

              {topMatches.length === 0 ? (
                <div className="card text-center py-12">
                  <Target size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="font-medium text-gray-600 mb-1">No matches yet</p>
                  <p className="text-sm text-gray-400 mb-5">
                    Browse jobs and trigger a match to see your score
                  </p>
                  <Link href="/jobs" className="btn-primary text-sm inline-block">
                    Browse Jobs
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {topMatches.map((match) => (
                    <MatchRow key={match.id} match={match} />
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar (1/3 width) */}
            <div className="space-y-4">

              {/* Quick links */}
              <div className="card space-y-2">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-3">
                  Quick Actions
                </h3>
                {[
                  { href: "/jobs",                 icon: Briefcase, label: "Browse open jobs" },
                  { href: "/seeker/profile",        icon: User,      label: "Update my profile" },
                  { href: "/seeker/matches",        icon: Target,    label: "View all matches" },
                  { href: "/seeker/applications",   icon: FileText,  label: "My applications" },
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

              {/* Recent jobs */}
              <div className="card space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">
                    New Jobs
                  </h3>
                  <Link href="/jobs" className="text-xs text-red-700 hover:underline font-medium">
                    See all
                  </Link>
                </div>
                {recentJobs.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No jobs yet</p>
                ) : (
                  recentJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="block p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <p className="text-sm font-medium text-gray-800 group-hover:text-red-700 line-clamp-1">
                        {job.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[job.city, job.state].filter(Boolean).join(", ") || "Location TBD"}
                        {job.work_mode && ` · ${job.work_mode}`}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── MatchRow ───────────────────────────────────────────────────────────────
function MatchRow({ match }: { match: Match }) {
  return (
    <div className="card flex items-center gap-4 py-4">
      <ScoreBadge score={match.score} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          Job match — {new Date(match.matched_at).toLocaleDateString("en-NG", {
            day: "numeric", month: "short", year: "numeric"
          })}
        </p>
        <p className={`text-xs mt-0.5 capitalize font-medium ${
          match.status === "revealed"
            ? "text-green-600"
            : "text-yellow-600"
        }`}>
          {match.status.replace(/_/g, " ")}
        </p>
      </div>
      {match.certificate_issued && (
        <a
          href={`/api/uploads/certificate_${match.id}.pdf`}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-red-700 hover:underline shrink-0"
        >
          Certificate
        </a>
      )}
      <Link
        href="/seeker/matches"
        className="text-xs text-gray-400 hover:text-red-600 shrink-0"
      >
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
