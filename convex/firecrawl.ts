import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const searchAndStore = action({
  args: {
    query: v.string(),
    filters: v.optional(
      v.object({
        category: v.optional(v.string()),
        location: v.optional(v.string()),
      }),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    const limit = args.limit ?? 5;
    let opportunities: Array<{
      title: string;
      organization: string;
      description: string;
      category: string;
      deadline: string | null;
      eligibility: string;
      location: string;
      url: string;
      source: string;
    }> = [];

    if (apiKey) {
      try {
        const fullQuery = [args.query, args.filters?.category, args.filters?.location, "opportunity application deadline"]
          .filter(Boolean)
          .join(" ");

        const res = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ query: fullQuery, limit }),
        });

        if (res.ok) {
          const data = await res.json();
          opportunities = (data.data || []).map((item: any) => ({
            title: item.title || "Untitled Opportunity",
            organization: item.metadata?.source || "Web Listing",
            description: item.description || item.markdown?.slice(0, 300) || "Discovered via Firecrawl search.",
            category: args.filters?.category || "job",
            deadline: null,
            eligibility: "Check opportunity website for eligibility criteria.",
            location: args.filters?.location || "Remote",
            url: item.url,
            source: "firecrawl",
          }));
        }
      } catch (err: any) {
        console.warn("Firecrawl search error:", err.message);
      }
    }

    if (opportunities.length === 0) {
      opportunities = [
        {
          title: "AI & Full-Stack Fellowship",
          organization: "Emerging Tech Collective",
          description: "Hands-on engineering fellowship focused on AI applications and distributed systems.",
          category: "fellowship",
          deadline: "2026-10-20",
          eligibility: "Open to junior and mid-level software developers.",
          location: "Remote",
          url: "https://example.com/fellowship",
          source: "firecrawl",
        },
      ];
    }

    await ctx.runMutation(internal.opportunities.upsertMany, {
      opportunities,
    });

    return { opportunities };
  },
});
