"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [{ href: "/dashboard", label: "Discover" }, { href: "/applications", label: "Applications" }, { href: "/dashboard?saved=1", label: "Saved" }];

export function AppNav() {
  const pathname = usePathname();
  return <header className="border-b border-slate-200 bg-white/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6"><Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-slate-950"><span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-sm text-white">R</span>Opportunity Radar</Link><nav className="hidden items-center gap-1 sm:flex">{links.map((link) => { const active = pathname === link.href.split("?")[0]; return <Link key={link.href} href={link.href} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-900"}`}>{link.label}</Link>; })}</nav><Link href="/onboarding" className="button-secondary px-3 py-2 text-xs sm:px-4 sm:text-sm">Your profile</Link></div></header>;
}
