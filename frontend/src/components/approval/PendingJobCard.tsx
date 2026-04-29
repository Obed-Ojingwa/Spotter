import React, { useState } from "react";
import { CheckCircle2, XCircle, Edit2, AlertCircle, Zap } from "lucide-react";
import { useApprovalStore } from "@/store/approvalStore";

/* ── Types ───────────────────────────────────────── */

type JobStatus = "pending_approval" | "approved" | "rejected";

interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  created_at: string;
  status: JobStatus;
  auto_matched_count?: number;
  edits_suggested?: number;
}

interface JobCardProps {
  job: Job;
  onSelect?: (jobId: string) => void;
  isSelected?: boolean;
}

/* ── Component ───────────────────────────────────── */

export const PendingJobCard: React.FC<JobCardProps> = ({
  job,
  onSelect,
  isSelected,
}) => {
  const { approveJob, rejectJob } = useApprovalStore();
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approveJob(job.id);
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
      setRejectReason("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /* ── FIXED: Properly typed maps ─────────────────── */

  const statusColorMap: Record<JobStatus, string> = {
    pending_approval: "border-yellow-200 bg-yellow-50",
    approved: "border-green-200 bg-green-50",
    rejected: "border-red-200 bg-red-50",
  };

  const statusBadgeColorMap: Record<JobStatus, string> = {
    pending_approval: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const statusColor =
    statusColorMap[job.status] ?? "border-gray-200 bg-gray-50";

  const statusBadgeColor =
    statusBadgeColorMap[job.status] ?? "bg-gray-100 text-gray-800";

  return (
    <>
      <div
        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${statusColor} ${
          isSelected ? "ring-2 ring-red-600" : ""
        }`}
        onClick={() => onSelect?.(job.id)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{job.title}</h3>
            <p className="text-sm text-gray-600">{job.company}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeColor}`}
          >
            {job.status.replace("_", " ").toUpperCase()}
          </span>
        </div>

        {/* Match & Edit Indicators */}
        {(job.auto_matched_count || job.edits_suggested) && (
          <div className="flex gap-4 mb-3 text-sm">
            {job.auto_matched_count ? (
              <div className="flex items-center gap-1 text-blue-600">
                <Zap size={16} />
                <span>{job.auto_matched_count} auto-matches</span>
              </div>
            ) : null}
            {job.edits_suggested ? (
              <div className="flex items-center gap-1 text-orange-600">
                <Edit2 size={16} />
                <span>{job.edits_suggested} edits suggested</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-gray-700 line-clamp-2 mb-4">
          {job.description}
        </p>

        {/* Meta */}
        <div className="text-xs text-gray-500 mb-4">
          Posted {new Date(job.created_at).toLocaleDateString()}
        </div>

        {/* Actions */}
        {job.status === "pending_approval" && (
          <div className="flex gap-2 pt-3 border-t border-gray-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleApprove();
              }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              Approve
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRejectModal(true);
              }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              <XCircle size={16} />
              Reject
            </button>
          </div>
        )}
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
              Please provide a reason for rejecting this job posting.
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
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// // C:\Users\Melody\Desktop\spotter_dashboards\spotter\frontend\src\components\approval\PendingJobCard.tsx

// import React, { useState } from "react";
// import { CheckCircle2, XCircle, Edit2, AlertCircle, Zap } from "lucide-react";
// import { useApprovalStore } from "@/store/approvalStore";

// interface JobCardProps {
//   job: any;
//   onSelect?: (jobId: string) => void;
//   isSelected?: boolean;
// }

// export const PendingJobCard: React.FC<JobCardProps> = ({
//   job,
//   onSelect,
//   isSelected,
// }) => {
//   const { approveJob, rejectJob } = useApprovalStore();
//   const [loading, setLoading] = useState(false);
//   const [showRejectModal, setShowRejectModal] = useState(false);
//   const [rejectReason, setRejectReason] = useState("");

//   const handleApprove = async () => {
//     setLoading(true);
//     try {
//       await approveJob(job.id);
//       // Toast notification
//     } catch (error) {
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleReject = async () => {
//     if (!rejectReason.trim()) return;
//     setLoading(true);
//     try {
//       await rejectJob(job.id, rejectReason);
//       setShowRejectModal(false);
//       setRejectReason("");
//     } catch (error) {
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const statusColor = {
//     pending_approval: "border-yellow-200 bg-yellow-50",
//     approved: "border-green-200 bg-green-50",
//     rejected: "border-red-200 bg-red-50",
//   }[job.status] || "border-gray-200 bg-gray-50";

//   const statusBadgeColor = {
//     pending_approval: "bg-yellow-100 text-yellow-800",
//     approved: "bg-green-100 text-green-800",
//     rejected: "bg-red-100 text-red-800",
//   }[job.status] || "bg-gray-100 text-gray-800";

//   return (
//     <>
//       <div
//         className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${statusColor} ${
//           isSelected ? "ring-2 ring-red-600" : ""
//         }`}
//         onClick={() => onSelect?.(job.id)}
//       >
//         {/* Header */}
//         <div className="flex items-start justify-between mb-3">
//           <div className="flex-1">
//             <h3 className="font-semibold text-gray-900">{job.title}</h3>
//             <p className="text-sm text-gray-600">{job.company}</p>
//           </div>
//           <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeColor}`}>
//             {job.status.replace("_", " ").toUpperCase()}
//           </span>
//         </div>

//         {/* Match & Edit Indicators */}
//         {(job.auto_matched_count || job.edits_suggested) && (
//           <div className="flex gap-4 mb-3 text-sm">
//             {job.auto_matched_count ? (
//               <div className="flex items-center gap-1 text-blue-600">
//                 <Zap size={16} />
//                 <span>{job.auto_matched_count} auto-matches</span>
//               </div>
//             ) : null}
//             {job.edits_suggested ? (
//               <div className="flex items-center gap-1 text-orange-600">
//                 <Edit2 size={16} />
//                 <span>{job.edits_suggested} edits suggested</span>
//               </div>
//             ) : null}
//           </div>
//         )}

//         {/* Description Preview */}
//         <p className="text-sm text-gray-700 line-clamp-2 mb-4">{job.description}</p>

//         {/* Meta */}
//         <div className="text-xs text-gray-500 mb-4">
//           Posted {new Date(job.created_at).toLocaleDateString()}
//         </div>

//         {/* Actions - Only show for pending jobs */}
//         {job.status === "pending_approval" && (
//           <div className="flex gap-2 pt-3 border-t border-gray-200">
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 handleApprove();
//               }}
//               disabled={loading}
//               className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//             >
//               <CheckCircle2 size={16} />
//               Approve
//             </button>
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setShowRejectModal(true);
//               }}
//               disabled={loading}
//               className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//             >
//               <XCircle size={16} />
//               Reject
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Reject Modal */}
//       {showRejectModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
//             <div className="flex items-center gap-3 mb-4">
//               <AlertCircle className="text-red-600" size={24} />
//               <h3 className="text-lg font-semibold">Reject Job</h3>
//             </div>

//             <p className="text-sm text-gray-600 mb-4">
//               Please provide a reason for rejecting this job posting.
//             </p>

//             <textarea
//               value={rejectReason}
//               onChange={(e) => setRejectReason(e.target.value)}
//               placeholder="Reason for rejection..."
//               className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-600"
//               rows={3}
//             />

//             <div className="flex gap-3">
//               <button
//                 onClick={() => {
//                   setShowRejectModal(false);
//                   setRejectReason("");
//                 }}
//                 className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleReject}
//                 disabled={loading || !rejectReason.trim()}
//                 className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {loading ? "Rejecting..." : "Reject"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// };