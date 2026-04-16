// C:\Users\Melody\Documents\Spotter\frontend\src\app\seeker\matches\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Target, Filter, Download, Loader2,
  ArrowLeft, Trophy, Clock, CheckCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { seekerApi, jobsApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { ScoreBadge, ScoreBar } from "@/components/matching/MatchCard";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface Match {
  id: string;
  job_id: string;
  score: number;
  breakdown: Record<string, number>;
  status: string;
  certificate_issued: boolean;
  matched_at: string;
}

interface JobMeta {
  id: string;
  title: string;
  city?: string;
  state?: string;
  work_mode?: string;
}

type FilterStatus = "all" | "revealed" | "pending";

// ── Page ───────────────────────────────────────────────────────────────────
export default function SeekerMatchesPage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [matches,   setMatches]   = useState<Match[]>([]);
  const [jobsMeta,  setJobsMeta]  = useState<Record<string, JobMeta>>({});
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<FilterStatus>("all");
  const [expanded,  setExpanded]  = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "seeker") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "seeker") return;
    seekerApi.getMatches()
      .then(async (res) => {
        const data: Match[] = res.data;
        setMatches(data);

        // Fetch job titles for each unique job_id
        const uniqueJobIds = [...new Set(data.map((m) => m.job_id))];
        const jobResults = await Promise.allSettled(
          uniqueJobIds.map((id) => jobsApi.get(id))
        );
        const meta: Record<string, JobMeta> = {};
        jobResults.forEach((r, i) => {
          if (r.status === "fulfilled") {
            meta[uniqueJobIds[i]] = r.value.data;
          }
        });
        setJobsMeta(meta);
      })
      .catch(() => toast.error("Failed to load matches"))
      .finally(() => setLoading(false));
  }, [isLoggedIn, user]);

  const filtered = matches.filter((m) => {
    if (filter === "revealed") return m.status === "revealed";
    if (filter === "pending")  return m.status !== "revealed";
    return true;
  });

  const topScore = matches.length > 0
    ? Math.max(...matches.map((m) => m.score))
    : null;

  // ── Render ────────────────────────────────────────────────────────────────
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
              <h1 className="text-2xl font-black text-gray-900">My Matches</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {matches.length} total · sorted by score
              </p>
            </div>
          </div>

          {/* Summary row */}
          {matches.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center py-4">
                <p className="text-3xl font-black text-red-700">{matches.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total matches</p>
              </div>
              <div className="card text-center py-4">
                <p className="text-3xl font-black text-green-700">
                  {topScore !== null ? `${topScore.toFixed(0)}%` : "—"}
                </p>
                <p className="text-xs text-gray-500 mt-1">Top score</p>
              </div>
              <div className="card text-center py-4">
                <p className="text-3xl font-black text-blue-700">
                  {matches.filter((m) => m.certificate_issued).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Certificates</p>
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-gray-400" />
            {(["all", "revealed", "pending"] as FilterStatus[]).map((f) => (
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
                {f}
                {f === "pending" && matches.filter((m) => m.status !== "revealed").length > 0 && (
                  <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-xs rounded-full px-1.5 py-0.5 font-bold">
                    {matches.filter((m) => m.status !== "revealed").length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-red-600" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyMatches hasAny={matches.length > 0} />
          ) : (
            <div className="space-y-3">
              {filtered
                .sort((a, b) => b.score - a.score)
                .map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    job={jobsMeta[match.job_id]}
                    expanded={expanded === match.id}
                    onToggle={() =>
                      setExpanded(expanded === match.id ? null : match.id)
                    }
                  />
                ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ── MatchCard ──────────────────────────────────────────────────────────────
function MatchCard({
  match, job, expanded, onToggle,
}: {
  match: Match;
  job?: JobMeta;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isRevealed = match.status === "revealed";

  return (
    <div
      className={cn(
        "card transition-all",
        isRevealed ? "border-gray-100" : "border-yellow-100 bg-yellow-50/30"
      )}
    >
      {/* Top row — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 text-left"
      >
        {/* Score */}
        <ScoreBadge score={match.score} size="md" />

        {/* Job info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {job?.title ?? "Loading…"}
          </p>
          {(job?.city || job?.state) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {[job.city, job.state].filter(Boolean).join(", ")}
              {job.work_mode && ` · ${job.work_mode}`}
            </p>
          )}
        </div>

        {/* Status + cert */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusPill status={match.status} />
          <span className="text-xs text-gray-400">
            {new Date(match.matched_at).toLocaleDateString("en-NG", {
              day: "numeric", month: "short",
            })}
          </span>
        </div>

        {/* Expand chevron */}
        <span
          className={cn(
            "text-gray-300 text-lg leading-none transition-transform",
            expanded ? "rotate-180" : ""
          )}
        >
          ›
        </span>
      </button>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">

          {/* Score breakdown bars */}
          {Object.keys(match.breakdown).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Score breakdown
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {Object.entries(match.breakdown).map(([k, v]) => (
                  <ScoreBar key={k} label={k} value={v} />
                ))}
              </div>
            </div>
          )}

          {/* Trophy for high scorers */}
          {match.score >= 90 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
              <Trophy size={16} className="text-amber-500 shrink-0" />
              <span className="font-medium">Premium match — score ≥ 90%</span>
            </div>
          )}

          {/* Actions row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {job && (
              <Link
                href={`/jobs/${job.id}`}
                className="text-sm font-semibold text-red-700 hover:underline"
              >
                View job →
              </Link>
            )}

            {match.certificate_issued && (
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}/uploads/certificate_${match.id}.pdf`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline"
              >
                <Download size={14} />
                Download Certificate
              </a>
            )}

            {!isRevealed && (
              <p className="text-xs text-yellow-600 flex items-center gap-1.5">
                <Clock size={13} />
                Awaiting Spotter review
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── StatusPill ─────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    revealed:          { cls: "bg-green-100 text-green-700",  label: "Revealed" },
    pending_spotter:   { cls: "bg-yellow-100 text-yellow-700", label: "In review" },
    spotter_approved:  { cls: "bg-blue-100 text-blue-700",    label: "Approved" },
    spotter_rejected:  { cls: "bg-red-100 text-red-500",      label: "Rejected" },
  };
  const { cls, label } = map[status] ?? { cls: "bg-gray-100 text-gray-500", label: status };
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", cls)}>
      {label}
    </span>
  );
}

// ── EmptyMatches ───────────────────────────────────────────────────────────
function EmptyMatches({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="text-center py-20">
      <Target size={48} className="mx-auto text-gray-200 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {hasAny ? "No matches in this filter" : "No matches yet"}
      </h3>
      <p className="text-sm text-gray-400 mb-6">
        {hasAny
          ? "Try switching to 'All' to see everything."
          : "Browse jobs and click 'Get Match Score' on any listing."}
      </p>
      {!hasAny && (
        <Link href="/jobs" className="btn-primary text-sm inline-block">
          Browse Jobs
        </Link>
      )}
    </div>
  );
}
