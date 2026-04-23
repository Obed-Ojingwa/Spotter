// C:\Users\Melody\Documents\Spotter\frontend\src\app\page.tsx
// Root entry — public home page with job listings

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MapPin, Briefcase, Building2, Users } from "lucide-react";
import { jobsApi } from "@/lib/api";

const CATEGORIES = [
  { label: "Technology",     icon: "💻", query: "technology" },
  { label: "Finance",        icon: "💰", query: "finance" },
  { label: "Healthcare",     icon: "🏥", query: "healthcare" },
  { label: "Education",      icon: "🎓", query: "education" },
  { label: "Engineering",    icon: "⚙️",  query: "engineering" },
  { label: "Marketing",      icon: "📣", query: "marketing" },
  { label: "Sales",          icon: "🤝", query: "sales" },
  { label: "Administration", icon: "🗂️",  query: "admin" },
];

const STATES = [
  "Lagos", "Abuja", "Rivers", "Kano", "Oyo",
  "Kaduna", "Enugu", "Delta", "Anambra", "Ogun",
];

const FIELDS = [
  { label: "Accounting", query: "accounting" },
  { label: "Customer Support", query: "customer support" },
  { label: "Data", query: "data" },
  { label: "Design", query: "design" },
  { label: "Engineering", query: "engineering" },
  { label: "Human Resources", query: "human resources" },
  { label: "Legal", query: "legal" },
  { label: "Operations", query: "operations" },
  { label: "Product", query: "product" },
  { label: "Project Management", query: "project management" },
];

const REGIONS = [
  { label: "North Central", query: "north central" },
  { label: "North East", query: "north east" },
  { label: "North West", query: "north west" },
  { label: "South East", query: "south east" },
  { label: "South South", query: "south south" },
  { label: "South West", query: "south west" },
];

interface Job {
  id: string;
  title: string;
  description?: string;
  city?: string;
  state?: string;
  work_mode?: string;
  employment_type?: string;
  required_skills?: string[];
  created_at: string;
}

type TabKey = "today" | "yesterday" | "week" | "all";

export default function HomePage() {
  const router = useRouter();
  const [query,      setQuery]      = useState("");
  const [state,      setState]      = useState("");
  const [workMode,   setWorkMode]   = useState("");
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<TabKey>("today");

  // ── Auth state ────────────────────────────────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole,   setUserRole]   = useState<string | null>(null);

  useEffect(() => {
    // Check login status from localStorage
    const token = localStorage.getItem("access_token");
    const role  = localStorage.getItem("user_role") ||
                  localStorage.getItem("role") ||
                  document.cookie.match(/spotter_role=([^;]+)/)?.[1] || null;
    setIsLoggedIn(!!token);
    setUserRole(role);
  }, []);

  useEffect(() => {
    jobsApi.list({ limit: 10 })
      .then((r) => setRecentJobs(r.data.jobs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query)    params.set("q", query);
    if (state)    params.set("state", state);
    if (workMode) params.set("work_mode", workMode);
    router.push(`/jobs?${params.toString()}`);
  }

  function handleSignOut() {
    localStorage.clear();
    document.cookie = "spotter_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    setIsLoggedIn(false);
    setUserRole(null);
    router.refresh();
  }

  function getDashboardUrl(role: string | null): string {
    switch (role) {
      case "super_admin":
      case "admin":
      case "executive_admin": return "/admin/dashboard";
      case "org":             return "/org/dashboard";
      case "agent":           return "/agent/dashboard";
      case "spotter":         return "/spotter/queue";
      default:                return "/seeker/dashboard";
    }
  }

  function filterByTab(jobs: Job[]): Job[] {
    const now = Date.now();
    const DAY = 86400000;
    return jobs.filter((j) => {
      const age = now - new Date(j.created_at).getTime();
      if (activeTab === "today")     return age < DAY;
      if (activeTab === "yesterday") return age >= DAY && age < DAY * 2;
      if (activeTab === "week")      return age < DAY * 7;
      return true;
    });
  }

  const displayedJobs = filterByTab(recentJobs);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Layer 1: Header ───────────────────────────────────── */}
      <header className="bg-red-700 text-white px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-start justify-between">

          {/* Logo + tagline */}
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-2">
              <div className="bg-white text-red-700 font-black text-lg w-8 h-8 flex items-center justify-center rounded shrink-0">
                S
              </div>
              <span className="font-black text-2xl tracking-wide">POTTER</span>
            </div>
            <p className="text-white text-xs mt-1" style={{ paddingLeft: "40px" }}>
              First and Number One African Job Matching Platform
            </p>
          </div>

          {/* Right: nav + dashboard buttons */}
          <div className="flex flex-col items-end gap-2">

            {/* Top row */}
            <div className="flex items-center gap-3">
              <Link href="/jobs"
                className="text-sm font-semibold text-white hover:text-red-200 transition-colors">
                Browse Jobs
              </Link>

              {isLoggedIn ? (
                <>
                  <Link
                    href={getDashboardUrl(userRole)}
                    className="text-sm font-semibold border border-white px-4 py-1 rounded hover:bg-white hover:text-red-700 transition-colors">
                    My Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-sm font-semibold border border-white px-4 py-1 rounded hover:bg-white hover:text-red-700 transition-colors">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login"
                    className="text-sm font-semibold border border-white px-4 py-1 rounded hover:bg-white hover:text-red-700 transition-colors">
                    Sign In
                  </Link>
                  <Link href="/register"
                    className="text-sm font-semibold border border-white px-4 py-1 rounded hover:bg-white hover:text-red-700 transition-colors">
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Bottom row */}
            <div className="flex items-center gap-2">
              <Link href="/org/dashboard"
                className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/40 px-3 py-1 rounded transition-colors">
                <Building2 size={12} /> Recruiter Dashboard
              </Link>
              <Link href="/agent/dashboard"
                className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/40 px-3 py-1 rounded transition-colors">
                <Users size={12} /> Agent Dashboard
              </Link>

              {isLoggedIn ? (
                <Link
                  href={getDashboardUrl(userRole)}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/40 px-3 py-1 rounded transition-colors">
                  My Account
                </Link>
              ) : (
                <Link href="/login"
                  className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/40 px-3 py-1 rounded transition-colors">
                  Login / Register
                </Link>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* ── Layer 2: Search hero ──────────────────────────────── */}
      <div className="bg-red-800 px-6 py-6">
        <p className="text-center text-white font-bold text-lg mb-2 tracking-wide">
          Find Your Perfect Match
        </p>
        <p className="text-center text-red-100 text-sm mb-5 max-w-lg mx-auto leading-relaxed">
          SPOTTER uses AI matching to connect the right talent with the right opportunity.
          Scored, Verified, and Certified.
        </p>
        <form
          onSubmit={handleSearch}
          className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-2 items-center"
        >
          <div className="flex-1 flex items-center gap-2 bg-white rounded-md px-3 py-2">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Job title, skill, or keyword..."
              className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-white rounded-md px-3 py-2">
            <MapPin size={15} className="text-gray-400 shrink-0" />
            <select value={state} onChange={(e) => setState(e.target.value)}
              className="text-sm text-gray-700 focus:outline-none bg-transparent">
              <option value="">All States</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-md px-3 py-2">
            <Briefcase size={15} className="text-gray-400 shrink-0" />
            <select value={workMode} onChange={(e) => setWorkMode(e.target.value)}
              className="text-sm text-gray-700 focus:outline-none bg-transparent">
              <option value="">All Types</option>
              <option value="remote">Remote</option>
              <option value="onsite">Onsite</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <button type="submit"
            className="bg-gray-900 hover:bg-black text-white text-sm font-semibold px-6 py-2 rounded-md whitespace-nowrap transition-colors">
            Search Jobs
          </button>
        </form>
      </div>

      {/* ── Body: 3-column layout ─────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-5 flex gap-5 items-start">

        {/* Left sidebar */}
        <aside className="hidden lg:flex flex-col gap-3 w-52 shrink-0">
          <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
              Job Categories
            </p>
            {CATEGORIES.map(({ label, icon, query: q }) => (
              <Link key={label} href={`/jobs?q=${q}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 border-b border-gray-50 last:border-0 transition-colors">
                <span className="text-base leading-none">{icon}</span>
                <span className="flex-1">{label}</span>
              </Link>
            ))}
          </div>

          <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
              Browse by State
            </p>
            <div className="p-2 flex flex-wrap gap-1.5">
              {STATES.map((s) => (
                <Link key={s} href={`/jobs?state=${s}`}
                  className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all">
                  {s}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
              Work Mode
            </p>
            {[
              { label: "Remote", icon: "🏠", value: "remote" },
              { label: "Onsite", icon: "🏢", value: "onsite" },
              { label: "Hybrid", icon: "🔀", value: "hybrid" },
            ].map(({ label, icon, value }) => (
              <Link key={value} href={`/jobs?work_mode=${value}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 border-b border-gray-50 last:border-0 transition-colors">
                <span>{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </aside>

        {/* Centre: job listings */}
        <main className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex bg-white border border-gray-100 rounded-lg overflow-hidden">
              {([
                { key: "today",     label: "Today's Jobs" },
                { key: "yesterday", label: "Yesterday"    },
                { key: "week",      label: "This Week"    },
                { key: "all",       label: "All Jobs"     },
              ] as { key: TabKey; label: string }[]).map(({ key, label }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`px-4 py-2 text-xs font-semibold border-r border-gray-100 last:border-0 transition-colors ${
                    activeTab === key
                      ? "bg-red-700 text-white"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 hidden sm:block">
              {displayedJobs.length} job{displayedJobs.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-lg px-4 py-3 animate-pulse space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : displayedJobs.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-lg text-center py-16 text-gray-400">
              <Briefcase size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {activeTab !== "all"
                  ? "No jobs for this period — try 'All Jobs'"
                  : "No jobs posted yet. Check back soon!"}
              </p>
              {activeTab !== "all" && (
                <button onClick={() => setActiveTab("all")}
                  className="text-xs text-red-600 font-semibold mt-2 hover:underline">
                  View all jobs →
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {displayedJobs.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          )}

          {!loading && recentJobs.length > 0 && (
            <div className="text-center pt-2">
              <Link href="/jobs"
                className="text-sm font-semibold text-red-700 hover:underline">
                View all jobs →
              </Link>
            </div>
          )}
        </main>

        {/* Right panel */}
        <aside className="hidden xl:flex flex-col gap-3 w-56 shrink-0">
          <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
              Jobs By Field
            </p>
            <div className="p-2 flex flex-wrap gap-1.5">
              {FIELDS.map((f) => (
                <Link key={f.label} href={`/jobs?q=${encodeURIComponent(f.query)}`}
                  className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all">
                  {f.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
              Jobs By Region
            </p>
            <div className="p-2 flex flex-wrap gap-1.5">
              {REGIONS.map((r) => (
                <Link key={r.label} href={`/jobs?q=${encodeURIComponent(r.query)}`}
                  className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all">
                  {r.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
              Quick Links
            </p>
            <div className="p-2 flex flex-wrap gap-1.5">
              <Link href="/jobs"
                className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all">
                Browse all jobs
              </Link>
              <Link href="/register"
                className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all">
                Create profile
              </Link>
              <Link href="/org/dashboard"
                className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all">
                Post a job
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-500 text-center py-5 text-xs mt-8">
        © {new Date().getFullYear()} SPOTTER · Recruitment &amp; Talent Matching Platform
      </footer>
    </div>
  );
}

// ── JobCard ────────────────────────────────────────────────────────────────
function JobCard({ job }: { job: Job }) {
  const workModeColors: Record<string, string> = {
    remote: "bg-green-50 text-green-700 border-green-200",
    onsite: "bg-blue-50 text-blue-700 border-blue-200",
    hybrid: "bg-purple-50 text-purple-700 border-purple-200",
  };
  const modeClass = workModeColors[job.work_mode ?? ""] ?? "bg-gray-50 text-gray-500 border-gray-200";

  return (
    <div className="bg-white border border-gray-100 hover:border-red-200 rounded-lg px-4 py-3 flex flex-col gap-2 transition-all group">
      <Link href={`/jobs/${job.id}`}
        className="font-semibold text-sm text-gray-900 group-hover:text-red-700 transition-colors leading-snug">
        {job.title}
      </Link>
      <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
        {(job.city || job.state) && (
          <span className="flex items-center gap-1">
            <MapPin size={11} className="shrink-0" />
            {[job.city, job.state].filter(Boolean).join(", ")}
          </span>
        )}
        {job.work_mode && (
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${modeClass}`}>
            {job.work_mode}
          </span>
        )}
        {job.employment_type && (
          <span className="px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-500 capitalize">
            {job.employment_type}
          </span>
        )}
      </div>
      {job.description && (
        <p className="text-xs text-gray-500 leading-relaxed">
          {job.description.length > 160
            ? `${job.description.slice(0, 157)}...`
            : job.description}
        </p>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50 mt-1">
        <Link href={`/jobs/${job.id}`}
          className="text-[11px] text-gray-400 hover:text-red-600 transition-colors">
          View details →
        </Link>
        <Link href={`/jobs/${job.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] font-semibold bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded-full transition-colors">
          Apply Now
        </Link>
      </div>
    </div>
  );
}



// // C:\Users\Melody\Documents\Spotter\frontend\src\app\page.tsx
// // Root entry — public home page with job listings

// "use client";

// import { useState, useEffect } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { Search, MapPin, Briefcase, Building2, Users } from "lucide-react";
// import { jobsApi } from "@/lib/api";

// const CATEGORIES = [
//   { label: "Technology",     icon: "💻", query: "technology" },
//   { label: "Finance",        icon: "💰", query: "finance" },
//   { label: "Healthcare",     icon: "🏥", query: "healthcare" },
//   { label: "Education",      icon: "🎓", query: "education" },
//   { label: "Engineering",    icon: "⚙️",  query: "engineering" },
//   { label: "Marketing",      icon: "📣", query: "marketing" },
//   { label: "Sales",          icon: "🤝", query: "sales" },
//   { label: "Administration", icon: "🗂️",  query: "admin" },
// ];

// const STATES = [
//   "Lagos", "Abuja", "Rivers", "Kano", "Oyo",
//   "Kaduna", "Enugu", "Delta", "Anambra", "Ogun",
// ];

// const FIELDS = [
//   { label: "Accounting", query: "accounting" },
//   { label: "Customer Support", query: "customer support" },
//   { label: "Data", query: "data" },
//   { label: "Design", query: "design" },
//   { label: "Engineering", query: "engineering" },
//   { label: "Human Resources", query: "human resources" },
//   { label: "Legal", query: "legal" },
//   { label: "Operations", query: "operations" },
//   { label: "Product", query: "product" },
//   { label: "Project Management", query: "project management" },
// ];

// const REGIONS = [
//   { label: "North Central", query: "north central" },
//   { label: "North East", query: "north east" },
//   { label: "North West", query: "north west" },
//   { label: "South East", query: "south east" },
//   { label: "South South", query: "south south" },
//   { label: "South West", query: "south west" },
// ];

// interface Job {
//   id: string;
//   title: string;
//   description?: string;
//   city?: string;
//   state?: string;
//   work_mode?: string;
//   employment_type?: string;
//   required_skills?: string[];
//   created_at: string;
// }

// type TabKey = "today" | "yesterday" | "week" | "all";

// export default function HomePage() {
//   const router = useRouter();
//   const [query,    setQuery]    = useState("");
//   const [state,    setState]    = useState("");
//   const [workMode, setWorkMode] = useState("");
//   const [recentJobs, setRecentJobs] = useState<Job[]>([]);
//   const [loading,  setLoading]  = useState(true);
//   const [activeTab, setActiveTab] = useState<TabKey>("today");

//   useEffect(() => {
//     jobsApi.list({ limit: 10 })
//       .then((r) => setRecentJobs(r.data.jobs ?? []))
//       .catch(() => {})
//       .finally(() => setLoading(false));
//   }, []);

//   function handleSearch(e: React.FormEvent) {
//     e.preventDefault();
//     const params = new URLSearchParams();
//     if (query)    params.set("q", query);
//     if (state)    params.set("state", state);
//     if (workMode) params.set("work_mode", workMode);
//     router.push(`/jobs?${params.toString()}`);
//   }

//   // Filter jobs by tab
//   function filterByTab(jobs: Job[]): Job[] {
//     const now = Date.now();
//     const DAY = 86400000;
//     return jobs.filter((j) => {
//       const age = now - new Date(j.created_at).getTime();
//       if (activeTab === "today")     return age < DAY;
//       if (activeTab === "yesterday") return age >= DAY && age < DAY * 2;
//       if (activeTab === "week")      return age < DAY * 7;
//       return true;
//     });
//   }

//   const displayedJobs = filterByTab(recentJobs);

//   return (
//     <div className="min-h-screen bg-gray-50">

//       {/* ── Layer 1: Header ───────────────────────────────────── */}
//       <header className="bg-red-700 text-white px-6 py-3">
//         <div className="max-w-7xl mx-auto flex items-start justify-between">

//           {/* Logo + tagline */}
//           <div className="flex flex-col leading-none">
//             <div className="flex items-center gap-2">
//               <div className="bg-white text-red-700 font-black text-lg w-8 h-8 flex items-center justify-center rounded shrink-0">
//                 S
//               </div>
//               <span className="font-black text-2xl tracking-wide">POTTER</span>
//             </div>
//             <p className="text-white text-xs mt-1" style={{ paddingLeft: "40px" }}>
//               First and Number One African Job Matching Platform
//             </p>
//           </div>

//           {/* Right: nav + dashboard buttons */}
//           <div className="flex flex-col items-end gap-2">
//             <div className="flex items-center gap-3">
//               <Link href="/jobs"
//                 className="text-sm font-semibold text-white hover:text-red-200 transition-colors">
//                 Browse Jobs
//               </Link>
//               <Link href="/login"
//                 className="text-sm font-semibold border border-white px-4 py-1 rounded hover:bg-white hover:text-red-700 transition-colors">
//                 Sign In
//               </Link>
//               <Link href="/register"
//                 className="text-sm font-semibold border border-white px-4 py-1 rounded hover:bg-white hover:text-red-700 transition-colors">
//                 Register
//               </Link>
//             </div>
//             <div className="flex items-center gap-2">
//               <Link href="/org/dashboard"
//                 className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/40 px-3 py-1 rounded transition-colors">
//                 <Building2 size={12} /> Recruiter Dashboard
//               </Link>
//               <Link href="/agent/dashboard"
//                 className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/40 px-3 py-1 rounded transition-colors">
//                 <Users size={12} /> Agent Dashboard
//               </Link>
//               <Link href="/login"
//                 className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/40 px-3 py-1 rounded transition-colors">
//                 Login / Register
//               </Link>
//             </div>
//           </div>
//         </div>


//       </header>

//       {/* ── Layer 2: Search hero ──────────────────────────────── */}
//       <div className="bg-red-800 px-6 py-6">
//         <p className="text-center text-white font-bold text-lg mb-2 tracking-wide">
//           Find Your Perfect Match
//         </p>
//         <p className="text-center text-red-100 text-sm mb-5 max-w-lg mx-auto leading-relaxed">
//           SPOTTER uses AI matching to connect the right talent with the right opportunity.
//           Scored, Verified, and Certified.
//         </p>
//         <form
//           onSubmit={handleSearch}
//           className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-2 items-center"
//         >
//           <div className="flex-1 flex items-center gap-2 bg-white rounded-md px-3 py-2">
//             <Search size={15} className="text-gray-400 shrink-0" />
//             <input
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//               placeholder="Job title, skill, or keyword..."
//               className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
//             />
//           </div>
//           <div className="flex items-center gap-2 bg-white rounded-md px-3 py-2">
//             <MapPin size={15} className="text-gray-400 shrink-0" />
//             <select value={state} onChange={(e) => setState(e.target.value)}
//               className="text-sm text-gray-700 focus:outline-none bg-transparent">
//               <option value="">All States</option>
//               {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
//             </select>
//           </div>
//           <div className="flex items-center gap-2 bg-white rounded-md px-3 py-2">
//             <Briefcase size={15} className="text-gray-400 shrink-0" />
//             <select value={workMode} onChange={(e) => setWorkMode(e.target.value)}
//               className="text-sm text-gray-700 focus:outline-none bg-transparent">
//               <option value="">All Types</option>
//               <option value="remote">Remote</option>
//               <option value="onsite">Onsite</option>
//               <option value="hybrid">Hybrid</option>
//             </select>
//           </div>
//           <button type="submit"
//             className="bg-gray-900 hover:bg-black text-white text-sm font-semibold px-6 py-2 rounded-md whitespace-nowrap transition-colors">
//             Search Jobs
//           </button>
//         </form>
//       </div>

//       {/* ── Body: 3-column layout ─────────────────────────────── */}
//       <div className="max-w-7xl mx-auto px-4 py-5 flex gap-5 items-start">

//         {/* Left sidebar */}
//         <aside className="hidden lg:flex flex-col gap-3 w-52 shrink-0">
//           <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
//             <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
//               Job Categories
//             </p>
//             {CATEGORIES.map(({ label, icon, query: q }) => (
//               <Link key={label} href={`/jobs?q=${q}`}
//                 className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 border-b border-gray-50 last:border-0 transition-colors">
//                 <span className="text-base leading-none">{icon}</span>
//                 <span className="flex-1">{label}</span>
//               </Link>
//             ))}
//           </div>

//           <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
//             <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
//               Browse by State
//             </p>
//             <div className="p-2 flex flex-wrap gap-1.5">
//               {STATES.map((s) => (
//                 <Link key={s} href={`/jobs?state=${s}`}
//                   className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all">
//                   {s}
//                 </Link>
//               ))}
//             </div>
//           </div>

//           <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
//             <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
//               Work Mode
//             </p>
//             {[
//               { label: "Remote", icon: "🏠", value: "remote" },
//               { label: "Onsite", icon: "🏢", value: "onsite" },
//               { label: "Hybrid", icon: "🔀", value: "hybrid" },
//             ].map(({ label, icon, value }) => (
//               <Link key={value} href={`/jobs?work_mode=${value}`}
//                 className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 border-b border-gray-50 last:border-0 transition-colors">
//                 <span>{icon}</span>
//                 <span>{label}</span>
//               </Link>
//             ))}
//           </div>
//         </aside>

//         {/* Centre: job listings */}
//         <main className="flex-1 min-w-0 flex flex-col gap-3">
//           <div className="flex items-center justify-between">
//             <div className="flex bg-white border border-gray-100 rounded-lg overflow-hidden">
//               {([
//                 { key: "today",     label: "Today's Jobs" },
//                 { key: "yesterday", label: "Yesterday"    },
//                 { key: "week",      label: "This Week"    },
//                 { key: "all",       label: "All Jobs"     },
//               ] as { key: TabKey; label: string }[]).map(({ key, label }) => (
//                 <button key={key} onClick={() => setActiveTab(key)}
//                   className={`px-4 py-2 text-xs font-semibold border-r border-gray-100 last:border-0 transition-colors ${
//                     activeTab === key
//                       ? "bg-red-700 text-white"
//                       : "text-gray-500 hover:bg-gray-50"
//                   }`}>
//                   {label}
//                 </button>
//               ))}
//             </div>
//             <span className="text-xs text-gray-400 hidden sm:block">
//               {displayedJobs.length} job{displayedJobs.length !== 1 ? "s" : ""}
//             </span>
//           </div>

//           {loading ? (
//             <div className="flex flex-col gap-3">
//               {Array.from({ length: 5 }).map((_, i) => (
//                 <div key={i} className="bg-white border border-gray-100 rounded-lg px-4 py-3 animate-pulse space-y-2">
//                   <div className="h-4 bg-gray-100 rounded w-2/3" />
//                   <div className="h-3 bg-gray-100 rounded w-1/3" />
//                 </div>
//               ))}
//             </div>
//           ) : displayedJobs.length === 0 ? (
//             <div className="bg-white border border-gray-100 rounded-lg text-center py-16 text-gray-400">
//               <Briefcase size={36} className="mx-auto mb-3 opacity-30" />
//               <p className="text-sm">
//                 {activeTab !== "all"
//                   ? "No jobs for this period — try 'All Jobs'"
//                   : "No jobs posted yet. Check back soon!"}
//               </p>
//               {activeTab !== "all" && (
//                 <button onClick={() => setActiveTab("all")}
//                   className="text-xs text-red-600 font-semibold mt-2 hover:underline">
//                   View all jobs →
//                 </button>
//               )}
//             </div>
//           ) : (
//             <div className="flex flex-col gap-3">
//               {displayedJobs.map((job) => <JobCard key={job.id} job={job} />)}
//             </div>
//           )}

//           {!loading && recentJobs.length > 0 && (
//             <div className="text-center pt-2">
//               <Link href="/jobs"
//                 className="text-sm font-semibold text-red-700 hover:underline">
//                 View all jobs →
//               </Link>
//             </div>
//           )}
//         </main>

//         {/* Right panel */}
//         <aside className="hidden xl:flex flex-col gap-3 w-56 shrink-0">
//           <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
//             <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
//               Jobs By Field
//             </p>
//             <div className="p-2 flex flex-wrap gap-1.5">
//               {FIELDS.map((f) => (
//                 <Link
//                   key={f.label}
//                   href={`/jobs?q=${encodeURIComponent(f.query)}`}
//                   className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all"
//                 >
//                   {f.label}
//                 </Link>
//               ))}
//             </div>
//           </div>

//           <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
//             <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
//               Jobs By Region
//             </p>
//             <div className="p-2 flex flex-wrap gap-1.5">
//               {REGIONS.map((r) => (
//                 <Link
//                   key={r.label}
//                   href={`/jobs?q=${encodeURIComponent(r.query)}`}
//                   className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all"
//                 >
//                   {r.label}
//                 </Link>
//               ))}
//             </div>
//           </div>

//           <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
//             <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
//               Quick Links
//             </p>
//             <div className="p-2 flex flex-wrap gap-1.5">
//               <Link
//                 href="/jobs"
//                 className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all"
//               >
//                 Browse all jobs
//               </Link>
//               <Link
//                 href="/register"
//                 className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all"
//               >
//                 Create profile
//               </Link>
//               <Link
//                 href="/org/dashboard"
//                 className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all"
//               >
//                 Post a job
//               </Link>
//             </div>
//           </div>
//         </aside>
//       </div>

//       {/* Footer */}
//       <footer className="bg-gray-900 text-gray-500 text-center py-5 text-xs mt-8">
//         © {new Date().getFullYear()} SPOTTER · Recruitment &amp; Talent Matching Platform
//       </footer>
//     </div>
//   );
// }

// // ── JobCard ────────────────────────────────────────────────────────────────
// function JobCard({ job }: { job: Job }) {
//   const workModeColors: Record<string, string> = {
//     remote: "bg-green-50 text-green-700 border-green-200",
//     onsite: "bg-blue-50 text-blue-700 border-blue-200",
//     hybrid: "bg-purple-50 text-purple-700 border-purple-200",
//   };
//   const modeClass = workModeColors[job.work_mode ?? ""] ?? "bg-gray-50 text-gray-500 border-gray-200";

//   return (
//     <div className="bg-white border border-gray-100 hover:border-red-200 rounded-lg px-4 py-3 flex flex-col gap-2 transition-all group">
//       {/* Title — links to detail */}
//       <Link href={`/jobs/${job.id}`}
//         className="font-semibold text-sm text-gray-900 group-hover:text-red-700 transition-colors leading-snug">
//         {job.title}
//       </Link>

//       {/* Location + mode tags */}
//       <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
//         {(job.city || job.state) && (
//           <span className="flex items-center gap-1">
//             <MapPin size={11} className="shrink-0" />
//             {[job.city, job.state].filter(Boolean).join(", ")}
//           </span>
//         )}
//         {job.work_mode && (
//           <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${modeClass}`}>
//             {job.work_mode}
//           </span>
//         )}
//         {job.employment_type && (
//           <span className="px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-500 capitalize">
//             {job.employment_type}
//           </span>
//         )}
//       </div>

//       {/* About this role snippet (shown before Apply) */}
//       {job.description && (
//         <p className="text-xs text-gray-500 leading-relaxed">
//           {job.description.length > 160
//             ? `${job.description.slice(0, 157)}...`
//             : job.description}
//         </p>
//       )}

//       {/* Apply button row */}
//       <div className="flex items-center justify-between pt-1 border-t border-gray-50 mt-1">
//         <Link href={`/jobs/${job.id}`}
//           className="text-[11px] text-gray-400 hover:text-red-600 transition-colors">
//           View details →
//         </Link>
//         <Link
//           href={`/jobs/${job.id}`}
//           onClick={(e) => e.stopPropagation()}
//           className="text-[11px] font-semibold bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded-full transition-colors"
//         >
//           Apply Now
//         </Link>
//       </div>
//     </div>
//   );
// }