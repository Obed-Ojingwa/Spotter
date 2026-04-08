import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Auto-attach access token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem("auth-storage");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const token = parsed?.state?.accessToken;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch {}
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const raw = localStorage.getItem("auth-storage");
        const parsed = JSON.parse(raw || "{}");
        const refreshToken = parsed?.state?.refreshToken;
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { useAuthStore } = await import("@/store/authStore");
          useAuthStore.getState().setAuth(
            data.access_token,
            data.refresh_token,
            parsed.state.user
          );
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        }
      } catch {}
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; role: string; referral_code?: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  refresh: (refresh_token: string) =>
    api.post("/auth/refresh", { refresh_token }),
};

// ── Jobs ──────────────────────────────────────────────
export const jobsApi = {
  list: (params?: { q?: string; city?: string; state?: string; work_mode?: string; page?: number; limit?: number }) =>
    api.get("/jobs", { params }),
  get: (id: string) => api.get(`/jobs/${id}`),
  create: (data: object) => api.post("/jobs", data),
  close: (id: string) => api.delete(`/jobs/${id}`),
};

// ── Seeker ────────────────────────────────────────────
export const seekerApi = {
  getProfile: () => api.get("/seeker/profile"),
  updateProfile: (data: object) => api.put("/seeker/profile", data),
};

// ── Matching ──────────────────────────────────────────
export const matchingApi = {
  trigger: (job_id: string) => api.post("/matching/trigger", { job_id }),
  myMatches: () => api.get("/matching/my-matches"),
  candidates: (job_id: string) => api.get(`/matching/job/${job_id}/candidates`),
  getWeights: () => api.get("/matching/weights"),
  updateWeights: (data: Record<string, number>) => api.put("/matching/weights", data),
};

// ── Spotter ───────────────────────────────────────────
export const spotterApi = {
  getQueue: () => api.get("/spotter/queue"),
  review: (id: string, data: { approved: boolean; notes?: string }) =>
    api.post(`/spotter/review/${id}`, data),
  getStats: () => api.get("/spotter/stats"),
};

// ── Agent ─────────────────────────────────────────────
export const agentApi = {
  getDashboard: () => api.get("/agent/dashboard"),
  getPointsHistory: () => api.get("/agent/points/history"),
  getReferrals: () => api.get("/agent/referrals"),
  convertPoints: (points: number) => api.post("/agent/points/convert", { points }),
};

// ── Payments ──────────────────────────────────────────
export const paymentsApi = {
  initiate: (data: { purpose: string; job_id?: string }) =>
    api.post("/payments/initiate", data),
  verify: (ref: string) => api.get(`/payments/verify/${ref}`),
};

// ── Org ───────────────────────────────────────────────
export const orgApi = {
  getProfile: () => api.get("/org/profile"),
  updateProfile: (data: object) => api.put("/org/profile", data),
};

// ── Admin ─────────────────────────────────────────────
export const adminApi = {
  getStats: () => api.get("/admin/stats"),
  getUsers: (params?: { role?: string }) => api.get("/admin/users", { params }),
  setUserStatus: (id: string, is_active: boolean) =>
    api.put(`/admin/users/${id}/status`, { is_active }),
  setUserRole: (id: string, role: string) =>
    api.put(`/admin/users/${id}/role`, { role }),
  bonusPoints: (data: { agent_id?: string; points: number; reason: string }) =>
    api.post("/admin/promotions/bonus-points", data),
  getPayments: (params?: { status?: string }) =>
    api.get("/admin/payments", { params }),
  approvePayout: (id: string) =>
    api.post(`/admin/payments/${id}/approve-payout`),
};

export default api;

// import axios from "axios";

// const api = axios.create({
//   baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
//   headers: { "Content-Type": "application/json" },
// });

// // Attach token to every request
// api.interceptors.request.use((config) => {
//   if (typeof window !== "undefined") {
//     const token = localStorage.getItem("access_token");
//     if (token) config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// // Auto-refresh on 401
// api.interceptors.response.use(
//   (res) => res,
//   async (error) => {
//     if (error.response?.status === 401 && typeof window !== "undefined") {
//       const refresh = localStorage.getItem("refresh_token");
//       if (refresh) {
//         try {
//           const { data } = await axios.post(
//             `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
//             { refresh_token: refresh }
//           );
//           localStorage.setItem("access_token", data.access_token);
//           localStorage.setItem("refresh_token", data.refresh_token);
//           error.config.headers.Authorization = `Bearer ${data.access_token}`;
//           return api.request(error.config);
//         } catch {
//           localStorage.clear();
//           window.location.href = "/login";
//         }
//       }
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;

// // ── Typed API helpers ─────────────────────────────────────────────────────

// export const authApi = {
//   login: (email: string, password: string) =>
//     api.post("/auth/login", { email, password }),
//   register: (email: string, password: string, role: string, referral_code?: string) =>
//     api.post("/auth/register", { email, password, role, referral_code }),
//   refresh: (refresh_token: string) =>
//     api.post("/auth/refresh", { refresh_token }),
// };

// export const jobsApi = {
//   list: (params?: object) => api.get("/jobs", { params }),
//   get: (id: string) => api.get(`/jobs/${id}`),
//   create: (data: object) => api.post("/jobs", data),
//   delete: (id: string) => api.delete(`/jobs/${id}`),
// };

// export const seekerApi = {
//   getProfile: () => api.get("/seeker/profile"),
//   updateProfile: (data: object) => api.put("/seeker/profile", data),
//   getMatches: () => api.get("/matching/my-matches"),
//   triggerMatch: (job_id: string) => api.post("/matching/trigger", { job_id }),
// };

// export const orgApi = {
//   getCandidates: (job_id: string) => api.get(`/matching/job/${job_id}/candidates`),
// };

// export const agentApi = {
//   getDashboard: () => api.get("/agent/dashboard"),
//   getPointsHistory: () => api.get("/agent/points/history"),
//   getReferrals: () => api.get("/agent/referrals"),
//   convertPoints: (data: object) => api.post("/agent/points/convert", data),
// };

// export const spotterApi = {
//   getQueue: () => api.get("/spotter/queue"),
//   review: (match_id: string, approved: boolean, notes?: string) =>
//     api.post(`/spotter/review/${match_id}`, { approved, notes }),
//   getStats: () => api.get("/spotter/stats"),
// };

// export const adminApi = {
//   getStats: () => api.get("/admin/stats"),
//   listUsers: (params?: object) => api.get("/admin/users", { params }),
//   toggleUserStatus: (id: string, is_active: boolean) =>
//     api.put(`/admin/users/${id}/status`, { is_active }),
//   grantBonusPoints: (data: object) => api.post("/admin/promotions/bonus-points", data),
//   listPayments: (params?: object) => api.get("/admin/payments", { params }),
//   approvePayout: (id: string) => api.post(`/admin/payments/${id}/approve-payout`),
// };

// export const paymentsApi = {
//   initiate: (purpose: string, metadata?: object) =>
//     api.post("/payments/initiate", { purpose, metadata }),
//   verify: (reference: string) => api.get(`/payments/verify/${reference}`),
// };