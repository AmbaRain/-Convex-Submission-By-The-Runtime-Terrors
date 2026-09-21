import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { UserProfile } from "./types";

/**
 * Get user profile by user ID
 */
export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      skills: user.skills,
      interests: user.interests,
      experienceLevel: user.experienceLevel,
      location: user.location,
      remoteOnly: user.remoteOnly,
      bio: user.bio,
      targetRoles: user.targetRoles,
      alertSettings: user.alertSettings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
});

/**
 * Get user profile by email address
 */
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return null;
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      skills: user.skills,
      interests: user.interests,
      experienceLevel: user.experienceLevel,
      location: user.location,
      remoteOnly: user.remoteOnly,
      bio: user.bio,
      targetRoles: user.targetRoles,
      alertSettings: user.alertSettings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
});

/**
 * Create or update user profile
 */
export const upsertProfile = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    skills: v.array(v.string()),
    interests: v.array(v.string()),
    experienceLevel: v.string(),
    location: v.string(),
    remoteOnly: v.boolean(),
    bio: v.optional(v.string()),
    targetRoles: v.optional(v.array(v.string())),
    alertSettings: v.optional(
      v.object({
        minMatchScore: v.number(),
        emailAlertsEnabled: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    const defaultAlertSettings = args.alertSettings ?? {
      minMatchScore: 70,
      emailAlertsEnabled: true,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name,
        skills: args.skills,
        interests: args.interests,
        experienceLevel: args.experienceLevel,
        location: args.location,
        remoteOnly: args.remoteOnly,
        bio: args.bio ?? existing.bio,
        targetRoles: args.targetRoles ?? existing.targetRoles,
        alertSettings: args.alertSettings ?? existing.alertSettings,
        updatedAt: now,
      });
      return existing._id;
    } else {
      const newUserId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        skills: args.skills,
        interests: args.interests,
        experienceLevel: args.experienceLevel,
        location: args.location,
        remoteOnly: args.remoteOnly,
        bio: args.bio,
        targetRoles: args.targetRoles,
        alertSettings: defaultAlertSettings,
        createdAt: now,
        updatedAt: now,
      });
      return newUserId;
    }
  },
});

/**
 * Update user alert preferences
 */
export const updateAlertSettings = mutation({
  args: {
    userId: v.id("users"),
    minMatchScore: v.number(),
    emailAlertsEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      alertSettings: {
        minMatchScore: args.minMatchScore,
        emailAlertsEnabled: args.emailAlertsEnabled,
      },
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * List all users (useful for dev / admin / batch matching)
 */
export const listUsers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").take(args.limit ?? 50);
    return users.map((u) => ({
      id: u._id,
      email: u.email,
      name: u.name,
      skills: u.skills,
      interests: u.interests,
      experienceLevel: u.experienceLevel,
      location: u.location,
      remoteOnly: u.remoteOnly,
    }));
  },
});
