import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.string(),
    skills: v.array(v.string()),
    interests: v.array(v.string()),
    experienceLevel: v.string(), // e.g. "entry", "mid", "senior", "student"
    location: v.string(),
    remoteOnly: v.boolean(),
    bio: v.optional(v.string()),
    targetRoles: v.optional(v.array(v.string())),
    alertSettings: v.optional(
      v.object({
        minMatchScore: v.number(), // e.g. 70
        emailAlertsEnabled: v.boolean(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  opportunities: defineTable({
    title: v.string(),
    organization: v.string(),
    description: v.string(),
    category: v.string(), // "hackathon" | "job" | "scholarship" | "grant" | "fellowship" | "other"
    deadline: v.union(v.string(), v.null()),
    eligibility: v.string(),
    location: v.string(),
    url: v.string(),
    source: v.string(), // "firecrawl" | "web" | "manual" | "partner"
    salary: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_url", ["url"])
    .index("by_category", ["category"])
    .index("by_created_at", ["createdAt"])
    .searchIndex("search_all", {
      searchField: "title",
      filterFields: ["category"],
    }),

  matches: defineTable({
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
    matchScore: v.number(), // 0 to 100
    matchReasons: v.array(v.string()),
    computedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_opportunity", ["userId", "opportunityId"])
    .index("by_user_score", ["userId", "matchScore"])
    .index("by_opportunity", ["opportunityId"]),

  savedOpportunities: defineTable({
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
    savedAt: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_opportunity", ["userId", "opportunityId"]),

  applications: defineTable({
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
    status: v.string(), // "saved" | "preparing" | "applied" | "interviewing" | "accepted" | "rejected"
    appliedDate: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    submissionUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_opportunity", ["userId", "opportunityId"]),

  alerts: defineTable({
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
    title: v.string(),
    message: v.string(),
    matchScore: v.number(),
    status: v.string(), // "unread" | "read" | "dismissed"
    emailStatus: v.string(), // "pending" | "sent" | "failed" | "skipped"
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_opportunity", ["userId", "opportunityId"]),

  searchHistory: defineTable({
    userId: v.optional(v.id("users")),
    query: v.string(),
    category: v.optional(v.string()),
    resultCount: v.number(),
    timestamp: v.number(),
  }).index("by_user", ["userId"]),
});
