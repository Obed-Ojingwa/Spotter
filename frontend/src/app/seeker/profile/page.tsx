// C:\Users\Melody\Documents\Spotter\frontend\src\app\seeker\profile\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  Loader2, Plus, X, ArrowLeft, Save, CheckCircle,
  FileText, Upload, ExternalLink, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import Link from "next/link";
import { seekerApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────
const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];
const RELIGIONS      = ["Christianity","Islam","Traditional","Other","Prefer not to say"];
const GENDERS        = ["Male","Female","Prefer not to say"];
const MARITAL        = ["Single","Married","Divorced","Widowed","Prefer not to say"];
const EDUCATION_LVLS = ["SSCE","OND","HND","BSc","PGD","Masters","PhD"];
const DEGREE_CLASSES = ["First Class","Second Class Upper","Second Class Lower","Third Class","Pass","N/A"];
const WORK_MODES     = ["Remote","Onsite","Hybrid"];
const NYSC_STATUS    = ["Completed","Ongoing","Exempted","Not Applicable"];
const SKILL_RATINGS  = ["Excellent","Very Good","Good","Fair","Basic"];
const PROXIMITY_OPTS = ["Within same city","Within 10 km","Within 30 km","Willing to relocate","Remote only"];
const COMPLEXION_OPTS= ["Very Fair","Fair","Medium","Dark","Very Dark","Prefer not to say"];

// ── Schema ─────────────────────────────────────────────────────────────────
const schema = z.object({
  // Core required fields
  name:                  z.string().min(2, "Name is required"),
  phone:                 z.string().optional(),
  address:               z.string().optional(),
  street:                z.string().optional(),
  city:                  z.string().min(1, "City is required"),
  state:                 z.string().min(1, "State is required"),
  religion:              z.string().optional(),
  gender:                z.string().min(1, "Gender is required"),
  age:                   z.number().min(16).max(80).optional(),
  marital_status:        z.string().optional(),
  education:             z.string().min(1, "Education level is required"),
  degree_classification: z.string().optional(),
  work_mode:             z.string().min(1, "Work preference is required"),
  available:             z.boolean(),
  // Extended matching fields — all optional
  desired_job:               z.string().optional(),
  nysc_status:               z.string().optional(),
  state_of_origin:           z.string().optional(),
  tribe:                     z.string().optional(),
  skin_complexion:           z.string().optional(),
  physical_attributes:       z.string().optional(),
  professional_qualification:z.string().optional(),
  school_attended:           z.string().optional(),
  course_studied:            z.string().optional(),
  writing_skill:             z.string().optional(),
  speaking_skill:            z.string().optional(),
  communication_skill:       z.string().optional(),
  work_attitude:             z.string().optional(),
  reliability_consistency:   z.string().optional(),
  emotional_intelligence:    z.string().optional(),
  learning_ability:          z.string().optional(),
  charisma:                  z.string().optional(),
  dress_sense:               z.string().optional(),
  motivational_drive:        z.string().optional(),
  location:                  z.string().optional(),
  proximity:                 z.string().optional(),
  track_record:              z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ── Page ───────────────────────────────────────────────────────────────────
export default function SeekerProfilePage() {
  const router               = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [skills,         setSkills]         = useState<string[]>([]);
  const [softSkills,     setSoftSkills]     = useState<string[]>([]);
  const [techStack,      setTechStack]      = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [licenses,       setLicenses]       = useState<string[]>([]);
  const [languages,      setLanguages]      = useState<string[]>([]);
  const [experience,     setExperience]     = useState<WorkExp[]>([]);

  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [complete,     setComplete]     = useState(false);
  const [cvUrl,        setCvUrl]        = useState<string | null>(null);
  const [cvUploading,  setCvUploading]  = useState(false);
  const [showMatching, setShowMatching] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (user?.role !== "seeker") { router.push("/"); return; }
  }, [isLoggedIn, user, router]);

  const { register, handleSubmit, reset, control, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  // Load existing profile
  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "seeker") return;
    seekerApi.getProfile()
      .then((r) => {
        const d = r.data;
        reset({
          name:                  d.name ?? "",
          phone:                 d.phone ?? "",
          address:               d.address ?? "",
          street:                d.street ?? "",
          city:                  d.city ?? "",
          state:                 d.state ?? "",
          religion:              d.religion ?? "",
          gender:                d.gender ?? "",
          age:                   d.age ?? undefined,
          marital_status:        d.marital_status ?? "",
          education:             d.education ?? "",
          degree_classification: d.degree_classification ?? "",
          work_mode:             d.work_mode ?? "",
          available:             d.available ?? true,
          // Extended
          desired_job:               d.desired_job ?? "",
          nysc_status:               d.nysc_status ?? "",
          state_of_origin:           d.state_of_origin ?? "",
          tribe:                     d.tribe ?? "",
          skin_complexion:           d.skin_complexion ?? "",
          physical_attributes:       d.physical_attributes ?? "",
          professional_qualification:d.professional_qualification ?? "",
          school_attended:           d.school_attended ?? "",
          course_studied:            d.course_studied ?? "",
          writing_skill:             d.writing_skill ?? "",
          speaking_skill:            d.speaking_skill ?? "",
          communication_skill:       d.communication_skill ?? "",
          work_attitude:             d.work_attitude ?? "",
          reliability_consistency:   d.reliability_consistency ?? "",
          emotional_intelligence:    d.emotional_intelligence ?? "",
          learning_ability:          d.learning_ability ?? "",
          charisma:                  d.charisma ?? "",
          dress_sense:               d.dress_sense ?? "",
          motivational_drive:        d.motivational_drive ?? "",
          location:                  d.location ?? "",
          proximity:                 d.proximity ?? "",
          track_record:              d.track_record ?? "",
        });
        setSkills(d.skills ?? []);
        setSoftSkills(d.soft_skills ?? []);
        setTechStack(d.tech_stack ?? []);
        setCertifications(d.certifications ?? []);
        setLicenses(d.licenses ?? []);
        setLanguages(d.languages_spoken ?? []);
        setExperience(d.work_experience ?? []);
        setComplete(d.profile_complete);
        setCvUrl(d.cv_url ?? null);
        // Auto-expand matching section if any extended field is filled
        if (d.desired_job || d.nysc_status || d.tribe || d.school_attended) {
          setShowMatching(true);
        }
      })
      .catch(() => toast.error("Could not load profile"))
      .finally(() => setLoading(false));
  }, [isLoggedIn, user, reset]);

  // async function handleCvChange(e: React.ChangeEvent<HTMLInputElement>) {
  //   const file = e.target.files?.[0];
  //   e.target.value = "";
  //   if (!file) return;
  //   const okTypes = [
  //     "application/pdf",
  //     "application/msword",
  //     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  //   ];
  //   if (!okTypes.includes(file.type)) {
  //     toast.error("Please upload a PDF or Word document (.pdf, .doc, .docx).");
  //     return;
  //   }
  //   if (file.size > 5 * 1024 * 1024) {
  //     toast.error("File must be 5 MB or smaller."); return;
  //   }
  //   setCvUploading(true);
  //   try {
  //     const form = new FormData();
  //     form.append("file", file);
  //     const res = await seekerApi.uploadCv(form);
  //     const url = res.data?.cv_url as string | undefined;
  //     if (url) setCvUrl(url);
  //     toast.success("CV uploaded successfully.");
  //   } catch (err: any) {
  //     const detail = err?.response?.data?.detail;
  //     toast.error(typeof detail === "string" ? detail : "CV upload failed.");
  //   } finally {
  //     setCvUploading(false);
  //   }
  //}
  async function handleCvChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;

  const okTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!okTypes.includes(file.type)) {
    toast.error("Please upload a PDF or Word document (.pdf, .doc, .docx).");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error("File must be 5 MB or smaller.");
    return;
  }

  setCvUploading(true);
  try {
    // ✅ Pass raw File, use correct method name (lowercase v)
    const res = await seekerApi.uploadCv(file);
    const url = res.data?.cv_url as string | undefined;
    if (url) setCvUrl(url);
    toast.success("CV uploaded successfully.");
  } catch (err: any) {
    const detail = err?.response?.data?.detail;
    toast.error(typeof detail === "string" ? detail : "CV upload failed.");
  } finally {
    setCvUploading(false);
  }
}

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      // Filter out empty string values for optional extended fields
      const clean: Record<string, unknown> = { ...data };
      const extendedFields = [
        "desired_job","nysc_status","state_of_origin","tribe","skin_complexion",
        "physical_attributes","professional_qualification","school_attended","course_studied",
        "writing_skill","speaking_skill","communication_skill","work_attitude",
        "reliability_consistency","emotional_intelligence","learning_ability",
        "charisma","dress_sense","motivational_drive","location","proximity","track_record",
      ];
      extendedFields.forEach((f) => {
        if (clean[f] === "") clean[f] = null;
      });

      await seekerApi.updateProfile({
        ...clean,
        skills,
        soft_skills:      softSkills,
        tech_stack:       techStack,
        certifications,
        licenses,
        languages_spoken: languages,
        work_experience:  experience,
      });
      toast.success("Profile saved!");
      setComplete(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/seeker/dashboard" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">A complete profile improves your match accuracy</p>
        </div>
        {complete && (
          <span className="ml-auto flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold">
            <CheckCircle size={13} /> Complete
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Section 1: Personal Info ─────────────────── */}
        <Section title="Personal Information" step="1">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full Name *" error={errors.name?.message}>
              <input {...register("name")} className="input" placeholder="John Doe" />
            </Field>
            <Field label="Phone Number">
              <input {...register("phone")} className="input" placeholder="+234 800 000 0000" />
            </Field>
            <Field label="Gender *" error={errors.gender?.message}>
              <select {...register("gender")} className="input">
                <option value="">Select gender</option>
                {GENDERS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Age">
              <input type="number" {...register("age", { valueAsNumber: true })}
              className="input" 
              placeholder="25"
              min={16}
              max={80}
              />
              {/* <input type="number" {...register("age")} className="input" placeholder="25" min={16} max={80} /> */}
            </Field>
            <Field label="Marital Status">
              <select {...register("marital_status")} className="input">
                <option value="">Select...</option>
                {MARITAL.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Religion">
              <select {...register("religion")} className="input">
                <option value="">Select...</option>
                {RELIGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        {/* ── Section 2: Location ──────────────────────── */}
        <Section title="Location" step="2">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="State *" error={errors.state?.message}>
              <select {...register("state")} className="input">
                <option value="">Select state</option>
                {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="City *" error={errors.city?.message}>
              <input {...register("city")} className="input" placeholder="e.g. Ikeja" />
            </Field>
            <Field label="Street Address">
              <input {...register("street")} className="input" placeholder="15 Allen Avenue" />
            </Field>
            <Field label="Full Address">
              <input {...register("address")} className="input" placeholder="15 Allen Avenue, Ikeja, Lagos" />
            </Field>
          </div>
        </Section>

        {/* ── Section 3: Education ─────────────────────── */}
        <Section title="Education" step="3">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Highest Education *" error={errors.education?.message}>
              <select {...register("education")} className="input">
                <option value="">Select level</option>
                {EDUCATION_LVLS.map((e) => <option key={e}>{e}</option>)}
              </select>
            </Field>
            <Field label="Degree Classification">
              <select {...register("degree_classification")} className="input">
                <option value="">Select class</option>
                {DEGREE_CLASSES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        {/* ── Section 4: CV / Resume ───────────────────── */}
        <Section title="CV / Resume" step="4">
          <p className="text-sm text-gray-500">
            Upload your CV so recruiters can review your background. PDF or Word, max 5 MB.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className={cn(
              "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border",
              "bg-white text-sm font-semibold text-gray-700 cursor-pointer transition-colors",
              cvUploading
                ? "opacity-60 cursor-not-allowed border-gray-200"
                : "border-gray-200 hover:border-red-300 hover:text-red-700"
            )}>
              {cvUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {cvUploading ? "Uploading…" : cvUrl ? "Replace CV" : "Choose file"}
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                disabled={cvUploading}
                onChange={handleCvChange}
              />
            </label>
            {cvUrl && (
              <a
                href={`${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api").replace(/\/api\/?$/, "")}${cvUrl}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 hover:underline"
              >
                <FileText size={15} /> View current CV <ExternalLink size={12} className="opacity-60" />
              </a>
            )}
          </div>
          {!cvUrl && !cvUploading && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              No CV on file yet — upload one to strengthen your applications.
            </p>
          )}
        </Section>

        {/* ── Section 5: Skills & Tech Stack ──────────── */}
        <Section title="Skills & Tech Stack" step="5">
          <div className="space-y-5">
            <TagInput label="Hard Skills *"  hint="e.g. Project Management, Data Analysis" tags={skills}         onChange={setSkills}         />
            <TagInput label="Soft Skills"     hint="e.g. Communication, Leadership"         tags={softSkills}     onChange={setSoftSkills}     />
            <TagInput label="Tech Stack"      hint="e.g. React, Python, SQL, Figma"         tags={techStack}      onChange={setTechStack}      />
            <TagInput label="Certifications"  hint="e.g. PMP, AWS Solutions Architect"      tags={certifications} onChange={setCertifications} />
            <TagInput label="Licenses"        hint="e.g. Driver's License, COREN"           tags={licenses}       onChange={setLicenses}       />
          </div>
        </Section>

        {/* ── Section 6: Work Experience ───────────────── */}
        <Section title="Work Experience" step="6">
          <WorkExperienceEditor value={experience} onChange={setExperience} />
        </Section>

        {/* ── Section 7: Job Preferences ───────────────── */}
        <Section title="Job Preferences" step="7">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Work Mode Preference *" error={errors.work_mode?.message}>
              <select {...register("work_mode")} className="input">
                <option value="">Select preference</option>
                {WORK_MODES.map((m) => <option key={m} value={m.toLowerCase()}>{m}</option>)}
              </select>
            </Field>
            <Field label="Availability">
              <Controller name="available" control={control} render={({ field }) => (
                <div className="flex items-center gap-3 mt-1">
                  <button type="button" onClick={() => field.onChange(true)}
                    className={cn("flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                      field.value ? "bg-green-600 border-green-600 text-white" : "bg-white border-gray-300 text-gray-600 hover:border-green-400")}>
                    Available
                  </button>
                  <button type="button" onClick={() => field.onChange(false)}
                    className={cn("flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                      !field.value ? "bg-gray-600 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-600 hover:border-gray-400")}>
                    Not Available
                  </button>
                </div>
              )} />
            </Field>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 8 — Job Matching Information (Optional, collapsible)
        ══════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/30 overflow-hidden">
          {/* Header — always visible */}
          <button
            type="button"
            onClick={() => setShowMatching(!showMatching)}
            className="w-full flex items-start justify-between gap-4 text-left p-5"
          >
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                8
              </span>
              <div>
                <h2 className="font-bold text-gray-900">Job Matching Information</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Optional · Providing this information improves job matching with organisations
                </p>
              </div>
            </div>
            {showMatching
              ? <ChevronUp  size={18} className="text-blue-600 shrink-0 mt-0.5" />
              : <ChevronDown size={18} className="text-blue-600 shrink-0 mt-0.5" />
            }
          </button>

          {/* Collapsed hint */}
          {!showMatching && (
            <div className="px-5 pb-5">
              <div className="flex items-center gap-2 bg-blue-100 rounded-lg px-3 py-2.5 text-xs text-blue-700">
                <Info size={14} className="shrink-0" />
                All 27 fields are optional. These help SPOTTER match you more accurately with the right organisations. Click to expand.
              </div>
            </div>
          )}

          {/* Expanded content */}
          {showMatching && (
            <div className="px-5 pb-6 space-y-8 border-t border-blue-100">
              <div className="pt-4 text-sm text-gray-500">
                All fields below are optional. Only fill in what is relevant to you.
                This data is used by the matching engine to improve your match results.
              </div>

              {/* ── 8a: Career & Academic ─────────────────────── */}
              <SubSection title="Career & Academic Background">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Desired Job Title">
                    <input {...register("desired_job")} className="input" placeholder="e.g. Software Engineer" />
                  </Field>
                  <Field label="Professional Qualification">
                    <input {...register("professional_qualification")} className="input" placeholder="e.g. ICAN, COREN, NIM" />
                  </Field>
                  <Field label="School Attended">
                    <input {...register("school_attended")} className="input" placeholder="e.g. University of Lagos" />
                  </Field>
                  <Field label="Course Studied">
                    <input {...register("course_studied")} className="input" placeholder="e.g. Computer Science" />
                  </Field>
                  <Field label="NYSC Status">
                    <select {...register("nysc_status")} className="input">
                      <option value="">Select status</option>
                      {NYSC_STATUS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Track Record">
                    <input {...register("track_record")} className="input" placeholder="e.g. Delivered 5 products on time" />
                  </Field>
                </div>
              </SubSection>

              {/* ── 8b: Personal Background ───────────────────── */}
              <SubSection title="Personal Background">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="State of Origin">
                    <select {...register("state_of_origin")} className="input">
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Tribe / Ethnicity">
                    <input {...register("tribe")} className="input" placeholder="e.g. Yoruba, Igbo, Hausa" />
                  </Field>
                  <Field label="Skin Complexion">
                    <select {...register("skin_complexion")} className="input">
                      <option value="">Select...</option>
                      {COMPLEXION_OPTS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Physical Attributes">
                    <input {...register("physical_attributes")} className="input" placeholder="e.g. Tall, Athletic build" />
                  </Field>
                </div>
                <div className="mt-4">
                  <TagInput
                    label="Languages Spoken"
                    hint="e.g. English, Yoruba, French"
                    tags={languages}
                    onChange={setLanguages}
                  />
                </div>
              </SubSection>

              {/* ── 8c: Soft Skills Self-Assessment ───────────── */}
              <SubSection title="Soft Skills Self-Assessment">
                <p className="text-xs text-gray-400 -mt-1 mb-3">
                  Rate your own proficiency. These help match you with organisations that value specific traits.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {([
                    ["writing_skill",          "Writing Skill"            ],
                    ["speaking_skill",         "Speaking Skill"           ],
                    ["communication_skill",    "Communication Skill"      ],
                    ["work_attitude",          "Work Attitude"            ],
                    ["reliability_consistency","Reliability & Consistency"],
                    ["emotional_intelligence", "Emotional Intelligence"   ],
                    ["learning_ability",       "Learning Ability"         ],
                    ["motivational_drive",     "Motivational Drive"       ],
                    ["charisma",               "Charisma"                 ],
                    ["dress_sense",            "Dress Sense"              ],
                  ] as [keyof FormData, string][]).map(([field, label]) => (
                    <Field key={field} label={label}>
                      <select {...register(field)} className="input">
                        <option value="">Select rating</option>
                        {SKILL_RATINGS.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </Field>
                  ))}
                </div>
              </SubSection>

              {/* ── 8d: Location Preferences ──────────────────── */}
              <SubSection title="Location Preferences">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Preferred Work Location">
                    <input {...register("location")} className="input" placeholder="e.g. Lagos Island, Abuja CBD" />
                  </Field>
                  <Field label="Commute / Relocation Willingness">
                    <select {...register("proximity")} className="input">
                      <option value="">Select...</option>
                      {PROXIMITY_OPTS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </Field>
                </div>
              </SubSection>

            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/seeker/dashboard" className="btn-ghost text-sm">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>

      </form>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function Section({ title, step, children }: { title: string; step: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3 pb-1 border-b border-gray-100">
        <span className="bg-red-700 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">{step}</span>
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />{title}
      </h3>
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
        <button type="button" onClick={add} className="btn-primary px-3 py-2 text-sm"><Plus size={16} /></button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-medium px-3 py-1 rounded-full">
              {tag}
              <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:text-red-900"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface WorkExp { company: string; role: string; years: number; description?: string }

function WorkExperienceEditor({ value, onChange }: { value: WorkExp[]; onChange: (v: WorkExp[]) => void }) {
  const empty: WorkExp = { company: "", role: "", years: 0, description: "" };
  const [draft, setDraft]   = useState<WorkExp>(empty);
  const [adding, setAdding] = useState(false);

  function addEntry() {
    if (!draft.company || !draft.role) { toast.error("Company and role are required."); return; }
    onChange([...value, { ...draft, years: Number(draft.years) }]);
    setDraft(empty); setAdding(false);
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && !adding && (
        <p className="text-sm text-gray-400 text-center py-4">No work experience added yet</p>
      )}
      {value.map((exp, i) => (
        <div key={i} className="flex items-start justify-between bg-gray-50 rounded-xl px-4 py-3 gap-3">
          <div>
            <p className="font-semibold text-gray-800 text-sm">{exp.role}</p>
            <p className="text-xs text-gray-500">{exp.company} · {exp.years} yr{exp.years !== 1 ? "s" : ""}</p>
            {exp.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{exp.description}</p>}
          </div>
          <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="text-gray-300 hover:text-red-500 transition-colors shrink-0"><X size={16} /></button>
        </div>
      ))}
      {adding && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} className="input text-sm" placeholder="Company name *" />
            <input value={draft.role}    onChange={(e) => setDraft({ ...draft, role:    e.target.value })} className="input text-sm" placeholder="Job title *" />
            <input type="number" value={draft.years || ""} onChange={(e) => setDraft({ ...draft, years: Number(e.target.value) })} className="input text-sm" placeholder="Years in role" min={0} max={50} />
          </div>
          <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="input text-sm resize-none w-full" rows={2} placeholder="Brief description (optional)" />
          <div className="flex gap-2">
            <button type="button" onClick={addEntry} className="btn-primary text-sm px-4 py-2">Add</button>
            <button type="button" onClick={() => { setAdding(false); setDraft(empty); }} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}
      {!adding && (
        <button type="button" onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm text-red-700 font-semibold hover:underline">
          <Plus size={15} /> Add work experience
        </button>
      )}
    </div>
  );
}


// // C:\Users\Melody\Documents\Spotter\frontend\src\app\seeker\profile\page.tsx

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { useForm, Controller } from "react-hook-form";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import toast from "react-hot-toast";
// import { Loader2, Plus, X, ArrowLeft, Save, CheckCircle, FileText, Upload, ExternalLink } from "lucide-react";
// import Link from "next/link";
// import { seekerApi } from "@/lib/api";
// import { useAuthStore } from "@/store/authStore";
// import Navbar from "@/components/layout/Navbar";
// import { cn } from "@/lib/utils";

// // ── Constants ──────────────────────────────────────────────────────────────
// const NIGERIAN_STATES = [
//   "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
//   "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
//   "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
//   "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
//   "Taraba","Yobe","Zamfara",
// ];

// const RELIGIONS      = ["Christianity","Islam","Traditional","Other","Prefer not to say"];
// const GENDERS        = ["Male","Female","Prefer not to say"];
// const MARITAL        = ["Single","Married","Divorced","Widowed","Prefer not to say"];
// const EDUCATION_LVLS = ["SSCE","OND","HND","BSc","PGD","Masters","PhD"];
// const DEGREE_CLASSES = ["First Class","Second Class Upper","Second Class Lower","Third Class","Pass","N/A"];
// const WORK_MODES     = ["Remote","Onsite","Hybrid"];

// // ── Schema ─────────────────────────────────────────────────────────────────
// const schema = z.object({
//   name:                 z.string().min(2, "Name is required"),
//   phone:                z.string().optional(),
//   address:              z.string().optional(),
//   street:               z.string().optional(),
//   city:                 z.string().min(1, "City is required"),
//   state:                z.string().min(1, "State is required"),
//   religion:             z.string().optional(),
//   gender:               z.string().min(1, "Gender is required"),
//   age:                  z.coerce.number().min(16).max(80).optional(),
//   marital_status:       z.string().optional(),
//   education:            z.string().min(1, "Education level is required"),
//   degree_classification:z.string().optional(),
//   work_mode:            z.string().min(1, "Work preference is required"),
//   available:            z.boolean(),
// });

// type FormData = z.infer<typeof schema>;

// // ── Page ───────────────────────────────────────────────────────────────────
// export default function SeekerProfilePage() {
//   const router               = useRouter();
//   const { user, isLoggedIn } = useAuthStore();

//   // Array fields managed outside react-hook-form for simplicity
//   const [skills,        setSkills]        = useState<string[]>([]);
//   const [softSkills,    setSoftSkills]    = useState<string[]>([]);
//   const [techStack,     setTechStack]     = useState<string[]>([]);
//   const [certifications,setCertifications]= useState<string[]>([]);
//   const [licenses,      setLicenses]      = useState<string[]>([]);
//   const [experience,    setExperience]    = useState<WorkExp[]>([]);

//   const [saving,    setSaving]    = useState(false);
//   const [loading,   setLoading]   = useState(true);
//   const [complete,  setComplete]  = useState(false);
//   const [cvUrl,     setCvUrl]     = useState<string | null>(null);
//   const [cvUploading, setCvUploading] = useState(false);

//   // Auth guard
//   useEffect(() => {
//     if (!isLoggedIn()) { router.push("/login"); return; }
//     if (user?.role !== "seeker") { router.push("/"); return; }
//   }, [isLoggedIn, user, router]);

//   const {
//     register,
//     handleSubmit,
//     reset,
//     control,
//     formState: { errors },
//   } = useForm<FormData>({ resolver: zodResolver(schema) });

//   // Load existing profile
//   useEffect(() => {
//     if (!isLoggedIn() || user?.role !== "seeker") return;
//     seekerApi.getProfile()
//       .then((r) => {
//         const d = r.data;
//         reset({
//           name:                  d.name ?? "",
//           phone:                 d.phone ?? "",
//           address:               d.address ?? "",
//           street:                d.street ?? "",
//           city:                  d.city ?? "",
//           state:                 d.state ?? "",
//           religion:              d.religion ?? "",
//           gender:                d.gender ?? "",
//           age:                   d.age ?? undefined,
//           marital_status:        d.marital_status ?? "",
//           education:             d.education ?? "",
//           degree_classification: d.degree_classification ?? "",
//           work_mode:             d.work_mode ?? "",
//           available:             d.available ?? true,
//         });
//         setSkills(d.skills ?? []);
//         setSoftSkills(d.soft_skills ?? []);
//         setTechStack(d.tech_stack ?? []);
//         setCertifications(d.certifications ?? []);
//         setLicenses(d.licenses ?? []);
//         setExperience(d.work_experience ?? []);
//         setComplete(d.profile_complete);
//         setCvUrl(d.cv_url ?? null);
//       })
//       .catch(() => toast.error("Could not load profile"))
//       .finally(() => setLoading(false));
//   }, [isLoggedIn, user, reset]);

//   async function handleCvChange(e: React.ChangeEvent<HTMLInputElement>) {
//     const file = e.target.files?.[0];
//     e.target.value = "";
//     if (!file) return;
//     const okTypes = [
//       "application/pdf",
//       "application/msword",
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//     ];
//     if (!okTypes.includes(file.type)) {
//       toast.error("Please upload a PDF or Word document (.pdf, .doc, .docx).");
//       return;
//     }
//     if (file.size > 5 * 1024 * 1024) {
//       toast.error("File must be 5 MB or smaller.");
//       return;
//     }
//     setCvUploading(true);
//     try {
//       const res = await seekerApi.uploadCv(file);
//       const url = res.data?.cv_url as string | undefined;
//       if (url) setCvUrl(url);
//       toast.success("CV uploaded successfully.");
//     } catch (err: unknown) {
//       const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
//       toast.error(typeof detail === "string" ? detail : "CV upload failed.");
//     } finally {
//       setCvUploading(false);
//     }
//   }

//   async function onSubmit(data: FormData) {
//     setSaving(true);
//     try {
//       await seekerApi.updateProfile({
//         ...data,
//         skills,
//         soft_skills:    softSkills,
//         tech_stack:     techStack,
//         certifications,
//         licenses,
//         work_experience: experience,
//       });
//       toast.success("Profile saved!");
//       setComplete(true);
//     } catch (err: any) {
//       toast.error(err?.response?.data?.detail || "Save failed. Please try again.");
//     } finally {
//       setSaving(false);
//     }
//   }

//   if (loading) {
//     return (
//       <>
//         <Navbar />
//         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//           <Loader2 size={32} className="animate-spin text-red-600" />
//         </div>
//       </>
//     );
//   }

//   return (
//     <>
//       <Navbar />
//       <div className="min-h-screen bg-gray-50">
//         <div className="max-w-3xl mx-auto px-4 py-8">

//           {/* Header */}
//           <div className="flex items-center gap-4 mb-8">
//             <Link href="/seeker/dashboard" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
//               <ArrowLeft size={20} className="text-gray-600" />
//             </Link>
//             <div>
//               <h1 className="text-2xl font-black text-gray-900">My Profile</h1>
//               <p className="text-sm text-gray-500 mt-0.5">
//                 A complete profile improves your match accuracy
//               </p>
//             </div>
//             {complete && (
//               <span className="ml-auto flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold">
//                 <CheckCircle size={13} /> Complete
//               </span>
//             )}
//           </div>

//           <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

//             {/* ── Section 1: Personal info ──────────────────── */}
//             <Section title="Personal Information" step="1">
//               <div className="grid sm:grid-cols-2 gap-4">
//                 <Field label="Full Name *" error={errors.name?.message}>
//                   <input {...register("name")} className="input" placeholder="John Doe" />
//                 </Field>
//                 <Field label="Phone Number" error={errors.phone?.message}>
//                   <input {...register("phone")} className="input" placeholder="+234 800 000 0000" />
//                 </Field>
//                 <Field label="Gender *" error={errors.gender?.message}>
//                   <select {...register("gender")} className="input">
//                     <option value="">Select gender</option>
//                     {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
//                   </select>
//                 </Field>
//                 <Field label="Age" error={errors.age?.message}>
//                   <input
//                     type="number"
//                     {...register("age")}
//                     className="input"
//                     placeholder="25"
//                     min={16} max={80}
//                   />
//                 </Field>
//                 <Field label="Marital Status">
//                   <select {...register("marital_status")} className="input">
//                     <option value="">Select...</option>
//                     {MARITAL.map((m) => <option key={m} value={m}>{m}</option>)}
//                   </select>
//                 </Field>
//                 <Field label="Religion">
//                   <select {...register("religion")} className="input">
//                     <option value="">Select...</option>
//                     {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
//                   </select>
//                 </Field>
//               </div>
//             </Section>

//             {/* ── Section 2: Location ───────────────────────── */}
//             <Section title="Location" step="2">
//               <div className="grid sm:grid-cols-2 gap-4">
//                 <Field label="State *" error={errors.state?.message}>
//                   <select {...register("state")} className="input">
//                     <option value="">Select state</option>
//                     {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
//                   </select>
//                 </Field>
//                 <Field label="City *" error={errors.city?.message}>
//                   <input {...register("city")} className="input" placeholder="e.g. Ikeja" />
//                 </Field>
//                 <Field label="Street Address">
//                   <input {...register("street")} className="input" placeholder="15 Allen Avenue" />
//                 </Field>
//                 <Field label="Full Address">
//                   <input {...register("address")} className="input" placeholder="15 Allen Avenue, Ikeja, Lagos" />
//                 </Field>
//               </div>
//             </Section>

//             {/* ── Section 3: Education ──────────────────────── */}
//             <Section title="Education" step="3">
//               <div className="grid sm:grid-cols-2 gap-4">
//                 <Field label="Highest Education *" error={errors.education?.message}>
//                   <select {...register("education")} className="input">
//                     <option value="">Select level</option>
//                     {EDUCATION_LVLS.map((e) => <option key={e} value={e}>{e}</option>)}
//                   </select>
//                 </Field>
//                 <Field label="Degree Classification">
//                   <select {...register("degree_classification")} className="input">
//                     <option value="">Select class</option>
//                     {DEGREE_CLASSES.map((d) => <option key={d} value={d}>{d}</option>)}
//                   </select>
//                 </Field>
//               </div>
//             </Section>

//             {/* ── CV / Resume ──────────────────────────────── */}
//             <Section title="CV / Resume" step="4">
//               <div className="space-y-4">
//                 <p className="text-sm text-gray-500">
//                   Upload your CV so recruiters can review your background. PDF or Word, max 5 MB.
//                 </p>
//                 <div className="flex flex-col sm:flex-row sm:items-center gap-3">
//                   <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-red-300 hover:text-red-700 cursor-pointer transition-colors">
//                     <Upload size={16} />
//                     {cvUploading ? "Uploading…" : "Choose file"}
//                     <input
//                       type="file"
//                       accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
//                       className="hidden"
//                       disabled={cvUploading}
//                       onChange={handleCvChange}
//                     />
//                   </label>
//                   {cvUrl && (
//                     <a
//                       href={`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "")}${cvUrl}`}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 hover:underline"
//                     >
//                       <FileText size={15} />
//                       View current CV
//                       <ExternalLink size={12} className="opacity-60" />
//                     </a>
//                   )}
//                 </div>
//                 {!cvUrl && !cvUploading && (
//                   <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
//                     No CV on file yet — upload one to strengthen your applications.
//                   </p>
//                 )}
//               </div>
//             </Section>

//             {/* ── Section 4: Skills ─────────────────────────── */}
//             <Section title="Skills & Tech Stack" step="5">
//               <div className="space-y-5">
//                 <TagInput
//                   label="Hard Skills *"
//                   hint="e.g. Project Management, Data Analysis"
//                   tags={skills}
//                   onChange={setSkills}
//                 />
//                 <TagInput
//                   label="Soft Skills"
//                   hint="e.g. Communication, Leadership"
//                   tags={softSkills}
//                   onChange={setSoftSkills}
//                 />
//                 <TagInput
//                   label="Tech Stack"
//                   hint="e.g. React, Python, SQL, Figma"
//                   tags={techStack}
//                   onChange={setTechStack}
//                 />
//                 <TagInput
//                   label="Certifications"
//                   hint="e.g. PMP, AWS Solutions Architect"
//                   tags={certifications}
//                   onChange={setCertifications}
//                 />
//                 <TagInput
//                   label="Licenses"
//                   hint="e.g. Driver's License, COREN"
//                   tags={licenses}
//                   onChange={setLicenses}
//                 />
//               </div>
//             </Section>

//             {/* ── Section 6: Work Experience ────────────────── */}
//             <Section title="Work Experience" step="6">
//               <WorkExperienceEditor value={experience} onChange={setExperience} />
//             </Section>

//             {/* ── Section 7: Preferences ────────────────────── */}
//             <Section title="Job Preferences" step="7">
//               <div className="grid sm:grid-cols-2 gap-4">
//                 <Field label="Work Mode Preference *" error={errors.work_mode?.message}>
//                   <select {...register("work_mode")} className="input">
//                     <option value="">Select preference</option>
//                     {WORK_MODES.map((m) => (
//                       <option key={m} value={m.toLowerCase()}>{m}</option>
//                     ))}
//                   </select>
//                 </Field>
//                 <Field label="Availability">
//                   <Controller
//                     name="available"
//                     control={control}
//                     render={({ field }) => (
//                       <div className="flex items-center gap-3 mt-1">
//                         <button
//                           type="button"
//                           onClick={() => field.onChange(true)}
//                           className={cn(
//                             "flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors",
//                             field.value
//                               ? "bg-green-600 border-green-600 text-white"
//                               : "bg-white border-gray-300 text-gray-600 hover:border-green-400"
//                           )}
//                         >
//                           Available
//                         </button>
//                         <button
//                           type="button"
//                           onClick={() => field.onChange(false)}
//                           className={cn(
//                             "flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors",
//                             !field.value
//                               ? "bg-gray-600 border-gray-600 text-white"
//                               : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
//                           )}
//                         >
//                           Not Available
//                         </button>
//                       </div>
//                     )}
//                   />
//                 </Field>
//               </div>
//             </Section>

//             {/* Submit */}
//             <div className="flex items-center justify-between pt-2">
//               <Link href="/seeker/dashboard" className="btn-ghost text-sm">
//                 Cancel
//               </Link>
//               <button
//                 type="submit"
//                 disabled={saving}
//                 className="btn-primary flex items-center gap-2"
//               >
//                 {saving
//                   ? <Loader2 size={16} className="animate-spin" />
//                   : <Save size={16} />
//                 }
//                 {saving ? "Saving..." : "Save Profile"}
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </>
//   );
// }

// // ── Sub-components ─────────────────────────────────────────────────────────

// function Section({
//   title, step, children,
// }: {
//   title: string; step: string; children: React.ReactNode;
// }) {
//   return (
//     <div className="card space-y-4">
//       <div className="flex items-center gap-3 pb-1 border-b border-gray-100">
//         <span className="bg-red-700 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">
//           {step}
//         </span>
//         <h2 className="font-bold text-gray-900">{title}</h2>
//       </div>
//       {children}
//     </div>
//   );
// }

// function Field({
//   label, error, children,
// }: {
//   label: string; error?: string; children: React.ReactNode;
// }) {
//   return (
//     <div>
//       <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
//       {children}
//       {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
//     </div>
//   );
// }

// // ── TagInput ───────────────────────────────────────────────────────────────
// function TagInput({
//   label, hint, tags, onChange,
// }: {
//   label: string; hint: string; tags: string[]; onChange: (t: string[]) => void;
// }) {
//   const [input, setInput] = useState("");

//   function add() {
//     const val = input.trim();
//     if (val && !tags.includes(val)) {
//       onChange([...tags, val]);
//     }
//     setInput("");
//   }

//   function remove(tag: string) {
//     onChange(tags.filter((t) => t !== tag));
//   }

//   return (
//     <div>
//       <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
//       <div className="flex gap-2">
//         <input
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
//           className="input flex-1 text-sm"
//           placeholder={hint}
//         />
//         <button
//           type="button"
//           onClick={add}
//           className="btn-primary px-3 py-2 text-sm"
//         >
//           <Plus size={16} />
//         </button>
//       </div>
//       {tags.length > 0 && (
//         <div className="flex flex-wrap gap-1.5 mt-2">
//           {tags.map((tag) => (
//             <span
//               key={tag}
//               className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-medium px-3 py-1 rounded-full"
//             >
//               {tag}
//               <button type="button" onClick={() => remove(tag)} className="hover:text-red-900">
//                 <X size={11} />
//               </button>
//             </span>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── WorkExperienceEditor ───────────────────────────────────────────────────
// interface WorkExp {
//   company: string;
//   role: string;
//   years: number;
//   description?: string;
// }

// function WorkExperienceEditor({
//   value, onChange,
// }: {
//   value: WorkExp[]; onChange: (v: WorkExp[]) => void;
// }) {
//   const empty: WorkExp = { company: "", role: "", years: 0, description: "" };
//   const [draft, setDraft] = useState<WorkExp>(empty);
//   const [adding, setAdding] = useState(false);

//   function addEntry() {
//     if (!draft.company || !draft.role) {
//       toast.error("Company and role are required.");
//       return;
//     }
//     onChange([...value, { ...draft, years: Number(draft.years) }]);
//     setDraft(empty);
//     setAdding(false);
//   }

//   function remove(i: number) {
//     onChange(value.filter((_, idx) => idx !== i));
//   }

//   return (
//     <div className="space-y-3">
//       {value.length === 0 && !adding && (
//         <p className="text-sm text-gray-400 text-center py-4">
//           No work experience added yet
//         </p>
//       )}

//       {value.map((exp, i) => (
//         <div
//           key={i}
//           className="flex items-start justify-between bg-gray-50 rounded-xl px-4 py-3 gap-3"
//         >
//           <div>
//             <p className="font-semibold text-gray-800 text-sm">{exp.role}</p>
//             <p className="text-xs text-gray-500">{exp.company} · {exp.years} yr{exp.years !== 1 ? "s" : ""}</p>
//             {exp.description && (
//               <p className="text-xs text-gray-400 mt-1 line-clamp-2">{exp.description}</p>
//             )}
//           </div>
//           <button
//             type="button"
//             onClick={() => remove(i)}
//             className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
//           >
//             <X size={16} />
//           </button>
//         </div>
//       ))}

//       {adding && (
//         <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
//           <div className="grid sm:grid-cols-2 gap-3">
//             <input
//               value={draft.company}
//               onChange={(e) => setDraft({ ...draft, company: e.target.value })}
//               className="input text-sm"
//               placeholder="Company name *"
//             />
//             <input
//               value={draft.role}
//               onChange={(e) => setDraft({ ...draft, role: e.target.value })}
//               className="input text-sm"
//               placeholder="Job title *"
//             />
//             <input
//               type="number"
//               value={draft.years || ""}
//               onChange={(e) => setDraft({ ...draft, years: Number(e.target.value) })}
//               className="input text-sm"
//               placeholder="Years in role"
//               min={0} max={50}
//             />
//           </div>
//           <textarea
//             value={draft.description}
//             onChange={(e) => setDraft({ ...draft, description: e.target.value })}
//             className="input text-sm resize-none w-full"
//             rows={2}
//             placeholder="Brief description (optional)"
//           />
//           <div className="flex gap-2">
//             <button type="button" onClick={addEntry} className="btn-primary text-sm px-4 py-2">
//               Add
//             </button>
//             <button
//               type="button"
//               onClick={() => { setAdding(false); setDraft(empty); }}
//               className="btn-ghost text-sm"
//             >
//               Cancel
//             </button>
//           </div>
//         </div>
//       )}

//       {!adding && (
//         <button
//           type="button"
//           onClick={() => setAdding(true)}
//           className="flex items-center gap-2 text-sm text-red-700 font-semibold hover:underline"
//         >
//           <Plus size={15} /> Add work experience
//         </button>
//       )}
//     </div>
//   );
// }
