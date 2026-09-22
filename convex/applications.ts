import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ApplicationStatus, Opportunity } from "./types";
import { toCanonicalOpportunity } from "./opportunities";

/**
 * List applications for a user, optionally filtered by status
 */
export const listByUser = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let applications;
    if (args.status && args.status !== "all") {
      applications = await ctx.db
        .query("applications")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", args.userId).eq("status", args.status!)
        )
        .collect();
    } else {
      applications = await ctx.db
        .query("applications")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
    }

    const results: Array<{
      id: string;
      userId: string;
      opportunityId: string;
      status: ApplicationStatus;
      appliedDate?: string;
      followUpDate?: string;
      notes?: string;
      submissionUrl?: string;
      createdAt: number;
      updatedAt: number;
      opportunity: Opportunity;
    }> = [];

    for (const app of applications) {
      const opDoc = await ctx.db.get(app.opportunityId);
      if (!opDoc) continue;

      results.push({
        id: app._id,
        userId: app.userId,
        opportunityId: app.opportunityId,
        status: app.status as ApplicationStatus,
        appliedDate: app.appliedDate,
        followUpDate: app.followUpDate,
        notes: app.notes,
        submissionUrl: app.submissionUrl,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        opportunity: toCanonicalOpportunity(opDoc),
      });
    }

    // Sort by updatedAt descending
    results.sort((a, b) => b.updatedAt - a.updatedAt);
    return results;
  },
});

/**
 * Get application details for a specific opportunity
 */
export const getByOpportunity = query({
  args: {
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db
      .query("applications")
      .withIndex("by_user_opportunity", (q) =>
        q.eq("userId", args.userId).eq("opportunityId", args.opportunityId)
      )
      .first();

    if (!app) return null;
    return {
      id: app._id,
      userId: app.userId,
      opportunityId: app.opportunityId,
      status: app.status as ApplicationStatus,
      appliedDate: app.appliedDate,
      followUpDate: app.followUpDate,
      notes: app.notes,
      submissionUrl: app.submissionUrl,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  },
});

/**
 * Update or create an application entry (stage, dates, notes)
 */
export const updateStatus = mutation({
  args: {
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
    status: v.string(), // "saved" | "preparing" | "applied" | "interviewing" | "accepted" | "rejected"
    appliedDate: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    submissionUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("applications")
      .withIndex("by_user_opportunity", (q) =>
        q.eq("userId", args.userId).eq("opportunityId", args.opportunityId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        appliedDate: args.appliedDate ?? existing.appliedDate,
        followUpDate: args.followUpDate ?? existing.followUpDate,
        notes: args.notes ?? existing.notes,
        submissionUrl: args.submissionUrl ?? existing.submissionUrl,
        updatedAt: now,
      });
      return { id: existing._id, isNew: false };
    }

    const id = await ctx.db.insert("applications", {
      userId: args.userId,
      opportunityId: args.opportunityId,
      status: args.status,
      appliedDate: args.appliedDate,
      followUpDate: args.followUpDate,
      notes: args.notes,
      submissionUrl: args.submissionUrl,
      createdAt: now,
      updatedAt: now,
    });

    return { id, isNew: true };
  },
});

/**
 * Quick update for application notes
 */
export const updateNotes = mutation({
  args: {
    id: v.id("applications"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      notes: args.notes,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Delete an application tracking entry
 */
export const remove = mutation({
  args: { id: v.id("applications") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Get aggregated application stats for user dashboard
 */
export const getStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const apps = await ctx.db
      .query("applications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const counts: Record<string, number> = {
      saved: 0,
      preparing: 0,
      applied: 0,
      interviewing: 0,
      accepted: 0,
      rejected: 0,
    };

    for (const app of apps) {
      counts[app.status] = (counts[app.status] || 0) + 1;
    }

    return {
      total: apps.length,
      ...counts,
    };
  },
});
