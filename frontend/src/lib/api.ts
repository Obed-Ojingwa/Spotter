import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
            { refresh_token: refresh }
          );
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api.request(error.config);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Typed API helpers ─────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (email: string, password: string, role: string, referral_code?: string) =>
    api.post("/auth/register", { email, password, role, referral_code }),
  refresh: (refresh_token: string) =>
    api.post("/auth/refresh", { refresh_token }),
};

export const jobsApi = {
  list: (params?: object) => api.get("/jobs", { params }),
  get: (id: string) => api.get(`/jobs/${id}`),
  create: (data: object) => api.post("/jobs", data),
  delete: (id: string) => api.delete(`/jobs/${id}`),
};

export const seekerApi = {
  getProfile: () => api.get("/seeker/profile"),
  updateProfile: (data: object) => api.put("/seeker/profile", data),
  getMatches: () => api.get("/matching/my-matches"),
  triggerMatch: (job_id: string) => api.post("/matching/trigger", { job_id }),
};

export const orgApi = {
  getCandidates: (job_id: string) => api.get(`/matching/job/${job_id}/candidates`),
};

export const agentApi = {
  getDashboard: () => api.get("/agent/dashboard"),
  getPointsHistory: () => api.get("/agent/points/history"),
  getReferrals: () => api.get("/agent/referrals"),
  convertPoints: (data: object) => api.post("/agent/points/convert", data),
};

export const spotterApi = {
  getQueue: () => api.get("/spotter/queue"),
  review: (match_id: string, approved: boolean, notes?: string) =>
    api.post(`/spotter/review/${match_id}`, { approved, notes }),
  getStats: () => api.get("/spotter/stats"),
};

export const adminApi = {
  getStats: () => api.get("/admin/stats"),
  listUsers: (params?: object) => api.get("/admin/users", { params }),
  toggleUserStatus: (id: string, is_active: boolean) =>
    api.put(`/admin/users/${id}/status`, { is_active }),
  grantBonusPoints: (data: object) => api.post("/admin/promotions/bonus-points", data),
  listPayments: (params?: object) => api.get("/admin/payments", { params }),
  approvePayout: (id: string) => api.post(`/admin/payments/${id}/approve-payout`),
};

export const paymentsApi = {
  initiate: (purpose: string, metadata?: object) =>
    api.post("/payments/initiate", { purpose, metadata }),
  verify: (reference: string) => api.get(`/payments/verify/${reference}`),
};