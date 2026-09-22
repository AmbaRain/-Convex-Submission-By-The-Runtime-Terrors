import Link from "next/link";
import { OpportunityView } from "@/lib/types";

function deadlineText(deadline: string | null) {
  if (!deadline) return "No deadline listed";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${deadline}T00:00:00`));
}

export function OpportunityCard({ opp, onSave }: { opp: OpportunityView; onSave: (id: string, status: string) => void }) {
  const score = Math.round(opp.matchScore);
  const scoreStyle = score >= 85 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : score >= 70 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600";
  const isSaved = opp.savedStatus === "saved" || opp.savedStatus === "applied";
  return <article className="surface flex h-full flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">{opp.category}</p><h2 className="truncate text-lg font-bold text-slate-900">{opp.title}</h2><p className="mt-1 text-sm text-slate-500">{opp.organization}</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${scoreStyle}`}>{score}% match</span></div>
    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500"><span>{opp.remote ? "Remote" : opp.location}</span><span>Due {deadlineText(opp.deadline)}</span></div>
    <div className="mt-4 min-h-12 space-y-1.5 border-t border-slate-100 pt-4">{opp.matchReasons.slice(0, 2).map((reason, index) => <p key={index} className="text-sm text-slate-600"><span className="mr-2 text-indigo-500">+</span>{reason}</p>)}</div>
    <div className="mt-auto flex flex-wrap gap-2 pt-5"><Link href={`/opportunities/${opp.id}`} className="button-secondary flex-1 px-3 py-2 text-xs">Details</Link><button onClick={() => onSave(opp.id, isSaved ? "dismissed" : "saved")} className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${isSaved ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>{opp.savedStatus === "applied" ? "Applied" : isSaved ? "Saved" : "Save"}</button></div>
  </article>;
}
