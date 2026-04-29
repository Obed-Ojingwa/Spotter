// C:\Users\Melody\Desktop\spotter_dashboards\spotter\frontend\src\app\admin\approval\page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useApprovalStore } from "@/store/approvalStore";
import { PendingJobCard } from "@/components/approval/PendingJobCard";
import { ClipboardList, Search } from "lucide-react";

export default function JobApprovalPage() {
  const {
    pendingJobs,
    loadingPendingJobs,
    fetchPendingJobs,
    selectedJobId,
    setSelectedJobId,
    filterStatus,
    setFilterStatus,
  } = useApprovalStore();

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPendingJobs();
  }, []);

  const filteredJobs = pendingJobs
    .filter((job) => {
      if (filterStatus !== "all" && job.status !== filterStatus) return false;
      if (searchTerm && !job.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === "pending_approval") return -1;
        if (b.status === "pending_approval") return 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const stats = {
    total: pendingJobs.length,
    pending: pendingJobs.filter((j) => j.status === "pending_approval").length,
    approved: pendingJobs.filter((j) => j.status === "approved").length,
    rejected: pendingJobs.filter((j) => j.status === "rejected").length,
  };

  // ✅ Fixed: filter values now match the store's type
  const filterOptions: { label: string; value: "all" | "pending_approval" | "approved" | "rejected" }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending_approval" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="text-red-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">Job Approvals</h1>
          </div>
          <p className="text-gray-600">
            Review and approve job postings before they go live
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total", count: stats.total, color: "bg-blue-100 text-blue-700" },
            { label: "Pending", count: stats.pending, color: "bg-yellow-100 text-yellow-700" },
            { label: "Approved", count: stats.approved, color: "bg-green-100 text-green-700" },
            { label: "Rejected", count: stats.rejected, color: "bg-red-100 text-red-700" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-lg p-4 ${stat.color}`}>
              <p className="text-sm font-medium mb-1">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.count}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search job titles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div className="flex gap-2">
              {filterOptions.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterStatus(filter.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === filter.value
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Jobs Grid */}
        {loadingPendingJobs ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading jobs...</div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ClipboardList className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-600">No jobs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* {filteredJobs.map((job) => (
              <PendingJobCard
                key={job.id}
                job={job}
                onSelect={setSelectedJobId}
                isSelected={selectedJobId === job.id}
              />
            ))} */}

            {filteredJobs.map((job) => {
                const safeJob = {
                    ...job,
                    company: job.company ?? "Unknown Company",
                };
                return (
                <PendingJobCard
                key={job.id}
                job={safeJob}
                onSelect={setSelectedJobId}
                isSelected={selectedJobId === job.id}
                />
            );
            })}
            </div>
        )}
      </div>
    </div>
  );
}