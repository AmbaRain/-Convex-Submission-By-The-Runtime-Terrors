import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { MatchResult, UserProfile } from "../types";
import { Doc, Id } from "../_generated/dataModel";

/**
 * Heuristic matcher fallback when OPENAI_API_KEY is not yet configured.
 * Computes deterministic, high-quality match scores and reasons from profile & opportunity fields.
 */
function heuristicMatch(user: UserProfile, op: Doc<"opportunities">): MatchResult {
  let score = 30; // base score
  const reasons: string[] = [];

  const textToScan = `${op.title} ${op.description} ${op.eligibility} ${(op.tags || []).join(" ")}`.toLowerCase();

  // Match skills
  const matchedSkills = user.skills.filter((skill) =>
    textToScan.includes(skill.toLowerCase())
  );
  if (matchedSkills.length > 0) {
    score += Math.min(35, matchedSkills.length * 15);
    reasons.push(`Direct skill alignment with your expertise in ${matchedSkills.slice(0, 3).join(", ")}`);
  }

  // Match interests
  const matchedInterests = user.interests.filter((interest) =>
    textToScan.includes(interest.toLowerCase())
  );
  if (matchedInterests.length > 0) {
    score += Math.min(20, matchedInterests.length * 10);
    reasons.push(`Aligns with your interests in ${matchedInterests.slice(0, 2).join(" & ")}`);
  }

  // Location / Remote match
  const isRemote =
    op.location.toLowerCase().includes("remote") ||
    op.location.toLowerCase().includes("global") ||
    (op.tags && op.tags.some((t) => t.toLowerCase().includes("remote")));

  if (user.remoteOnly) {
    if (isRemote) {
      score += 15;
      reasons.push("Fully compatible with your remote-only preference");
    } else {
      score -= 25;
      reasons.push(`Listing location is ${op.location}, but your profile prefers remote`);
    }
  } else {
    if (op.location.toLowerCase().includes(user.location.toLowerCase())) {
      score += 15;
      reasons.push(`Located in or near your target region (${user.location})`);
    } else if (isRemote) {
      score += 10;
      reasons.push("Flexible remote arrangement");
    }
  }

  // Experience level alignment
  if (
    user.experienceLevel &&
    textToScan.includes(user.experienceLevel.toLowerCase())
  ) {
    score += 10;
    reasons.push(`Matches your ${user.experienceLevel} experience tier`);
  }

  // Normalize score between 10 and 98
  const finalScore = Math.max(10, Math.min(98, Math.round(score)));

  if (reasons.length === 0) {
    reasons.push(`General category match for ${op.category}`);
  }

  return {
    opportunityId: op._id,
    matchScore: finalScore,
    matchReasons: reasons,
  };
}

/**
 * Match opportunities to a user profile using OpenAI LLM scoring.
 * Keeps prompt engineering and AI model details isolated from the frontend.
 */
export const matchUserOpportunities = action({
  args: {
    userId: v.id("users"),
    opportunityIds: v.optional(v.array(v.id("opportunities"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<MatchResult[]> => {
    // 1. Fetch user profile
    const user = await ctx.runQuery(api.users.getProfile, { userId: args.userId });
    if (!user) {
      throw new Error(`User profile not found for ID: ${args.userId}`);
    }

    // 2. Fetch opportunities to score
    let opportunities: Array<Doc<"opportunities">> = [];
    if (args.opportunityIds && args.opportunityIds.length > 0) {
      for (const opId of args.opportunityIds) {
        const op = await ctx.runQuery(api.opportunities.getById, { id: opId });
        if (op) opportunities.push(op as any);
      }
    } else {
      const allOps = await ctx.runQuery(api.opportunities.list, {
        limit: args.limit ?? 20,
      });
      opportunities = allOps as any;
    }

    if (opportunities.length === 0) {
      return [];
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const matchResults: MatchResult[] = [];

    if (apiKey) {
      try {
        const systemPrompt = `You are an expert talent and opportunity matchmaking system.
Evaluate the candidate's profile against each provided opportunity.
For each opportunity, output a matchScore between 0 and 100, and 2 to 4 concise, factual matchReasons.
Candidate Profile:
- Skills: ${user.skills.join(", ")}
- Interests: ${user.interests.join(", ")}
- Experience Level: ${user.experienceLevel}
- Location: ${user.location} (Remote Only: ${user.remoteOnly})
- Bio / Goals: ${user.bio || "None provided"}`;

        const promptOpportunities = opportunities.map((op) => ({
          id: (op as any).id || op._id,
          title: op.title,
          organization: op.organization,
          description: op.description,
          category: op.category,
          location: op.location,
          eligibility: op.eligibility,
        }));

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Evaluate candidate fit for these opportunities. Return a JSON object with key "matches", containing an array of objects with fields: "opportunityId", "matchScore" (integer 0-100), and "matchReasons" (array of strings). Opportunities:\n${JSON.stringify(
                  promptOpportunities
                )}`,
              },
            ],
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const parsed = JSON.parse(content || "{}");
        const aiMatches: any[] = parsed.matches || [];

        for (const op of opportunities) {
          const opId = (op as any).id || op._id;
          const match = aiMatches.find((m) => m.opportunityId === opId);
          if (match) {
            matchResults.push({
              opportunityId: opId,
              matchScore: Math.round(match.matchScore),
              matchReasons: Array.isArray(match.matchReasons) ? match.matchReasons : ["High relevance match"],
            });
          } else {
            matchResults.push(heuristicMatch(user, op));
          }
        }
      } catch (err: any) {
        console.warn("OpenAI API call failed, using intelligent heuristic scoring:", err.message);
        for (const op of opportunities) {
          matchResults.push(heuristicMatch(user, op));
        }
      }
    } else {
      // Heuristic AI scoring fallback
      for (const op of opportunities) {
        matchResults.push(heuristicMatch(user, op));
      }
    }

    // 3. Batch store matches in Convex and trigger high-match alerts
    await ctx.runMutation(api.matches.storeMatchBatch, {
      userId: args.userId,
      matches: matchResults.map((m) => ({
        opportunityId: m.opportunityId as Id<"opportunities">,
        matchScore: m.matchScore,
        matchReasons: m.matchReasons,
      })),
    });

    return matchResults;
  },
});
