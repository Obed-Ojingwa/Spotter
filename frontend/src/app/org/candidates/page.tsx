// C:\Users\Melody\Documents\Spotter\frontend\src\app\org\candidates\page.tsx

"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users, ArrowLeft, Loader2, Lock, Unlock,
  ChevronDown, MapPin, GraduationCap, Briefcase,
  CheckCircle, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import api, { orgApi, paymentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { ScoreBadge, ScoreBar } from "@/components/matching/MatchCard";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface CandidateResult {
  match_id: string;
  score: number;
  blurred: boolean;
  breakdown?: Record<string, number>;
  city?: string;
  state?: string;
  seeker?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
    education?: string;
    skills?: string[];
    tech_stack?: string[];
    available: boolean;
    cv_url?: string;
  };
}

interface CandidatesResponse {
  job_id: string;
  total: number;
  premium_count: number;
  unlocked: boolean;
  unlock_required: boolean;
  candidates: CandidateResult[];
}

interface JobOption {
  id: string;
  title: string;
  status: string;
}

interface ApplicantRow {
  application_id: string;
  status: string;
  applied_at: string;
  cover_letter: string | null;
  seeker: {
    id: string;
    name: string;
    city?: string;
    state?: string;
    education?: string;
    skills?: string[];
    available: boolean;
  };
}

type CandidatesTab = "applicants" | "matched";

// ── Page ───────────────────────────────────────────────────────────────────
function OrgCandidatesPageContent() {
  const router               = useRouter();
  const searchParams         = useSearchParams();
  const { user, isLoggedIn } = useAuthStore();

  const [jobs,         setJobs]         = useState<JobOption[]>([]);
  const [selectedJob,  setSelectedJob]  = useState(searchParams.get("job") ?? "");
  const [result,       setResult]       = useState<CandidatesResponse | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [loadingJobs,  setLoadingJobs]  = useState(true);
  const [unlocking,    setUnlocking]    = useState(false);
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [tab,          setTab]          = useState<CandidatesTab>("applicants");
  const [applicants,   setApplicants]   = useState<ApplicantRow[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "org") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  // Load this organisation's jobs for the selector (not the public /jobs feed).
  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "org") return;
    orgApi
      .listJobs({ limit: 100, page: 1 })
      .then((r) => {
        const list: JobOption[] = r.data.jobs ?? [];
        setJobs(list);
        const fromUrl = searchParams.get("job");
        if (fromUrl && list.some((j) => j.id === fromUrl)) {
          setSelectedJob(fromUrl);
        } else if (list.length > 0) {
          const current = fromUrl ?? selectedJob;
          const stillValid = current && list.some((j) => j.id === current);
          if (!stillValid) setSelectedJob(list[0].id);
        }
      })
      .catch(() => toast.error("Could not load your jobs"))
      .finally(() => setLoadingJobs(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user]);

  const fetchApplicants = useCallback(async () => {
    if (!selectedJob) return;
    setLoadingApplicants(true);
    setApplicants([]);
    try {
      const res = await orgApi.listJobApplications(selectedJob);
      setApplicants(res.data ?? []);
    } catch (err: any) {
      const msg = err?.response?.data?.detail;
      toast.error(typeof msg === "string" ? msg : "Failed to load applicants");
    } finally {
      setLoadingApplicants(false);
    }
  }, [selectedJob]);

  // Fetch candidates whenever selectedJob changes
  const fetchCandidates = useCallback(async () => {
    if (!selectedJob) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.get(`/matching/job/${selectedJob}/candidates`);
      setResult(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail;
      toast.error(typeof msg === "string" ? msg : "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }, [selectedJob]);

  useEffect(() => {
    fetchApplicants();
    fetchCandidates();
  }, [fetchApplicants, fetchCandidates]);

  // Unlock premium candidates
  async function handleUnlock() {
    if (!selectedJob) return;
    setUnlocking(true);
    try {
      const payRes = await paymentsApi.initiate("org_unlock", { job_id: selectedJob });
      if (payRes.data.dev_mode) {
        // Dev mode: auto-verify then reload
        await api.get(`/payments/verify/${payRes.data.reference}`);
        toast.success("Candidates unlocked! (dev mode)");
        fetchCandidates();
      } else {
        window.location.href = payRes.data.authorization_url;
      }
    } catch {
      toast.error("Failed to initiate payment.");
    } finally {
      setUnlocking(false);
    }
  }

  const selectedJobTitle = jobs.find((j) => j.id === selectedJob)?.title;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Link
              href="/org/dashboard"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Candidates</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                People who applied to your roles and Spotter-approved matches
              </p>
            </div>
          </div>

          {/* Job selector */}
          {loadingJobs ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin" /> Loading your jobs…
            </div>
          ) : jobs.length === 0 ? (
            <div className="card text-center py-12">
              <Briefcase size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="font-semibold text-gray-600 mb-2">No jobs yet</p>
              <p className="text-sm text-gray-400 mb-5">
                Post a job first to see applicants and matched candidates.
              </p>
              <Link href="/org/jobs/new" className="btn-primary inline-block text-sm">
                Post a Job
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <label className="text-sm font-semibold text-gray-700 shrink-0">
                Viewing candidates for:
              </label>
              <div className="relative flex-1 max-w-sm">
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="input pr-9 text-sm py-2 appearance-none"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
          )}

          {jobs.length > 0 && (
            <div className="flex gap-1 p-1 bg-gray-200/60 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setTab("applicants")}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
                  tab === "applicants"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Applicants
              </button>
              <button
                type="button"
                onClick={() => setTab("matched")}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
                  tab === "matched"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Matched (Spotter)
              </button>
            </div>
          )}

          {/* Applicants tab */}
          {tab === "applicants" && jobs.length > 0 && (
            <div className="space-y-4">
              {loadingApplicants ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-red-600" />
                </div>
              ) : applicants.length === 0 ? (
                <EmptyApplicants />
              ) : (
                <>
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-800">{applicants.length}</span>
                    {" "}application{applicants.length !== 1 ? "s" : ""} for this role
                  </p>
                  <div className="space-y-3">
                    {applicants.map((a) => (
                      <ApplicantCard key={a.application_id} row={a} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Premium unlock banner — matched tab only */}
          {tab === "matched" && result?.unlock_required && !result.unlocked && (
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={18} />
                  <p className="font-bold text-lg">Premium candidates locked</p>
                </div>
                <p className="text-amber-100 text-sm">
                  {result.premium_count} candidate{result.premium_count !== 1 ? "s" : ""} scored ≥ 90%.
                  You can see 2 free — unlock all for ₦15,000.
                </p>
              </div>
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="flex items-center gap-2 bg-white text-amber-700 font-bold px-6 py-3 rounded-xl hover:bg-amber-50 transition-colors shrink-0 disabled:opacity-60"
              >
                {unlocking
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Unlock size={16} />
                }
                Unlock All — ₦15,000
              </button>
            </div>
          )}

          {tab === "matched" && result?.unlocked && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700 font-medium">
              <CheckCircle size={16} />
              All premium candidates unlocked for {selectedJobTitle}
            </div>
          )}

          {/* Matched results */}
          {tab === "matched" && jobs.length > 0 && (
            loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 size={32} className="animate-spin text-red-600" />
              </div>
            ) : !result ? null : result.candidates.length === 0 ? (
              <EmptyCandidates />
            ) : (
              <>
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-800">{result.total}</span> matched candidate{result.total !== 1 ? "s" : ""}
                  {result.premium_count > 0 && (
                    <span className="ml-2 text-amber-600 font-medium">
                      · {result.premium_count} premium (≥ 90%)
                    </span>
                  )}
                </p>

                <div className="space-y-3">
                  {result.candidates.map((c) =>
                    c.blurred ? (
                      <BlurredCard
                        key={c.match_id}
                        score={c.score}
                        city={c.city}
                        state={c.state}
                        onUnlock={handleUnlock}
                      />
                    ) : (
                      <CandidateCard
                        key={c.match_id}
                        candidate={c}
                        expanded={expanded === c.match_id}
                        onToggle={() =>
                          setExpanded(expanded === c.match_id ? null : c.match_id)
                        }
                      />
                    )
                  )}
                </div>
              </>
            )
          )}

        </div>
      </div>
    </>
  );
}

export default function OrgCandidatesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={24} /></div>}>
      <OrgCandidatesPageContent />
    </Suspense>
  );
}

// ── Applicants (direct applications) ───────────────────────────────────────
function ApplicantCard({ row }: { row: ApplicantRow }) {
  const [open, setOpen] = useState(false);
  const s = row.seeker;
  return (
    <div className="card border border-gray-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{s.name}</p>
          <p className="text-sm text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {(s.city || s.state) && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {[s.city, s.state].filter(Boolean).join(", ")}
              </span>
            )}
            {s.education && (
              <span className="flex items-center gap-1">
                <GraduationCap size={12} /> {s.education}
              </span>
            )}
            <span className="text-gray-400">
              Applied {new Date(row.applied_at).toLocaleString()}
            </span>
          </p>
        </div>
        <span
          className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 capitalize",
            row.status === "shortlisted" && "bg-green-100 text-green-800",
            row.status === "rejected" && "bg-red-50 text-red-700",
            row.status === "viewed" && "bg-blue-50 text-blue-700",
            (row.status === "applied" || !["shortlisted", "rejected", "viewed"].includes(row.status)) &&
              "bg-gray-100 text-gray-700"
          )}
        >
          {row.status.replace(/_/g, " ")}
        </span>
        <span className={cn("text-gray-300 text-lg leading-none transition-transform shrink-0", open && "rotate-90")}>
          ›
        </span>
      </button>
      {open && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {s.skills && s.skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {s.skills.map((sk) => (
                  <span key={sk} className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-lg">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}
          {row.cover_letter ? (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Cover letter</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{row.cover_letter}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No cover letter</p>
          )}
          <p className="text-xs text-gray-500">
            {s.available ? "Marked as available" : "Marked unavailable"}
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyApplicants() {
  return (
    <div className="text-center py-16 card">
      <Users size={40} className="mx-auto text-gray-200 mb-3" />
      <h3 className="text-lg font-semibold text-gray-700 mb-1">No applicants yet</h3>
      <p className="text-sm text-gray-400 max-w-md mx-auto">
        When job seekers apply from the job listing, they appear here with their profile and cover letter.
      </p>
    </div>
  );
}

// ── CandidateCard ──────────────────────────────────────────────────────────
function CandidateCard({
  candidate, expanded, onToggle,
}: {
  candidate: CandidateResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const s = candidate.seeker!;

  return (
    <div className="card border border-gray-100">
      <button onClick={onToggle} className="w-full flex items-center gap-4 text-left">
        <ScoreBadge score={candidate.score} size="md" />

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{s.name}</p>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-3">
            {(s.city || s.state) && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {[s.city, s.state].filter(Boolean).join(", ")}
              </span>
            )}
            {s.education && (
              <span className="flex items-center gap-1">
                <GraduationCap size={12} /> {s.education}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {s.available ? (
            <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
              <CheckCircle size={12} /> Available
            </span>
          ) : (
            <span className="text-xs text-gray-400">Unavailable</span>
          )}
          {candidate.score >= 90 && (
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
              ⭐ Premium
            </span>
          )}
        </div>

        <span className={cn(
          "text-gray-300 text-lg leading-none transition-transform shrink-0",
          expanded && "rotate-180"
        )}>›</span>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          {/* Skills */}
          {s.skills && s.skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {s.skills.map((sk) => (
                  <span key={sk} className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-lg">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tech stack */}
          {s.tech_stack && s.tech_stack.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tech stack</p>
              <div className="flex flex-wrap gap-1.5">
                {s.tech_stack.map((t) => (
                  <span key={t} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Score breakdown */}
          {candidate.breakdown && Object.keys(candidate.breakdown).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Match breakdown
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {Object.entries(candidate.breakdown).map(([k, v]) => (
                  <ScoreBar key={k} label={k} value={v} />
                ))}
              </div>
            </div>
          )}

          {/* CV link */}
          {s.cv_url && (
            <a
              href={s.cv_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-red-700 font-semibold hover:underline"
            >
              <Briefcase size={14} /> View CV / Resume
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── BlurredCard ────────────────────────────────────────────────────────────
function BlurredCard({
  score, city, state, onUnlock,
}: {
  score: number; city?: string; state?: string; onUnlock: () => void;
}) {
  return (
    <div className="card relative overflow-hidden border border-amber-100 bg-amber-50/30 min-h-[80px]">
      {/* Blurred rows */}
      <div className="filter blur-[3px] select-none pointer-events-none space-y-2 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-7 w-20 bg-gray-200 rounded-full" />
          <div className="h-5 w-40 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-4 w-24 bg-gray-100 rounded" />
          <div className="h-4 w-16 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-between px-5 bg-white/70 backdrop-blur-[1px]">
        <div className="flex items-center gap-3">
          <Lock size={16} className="text-amber-500" />
          <div>
            <ScoreBadge score={score} size="sm" />
            {(city || state) && (
              <p className="text-xs text-gray-500 mt-1">
                <MapPin size={11} className="inline mr-1" />
                {[city, state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onUnlock}
          className="text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Unlock
        </button>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyCandidates() {
  return (
    <div className="text-center py-20">
      <Users size={48} className="mx-auto text-gray-200 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">No candidates yet</h3>
      <p className="text-sm text-gray-400 max-w-xs mx-auto">
        Candidates appear here once they trigger a match against this job and a
        Spotter approves it.
      </p>
      <div className="flex items-center gap-2 justify-center mt-4 text-xs text-gray-400">
        <AlertCircle size={13} />
        Matches usually take 1–2 hours to be reviewed
      </div>
    </div>
  );
}
