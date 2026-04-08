import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(kobo / 100);
}

export function scoreColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  if (score >= 50) return "text-orange-500";
  return "text-red-600";
}

export function scoreBg(score: number): string {
  if (score >= 90) return "bg-green-100";
  if (score >= 70) return "bg-yellow-100";
  if (score >= 50) return "bg-orange-100";
  return "bg-red-100";
}

export function getRoleDashboard(role: string): string {
  const map: Record<string, string> = {
    seeker: "/seeker/dashboard",
    org: "/org/dashboard",
    agent: "/agent/dashboard",
    spotter: "/spotter/queue",
    admin: "/admin/dashboard",
    super_admin: "/admin/dashboard",
  };
  return map[role] || "/";
}


// import { clsx, type ClassValue } from "clsx";
// import { twMerge } from "tailwind-merge";

// export function cn(...inputs: ClassValue[]) {
//   return twMerge(clsx(inputs));
// }

// export function formatNaira(kobo: number) {
//   return new Intl.NumberFormat("en-NG", {
//     style: "currency",
//     currency: "NGN",
//     minimumFractionDigits: 0,
//   }).format(kobo / 100);
// }

// export function scoreColor(score: number): string {
//   if (score >= 90) return "text-green-600";
//   if (score >= 70) return "text-yellow-600";
//   if (score >= 50) return "text-orange-500";
//   return "text-red-500";
// }

// export function scoreBg(score: number): string {
//   if (score >= 90) return "bg-green-100 text-green-800";
//   if (score >= 70) return "bg-yellow-100 text-yellow-800";
//   if (score >= 50) return "bg-orange-100 text-orange-800";
//   return "bg-red-100 text-red-800";
// }

// export function getRoleDashboard(role: string): string {
//   const map: Record<string, string> = {
//     seeker: "/seeker/dashboard",
//     org: "/org/dashboard",
//     agent: "/agent/dashboard",
//     spotter: "/spotter/queue",
//     admin: "/admin/dashboard",
//     super_admin: "/admin/dashboard",
//   };
//   return map[role] || "/";
// }