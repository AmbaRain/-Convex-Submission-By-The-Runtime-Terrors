import type { NotificationRequest, MatchResult } from "../types"

export function renderNewMatchAlert(
  request: NotificationRequest,
  matchResult: MatchResult,
): {
  plain: string
  html: string
} {
  const { opportunity_title, score, tier, summary, positive_reasons } = matchResult
  const tierDisplay =
    tier === "strong"
      ? "Strong"
      : tier === "good"
        ? "Good"
        : tier === "possible"
          ? "Possible"
          : "Low"

  const plain = `
New Opportunity Match Alert

Hello,

You have a new match for: ${opportunity_title}

Match Score: ${score}/100 (${tierDisplay})
${summary}

Positive reasons:
${positive_reasons.map((r: string) => `- ${r}`).join("\n")}

View this opportunity in your dashboard.

--
This is an automated notification from Opportunity Radar.
If you no longer wish to receive these alerts, please update your notification preferences.
  `

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>New Opportunity Match Alert</h2>
  
  <p>Hello,</p>
  
  <p>You have a new match for: <strong>${opportunity_title}</strong></p>
  
  <p><strong>Match Score:</strong> ${score}/100 (${tierDisplay})</p>
  
  <p>${summary}</p>
  
  <h3>Positive reasons:</h3>
  <ul>
    ${positive_reasons.map(
      (r: string) => `<li style="margin-bottom: 4px;">${r}</li>`,
    ).join("")}
  </ul>
  
  <p>View this opportunity in your dashboard.</p>
  
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
  
  <p style="font-size: 12px; color: #666;">
    This is an automated notification from Opportunity Radar.<br />
    If you no longer wish to receive these alerts, please update your notification preferences.
  </p>
</div>
`

  return { plain, html }
}

export function renderSevenDayDeadlineAlert(
  request: NotificationRequest,
  matchResult: MatchResult,
  daysRemaining: number = 7,
): {
  plain: string
  html: string
} {
  const { opportunity_title, summary } = matchResult
  const deadline = (matchResult as any).deadline || new Date(Date.now() + 7 * 86400000).toISOString()

  const plain = `
Seven-Day Deadline Alert

Hello,

The opportunity "${opportunity_title}" has a deadline in approximately 7 days.

${summary}

Deadline: ${new Date(
    deadline,
  ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}

If you're interested, please review the opportunity soon.

--
This is an automated notification from Opportunity Radar.
  `

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Seven-Day Deadline Alert</h2>
  
  <p>Hello,</p>
  
  <p>The opportunity "<strong>${opportunity_title}</strong>" has a deadline in approximately <strong>7 days</strong>.</p>
  
  <p>${summary}</p>
  
  <p><strong>Deadline:</strong> ${new Date(
    deadline,
  ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
  
  <p>If you're interested, please review the opportunity soon.</p>
  
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
  
  <p style="font-size: 12px; color: #666;">
    This is an automated notification from Opportunity Radar.
  </p>
</div>
`

  return { plain, html }
}

export function renderOneDayDeadlineAlert(
  request: NotificationRequest,
  matchResult: MatchResult,
  daysRemaining: number = 1,
): {
  plain: string
  html: string
} {
  const { opportunity_title, summary } = matchResult
  const deadline = (matchResult as any).deadline || new Date().toISOString()

  const dateStr = new Date(deadline).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  })

  const plain = `
One-Day Deadline Alert

Hello,

This is a reminder that the opportunity "${opportunity_title}" has a deadline today: ${dateStr}.

${summary}

Please review the opportunity and take action if interested.

--
This is an automated notification from Opportunity Radar.
  `

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>One-Day Deadline Alert</h2>
  
  <p>Hello,</p>
  
  <p>This is a reminder that the opportunity "<strong>${opportunity_title}</strong>" has a deadline <strong>today</strong>: <span style="color: #d32f2f;">${dateStr}</span>.</p>
  
  <p>${summary}</p>
  
  <p>Please review the opportunity and take action if interested.</p>
  
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
  
  <p style="font-size: 12px; color: #666;">
    This is an automated notification from Opportunity Radar.
  </p>
</div>
`

  return { plain, html }
}