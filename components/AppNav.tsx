"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "./SessionContext";

const links = [
  { href: "/dashboard", label: "Discover" },
  { href: "/applications", label: "Applications" },
  { href: "/dashboard?saved=1", label: "Saved" },
];

export function AppNav() {
  const pathname = usePathname();
  const { sessionId, profile, isReady } = useSession();

  const displayName = profile?.name || profile?.email || null;

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-950">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm shrink-0">
            R
          </span>
          <span className="hidden min-[380px]:inline">Opportunity Radar</span>
          <span className="inline min-[380px]:hidden">Radar</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => {
            const active = pathname === link.href.split("?")[0];
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isReady && sessionId && displayName ? (
            <Link
              href="/onboarding"
              title={`Active session for ${displayName}`}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-indigo-200 bg-indigo-50/80 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 hover:border-indigo-300"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="max-w-[100px] sm:max-w-[130px] truncate">{displayName}</span>
            </Link>
          ) : (
            <Link href="/onboarding" className="button-secondary px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
              Setup profile
            </Link>
          )}
        </div>
      </div>

      {/* Mobile sub-navigation bar */}
      <div className="border-t border-slate-100 bg-white/95 px-4 py-2 sm:hidden flex justify-around items-center">
        {links.map((link) => {
          const active = pathname === link.href.split("?")[0];
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
