import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { MatchResult, UserProfile } from "../types";
import { Doc, Id } from "../_generated/dataModel";
import { fingerprintInput } from "../../src/fingerprint";
import { validateMatchResult, normalizeMatchResult } from "../../src/validation";

/**
 * Heuristic matcher fallback when OPENAI_API_KEY is not yet configured.
 * Computes deterministic, high-quality match scores and reasons from profile & opportunity fields.
 */
function heuristicMatch(user: UserProfile, op: Doc<"opportunities">): MatchResult & { fingerprint: string } {
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

  // Compute fingerprint for heuristic matches too
  const profileInput = {
    id: user.id || (user as any)._id || "",
    email: user.email,
    name: user.name || null,
    skills: user.skills,
    location: user.location,
    experience_level: (user.experienceLevel || "mid") as any,
    education: user.bio || null,
    certifications: [],
    status: "active" as const,
  };

  const opId = (op as any).id || op._id;
  const oppInput = {
    id: opId,
    title: op.title,
    description: op.description,
    requirements: [],
    deadline: op.deadline || "",
    category: op.category as any,
    source_url: op.url || "",
    extracted_at: String(op.createdAt || ""),
  };

  const fingerprint = fingerprintInput(profileInput, oppInput);

  return {
    opportunityId: opId,
    matchScore: finalScore,
    matchReasons: reasons,
    fingerprint,
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
    const fingerprints: string[] = [];

    if (apiKey) {
      try {
        const isOpnRouter = apiKey.startsWith("sk-or-") || Boolean(process.env.OPENAI_BASE_URL?.includes("openrouter"));
        const baseUrl = (process.env.OPENAI_BASE_URL || (isOpnRouter ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1")).replace(/\/+$/, "");
        const model = process.env.OPENAI_MODEL || (isOpnRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini");

        const systemPrompt = `You are an expert talent and opportunity matchmaking system.
Evaluate the candidate's profile against each provided opportunity.
For each opportunity, output a matchScore between 0 and 100, and 2 to 4 concise, factual matchReasons.
Candidate Profile:
- Skills: ${user.skills.join(", ")}
- Interests: ${user.interests.join(", ")}
- Experience Level: ${user.experienceLevel}
- Location: ${user.location} (Remote Only: ${user.remoteOnly})
- Bio / Goals: ${user.bio || "None provided"}`;

        // Optimize prompt token usage: limit batch size to 15 and trim long descriptions to 250 chars
        const promptOpportunities = opportunities.slice(0, 15).map((op) => ({
          id: (op as any).id || op._id,
          title: op.title,
          organization: op.organization,
          description: op.description ? op.description.slice(0, 250) : "",
          category: op.category,
          location: op.location,
          eligibility: op.eligibility ? op.eligibility.slice(0, 150) : "",
        }));

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        };
        if (isOpnRouter) {
          headers["HTTP-Referer"] = "https://opportunity-radar.local";
          headers["X-Title"] = "Opportunity Radar";
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Evaluate candidate fit for these opportunities. Return a JSON object with key "matches", containing an array of objects with fields: "opportunityId", "matchScore" (integer 0-100), "summary" (one sentence reason), and "matchReasons" (array of strings). Opportunities:\n${JSON.stringify(
                  promptOpportunities
                )}`,
              },
            ],
            temperature: 0.2,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error (${model}): ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const parsed = JSON.parse(content || "{}");
        const aiMatches: any[] = parsed.matches || [];

        // Track fingerprints and validate each match
        for (const op of opportunities) {
          const opId = (op as any).id || op._id;
          const match = aiMatches.find((m) => m.opportunityId === opId);

          // Build profile input for fingerprint
          const profileInput = {
            id: user.id || (user as any)._id || "",
            email: user.email,
            name: user.name || null,
            skills: user.skills,
            location: user.location,
            experience_level: (user.experienceLevel || "mid") as any,
            education: user.bio || null,
            certifications: [],
            status: "active" as const,
          };

          // Build opportunity input for fingerprint
          const oppInput = {
            id: opId,
            title: op.title,
            description: op.description,
            requirements: [],
            deadline: op.deadline || "",
            category: op.category as any,
            source_url: op.url || "",
            extracted_at: String(op.createdAt || ""),
          };

          const fingerprint = fingerprintInput(profileInput, oppInput);
          fingerprints.push(fingerprint);

          if (match) {
            const summaryText = (
              match.summary ||
              (match.matchReasons?.join(". ") || "Relevant fit for your profile.")
            ).slice(0, 280);

            // Normalize and validate the AI output
            const normalized = normalizeMatchResult({
              opportunity_id: match.opportunityId || opId,
              opportunity_title: match.opportunityTitle || op.title,
              score: typeof match.matchScore === "number" ? match.matchScore : 75,
              tier: match.tier || "strong",
              eligibility: match.eligibility || "likely",
              summary: summaryText,
              positive_reasons: match.matchReasons?.length ? match.matchReasons : ["Relevant match based on skills and criteria"],
              missing_requirements: (match as any).missing_requirements || [],
              uncertain_requirements: (match as any).uncertain_requirements || [],
            });

            if ("errors" in normalized) {
              console.warn("OpenAI output validation errors:", normalized.errors);
              // Fall back to heuristic
              const heuristicResult = heuristicMatch(user, op);
              matchResults.push({
                opportunityId: heuristicResult.opportunityId,
                matchScore: heuristicResult.matchScore,
                matchReasons: heuristicResult.matchReasons,
              });
              continue;
            }

            // Record model metadata for this match
            const result: MatchResult = {
              opportunityId: normalized.opportunity_id,
              matchScore: normalized.score,
              matchReasons: normalized.positive_reasons,
            };

            matchResults.push(result);
          } else {
            // No match found for this opportunity from AI, use heuristic
            const heuristicResult = heuristicMatch(user, op);
            matchResults.push({
              opportunityId: heuristicResult.opportunityId,
              matchScore: heuristicResult.matchScore,
              matchReasons: heuristicResult.matchReasons,
            });
          }
        }
      } catch (err: any) {
        console.warn("OpenAI API call failed, using intelligent heuristic scoring:", err.message);
        // Fall back to heuristic for all opportunities
        for (const op of opportunities) {
          const heuristicResult = heuristicMatch(user, op);
          matchResults.push({
            opportunityId: heuristicResult.opportunityId,
            matchScore: heuristicResult.matchScore,
            matchReasons: heuristicResult.matchReasons,
          });
        }
      }
    } else {
      // Heuristic AI scoring fallback (no API key)
      for (const op of opportunities) {
        const heuristicResult = heuristicMatch(user, op);
        matchResults.push({
          opportunityId: heuristicResult.opportunityId,
          matchScore: heuristicResult.matchScore,
          matchReasons: heuristicResult.matchReasons,
        });
      }
    }

    // 3. Batch store matches in Convex with metadata
    const storeMatches = matchResults.map((m, i) => ({
      opportunityId: m.opportunityId as Id<"opportunities">,
      matchScore: m.matchScore,
      matchReasons: m.matchReasons,
      model: "gpt-4o-mini",
      promptVersion: "1.0.0",
      sourceFingerprint: fingerprints[i] || "",
    }));

    await ctx.runMutation(api.matches.storeMatchBatch, {
      userId: args.userId,
      matches: storeMatches,
    });

    return matchResults;
  },
});