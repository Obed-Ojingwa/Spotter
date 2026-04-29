// C:\Users\Melody\Desktop\spotter_dashboards\spotter\frontend\src\components\approval\MatchesApprovalList.tsx

import React, { useEffect, useState } from "react";
import { useApprovalStore } from "@/store/approvalStore";
import { CheckCircle2, XCircle, AlertCircle, Zap } from "lucide-react";

interface MatchesListProps {
  jobId: string;
  jobTitle: string;
}

export const MatchesApprovalList: React.FC<MatchesListProps> = ({
  jobId,
  jobTitle,
}) => {
  const { pendingMatches, loadingMatches, fetchPendingMatches, approveMatch, rejectMatch } =
    useApprovalStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectingMatch, setRejectingMatch] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchPendingMatches(jobId);
  }, [jobId]);

  const jobMatches = pendingMatches.filter((m) => m.job_id === jobId);

  const handleApprove = async (matchId: string) => {
    setLoading(matchId);
    try {
      await approveMatch(matchId);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (matchId: string) => {
    if (!rejectReason.trim()) return;
    setLoading(matchId);
    try {
      await rejectMatch(matchId, rejectReason);
      setRejectingMatch(null);
      setRejectReason("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  if (loadingMatches) {
    return <div className="p-4 text-gray-500">Loading matches...</div>;
  }

  if (jobMatches.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No auto-matched candidates for this job
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b">
        <Zap size={20} className="text-blue-600" />
        <h4 className="font-semibold text-gray-900">
          Auto-Matched Candidates ({jobMatches.length})
        </h4>
      </div>

      {jobMatches.map((match) => (
        <div
          key={match.id}
          className={`border rounded-lg p-4 ${
            match.status === "pending_approval"
              ? "border-yellow-200 bg-yellow-50"
              : match.status === "approved"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-medium text-gray-900">{match.candidate_name}</p>
              <p className="text-sm text-gray-600">For: {jobTitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  match.match_score >= 80
                    ? "bg-green-100 text-green-700"
                    : match.match_score >= 65
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {match.match_score}% match
              </span>
            </div>
          </div>

          {match.status === "pending_approval" && (
            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={() => handleApprove(match.id)}
                disabled={loading === match.id}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={16} />
                Approve
              </button>
              <button
                onClick={() => setRejectingMatch(match.id)}
                disabled={loading === match.id}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle size={16} />
                Reject
              </button>
            </div>
          )}

          {match.status === "approved" && (
            <div className="text-green-700 text-sm font-medium pt-2">✓ Approved</div>
          )}
          {match.status === "rejected" && (
            <div className="text-red-700 text-sm font-medium pt-2">✗ Rejected</div>
          )}
        </div>
      ))}

      {/* Reject Modal */}
      {rejectingMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-600" size={24} />
              <h3 className="text-lg font-semibold">Reject Match</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Provide a reason for rejecting this auto-matched candidate.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-600"
              rows={3}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectingMatch(null);
                  setRejectReason("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectingMatch)}
                disabled={!rejectReason.trim() || loading === rejectingMatch}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === rejectingMatch ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};