"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getRoleDashboard } from "@/lib/utils";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

// ── Desktop nav links — full set, unchanged ────────────────────────────────
const NAV_LINKS: Record<string, { label: string; href: string }[]> = {
  seeker: [
    { label: "Dashboard",    href: "/seeker/dashboard" },
    { label: "Browse Jobs",  href: "/jobs" },
    { label: "My Matches",   href: "/seeker/matches" },
    { label: "Applications", href: "/seeker/applications" },
    { label: "Profile",      href: "/seeker/profile" },
  ],
  org: [
    { label: "Dashboard",  href: "/org/dashboard" },
    { label: "My Jobs",    href: "/org/jobs" },
    { label: "Candidates", href: "/org/candidates" },
    { label: "Billing",    href: "/org/billing" },
  ],
  agent: [
    { label: "Dashboard", href: "/agent/dashboard" },
    { label: "Post Job",  href: "/agent/jobs/new" },
    { label: "Points",    href: "/agent/points" },
    { label: "Referrals", href: "/agent/referrals" },
  ],
  spotter: [
    { label: "Review Queue", href: "/spotter/queue" },
    { label: "Approved",     href: "/spotter/approved" },
  ],
  admin: [
    { label: "Dashboard",  href: "/admin/overview" },
    { label: "Users",      href: "/admin/users" },
    { label: "Agents",     href: "/admin/agents" },
    { label: "Promotions", href: "/admin/promotions" },
    { label: "Reports",    href: "/admin/reports" },
  ],
  executive_admin: [
    { label: "Dashboard", href: "/admin/executive" },
    { label: "Users",     href: "/admin/users" },
    { label: "Agents",    href: "/admin/agents" },
    { label: "Reports",   href: "/admin/reports" },
  ],
  super_admin: [
    { label: "Control Centre", href: "/admin/super" },
    { label: "Users",          href: "/admin/users" },
    { label: "Agents",         href: "/admin/agents" },
    { label: "Promotions",     href: "/admin/promotions" },
    { label: "Reports",        href: "/admin/reports" },
  ],
};

// ── Mobile nav links — stripped down ──────────────────────────────────────
// Only: Dashboard (role-appropriate) + Browse Jobs.
// Recruiter (org) and Agent dashboards are excluded.
// Sign In / Sign Out is handled separately below.
const MOBILE_NAV_LINKS: Record<string, { label: string; href: string }[]> = {
  seeker: [
    { label: "My Dashboard", href: "/seeker/dashboard" },
    { label: "Browse Jobs",  href: "/jobs" },
  ],
  org: [
    { label: "Browse Jobs", href: "/jobs" },
  ],
  agent: [
    { label: "Browse Jobs", href: "/jobs" },
  ],
  spotter: [
    { label: "Review Queue", href: "/spotter/queue" },
  ],
  admin: [
    { label: "Dashboard",  href: "/admin/overview" },
    { label: "Browse Jobs", href: "/jobs" },
  ],
  executive_admin: [
    { label: "Dashboard",  href: "/admin/executive" },
    { label: "Browse Jobs", href: "/jobs" },
  ],
  super_admin: [
    { label: "Control Centre", href: "/admin/super" },
    { label: "Browse Jobs",    href: "/jobs" },
  ],
};

export default function Navbar() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const desktopLinks = user ? (NAV_LINKS[user.role] ?? []) : [];
  const mobileLinks  = user ? (MOBILE_NAV_LINKS[user.role] ?? []) : [];

  function handleLogout() {
    clearAuth();
    setOpen(false);
    router.push("/login");
  }

  return (
    <nav className="bg-red-700 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            href={user ? getRoleDashboard(user.role) : "/"}
            className="flex items-center gap-2 font-black text-2xl tracking-tight"
          >
            <span className="bg-white text-red-700 px-2 py-0.5 rounded font-black">S</span>
            POTTER
          </Link>

          {/* Desktop links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-1">
            {desktopLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-2 rounded-lg text-sm font-medium text-red-100 hover:bg-red-600 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
            {!user && (
              <>
                <Link
                  href="/jobs"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-red-100 hover:bg-red-600 hover:text-white transition-colors"
                >
                  Browse Jobs
                </Link>
                <Link
                  href="/login"
                  className="ml-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white text-red-700 hover:bg-red-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="ml-1 px-4 py-2 rounded-lg text-sm font-semibold border border-white text-white hover:bg-red-600 transition-colors"
                >
                  Register
                </Link>
              </>
            )}
            {user && (
              <button
                onClick={handleLogout}
                className="ml-2 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-100 hover:bg-red-600 hover:text-white transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            )}
          </div>

          {/* Mobile hamburger — visible on mobile only */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-red-600 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu — trimmed link set */}
      {open && (
        <div className="md:hidden border-t border-red-600 bg-red-700 px-4 py-3 space-y-1">

          {/* Role-specific mobile links */}
          {mobileLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-red-100 hover:bg-red-600 hover:text-white"
            >
              {l.label}
            </Link>
          ))}

          {/* Logged-out state: Browse Jobs + Sign In only */}
          {!user && (
            <>
              <Link
                href="/jobs"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-red-100 hover:bg-red-600 hover:text-white"
              >
                Browse Jobs
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-red-100 hover:bg-red-600 hover:text-white"
              >
                Sign In
              </Link>
            </>
          )}

          {/* Sign Out — always shown when logged in */}
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-100 hover:bg-red-600 hover:text-white rounded-lg w-full"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}






// "use client";

// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useAuthStore } from "@/store/authStore";
// import { getRoleDashboard } from "@/lib/utils";
// import { LogOut, Menu, X } from "lucide-react";
// import { useState } from "react";

// const NAV_LINKS: Record<string, { label: string; href: string }[]> = {
//   seeker: [
//     { label: "Dashboard", href: "/seeker/dashboard" },
//     { label: "Browse Jobs", href: "/jobs" },
//     { label: "My Matches", href: "/seeker/matches" },
//     { label: "Applications", href: "/seeker/applications" },
//     { label: "Profile", href: "/seeker/profile" },
//   ],
//   org: [
//     { label: "Dashboard", href: "/org/dashboard" },
//     { label: "My Jobs", href: "/org/jobs" },
//     { label: "Candidates", href: "/org/candidates" },
//     { label: "Billing", href: "/org/billing" },
//   ],
//   agent: [
//     { label: "Dashboard", href: "/agent/dashboard" },
//     { label: "Post Job", href: "/agent/jobs/new" },
//     { label: "Points", href: "/agent/points" },
//     { label: "Referrals", href: "/agent/referrals" },
//   ],
//   spotter: [
//     { label: "Review Queue", href: "/spotter/queue" },
//     { label: "Approved", href: "/spotter/approved" },
//   ],
//   admin: [
//     { label: "Dashboard",   href: "/admin/overview" },
//     { label: "Users",       href: "/admin/users" },
//     { label: "Agents",      href: "/admin/agents" },
//     { label: "Promotions",  href: "/admin/promotions" },
//     { label: "Reports",     href: "/admin/reports" },
//   ],
//   executive_admin: [
//     { label: "Dashboard",   href: "/admin/executive" },
//     { label: "Users",       href: "/admin/users" },
//     { label: "Agents",      href: "/admin/agents" },
//     { label: "Reports",     href: "/admin/reports" },
//   ],
//   super_admin: [
//     { label: "Control Centre", href: "/admin/super" },
//     { label: "Users",          href: "/admin/users" },
//     { label: "Agents",         href: "/admin/agents" },
//     { label: "Promotions",     href: "/admin/promotions" },
//     { label: "Reports",        href: "/admin/reports" },
//   ],
// };

// export default function Navbar() {
//   const { user, clearAuth } = useAuthStore();
//   const router = useRouter();
//   const [open, setOpen] = useState(false);

//   const links = user ? (NAV_LINKS[user.role] ?? []) : [];

//   function handleLogout() {
//     clearAuth();
//     router.push("/login");
//   }

//   return (
//     <nav className="bg-red-700 text-white shadow-md sticky top-0 z-50">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex items-center justify-between h-16">

//           {/* Logo */}
//           <Link
//             href={user ? getRoleDashboard(user.role) : "/"}
//             className="flex items-center gap-2 font-black text-2xl tracking-tight"
//           >
//             <span className="bg-white text-red-700 px-2 py-0.5 rounded font-black">S</span>
//             POTTER
//           </Link>

//           {/* Desktop links */}
//           <div className="hidden md:flex items-center gap-1">
//             {links.map((l) => (
//               <Link
//                 key={l.href}
//                 href={l.href}
//                 className="px-3 py-2 rounded-lg text-sm font-medium text-red-100 hover:bg-red-600 hover:text-white transition-colors"
//               >
//                 {l.label}
//               </Link>
//             ))}
//             {!user && (
//               <>
//                 <Link href="/jobs" className="px-3 py-2 rounded-lg text-sm font-medium text-red-100 hover:bg-red-600 hover:text-white transition-colors">
//                   Browse Jobs
//                 </Link>
//                 <Link href="/login" className="ml-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white text-red-700 hover:bg-red-50 transition-colors">
//                   Sign In
//                 </Link>
//                 <Link href="/register" className="ml-1 px-4 py-2 rounded-lg text-sm font-semibold border border-white text-white hover:bg-red-600 transition-colors">
//                   Register
//                 </Link>
//               </>
//             )}
//             {user && (
//               <button
//                 onClick={handleLogout}
//                 className="ml-2 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-100 hover:bg-red-600 hover:text-white transition-colors"
//               >
//                 <LogOut size={16} />
//                 Sign Out
//               </button>
//             )}
//           </div>

//           {/* Mobile hamburger */}
//           <button
//             className="md:hidden p-2 rounded-lg hover:bg-red-600 transition-colors"
//             onClick={() => setOpen(!open)}
//           >
//             {open ? <X size={22} /> : <Menu size={22} />}
//           </button>
//         </div>
//       </div>

//       {/* Mobile menu */}
//       {open && (
//         <div className="md:hidden border-t border-red-600 bg-red-700 px-4 py-3 space-y-1">
//           {links.map((l) => (
//             <Link
//               key={l.href}
//               href={l.href}
//               onClick={() => setOpen(false)}
//               className="block px-3 py-2 rounded-lg text-sm font-medium text-red-100 hover:bg-red-600 hover:text-white"
//             >
//               {l.label}
//             </Link>
//           ))}
//           {!user && (
//             <>
//               <Link href="/login" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium text-red-100 hover:bg-red-600 rounded-lg">Sign In</Link>
//               <Link href="/register" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium text-red-100 hover:bg-red-600 rounded-lg">Register</Link>
//             </>
//           )}
//           {user && (
//             <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-100 hover:bg-red-600 rounded-lg w-full">
//               <LogOut size={16} /> Sign Out
//             </button>
//           )}
//         </div>
//       )}
//     </nav>
//   );
// }
