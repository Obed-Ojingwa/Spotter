// C:\Users\Melody\Documents\Spotter\frontend\src\app\error.tsx

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in dev — swap for Sentry/logging service in production
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="bg-red-100 rounded-full p-5 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <AlertCircle size={36} className="text-red-600" />
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          An unexpected error occurred. This has been noted.
          Try refreshing the page, or go back to safety.
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-left mb-6">
            <p className="text-xs font-mono text-red-700 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
          <Link href="/" className="btn-secondary">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}