// C:\Users\Melody\Documents\Spotter\frontend\src\app\(public)\jobs\[id]\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Briefcase, Clock, DollarSign, GraduationCap,
  CheckCircle, ArrowLeft, Loader2, Target, AlertCircle,
  Upload, FileText, ExternalLink
} from "lucide-react";
import toast from "react-hot-toast";
import { jobsApi, paymentsApi, seekerApi } from "@/lib/api";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface Job {
  id: string;
  title: string;
  description: string;
  city?: string;
  state?: string;
  work_mode?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  required_skills?: string[];
  required_tech_stack?: string[];
  required_experience_years?: number;
  required_education?: string;
  required_degree_class?: string;
  certifications_required?: string[];
  licenses_required?: string[];
  expires_at?: string;
  created_at: string;
}

export default function JobDetailPage() {
  const { id }               = useParams<{ id: string }>();
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [job,          setJob]          = useState<Job | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [applying,     setApplying]     = useState(false);
  const [matching,     setMatching]     = useState(false);
  const [coverLetter,  setCoverLetter]  = useState("");
  const [showApply,    setShowApply]    = useState(false);
  const [applied,      setApplied]      = useState(false);
  const [profileComplete, setProfileComplete] = useState(true);
  const [cvUrl,        setCvUrl]        = useState<string | null>(null);
  const [cvUploading,  setCvUploading]  = useState(false);

  useEffect(() => {
    jobsApi.get(id)
      .then((r) => setJob(r.data))
      .catch(() => toast.error("Job not found"))
      .finally(() => setLoading(false));
  }, [id]);

  // Check profile completeness for seekers
  useEffect(() => {
    if (user?.role === "seeker") {
      seekerApi.getProfile()
        .then((r) => {
          setProfileComplete(r.data.profile_complete);
          setCvUrl(r.data.cv_url ?? null);
        })
        .catch(() => {});
    }
  }, [user]);

  async function handleCvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const okTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!okTypes.includes(file.type)) {
      toast.error("Please upload a PDF or Word document (.pdf, .doc, .docx).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be 5 MB or smaller.");
      return;
    }

    setCvUploading(true);
    try {
      const res = await seekerApi.uploadCv(file);
      const url = res.data?.cv_url as string | undefined;
      if (url) setCvUrl(url);
      toast.success("Resume uploaded and ready for this application.");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Resume upload failed.");
    } finally {
      setCvUploading(false);
    }
  }

  async function handleApply() {
    if (!isLoggedIn()) { router.push("/login"); return; }
    setApplying(true);
    try {
      await api.post("/applications", { job_id: id, cover_letter: coverLetter || undefined });
      setApplied(true);
      setShowApply(false);
      toast.success("Application submitted!");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (msg?.includes("already applied")) {
        toast.error("You have already applied to this job.");
        setApplied(true);
      } else {
        toast.error(msg || "Failed to apply. Please try again.");
      }
    } finally {
      setApplying(false);
    }
  }

  async function handleRequestMatch() {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (!profileComplete) {
      toast.error("Please complete your profile before requesting a match.");
      router.push("/seeker/profile");
      return;
    }
    setMatching(true);
    try {
      const res = await api.post("/matching/trigger", { job_id: id });
      toast.success(`Match submitted! Score: ${res.data.score?.toFixed(1)}% — awaiting Spotter review.`);
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
      const detail = response?.data?.detail;
      // Payment required
      if (response?.status === 402) {
        toast.error("Your first match is used. Redirecting to payment...");
        const payRes = await paymentsApi.initiate("seeker_match", { job_id: id });
        window.location.href = payRes.data.authorization_url;
      } else if (typeof detail === "string" && detail.includes("already")) {
        toast("Match already exists for this job — check your matches.", { icon: "ℹ️" });
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to request match.");
      }
    } finally {
      setMatching(false);
    }
  }

  // ── Loading / not found ───────────────────────────────────────────────────
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

  if (!job) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Job not found or has been closed.</p>
            <Link href="/jobs" className="btn-primary">Back to Jobs</Link>
          </div>
        </div>
      </>
    );
  }

  const isSeeker = user?.role === "seeker";
  const uploadsBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "");
  const daysLeft   = job.expires_at
    ? Math.ceil((new Date(job.expires_at).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Back */}
          <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-700 mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to jobs
          </Link>

          <div className="grid lg:grid-cols-3 gap-6">

            {/* ── Main content ──────────────────────────────── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Header card */}
              <div className="card space-y-4">
                <div>
                  <h1 className="text-2xl font-black text-gray-900 leading-tight">{job.title}</h1>

                  <div className="flex flex-wrap gap-3 mt-3">
                    {(job.city || job.state) && (
                      <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        <MapPin size={14} className="text-gray-400" />
                        {[job.city, job.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {job.work_mode && (
                      <span className={cn(
                        "text-xs px-2.5 py-1 rounded-full font-medium capitalize",
                        job.work_mode === "remote" ? "bg-green-100 text-green-700" :
                        job.work_mode === "hybrid" ? "bg-purple-100 text-purple-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {job.work_mode}
                      </span>
                    )}
                    {job.employment_type && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize bg-gray-100 text-gray-600">
                        {job.employment_type}
                      </span>
                    )}
                    {daysLeft !== null && daysLeft > 0 && (
                      <span className={cn(
                        "flex items-center gap-1 text-xs font-medium",
                        daysLeft <= 3 ? "text-red-500" : "text-gray-400"
                      )}>
                        <Clock size={12} />
                        {daysLeft === 1 ? "Closes tomorrow" : `Closes in ${daysLeft} days`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Salary */}
                {(job.salary_min || job.salary_max) && (
                  <div className="flex items-center gap-2 text-green-700 font-semibold">
                    <DollarSign size={16} />
                    <span>
                      ₦{job.salary_min?.toLocaleString()}
                      {job.salary_max ? ` – ₦${job.salary_max.toLocaleString()}` : "+"}
                      <span className="text-sm font-normal text-gray-400 ml-1">/ month</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="card">
                <h2 className="font-bold text-gray-900 mb-4">About this role</h2>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {job.description}
                </div>
              </div>

              {/* Requirements */}
              {(job.required_skills?.length || job.required_tech_stack?.length) ? (
                <div className="card space-y-5">
                  <h2 className="font-bold text-gray-900">Requirements</h2>

                  {job.required_skills && job.required_skills.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Skills required
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {job.required_skills.map((s) => (
                          <span key={s} className="bg-red-50 text-red-700 text-sm px-3 py-1 rounded-lg font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {job.required_tech_stack && job.required_tech_stack.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Tech stack
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {job.required_tech_stack.map((t) => (
                          <span key={t} className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-lg font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {job.required_experience_years && (
                      <DetailRow icon={Briefcase} label="Experience" value={`${job.required_experience_years}+ years`} />
                    )}
                    {job.required_education && (
                      <DetailRow icon={GraduationCap} label="Education" value={job.required_education} />
                    )}
                    {job.required_degree_class && (
                      <DetailRow icon={GraduationCap} label="Degree class" value={job.required_degree_class} />
                    )}
                  </div>

                  {job.certifications_required && job.certifications_required.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Certifications
                      </p>
                      {job.certifications_required.map((c) => (
                        <p key={c} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle size={14} className="text-green-500 shrink-0" /> {c}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* ── Sidebar / Actions ─────────────────────────── */}
            <div className="space-y-4">

              {/* Action card */}
              <div className="card space-y-3 sticky top-24">
                <h3 className="font-bold text-gray-900">Interested in this role?</h3>

                {!isLoggedIn() ? (
                  <div className="space-y-2">
                    <Link href={`/login`} className="btn-primary w-full text-center block">
                      Sign in to Apply
                    </Link>
                    <Link href="/register" className="btn-secondary w-full text-center block">
                      Create Account
                    </Link>
                  </div>
                ) : !isSeeker ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Only job seekers can apply to jobs.
                  </p>
                ) : applied ? (
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">
                    <CheckCircle size={16} />
                    Application submitted!
                  </div>
                ) : (
                  <>
                    {/* Apply */}
                    {!showApply ? (
                      <button
                        onClick={() => setShowApply(true)}
                        className="btn-primary w-full"
                      >
                        Apply Now
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-800">Resume / CV</p>
                            <p className="text-xs text-gray-500">
                              Upload a PDF or Word document. Your resume is saved to your seeker profile and used with this application.
                            </p>
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-red-300 hover:text-red-700 cursor-pointer">
                              <Upload size={16} />
                              {cvUploading ? "Uploading…" : cvUrl ? "Replace resume" : "Upload resume"}
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                className="hidden"
                                disabled={cvUploading}
                                onChange={handleCvChange}
                              />
                            </label>

                            {cvUrl ? (
                              <a
                                href={`${uploadsBaseUrl}${cvUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline"
                              >
                                <FileText size={14} />
                                View uploaded resume
                                <ExternalLink size={11} className="opacity-60" />
                              </a>
                            ) : (
                              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                No resume uploaded yet. You can still apply, but adding one improves your application.
                              </p>
                            )}
                          </div>
                        </div>

                        <textarea
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          rows={4}
                          placeholder="Cover letter (optional) — introduce yourself..."
                          className="input text-sm resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleApply}
                            disabled={applying || cvUploading}
                            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
                          >
                            {(applying || cvUploading) && <Loader2 size={15} className="animate-spin" />}
                            {cvUploading ? "Uploading resume..." : "Submit"}
                          </button>
                          <button
                            onClick={() => setShowApply(false)}
                            className="btn-ghost text-sm px-4"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-400">or</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    {/* Match */}
                    <button
                      onClick={handleRequestMatch}
                      disabled={matching}
                      className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                    >
                      {matching
                        ? <Loader2 size={15} className="animate-spin" />
                        : <Target size={15} />
                      }
                      Get Match Score
                    </button>

                    {!profileComplete && (
                      <div className="flex items-start gap-2 bg-yellow-50 text-yellow-700 px-3 py-2.5 rounded-lg text-xs">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>
                          Your profile is incomplete.{" "}
                          <Link href="/seeker/profile" className="underline font-semibold">
                            Finish it
                          </Link>{" "}
                          for accurate match scores.
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Match explainer */}
                {isSeeker && !applied && (
                  <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-600">How matching works</p>
                    <p>Your profile is scored against this job on 8 criteria.</p>
                    <p>A Spotter reviews the score before the result is revealed.</p>
                    <p className="text-green-600 font-medium">✓ First match is always free</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Small helper ───────────────────────────────────────────────────────────
function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={15} className="text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="font-medium text-gray-800 capitalize">{value}</p>
      </div>
    </div>
  );
}
