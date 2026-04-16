// C:\Users\Melody\Documents\Spotter\frontend\src\app\spotter\approved\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Loader2, Trophy } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { ScoreBadge } from "@/components/matching/MatchCard";

interface ApprovedMatch {
  match_id: string;
  score: number;
  is_premium: boolean;
  seeker: { name: string; city?: string; state?: string };
  job: { title: string };
  submitted_at: string;
}

export default function SpotterApprovedPage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();
  const [matches,  setMatches]  = useState<ApprovedMatch[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "spotter") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "spotter") return;
    // Fetch recently approved — reuse queue endpoint filtered by status in future;
    // for now fetch queue to show what exists (approved ones won't appear there)
    api.get("/spotter/stats").then(() => {}).catch(() => {});
    setLoading(false);
  }, [isLoggedIn, user]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/spotter/queue" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Approved Matches</h1>
              <p className="text-sm text-gray-500 mt-0.5">History of matches you have approved</p>
            </div>
          </div>
          <div className="card text-center py-16">
            <Trophy size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="font-semibold text-gray-600 mb-2">Approval history coming soon</p>
            <p className="text-sm text-gray-400 mb-5">
              This page will show all matches you have reviewed. For now, head to the review queue.
            </p>
            <Link href="/spotter/queue" className="btn-primary inline-block text-sm">
              Go to Queue
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
