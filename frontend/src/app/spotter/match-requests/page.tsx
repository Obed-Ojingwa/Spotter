// C:\Users\Melody\Documents\Spotter\frontend\src\app\spotter\match-requests\page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle, XCircle, Clock, ArrowLeft,
  Loader2, RefreshCw, User, Briefcase, MapPin, 
  GraduationCap, FileText, ExternalLink, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";

// ── Types ──────────────────────────────────────────────────────────────────
interface OrgProfile {
  id: string;
  name: string;
  email?: string;
}

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
}

interface MatchJob {
  id: string;
  title: string;
  city?: string;
  state?: string;
  work_mode?: string;
  status: string;
}

interface OrgMatch {
  id: string;
  score: number;
  breakdown: Record<string, number>;
  status: string;
  triggered_by: string;
  matched_at: string;
  approved_at?: string;
  spotter_notes?: string;
  seeker: MatchSeeker;
  job: MatchJob;
  organization: OrgProfile;
}

interface MatchRequestsResponse {
  total: number;
  matches: OrgMatch[];
}

// ── Components ─────────────────────────────────────────────────────────────
function MatchScoreBadge({ score }: { score: number }) {
  const color = 
    score >= 80 ? "text-green-700 bg-green-50 border-green-200"
    : score >= 60 ? "text-yellow-700 bg-yellow-50 border-yellow-200"
    : "text-red-700 bg-red-50 border-red-200";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-sm font-semibold ${color}`}>
      <TrendingUp size={14} />
      {score.toFixed(1)}%
    </span>
  );
}

function BreakdownDetail({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-gray-600">{label}:</span>
      <span className="font-semibold text-gray-900">{value.toFixed(1)}</span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function SpotterMatchRequestsPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [data, setData] = useState<MatchRequestsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // Role check
  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }

    if (user?.role !== "spotter") {
      router.push("/");
      return;
    }
  }, [isLoggedIn, user, router]);

  // Fetch pending requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/matching/admin/pending-requests");
      setData(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to load match requests";
      toast.error(typeof msg === "string" ? msg : msg?.message || msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Approve match
  async function handleApprove(matchId: string) {
    try {
      setApprovingId(matchId);
      const payload: any = { action: "approve" };
      if (reviewNotes[matchId]) {
        payload.spotter_notes = reviewNotes[matchId];
      }

      await api.post(`/matching/reviews/${matchId}`, payload);
      toast.success("Match approved");
      await fetchRequests();
      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to approve match";
      toast.error(typeof msg === "string" ? msg : msg?.message || msg);
    } finally {
      setApprovingId(null);
    }
  }

  // Reject match
  async function handleReject(matchId: string) {
    try {
      setRejectingId(matchId);
      const payload: any = { action: "reject" };
      if (reviewNotes[matchId]) {
        payload.spotter_notes = reviewNotes[matchId];
      }

      await api.post(`/matching/reviews/${matchId}`, payload);
      toast.success("Match rejected");
      await fetchRequests();
      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to reject match";
      toast.error(typeof msg === "string" ? msg : msg?.message || msg);
    } finally {
      setRejectingId(null);
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

  const totalRequests = data?.total ?? 0;
  const matches = data?.matches ?? [];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-6xl px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link
                href="/spotter/queue"
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Organization Match Requests
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Review and approve matches requested by organizations
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                setRefreshing(true);
                await fetchRequests();
                setRefreshing(false);
              }}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card bg-blue-50 border-blue-100">
              <div className="flex items-center gap-3">
                <Clock className="text-blue-600" size={24} />
                <div>
                  <p className="text-sm text-blue-600">Pending Review</p>
                  <p className="text-2xl font-bold text-blue-900">{totalRequests}</p>
                </div>
              </div>
            </div>
            <div className="card bg-green-50 border-green-100">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-600" size={24} />
                <div>
                  <p className="text-sm text-green-600">Ready to Display</p>
                  <p className="text-2xl font-bold text-green-900">
                    {matches.filter((m) => m.status === "revealed").length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card bg-red-50 border-red-100">
              <div className="flex items-center gap-3">
                <XCircle className="text-red-600" size={24} />
                <div>
                  <p className="text-sm text-red-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-900">
                    {matches.filter((m) => m.status === "spotter_rejected").length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Match Requests List */}
          <div className="space-y-3">
            {matches.length === 0 ? (
              <div className="card text-center py-12">
                <AlertCircle size={32} className="text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No pending match requests</p>
                <p className="text-sm text-gray-500 mt-1">
                  Organizations will see requests appear here after posting jobs
                </p>
              </div>
            ) : (
              matches.map((match) => (
                <div
                  key={match.id}
                  className="card hover:shadow-md transition-shadow"
                >
                  {/* Main Row */}
                  <div
                    className="cursor-pointer p-4"
                    onClick={() =>
                      setExpandedId(expandedId === match.id ? null : match.id)
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Org & Job Title */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-block px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                            {match.organization.name}
                          </span>
                        </div>

                        <h3 className="font-semibold text-gray-900 text-lg">
                          {match.seeker.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Applied for: <span className="font-medium">{match.job.title}</span>
                        </p>

                        {/* Quick Info */}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                          {match.job.city && (
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {match.job.city}, {match.job.state}
                            </span>
                          )}
                          {match.job.work_mode && (
                            <span className="capitalize">{match.job.work_mode}</span>
                          )}
                          {match.seeker.education && (
                            <span className="flex items-center gap-1">
                              <GraduationCap size={14} />
                              {match.seeker.education}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Score & Status */}
                      <div className="flex flex-col items-end gap-2">
                        <MatchScoreBadge score={match.score} />
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                          <Clock size={12} />
                          Pending Review
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === match.id && (
                    <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50">
                      {/* Score Breakdown */}
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-2">
                          Match Breakdown
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(match.breakdown).map(([key, value]) => (
                            <BreakdownDetail
                              key={key}
                              label={
                                {
                                  skills: "Skills",
                                  tech_stack: "Tech Stack",
                                  experience: "Experience",
                                  location: "Location",
                                  education: "Education",
                                  work_mode: "Work Mode",
                                  availability: "Availability",
                                  demographics: "Demographics",
                                }[key] || key
                              }
                              value={value}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Seeker Info */}
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-2">
                          Seeker Profile
                        </h4>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="text-gray-600">Skills:</span>{" "}
                            <span className="font-medium">
                              {match.seeker.skills?.join(", ") || "N/A"}
                            </span>
                          </p>
                          {match.seeker.desired_job && (
                            <p>
                              <span className="text-gray-600">Desired Role:</span>{" "}
                              <span className="font-medium">{match.seeker.desired_job}</span>
                            </p>
                          )}
                          {match.seeker.cv_url && (
                            <p>
                              <a
                                href={match.seeker.cv_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <FileText size={12} />
                                View CV
                                <ExternalLink size={12} />
                              </a>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Review Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Review Notes (Optional)
                        </label>
                        <textarea
                          value={reviewNotes[match.id] ?? ""}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({
                              ...prev,
                              [match.id]: e.target.value,
                            }))
                          }
                          placeholder="Add notes before approving or rejecting..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          rows={3}
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 justify-end pt-2 border-t border-gray-200">
                        <button
                          onClick={() => handleReject(match.id)}
                          disabled={rejectingId === match.id}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 font-medium text-sm"
                        >
                          {rejectingId === match.id ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Rejecting...
                            </>
                          ) : (
                            <>
                              <XCircle size={14} />
                              Reject
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleApprove(match.id)}
                          disabled={approvingId === match.id}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
                        >
                          {approvingId === match.id ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} />
                              Approve
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}

import { TrendingUp } from "lucide-react";
