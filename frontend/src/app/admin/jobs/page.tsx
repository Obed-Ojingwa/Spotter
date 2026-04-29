"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, RefreshCw, CheckCircle, XCircle, Edit2,
  AlertCircle, Briefcase, MapPin, DollarSign, Building2,
  ChevronDown, MessageSquare, ArrowLeft
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";

interface PendingJob {
  id: string;
  title: string;
  description: string;
  org_id?: string;
  agent_id?: string;
  poster_type: "org" | "agent";
  city: string;
  state: string;
  employment_type: string;
  salary_min?: number;
  salary_max?: number;
  created_at: string;
}

interface JobDetailsModal extends PendingJob {
  expanded?: boolean;
}

export default function AdminPendingJobsPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuthStore();
  const [jobs, setJobs] = useState<PendingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [showRejectForm, setShowRejectForm] = useState<Record<string, boolean>>({});
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
  }, [isLoggedIn, router]);

  async function loadJobs(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await adminApi.listPendingJobs();
      setJobs(res.data.jobs || []);
    } catch (error) {
      toast.error("Failed to load pending jobs");
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isLoggedIn()) {
      loadJobs();
    }
  }, [isLoggedIn]);

  async function handleApproveJob(jobId: string) {
    setApproving(jobId);
    try {
      await adminApi.approveJob(jobId);
      toast.success("Job approved and published!");
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setExpandedJobId(null);
    } catch (error) {
      toast.error("Failed to approve job");
      console.error(error);
    } finally {
      setApproving(null);
    }
  }

  async function handleRejectJob(jobId: string) {
    const reason = rejectionNotes[jobId] || "";
    setRejecting(jobId);
    try {
      await adminApi.rejectJob(jobId, reason);
      toast.success("Job rejected");
      loadJobs();
      setShowRejectForm((prev) => ({ ...prev, [jobId]: false }));
      setRejectionNotes((prev) => ({ ...prev, [jobId]: "" }));
    } catch (error) {
      toast.error("Failed to reject job");
      console.error(error);
    } finally {
      setRejecting(null);
    }
  }

  async function handleSaveEdit(jobId: string) {
    if (!editFormData[jobId] || Object.keys(editFormData[jobId]).length === 0) {
      toast.error("No changes to save");
      return;
    }

    try {
      await adminApi.editPendingJob(jobId, editFormData[jobId]);
      toast.success("Job updated");
      loadJobs();
      setEditingJobId(null);
      setEditFormData((prev) => ({ ...prev, [jobId]: {} }));
    } catch (error) {
      toast.error("Failed to update job");
      console.error(error);
    }
  }

  function updateEditFormData(jobId: string, field: string, value: any) {
    setEditFormData((prev) => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        [field]: value,
      },
    }));
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-600">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Pending Jobs</h1>
                <p className="text-sm text-gray-500 mt-0.5">Review and approve new job postings</p>
              </div>
            </div>
            <button
              onClick={() => loadJobs(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:border-red-300 transition-colors"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* Alert */}
          {jobs.length === 0 ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
              <CheckCircle size={20} className="text-green-600 shrink-0" />
              <p className="text-sm font-semibold text-green-800">All jobs approved! No pending jobs.</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
              <AlertCircle size={20} className="text-yellow-600 shrink-0" />
              <p className="text-sm font-semibold text-yellow-800">
                {jobs.length} job{jobs.length !== 1 ? "s" : ""} awaiting review
              </p>
            </div>
          )}

          {/* Jobs Table/List */}
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="card hover:shadow-md transition-shadow"
              >
                {/* Header Row - Collapsed View */}
                <button
                  onClick={() =>
                    setExpandedJobId(expandedJobId === job.id ? null : job.id)
                  }
                  className="w-full text-left p-4 flex items-start justify-between hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase size={18} className="text-red-600 shrink-0" />
                      <h3 className="text-sm font-bold text-gray-900">{job.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Building2 size={14} />
                        <span className="capitalize">{job.poster_type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>
                          {job.city}, {job.state}
                        </span>
                      </div>
                      {job.salary_min && job.salary_max && (
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} />
                          <span>
                            ₦{job.salary_min.toLocaleString()} - ₦{job.salary_max.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        {new Date(job.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 shrink-0 transition-transform ${
                      expandedJobId === job.id ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Expanded View */}
                {expandedJobId === job.id && (
                  <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                        Description
                      </label>
                      {editingJobId === job.id ? (
                        <textarea
                          value={editFormData[job.id]?.description ?? job.description}
                          onChange={(e) =>
                            updateEditFormData(job.id, "description", e.target.value)
                          }
                          className="input w-full text-sm py-2 min-h-[100px]"
                          placeholder="Job description"
                        />
                      ) : (
                        <p className="text-sm text-gray-700 bg-white rounded-lg p-3">
                          {job.description}
                        </p>
                      )}
                    </div>

                    {/* Job Details */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
                          Employment Type
                        </label>
                        {editingJobId === job.id ? (
                          <select
                            value={editFormData[job.id]?.employment_type ?? job.employment_type}
                            onChange={(e) =>
                              updateEditFormData(job.id, "employment_type", e.target.value)
                            }
                            className="input w-full text-sm py-2"
                          >
                            <option value="full-time">Full-time</option>
                            <option value="part-time">Part-time</option>
                            <option value="contract">Contract</option>
                            <option value="remote">Remote</option>
                          </select>
                        ) : (
                          <p className="text-sm text-gray-700 capitalize">
                            {job.employment_type}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
                          City
                        </label>
                        {editingJobId === job.id ? (
                          <input
                            type="text"
                            value={editFormData[job.id]?.city ?? job.city}
                            onChange={(e) =>
                              updateEditFormData(job.id, "city", e.target.value)
                            }
                            className="input w-full text-sm py-2"
                            placeholder="City"
                          />
                        ) : (
                          <p className="text-sm text-gray-700">{job.city}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
                          State
                        </label>
                        {editingJobId === job.id ? (
                          <input
                            type="text"
                            value={editFormData[job.id]?.state ?? job.state}
                            onChange={(e) =>
                              updateEditFormData(job.id, "state", e.target.value)
                            }
                            className="input w-full text-sm py-2"
                            placeholder="State"
                          />
                        ) : (
                          <p className="text-sm text-gray-700">{job.state}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
                          Salary Range (₦)
                        </label>
                        {editingJobId === job.id ? (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={editFormData[job.id]?.salary_min ?? job.salary_min ?? ""}
                              onChange={(e) =>
                                updateEditFormData(job.id, "salary_min", parseFloat(e.target.value))
                              }
                              className="input flex-1 text-sm py-2"
                              placeholder="Min"
                            />
                            <span className="text-gray-400 py-2">to</span>
                            <input
                              type="number"
                              value={editFormData[job.id]?.salary_max ?? job.salary_max ?? ""}
                              onChange={(e) =>
                                updateEditFormData(job.id, "salary_max", parseFloat(e.target.value))
                              }
                              className="input flex-1 text-sm py-2"
                              placeholder="Max"
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700">
                            {job.salary_min && job.salary_max
                              ? `₦${job.salary_min.toLocaleString()} - ₦${job.salary_max.toLocaleString()}`
                              : "Not specified"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap pt-4 border-t border-gray-200">
                      {editingJobId === job.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(job.id)}
                            className="btn-primary flex items-center gap-2 text-sm"
                          >
                            <CheckCircle size={16} />
                            Save Changes
                          </button>
                          <button
                            onClick={() => {
                              setEditingJobId(null);
                              setEditFormData((prev) => ({ ...prev, [job.id]: {} }));
                            }}
                            className="btn-secondary text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingJobId(job.id);
                              setEditFormData((prev) => ({ ...prev, [job.id]: {} }));
                            }}
                            className="flex items-center gap-2 text-sm border border-gray-300 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-gray-700 font-medium"
                          >
                            <Edit2 size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleApproveJob(job.id)}
                            disabled={approving === job.id}
                            className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-3 py-2 rounded-lg transition-colors font-medium"
                          >
                            {approving === job.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                            {approving === job.id ? "Approving…" : "Approve"}
                          </button>
                          <button
                            onClick={() =>
                              setShowRejectForm((prev) => ({
                                ...prev,
                                [job.id]: !prev[job.id],
                              }))
                            }
                            className="flex items-center gap-2 text-sm border border-red-300 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-red-700 font-medium"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </>
                      )}
                    </div>

                    {/* Reject Form */}
                    {showRejectForm[job.id] && editingJobId !== job.id && (
                      <div className="border-t border-gray-200 pt-4 space-y-3">
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">
                          Rejection Reason (Optional)
                        </label>
                        <textarea
                          value={rejectionNotes[job.id] || ""}
                          onChange={(e) =>
                            setRejectionNotes((prev) => ({
                              ...prev,
                              [job.id]: e.target.value,
                            }))
                          }
                          placeholder="Why is this job being rejected?"
                          className="input w-full text-sm py-2 min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectJob(job.id)}
                            disabled={rejecting === job.id}
                            className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                          >
                            {rejecting === job.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <XCircle size={14} />
                            )}
                            {rejecting === job.id ? "Rejecting…" : "Confirm Rejection"}
                          </button>
                          <button
                            onClick={() =>
                              setShowRejectForm((prev) => ({
                                ...prev,
                                [job.id]: false,
                              }))
                            }
                            className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {jobs.length === 0 && (
            <div className="text-center py-12">
              <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No pending jobs to review</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
