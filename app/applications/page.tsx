"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppNav } from "@/components/AppNav";
import { useSession } from "@/components/SessionContext";

export default function ApplicationsPage() {
  const { sessionId: userId, isReady: mounted } = useSession();

  const applications = useQuery(
    api.applications.listByUser,
    userId ? { userId } : "skip"
  );

  const updateStatusMutation = useMutation(api.applications.updateStatus);

  const saved = (applications ?? []).filter(
    (app: any) => app.status === "saved" || app.status === "preparing"
  );
  const applied = (applications ?? []).filter(
    (app: any) =>
      app.status === "applied" ||
      app.status === "interviewing" ||
      app.status === "accepted" ||
      app.status === "rejected"
  );

  const handleMarkApplied = async (opportunityId: Id<"opportunities">) => {
    if (!userId) return;
    try {
      await updateStatusMutation({
        userId,
        opportunityId,
        status: "applied",
        appliedDate: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const column = (
    items: any[],
    type: "saved" | "applied"
  ) => (
    <div className="space-y-3">
      {items.map((item: any) => (
        <article key={item.id} className="surface p-4 transition hover:border-slate-300">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900">{item.opportunity.title}</p>
              <p className="mt-1 text-sm text-slate-500">{item.opportunity.organization}</p>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase text-slate-600">
              {item.opportunity.type}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {item.opportunity.deadline && (
              <span>⏳ Deadline: {new Date(item.opportunity.deadline).toLocaleDateString()}</span>
            )}
            {item.opportunity.location && (
              <span>📍 {item.opportunity.location}</span>
            )}
            {item.appliedDate && (
              <span className="text-emerald-600 font-medium">
                ✓ Applied {new Date(item.appliedDate).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Link
              href={`/opportunities/${item.opportunity.id}`}
              className="button-secondary py-2 text-xs"
            >
              Review
            </Link>
            {type === "saved" ? (
              <button
                onClick={() => handleMarkApplied(item.opportunityId as Id<"opportunities">)}
                className="button-primary py-2 text-xs"
              >
                Mark applied
              </button>
            ) : (
              <a
                href={item.opportunity.url}
                target="_blank"
                rel="noreferrer"
                className="button-primary py-2 text-xs"
              >
                Open site ↗
              </a>
            )}
          </div>
        </article>
      ))}

      {items.length === 0 && (
        <div className="surface p-6 text-sm text-slate-500 text-center">
          {type === "saved"
            ? "Save opportunities from your Radar to track them here."
            : "Mark an opportunity as applied to track it here."}
        </div>
      )}
    </div>
  );

  return (
    <main className="min-h-screen pb-16">
      <AppNav />
      <div className="mx-auto max-w-5xl px-5 py-9 sm:px-6">
        <p className="eyebrow">Application tracker</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Keep momentum on every application.</h1>
        <p className="mt-2 text-slate-500">
          A real-time Convex-backed view of opportunities you have saved and applied for.
        </p>

        {!mounted ? (
          <div className="mt-8 surface p-6 text-slate-500">Loading...</div>
        ) : !userId ? (
          <div className="mt-8 surface p-8 text-center">
            <h3 className="text-lg font-bold text-slate-900">No active profile found</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              Please complete onboarding or set up your user profile so we can track your saved opportunities and application milestones.
            </p>
            <div className="mt-5">
              <Link href="/onboarding" className="button-primary">
                Set up profile
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Ready to apply</h2>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                  {saved.length}
                </span>
              </div>
              {column(saved, "saved")}
            </section>
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Applied</h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {applied.length}
                </span>
              </div>
              {column(applied, "applied")}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
