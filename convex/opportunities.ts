import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { Opportunity } from "./types";

/**
 * Maps database document to the canonical Opportunity contract
 */
export function toCanonicalOpportunity(doc: Doc<"opportunities">): Opportunity {
  return {
    id: doc._id,
    title: doc.title,
    organization: doc.organization,
    description: doc.description,
    category: doc.category,
    deadline: doc.deadline,
    eligibility: doc.eligibility,
    location: doc.location,
    url: doc.url,
    source: doc.source,
    salary: doc.salary,
    tags: doc.tags,
    createdAt: doc.createdAt,
  };
}

/**
 * List opportunities with optional category filtering
 */
export const list = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q;
    if (args.category && args.category !== "all") {
      q = ctx.db
        .query("opportunities")
        .withIndex("by_category", (idx) => idx.eq("category", args.category!));
    } else {
      q = ctx.db
        .query("opportunities")
        .withIndex("by_created_at")
        .order("desc");
    }

    const docs = await q.take(args.limit ?? 100);
    return docs.map(toCanonicalOpportunity);
  },
});

/**
 * Get opportunity by ID
 */
export const getById = query({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    return toCanonicalOpportunity(doc);
  },
});

/**
 * Search opportunities by text query, category, and location/remote
 */
export const search = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    remoteOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rawQuery = args.query.trim().toLowerCase();
    let results: Doc<"opportunities">[] = [];

    if (rawQuery.length > 0) {
      if (args.category && args.category !== "all") {
        results = await ctx.db
          .query("opportunities")
          .withSearchIndex("search_all", (q) =>
            q.search("title", rawQuery).eq("category", args.category!)
          )
          .take(args.limit ?? 50);
      } else {
        results = await ctx.db
          .query("opportunities")
          .withSearchIndex("search_all", (q) => q.search("title", rawQuery))
          .take(args.limit ?? 50);
      }
    } else {
      if (args.category && args.category !== "all") {
        results = await ctx.db
          .query("opportunities")
          .withIndex("by_category", (idx) => idx.eq("category", args.category!))
          .take(args.limit ?? 50);
      } else {
        results = await ctx.db
          .query("opportunities")
          .withIndex("by_created_at")
          .order("desc")
          .take(args.limit ?? 50);
      }
    }

    // Secondary filter for remote/location if requested
    if (args.remoteOnly) {
      results = results.filter(
        (op) =>
          op.location.toLowerCase().includes("remote") ||
          (op.tags && op.tags.some((t) => t.toLowerCase().includes("remote")))
      );
    }

    return results.map(toCanonicalOpportunity);
  },
});

/**
 * Ingest or create a single opportunity with URL deduplication
 */
export const create = mutation({
  args: {
    title: v.string(),
    organization: v.string(),
    description: v.string(),
    category: v.string(),
    deadline: v.union(v.string(), v.null()),
    eligibility: v.string(),
    location: v.string(),
    url: v.string(),
    source: v.string(),
    salary: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("opportunities")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        organization: args.organization,
        description: args.description,
        category: args.category,
        deadline: args.deadline,
        eligibility: args.eligibility,
        location: args.location,
        salary: args.salary ?? existing.salary,
        tags: args.tags ?? existing.tags,
        updatedAt: now,
      });
      return { id: existing._id, isNew: false };
    }

    const id = await ctx.db.insert("opportunities", {
      title: args.title,
      organization: args.organization,
      description: args.description,
      category: args.category,
      deadline: args.deadline,
      eligibility: args.eligibility,
      location: args.location,
      url: args.url,
      source: args.source,
      salary: args.salary,
      tags: args.tags,
      createdAt: now,
      updatedAt: now,
    });

    return { id, isNew: true };
  },
});

/**
 * Batch ingest opportunities (e.g. from Firecrawl web scraper)
 * Deduplicates automatically on URL.
 */
export const ingestBatch = mutation({
  args: {
    opportunities: v.array(
      v.object({
        title: v.string(),
        organization: v.string(),
        description: v.string(),
        category: v.string(),
        deadline: v.union(v.string(), v.null()),
        eligibility: v.string(),
        location: v.string(),
        url: v.string(),
        source: v.string(),
        salary: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let ingestedCount = 0;
    let duplicateCount = 0;
    const insertedIds: Id<"opportunities">[] = [];

    for (const op of args.opportunities) {
      const existing = await ctx.db
        .query("opportunities")
        .withIndex("by_url", (q) => q.eq("url", op.url))
        .first();

      if (existing) {
        duplicateCount++;
        insertedIds.push(existing._id);
      } else {
        const id = await ctx.db.insert("opportunities", {
          title: op.title,
          organization: op.organization,
          description: op.description,
          category: op.category,
          deadline: op.deadline,
          eligibility: op.eligibility,
          location: op.location,
          url: op.url,
          source: op.source,
          salary: op.salary,
          tags: op.tags,
          createdAt: now,
          updatedAt: now,
        });
        insertedIds.push(id);
        ingestedCount++;
      }
    }

    return {
      success: true,
      ingestedCount,
      duplicateCount,
      total: args.opportunities.length,
      ids: insertedIds,
    };
  },
});

/**
 * Get distinct categories and opportunity count
 */
export const getCategories = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("opportunities").collect();
    const counts: Record<string, number> = {};
    for (const doc of all) {
      counts[doc.category] = (counts[doc.category] || 0) + 1;
    }
    return Object.entries(counts).map(([category, count]) => ({
      category,
      count,
    }));
  },
});
