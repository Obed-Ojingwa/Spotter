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
import api, { adminApi } from "@/lib/api";
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

interface RbacRole {
  id: number;
  name: string;
  slug: string;
  hierarchy_level: number;
  is_system: boolean;
}

interface UserRoleAssignment {
  role_id: number;
  role_name: string;
  role_slug: string;
  is_primary: boolean;
  is_temp: boolean;
  is_permanent: boolean;
  expires_at: string | null;
  is_expired: boolean;
  assigned_at: string;
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

  const [rbacPerms, setRbacPerms] = useState<string[]>([]);
  const [rbacRoles, setRbacRoles] = useState<RbacRole[]>([]);

  const [managingUser, setManagingUser] = useState<UserRow | null>(null);
  const [roleAssignments, setRoleAssignments] = useState<UserRoleAssignment[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roleActionLoading, setRoleActionLoading] = useState<string | null>(null);

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

  // RBAC capabilities + roles list (for role manager UI)
  useEffect(() => {
    if (!isLoggedIn()) return;
    (async () => {
      try {
        const [permsRes, rolesRes] = await Promise.all([
          api.get("/rbac/me/permissions"),
          api.get("/rbac/roles"),
        ]);
        setRbacPerms(permsRes.data?.permissions ?? []);
        setRbacRoles(rolesRes.data ?? []);
      } catch {
        // Non-blocking; page can still load user list
      }
    })();
  }, [isLoggedIn]);

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

  const canManageRoles =
    rbacPerms.includes("assign_role") || rbacPerms.includes("remove_role");

  async function openRoleManager(u: UserRow) {
    if (!canManageRoles) {
      toast.error("You don’t have permission to manage roles.");
      return;
    }
    setManagingUser(u);
    setRolesLoading(true);
    try {
      const res = await api.get(`/rbac/users/${u.id}/roles`);
      setRoleAssignments(res.data?.roles ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to load user roles.");
      setRoleAssignments([]);
    } finally {
      setRolesLoading(false);
    }
  }

  async function assignRole(roleSlug: string, isPrimary: boolean) {
    if (!managingUser) return;
    setRoleActionLoading(`${roleSlug}:${isPrimary ? "primary" : "add"}`);
    try {
      const res = await api.post(`/rbac/users/${managingUser.id}/assign-role`, {
        role_slug: roleSlug,
        is_primary: isPrimary,
      });
      toast.success(res.data?.message || "Role updated");
      const refreshed = await api.get(`/rbac/users/${managingUser.id}/roles`);
      setRoleAssignments(refreshed.data?.roles ?? []);
      // Refresh list so legacy role badge stays closer to reality (if your backend syncs it)
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to assign role.");
    } finally {
      setRoleActionLoading(null);
    }
  }

  async function removeRole(roleSlug: string) {
    if (!managingUser) return;
    setRoleActionLoading(`${roleSlug}:remove`);
    try {
      const res = await api.post(`/rbac/users/${managingUser.id}/remove-role`, {
        role_slug: roleSlug,
      });
      toast.success(res.data?.message || "Role removed");
      const refreshed = await api.get(`/rbac/users/${managingUser.id}/roles`);
      setRoleAssignments(refreshed.data?.roles ?? []);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to remove role.");
    } finally {
      setRoleActionLoading(null);
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
                      onManageRoles={() => openRoleManager(u)}
                      canManageRoles={canManageRoles}
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

      {/* Role manager modal */}
      {managingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Manage Roles
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {managingUser.email}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Assign, remove, or set a primary role.
                </p>
              </div>
              <button
                onClick={() => { setManagingUser(null); setRoleAssignments([]); }}
                className="text-sm font-semibold text-gray-500 hover:text-gray-900"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!canManageRoles ? (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-600">
                  You don’t have permission to manage roles.
                </div>
              ) : rolesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={22} className="animate-spin text-red-600" />
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Current assigned roles
                    </p>
                    {roleAssignments.length === 0 ? (
                      <p className="text-sm text-gray-500">No roles assigned.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {roleAssignments
                          .filter((r) => !r.is_expired)
                          .map((r) => (
                            <span
                              key={r.role_slug}
                              className={cn(
                                "text-xs px-2.5 py-1 rounded-full font-semibold border",
                                r.is_primary
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-white text-gray-600 border-gray-200"
                              )}
                            >
                              {r.role_slug.replace("_", " ")}
                              {r.is_primary ? " · primary" : ""}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="card p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Change roles
                    </p>

                    <div className="grid sm:grid-cols-2 gap-3">
                      {rbacRoles
                        .filter((r) => !["seeker"].includes(r.slug)) // keep seeker manageable but less noisy
                        .map((role) => {
                          const assigned = roleAssignments.some((a) => a.role_slug === role.slug && !a.is_expired);
                          const primary = roleAssignments.some((a) => a.role_slug === role.slug && a.is_primary && !a.is_expired);

                          return (
                            <div key={role.slug} className="border border-gray-100 rounded-xl p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {role.name}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {role.slug}
                                  </p>
                                </div>
                                {primary && (
                                  <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                                    Primary
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2 mt-3">
                                {!assigned ? (
                                  <>
                                    <button
                                      onClick={() => assignRole(role.slug, false)}
                                      disabled={roleActionLoading !== null}
                                      className={cn(
                                        "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
                                        "bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:text-red-700",
                                        roleActionLoading && "opacity-50 cursor-not-allowed"
                                      )}
                                    >
                                      Assign
                                    </button>
                                    <button
                                      onClick={() => assignRole(role.slug, true)}
                                      disabled={roleActionLoading !== null}
                                      className={cn(
                                        "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                                        "bg-red-700 text-white hover:bg-red-800",
                                        roleActionLoading && "opacity-50 cursor-not-allowed"
                                      )}
                                    >
                                      Assign as primary
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => assignRole(role.slug, true)}
                                      disabled={primary || roleActionLoading !== null}
                                      className={cn(
                                        "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
                                        primary
                                          ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed"
                                          : "bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:text-red-700",
                                        roleActionLoading && "opacity-50 cursor-not-allowed"
                                      )}
                                    >
                                      Make primary
                                    </button>
                                    <button
                                      onClick={() => removeRole(role.slug)}
                                      disabled={roleActionLoading !== null}
                                      className={cn(
                                        "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                                        "bg-red-50 text-red-600 hover:bg-red-100",
                                        roleActionLoading && "opacity-50 cursor-not-allowed"
                                      )}
                                    >
                                      Remove
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="text-xs text-gray-400">
                    Note: Executive Admin cannot modify Super Admin or fellow Executive Admin users.
                    Super Admin can modify all users.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── UserTableRow ───────────────────────────────────────────────────────────
function UserTableRow({
  user, currentUserRole, toggling, onToggle, onManageRoles, canManageRoles,
}: {
  user: UserRow;
  currentUserRole: string;
  toggling: boolean;
  onToggle: () => void;
  onManageRoles: () => void;
  canManageRoles: boolean;
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
        <div className="flex items-center gap-2">
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

          <button
            onClick={onManageRoles}
            disabled={!canManageRoles}
            className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
              canManageRoles
                ? "bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:text-red-700"
                : "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
            )}
          >
            Manage roles
          </button>
        </div>
      </td>
    </tr>
  );
}
