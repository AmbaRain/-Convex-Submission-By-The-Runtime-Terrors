"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppNav } from "@/components/AppNav";
import { useSession } from "@/components/SessionContext";

export default function OpportunityDetailClient({
  initialId,
}: {
  initialId?: string;
}) {
  const routeParams = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryId = searchParams?.get("id");

  const rawId = (initialId && initialId !== "placeholder" && initialId !== "_")
    ? initialId
    : (routeParams?.id && routeParams.id !== "placeholder" && routeParams.id !== "_")
    ? routeParams.id
    : queryId;

  const { sessionId: userId } = useSession();
  const [message, setMessage] = useState("");

  const opportunityId = rawId as Id<"opportunities"> | undefined;

  const opp = useQuery(
    api.opportunities.getById,
    opportunityId ? { id: opportunityId } : "skip"
  );

  const match = useQuery(
    api.matches.getMatchForOpportunity,
    userId && opportunityId ? { userId, opportunityId } : "skip"
  );

  const application = useQuery(
    api.applications.getByOpportunity,
    userId && opportunityId ? { userId, opportunityId } : "skip"
  );

  const saveMutation = useMutation(api.savedOpportunities.save);
  const updateAppMutation = useMutation(api.applications.updateStatus);

  if (opp === undefined) {
    return (
      <main className="min-h-screen">
        <AppNav />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 text-slate-500 text-center sm:text-left">
          Loading opportunity details from Convex...
        </div>
      </main>
    );
  }

  if (!opp) {
    return (
      <main className="min-h-screen">
        <AppNav />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
          <div className="surface p-6 sm:p-8 text-center sm:text-left">
            <h2 className="text-xl font-bold text-slate-900">Opportunity not found</h2>
            <p className="mt-2 text-sm text-slate-500">
              The opportunity listing could not be found or may have expired.
            </p>
            <div className="mt-6">
              <Link href="/dashboard" className="button-primary inline-flex px-4 py-2 text-sm">
                ← Back to Radar
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  let deadline = "No deadline listed";
  if (opp.deadline) {
    try {
      const parsed = opp.deadline.includes("T")
        ? new Date(opp.deadline)
        : new Date(`${opp.deadline}T00:00:00`);
      if (!isNaN(parsed.getTime())) {
        deadline = new Intl.DateTimeFormat("en", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }).format(parsed);
      } else {
        deadline = opp.deadline;
      }
    } catch {
      deadline = opp.deadline;
    }
  }

  const isApplied = application?.status === "applied";

  const handleSave = async () => {
    if (!userId) {
      setMessage("Please complete onboarding first to save opportunities.");
      return;
    }
    await saveMutation({ userId, opportunityId: opp.id as Id<"opportunities"> });
    setMessage("Saved to your personal list.");
  };

  const handleMarkApplied = async () => {
    if (!userId) {
      setMessage("Please complete onboarding first to track applications.");
      return;
    }
    await updateAppMutation({
      userId,
      opportunityId: opp.id as Id<"opportunities">,
      status: "applied",
      appliedDate: new Date().toISOString(),
    });
    setMessage("Marked as applied in your application tracker.");
  };

  const matchReasons = match?.matchReasons?.length
    ? match.matchReasons
    : [
        "Strong category alignment with current developer trends",
        opp.location.toLowerCase().includes("remote") ? "Remote-friendly" : `Located in ${opp.location}`,
      ];

  return (
    <main className="min-h-screen">
      <AppNav />
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-9">
        <Link href="/dashboard" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition">
          ← Back to your Radar
        </Link>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_280px]">
          <article className="surface p-4 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="eyebrow capitalize">{opp.category}</p>
              {match && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  {match.matchScore}% Match
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl break-words leading-tight">
              {opp.title}
            </h1>
            <p className="mt-2 text-base text-slate-500 sm:text-lg">{opp.organization}</p>

            <div className="mt-6 grid grid-cols-1 gap-4 border-y border-slate-100 py-4 text-sm sm:grid-cols-2">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Location
                </span>
                <span className="mt-1 block font-medium text-slate-800">{opp.location}</span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Deadline
                </span>
                <span className="mt-1 block font-medium text-slate-800">{deadline}</span>
              </div>
            </div>

            <section className="mt-6 sm:mt-7">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Why it matches you</h2>
              <ul className="mt-3 space-y-2">
                {matchReasons.map((reason: string, index: number) => (
                  <li key={index} className="flex gap-2.5 text-sm leading-6 text-slate-600">
                    <span className="font-bold text-indigo-500 shrink-0">+</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6 sm:mt-7">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">About this opportunity</h2>
              <p className="mt-3 text-sm sm:text-base leading-7 text-slate-600 whitespace-pre-line">
                {opp.description}
              </p>
            </section>

            {opp.eligibility && (
              <section className="mt-6 sm:mt-7">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Eligibility & Requirements</h2>
                <p className="mt-3 text-sm sm:text-base leading-7 text-slate-600 whitespace-pre-line">
                  {opp.eligibility}
                </p>
              </section>
            )}
          </article>

          <aside className="surface h-fit p-4 sm:p-5">
            <h2 className="text-base font-bold text-slate-900">Ready to take action?</h2>
            <p className="mt-1.5 text-xs sm:text-sm leading-5 sm:leading-6 text-slate-500">
              Save this for later or mark it once you have applied.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={opp.url}
                target="_blank"
                rel="noreferrer"
                className="button-primary w-full text-center text-sm py-2.5"
              >
                Visit opportunity site ↗
              </a>
              <button onClick={handleSave} className="button-secondary w-full text-sm py-2.5">
                Save opportunity
              </button>
              <button
                onClick={handleMarkApplied}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  isApplied
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                {isApplied ? "✓ Marked as applied" : "Mark as applied"}
              </button>
            </div>
            {message && (
              <p className="mt-3 rounded-lg bg-slate-50 p-2 text-center text-xs text-indigo-700 font-medium border border-slate-100">
                {message}
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
