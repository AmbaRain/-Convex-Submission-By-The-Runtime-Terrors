import OpportunityDetailClient from "@/components/OpportunityDetailClient";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function generateStaticParams() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (convexUrl) {
    try {
      const client = new ConvexHttpClient(convexUrl);
      const opps = await client.query(api.opportunities.list, { limit: 100 });
      if (opps && opps.length > 0) {
        return opps.map((opp) => ({ id: opp.id }));
      }
    } catch (e) {
      console.warn("Could not prefetch opportunities during static build:", e);
    }
  }
  return [{ id: "_" }];
}

export default function OpportunityPage({ params }: { params: { id: string } }) {
  return <OpportunityDetailClient initialId={params.id} />;
}
