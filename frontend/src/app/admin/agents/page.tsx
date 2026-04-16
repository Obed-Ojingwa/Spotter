// C:\Users\Melody\Documents\Spotter\frontend\src\app\admin\agents\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Search, Loader2, Star,
  CheckCircle, XCircle, ChevronLeft, ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

interface AgentRow {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminAgentsPage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [agents,   setAgents]   = useState<AgentRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [toggling, setToggling] = useState<string | null>(null);
  const LIMIT = 20;

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (!["admin", "super_admin"].includes(user?.role ?? "")) { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  useEffect(() => {
    if (!isLoggedIn()) return;
    setLoading(true);
    adminApi.listUsers({ role: "agent", page, limit: LIMIT })
      .then((r) => setAgents(r.data))
      .catch(() => toast.error("Failed to load agents"))
      .finally(() => setLoading(false));
  }, [page, isLoggedIn]);

  const displayed = agents.filter((a) =>
    search === "" || a.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleToggle(agentId: string, current: boolean) {
    setToggling(agentId);
    try {
      await adminApi.toggleUserStatus(agentId, !current);
      setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, is_active: !current } : a));
      toast.success(current ? "Agent disabled." : "Agent re-enabled.");
    } catch {
      toast.error("Failed to update agent.");
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Agent Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                View and manage all platform agents
              </p>
            </div>
            <Link href="/admin/promotions" className="ml-auto btn-primary flex items-center gap-2 text-sm">
              <Star size={14} /> Grant Points
            </Link>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email…" className="input pl-9 text-sm py-2" />
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={28} className="animate-spin text-red-600" />
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Star size={36} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm">No agents found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Email", "Status", "Joined", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayed.map((agent) => {
                    const daysAgo = Math.floor(
                      (Date.now() - new Date(agent.created_at).getTime()) / 86400000
                    );
                    return (
                      <tr key={agent.id} className={cn("hover:bg-gray-50", !agent.is_active && "opacity-50")}>
                        <td className="px-5 py-3.5 font-medium text-gray-900">{agent.email}</td>
                        <td className="px-5 py-3.5">
                          {agent.is_active ? (
                            <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                              <CheckCircle size={14} /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-red-400 text-sm font-medium">
                              <XCircle size={14} /> Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs">
                          {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleToggle(agent.id, agent.is_active)}
                            disabled={toggling === agent.id}
                            className={cn(
                              "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                              agent.is_active
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-green-50 text-green-700 hover:bg-green-100",
                              toggling === agent.id && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {toggling === agent.id ? "…" : agent.is_active ? "Disable" : "Enable"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loading && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {displayed.length} agent{displayed.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium px-2">Page {page}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={agents.length < LIMIT}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40">
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
