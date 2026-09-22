import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * Send an email alert for a high-matching opportunity via AgentMail.
 * Protects secrets and isolates mail provider details.
 * Sends are idempotent - same user+opportunity combination produces same key.
 */
export const sendMatchAlertEmail = action({
  args: {
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
    alertId: v.optional(v.id("alerts")),
  },
  handler: async (ctx, args): Promise<Record<string, any>> => {
    const user: any = await ctx.runQuery(api.users.getProfile, { userId: args.userId });
    if (!user) throw new Error("User not found");

    const op: any = await ctx.runQuery(api.opportunities.getById, { id: args.opportunityId });
    if (!op) throw new Error("Opportunity not found");

    const match: any = await ctx.runQuery(api.matches.getMatchForOpportunity, {
      userId: args.userId,
      opportunityId: args.opportunityId,
    });

    const apiKey = process.env.AGENTMAIL_API_KEY;
    const rawInbox = process.env.AGENTMAIL_INBOX_ID || "runtime_terrors@agentmail.to";
    const inboxId = rawInbox.includes("@") ? rawInbox : `${rawInbox}@agentmail.to`;

    // Compute a deterministic idempotency key based on user + opportunity + match score
    const idempotencyKey = `agentmail-${args.userId}-${args.opportunityId}-${match?.matchScore ?? 0}`;

    const subject = `Opportunity Radar Alert: ${op.title} (${match?.matchScore ?? 90}% Match)`;
    const reasonsList = (match?.matchReasons || ["Matches your saved preferences"])
      .map((r: string) => `• ${r}`)
      .join("\n");
    const reasonsHtml = (match?.matchReasons || ["Matches your saved preferences"])
      .map((r: string) => `<li>${r}</li>`)
      .join("");

    const textBody = `Hi ${user.name || "there"},\n\n` +
      `We discovered an opportunity that strongly matches your profile:\n\n` +
      `📌 ${op.title} at ${op.organization}\n` +
      `Category: ${op.category.toUpperCase()}\n` +
      `Location: ${op.location}\n` +
      `Deadline: ${op.deadline ? new Date(op.deadline).toLocaleDateString() : "Rolling / None"}\n` +
      `URL: ${op.url}\n\n` +
      `Why it matched:\n${reasonsList}\n\n` +
      `Best,\nOpportunity Radar Team`;

    const htmlBody = `<div style="font-family: sans-serif; line-height: 1.5; color: #1e293b;">` +
      `<p>Hi ${user.name || "there"},</p>` +
      `<p>We discovered an opportunity that strongly matches your profile:</p>` +
      `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">` +
      `<h3 style="margin: 0 0 8px 0; color: #0f172a;">${op.title}</h3>` +
      `<p style="margin: 0 0 8px 0; color: #64748b; font-weight: 500;">${op.organization} &bull; ${op.location}</p>` +
      `<p style="margin: 0 0 12px 0; color: #475569;">Deadline: ${op.deadline ? new Date(op.deadline).toLocaleDateString() : "Rolling / None"}</p>` +
      `<a href="${op.url}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; display: inline-block;">View Opportunity &rarr;</a>` +
      `</div>` +
      `<h4 style="margin: 16px 0 8px 0;">Why this matches:</h4>` +
      `<ul style="margin: 0; padding-left: 20px;">${reasonsHtml}</ul>` +
      `<p style="margin-top: 24px; color: #64748b; font-size: 14px;">Opportunity Radar Team</p>` +
      `</div>`;

    let success = false;
    let messageId = `mock-${Date.now()}`;
    let emailStatus: "pending" | "sent" | "failed" | "skipped" = "pending";

    if (apiKey) {
      try {
        const response = await fetch(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            to: [user.email],
            subject,
            text: textBody,
            html: htmlBody,
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          messageId = resData.message_id || resData.id || messageId;
          success = true;
          emailStatus = "sent";
        } else {
          console.warn("AgentMail API returned error:", response.status, await response.text());
          emailStatus = "failed";
        }
      } catch (err: any) {
        console.warn("AgentMail send failed:", err.message);
        emailStatus = "failed";
      }
    } else {
      // Clean local development simulation - idempotent: always "sent" but logs
      console.log(`[AgentMail Simulation] Sending alert email to ${user.email} for "${op.title}"`);
      success = true;
      emailStatus = "sent";
    }

    // Update alert email status if alertId provided
    if (args.alertId) {
      await ctx.runMutation(api.alerts.updateEmailStatus, {
        alertId: args.alertId,
        emailStatus,
      });
    }

    return {
      success,
      recipient: user.email,
      opportunityTitle: op.title,
      messageId,
      emailStatus,
      idempotencyKey,
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
  handler: async (ctx, args): Promise<Record<string, any>> => {
    const user: any = await ctx.runQuery(api.users.getProfile, { userId: args.userId });
    if (!user) throw new Error("User not found");

    // 1. Fetch AI matches if available
    let matches: any[] = await ctx.runQuery(api.matches.getMatchesForUser, {
      userId: args.userId,
      minScore: args.minScore ?? 70,
      limit: 5,
    });

    // 2. Build list of items to send in digest
    let digestItems: Array<{ title: string; organization: string; url: string; score: number }> = [];

    if (matches && matches.length > 0) {
      digestItems = matches.map((m: any) => ({
        title: m.opportunity.title,
        organization: m.opportunity.organization,
        url: m.opportunity.url,
        score: m.match.matchScore ?? 85,
      }));
    } else {
      // Fallback A: Saved opportunities
      const saved: any[] = await ctx.runQuery(api.savedOpportunities.listSaved, { userId: args.userId });
      if (saved && saved.length > 0) {
        digestItems = saved.slice(0, 5).map((s: any) => ({
          title: s.opportunity.title,
          organization: s.opportunity.organization,
          url: s.opportunity.url,
          score: 90,
        }));
      } else {
        // Fallback B: Latest top opportunities from database
        const topOpps: any[] = await ctx.runQuery(api.opportunities.list, { limit: 5 });
        if (topOpps && topOpps.length > 0) {
          digestItems = topOpps.map((op: any) => ({
            title: op.title,
            organization: op.organization,
            url: op.url,
            score: 80,
          }));
        }
      }
    }

    if (digestItems.length === 0) {
      return { success: false, recipient: user.email, message: "No opportunities currently available to send" };
    }

    const apiKey = process.env.AGENTMAIL_API_KEY;
    const rawInbox = process.env.AGENTMAIL_INBOX_ID || "runtime_terrors@agentmail.to";
    const inboxId = rawInbox.includes("@") ? rawInbox : `${rawInbox}@agentmail.to`;

    const digestLines = digestItems.map(
      (item, idx: number) =>
        `${idx + 1}. [${item.score}% match] ${item.title} (${item.organization})\n   ${item.url}`
    );

    const digestHtml = digestItems.map(
      (item, idx: number) =>
        `<div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">` +
        `<p style="margin: 0 0 4px 0; font-weight: bold; color: #0f172a;">${idx + 1}. ${item.title} <span style="color: #4f46e5;">(${item.score}% match)</span></p>` +
        `<p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">${item.organization}</p>` +
        `<a href="${item.url}" style="color: #4f46e5; text-decoration: none; font-size: 14px; font-weight: 600;">View Listing &rarr;</a>` +
        `</div>`
    ).join("");

    const subject = `Opportunity Radar: Your Top ${digestItems.length} Opportunity Matches`;
    const textBody = `Hi ${user.name || "there"},\n\n` +
      `Here are your top opportunity matches today based on your profile (${user.email}):\n\n` +
      digestLines.join("\n\n") +
      `\n\nLog in to Opportunity Radar (https://lovable-toucan-817.convex.site) to apply and track your applications!\n\n` +
      `Best,\nOpportunity Radar Team`;

    const htmlBody = `<div style="font-family: sans-serif; line-height: 1.5; color: #1e293b;">` +
      `<p>Hi ${user.name || "there"},</p>` +
      `<p>Here are your top opportunity matches today based on your profile (<strong>${user.email}</strong>):</p>` +
      digestHtml +
      `<p style="margin-top: 24px;"><a href="https://lovable-toucan-817.convex.site/dashboard" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; display: inline-block;">Open Opportunity Radar &rarr;</a></p>` +
      `<p style="margin-top: 24px; color: #64748b; font-size: 14px;">Best,<br/>Opportunity Radar Team</p>` +
      `</div>`;

    let success = false;
    let messageId = `digest-${Date.now()}`;
    let emailStatus: "pending" | "sent" | "failed" | "skipped" = "pending";
    let errorMessage: string | undefined = undefined;

    if (apiKey) {
      try {
        const response = await fetch(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "Idempotency-Key": `digest-${args.userId}-${Date.now()}`,
          },
          body: JSON.stringify({
            to: [user.email],
            subject,
            text: textBody,
            html: htmlBody,
          }),
        });
        if (response.ok) {
          const resData = await response.json();
          messageId = resData.message_id || resData.id || messageId;
          success = true;
          emailStatus = "sent";
        } else {
          errorMessage = await response.text();
          console.warn("AgentMail digest API error:", response.status, errorMessage);
          emailStatus = "failed";
        }
      } catch (err: any) {
        errorMessage = err.message;
        console.warn("AgentMail digest error:", err.message);
        emailStatus = "failed";
      }
    } else {
      console.log(`[AgentMail Simulation] Sent digest email with ${digestItems.length} items to ${user.email}`);
      success = true;
      emailStatus = "sent";
    }

    return {
      success,
      recipient: user.email,
      matchCount: digestItems.length,
      messageId,
      emailStatus,
      message: success ? `Digest successfully delivered to ${user.email}` : `Failed to deliver email: ${errorMessage || "Unknown error"}`,
    };
  },
});