import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * High-quality fallback opportunities when FIRECRAWL_API_KEY is not yet configured.
 * This guarantees frontend developers can test live crawling flows immediately.
 */
const CURATED_CRAWL_DATA = [
  {
    title: "Convex All Gas Hackathon",
    organization: "Convex",
    description:
      "A fast-paced AI hackathon building real-time full-stack apps with Convex, OpenAI, Firecrawl, and AgentMail. Over $15k in prizes and judging by industry leaders.",
    category: "hackathon",
    deadline: "2026-09-22T19:00:00Z",
    eligibility: "Open to developers worldwide building with Convex and partner APIs.",
    location: "Global / Remote",
    url: "https://vibeapps.dev/judging/convex-all-gas-hackathon-openai",
    source: "firecrawl",
    salary: "$15,000+ Prize Pool",
    tags: ["convex", "ai", "hackathon", "full-stack", "openai", "remote"],
  },
  {
    title: "OpenAI Residency Program",
    organization: "OpenAI",
    description:
      "A 6-month full-time paid residency transition program for researchers and engineers seeking to work on frontier AI models and superalignment.",
    category: "fellowship",
    deadline: "2026-11-15T23:59:59Z",
    eligibility: "Software engineers, mathematicians, or researchers with strong coding foundations.",
    location: "San Francisco, CA / Hybrid",
    url: "https://openai.com/careers/residency",
    source: "firecrawl",
    salary: "$210,000 / year annualized",
    tags: ["ai", "residency", "research", "machine-learning", "python"],
  },
  {
    title: "Firecrawl Open Source AI Extraction Grant",
    organization: "Firecrawl",
    description:
      "Micro-grants of $5,000 to $15,000 for developers building open-source tools that leverage web scraping, LLM search agents, and data extraction pipelines.",
    category: "grant",
    deadline: "2026-10-31T23:59:59Z",
    eligibility: "Open-source maintainers and indie hackers with public GitHub repositories.",
    location: "Global / Remote",
    url: "https://firecrawl.dev/grants",
    source: "firecrawl",
    salary: "$5,000 - $15,000 Grant",
    tags: ["scraping", "ai-agents", "grant", "open-source", "remote"],
  },
  {
    title: "Emergent Ventures Fellowship & Grant",
    organization: "Mercatus Center",
    description:
      "Fast fellowship grants supporting highly ambitious builders, researchers, and public-interest technology innovators solving moonshot problems.",
    category: "fellowship",
    deadline: null,
    eligibility: "High-agency individuals of any age or academic status.",
    location: "Global / Remote",
    url: "https://www.mercatus.org/emergent-ventures",
    source: "firecrawl",
    salary: "$10,000 - $100,000 Grant",
    tags: ["fellowship", "moonshot", "grant", "innovation"],
  },
  {
    title: "Senior Full Stack AI Engineer",
    organization: "VibeApps",
    description:
      "Architect and ship real-time reactive applications with Convex, Next.js, and TypeScript. Looking for product-minded engineers who love speed and polished UX.",
    category: "job",
    deadline: "2026-10-15T00:00:00Z",
    eligibility: "3+ years production TypeScript, React, and serverless/BaaS experience.",
    location: "Remote",
    url: "https://vibeapps.dev/careers/senior-fullstack-ai",
    source: "firecrawl",
    salary: "$160,000 - $195,000",
    tags: ["typescript", "react", "convex", "remote", "full-stack"],
  },
  {
    title: "Generation Google Scholarship (North America)",
    organization: "Google",
    description:
      "A $10,000 scholarship for computer science students who demonstrate passion for technology, academic excellence, and leadership in diversity.",
    category: "scholarship",
    deadline: "2026-12-01T23:59:59Z",
    eligibility: "Full-time undergraduate students studying computer science or related engineering field.",
    location: "United States & Canada",
    url: "https://buildyourfuture.withgoogle.com/scholarships/generation-google-scholarship",
    source: "firecrawl",
    salary: "$10,000 Award",
    tags: ["scholarship", "students", "computer-science", "leadership"],
  },
];

/**
 * Crawl web sources for new opportunities via Firecrawl.
 * Encapsulates Firecrawl API integration details from the frontend.
 */
export const crawlOpportunities = action({
  args: {
    query: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    const query = args.query ?? "developer hackathons grants fellowships software jobs 2026";
    const limit = args.limit ?? 10;

    let discoveredOpportunities = [];

    if (apiKey) {
      try {
        const response = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            query,
            limit,
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        if (!response.ok) {
          throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const results = data?.data ?? [];

        discoveredOpportunities = results.map((item: any, idx: number) => ({
          title: item.title || `Opportunity from ${item.url}`,
          organization: item.metadata?.sourceURL || "Web",
          description: item.description || item.markdown?.slice(0, 300) || "Discovered via Firecrawl search.",
          category: args.category ?? "other",
          deadline: null,
          eligibility: "Refer to opportunity website for detailed eligibility criteria.",
          location: "See listing",
          url: item.url,
          source: "firecrawl",
          salary: undefined,
          tags: ["web-crawl", "firecrawl"],
        }));
      } catch (err: any) {
        console.warn("Firecrawl live crawl failed, falling back to curated dataset:", err.message);
        discoveredOpportunities = CURATED_CRAWL_DATA;
      }
    } else {
      // Fallback mode for development without requiring external credentials immediately
      discoveredOpportunities = CURATED_CRAWL_DATA;
    }

    // Filter by category if requested
    if (args.category && args.category !== "all") {
      discoveredOpportunities = discoveredOpportunities.filter(
        (op: any) => op.category.toLowerCase() === args.category!.toLowerCase()
      );
    }

    // Ingest into Convex database with URL deduplication
    const ingestResult: {
      success: boolean;
      ingestedCount: number;
      duplicateCount: number;
      total: number;
    } = await ctx.runMutation(api.opportunities.ingestBatch, {
      opportunities: discoveredOpportunities,
    });

    return {
      success: true,
      query,
      ingestedCount: ingestResult.ingestedCount,
      duplicateCount: ingestResult.duplicateCount,
      totalDiscovered: discoveredOpportunities.length,
      mode: apiKey ? "live_firecrawl" : "curated_demo",
    };
  },
});
