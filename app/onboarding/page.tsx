"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CATEGORIES } from "@/lib/types";
import { useSession } from "@/components/SessionContext";

export default function OnboardingPage() {
  const router = useRouter();
  const upsertProfile = useMutation(api.users.upsertProfile);
  const matchAction = useAction(api.integrations.openai.matchUserOpportunities);
  const digestAction = useAction(api.integrations.agentmail.sendOpportunityDigest);
  const { sessionId, sessionEmail, profile, setSession, clearSession } = useSession();

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "frontend developer",
    skills: "React, TypeScript, Python",
    location: "Remote / Global",
    remoteOnly: true,
    experienceLevel: "mid",
    opportunityTypes: ["internship", "hackathon", "scholarship", "job"],
  });

  // Pre-fill form when existing session profile is loaded
  useEffect(() => {
    if (profile) {
      setForm({
        email: profile.email || sessionEmail || "",
        name: profile.name || "",
        role: profile.bio || (profile.targetRoles && profile.targetRoles[0]) || "frontend developer",
        skills: Array.isArray(profile.skills) ? profile.skills.join(", ") : "React, TypeScript, Python",
        location: profile.location || "Remote / Global",
        remoteOnly: profile.remoteOnly ?? true,
        experienceLevel: profile.experienceLevel || "mid",
        opportunityTypes: Array.isArray(profile.interests) && profile.interests.length > 0
          ? profile.interests
          : ["internship", "hackathon", "scholarship", "job"],
      });
    } else if (sessionEmail) {
      setForm((prev) => ({ ...prev, email: sessionEmail }));
    }
  }, [profile, sessionEmail]);

  const toggleType = (type: string) =>
    setForm((current) => ({
      ...current,
      opportunityTypes: current.opportunityTypes.includes(type)
        ? current.opportunityTypes.filter((item) => item !== type)
        : [...current.opportunityTypes, type],
    }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    try {
      const skillsArray = form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

      const newUserId = await upsertProfile({
        email: form.email,
        name: form.name || undefined,
        skills: skillsArray,
        interests: form.opportunityTypes,
        experienceLevel: form.experienceLevel,
        location: form.location,
        remoteOnly: form.remoteOnly,
        bio: form.role,
        targetRoles: [form.role],
      });

      // Persist session in browser
      setSession(newUserId, form.email);
      setSuccessMsg("Profile saved! Calculating personalized AI matches & dispatching digest...");

      // Compute AI matches and dispatch digest in background
      matchAction({ userId: newUserId })
        .then(() => digestAction({ userId: newUserId }))
        .catch((e) => console.warn("Background onboarding match/digest error:", e));

      setTimeout(() => {
        router.push("/dashboard");
      }, 900);
    } catch (err: any) {
      alert("Failed to save profile: " + err.message);
      setLoading(false);
    }
  };

  const handleResetSession = () => {
    if (confirm("Reset current browser session? You can enter a new email to create or switch profiles.")) {
      clearSession();
      setForm({
        email: "",
        name: "",
        role: "frontend developer",
        skills: "React, TypeScript, Python",
        location: "Remote / Global",
        remoteOnly: true,
        experienceLevel: "mid",
        opportunityTypes: ["internship", "hackathon", "scholarship", "job"],
      });
      setSuccessMsg("Session cleared. Enter a new profile below.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition"
        >
          ← Back to Overview
        </Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <aside className="lg:pt-4">
            <p className="eyebrow">Build your Radar</p>
            <h1 className="mt-2 text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Let&apos;s find the opportunities meant for you.
            </h1>
            <p className="mt-3 max-w-sm text-sm sm:text-base leading-6 sm:leading-7 text-slate-600">
              Your profile is stored locally in your browser session and synchronized with Convex for instant real-time opportunity scoring.
            </p>

            <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Browser Session Info</p>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className={`h-2.5 w-2.5 rounded-full ${sessionId ? "bg-emerald-500" : "bg-amber-400"}`} />
                <span className="font-medium">
                  {sessionId ? "Session Active" : "No Session Active"}
                </span>
              </div>
              {sessionId && (
                <div className="space-y-1 text-xs text-slate-500">
                  <p className="font-mono text-[11px] text-slate-600 truncate">
                    ID: {sessionId}
                  </p>
                  <p>When you return to Opportunity Radar, your preferences will be automatically restored.</p>
                </div>
              )}
            </div>
          </aside>

          <form onSubmit={submit} className="surface p-4 sm:p-8">
            {sessionId && (
              <div className="mb-6 flex flex-col min-[480px]:flex-row min-[480px]:items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 sm:p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      Saved Profile Loaded
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
                    {form.name ? `${form.name} (${form.email})` : form.email || "Active User"}
                  </p>
                  <p className="text-xs text-slate-500">Edit fields below to update your Radar at any time.</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetSession}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-rose-200 hover:text-rose-600 transition shrink-0 self-start min-[480px]:self-auto"
                >
                  New Session
                </button>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                ✓ {successMsg}
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {sessionId ? "Edit opportunity profile" : "Create opportunity profile"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Connected to your persistent Convex profile and AI matching engine.
              </p>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Email address</span>
                <input
                  required
                  type="email"
                  className="field"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Name <span className="font-normal text-slate-400">(optional)</span>
                </span>
                <input
                  className="field"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-slate-800">Target role / Focus</span>
              <input
                className="field"
                placeholder="e.g. AI Engineer, Full Stack Developer, Product Designer"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </label>

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-slate-800">Key skills</span>
              <input
                className="field"
                placeholder="e.g. TypeScript, React, Python, Next.js, Convex"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
              />
              <span className="mt-1.5 block text-xs text-slate-400">Separate skills with commas for best matching accuracy</span>
            </label>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Based in / Location</span>
                <input
                  className="field"
                  placeholder="e.g. Remote, San Francisco, London, Lagos"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Experience level</span>
                <select
                  className="field"
                  value={form.experienceLevel}
                  onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}
                >
                  <option value="student">Student / Early Career</option>
                  <option value="junior">Junior (1-2 years)</option>
                  <option value="mid">Mid-level (3-5 years)</option>
                  <option value="senior">Senior (5+ years)</option>
                </select>
              </label>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-800">What opportunity types are you looking for?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    type="button"
                    key={category}
                    onClick={() => toggleType(category)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium capitalize transition ${
                      form.opportunityTypes.includes(category)
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3.5 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-600"
                checked={form.remoteOnly}
                onChange={(e) => setForm({ ...form, remoteOnly: e.target.checked })}
              />
              Only show remote / worldwide opportunities
            </label>

            <button disabled={loading} className="button-primary mt-7 w-full py-3">
              {loading
                ? "Saving to Convex..."
                : sessionId
                ? "Update Radar Profile & Matches →"
                : "Create my Radar Session →"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
