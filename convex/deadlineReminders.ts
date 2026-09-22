import { action, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const getCandidatesForSevenDayReminder = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const results: Array<{
      userId: Id<"users">;
      opportunityId: Id<"opportunities">;
      title: string;
      message: string;
      matchScore: number;
    }> = [];

    for (const userDoc of users) {
      const alertSettings = userDoc.alertSettings;
      if (!alertSettings?.emailAlertsEnabled) continue;

      const minMatchScore = alertSettings.minMatchScore ?? 70;

      const saved = await ctx.db
        .query("savedOpportunities")
        .withIndex("by_user", (q: any) => q.eq("userId", userDoc._id))
        .collect();

      for (const savedItem of saved) {
        const opDoc = await ctx.db.get(savedItem.opportunityId);
        if (!opDoc || !opDoc.deadline) continue;

        const matchDoc = await ctx.db
          .query("matches")
          .withIndex("by_user_opportunity", (q: any) =>
            q.eq("userId", userDoc._id).eq("opportunityId", savedItem.opportunityId)
          )
          .first();

        if (!matchDoc || matchDoc.matchScore < minMatchScore) continue;

        const deadlineDate = new Date(opDoc.deadline).getTime();
        const now = Date.now();
        const daysUntilDeadline = (deadlineDate - now) / (1000 * 60 * 60 * 24);

        if (daysUntilDeadline <= 0 || daysUntilDeadline > 7) continue;

        const existingAlert = await ctx.db
          .query("alerts")
          .withIndex("by_user_opportunity", (q: any) =>
            q.eq("userId", userDoc._id).eq("opportunityId", savedItem.opportunityId)
          )
          .first();

        if (existingAlert && existingAlert.status === "unread") continue;

        results.push({
          userId: userDoc._id,
          opportunityId: savedItem.opportunityId,
          title: `7-Day Deadline Reminder: ${opDoc.title}`,
          message: matchDoc.matchReasons?.[0] || "Strong alignment with your profile",
          matchScore: matchDoc.matchScore,
        });
      }
    }

    return results;
  },
});

export const getCandidatesForOneDayReminder = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const results: Array<{
      userId: Id<"users">;
      opportunityId: Id<"opportunities">;
      title: string;
      message: string;
      matchScore: number;
    }> = [];

    for (const userDoc of users) {
      const alertSettings = userDoc.alertSettings;
      if (!alertSettings?.emailAlertsEnabled) continue;

      const minMatchScore = alertSettings.minMatchScore ?? 70;

      const saved = await ctx.db
        .query("savedOpportunities")
        .withIndex("by_user", (q: any) => q.eq("userId", userDoc._id))
        .collect();

      for (const savedItem of saved) {
        const opDoc = await ctx.db.get(savedItem.opportunityId);
        if (!opDoc || !opDoc.deadline) continue;

        const matchDoc = await ctx.db
          .query("matches")
          .withIndex("by_user_opportunity", (q: any) =>
            q.eq("userId", userDoc._id).eq("opportunityId", savedItem.opportunityId)
          )
          .first();

        if (!matchDoc || matchDoc.matchScore < minMatchScore) continue;

        const deadlineDate = new Date(opDoc.deadline).getTime();
        const now = Date.now();
        const daysUntilDeadline = (deadlineDate - now) / (1000 * 60 * 60 * 24);

        if (daysUntilDeadline <= 0 || daysUntilDeadline > 1) continue;

        const existingAlert = await ctx.db
          .query("alerts")
          .withIndex("by_user_opportunity", (q: any) =>
            q.eq("userId", userDoc._id).eq("opportunityId", savedItem.opportunityId)
          )
          .first();

        if (existingAlert && existingAlert.status === "unread") continue;

        results.push({
          userId: userDoc._id,
          opportunityId: savedItem.opportunityId,
          title: `1-Day Deadline Reminder: ${opDoc.title}`,
          message: matchDoc.matchReasons?.[0] || "Strong alignment with your profile",
          matchScore: matchDoc.matchScore,
        });
      }
    }

    return results;
  },
});

/**
 * Send seven-day deadline reminder for saved opportunities
 * Runs daily via Convex scheduled function
 */
export const sendSevenDayDeadlineReminder = action({
  handler: async (ctx): Promise<{ success: boolean; processed: number }> => {
    const candidates: any[] = await ctx.runQuery(
      internal.deadlineReminders.getCandidatesForSevenDayReminder,
      {}
    );

    for (const item of candidates) {
      const alertId = await ctx.runMutation(api.alerts.createAlert, {
        userId: item.userId,
        opportunityId: item.opportunityId,
        title: item.title,
        message: item.message,
        matchScore: item.matchScore,
        emailStatus: "pending",
      });

      await ctx.runAction(api.integrations.agentmail.sendMatchAlertEmail, {
        userId: item.userId,
        opportunityId: item.opportunityId,
        alertId,
      });
    }

    return { success: true, processed: candidates.length };
  },
});

/**
 * Send one-day deadline reminder for saved opportunities
 * Runs daily via Convex scheduled function
 */
export const sendOneDayDeadlineReminder = action({
  handler: async (ctx): Promise<{ success: boolean; processed: number }> => {
    const candidates: any[] = await ctx.runQuery(
      internal.deadlineReminders.getCandidatesForOneDayReminder,
      {}
    );

    for (const item of candidates) {
      const alertId = await ctx.runMutation(api.alerts.createAlert, {
        userId: item.userId,
        opportunityId: item.opportunityId,
        title: item.title,
        message: item.message,
        matchScore: item.matchScore,
        emailStatus: "pending",
      });

      await ctx.runAction(api.integrations.agentmail.sendMatchAlertEmail, {
        userId: item.userId,
        opportunityId: item.opportunityId,
        alertId,
      });
    }

    return { success: true, processed: candidates.length };
  },
});