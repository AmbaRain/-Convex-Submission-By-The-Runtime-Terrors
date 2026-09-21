import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { MatchResult, Opportunity } from "./types";
import { toCanonicalOpportunity } from "./opportunities";

/**
 * Maps database document to canonical MatchResult contract
 */
export function toCanonicalMatch(doc: Doc<"matches">): MatchResult {
  return {
    opportunityId: doc.opportunityId,
    matchScore: doc.matchScore,
    matchReasons: doc.matchReasons,
  };
}

/**
 * Get AI-matched opportunities for a user, sorted by score descending
 */
export const getMatchesForUser = query({
  args: {
    userId: v.id("users"),
    minScore: v.optional(v.number()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Sort by matchScore descending
    matches.sort((a, b) => b.matchScore - a.matchScore);

    const minScore = args.minScore ?? 0;
    const filteredMatches = matches.filter((m) => m.matchScore >= minScore);

    const results: Array<{
      match: MatchResult;
      opportunity: Opportunity;
      computedAt: number;
    }> = [];

    for (const m of filteredMatches) {
      if (args.limit && results.length >= args.limit) break;

      const opDoc = await ctx.db.get(m.opportunityId);
      if (!opDoc) continue;

      if (args.category && args.category !== "all" && opDoc.category !== args.category) {
        continue;
      }

      results.push({
        match: toCanonicalMatch(m),
        opportunity: toCanonicalOpportunity(opDoc),
        computedAt: m.computedAt,
      });
    }

    return results;
  },
});

/**
 * Get match details for a specific opportunity and user
 */
export const getMatchForOpportunity = query({
  args: {
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("matches")
      .withIndex("by_user_opportunity", (q) =>
        q.eq("userId", args.userId).eq("opportunityId", args.opportunityId)
      )
      .first();

    if (!doc) return null;
    return toCanonicalMatch(doc);
  },
});

/**
 * Store or update a single match result
 */
export const storeMatch = mutation({
  args: {
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
    matchScore: v.number(),
    matchReasons: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("matches")
      .withIndex("by_user_opportunity", (q) =>
        q.eq("userId", args.userId).eq("opportunityId", args.opportunityId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        matchScore: args.matchScore,
        matchReasons: args.matchReasons,
        computedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("matches", {
      userId: args.userId,
      opportunityId: args.opportunityId,
      matchScore: args.matchScore,
      matchReasons: args.matchReasons,
      computedAt: now,
    });

    return id;
  },
});

/**
 * Batch store match results and generate alerts for high matches
 */
export const storeMatchBatch = mutation({
  args: {
    userId: v.id("users"),
    matches: v.array(
      v.object({
        opportunityId: v.id("opportunities"),
        matchScore: v.number(),
        matchReasons: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const user = await ctx.db.get(args.userId);
    const minAlertScore = user?.alertSettings?.minMatchScore ?? 70;
    const emailEnabled = user?.alertSettings?.emailAlertsEnabled ?? true;

    let alertCount = 0;

    for (const m of args.matches) {
      const existing = await ctx.db
        .query("matches")
        .withIndex("by_user_opportunity", (q) =>
          q.eq("userId", args.userId).eq("opportunityId", m.opportunityId)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          matchScore: m.matchScore,
          matchReasons: m.matchReasons,
          computedAt: now,
        });
      } else {
        await ctx.db.insert("matches", {
          userId: args.userId,
          opportunityId: m.opportunityId,
          matchScore: m.matchScore,
          matchReasons: m.matchReasons,
          computedAt: now,
        });
      }

      // Check if this qualifies for a new high-match alert
      if (m.matchScore >= minAlertScore) {
        const existingAlert = await ctx.db
          .query("alerts")
          .withIndex("by_user_opportunity", (q) =>
            q.eq("userId", args.userId).eq("opportunityId", m.opportunityId)
          )
          .first();

        if (!existingAlert) {
          const opDoc = await ctx.db.get(m.opportunityId);
          const title = `New ${m.matchScore}% Match: ${opDoc?.title ?? "Opportunity"}`;
          const topReason = m.matchReasons[0] || "Strong alignment with your profile";

          await ctx.db.insert("alerts", {
            userId: args.userId,
            opportunityId: m.opportunityId,
            title,
            message: topReason,
            matchScore: m.matchScore,
            status: "unread",
            emailStatus: emailEnabled ? "pending" : "skipped",
            createdAt: now,
          });
          alertCount++;
        }
      }
    }

    return { success: true, processed: args.matches.length, newAlerts: alertCount };
  },
});
