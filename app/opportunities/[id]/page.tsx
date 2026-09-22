"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppNav } from "@/components/AppNav";
import { useSession } from "@/components/SessionContext";

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const { sessionId: userId } = useSession();
  const [message, setMessage] = useState("");

  const opportunityId = params?.id as Id<"opportunities"> | undefined;

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
        <div className="mx-auto max-w-3xl px-5 py-12 text-slate-500">
          Loading opportunity details from Convex...
        </div>
      </main>
    );
  }

  if (!opp) {
    return (
      <main className="min-h-screen">
        <AppNav />
        <div className="mx-auto max-w-3xl px-5 py-12">
          Opportunity not found in database.{" "}
          <Link href="/dashboard" className="font-semibold text-indigo-600">
            Back to Radar
          </Link>
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
      <div className="mx-auto max-w-4xl px-5 py-9 sm:px-6">
        <Link href="/dashboard" className="text-sm font-semibold text-indigo-600">
          ← Back to your Radar
        </Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          <article className="surface p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="eyebrow capitalize">{opp.category}</p>
              {match && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  {match.matchScore}% Match
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{opp.title}</h1>
            <p className="mt-3 text-lg text-slate-500">{opp.organization}</p>

            <div className="mt-7 grid gap-3 border-y border-slate-100 py-5 text-sm sm:grid-cols-2">
              <p>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Location
                </span>
                <span className="mt-1 block font-medium">{opp.location}</span>
              </p>
              <p>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Deadline
                </span>
                <span className="mt-1 block font-medium">{deadline}</span>
              </p>
            </div>

            <section className="mt-7">
              <h2 className="text-lg font-bold">Why it matches you</h2>
              <ul className="mt-3 space-y-2">
                {matchReasons.map((reason: string, index: number) => (
                  <li key={index} className="flex gap-3 text-sm leading-6 text-slate-600">
                    <span className="font-bold text-indigo-500">+</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-7">
              <h2 className="text-lg font-bold">About this opportunity</h2>
              <p className="mt-3 leading-7 text-slate-600">{opp.description}</p>
            </section>

            {opp.eligibility && (
              <section className="mt-7">
                <h2 className="text-lg font-bold">Eligibility & Requirements</h2>
                <p className="mt-3 leading-7 text-slate-600">{opp.eligibility}</p>
              </section>
            )}
          </article>

          <aside className="surface h-fit p-5">
            <h2 className="font-bold">Ready to take action?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Save this for later or mark it once you have applied.
            </p>
            <a
              href={opp.url}
              target="_blank"
              rel="noreferrer"
              className="button-primary mt-5 w-full text-center"
            >
              Visit opportunity site ↗
            </a>
            <button onClick={handleSave} className="button-secondary mt-2 w-full">
              Save opportunity
            </button>
            <button
              onClick={handleMarkApplied}
              className={`mt-2 w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                isApplied
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              {isApplied ? "✓ Marked as applied" : "Mark as applied"}
            </button>
            {message && <p className="mt-3 text-center text-xs text-slate-500">{message}</p>}
          </aside>
        </div>
      </div>
    </main>
  );
}
