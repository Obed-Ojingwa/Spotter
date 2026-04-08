"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MapPin, Briefcase, Building2, Users, LayoutDashboard } from "lucide-react";
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

interface Job {
  id: string;
  title: string;
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
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("today");

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

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="bg-red-700 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-black text-lg tracking-wide">SPOTTER</span>
          {/* <span className="text-red-200 text-xs hidden sm:inline">Recruitment &amp; Talent Matching </span> */}
          <span className="text-red-200 text-xs hidden sm:inline">First and Number One African Job Matching Platform</span>
        </div>

        <nav className="flex items-center gap-2">
          {/* Recruiter Dashboard — wire to /org/dashboard */}
          <Link
            href="/org/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/30 px-3 py-1.5 rounded-md transition-colors"
          >
            <Building2 size={13} />
            <span className="hidden sm:inline">Recruiter</span> Dashboard
          </Link>

          {/* Agent Dashboard — wire to /agent/dashboard */}
          <Link
            href="/agent/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/30 px-3 py-1.5 rounded-md transition-colors"
          >
            <Users size={13} />
            <span className="hidden sm:inline">Agent</span> Dashboard
          </Link>

          {/* Login / Register */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/30 px-3 py-1.5 rounded-md transition-colors"
          >
            Login / Register
          </Link>
        </nav>
      </header>

      {/* ── Search strip ────────────────────────────────────── */}
      <div className="bg-red-800 px-4 py-2.5">
        <form
          onSubmit={handleSearch}
          className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-2 items-center"
        >
          <div className="flex-1 flex items-center gap-2 bg-white rounded-md px-3 py-1.5">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Job title, skill, or keyword..."
              className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-white rounded-md px-3 py-1.5">
            <MapPin size={15} className="text-gray-400 shrink-0" />
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="text-sm text-gray-700 focus:outline-none bg-transparent"
            >
              <option value="">All States</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white rounded-md px-3 py-1.5">
            <Briefcase size={15} className="text-gray-400 shrink-0" />
            <select
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              className="text-sm text-gray-700 focus:outline-none bg-transparent"
            >
              <option value="">All Types</option>
              <option value="remote">Remote</option>
              <option value="onsite">Onsite</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-gray-900 hover:bg-black text-white text-sm font-semibold px-5 py-1.5 rounded-md whitespace-nowrap transition-colors"
          >
            Search Jobs
          </button>
        </form>
      </div>

      {/* ── Body: sidebar + main ─────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-3 py-4 flex gap-4 items-start">

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-3 w-52 shrink-0">

          {/* Categories */}
          <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
              Job Categories
            </p>
            {CATEGORIES.map(({ label, icon, query: q }) => (
              <Link
                key={label}
                href={`/jobs?q=${q}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 border-b border-gray-50 last:border-0 transition-colors"
              >
                <span className="text-base leading-none">{icon}</span>
                <span className="flex-1">{label}</span>
              </Link>
            ))}
          </div>

          {/* States */}
          <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
              Browse by State
            </p>
            <div className="p-2 flex flex-wrap gap-1.5">
              {STATES.map((s) => (
                <Link
                  key={s}
                  href={`/jobs?state=${s}`}
                  className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          {/* Work Mode */}
          <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100">
              Work Mode
            </p>
            {[
              { label: "Remote",  icon: "🏠", value: "remote"  },
              { label: "Onsite",  icon: "🏢", value: "onsite"  },
              { label: "Hybrid",  icon: "🔀", value: "hybrid"  },
            ].map(({ label, icon, value }) => (
              <Link
                key={value}
                href={`/jobs?work_mode=${value}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 border-b border-gray-50 last:border-0 transition-colors"
              >
                <span>{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
          </div>

        </aside>

        {/* Main job list */}
        <main className="flex-1 min-w-0 flex flex-col gap-3">

          {/* Tabs + count */}
          <div className="flex items-center justify-between">
            <div className="flex bg-white border border-gray-100 rounded-lg overflow-hidden text-sm">
              {([
                { key: "today",     label: "Today's Jobs"  },
                { key: "yesterday", label: "Yesterday"     },
                { key: "week",      label: "This Week"     },
                { key: "all",       label: "All Jobs"      },
              ] as { key: TabKey; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-2 text-xs font-semibold border-r border-gray-100 last:border-0 transition-colors ${
                    activeTab === key
                      ? "bg-red-700 text-white"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 hidden sm:block">
              {recentJobs.length} jobs loaded
            </span>
          </div>

          {/* Job cards */}
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card animate-pulse space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="card text-center py-16 text-gray-400">
              <Briefcase size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No jobs posted yet. Check back soon!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          {/* View all link */}
          {!loading && recentJobs.length > 0 && (
            <div className="text-center pt-2">
              <Link
                href="/jobs"
                className="text-sm font-semibold text-red-700 hover:underline"
              >
                View all jobs →
              </Link>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-500 text-center py-5 text-xs mt-8">
        © {new Date().getFullYear()} SPOTTER · Recruitment &amp; Talent Matching Platform
      </footer>
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job }: { job: Job }) {
  const workModeColors: Record<string, string> = {
    remote:  "bg-green-50 text-green-700 border-green-200",
    onsite:  "bg-blue-50 text-blue-700 border-blue-200",
    hybrid:  "bg-purple-50 text-purple-700 border-purple-200",
  };
  const modeClass = workModeColors[job.work_mode ?? ""] ?? "bg-gray-50 text-gray-500 border-gray-200";

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="bg-white border border-gray-100 hover:border-red-200 rounded-lg px-4 py-3 flex flex-col gap-2 transition-all group"
    >
      <div className="font-semibold text-sm text-gray-900 group-hover:text-red-700 transition-colors">
        {job.title}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
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
          <span className="px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-500">
            {job.employment_type}
          </span>
        )}
      </div>

      {job.required_skills && job.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.required_skills.slice(0, 4).map((s) => (
            <span key={s} className="text-[11px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full">
              {s}
            </span>
          ))}
          {job.required_skills.length > 4 && (
            <span className="text-[11px] text-gray-400">+{job.required_skills.length - 4}</span>
          )}
        </div>
      )}
    </Link>
  );
}


// // C:\Users\Melody\Documents\Spotter\frontend\src\app\(public)\page.tsx

// "use client";

// import { useState, useEffect } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { Search, MapPin, Briefcase, Building2, Users, TrendingUp } from "lucide-react";
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

// interface Job {
//   id: string;
//   title: string;
//   city?: string;
//   state?: string;
//   work_mode?: string;
//   employment_type?: string;
//   required_skills?: string[];
//   created_at: string;
// }

// export default function HomePage() {
//   const router = useRouter();
//   const [query, setQuery] = useState("");
//   const [state, setState] = useState("");
//   const [recentJobs, setRecentJobs] = useState<Job[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     jobsApi.list({ limit: 6 })
//       .then((r) => setRecentJobs(r.data.jobs))
//       .catch(() => {})
//       .finally(() => setLoading(false));
//   }, []);

//   function handleSearch(e: React.FormEvent) {
//     e.preventDefault();
//     const params = new URLSearchParams();
//     if (query) params.set("q", query);
//     if (state) params.set("state", state);
//     router.push(`/jobs?${params.toString()}`);
//   }

//   return (
//     <div className="min-h-screen bg-white">

//       {/* ── Hero ─────────────────────────────────────────────── */}
//       <section className="bg-gradient-to-br from-red-700 to-red-900 text-white py-20 px-4">
//         <div className="max-w-4xl mx-auto text-center">
//           <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
//             Find Your Perfect Match
//           </h1>
//           <p className="text-red-100 text-lg mb-10 max-w-xl mx-auto">
//             First and Number One African Job Matching Platform.
//           </p>

//           {/* Search bar */}
//           <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
//             <div className="flex-1 flex items-center gap-2 px-3">
//               <Search size={18} className="text-gray-400 shrink-0" />
//               <input
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 placeholder="Job title, skill, or keyword..."
//                 className="flex-1 py-2 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
//               />
//             </div>
//             <div className="flex items-center gap-2 px-3 border-t sm:border-t-0 sm:border-l border-gray-100">
//               <MapPin size={18} className="text-gray-400 shrink-0" />
//               <select
//                 value={state}
//                 onChange={(e) => setState(e.target.value)}
//                 className="py-2 text-gray-700 focus:outline-none text-sm bg-transparent"
//               >
//                 <option value="">All States</option>
//                 {STATES.map((s) => (
//                   <option key={s} value={s}>{s}</option>
//                 ))}
//               </select>
//             </div>
//             <button type="submit" className="btn-primary rounded-xl px-6 whitespace-nowrap">
//               Search Jobs
//             </button>
//           </form>
//         </div>
//       </section>

//       {/* ── Stats bar ────────────────────────────────────────── */}
//       {/* <section className="bg-red-50 border-b border-red-100 py-6 px-4">
//         <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
//           {[
//             { icon: Briefcase,  label: "Active Jobs",      value: "1,200+" },
//             { icon: Users,      label: "Job Seekers",      value: "8,500+" },
//             { icon: Building2,  label: "Organizations",    value: "340+"   },
//             { icon: TrendingUp, label: "Successful Matches", value: "2,100+" },
//           ].map(({ icon: Icon, label, value }) => (
//             <div key={label} className="flex flex-col items-center gap-1">
//               <Icon size={20} className="text-red-600" />
//               <p className="text-2xl font-black text-red-700">{value}</p>
//               <p className="text-xs text-gray-500">{label}</p>
//             </div>
//           ))}
//         </div>
//       </section> */}

//       {/* ── Job categories ───────────────────────────────────── */}
//       <section className="py-14 px-4 max-w-5xl mx-auto">
//         <h2 className="text-2xl font-black text-gray-900 mb-8 text-center">Browse by Category</h2>
//         <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//           {CATEGORIES.map(({ label, icon, query: q }) => (
//             <Link
//               key={label}
//               href={`/jobs?q=${q}`}
//               className="flex flex-col items-center gap-2 p-5 rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-all group"
//             >
//               <span className="text-3xl">{icon}</span>
//               <span className="text-sm font-semibold text-gray-700 group-hover:text-red-700">
//                 {label}
//               </span>
//             </Link>
//           ))}
//         </div>
//       </section>

//       {/* ── Browse by State ──────────────────────────────────── */}
//       <section className="bg-gray-50 py-10 px-4">
//         <div className="max-w-5xl mx-auto">
//           <h2 className="text-xl font-black text-gray-900 mb-5 text-center">Browse by State</h2>
//           <div className="flex flex-wrap justify-center gap-2">
//             {STATES.map((s) => (
//               <Link
//                 key={s}
//                 href={`/jobs?state=${s}`}
//                 className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-600 hover:bg-red-700 hover:text-white hover:border-red-700 transition-all"
//               >
//                 {s}
//               </Link>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* ── Recent Jobs ──────────────────────────────────────── */}
//       <section className="py-14 px-4 max-w-5xl mx-auto">
//         <div className="flex items-center justify-between mb-8">
//           <h2 className="text-2xl font-black text-gray-900">Recent Jobs</h2>
//           <Link href="/jobs" className="text-sm font-semibold text-red-700 hover:underline">
//             View all →
//           </Link>
//         </div>

//         {loading ? (
//           <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
//             {Array.from({ length: 6 }).map((_, i) => (
//               <div key={i} className="card animate-pulse space-y-3">
//                 <div className="h-5 bg-gray-100 rounded w-3/4" />
//                 <div className="h-4 bg-gray-100 rounded w-1/2" />
//                 <div className="h-4 bg-gray-100 rounded w-1/3" />
//               </div>
//             ))}
//           </div>
//         ) : recentJobs.length === 0 ? (
//           <div className="text-center py-16 text-gray-400">
//             <Briefcase size={40} className="mx-auto mb-3 opacity-40" />
//             <p>No jobs posted yet. Check back soon!</p>
//           </div>
//         ) : (
//           <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
//             {recentJobs.map((job) => (
//               <JobCard key={job.id} job={job} />
//             ))}
//           </div>
//         )}
//       </section>

//       {/* ── CTA Banner ───────────────────────────────────────── */}
//       <section className="bg-red-700 text-white py-16 px-4 text-center">
//         <h2 className="text-3xl font-black mb-3">Ready to get spotted?</h2>
//         <p className="text-red-100 mb-8 max-w-md mx-auto">
//           Create your free profile and get matched to jobs that actually fit you.
//         </p>
//         <div className="flex flex-col sm:flex-row gap-3 justify-center">
//           <Link href="/register" className="bg-white text-red-700 font-bold px-8 py-3 rounded-xl hover:bg-red-50 transition-colors">
//             Get Started Free
//           </Link>
//           <Link href="/jobs" className="border border-white text-white font-bold px-8 py-3 rounded-xl hover:bg-red-600 transition-colors">
//             Browse Jobs
//           </Link>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="bg-gray-900 text-gray-400 text-center py-6 text-sm">
//         © {new Date().getFullYear()} SPOTTER · Recruitment & Talent Matching Platform
//       </footer>
//     </div>
//   );
// }

// // ── Inline JobCard ─────────────────────────────────────────────────────────
// function JobCard({ job }: { job: Job }) {
//   const workModeColors: Record<string, string> = {
//     remote:  "bg-green-100 text-green-700",
//     onsite:  "bg-blue-100 text-blue-700",
//     hybrid:  "bg-purple-100 text-purple-700",
//   };
//   const colorClass = workModeColors[job.work_mode ?? ""] ?? "bg-gray-100 text-gray-600";

//   return (
//     <Link href={`/jobs/${job.id}`} className="card hover:shadow-md hover:border-red-100 transition-all block group">
//       <div className="space-y-3">
//         <h3 className="font-semibold text-gray-900 group-hover:text-red-700 transition-colors line-clamp-2">
//           {job.title}
//         </h3>
//         {(job.city || job.state) && (
//           <p className="text-sm text-gray-500 flex items-center gap-1">
//             <MapPin size={13} className="shrink-0" />
//             {[job.city, job.state].filter(Boolean).join(", ")}
//           </p>
//         )}
//         <div className="flex items-center gap-2 flex-wrap">
//           {job.work_mode && (
//             <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
//               {job.work_mode}
//             </span>
//           )}
//           {job.employment_type && (
//             <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
//               {job.employment_type}
//             </span>
//           )}
//         </div>
//         {job.required_skills && job.required_skills.length > 0 && (
//           <div className="flex flex-wrap gap-1">
//             {job.required_skills.slice(0, 3).map((s) => (
//               <span key={s} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">
//                 {s}
//               </span>
//             ))}
//             {job.required_skills.length > 3 && (
//               <span className="text-xs text-gray-400">+{job.required_skills.length - 3}</span>
//             )}
//           </div>
//         )}
//       </div>
//     </Link>
//   );
// }