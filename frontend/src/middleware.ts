// C:\Users\Melody\Documents\Spotter\frontend\src\middleware.ts

import { NextRequest, NextResponse } from "next/server";

// Routes that require login — matched by prefix
const PROTECTED_PREFIXES = [
  "/seeker",
  "/org",
  "/agent",
  "/spotter",
  "/admin",
  "/payment",
];

// Role → allowed prefix map
// If a user hits a route they're not allowed, redirect to their own dashboard
const ROLE_HOME: Record<string, string> = {
  seeker:          "/seeker/dashboard",
  org:             "/org/dashboard",
  agent:           "/agent/dashboard",
  spotter:         "/spotter/queue",
  admin:           "/admin/dashboard",
  executive_admin: "/admin/executive",
  super_admin:     "/admin/super",
};

const ROLE_ALLOWED_PREFIX: Record<string, string[]> = {
  seeker:          ["/seeker", "/payment"],
  org:             ["/org", "/payment"],
  agent:           ["/agent", "/payment"],
  spotter:         ["/spotter"],
  admin:           ["/admin"],
  executive_admin: ["/admin"],
  super_admin:     ["/admin"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this route needs protection
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  // Read auth from cookie (we'll store it there) or check the header
  // Next.js middleware can't access localStorage — we use a cookie instead
  const role = request.cookies.get("spotter_role")?.value;

  // Not logged in — redirect to login with return URL
  if (!role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in but wrong portal — redirect to their dashboard
  const allowed = ROLE_ALLOWED_PREFIX[role] ?? [];
  const hasAccess = allowed.some((prefix) => pathname.startsWith(prefix));
  if (!hasAccess) {
    const home = ROLE_HOME[role] ?? "/";
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on app routes, not on API / _next / static files
  matcher: [
    "/seeker/:path*",
    "/org/:path*",
    "/agent/:path*",
    "/spotter/:path*",
    "/admin/:path*",
    "/payment/:path*",
  ],
};
