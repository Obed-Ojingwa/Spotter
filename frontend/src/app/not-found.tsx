// C:\Users\Melody\Documents\Spotter\frontend\src\app\not-found.tsx

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">

        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 font-black text-2xl text-red-700 mb-10">
          <span className="bg-red-700 text-white px-2.5 py-1 rounded-lg">S</span>
          POTTER
        </Link>

        {/* 404 */}
        <div className="mb-6">
          <p className="text-8xl font-black text-red-100 leading-none select-none">404</p>
          <h1 className="text-2xl font-black text-gray-900 -mt-4">Page not found</h1>
          <p className="text-gray-500 mt-3 text-sm leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary">
            Go to Home
          </Link>
          <Link href="/jobs" className="btn-secondary">
            Browse Jobs
          </Link>
        </div>
      </div>
    </div>
  );
}