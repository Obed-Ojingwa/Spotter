// C:\Users\Melody\Documents\Spotter\frontend\src\lib\api.ts

import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

// ── Attach JWT token to every request ─────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-refresh on 401 ───────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      typeof window !== "undefined"
    ) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
            { refresh_token: refresh }
          );
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api.request(original);
        } catch {
          localStorage.clear();
          // Clear role cookie
          document.cookie = "spotter_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (
    email: string,
    password: string,
    role: string,
    referral_code?: string
  ) => api.post("/auth/register", { email, password, role, referral_code }),
  refresh: (refresh_token: string) =>
    api.post("/auth/refresh", { refresh_token }),
};

// ── Jobs ──────────────────────────────────────────────────────────────────
export const jobsApi = {
  list:   (params?: object)       => api.get("/jobs", { params }),
  get:    (id: string)            => api.get(`/jobs/${id}`),
  create: (data: object)          => api.post("/jobs", data),
  delete: (id: string)            => api.delete(`/jobs/${id}`),
};

// ── Job Seeker ────────────────────────────────────────────────────────────
export const seekerApi = {
  getProfile:    ()              => api.get("/seeker/profile"),
  updateProfile: (data: object) => api.put("/seeker/profile", data),
  /** PDF or Word, max 5MB — uses multipart/form-data */
  uploadCv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/seeker/upload-cv", form);
  },
  getMatches:    ()              => api.get("/matching/my-matches"),
  triggerMatch:  (job_id: string) => api.post("/matching/trigger", { job_id }),
  getApplications: ()            => api.get("/applications/mine"),
};

// ── Organisation ──────────────────────────────────────────────────────────
export const orgApi = {
  getProfile:    ()              => api.get("/org/profile"),
  updateProfile: (data: object) => api.put("/org/profile", data),
  listJobs:      (params?: object) => api.get("/org/jobs", { params }),
  getJobMatchCounts: () => api.get("/matching/org/job-match-counts"),
  getCandidates: (job_id: string) =>
    api.get(`/matching/job/${job_id}/candidates`),
};

// ── Agent ─────────────────────────────────────────────────────────────────
export const agentApi = {
  getDashboard:   ()              => api.get("/agent/dashboard"),
  getPointsHistory: ()            => api.get("/agent/points/history"),
  getReferrals:   ()              => api.get("/agent/referrals"),
  listOrgs:       (params?: object) => api.get("/agent/orgs", { params }),
  convertPoints:  (data: object) => api.post("/agent/points/convert", data),
};

// ── Spotter ───────────────────────────────────────────────────────────────
export const spotterApi = {
  getQueue: ()                                          => api.get("/spotter/queue"),
  review:   (match_id: string, approved: boolean, notes?: string) =>
    api.post(`/spotter/review/${match_id}`, { approved, notes }),
  getStats: ()                                          => api.get("/spotter/stats"),
};

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminApi = {
  getStats:       ()              => api.get("/admin/stats"),
  listUsers:      (params?: object) => api.get("/admin/users", { params }),
  toggleUserStatus: (id: string, is_active: boolean) =>
    api.put(`/admin/users/${id}/status`, { is_active }),
  changeUserRole: (id: string, role: string) =>
    api.put(`/admin/users/${id}/role`, { role }),
  grantBonusPoints: (data: object) =>
    api.post("/admin/promotions/bonus-points", data),
  listPayments:   (params?: object) => api.get("/admin/payments", { params }),
  approvePayout:  (id: string)    => api.post(`/admin/payments/${id}/approve-payout`),
  getAnalytics:   ()              => api.get("/admin/analytics"),
};

// ── Payments ──────────────────────────────────────────────────────────────
export const paymentsApi = {
  initiate: (purpose: string, metadata?: object) =>
    api.post("/payments/initiate", { purpose, metadata }),
  verify:   (reference: string) =>
    api.get(`/payments/verify/${reference}`),
};
