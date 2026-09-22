import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { Opportunity } from "./types";
import { listSaved, isSaved } from "./savedOpportunities";
import { listByUser, getUnreadCount } from "./alerts";
import { sendMatchAlertEmail } from "./integrations/agentmail";
import { MATCHING_PROMPT_VERSION } from "../prompt";

/**
 * Send seven-day deadline reminder for saved opportunities
 * Runs daily via Convex scheduled function
 */
export const sendSevenDayDeadlineReminder = action({
  handler: async (ctx) => {
    // Get all users who have alert settings enabled
    const users = await ctx.db.query("users").collect();

    for (const userDoc of users) {
      const userId = userDoc._id;
      const alertSettings = userDoc.alertSettings;

      // Skip if email alerts are disabled
      if (!alertSettings?.emailAlertsEnabled) continue;

      const minMatchScore = alertSettings.minMatchScore ?? 70;

      // Get all saved opportunities with matches for this user
      const saved = await listSaved(ctx, { userId });

      for (const savedItem of saved) {
        const opDoc = await ctx.db.get(savedItem.opportunityId);
        if (!opDoc) continue;

        const matchDoc = await ctx.db
          .query("matches")
          .withIndex("by_user_opportunity", (q) =>
            q.eq("userId", userId).eq("opportunityId", savedItem.opportunityId)
          )
          .first();

        if (!matchDoc) continue;

        const score = matchDoc.matchScore;
        // Skip if below minimum match score threshold
        if (score < minMatchScore) continue;

        const daysSinceSaved = Date.now() - savedItem.savedAt;
        // Seven-day reminder: send if saved approximately 7 days ago (within 1 day window)
        const isSevenDayWindow =
          daysSinceSaved >= 6 * 24 * 60 * 60 * 1000 &&
          daysSinceSaved < 8 * 24 * 60 * 60 * 1000;

        if (!isSevenDayWindow) continue;

        // Check if there's already an unread alert for this opportunity
        const existingAlert = await ctx.db
          .query("alerts")
          .withIndex("by_user_opportunity", (q) =>
            q.eq("userId", userId).eq("opportunityId", savedItem.opportunityId)
          )
          .first();

        // Skip if already has an active unread alert for this opp
        if (existingAlert && existingAlert.status === "unread") continue;

        // Check deadline is within reasonable range (not past, not too far)
        const deadline = opDoc.deadline;
        if (!deadline) continue;

        const deadlineDate = new Date(deadline);
        const now = new Date();
        const daysUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        // Skip if deadline already passed
        if (daysUntilDeadline <= 0) continue;

        // Skip if deadline is more than 7 days away
        if (daysUntilDeadline > 7) continue;

        const title = `7-Day Deadline Reminder: ${opDoc.title}`;
        const topReason = matchDoc.matchReasons?.[0] || "Strong alignment with your profile";

        const alert = await ctx.db.insert("alerts", {
          userId,
          opportunityId: savedItem.opportunityId,
          title,
          message: topReason,
          matchScore: score,
          status: "unread",
          emailStatus: "pending",
          createdAt: Date.now(),
        });

        // Send AgentMail notification
        await ctx.runMutation(api.integrations.sendMatchAlertEmail, {
          userId,
          opportunityId: savedItem.opportunityId,
          alertId: alert._id,
        });
      }
    }

    return { success: true, processed: users.length };
  },
});

/**
 * Send one-day deadline reminder for saved opportunities
 * Runs daily via Convex scheduled function
 */
export const sendOneDayDeadlineReminder = action({
  handler: async (ctx) => {
    // Get all users who have alert settings enabled
    const users = await ctx.db.query("users").collect();

    for (const userDoc of users) {
      const userId = userDoc._id;
      const alertSettings = userDoc.alertSettings;

      // Skip if email alerts are disabled
      if (!alertSettings?.emailAlertsEnabled) continue;

      const minMatchScore = alertSettings.minMatchScore ?? 70;

      // Get all saved opportunities with matches for this user
      const saved = await listSaved(ctx, { userId });

      for (const savedItem of saved) {
        const opDoc = await ctx.db.get(savedItem.opportunityId);
        if (!opDoc) continue;

        const matchDoc = await ctx.db
          .query("matches")
          .withIndex("by_user_opportunity", (q) =>
            q.eq("userId", userId).eq("opportunityId", savedItem.opportunityId)
          )
          .first();

        if (!matchDoc) continue;

        const score = matchDoc.matchScore;
        // Skip if below minimum match score threshold
        if (score < minMatchScore) continue;

        const daysSinceSaved = Date.now() - savedItem.savedAt;
        // One-day reminder: send if saved approximately 1 day ago (within 1 day window)
        const isOneDayWindow =
          daysSinceSaved >= 23 * 24 * 60 * 60 * 1000 &&
          daysSinceSaved < 25 * 24 * 60 * 60 * 1000;

        if (!isOneDayWindow) continue;

        // Check deadline is within reasonable range (not past, not too far)
        const deadline = opDoc.deadline;
        if (!deadline) continue;

        const deadlineDate = new Date(deadline);
        const now = new Date();
        const daysUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        // Skip if deadline already passed
        if (daysUntilDeadline <= 0) continue;

        // Skip if deadline is more than 1 day away
        if (daysUntilDeadline > 1) continue;

        // Skip if seven-day reminder already sent (check for existing unread alert)
        const existingAlert = await ctx.db
          .query("alerts")
          .withIndex("by_user_opportunity", (q) =>
            q.eq("userId", userId).eq("opportunityId", savedItem.opportunityId)
          )
          .first();

        // Skip if already has an active unread alert for this opp
        if (existingAlert && existingAlert.status === "unread") continue;

        const title = `1-Day Deadline Reminder: ${opDoc.title}`;
        const topReason = matchDoc.matchReasons?.[0] || "Strong alignment with your profile";

        const alert = await ctx.db.insert("alerts", {
          userId,
          opportunityId: savedItem.opportunityId,
          title,
          message: topReason,
          matchScore: score,
          status: "unread",
          emailStatus: "pending",
          createdAt: Date.now(),
        });

        // Send AgentMail notification
        await ctx.runMutation(api.integrations.sendMatchAlertEmail, {
          userId,
          opportunityId: savedItem.opportunityId,
          alertId: alert._id,
        });
      }
    }

    return { success: true, processed: users.length };
  },
});