import { cn, scoreColor, scoreBg } from "@/lib/utils";

// ── ScoreBadge ─────────────────────────────────────────────────────────────
interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const sizes = { sm: "text-xs px-2 py-0.5", md: "text-sm px-3 py-1", lg: "text-base px-4 py-1.5" };
  return (
    <span className={cn("inline-flex items-center rounded-full font-bold", scoreBg(score), sizes[size])}>
      {score.toFixed(1)}% match
    </span>
  );
}

// ── ScoreBar ───────────────────────────────────────────────────────────────
interface ScoreBarProps {
  label: string;
  value: number; // 0–100
}

export function ScoreBar({ label, value }: ScoreBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span className="capitalize">{label.replace(/_/g, " ")}</span>
        <span className={cn("font-semibold", scoreColor(value))}>{value.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            value >= 90 ? "bg-green-500" : value >= 70 ? "bg-yellow-400" : value >= 50 ? "bg-orange-400" : "bg-red-400"
          )}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── MatchCard ──────────────────────────────────────────────────────────────
interface MatchCardProps {
  matchId: string;
  score: number;
  jobTitle: string;
  jobCity?: string;
  jobState?: string;
  status: string;
  breakdown?: Record<string, number>;
  certificateIssued?: boolean;
  onDownloadCert?: () => void;
}

export function MatchCard({
  score, jobTitle, jobCity, jobState, status,
  breakdown, certificateIssued, onDownloadCert
}: MatchCardProps) {
  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{jobTitle}</h3>
          {(jobCity || jobState) && (
            <p className="text-sm text-gray-500 mt-0.5">{[jobCity, jobState].filter(Boolean).join(", ")}</p>
          )}
        </div>
        <ScoreBadge score={score} size="lg" />
      </div>

      {breakdown && Object.keys(breakdown).length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Score breakdown</p>
          {Object.entries(breakdown).map(([k, v]) => (
            <ScoreBar key={k} label={k} value={v} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded-full",
          status === "revealed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        )}>
          {status.replace(/_/g, " ")}
        </span>

        {certificateIssued && onDownloadCert && (
          <button
            onClick={onDownloadCert}
            className="text-sm font-semibold text-red-700 hover:text-red-800 underline"
          >
            Download Certificate
          </button>
        )}
      </div>
    </div>
  );
}

// ── BlurGate ───────────────────────────────────────────────────────────────
interface BlurGateProps {
  score: number;
  candidateCity?: string;
  candidateState?: string;
  onUnlock: () => void;
}

export function BlurGate({ score, candidateCity, candidateState, onUnlock }: BlurGateProps) {
  return (
    <div className="card relative overflow-hidden border border-red-100">
      {/* Blurred background preview */}
      <div className="filter blur-sm select-none pointer-events-none space-y-1">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="flex gap-2 mt-2">
          <div className="h-6 bg-gray-200 rounded-full w-16" />
          <div className="h-6 bg-gray-100 rounded-full w-20" />
        </div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] p-4 text-center">
        <ScoreBadge score={score} size="md" />
        <p className="text-sm text-gray-600 mt-2 mb-3">
          {candidateCity && candidateState ? `${candidateCity}, ${candidateState}` : "Location available on unlock"}
        </p>
        <button onClick={onUnlock} className="btn-primary text-sm">
          🔓 Unlock — ₦15,000
        </button>
      </div>
    </div>
  );
}