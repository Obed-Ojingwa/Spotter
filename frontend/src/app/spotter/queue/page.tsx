// C:\Users\Melody\Documents\Spotter\frontend\src\app\spotter\queue\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle, XCircle, Loader2, ClipboardList,
  User, Briefcase, MapPin, GraduationCap, Target
} from "lucide-react";
import toast from "react-hot-toast";
import { spotterApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { ScoreBadge, ScoreBar } from "@/components/matching/MatchCard";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface QueueItem {
  match_id: string;
  score: number;
  breakdown: Record<string, number>;
  submitted_at: string;
  is_premium: boolean;
  seeker: {
    id: string;
    name: string;
    city?: string;
    state?: string;
    skills?: string[];
    education?: string;
    available: boolean;
  };
  job: {
    id: string;
    title: string;
    city?: string;
    state?: string;
    required_skills?: string[];
  };
}

interface Stats {
  total_approved: number;
  total_rejected: number;
  pending_in_queue: number;
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function SpotterQueuePage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [queue,   setQueue]   = useState<QueueItem[]>([]);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState<QueueItem | null>(null);
  const [notes,   setNotes]   = useState("");
  const [deciding, setDeciding] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "spotter") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  function loadData() {
    setLoading(true);
    Promise.all([spotterApi.getQueue(), spotterApi.getStats()])
      .then(([qRes, sRes]) => {
        setQueue(qRes.data);
        setStats(sRes.data);
        if (qRes.data.length > 0 && !active) setActive(qRes.data[0]);
      })
      .catch(() => toast.error("Failed to load queue"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (isLoggedIn() && user?.role === "spotter") loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user]);

  async function decide(approved: boolean) {
    if (!active) return;
    setDeciding(true);
    try {
      await spotterApi.review(active.match_id, approved, notes || undefined);
      toast.success(approved ? "✅ Match approved and revealed!" : "❌ Match rejected.");

      // Remove from queue and move to next
      const remaining = queue.filter((q) => q.match_id !== active.match_id);
      setQueue(remaining);
      setActive(remaining[0] ?? null);
      setNotes("");

      // Refresh stats
      spotterApi.getStats().then((r) => setStats(r.data)).catch(() => {});
    } catch {
      toast.error("Failed to submit decision. Please try again.");
    } finally {
      setDeciding(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Review Queue</h1>
              <p className="text-sm text-gray-500 mt-1">
                Review each match carefully before approving or rejecting
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Link
                href="/admin/jobs"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-300 hover:text-red-900 transition-colors"
              >
                <Briefcase size={16} />
                Review pending jobs
              </Link>
              {stats && (
                <div className="flex gap-4 text-center">
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-2.5">
                  <p className="text-xl font-black text-yellow-700">{stats.pending_in_queue}</p>
                  <p className="text-xs text-yellow-600">Pending</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
                  <p className="text-xl font-black text-green-700">{stats.total_approved}</p>
                  <p className="text-xs text-green-600">Approved</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  <p className="text-xl font-black text-red-700">{stats.total_rejected}</p>
                  <p className="text-xs text-red-600">Rejected</p>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-red-600" />
            </div>
          ) : queue.length === 0 ? (
            <EmptyQueue />
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">

              {/* ── Queue sidebar ───────────────────────────── */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                  {queue.length} pending
                </p>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                  {queue.map((item) => (
                    <button
                      key={item.match_id}
                      onClick={() => { setActive(item); setNotes(""); }}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border transition-all",
                        active?.match_id === item.match_id
                          ? "border-red-400 bg-red-50"
                          : "border-gray-100 bg-white hover:border-gray-200"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">
                            {item.seeker.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {item.job.title}
                          </p>
                        </div>
                        <ScoreBadge score={item.score} size="sm" />
                      </div>
                      {item.is_premium && (
                        <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                          ⭐ Premium match
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Detail panel ────────────────────────────── */}
              {active && (
                <div className="lg:col-span-2 space-y-4">

                  {/* Score + premium flag */}
                  <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <ScoreBadge score={active.score} size="lg" />
                        {active.is_premium && (
                          <span className="text-sm bg-amber-100 text-amber-700 font-semibold px-3 py-1 rounded-full">
                            ⭐ Premium — score ≥ 90%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Submitted {new Date(active.submitted_at).toLocaleString("en-NG")}
                      </p>
                    </div>
                    <Target size={36} className="text-gray-100 hidden sm:block" />
                  </div>

                  {/* Seeker + Job side by side */}
                  <div className="grid sm:grid-cols-2 gap-4">

                    {/* Seeker card */}
                    <div className="card space-y-3">
                      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                        <div className="bg-red-100 p-2 rounded-lg">
                          <User size={16} className="text-red-700" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm">Candidate</h3>
                      </div>
                      <InfoRow icon={User} label="Name" value={active.seeker.name} />
                      {(active.seeker.city || active.seeker.state) && (
                        <InfoRow
                          icon={MapPin}
                          label="Location"
                          value={[active.seeker.city, active.seeker.state].filter(Boolean).join(", ")}
                        />
                      )}
                      {active.seeker.education && (
                        <InfoRow icon={GraduationCap} label="Education" value={active.seeker.education} />
                      )}
                      <InfoRow
                        icon={CheckCircle}
                        label="Available"
                        value={active.seeker.available ? "Yes" : "No"}
                        valueClass={active.seeker.available ? "text-green-600" : "text-red-500"}
                      />
                      {active.seeker.skills && active.seeker.skills.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">Skills</p>
                          <div className="flex flex-wrap gap-1">
                            {active.seeker.skills.slice(0, 5).map((s) => (
                              <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                            {active.seeker.skills.length > 5 && (
                              <span className="text-xs text-gray-400">
                                +{active.seeker.skills.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Job card */}
                    <div className="card space-y-3">
                      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Briefcase size={16} className="text-blue-700" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm">Job</h3>
                      </div>
                      <InfoRow icon={Briefcase} label="Title" value={active.job.title} />
                      {(active.job.city || active.job.state) && (
                        <InfoRow
                          icon={MapPin}
                          label="Location"
                          value={[active.job.city, active.job.state].filter(Boolean).join(", ")}
                        />
                      )}
                      {active.job.required_skills && active.job.required_skills.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">Required skills</p>
                          <div className="flex flex-wrap gap-1">
                            {active.job.required_skills.slice(0, 5).map((s) => (
                              <span key={s} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score breakdown */}
                  {Object.keys(active.breakdown).length > 0 && (
                    <div className="card space-y-3">
                      <h3 className="font-bold text-gray-900 text-sm">Score Breakdown</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {Object.entries(active.breakdown).map(([k, v]) => (
                          <ScoreBar key={k} label={k} value={v} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decision panel */}
                  <div className="card space-y-4 border-2 border-gray-200">
                    <h3 className="font-bold text-gray-900">Your Decision</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Notes <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Add notes about this match for your records..."
                        className="input resize-none text-sm"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => decide(true)}
                        disabled={deciding}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors disabled:opacity-50"
                      >
                        {deciding
                          ? <Loader2 size={18} className="animate-spin" />
                          : <CheckCircle size={18} />
                        }
                        Approve & Reveal
                      </button>
                      <button
                        onClick={() => decide(false)}
                        disabled={deciding}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50"
                      >
                        {deciding
                          ? <Loader2 size={18} className="animate-spin" />
                          : <XCircle size={18} />
                        }
                        Reject
                      </button>
                    </div>

                    <p className="text-xs text-gray-400 text-center">
                      Approving reveals this match to both the candidate and organisation.
                      A certificate is auto-generated for scores ≥ 70%.
                    </p>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Helper components ──────────────────────────────────────────────────────
function InfoRow({
  icon: Icon, label, value, valueClass = "text-gray-800",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className={cn("text-sm font-medium truncate", valueClass)}>{value}</p>
      </div>
    </div>
  );
}

function EmptyQueue() {
  return (
    <div className="text-center py-24">
      <div className="bg-green-100 rounded-full p-5 w-20 h-20 mx-auto mb-5 flex items-center justify-center">
        <ClipboardList size={36} className="text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Queue is clear!</h2>
      <p className="text-gray-400 text-sm max-w-xs mx-auto">
        No matches waiting for review. Check back later or refresh the page.
      </p>
    </div>
  );
}
