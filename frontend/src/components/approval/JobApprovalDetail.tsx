// C:\Users\Melody\Desktop\spotter_dashboards\spotter\frontend\src\components\approval\JobApprovalDetail.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useApprovalStore } from "@/store/approvalStore";
import { MatchesApprovalList } from "./MatchesApprovalList";
import { CheckCircle2, XCircle, Edit2, AlertCircle, ChevronLeft } from "lucide-react";

interface JobApprovalDetailProps {
  jobId: string;
  onBack: () => void;
}

export const JobApprovalDetail: React.FC<JobApprovalDetailProps> = ({
  jobId,
  onBack,
}) => {
  const { pendingJobs, approveJob, rejectJob } = useApprovalStore();
  const job = pendingJobs.find((j) => j.id === jobId);

  const [isEditing, setIsEditing] = useState(false);
  // ✅ Fixed: initialize as empty object, populate in useEffect without spreading job first
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (job) {
      // ✅ Fixed: explicitly list fields instead of spreading job (avoids "title" overwrite TS warning)
      setEditData({
        title: job.title,
        description: job.description,
        company: job.company,
        status: job.status,
        created_at: job.created_at,
        created_by: job.created_by,
        auto_matched_count: job.auto_matched_count,
        edits_suggested: job.edits_suggested,
      });
    }
  }, [job]);

  if (!job) {
    return <div className="p-6 text-center text-gray-500">Job not found</div>;
  }

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approveJob(job.id, isEditing ? editData : undefined);
      onBack();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setLoading(true);
    try {
      await rejectJob(job.id, rejectReason);
      setShowRejectModal(false);
      onBack();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fixed: typed lookup to avoid implicit 'any' index error
  const statusBadgeMap: Record<"pending_approval" | "approved" | "rejected", string> = {
    pending_approval: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  const statusBadgeColor = statusBadgeMap[job.status] ?? "bg-gray-100 text-gray-800";

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 mb-4 font-medium"
        >
          <ChevronLeft size={20} />
          Back to List
        </button>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{job.title}</h2>
            <p className="text-gray-600">{job.company}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeColor}`}>
            {job.status.replace("_", " ").toUpperCase()}
          </span>
        </div>

        <p className="text-sm text-gray-500">
          Posted {new Date(job.created_at).toLocaleDateString()} by {job.created_by}
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6 p-6">
        {/* Job Details */}
        <div className="col-span-2 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Job Description
            </label>
            {isEditing ? (
              <textarea
                value={editData.description ?? ""}
                onChange={(e) =>
                  setEditData({ ...editData, description: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                rows={6}
              />
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-gray-700 whitespace-pre-wrap">
                {job.description}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Location", key: "location" },
              { label: "Experience Level", key: "experience_level" },
              { label: "Salary Range", key: "salary_range" },
              { label: "Employment Type", key: "employment_type" },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData[field.key] ?? ""}
                    onChange={(e) =>
                      setEditData({ ...editData, [field.key]: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                  />
                ) : (
                  <p className="text-gray-700 text-sm">{editData[field.key] || "N/A"}</p>
                )}
              </div>
            ))}
          </div>

          <div className="border-t pt-6">
            <MatchesApprovalList jobId={job.id} jobTitle={job.title} />
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="bg-gray-50 rounded-lg p-4 h-fit">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="w-full flex items-center justify-center gap-2 mb-4 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <Edit2 size={16} />
            {isEditing ? "Done Editing" : "Edit Job"}
          </button>

          {job.status === "pending_approval" && (
            <div className="space-y-2">
              <button
                onClick={handleApprove}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCircle2 size={18} />
                Approve Job
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <XCircle size={18} />
                Reject Job
              </button>
            </div>
          )}

          {job.status === "approved" && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-700 font-semibold text-sm">✓ Approved</p>
            </div>
          )}

          {job.status === "rejected" && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-red-700 font-semibold text-sm">✗ Rejected</p>
            </div>
          )}

          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-2 mb-2">
              <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 font-medium">Approval Info</p>
            </div>
            <p className="text-xs text-blue-600 leading-relaxed">
              Once approved, this job will be visible to all job seekers and auto-matched
              candidates will be notified.
            </p>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-600" size={24} />
              <h3 className="text-lg font-semibold">Reject Job</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Provide feedback to the organization on why this job is being rejected.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-600"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={loading || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};