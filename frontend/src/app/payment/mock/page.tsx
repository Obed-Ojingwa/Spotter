// C:\Users\Melody\Documents\Spotter\frontend\src\app\payment\mock\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, CreditCard } from "lucide-react";
import { paymentsApi } from "@/lib/api";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function MockPaymentPage() {
  const searchParams = useSearchParams();
  const { user }     = useAuthStore();
  const [processing, setProcessing] = useState(false);
  const [done,       setDone]       = useState(false);

  const reference = searchParams.get("ref") ?? "";

  async function handlePay() {
    if (!reference) return;
    setProcessing(true);
    try {
      await paymentsApi.verify(reference);
      setDone(true);
    } catch {
      setDone(true); // dev mode always succeeds
    } finally {
      setProcessing(false);
    }
  }

  const returnPath = user?.role === "seeker" ? "/seeker/matches"
    : user?.role === "org" ? "/org/candidates"
    : "/";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="card max-w-sm w-full text-center space-y-5 py-12">

          {done ? (
            <>
              <CheckCircle size={56} className="text-green-500 mx-auto" />
              <h2 className="text-xl font-black text-gray-900">Payment Approved</h2>
              <p className="text-sm text-gray-400">(Dev mode — no real charge)</p>
              <Link href={returnPath} className="btn-primary inline-block">
                Continue
              </Link>
            </>
          ) : (
            <>
              <div className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1.5 rounded-full inline-block">
                DEV MODE — No real payment
              </div>
              <CreditCard size={48} className="text-gray-300 mx-auto" />
              <h2 className="text-xl font-black text-gray-900">Mock Payment</h2>
              <p className="text-sm text-gray-500">
                This simulates a Paystack payment without charging a real card.
                Click below to approve instantly.
              </p>
              <p className="text-xs font-mono text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
                ref: {reference || "none"}
              </p>
              <button
                onClick={handlePay}
                disabled={processing || !reference}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {processing
                  ? <Loader2 size={16} className="animate-spin" />
                  : <CheckCircle size={16} />
                }
                {processing ? "Processing…" : "Approve Payment"}
              </button>
            </>
          )}

        </div>
      </div>
    </>
  );
}
