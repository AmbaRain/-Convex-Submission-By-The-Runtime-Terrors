"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { OpportunityCard } from "@/components/OpportunityCard";
import { AppNav } from "@/components/AppNav";
import { CATEGORIES, OpportunityView } from "@/lib/types";
import { useSession } from "@/components/SessionContext";

function DashboardContent() {
  const searchParams = useSearchParams();
  const { sessionId: userId, profile } = useSession();
  const [category, setCategory] = useState("");
  const [savedOnly, setSavedOnly] = useState(searchParams.get("saved") === "1");
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Convex live queries
  const opportunities = useQuery(api.opportunities.list, {
    category: category || undefined,
    limit: 50,
  });

  const userMatches = useQuery(
    api.matches.getMatchesForUser,
    userId ? { userId, category: category || undefined } : "skip"
  );

  const savedList = useQuery(
    api.savedOpportunities.listSaved,
    userId ? { userId } : "skip"
  );

  // Convex mutations & actions
  const saveMutation = useMutation(api.savedOpportunities.save);
  const unsaveMutation = useMutation(api.savedOpportunities.unsave);
  const crawlAction = useAction(api.integrations.firecrawl.crawlOpportunities);
  const matchAction = useAction(api.integrations.openai.matchUserOpportunities);
  const digestAction = useAction(api.integrations.agentmail.sendOpportunityDigest);
  const alertAction = useAction(api.integrations.agentmail.sendMatchAlertEmail);

  // Construct combined view models
  const isSavedSet = new Set(savedList?.map((s: any) => s.opportunity.id));
  const matchMap = new Map<string, { matchScore?: number; matchReasons?: string[] }>(
    (userMatches || []).map((m: any) => [m.opportunity.id, m.match])
  );

  const allViews: OpportunityView[] = (opportunities || []).map((op: any) => {
    const match = matchMap.get(op.id);
    const isSaved = isSavedSet.has(op.id);
    const parsedTs = op.deadline ? new Date(op.deadline).getTime() : NaN;
    const deadlineTs = !isNaN(parsedTs) ? parsedTs : null;
    return {
      id: op.id,
      title: op.title,
      organization: op.organization,
      category: op.category,
      deadline: op.deadline,
      deadlineTs,
      location: op.location,
      remote:
        op.location.toLowerCase().includes("remote") ||
        op.location.toLowerCase().includes("global"),
      matchScore: match?.matchScore ?? 75,
      matchReasons: match?.matchReasons?.length
        ? match.matchReasons
        : ["Relevant opportunity based on current listings"],
      url: op.url,
      savedStatus: isSaved ? "saved" : null,
    };
  });

  const filtered = allViews.filter((match) => !savedOnly || !!match.savedStatus);
  const savedCount = savedList?.length ?? 0;
  const deadlineCount = allViews.filter(
    (match) =>
      match.deadlineTs &&
      match.deadlineTs - Date.now() < 7 * 86400000 &&
      match.deadlineTs > Date.now()
  ).length;

  const onSave = async (id: string, status: string) => {
    if (!userId) {
      setNotice("Create a profile in Onboarding to save opportunities to your personal list.");
      return;
    }
    if (status === "saved") {
      await saveMutation({ userId, opportunityId: id as Id<"opportunities"> });
      setNotice("Saved opportunity to your personal list!");
      // Automatically send alert email to profile address in background
      try {
        const alertRes = await alertAction({ userId, opportunityId: id as Id<"opportunities"> });
        if (alertRes.success && profile?.email) {
          setNotice(`Saved! Alert email dispatched to ${profile.email}`);
        }
      } catch (err) {
        console.warn("Could not dispatch save alert email:", err);
      }
    } else {
      await unsaveMutation({ userId, opportunityId: id as Id<"opportunities"> });
      setNotice("Removed opportunity from saved list.");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setNotice("Scanning the web with Firecrawl for fresh opportunities...");
    try {
      const crawlRes = await crawlAction({
        category: category || undefined,
        limit: 8,
      });

      if (userId) {
        setNotice("Calculating AI matches with OpenRouter...");
        await matchAction({ userId });
      }

      setNotice(
        `Discovered ${crawlRes.totalDiscovered ?? 0} opportunities. Feed updated in real-time!`
      );
    } catch (err: any) {
      setNotice("Web scan error: " + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEmailDigest = async () => {
    if (!userId) {
      setNotice("Set up your profile first in Onboarding to receive email digests.");
      return;
    }
    const targetEmail = profile?.email || "your registered email";
    setSendingEmail(true);
    setNotice(`Sending opportunity digest via AgentMail to ${targetEmail}...`);
    try {
      const res = await digestAction({ userId });
      if (res.success) {
        setNotice(
          `✓ Opportunity digest with ${res.matchCount ?? 5} opportunities successfully delivered to ${res.recipient || targetEmail}! Check your inbox.`
        );
      } else {
        setNotice(`Notice: ${res.message || "Failed to dispatch digest"}`);
      }
    } catch (err: any) {
      setNotice("AgentMail error: " + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden">
      <AppNav />
      <div className="mx-auto max-w-6xl w-full min-w-0 px-4 py-6 sm:px-6 sm:py-9">
        <section className="rounded-3xl bg-slate-950 px-5 py-6 sm:px-8 sm:py-8 text-white w-full min-w-0 overflow-hidden">
          <p className="eyebrow text-indigo-300">Live opportunity feed (Convex DB)</p>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-end justify-between gap-4 min-w-0">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">Your Radar is on.</h1>
              <p className="mt-1.5 text-sm sm:text-base text-slate-300">
                Real-time shortlisted opportunities backed by Firecrawl web search & AI matching.
              </p>
              {profile && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs text-indigo-200 w-full sm:w-fit max-w-full min-w-0 overflow-hidden">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate min-w-0">
                    Tailored for <strong className="text-white">{profile.name || profile.email}</strong> &bull;{" "}
                    {profile.targetRoles?.[0] || profile.bio || "Active Profile"}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="button-primary w-full sm:w-auto bg-white text-indigo-700 hover:bg-indigo-50 text-center shrink-0"
            >
              {refreshing ? "Searching web..." : "Scan web for matches"}
            </button>
          </div>
          <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 text-center sm:text-left w-full min-w-0">
            <div className="px-2 sm:px-0 min-w-0">
              <p className="text-xl sm:text-3xl font-bold">{allViews.length}</p>
              <p className="mt-1 text-[11px] sm:text-xs text-slate-400 truncate">live matches</p>
            </div>
            <div className="px-2 sm:pl-5 min-w-0">
              <p className="text-xl sm:text-3xl font-bold">{savedCount}</p>
              <p className="mt-1 text-[11px] sm:text-xs text-slate-400 truncate">saved in DB</p>
            </div>
            <div className="px-2 sm:pl-5 min-w-0">
              <p className="text-xl sm:text-3xl font-bold">{deadlineCount}</p>
              <p className="mt-1 text-[11px] sm:text-xs text-slate-400 truncate">closing soon</p>
            </div>
          </div>
        </section>

        <section className="surface mt-5 p-4 sm:p-5 w-full min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full min-w-0">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="field mt-0 w-full sm:w-auto sm:min-w-[180px] flex-1 min-w-0"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item} className="capitalize">
                  {item}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSavedOnly(!savedOnly)}
              className={`w-full sm:w-auto rounded-xl border px-4 py-2.5 text-sm font-semibold transition text-center shrink-0 ${
                savedOnly
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {savedOnly ? "Showing saved" : "Saved only"}
            </button>
            <button
              onClick={handleEmailDigest}
              disabled={sendingEmail}
              className="button-secondary w-full sm:w-auto text-center shrink-0"
            >
              {sendingEmail ? "Dispatching..." : "Send email digest"}
            </button>
          </div>
        </section>

        {notice && (
          <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-sm text-indigo-900 w-full min-w-0 break-words">
            {notice}
          </div>
        )}

        <section className="mt-7 w-full min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {savedOnly ? "Saved opportunities" : "Best matches"}
            </h2>
            <p className="text-sm text-slate-500">{filtered.length} results</p>
          </div>
          {filtered.length === 0 ? (
            <div className="surface p-10 text-center w-full min-w-0">
              <p className="text-lg font-bold">Nothing here yet</p>
              <p className="mt-2 text-sm text-slate-500">
                Try scanning the web for new opportunities or change your category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full min-w-0 max-w-full">
              {filtered.map((match) => (
                <OpportunityCard key={match.id} opp={match} onSave={onSave} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen">
          <AppNav />
          <div className="mx-auto max-w-6xl px-5 py-9 sm:px-6">
            <div className="surface p-10 text-center text-slate-500">Loading Radar...</div>
          </div>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
