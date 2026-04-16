// C:\Users\Melody\Documents\Spotter\frontend\src\app\admin\reports\page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  payer_type: string;
  purpose: string;
  amount_naira: number;
  status: string;
  reference: string;
  paid_at: string | null;
  created_at: string;
}

const STATUS_FILTER = ["all", "success", "pending", "failed"];

export default function AdminReportsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");

  useEffect(() => {
    adminApi.listPayments({ limit: 100 })
      .then((r) => setPayments(r.data))
      .catch(() => toast.error("Failed to load payments"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = payments.filter((p) => filter === "all" || p.status === filter);

  const totalRevenue = payments
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + p.amount_naira, 0);

  function exportCSV() {
    const headers = ["Reference","Payer Type","Purpose","Amount (₦)","Status","Date"];
    const rows = filtered.map((p) => [
      p.reference, p.payer_type, p.purpose.replace(/_/g, " "),
      p.amount_naira, p.status,
      new Date(p.created_at).toLocaleDateString("en-NG"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `spotter-payments-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  }

  const statusCls: Record<string, string> = {
    success: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    failed:  "bg-red-100 text-red-500",
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                <ArrowLeft size={20} className="text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Payment Reports</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  All platform transactions · Total revenue: <strong className="text-green-700">
                    ₦{totalRevenue.toLocaleString()}
                  </strong>
                </p>
              </div>
            </div>
            <button onClick={exportCSV} className="btn-primary flex items-center gap-2 text-sm">
              <Download size={15} /> Export CSV
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTER.map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize",
                  filter === s ? "bg-red-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-red-300"
                )}>
                {s} {s !== "all" && `(${payments.filter((p) => p.status === s).length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-red-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <DollarSign size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400">No payments found</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Reference","Type","Purpose","Amount","Status","Date"].map((h) => (
                      <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.reference}</td>
                      <td className="px-4 py-3 capitalize text-gray-700">{p.payer_type}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{p.purpose.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">₦{p.amount_naira.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold capitalize",
                          statusCls[p.status] ?? "bg-gray-100 text-gray-500")}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(p.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
