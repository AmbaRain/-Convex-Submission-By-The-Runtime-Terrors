import Link from "next/link";
import { OpportunityView } from "@/lib/types";

function deadlineText(deadline: any): string {
  if (!deadline || typeof deadline !== "string") return "No deadline listed";
  try {
    const trimmed = deadline.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(`${trimmed}T00:00:00`);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat("en", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(d);
      }
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(d);
    }

    return trimmed;
  } catch {
    return String(deadline);
  }
}

export function OpportunityCard({
  opp,
  onSave,
}: {
  opp: OpportunityView;
  onSave: (id: string, status: string) => void;
}) {
  const score = Math.round(opp.matchScore);
  const scoreStyle =
    score >= 85
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : score >= 70
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-50 text-slate-600";
  const isSaved = opp.savedStatus === "saved" || opp.savedStatus === "applied";

  return (
    <article className="surface flex h-full w-full min-w-0 max-w-full flex-col p-4 sm:p-5 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 overflow-hidden box-border">
      <div className="flex items-start justify-between gap-3 min-w-0 w-full">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-600 truncate">
            {opp.category}
          </p>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 line-clamp-2 leading-snug break-words">
            {opp.title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 truncate">
            {opp.organization}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${scoreStyle}`}>
          {score}% match
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 min-w-0 w-full overflow-hidden">
        <span className="inline-flex items-center gap-1 truncate max-w-[58%]">
          📍 {opp.remote ? "Remote" : opp.location}
        </span>
        <span className="inline-flex items-center gap-1 shrink-0">
          ⏳ Due {deadlineText(opp.deadline)}
        </span>
      </div>

      <div className="mt-3 min-h-[44px] space-y-1 border-t border-slate-100 pt-2.5 min-w-0 w-full overflow-hidden">
        {opp.matchReasons.slice(0, 2).map((reason, index) => (
          <p key={index} className="text-xs text-slate-600 truncate min-w-0 flex items-center">
            <span className="mr-1.5 font-bold text-indigo-500 shrink-0">+</span>
            <span className="truncate">{reason}</span>
          </p>
        ))}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-4 w-full min-w-0">
        <Link
          href={`/opportunity?id=${opp.id}`}
          className="button-secondary text-center px-2 py-2 text-xs truncate w-full"
        >
          Details
        </Link>
        <button
          onClick={() => onSave(opp.id, isSaved ? "dismissed" : "saved")}
          className={`rounded-xl px-2 py-2 text-xs font-semibold transition text-center truncate w-full ${
            isSaved
              ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
          }`}
        >
          {opp.savedStatus === "applied" ? "Applied" : isSaved ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  );
}
