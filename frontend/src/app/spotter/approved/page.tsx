// C:\Users\Melody\Documents\Spotter\frontend\src\app\spotter\approved\page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle, XCircle, Trophy, Loader2,
  RefreshCw, Filter, ChevronLeft, ChevronRight,
  User, Briefcase, MapPin, Star, Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { spotterApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { ScoreBadge } from "@/components/matching/MatchCard";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface HistoryMatch {
  match_id: string;
  score: number;
  status: string;
  is_premium: boolean;
  spotter_notes?: string;
  approved_at?: string;
  seeker: { name: string; city?: string; state?: string };
  job: { title: string };
}

interface HistoryResponse {
  total: number;
  page: number;
  matches: HistoryMatch[];
}

// ── Constants ──────────────────────────────────────────────────────────────
const DECISION_FILTERS = [
  { label: "All reviewed",  value: ""         },
  { label: "Approved",      value: "approved" },
  { label: "Rejected",      value: "rejected" },
];

const LIMIT = 20;

// ── Page ───────────────────────────────────────────────────────────────────
export default function SpotterApprovedPage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [data,       setData]       = useState<HistoryResponse | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState("");
  const [page,       setPage]       = useState(1);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "spotter") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  const loadHistory = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await spotterApi.getHistory({
        decision: filter || undefined,
        page,
        limit: LIMIT,
      });
      setData(res.data);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, page]);

  useEffect(() => {
    if (isLoggedIn() && user?.role === "spotter") loadHistory();
  }, [loadHistory, isLoggedIn, user]);

  useEffect(() => { setPage(1); }, [filter]);

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;
  const approvedCount = data?.matches.filter(m => m.status === "revealed").length ?? 0;
  const rejectedCount = data?.matches.filter(m => m.status === "spotter_rejected").length ?? 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

          {/* ── Header ────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/spotter/queue"
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                <ArrowLeft size={18} className="text-gray-600" />
              </Link>
              <div className="bg-green-700 text-white p-2.5 rounded-xl">
                <Trophy size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Review History</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  All matches you have reviewed · {data?.total ?? 0} total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => loadHistory(true)} disabled={refreshing}
                className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:border-green-300 transition-colors">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
              <Link href="/spotter/queue" className="btn-primary text-sm">
                Back to Queue
              </Link>
            </div>
          </div>

          {/* ── Summary cards ─────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center">
              <p className="text-2xl font-black text-gray-700">{data?.total ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total reviewed</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center">
              <p className="text-2xl font-black text-green-700">{approvedCount}</p>
              <p className="text-xs text-green-600 mt-0.5">Approved (this page)</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
              <p className="text-2xl font-black text-red-700">{rejectedCount}</p>
              <p className="text-xs text-red-600 mt-0.5">Rejected (this page)</p>
            </div>
          </div>

          {/* ── Filter tabs ───────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-gray-400 shrink-0" />
            {DECISION_FILTERS.map((f) => (
              <button key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  filter === f.value
                    ? "bg-green-700 text-white border-green-700"
                    : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Content ───────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-green-600" />
            </div>
          ) : data?.matches.length === 0 ? (
            <div className="card text-center py-16">
              <Trophy size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="font-semibold text-gray-600 mb-1">No reviews found</p>
              <p className="text-sm text-gray-400 mb-5">
                {filter ? `No ${filter} matches yet` : "You haven't reviewed any matches yet"}
              </p>
              <Link href="/spotter/queue" className="btn-primary inline-block text-sm">
                Go to Queue
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.matches.map((match) => {
                const isApproved = match.status === "revealed";
                return (
                  <div key={match.match_id}
                    className={`rounded-xl border bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
                      isApproved ? "border-green-100" : "border-red-100"
                    }`}>

                    {/* Score */}
                    <ScoreBadge score={match.score} size="md" />

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Decision badge */}
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          isApproved
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-red-100 text-red-600 border-red-200"
                        }`}>
                          {isApproved
                            ? <><CheckCircle size={11} /> Approved</>
                            : <><XCircle size={11} /> Rejected</>
                          }
                        </span>
                        {match.is_premium && (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                            <Star size={10} /> Premium
                          </span>
                        )}
                      </div>

                      {/* Seeker + Job */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                          <User size={13} className="text-gray-400" />
                          {match.seeker.name}
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Briefcase size={13} className="text-gray-400" />
                          {match.job.title}
                        </span>
                        {(match.seeker.city || match.seeker.state) && (
                          <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <MapPin size={11} />
                            {[match.seeker.city, match.seeker.state].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>

                      {/* Notes + date */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {match.spotter_notes && (
                          <p className="text-xs text-gray-400 italic">
                            "{match.spotter_notes}"
                          </p>
                        )}
                        {match.approved_at && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={11} />
                            {new Date(match.approved_at).toLocaleDateString("en-NG", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
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
                Page {page} of {totalPages} · {data?.total} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:border-green-300 disabled:opacity-40 transition-colors">
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:border-green-300 disabled:opacity-40 transition-colors">
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





// // C:\Users\Melody\Documents\Spotter\frontend\src\app\spotter\approved\page.tsx

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { ArrowLeft, CheckCircle, Loader2, Trophy } from "lucide-react";
// import toast from "react-hot-toast";
// import api from "@/lib/api";
// import { useAuthStore } from "@/store/authStore";
// import Navbar from "@/components/layout/Navbar";
// import { ScoreBadge } from "@/components/matching/MatchCard";

// interface ApprovedMatch {
//   match_id: string;
//   score: number;
//   is_premium: boolean;
//   seeker: { name: string; city?: string; state?: string };
//   job: { title: string };
//   submitted_at: string;
// }

// export default function SpotterApprovedPage() {
//   const router               = useRouter();
//   const { user, isLoggedIn } = useAuthStore();
//   const [matches,  setMatches]  = useState<ApprovedMatch[]>([]);
//   const [loading,  setLoading]  = useState(true);

//   useEffect(() => {
//     if (!isLoggedIn()) { router.push("/login"); return; }
//     if (user?.role !== "spotter") { router.push("/"); return; }
//   }, [isLoggedIn, user, router]);

//   useEffect(() => {
//     if (!isLoggedIn() || user?.role !== "spotter") return;
//     // Fetch recently approved — reuse queue endpoint filtered by status in future;
//     // for now fetch queue to show what exists (approved ones won't appear there)
//     api.get("/spotter/stats").then(() => {}).catch(() => {});
//     setLoading(false);
//   }, [isLoggedIn, user]);

//   return (
//     <>
//       <Navbar />
//       <div className="min-h-screen bg-gray-50">
//         <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
//           <div className="flex items-center gap-4">
//             <Link href="/spotter/queue" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
//               <ArrowLeft size={20} className="text-gray-600" />
//             </Link>
//             <div>
//               <h1 className="text-2xl font-black text-gray-900">Approved Matches</h1>
//               <p className="text-sm text-gray-500 mt-0.5">History of matches you have approved</p>
//             </div>
//           </div>
//           <div className="card text-center py-16">
//             <Trophy size={40} className="mx-auto text-gray-200 mb-3" />
//             <p className="font-semibold text-gray-600 mb-2">Approval history coming soon</p>
//             <p className="text-sm text-gray-400 mb-5">
//               This page will show all matches you have reviewed. For now, head to the review queue.
//             </p>
//             <Link href="/spotter/queue" className="btn-primary inline-block text-sm">
//               Go to Queue
//             </Link>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }
