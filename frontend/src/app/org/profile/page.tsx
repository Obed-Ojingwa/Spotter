// C:\Users\Melody\Documents\Spotter\frontend\src\app\org\profile\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Save, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];

const INDUSTRIES = [
  "Technology","Finance","Healthcare","Education","Engineering",
  "Marketing","Sales","Manufacturing","Logistics","Media",
  "Real Estate","Legal","Agriculture","Energy","Other",
];

const schema = z.object({
  name:        z.string().min(2, "Organisation name is required"),
  description: z.string().optional(),
  industry:    z.string().optional(),
  website:     z.string().url("Enter a valid URL").optional().or(z.literal("")),
  phone:       z.string().optional(),
  address:     z.string().optional(),
  city:        z.string().optional(),
  state:       z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function OrgProfilePage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "org") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "org") return;
    api.get("/org/profile")
      .then((r) => reset(r.data))
      .catch(() => toast.error("Could not load profile"))
      .finally(() => setLoading(false));
  }, [isLoggedIn, user, reset]);

  async function onSubmit(data: FormData) {
    try {
      await api.put("/org/profile", data);
      toast.success("Profile saved!");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Save failed.");
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-red-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

          <div className="flex items-center gap-4">
            <Link href="/org/dashboard" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Organisation Profile</h1>
              <p className="text-sm text-gray-500 mt-0.5">Keep your details up to date</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
              <Building2 size={18} className="text-red-600" />
              <h2 className="font-bold text-gray-900">Organisation Details</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Organisation Name *</label>
                <input {...register("name")} className="input" placeholder="Acme Nigeria Ltd" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea {...register("description")} rows={3} className="input resize-none"
                  placeholder="What does your organisation do?" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry</label>
                <select {...register("industry")} className="input">
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input {...register("phone")} className="input" placeholder="+234 800 000 0000" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
                <input {...register("website")} className="input" placeholder="https://yourcompany.com" />
                {errors.website && <p className="text-red-500 text-xs mt-1">{errors.website.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                <select {...register("state")} className="input">
                  <option value="">Select state</option>
                  {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <input {...register("city")} className="input" placeholder="e.g. Victoria Island" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <input {...register("address")} className="input" placeholder="12 Marina Street, Lagos" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link href="/org/dashboard" className="btn-ghost text-sm">Cancel</Link>
              <button type="submit" disabled={isSubmitting}
                className="btn-primary flex items-center gap-2">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSubmitting ? "Saving…" : "Save Profile"}
              </button>
            </div>
          </form>

        </div>
      </div>
    </>
  );
}
