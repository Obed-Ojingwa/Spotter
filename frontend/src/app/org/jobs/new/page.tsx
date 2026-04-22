// C:\Users\Melody\Documents\Spotter\frontend\src\app\org\jobs\new\page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, X, Loader2, Briefcase } from "lucide-react";
import toast from "react-hot-toast";
import { jobsApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

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
const EDUCATION_LVLS   = ["SSCE", "OND", "HND", "BSc", "PGD", "Masters", "PhD"];
const DEGREE_CLASSES   = ["First Class", "Second Class Upper", "Second Class Lower", "Third Class", "Pass"];

// ── Schema ─────────────────────────────────────────────────────────────────
const schema = z.object({
  title:                    z.string().min(3, "Job title is required"),
  description:              z.string().min(20, "Please write at least 20 characters"),
  city:                     z.string().optional(),
  state:                    z.string().optional(),
  work_mode:                z.string().optional(),
  employment_type:          z.string().optional(),
  salary_min:               z.number().optional(),
  salary_max:               z.number().optional(),
  required_experience_years:z.number().optional(),
  required_education:       z.string().optional(),
  required_degree_class:    z.string().optional(),
  preferred_gender:         z.string().optional(),
  preferred_religion:       z.string().optional(),
  preferred_age_min:        z.number().optional(),
  preferred_age_max:        z.number().optional(),
  preferred_marital_status: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ── Page ───────────────────────────────────────────────────────────────────
export default function PostJobPage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [skills,     setSkills]     = useState<string[]>([]);
  const [techStack,  setTechStack]  = useState<string[]>([]);
  const [certs,      setCerts]      = useState<string[]>([]);
  const [licenses,   setLicenses]   = useState<string[]>([]);
  const [showDemog,  setShowDemog]  = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    if (!isLoggedIn() || user?.role !== "org") {
      toast.error("You must be logged in as an organisation.");
      return;
    }
    try {
      const res = await jobsApi.create({
        ...data,
        required_skills:      skills,
        required_tech_stack:  techStack,
        certifications_required: certs,
        licenses_required:    licenses,
      });
      toast.success("Job posted successfully!");
      router.push(`/jobs/${res.data.id}`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const detailMsg =
        typeof detail === "string"
          ? detail
          : detail && typeof detail === "object" && "message" in detail
            ? String((detail as { message: string }).message)
            : null;
      if (err?.response?.status === 402) {
        toast.error(detailMsg ?? "No free posts left — add a job post payment to continue.");
        router.push("/org/billing");
      } else {
        toast.error(detailMsg ?? "Failed to post job.");
      }
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/org/dashboard" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Post a Job</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                The more detail you add, the more accurate your candidate matches will be
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* ── Basic info ──────────────────────────────────── */}
            <Section title="Job Details" step="1">
              <Field label="Job Title *" error={errors.title?.message}>
                <input {...register("title")} className="input" placeholder="e.g. Senior React Developer" />
              </Field>
              <Field label="Job Description *" error={errors.description?.message}>
                <textarea
                  {...register("description")}
                  rows={5}
                  className="input resize-none"
                  placeholder="Describe the role, responsibilities, and what success looks like..."
                />
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
            </Section>

            {/* ── Location + salary ───────────────────────────── */}
            <Section title="Location & Salary" step="2">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="State">
                  <select {...register("state")} className="input">
                    <option value="">Select state</option>
                    {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="City">
                  <input {...register("city")} className="input" placeholder="e.g. Ikeja" />
                </Field>
                <Field label="Salary Min (₦)">
                  <input type="number" {...register("salary_min")} className="input" placeholder="150000" />
                </Field>
                <Field label="Salary Max (₦)">
                  <input type="number" {...register("salary_max")} className="input" placeholder="350000" />
                </Field>
              </div>
            </Section>

            {/* ── Requirements ────────────────────────────────── */}
            <Section title="Requirements" step="3">
              <TagInput label="Required Skills" hint="e.g. Project Management, Excel"
                tags={skills} onChange={setSkills} />
              <TagInput label="Tech Stack" hint="e.g. React, Python, SQL"
                tags={techStack} onChange={setTechStack} />
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <Field label="Years of Experience">
                  <input type="number" {...register("required_experience_years")}
                    className="input" placeholder="3" min={0} max={30} />
                </Field>
                <Field label="Education Level">
                  <select {...register("required_education")} className="input">
                    <option value="">Any level</option>
                    {EDUCATION_LVLS.map((e) => <option key={e}>{e}</option>)}
                  </select>
                </Field>
                <Field label="Degree Classification">
                  <select {...register("required_degree_class")} className="input">
                    <option value="">Any class</option>
                    {DEGREE_CLASSES.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </Field>
              </div>
              <TagInput label="Certifications Required" hint="e.g. PMP, AWS"
                tags={certs} onChange={setCerts} />
              <TagInput label="Licenses Required" hint="e.g. Driver's Licence"
                tags={licenses} onChange={setLicenses} />
            </Section>

            {/* ── Optional demographic preferences ──────────── */}
            <div className="card">
              <button
                type="button"
                onClick={() => setShowDemog(!showDemog)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-gray-200 text-gray-600 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">4</span>
                  <span className="font-bold text-gray-900">Candidate Preferences</span>
                  <span className="text-xs text-gray-400">(optional)</span>
                </div>
                <span className={cn("text-gray-400 transition-transform text-lg", showDemog && "rotate-180")}>›</span>
              </button>

              {showDemog && (
                <div className="mt-5 space-y-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Only fill these if your role genuinely requires them. They affect match scoring.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Preferred Gender">
                      <select {...register("preferred_gender")} className="input">
                        <option value="">No preference</option>
                        <option>Male</option><option>Female</option>
                      </select>
                    </Field>
                    <Field label="Preferred Religion">
                      <select {...register("preferred_religion")} className="input">
                        <option value="">No preference</option>
                        <option>Christianity</option><option>Islam</option>
                        <option>Traditional</option><option>Other</option>
                      </select>
                    </Field>
                    <Field label="Age Min">
                      <input type="number" {...register("preferred_age_min")}
                        className="input" placeholder="18" min={16} max={80} />
                    </Field>
                    <Field label="Age Max">
                      <input type="number" {...register("preferred_age_max")}
                        className="input" placeholder="45" min={16} max={80} />
                    </Field>
                    <Field label="Marital Status">
                      <select {...register("preferred_marital_status")} className="input">
                        <option value="">No preference</option>
                        <option>Single</option><option>Married</option>
                      </select>
                    </Field>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-2">
              <Link href="/org/dashboard" className="btn-ghost text-sm">Cancel</Link>
              <button type="submit" disabled={isSubmitting}
                className="btn-primary flex items-center gap-2">
                {isSubmitting
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Briefcase size={16} />
                }
                {isSubmitting ? "Posting…" : "Post Job"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function Section({ title, step, children }: { title: string; step: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3 pb-1 border-b border-gray-100">
        <span className="bg-red-700 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">
          {step}
        </span>
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
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
        <button type="button" onClick={add} className="btn-primary px-3 py-2 text-sm">
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
