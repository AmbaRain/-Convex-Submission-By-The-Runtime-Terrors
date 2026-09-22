# Dev 3 Integration Contract

**Role:** OpenAI matching and AgentMail notifications
**Owner:** Dev 3
**Scope:** Opportunity Radar hackathon — greenfield scaffold

---

## 1. Dev 3 Responsibilities

- **OpenAI profile-to-opportunity matching:** Given a user profile, invoke OpenAI to compute match scores against available opportunities.
- **Match scores and match explanations:** Produce a numeric score (0–100) and a human-readable explanation of why the user matches each opportunity.
- **Eligibility uncertainty and missing requirements:** Identify which requirements the user satisfies, which are missing, and which are uncertain due to insufficient profile data.
- **AgentMail notifications:** Trigger AgentMail in-app or email notifications when new matching opportunities arise or eligibility changes.
- **New-opportunity alerts:** When a new opportunity is extracted (by Dev 2) and matched against all active profiles, generate alerts for eligible users.
- **Deadline reminders:** Monitor opportunity deadlines and send reminder notifications as deadlines approach (e.g., 7 days, 3 days, 1 day).

---

## 2. Inputs Required from Dev 1

| Category | Fields / Convention |
|---|---|
| **User/profile fields** | `id`, `email`, `name`, `skills` (array), `location`, `experience_level`, `education`, `certifications`, `status` (active/archived) |
| **Opportunity fields** | `id`, `title`, `description`, `requirements` (array of objects with `type`, `description`, `min_level`), `deadline` (ISO timestamp), `category`, `source_url`, `created_at` |
| **Saved-opportunity fields** | `user_id`, `opportunity_id`, `match_score`, `match_tier`, `matched_at`, `status` (saved/ignored/dismissed) |
| **Alert-preference fields** | `user_id`, `new_opportunity_alerts`, `deadline_reminders`, `eligibility_change_alerts`, `notification_channel` (email/in-app/both) |
| **Authentication identity** | Convex `auth()` context, JWT subject (`sub`), verified email address |
| **Convex function conventions** | All OpenAI and AgentMail side effects must be wrapped in `convex actions` (server-side only). No raw HTTP from client components. Use `stable` mutations for consistency. |

---

## 3. Inputs Required from Dev 2

| Category | Fields / Convention |
|---|---|
| **Normalized opportunity payload** | JSON output from Firecrawl extraction, normalized to the Opportunity fields above |
| **Required and optional fields** | Distinguish between `requirements[].required: true/false` and `requirements[].level` (junior/mid/senior) |
| **Deadline format** | ISO 8601 timestamp (`YYYY-MM-DDTHH:mm:ssZ`) in UTC; also store human-readable relative form (`"in 3 weeks"`) for display |
| **Source URL and extraction timestamp** | `source_url` (original Firecrawl URL), `extracted_at` (when Firecrawl fetched the page) |
| **Category and eligibility representation** | `category` (string enum: `"job"`, `"grant"`, `"fellowship"`, `"competition"`), `eligibility_rules` (array of rule objects from Firecrawl) |

---

## 4. Outputs Provided to Dev 4

| Output | Description |
|---|---|
| **Match score** | Number 0–100 representing overall fit |
| **Match tier** | Categorization: `"perfect"`, `"strong"`, `"moderate"`, `"reach"` (based on score bands) |
| **Summary** | 2–3 sentence overview of the match |
| **Positive reasons** | Array of strings — why the user qualifies (extracted from OpenAI explanation) |
| **Missing or uncertain requirements** | Array of `MatchGap` objects (see Section 5) |
| **Eligibility label** | `"eligible"`, `"ineligible"`, `"uncertain"` |
| **Deadline information** | `{ deadline: ISOString, days_remaining: number, formatted: string }` |
| **Notification status** | `{ sent: boolean, kind: "email" | "in-app", triggered_at: ISOString }` |

---

## 5. Proposed TypeScript Interfaces

```typescript
// Input: profile sent from client or fetched from Convex user table
interface UserProfileInput {
  id: string;
  email: string;
  name: string | null;
  skills: string[];
  location: string | null;
  experience_level: "junior" | "mid" | "senior" | null;
  education: string | null;
  certifications: string[];
  status: "active" | "archived";
}

// Input: opportunity data as normalized by Dev 2
interface OpportunityInput {
  id: string;
  title: string;
  description: string;
  requirements: RequirementInput[];
  deadline: string; // ISO 8601 UTC
  category: "job" | "grant" | "fellowship" | "competition";
  source_url: string;
  extracted_at: string; // ISO 8601
}

interface RequirementInput {
  type: string;
  description: string;
  min_level?: "junior" | "mid" | "senior";
  required: boolean;
}

// Output: one match against one opportunity
interface MatchReason {
  requirement_id: string;
  requirement_type: string;
  met: boolean;
  explanation?: string;
}

interface MatchGap {
  requirement_id: string;
  requirement_type: string;
  missing: boolean;
  uncertain: boolean;
  reason: string;
}

// Output: full match result
interface MatchResult {
  opportunity_id: string;
  opportunity_title: string;
  score: number; // 0–100
  tier: "perfect" | "strong" | "moderate" | "reach";
  summary: string;
  positive_reasons: string[];
  missing_requirements: MatchGap[];
  uncertain_requirements: MatchGap[];
  eligibility: "eligible" | "ineligible" | "uncertain";
  deadline_info: {
    deadline: string;
    days_remaining: number;
    formatted: string;
  };
}

// Input: request to send a notification
interface NotificationRequest {
  user_id: string;
  opportunity_id: string;
  match_result: MatchResult;
  kind: "new-match" | "deadline-reminder" | "eligibility-change";
}

// Output: confirmation of notification delivery
interface NotificationStatus {
  id: string;
  user_id: string;
  opportunity_id: string | null;
  kind: "email" | "in-app";
  sent: boolean;
  triggered_at: string; // ISO 8601
  delivered_at: string | null;
  error?: string;
}
```

---

## 6. Proposed Server-Side Boundaries

- **OpenAI must only be called from a server-side Convex action.**  
  Client components never directly call `openai.chat completions`. All OpenAI invocations go through a Convex mutation that takes a `UserProfileInput` and returns a `MatchResult`.

- **AgentMail must only be called from a server-side Convex action.**  
  AgentMail API keys and inbox IDs are never exposed to the browser. Notifications are triggered via Convex actions that call the AgentMail SDK.

- **Browser code must never receive API keys.**  
  `OPENAI_API_KEY`, `AGENTMAIL_API_KEY`, and `AGENTMAIL_INBOX_ID` are stored in Convex environment variables, not in `.env.client` or client-side code.

- **External side effects must not run inside database transactions.**  
  Convex mutations that call OpenAI or AgentMail must be designed so that the database write and the external API call are separate steps, or use Convex's built-in `useMutation` retry logic. If the external call fails, the mutation should either retry or roll back the partial write, depending on idempotency guarantees.

---

## 7. Proposed Environment Variable Names

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key (Convex secret) |
| `OPENAI_MODEL` | Default model e.g. `gpt-4o-mini` |
| `AGENTMAIL_API_KEY` | AgentMail API key (Convex secret) |
| `AGENTMAIL_INBOX_ID` | Default inbox ID for notifications |
| `APP_BASE_URL` | Base URL of the app (e.g. `https://app.convex.dev`) |

---

## 8. Open Questions Requiring Team Confirmation

1. **Convex project bootstrapping:** Should Dev 3 initialize the Convex project (create `convex.yaml`, initial schema, and function skeleton), or will Dev 1 provide the initial schema and function conventions first?

2. **OpenAI model selection:** What OpenAI model should be used for matching? `gpt-4o-mini` for cost, `gpt-4o` for quality, or something else?

3. **Match tier boundaries:** What score bands map to `"perfect"`, `"strong"`, `"moderate"`, `"reach"`? E.g. 90–100 = perfect, 75–89 = strong, etc.

4. **AgentMail notification channel:** Should AgentMail send email, in-app notifications, or both? What is the default preference per user?

5. **Deadline reminder timing:** At what intervals should deadline reminders fire (e.g., 7 days, 3 days, 1 day before)? Should there be a configurable per-opportunity setting?

6. **Eligibility "uncertain" handling:** When profile data is incomplete, should OpenAI return `"uncertain"` or should the system default to `"ineligible"`? Who decides the threshold?

7. **Firecrawl-to-Opportunity field mapping:** Are there any Firecrawl-specific fields that should be preserved or mapped differently into the `OpportunityInput` schema?

8. **Browser vs. server match triggering:** Should the initial match computation be triggered by a Convex action on profile update, or by a periodic CRON job that re-matches all active profiles against new opportunities?

---