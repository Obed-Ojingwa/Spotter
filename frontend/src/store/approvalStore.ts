// C:\Users\Melody\Desktop\spotter_dashboards\spotter\frontend\src\store\approvalStore.ts

import { create } from "zustand";
import api from "@/lib/api";

export interface PendingJob {
  id: string;
  title: string;
  company?: string;
  description: string;
  status: "pending_approval" | "approved" | "rejected";
  created_at: string;
  created_by?: string;
  auto_matched_count?: number;
  edits_suggested?: number;
}

export interface ApprovalMatch {
  id: string;
  job_id: string;
  candidate_id: string;
  candidate_name?: string;
  match_score: number;
  status: "pending_approval" | "approved" | "rejected";
  created_at: string;
}

interface ApprovalStore {
  pendingJobs: PendingJob[];
  loadingPendingJobs: boolean;
  fetchPendingJobs: () => Promise<void>;
  approveJob: (jobId: string, edits?: Record<string, any>) => Promise<void>;
  rejectJob: (jobId: string, reason: string) => Promise<void>;
  editJob: (jobId: string, updates: Record<string, any>) => Promise<void>;

  pendingMatches: ApprovalMatch[];
  loadingMatches: boolean;
  fetchPendingMatches: (jobId?: string) => Promise<void>;
  approveMatch: (matchId: string) => Promise<void>;
  rejectMatch: (matchId: string, reason: string) => Promise<void>;

  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  filterStatus: "all" | "pending_approval" | "approved" | "rejected";
  setFilterStatus: (status: "all" | "pending_approval" | "approved" | "rejected") => void;
}

export const useApprovalStore = create<ApprovalStore>((set) => ({
  pendingJobs: [],
  loadingPendingJobs: false,
  pendingMatches: [],
  loadingMatches: false,
  selectedJobId: null,
  filterStatus: "pending_approval",

  fetchPendingJobs: async () => {
    set({ loadingPendingJobs: true });
    try {
      // ✅ Fixed: matches @router.get("/jobs/pending") under /admin prefix
      const res = await api.get("/admin/jobs/pending");
      set({ pendingJobs: res.data.jobs || [] });
    } catch (error) {
      console.error("Failed to fetch pending jobs:", error);
      set({ pendingJobs: [] });
    } finally {
      set({ loadingPendingJobs: false });
    }
  },

  approveJob: async (jobId: string, edits?: Record<string, any>) => {
    try {
      // ✅ Fixed: matches @router.post("/jobs/{job_id}/approve") under /admin prefix
      // edits are sent as notes in the body
      const payload = edits ? { notes: JSON.stringify(edits) } : {};
      await api.post(`/admin/jobs/${jobId}/approve`, payload);
      set((state) => ({
        pendingJobs: state.pendingJobs.map((job) =>
          job.id === jobId ? { ...job, status: "approved" } : job
        ),
      }));
    } catch (error) {
      console.error("Failed to approve job:", error);
      throw error;
    }
  },

  rejectJob: async (jobId: string, reason: string) => {
    try {
      // ✅ Fixed: matches @router.post("/jobs/{job_id}/reject") under /admin prefix
      await api.post(`/admin/jobs/${jobId}/reject`, { notes: reason });
      set((state) => ({
        pendingJobs: state.pendingJobs.map((job) =>
          job.id === jobId ? { ...job, status: "rejected" } : job
        ),
      }));
    } catch (error) {
      console.error("Failed to reject job:", error);
      throw error;
    }
  },

  editJob: async (jobId: string, updates: Record<string, any>) => {
    try {
      // ✅ Fixed: matches @router.put("/jobs/{job_id}/edit") under /admin prefix
      await api.put(`/admin/jobs/${jobId}/edit`, updates);
      set((state) => ({
        pendingJobs: state.pendingJobs.map((job) =>
          job.id === jobId ? { ...job, ...updates } : job
        ),
      }));
    } catch (error) {
      console.error("Failed to edit job:", error);
      throw error;
    }
  },

  fetchPendingMatches: async (jobId?: string) => {
    set({ loadingMatches: true });
    try {
      const url = jobId
        ? `/admin/matches?status=pending_spotter&job_id=${jobId}`
        : "/admin/matches?status=pending_spotter";
      const res = await api.get(url);
      // ✅ admin/matches returns { matches: [...] }
      set({ pendingMatches: res.data.matches || [] });
    } catch (error) {
      console.error("Failed to fetch pending matches:", error);
      set({ pendingMatches: [] });
    } finally {
      set({ loadingMatches: false });
    }
  },

  approveMatch: async (matchId: string) => {
    try {
      // ✅ Fixed: matches @router.post("/matches/{match_id}/approve") under /admin prefix
      await api.post(`/admin/matches/${matchId}/approve`, {});
      set((state) => ({
        pendingMatches: state.pendingMatches.map((match) =>
          match.id === matchId ? { ...match, status: "approved" } : match
        ),
      }));
    } catch (error) {
      console.error("Failed to approve match:", error);
      throw error;
    }
  },

  rejectMatch: async (matchId: string, reason: string) => {
    try {
      // ✅ Fixed: matches @router.post("/matches/{match_id}/reject") under /admin prefix
      await api.post(`/admin/matches/${matchId}/reject`, { notes: reason });
      set((state) => ({
        pendingMatches: state.pendingMatches.map((match) =>
          match.id === matchId ? { ...match, status: "rejected" } : match
        ),
      }));
    } catch (error) {
      console.error("Failed to reject match:", error);
      throw error;
    }
  },

  setSelectedJobId: (id: string | null) => set({ selectedJobId: id }),
  setFilterStatus: (status) => set({ filterStatus: status }),
}));





// // C:\Users\Melody\Desktop\spotter_dashboards\spotter\frontend\src\store\approvalStore.ts

// import { create } from "zustand";
// import api from "@/lib/api";

// export interface PendingJob {
//   id: string;
//   title: string;
//   company?: string;
//   description: string;
//   status: "pending_approval" | "approved" | "rejected";
//   created_at: string;
//   created_by?: string;
//   auto_matched_count?: number;
//   edits_suggested?: number;
// }

// export interface ApprovalMatch {
//   id: string;
//   job_id: string;
//   candidate_id: string;
//   candidate_name?: string;
//   match_score: number;
//   status: "pending_approval" | "approved" | "rejected";
//   created_at: string;
// }

// interface ApprovalStore {
//   pendingJobs: PendingJob[];
//   loadingPendingJobs: boolean;
//   fetchPendingJobs: () => Promise<void>;
//   approveJob: (jobId: string, edits?: Record<string, any>) => Promise<void>;
//   rejectJob: (jobId: string, reason: string) => Promise<void>;
//   editJob: (jobId: string, updates: Record<string, any>) => Promise<void>;

//   pendingMatches: ApprovalMatch[];
//   loadingMatches: boolean;
//   fetchPendingMatches: (jobId?: string) => Promise<void>;
//   approveMatch: (matchId: string) => Promise<void>;
//   rejectMatch: (matchId: string, reason: string) => Promise<void>;

//   selectedJobId: string | null;
//   setSelectedJobId: (id: string | null) => void;
//   // ✅ Fixed: use "pending_approval" to match backend status values
//   filterStatus: "all" | "pending_approval" | "approved" | "rejected";
//   setFilterStatus: (status: "all" | "pending_approval" | "approved" | "rejected") => void;
// }

// export const useApprovalStore = create<ApprovalStore>((set, get) => ({
//   pendingJobs: [],
//   loadingPendingJobs: false,
//   pendingMatches: [],
//   loadingMatches: false,
//   selectedJobId: null,
//   filterStatus: "pending_approval", // ✅ Fixed default

//   fetchPendingJobs: async () => {
//     set({ loadingPendingJobs: true });
//     try {
//       const res = await api.get("/jobs/pending-approval");
//       set({ pendingJobs: res.data.jobs || res.data || [] });
//     } catch (error) {
//       console.error("Failed to fetch pending jobs:", error);
//       set({ pendingJobs: [] });
//     } finally {
//       set({ loadingPendingJobs: false });
//     }
//   },

//   approveJob: async (jobId: string, edits?: Record<string, any>) => {
//     try {
//       const payload = edits ? { edits } : {};
//       await api.post(`/jobs/${jobId}/approve`, payload);
//       set((state) => ({
//         pendingJobs: state.pendingJobs.map((job) =>
//           job.id === jobId ? { ...job, status: "approved" } : job
//         ),
//       }));
//     } catch (error) {
//       console.error("Failed to approve job:", error);
//       throw error;
//     }
//   },

//   rejectJob: async (jobId: string, reason: string) => {
//     try {
//       await api.post(`/jobs/${jobId}/reject`, { reason });
//       set((state) => ({
//         pendingJobs: state.pendingJobs.map((job) =>
//           job.id === jobId ? { ...job, status: "rejected" } : job
//         ),
//       }));
//     } catch (error) {
//       console.error("Failed to reject job:", error);
//       throw error;
//     }
//   },

//   editJob: async (jobId: string, updates: Record<string, any>) => {
//     try {
//       await api.post(`/jobs/${jobId}/edit`, updates);
//       set((state) => ({
//         pendingJobs: state.pendingJobs.map((job) =>
//           job.id === jobId ? { ...job, ...updates } : job
//         ),
//       }));
//     } catch (error) {
//       console.error("Failed to edit job:", error);
//       throw error;
//     }
//   },

//   fetchPendingMatches: async (jobId?: string) => {
//     set({ loadingMatches: true });
//     try {
//       const url = jobId ? `/matches/pending?job_id=${jobId}` : "/matches/pending";
//       const res = await api.get(url);
//       set({ pendingMatches: res.data.matches || res.data || [] });
//     } catch (error) {
//       console.error("Failed to fetch pending matches:", error);
//       set({ pendingMatches: [] });
//     } finally {
//       set({ loadingMatches: false });
//     }
//   },

//   approveMatch: async (matchId: string) => {
//     try {
//       await api.post(`/matches/${matchId}/approve`);
//       set((state) => ({
//         pendingMatches: state.pendingMatches.map((match) =>
//           match.id === matchId ? { ...match, status: "approved" } : match
//         ),
//       }));
//     } catch (error) {
//       console.error("Failed to approve match:", error);
//       throw error;
//     }
//   },

//   rejectMatch: async (matchId: string, reason: string) => {
//     try {
//       await api.post(`/matches/${matchId}/reject`, { reason });
//       set((state) => ({
//         pendingMatches: state.pendingMatches.map((match) =>
//           match.id === matchId ? { ...match, status: "rejected" } : match
//         ),
//       }));
//     } catch (error) {
//       console.error("Failed to reject match:", error);
//       throw error;
//     }
//   },

//   setSelectedJobId: (id: string | null) => set({ selectedJobId: id }),

//   setFilterStatus: (status) => set({ filterStatus: status }),
// }));