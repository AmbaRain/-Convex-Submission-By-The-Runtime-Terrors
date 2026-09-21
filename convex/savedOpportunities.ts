import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Opportunity } from "./types";
import { toCanonicalOpportunity } from "./opportunities";
import { toCanonicalMatch } from "./matches";

/**
 * List all saved opportunities for a user with opportunity details and match score
 */
export const listSaved = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const saved = await ctx.db
      .query("savedOpportunities")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const results: Array<{
      savedId: string;
      savedAt: number;
      notes?: string;
      opportunity: Opportunity;
      matchScore?: number;
      matchReasons?: string[];
    }> = [];

    for (const item of saved) {
      const opDoc = await ctx.db.get(item.opportunityId);
      if (!opDoc) continue;

      const matchDoc = await ctx.db
        .query("matches")
        .withIndex("by_user_opportunity", (q) =>
          q.eq("userId", args.userId).eq("opportunityId", item.opportunityId)
        )
        .first();

      results.push({
        savedId: item._id,
        savedAt: item.savedAt,
        notes: item.notes,
        opportunity: toCanonicalOpportunity(opDoc),
        matchScore: matchDoc?.matchScore,
        matchReasons: matchDoc?.matchReasons,
      });
    }

    // Sort by savedAt descending
    results.sort((a, b) => b.savedAt - a.savedAt);
    return results;
  },
});

/**
 * Save an opportunity for a user
 */
export const save = mutation({
  args: {
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("savedOpportunities")
      .withIndex("by_user_opportunity", (q) =>
        q.eq("userId", args.userId).eq("opportunityId", args.opportunityId)
      )
      .first();

    const now = Date.now();

    let savedId;
    if (existing) {
      if (args.notes !== undefined) {
        await ctx.db.patch(existing._id, { notes: args.notes });
      }
      savedId = existing._id;
    } else {
      savedId = await ctx.db.insert("savedOpportunities", {
        userId: args.userId,
        opportunityId: args.opportunityId,
        savedAt: now,
        notes: args.notes,
      });
    }

    // Also ensure an application record in 'saved' status exists for tracker sync
    const existingApp = await ctx.db
      .query("applications")
      .withIndex("by_user_opportunity", (q) =>
        q.eq("userId", args.userId).eq("opportunityId", args.opportunityId)
      )
      .first();

    if (!existingApp) {
      await ctx.db.insert("applications", {
        userId: args.userId,
        opportunityId: args.opportunityId,
        status: "saved",
        notes: args.notes,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, savedId };
  },
});

/**
 * Remove an opportunity from saved
 */
export const unsave = mutation({
  args: {
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("savedOpportunities")
      .withIndex("by_user_opportunity", (q) =>
        q.eq("userId", args.userId).eq("opportunityId", args.opportunityId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { success: true };
  },
});

/**
 * Check if an opportunity is saved by a user
 */
export const isSaved = query({
  args: {
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("savedOpportunities")
      .withIndex("by_user_opportunity", (q) =>
        q.eq("userId", args.userId).eq("opportunityId", args.opportunityId)
      )
      .first();

    return {
      isSaved: !!existing,
      savedId: existing?._id,
      notes: existing?.notes,
    };
  },
});
