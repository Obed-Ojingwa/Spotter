// C:\Users\Melody\Documents\Spotter\frontend\src\app\(public)\jobs\page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, MapPin, Briefcase, SlidersHorizontal,
  X, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";
import { jobsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface Job {
  id: string;
  title: string;
  description?: string;
  city?: string;
  state?: string;
  work_mode?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  required_skills?: string[];
  created_at: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];

const WORK_MODES = ["remote", "onsite", "hybrid"];
const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "internship"];

// ── Page ───────────────────────────────────────────────────────────────────
export default function JobsPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  // filters driven by URL params so links + browser back work correctly
  const [query,  setQuery]  = useState(searchParams.get("q")     ?? "");
  const [state,  setState]  = useState(searchParams.get("state") ?? "");
  const [city,   setCity]   = useState(searchParams.get("city")  ?? "");
  const [mode,   setMode]   = useState(searchParams.get("mode")  ?? "");
  const [type,   setType]   = useState(searchParams.get("type")  ?? "");
  const [page,   setPage]   = useState(1);

  const [jobs,    setJobs]    = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const LIMIT = 12;

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (query) params.q         = query;
      if (state) params.state     = state;
      if (city)  params.city      = city;
      if (mode)  params.work_mode = mode;
      if (type)  params.type      = type;

      const res = await jobsApi.list(params);
      setJobs(res.data.jobs);
      // API doesn't return total yet; estimate from results length
      setTotal(res.data.jobs.length < LIMIT ? (page - 1) * LIMIT + res.data.jobs.length : page * LIMIT + 1);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [query, state, city, mode, type, page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // ── Sync URL → filters on mount ──────────────────────────────────────────
  useEffect(() => {
    setQuery(searchParams.get("q")     ?? "");
    setState(searchParams.get("state") ?? "");
    setCity(searchParams.get("city")   ?? "");
    setMode(searchParams.get("mode")   ?? "");
    setType(searchParams.get("type")   ?? "");
    setPage(1);
  }, [searchParams]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function applyFilters() {
    const params = new URLSearchParams();
    if (query) params.set("q",     query);
    if (state) params.set("state", state);
    if (city)  params.set("city",  city);
    if (mode)  params.set("mode",  mode);
    if (type)  params.set("type",  type);
    setPage(1);
    router.push(`/jobs?${params.toString()}`);
    setShowFilters(false);
  }

  function clearFilters() {
    setQuery(""); setState(""); setCity(""); setMode(""); setType("");
    setPage(1);
    router.push("/jobs");
  }

  const hasActiveFilters = query || state || city || mode || type;
  const totalPages = Math.ceil(total / LIMIT);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Search header ─────────────────────────────────── */}
      <div className="bg-red-700 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-white font-black text-2xl mb-5">Find Jobs</h1>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Keyword */}
            <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-4 py-2.5">
              <Search size={17} className="text-gray-400 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Job title, skill, keyword..."
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
              />
              {query && (
                <button onClick={() => setQuery("")}>
                  <X size={15} className="text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* State quick filter */}
            <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 sm:w-44">
              <MapPin size={17} className="text-gray-400 shrink-0" />
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="flex-1 text-sm text-gray-700 focus:outline-none bg-transparent"
              >
                <option value="">All States</option>
                {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <button onClick={applyFilters} className="btn-primary rounded-xl px-6">
              Search
            </button>

            {/* Advanced filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-colors",
                showFilters
                  ? "bg-white text-red-700 border-white"
                  : "border-red-400 text-white hover:bg-red-600"
              )}
            >
              <SlidersHorizontal size={16} />
              Filters
              {hasActiveFilters && (
                <span className="bg-white text-red-700 rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Advanced filter panel */}
          {showFilters && (
            <div className="mt-4 bg-white rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Ikeja"
                  className="input text-sm py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Work Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="input text-sm py-2">
                  <option value="">Any</option>
                  {WORK_MODES.map((m) => (
                    <option key={m} value={m} className="capitalize">{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Employment Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="input text-sm py-2">
                  <option value="">Any</option>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-end gap-2">
                <button onClick={applyFilters} className="btn-primary text-sm py-2">Apply</button>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="btn-ghost text-sm py-2 text-red-600">
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-5">
            {query && <FilterChip label={`"${query}"`} onRemove={() => { setQuery(""); applyFilters(); }} />}
            {state && <FilterChip label={state}        onRemove={() => { setState(""); applyFilters(); }} />}
            {city  && <FilterChip label={city}         onRemove={() => { setCity("");  applyFilters(); }} />}
            {mode  && <FilterChip label={mode}         onRemove={() => { setMode("");  applyFilters(); }} />}
            {type  && <FilterChip label={type}         onRemove={() => { setType("");  applyFilters(); }} />}
          </div>
        )}

        {/* Result count */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-5">
            {jobs.length === 0 ? "No jobs found" : `Showing ${jobs.length} job${jobs.length !== 1 ? "s" : ""}`}
            {hasActiveFilters && " for your filters"}
          </p>
        )}

        {/* Job grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState onClear={clearFilters} hasFilters={!!hasActiveFilters} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-600 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function JobCard({ job }: { job: Job }) {
  const modeColor: Record<string, string> = {
    remote:  "bg-green-100 text-green-700",
    onsite:  "bg-blue-100 text-blue-700",
    hybrid:  "bg-purple-100 text-purple-700",
  };

  const postedDaysAgo = Math.floor(
    (Date.now() - new Date(job.created_at).getTime()) / 86400000
  );

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="card block hover:shadow-md hover:border-red-100 transition-all group"
    >
      <div className="space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 group-hover:text-red-700 transition-colors leading-snug line-clamp-2">
          {job.title}
        </h3>

        {/* Location */}
        {(job.city || job.state) && (
          <p className="text-sm text-gray-500 flex items-center gap-1.5">
            <MapPin size={13} className="shrink-0 text-gray-400" />
            {[job.city, job.state].filter(Boolean).join(", ")}
          </p>
        )}

        {/* Salary */}
        {(job.salary_min || job.salary_max) && (
          <p className="text-sm font-semibold text-green-700">
            ₦{job.salary_min?.toLocaleString()} – ₦{job.salary_max?.toLocaleString()}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {job.work_mode && (
            <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium capitalize", modeColor[job.work_mode] ?? "bg-gray-100 text-gray-600")}>
              {job.work_mode}
            </span>
          )}
          {job.employment_type && (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium capitalize bg-gray-100 text-gray-600">
              {job.employment_type}
            </span>
          )}
        </div>

        {/* About this role snippet (shown before Apply) */}
        {job.description && (
          <p className="text-xs text-gray-500 leading-relaxed pt-0.5">
            {job.description.length > 160
              ? `${job.description.slice(0, 157)}...`
              : job.description}
          </p>
        )}

        {/* Footer row: posted date + apply */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <p className="text-xs text-gray-400">
            {postedDaysAgo === 0 ? "Posted today" : `Posted ${postedDaysAgo}d ago`}
          </p>
          <button
            onClick={(e) => {
              e.preventDefault();
              window.location.href = `/jobs/${job.id}`;
            }}
            className="text-xs font-semibold bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded-full transition-colors"
          >
            Apply Now
          </button>
        </div>
      </div>
    </Link>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-medium px-3 py-1 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-red-900">
        <X size={12} />
      </button>
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="h-5 bg-gray-100 rounded w-4/5" />
      <div className="h-4 bg-gray-100 rounded w-2/5" />
      <div className="flex gap-2">
        <div className="h-5 bg-gray-100 rounded-full w-16" />
        <div className="h-5 bg-gray-100 rounded-full w-20" />
      </div>
      <div className="h-4 bg-gray-100 rounded w-1/3" />
    </div>
  );
}

function EmptyState({ onClear, hasFilters }: { onClear: () => void; hasFilters: boolean }) {
  return (
    <div className="text-center py-20">
      <Briefcase size={48} className="mx-auto text-gray-200 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">No jobs found</h3>
      <p className="text-gray-400 text-sm mb-6">
        {hasFilters
          ? "Try adjusting your filters or search terms."
          : "No jobs have been posted yet. Check back soon!"}
      </p>
      {hasFilters && (
        <button onClick={onClear} className="btn-secondary text-sm">
          Clear all filters
        </button>
      )}
    </div>
  );
}
