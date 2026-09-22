"use client";

import { Suspense } from "react";
import OpportunityDetailClient from "@/components/OpportunityDetailClient";
import { AppNav } from "@/components/AppNav";

export default function OpportunityPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen">
          <AppNav />
          <div className="mx-auto max-w-3xl px-5 py-12 text-slate-500">
            Loading opportunity...
          </div>
        </main>
      }
    >
      <OpportunityDetailClient />
    </Suspense>
  );
}
