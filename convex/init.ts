import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const SEED_OPPORTUNITIES = [
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
    source: "convex",
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
    source: "openai",
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
    source: "web",
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
    source: "vibeapps",
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
    source: "google",
    salary: "$10,000 Award",
    tags: ["scholarship", "students", "computer-science", "leadership"],
  },
  {
    title: "Thiel Fellowship",
    organization: "The Thiel Foundation",
    description:
      "A two-year, $100,000 grant for young people who want to build new things instead of sitting in a classroom.",
    category: "fellowship",
    deadline: "2026-12-31T23:59:59Z",
    eligibility: "Anyone age 22 or younger.",
    location: "Global / Remote",
    url: "https://thielfellowship.org",
    source: "web",
    salary: "$100,000 Grant",
    tags: ["fellowship", "entrepreneurship", "startup", "youth"],
  },
  {
    title: "Anthropic AI Safety Research Fellowship",
    organization: "Anthropic",
    description:
      "Fellowship program focusing on mechanistic interpretability, scalable oversight, and alignment evaluations for frontier models.",
    category: "fellowship",
    deadline: "2026-11-01T00:00:00Z",
    eligibility: "Background in machine learning, mathematics, statistics, or software engineering.",
    location: "San Francisco, CA / London, UK",
    url: "https://anthropic.com/careers/research-fellow",
    source: "anthropic",
    salary: "$180,000 - $220,000",
    tags: ["ai-safety", "research", "machine-learning", "anthropic"],
  },
];

/**
 * Seeds the database with rich demo data (opportunities, demo user, matches, application tracker, alerts).
 */
export const seed = mutation({
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Seed or find demo user
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "demo@opportunityradar.dev"))
      .first();

    let userId: Id<"users">;
    if (!user) {
      userId = await ctx.db.insert("users", {
        email: "demo@opportunityradar.dev",
        name: "Alex Rivera",
        skills: ["TypeScript", "React", "Convex", "Next.js", "Python", "OpenAI"],
        interests: ["AI Agents", "Realtime Web", "Open Source", "Hackathons"],
        experienceLevel: "mid",
        location: "Remote",
        remoteOnly: true,
        bio: "Full-stack engineer passionate about generative UI, real-time sync, and autonomous agent tooling.",
        targetRoles: ["Full Stack Engineer", "AI Product Engineer", "Hackathon Builder"],
        alertSettings: {
          minMatchScore: 70,
          emailAlertsEnabled: true,
        },
        createdAt: now,
        updatedAt: now,
      });
    } else {
      userId = user._id;
    }

    // 2. Ingest opportunities
    const opIds: Id<"opportunities">[] = [];
    for (const op of SEED_OPPORTUNITIES) {
      const existing = await ctx.db
        .query("opportunities")
        .withIndex("by_url", (q) => q.eq("url", op.url))
        .first();

      if (existing) {
        opIds.push(existing._id);
      } else {
        const id = await ctx.db.insert("opportunities", {
          ...op,
          createdAt: now,
          updatedAt: now,
        });
        opIds.push(id);
      }
    }

    // 3. Seed match scores for demo user
    const sampleMatches = [
      {
        opportunityId: opIds[0], // Convex All Gas Hackathon
        matchScore: 98,
        matchReasons: [
          "Direct skill match with Convex, TypeScript, and React",
          "High alignment with your interest in Hackathons and AI Agents",
          "Matches your remote-only preference",
        ],
      },
      {
        opportunityId: opIds[2], // Firecrawl Grant
        matchScore: 92,
        matchReasons: [
          "Matches your AI Agents and Open Source interests",
          "High relevance for autonomous agent builders",
          "Remote friendly grant",
        ],
      },
      {
        opportunityId: opIds[4], // Senior Full Stack AI Engineer
        matchScore: 89,
        matchReasons: [
          "Direct tech stack overlap: Convex, TypeScript, and React",
          "Full-time remote opportunity",
          "Aligns with your mid-to-senior engineering experience",
        ],
      },
      {
        opportunityId: opIds[1], // OpenAI Residency
        matchScore: 78,
        matchReasons: [
          "Python and AI foundational skills match",
          "Aligns with interest in cutting-edge frontier AI",
        ],
      },
    ];

    for (const m of sampleMatches) {
      const existingMatch = await ctx.db
        .query("matches")
        .withIndex("by_user_opportunity", (q) =>
          q.eq("userId", userId).eq("opportunityId", m.opportunityId)
        )
        .first();

      if (!existingMatch) {
        await ctx.db.insert("matches", {
          userId,
          opportunityId: m.opportunityId,
          matchScore: m.matchScore,
          matchReasons: m.matchReasons,
          computedAt: now,
        });
      }
    }

    // 4. Seed initial application tracking
    const existingApp = await ctx.db
      .query("applications")
      .withIndex("by_user_opportunity", (q) =>
        q.eq("userId", userId).eq("opportunityId", opIds[0])
      )
      .first();

    if (!existingApp) {
      await ctx.db.insert("applications", {
        userId,
        opportunityId: opIds[0],
        status: "preparing",
        notes: "Building Opportunity Radar with Convex, OpenAI, Firecrawl, and AgentMail!",
        appliedDate: "2026-09-21",
        createdAt: now,
        updatedAt: now,
      });
    }

    // 5. Seed initial alert
    const existingAlert = await ctx.db
      .query("alerts")
      .withIndex("by_user_opportunity", (q) =>
        q.eq("userId", userId).eq("opportunityId", opIds[0])
      )
      .first();

    if (!existingAlert) {
      await ctx.db.insert("alerts", {
        userId,
        opportunityId: opIds[0],
        title: "New 98% Match: Convex All Gas Hackathon",
        message: "Direct skill match with Convex, TypeScript, and React",
        matchScore: 98,
        status: "unread",
        emailStatus: "pending",
        createdAt: now,
      });
    }

    return {
      success: true,
      message: "Seeded demo user, opportunities, matches, applications, and alerts.",
      userId,
      opportunitiesCount: opIds.length,
    };
  },
});
