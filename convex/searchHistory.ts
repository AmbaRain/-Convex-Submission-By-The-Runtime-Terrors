import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Record a search performed by a user
 */
export const recordSearch = mutation({
  args: {
    userId: v.optional(v.id("users")),
    query: v.string(),
    category: v.optional(v.string()),
    resultCount: v.number(),
  },
  handler: async (ctx, args) => {
    if (!args.query.trim()) return null;

    const id = await ctx.db.insert("searchHistory", {
      userId: args.userId,
      query: args.query.trim(),
      category: args.category,
      resultCount: args.resultCount,
      timestamp: Date.now(),
    });
    return id;
  },
});

/**
 * Get recent search queries for a user or globally
 */
export const getRecentSearches = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    let searches;

    if (args.userId) {
      searches = await ctx.db
        .query("searchHistory")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
    } else {
      searches = await ctx.db.query("searchHistory").collect();
    }

    searches.sort((a, b) => b.timestamp - a.timestamp);
    return searches.slice(0, limit);
  },
});

/**
 * Clear search history for a user
 */
export const clearUserHistory = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("searchHistory")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    return { success: true, deleted: items.length };
  },
});
