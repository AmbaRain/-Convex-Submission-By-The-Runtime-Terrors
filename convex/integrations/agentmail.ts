import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * Send an email alert for a high-matching opportunity via AgentMail.
 * Protects secrets and isolates mail provider details.
 */
export const sendMatchAlertEmail = action({
  args: {
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
    alertId: v.optional(v.id("alerts")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getProfile, { userId: args.userId });
    if (!user) throw new Error("User not found");

    const op = await ctx.runQuery(api.opportunities.getById, { id: args.opportunityId });
    if (!op) throw new Error("Opportunity not found");

    const match = await ctx.runQuery(api.matches.getMatchForOpportunity, {
      userId: args.userId,
      opportunityId: args.opportunityId,
    });

    const apiKey = process.env.AGENTMAIL_API_KEY;
    const inboxId = process.env.AGENTMAIL_INBOX_ID || "opportunity-radar";

    const subject = `Opportunity Radar Alert: ${op.title} (${match?.matchScore ?? 90}% Match)`;
    const reasonsList = (match?.matchReasons || ["Matches your saved preferences"])
      .map((r: string) => `• ${r}`)
      .join("\n");

    const textBody = `Hi ${user.name || "there"},\n\n` +
      `We discovered an opportunity that strongly matches your profile:\n\n` +
      `📌 ${op.title} at ${op.organization}\n` +
      `Category: ${op.category.toUpperCase()}\n` +
      `Location: ${op.location}\n` +
      `Deadline: ${op.deadline ? new Date(op.deadline).toLocaleDateString() : "Rolling / None"}\n` +
      `URL: ${op.url}\n\n` +
      `Why it matched:\n${reasonsList}\n\n` +
      `Best,\nOpportunity Radar Team`;

    let success = false;
    let messageId = `mock-${Date.now()}`;

    if (apiKey) {
      try {
        const response = await fetch(`https://api.agentmail.dev/v1/inboxes/${inboxId}/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            to: user.email,
            subject,
            text: textBody,
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          messageId = resData.id || messageId;
          success = true;
        } else {
          console.warn("AgentMail API returned error:", response.status, response.statusText);
        }
      } catch (err: any) {
        console.warn("AgentMail send failed:", err.message);
      }
    } else {
      // Clean local development simulation
      console.log(`[AgentMail Simulation] Sending alert email to ${user.email} for "${op.title}"`);
      success = true;
    }

    if (args.alertId) {
      await ctx.runMutation(api.alerts.updateEmailStatus, {
        alertId: args.alertId,
        emailStatus: success ? "sent" : "failed",
      });
    }

    return {
      success,
      recipient: user.email,
      opportunityTitle: op.title,
      messageId,
    };
  },
});

/**
 * Send a digest email summarizing top matches for a user
 */
export const sendOpportunityDigest = action({
  args: {
    userId: v.id("users"),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getProfile, { userId: args.userId });
    if (!user) throw new Error("User not found");

    const matches = await ctx.runQuery(api.matches.getMatchesForUser, {
      userId: args.userId,
      minScore: args.minScore ?? 70,
      limit: 5,
    });

    if (matches.length === 0) {
      return { success: true, message: "No top matches to send" };
    }

    const apiKey = process.env.AGENTMAIL_API_KEY;
    const inboxId = process.env.AGENTMAIL_INBOX_ID || "opportunity-radar";

    const digestLines = matches.map(
      (m: any, idx: number) =>
        `${idx + 1}. [${m.match.matchScore}%] ${m.opportunity.title} (${m.opportunity.organization})\n   ${m.opportunity.url}`
    );

    const subject = `Opportunity Radar: Your Top ${matches.length} Opportunity Matches`;
    const textBody = `Hi ${user.name || "there"},\n\n` +
      `Here are your top opportunity matches today based on your profile:\n\n` +
      digestLines.join("\n\n") +
      `\n\nLog in to Opportunity Radar to apply and track your applications!\n\n` +
      `Best,\nOpportunity Radar Team`;

    let success = false;
    let messageId = `digest-${Date.now()}`;

    if (apiKey) {
      try {
        const response = await fetch(`https://api.agentmail.dev/v1/inboxes/${inboxId}/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            to: user.email,
            subject,
            text: textBody,
          }),
        });
        if (response.ok) {
          const resData = await response.json();
          messageId = resData.id || messageId;
          success = true;
        }
      } catch (err: any) {
        console.warn("AgentMail digest error:", err.message);
      }
    } else {
      console.log(`[AgentMail Simulation] Sent digest email with ${matches.length} items to ${user.email}`);
      success = true;
    }

    return {
      success,
      recipient: user.email,
      matchCount: matches.length,
      messageId,
    };
  },
});
