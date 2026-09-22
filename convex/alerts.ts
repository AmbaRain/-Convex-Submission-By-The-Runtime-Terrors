import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Opportunity } from "./types";
import { toCanonicalOpportunity } from "./opportunities";

/**
 * List alerts for a user with opportunity details
 */
export const listByUser = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()), // "unread" | "read" | "dismissed"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let alerts;
    if (args.status && args.status !== "all") {
      alerts = await ctx.db
        .query("alerts")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", args.userId).eq("status", args.status!)
        )
        .collect();
    } else {
      alerts = await ctx.db
        .query("alerts")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
    }

    // Sort by createdAt descending
    alerts.sort((a, b) => b.createdAt - a.createdAt);

    const results: Array<{
      id: string;
      userId: string;
      opportunityId: string;
      title: string;
      message: string;
      matchScore: number;
      status: string;
      emailStatus: string;
      createdAt: number;
      opportunity: Opportunity | null;
    }> = [];

    const limit = args.limit ?? 50;
    for (const a of alerts.slice(0, limit)) {
      const opDoc = await ctx.db.get(a.opportunityId);
      results.push({
        id: a._id,
        userId: a.userId,
        opportunityId: a.opportunityId,
        title: a.title,
        message: a.message,
        matchScore: a.matchScore,
        status: a.status,
        emailStatus: a.emailStatus,
        createdAt: a.createdAt,
        opportunity: opDoc ? toCanonicalOpportunity(opDoc) : null,
      });
    }

    return results;
  },
});

/**
 * Get count of unread alerts for real-time notification badge
 */
export const getUnreadCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("alerts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "unread")
      )
      .collect();
    return unread.length;
  },
});

/**
 * Mark a single alert as read
 */
export const markAsRead = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { status: "read" });
    return { success: true };
  },
});

/**
 * Mark all unread alerts for a user as read
 */
export const markAllAsRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("alerts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "unread")
      )
      .collect();

    for (const a of unread) {
      await ctx.db.patch(a._id, { status: "read" });
    }

    return { success: true, count: unread.length };
  },
});

/**
 * Dismiss an alert
 */
export const dismiss = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { status: "dismissed" });
    return { success: true };
  },
});

/**
 * Create a new alert
 */
export const createAlert = mutation({
  args: {
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
    title: v.string(),
    message: v.string(),
    matchScore: v.number(),
    emailStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("alerts", {
      userId: args.userId,
      opportunityId: args.opportunityId,
      title: args.title,
      message: args.message,
      matchScore: args.matchScore,
      status: "unread",
      emailStatus: args.emailStatus ?? "pending",
      createdAt: Date.now(),
    });
    return id;
  },
});

/**
 * Update email notification dispatch status (for AgentMail integration)
 */
export const updateEmailStatus = mutation({
  args: {
    alertId: v.id("alerts"),
    emailStatus: v.string(), // "pending" | "sent" | "failed" | "skipped"
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { emailStatus: args.emailStatus });
    return { success: true };
  },
});
