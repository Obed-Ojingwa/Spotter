// C:\Users\Melody\Documents\Spotter\frontend\src\app\payment\mock\page.tsx

"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, CreditCard, ArrowLeft } from "lucide-react";
import { paymentsApi } from "@/lib/api";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function MockPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={24} /></div>}>
      <MockPaymentPageContent />
    </Suspense>
  );
}

function MockPaymentPageContent() {
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
      setDone(true);
    } finally {
      setProcessing(false);
    }
  }

  const returnPath = user?.role === "seeker"
    ? "/seeker/matches"
    : user?.role === "org"
      ? "/org/billing"
      : "/";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-red-950/5 via-gray-50 to-gray-100 flex flex-col items-center justify-center px-4 py-12">
        <Link
          href={returnPath}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 font-black text-2xl text-red-700 mb-2">
              <span className="bg-red-700 text-white px-2.5 py-1 rounded-lg">S</span>
              POTTER
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Mock checkout (development)
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-200/50 overflow-hidden">
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 text-center">
              <span className="text-amber-900 text-xs font-bold tracking-wide">
                NO REAL CHARGE — SAFE FOR TESTING
              </span>
            </div>

            <div className="p-8 text-center space-y-5">
              {done ? (
                <>
                  <CheckCircle size={56} className="text-green-500 mx-auto" />
                  <h2 className="text-xl font-black text-gray-900">Payment approved</h2>
                  <p className="text-sm text-gray-500">
                    Your payment was verified in development mode.
                  </p>
                  <Link href={returnPath} className="btn-primary inline-block w-full sm:w-auto min-w-[200px]">
                    Continue
                  </Link>
                </>
              ) : (
                <>
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                    <CreditCard size={32} className="text-red-600" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Mock Paystack</h2>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    This page replaces the real Paystack checkout when API keys are not configured. as we are stil buidin
                    Approve below to complete the payment reference and return to the app.
                  </p>
                  <p className="text-xs font-mono text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 break-all">
                    ref: {reference || "none"}
                  </p>
                  <button
                    onClick={handlePay}
                    disabled={processing || !reference}
                    className="btn-primary w-full flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {processing
                      ? <Loader2 size={18} className="animate-spin" />
                      : <CheckCircle size={18} />
                    }
                    {processing ? "Processing…" : "Approve payment"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
