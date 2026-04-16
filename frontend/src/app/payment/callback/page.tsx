// C:\Users\Melody\Documents\Spotter\frontend\src\app\payment\callback\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { paymentsApi } from "@/lib/api";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { user }     = useAuthStore();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (!reference) { setStatus("failed"); setMessage("No payment reference found."); return; }

    paymentsApi.verify(reference)
      .then((r) => {
        if (r.data.status === "success") {
          setStatus("success");
          setMessage("Your payment was successful! Access has been unlocked.");
        } else {
          setStatus("failed");
          setMessage("Payment could not be verified. Please contact support.");
        }
      })
      .catch(() => {
        setStatus("failed");
        setMessage("Verification failed. Please try again or contact support.");
      });
  }, [searchParams]);

  const dashboardLink = user
    ? user.role === "seeker" ? "/seeker/matches"
    : user.role === "org"    ? "/org/candidates"
    : "/"
    : "/";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center space-y-5 py-12">
          {status === "loading" && (
            <>
              <Loader2 size={48} className="animate-spin text-red-600 mx-auto" />
              <p className="font-semibold text-gray-700">Verifying your payment…</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle size={56} className="text-green-500 mx-auto" />
              <h2 className="text-xl font-black text-gray-900">Payment Successful!</h2>
              <p className="text-gray-500 text-sm">{message}</p>
              <Link href={dashboardLink} className="btn-primary inline-block">
                Continue
              </Link>
            </>
          )}
          {status === "failed" && (
            <>
              <XCircle size={56} className="text-red-500 mx-auto" />
              <h2 className="text-xl font-black text-gray-900">Payment Failed</h2>
              <p className="text-gray-500 text-sm">{message}</p>
              <Link href={dashboardLink} className="btn-secondary inline-block">
                Go Back
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
