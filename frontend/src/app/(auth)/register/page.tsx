"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { getRoleDashboard } from "@/lib/utils";
import { Eye, EyeOff, Loader2, Briefcase, Building2, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "seeker",  label: "Job Seeker",   icon: Briefcase,   desc: "Find your next role" },
  { value: "org",     label: "Organization", icon: Building2,   desc: "Hire top talent" },
  { value: "agent",   label: "Agent",        icon: Users,       desc: "Connect talent & earn" },
  { value: "spotter", label: "Spotter",      icon: ShieldCheck, desc: "Review & approve matches" },
];

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string(),
  role: z.string().min(1, "Select a role"),
  referral_code: z.string().optional(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [showPwd, setShowPwd] = useState(false);

  const defaultRef = searchParams.get("ref") ?? "";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "", referral_code: defaultRef },
  });

  const selectedRole = watch("role");

  async function onSubmit(data: FormData) {
    try {
      const res = await authApi.register(
        data.email,
        data.password,
        data.role,
        data.role === "agent" ? data.referral_code : undefined
      );
      setAuth(res.data);
      toast.success("Account created! Welcome to SPOTTER.");
      router.push(getRoleDashboard(res.data.role));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Registration failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-3xl text-red-700">
            <span className="bg-red-700 text-white px-2.5 py-1 rounded-lg font-black">S</span>
            POTTER
          </Link>
          <p className="text-gray-500 mt-2 text-sm">Create your account</p>
        </div>

        <div className="card shadow-md">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue("role", value, { shouldValidate: true })}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all",
                      selectedRole === value
                        ? "border-red-600 bg-red-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={16} className={selectedRole === value ? "text-red-700" : "text-gray-400"} />
                      <span className={cn("text-sm font-semibold", selectedRole === value ? "text-red-700" : "text-gray-700")}>
                        {label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{desc}</span>
                  </button>
                ))}
              </div>
              {errors.role && (
                <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input type="email" {...register("email")} className="input" placeholder="you@example.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  {...register("password")}
                  className="input pr-10"
                  placeholder="Min. 8 characters"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input type="password" {...register("confirm")} className="input" placeholder="••••••••" />
              {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>}
            </div>

            {/* Referral code (agents only) */}
            {selectedRole === "agent" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Referral code <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  {...register("referral_code")}
                  className="input"
                  placeholder="Enter agent referral code"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={18} className="animate-spin" />}
              {isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-red-700 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
