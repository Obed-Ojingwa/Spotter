// C:\Users\Melody\Documents\Spotter\frontend\src\app\admin\dashboard\page.tsx
// Smart router — reads role from RBAC API and redirects to correct dashboard

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

export default function AdminDashboardRouter() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (!["admin", "super_admin"].includes(user?.role ?? "")) {
      router.push("/"); return;
    }
    routeToDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user]);

  async function routeToDashboard() {
    // 1. Super Admin (legacy role) → always to super dashboard
    if (user?.role === "super_admin") {
      router.replace("/admin/super"); return;
    }

    // 2. For "admin" legacy role, check RBAC primary role for finer distinction
    try {
      const res = await api.get("/rbac/me/permissions");
      const primaryRole: string = res.data.primary_role ?? "admin";

      if (primaryRole === "super_admin") {
        router.replace("/admin/super");
      } else if (primaryRole === "executive_admin") {
        router.replace("/admin/executive");
      } else {
        router.replace("/admin/overview");
      }
    } catch {
      // RBAC not available — fall back to legacy role
      router.replace("/admin/overview");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-3">
      <Loader2 size={32} className="animate-spin text-red-600" />
      <p className="text-sm text-gray-400">Loading your dashboard…</p>
    </div>
  );
}
