// C:\Users\Melody\Documents\Spotter\frontend\src\app\agent\jobs\new\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, X, Loader2, Briefcase, Star } from "lucide-react";
import toast from "react-hot-toast";
import { agentApi, jobsApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";

// ── Constants ──────────────────────────────────────────────────────────────
const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];
const WORK_MODES       = ["remote", "onsite", "hybrid"];
const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "internship"];

// ── Schema ─────────────────────────────────────────────────────────────────
const schema = z.object({
  org_id:           z.string().min(1, "Select an organisation"),
  title:            z.string().min(3, "Job title is required"),
  description:      z.string().min(20, "Write at least 20 characters"),
  city:             z.string().optional(),
  state:            z.string().optional(),
  work_mode:        z.string().optional(),
  employment_type:  z.string().optional(),
  salary_min:       z.number().optional(),
  salary_max:       z.number().optional(),
  required_experience_years: z.number().optional(),
});
type FormData = z.infer<typeof schema>;

interface OrgOption {
  id: string;
  name: string;
  city?: string;
  state?: string;
  is_verified?: boolean;
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function AgentPostJobPage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [skills,    setSkills]    = useState<string[]>([]);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "agent") return;
    setOrgsLoading(true);
    agentApi.listOrgs()
      .then((r) => setOrgs(r.data ?? []))
      .catch(() => setOrgs([]))
      .finally(() => setOrgsLoading(false));
  }, [isLoggedIn, user]);

  async function onSubmit(data: FormData) {
    if (!isLoggedIn() || user?.role !== "agent") {
      toast.error("You must be logged in as an agent.");
      return;
    }
    try {
      const res = await jobsApi.create({
        ...data,
        required_skills:     skills,
        required_tech_stack: techStack,
        certifications_required: [],
        licenses_required:   [],
      });
      toast.success("Job posted! You earned 2 points.");
      router.push(`/jobs/${res.data.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to post job.");
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/agent/dashboard"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Post a Job</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                You earn <strong className="text-amber-600">2 points</strong> per job posted
              </p>
            </div>
          </div>

          {/* Points info banner */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <Star size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Earn points for every action</p>
              <p className="text-amber-700 text-xs mt-0.5">
                Post a job → 2 pts · Successful match → 5 pts · Referral earns → you earn too
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Basic info */}
            <div className="card space-y-4">
              <SectionHeader step="1" title="Job Details" />

              <Field label="Organisation *" error={errors.org_id?.message}>
                <select {...register("org_id")} className="input" disabled={orgsLoading}>
                  <option value="">
                    {orgsLoading ? "Loading organisations..." : "Select organisation"}
                  </option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}{o.city || o.state ? ` — ${[o.city, o.state].filter(Boolean).join(", ")}` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Job Title *" error={errors.title?.message}>
                <input {...register("title")} className="input"
                  placeholder="e.g. Senior Accountant" />
              </Field>

              <Field label="Description *" error={errors.description?.message}>
                <textarea {...register("description")} rows={4}
                  className="input resize-none"
                  placeholder="Describe the role and responsibilities..." />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Employment Type">
                  <select {...register("employment_type")} className="input">
                    <option value="">Select type</option>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <option key={t} value={t} className="capitalize">{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Work Mode">
                  <select {...register("work_mode")} className="input">
                    <option value="">Select mode</option>
                    {WORK_MODES.map((m) => (
                      <option key={m} value={m} className="capitalize">{m}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {/* Location + salary */}
            <div className="card space-y-4">
              <SectionHeader step="2" title="Location & Salary" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="State">
                  <select {...register("state")} className="input">
                    <option value="">Select state</option>
                    {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="City">
                  <input {...register("city")} className="input" placeholder="e.g. Lekki" />
                </Field>
                <Field label="Min Salary (₦)">
                  <input type="number" {...register("salary_min")}
                    className="input" placeholder="120000" />
                </Field>
                <Field label="Max Salary (₦)">
                  <input type="number" {...register("salary_max")}
                    className="input" placeholder="250000" />
                </Field>
              </div>
            </div>

            {/* Requirements */}
            <div className="card space-y-4">
              <SectionHeader step="3" title="Requirements" />
              <TagInput
                label="Required Skills"
                hint="e.g. Accounting, QuickBooks, Excel"
                tags={skills}
                onChange={setSkills}
              />
              <TagInput
                label="Tech Stack"
                hint="e.g. SAP, Python, SQL"
                tags={techStack}
                onChange={setTechStack}
              />
              <Field label="Years of Experience">
                <input type="number" {...register("required_experience_years")}
                  className="input" placeholder="2" min={0} max={30} />
              </Field>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Link href="/agent/dashboard" className="btn-ghost text-sm">Cancel</Link>
              <button type="submit" disabled={isSubmitting}
                className="btn-primary flex items-center gap-2">
                {isSubmitting
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Briefcase size={16} />
                }
                {isSubmitting ? "Posting…" : "Post Job (+2 pts)"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function SectionHeader({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex items-center gap-3 pb-1 border-b border-gray-100">
      <span className="bg-red-700 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">
        {step}
      </span>
      <h2 className="font-bold text-gray-900">{title}</h2>
    </div>
  );
}

function Field({ label, error, children }: {
  label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function TagInput({ label, hint, tags, onChange }: {
  label: string; hint: string; tags: string[]; onChange: (t: string[]) => void;
}) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="input flex-1 text-sm" placeholder={hint} />
        <button type="button" onClick={add} className="btn-primary px-3 py-2">
          <Plus size={16} />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-medium px-3 py-1 rounded-full">
              {t}
              <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
