// C:\Users\Melody\Documents\Spotter\frontend\src\app\admin\users\page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Search, ArrowLeft, Loader2,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
  ShieldCheck
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface UserRow {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLES = ["all", "seeker", "org", "agent", "spotter", "admin", "super_admin"];

const ROLE_CONFIG: Record<string, { cls: string; label: string }> = {
  seeker:      { cls: "bg-blue-100 text-blue-700",    label: "Seeker"      },
  org:         { cls: "bg-purple-100 text-purple-700", label: "Org"        },
  agent:       { cls: "bg-amber-100 text-amber-700",  label: "Agent"       },
  spotter:     { cls: "bg-teal-100 text-teal-700",    label: "Spotter"     },
  admin:       { cls: "bg-red-100 text-red-700",      label: "Admin"       },
  super_admin: { cls: "bg-red-200 text-red-900",      label: "Super Admin" },
};

// ── Page ───────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [users,      setUsers]      = useState<UserRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [toggling,   setToggling]   = useState<string | null>(null);

  const LIMIT = 20;

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (!["admin", "super_admin"].includes(user?.role ?? "")) {
      router.push("/");
    }
  }, [isLoggedIn, user, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (roleFilter !== "all") params.role = roleFilter;
      const res = await adminApi.listUsers(params);
      setUsers(res.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter]);

  useEffect(() => {
    if (isLoggedIn() && ["admin", "super_admin"].includes(user?.role ?? "")) {
      fetchUsers();
    }
  }, [fetchUsers, isLoggedIn, user]);

  // Client-side search filter on top of server results
  const displayed = users.filter(
    (u) =>
      search === "" ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleToggleStatus(userId: string, currentActive: boolean) {
    setToggling(userId);
    try {
      await adminApi.toggleUserStatus(userId, !currentActive);
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, is_active: !currentActive } : u)
      );
      toast.success(
        currentActive ? "User disabled." : "User re-enabled."
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update user status.");
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                View, filter, enable and disable platform users
              </p>
            </div>
          </div>

          {/* Filters bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email..."
                className="input pl-9 text-sm py-2"
              />
            </div>

            {/* Role tabs */}
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => { setRoleFilter(r); setPage(1); }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize",
                    roleFilter === r
                      ? "bg-red-700 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-red-300"
                  )}
                >
                  {r.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={28} className="animate-spin text-red-600" />
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-16">
                <Users size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">No users found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Email", "Role", "Status", "Joined", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayed.map((u) => (
                    <UserTableRow
                      key={u.id}
                      user={u}
                      currentUserRole={user?.role ?? ""}
                      toggling={toggling === u.id}
                      onToggle={() => handleToggleStatus(u.id, u.is_active)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loading && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {displayed.length} user{displayed.length !== 1 ? "s" : ""}
                {roleFilter !== "all" && ` · ${roleFilter}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-600 font-medium px-2">
                  Page {page}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={users.length < LIMIT}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ── UserTableRow ───────────────────────────────────────────────────────────
function UserTableRow({
  user, currentUserRole, toggling, onToggle,
}: {
  user: UserRow;
  currentUserRole: string;
  toggling: boolean;
  onToggle: () => void;
}) {
  const roleCfg = ROLE_CONFIG[user.role] ?? { cls: "bg-gray-100 text-gray-500", label: user.role };

  // Admins cannot disable other admins — only super_admin can
  const canToggle =
    !["admin", "super_admin"].includes(user.role) ||
    currentUserRole === "super_admin";

  const joinedDaysAgo = Math.floor(
    (Date.now() - new Date(user.created_at).getTime()) / 86400000
  );

  return (
    <tr className={cn(
      "hover:bg-gray-50 transition-colors",
      !user.is_active && "opacity-50"
    )}>
      {/* Email */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          {user.role === "super_admin" && (
            <ShieldCheck size={14} className="text-red-500 shrink-0" />
          )}
          <span className="text-gray-900 font-medium">{user.email}</span>
        </div>
      </td>

      {/* Role */}
      <td className="px-5 py-3.5">
        <span className={cn(
          "text-xs px-2.5 py-1 rounded-full font-semibold",
          roleCfg.cls
        )}>
          {roleCfg.label}
        </span>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        {user.is_active ? (
          <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle size={14} /> Active
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-red-400 text-sm font-medium">
            <XCircle size={14} /> Disabled
          </span>
        )}
      </td>

      {/* Joined */}
      <td className="px-5 py-3.5 text-gray-400 text-xs">
        {joinedDaysAgo === 0
          ? "Today"
          : joinedDaysAgo < 30
          ? `${joinedDaysAgo}d ago`
          : new Date(user.created_at).toLocaleDateString("en-NG", {
              day: "numeric", month: "short", year: "numeric",
            })}
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5">
        {canToggle ? (
          <button
            onClick={onToggle}
            disabled={toggling}
            className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
              user.is_active
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-green-50 text-green-700 hover:bg-green-100",
              toggling && "opacity-50 cursor-not-allowed"
            )}
          >
            {toggling
              ? "..."
              : user.is_active
              ? "Disable"
              : "Enable"}
          </button>
        ) : (
          <span className="text-xs text-gray-300">Protected</span>
        )}
      </td>
    </tr>
  );
}
