// C:\Users\Melody\Documents\Spotter\frontend\src\app\admin\matches\page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Target, CheckCircle, XCircle, Clock, ArrowLeft,
  Loader2, RefreshCw, ChevronLeft, ChevronRight,
  User, Briefcase, MapPin, GraduationCap, FileText,
  ExternalLink, Filter, AlertCircle, TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";

// ── Types ──────────────────────────────────────────────────────────────────
interface MatchSeeker {
  id: string;
  name: string;
  city?: string;
  state?: string;
  education?: string;
  skills: string[];
  available: boolean;
  cv_url?: string;
  desired_job?: string;
  nysc_status?: string;
  school_attended?: string;
  course_studied?: string;
}

interface MatchJob {
  id: string;
  title: string;
  city?: string;
  state?: string;
  work_mode?: string;
  status: string;
}

interface AdminMatch {
  id: string;
  score: number;
  breakdown: Record<string, number>;
  status: string;
  triggered_by?: string;
  certificate_issued: boolean;
  matched_at: string;
  approved_at?: string;
  spotter_notes?: string;
  seeker: MatchSeeker;
  job: MatchJob;
}

interface MatchesResponse {
  total: number;
  page: number;
  limit: number;
  matches: AdminMatch[];
}

// ── Constants ──────────────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { label: "All",             value: "",                  color: "gray"   },
  { label: "Pending Review",  value: "pending_spotter",   color: "yellow" },
  { label: "Approved",        value: "revealed",          color: "green"  },
  { label: "Rejected",        value: "spotter_rejected",  color: "red"    },
];

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  pending_spotter:  { label: "Pending Review", cls: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock        },
  spotter_approved: { label: "Spotter OK",     cls: "bg-blue-100 text-blue-700 border-blue-200",       icon: CheckCircle  },
  revealed:         { label: "Approved",       cls: "bg-green-100 text-green-700 border-green-200",    icon: CheckCircle  },
  spotter_rejected: { label: "Rejected",       cls: "bg-red-100 text-red-600 border-red-200",          icon: XCircle      },
};

const SCORE_COLOR = (score: number) =>
  score >= 80 ? "text-green-700 bg-green-50 border-green-200"
  : score >= 60 ? "text-yellow-700 bg-yellow-50 border-yellow-200"
  : "text-red-700 bg-red-50 border-red-200";

const BREAKDOWN_LABELS: Record<string, string> = {
  skills: "Skills", tech_stack: "Tech Stack", experience: "Experience",
  location: "Location", education: "Education", work_mode: "Work Mode",
  availability: "Availability", demographics: "Demographics",
};

// ── Page ───────────────────────────────────────────────────────────────────
export default function AdminMatchesPage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [data,        setData]        = useState<MatchesResponse | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [statusFilter,setStatusFilter]= useState("");
  const [page,        setPage]        = useState(1);
  const [actingOn,    setActingOn]    = useState<string | null>(null);  // match id being decided
  const [noteMap,     setNoteMap]     = useState<Record<string, string>>({});
  const [expanded,    setExpanded]    = useState<string | null>(null);

  const LIMIT = 15;

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (!["admin", "super_admin"].includes(user?.role ?? "")) { router.push("/"); }
  }, [isLoggedIn, user, router]);

  const loadMatches = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await adminApi.listMatches({ status: statusFilter || undefined, page, limit: LIMIT });
      setData(res.data);
    } catch {
      toast.error("Failed to load matches");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { if (isLoggedIn()) loadMatches(); }, [loadMatches, isLoggedIn]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [statusFilter]);

  async function handleApprove(matchId: string) {
    setActingOn(matchId);
    try {
      await adminApi.approveMatch(matchId, noteMap[matchId]);
      toast.success("Match approved — now visible to organisation.");
      await loadMatches(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Approval failed.");
    } finally {
      setActingOn(null);
    }
  }

  async function handleReject(matchId: string) {
    setActingOn(matchId);
    try {
      await adminApi.rejectMatch(matchId, noteMap[matchId]);
      toast.success("Match rejected.");
      await loadMatches(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Rejection failed.");
    } finally {
      setActingOn(null);
    }
  }

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;
  const pendingCount = data?.matches.filter(m => m.status === "pending_spotter").length ?? 0;

  // ── Loading ──────────────────────────────────────────────────────────────
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

          {/* ── Header ────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard"
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                <ArrowLeft size={18} className="text-gray-600" />
              </Link>
              <div className="bg-red-700 text-white p-2.5 rounded-xl">
                <Target size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Match Review</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Approve or reject seeker ↔ job matches · {data?.total ?? 0} total
                </p>
              </div>
            </div>
            <button onClick={() => loadMatches(true)} disabled={refreshing}
              className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:border-red-300 transition-colors self-start sm:self-auto">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* ── Pending alert ─────────────────────────────── */}
          {pendingCount > 0 && statusFilter === "" && (
            <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3.5">
              <AlertCircle size={18} className="text-yellow-600 shrink-0" />
              <p className="text-sm font-semibold text-yellow-800">
                {pendingCount} match{pendingCount !== 1 ? "es" : ""} on this page are awaiting your review
              </p>
            </div>
          )}

          {/* ── Summary cards ─────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total",    value: data?.total ?? 0,   icon: Target,      color: "text-gray-700",   bg: "bg-gray-50"   },
              { label: "Pending",  value: data?.matches.filter(m => m.status === "pending_spotter").length ?? 0,   icon: Clock,       color: "text-yellow-700", bg: "bg-yellow-50" },
              { label: "Approved", value: data?.matches.filter(m => m.status === "revealed").length ?? 0,          icon: CheckCircle, color: "text-green-700",  bg: "bg-green-50"  },
              { label: "Rejected", value: data?.matches.filter(m => m.status === "spotter_rejected").length ?? 0,  icon: XCircle,     color: "text-red-700",    bg: "bg-red-50"    },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`rounded-xl border border-gray-200 ${bg} px-4 py-3 flex items-center gap-3`}>
                <Icon size={18} className={color} />
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-xl font-black ${color}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Status filter tabs ────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-gray-400 shrink-0" />
            {STATUS_FILTERS.map((f) => (
              <button key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  statusFilter === f.value
                    ? "bg-red-700 text-white border-red-700"
                    : "bg-white text-gray-600 border-gray-200 hover:border-red-300"
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Match list ────────────────────────────────── */}
          {data?.matches.length === 0 ? (
            <div className="card text-center py-16">
              <Target size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="font-semibold text-gray-600 mb-1">No matches found</p>
              <p className="text-sm text-gray-400">
                {statusFilter ? `No matches with status "${statusFilter}"` : "No matches in the system yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.matches.map((match) => {
                const meta    = STATUS_META[match.status] ?? STATUS_META.pending_spotter;
                const StatusIcon = meta.icon;
                const isExpanded = expanded === match.id;
                const isPending  = match.status === "pending_spotter";
                const isActing   = actingOn === match.id;

                return (
                  <div key={match.id}
                    className={`rounded-xl border bg-white transition-shadow ${
                      isPending ? "border-yellow-200 shadow-sm" : "border-gray-200"
                    }`}>

                    {/* ── Main row ── */}
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                        {/* Score badge */}
                        <div className={`shrink-0 rounded-xl border px-4 py-3 text-center min-w-[80px] ${SCORE_COLOR(match.score)}`}>
                          <p className="text-2xl font-black leading-none">{match.score.toFixed(0)}%</p>
                          <p className="text-xs font-semibold mt-0.5">Match</p>
                        </div>

                        {/* Core info */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.cls}`}>
                              <StatusIcon size={11} />
                              {meta.label}
                            </span>
                            {match.triggered_by && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                                Triggered by {match.triggered_by}
                              </span>
                            )}
                            {match.certificate_issued && (
                              <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                                Certificate issued
                              </span>
                            )}
                          </div>

                          {/* Seeker ↔ Job */}
                          <div className="grid sm:grid-cols-2 gap-3">
                            {/* Seeker */}
                            <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                              <div className="flex items-center gap-1.5 mb-1">
                                <User size={12} className="text-red-600 shrink-0" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Seeker</span>
                              </div>
                              <p className="font-bold text-gray-900 text-sm">{match.seeker.name}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                {(match.seeker.city || match.seeker.state) && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <MapPin size={10} /> {[match.seeker.city, match.seeker.state].filter(Boolean).join(", ")}
                                  </span>
                                )}
                                {match.seeker.education && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <GraduationCap size={10} /> {match.seeker.education}
                                  </span>
                                )}
                                <span className={`text-xs font-medium ${match.seeker.available ? "text-green-600" : "text-gray-400"}`}>
                                  {match.seeker.available ? "Available" : "Unavailable"}
                                </span>
                              </div>
                              {match.seeker.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {match.seeker.skills.slice(0, 3).map(s => (
                                    <span key={s} className="text-xs bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded">
                                      {s}
                                    </span>
                                  ))}
                                  {match.seeker.skills.length > 3 && (
                                    <span className="text-xs text-gray-400">+{match.seeker.skills.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Job */}
                            <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Briefcase size={12} className="text-blue-600 shrink-0" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Job</span>
                              </div>
                              <p className="font-bold text-gray-900 text-sm">{match.job.title}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                {(match.job.city || match.job.state) && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <MapPin size={10} /> {[match.job.city, match.job.state].filter(Boolean).join(", ")}
                                  </span>
                                )}
                                {match.job.work_mode && (
                                  <span className="text-xs text-gray-500 capitalize">{match.job.work_mode}</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(match.matched_at).toLocaleDateString("en-NG", {
                                  day: "numeric", month: "short", year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action column */}
                        <div className="flex flex-col gap-2 shrink-0 sm:min-w-[140px]">
                          {isPending ? (
                            <>
                              {/* Notes textarea */}
                              <textarea
                                rows={2}
                                placeholder="Notes (optional)"
                                value={noteMap[match.id] ?? ""}
                                onChange={(e) => setNoteMap(prev => ({ ...prev, [match.id]: e.target.value }))}
                                className="input text-xs resize-none w-full"
                              />
                              <button
                                onClick={() => handleApprove(match.id)}
                                disabled={isActing}
                                className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                                {isActing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(match.id)}
                                disabled={isActing}
                                className="flex items-center justify-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                                {isActing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                Reject
                              </button>
                            </>
                          ) : (
                            <div className="text-center">
                              {match.spotter_notes && (
                                <p className="text-xs text-gray-400 italic mb-2 line-clamp-2">
                                  "{match.spotter_notes}"
                                </p>
                              )}
                              {match.approved_at && (
                                <p className="text-xs text-gray-400">
                                  {new Date(match.approved_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Expand / CV */}
                          <div className="flex gap-2 justify-center mt-1">
                            <button
                              onClick={() => setExpanded(isExpanded ? null : match.id)}
                              className="text-xs text-gray-400 hover:text-red-600 transition-colors underline underline-offset-2">
                              {isExpanded ? "Less" : "Details"}
                            </button>
                            {match.seeker.cv_url && (
                              <a href={`http://localhost:8000${match.seeker.cv_url}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-red-700 hover:underline">
                                <FileText size={12} /> CV
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── Expanded breakdown ── */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">

                          {/* Score breakdown bar chart */}
                          {Object.keys(match.breakdown).length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                                <TrendingUp size={12} /> Score Breakdown
                              </p>
                              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
                                {Object.entries(match.breakdown).map(([key, val]) => (
                                  <div key={key}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs text-gray-600">
                                        {BREAKDOWN_LABELS[key] ?? key}
                                      </span>
                                      <span className={`text-xs font-bold ${
                                        val >= 80 ? "text-green-700"
                                        : val >= 50 ? "text-yellow-700"
                                        : "text-red-600"
                                      }`}>{val.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          val >= 80 ? "bg-green-500"
                                          : val >= 50 ? "bg-yellow-500"
                                          : "bg-red-500"
                                        }`}
                                        style={{ width: `${val}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Extended seeker info */}
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                              Seeker Details
                            </p>
                            <div className="grid sm:grid-cols-3 gap-3 text-sm">
                              {[
                                { label: "Desired Job",     value: match.seeker.desired_job },
                                { label: "NYSC Status",     value: match.seeker.nysc_status },
                                { label: "School",          value: match.seeker.school_attended },
                                { label: "Course",          value: match.seeker.course_studied },
                              ].filter(f => f.value).map(({ label, value }) => (
                                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                                  <p className="text-xs text-gray-400">{label}</p>
                                  <p className="font-semibold text-gray-800 text-sm mt-0.5">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Match ID for audit */}
                          <p className="text-xs text-gray-300 font-mono">
                            Match ID: {match.id}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Pagination ────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} · {data?.total} matches
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:border-red-300 disabled:opacity-40 transition-colors">
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:border-red-300 disabled:opacity-40 transition-colors">
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}