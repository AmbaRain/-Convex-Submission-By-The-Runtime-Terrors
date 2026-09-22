# Opportunity Radar — Convex Backend API & Contract Guide

Welcome to the backend reference guide for **Opportunity Radar** (Convex All Gas Hackathon).

The backend architecture:
```text
Frontend  ⇄  Convex  ⇄  Firecrawl
               ⇅
             OpenAI
               ⇅
            AgentMail
```

---

## 1. Canonical Shared Contracts (`convex/types.ts`)

### `Opportunity`
```typescript
export type Opportunity = {
  id: string; // Database ID
  title: string;
  organization: string;
  description: string;
  category: string; // "hackathon" | "job" | "scholarship" | "grant" | "fellowship" | "other"
  deadline: string | null; // ISO 8601 string or null
  eligibility: string;
  location: string;
  url: string;
  source: string; // "firecrawl" | "web" | "manual" | "partner"
  salary?: string;
  tags?: string[];
  createdAt?: number;
};
```

### `MatchResult`
```typescript
export type MatchResult = {
  opportunityId: string;
  matchScore: number; // 0 to 100
  matchReasons: string[]; // 2-4 human-readable bullet reasons
};
```

### `UserProfile`
```typescript
export type UserProfile = {
  id?: string;
  email: string;
  name?: string;
  skills: string[];
  interests: string[];
  experienceLevel: string; // "entry" | "mid" | "senior" | "student"
  location: string;
  remoteOnly: boolean;
  bio?: string;
  targetRoles?: string[];
  alertSettings?: {
    minMatchScore: number;
    emailAlertsEnabled: boolean;
  };
};
```

---

## 2. Public API Methods for Frontend Developers

### 👤 User Profile (`api.users`)
| Method | Type | Arguments | Returns | Description |
|---|---|---|---|---|
| `getProfile` | Query | `{ userId: Id<"users"> }` | `UserProfile \| null` | Fetch user profile |
| `getByEmail` | Query | `{ email: string }` | `UserProfile \| null` | Look up profile by email |
| `upsertProfile` | Mutation | `{ email, name?, skills, interests, experienceLevel, location, remoteOnly, bio?, targetRoles?, alertSettings? }` | `Id<"users">` | Create or update user profile |
| `updateAlertSettings` | Mutation | `{ userId, minMatchScore, emailAlertsEnabled }` | `{ success: true }` | Update user alert preferences |

### 🎯 Opportunities (`api.opportunities`)
| Method | Type | Arguments | Returns | Description |
|---|---|---|---|---|
| `list` | Query | `{ category?: string, limit?: number }` | `Opportunity[]` | List latest opportunities |
| `getById` | Query | `{ id: Id<"opportunities"> }` | `Opportunity \| null` | Get opportunity details |
| `search` | Query | `{ query: string, category?: string, remoteOnly?: boolean, limit?: number }` | `Opportunity[]` | Full-text & keyword search |
| `create` | Mutation | Canonical fields (`title`, `url`, etc.) | `{ id, isNew: boolean }` | Insert opportunity with URL deduplication |
| `getCategories` | Query | None | `Array<{ category: string, count: number }>` | Category breakdown counts |

### ⚡ AI Matching (`api.matches` & `api.integrations.openai`)
| Method | Type | Arguments | Returns | Description |
|---|---|---|---|---|
| `getMatchesForUser` | Query | `{ userId: Id<"users">, minScore?: number, category?: string, limit?: number }` | `Array<{ match: MatchResult, opportunity: Opportunity }>` | List matched opportunities sorted by score descending |
| `getMatchForOpportunity` | Query | `{ userId: Id<"users">, opportunityId: Id<"opportunities"> }` | `MatchResult \| null` | Specific match result |
| `integrations.openai.matchUserOpportunities` | Action | `{ userId: Id<"users">, opportunityIds?: Id<"opportunities">[], limit?: number }` | `MatchResult[]` | Run OpenAI matching on opportunities and save results |

### 📌 Saved Opportunities (`api.savedOpportunities`)
| Method | Type | Arguments | Returns | Description |
|---|---|---|---|---|
| `listSaved` | Query | `{ userId: Id<"users"> }` | `Array<{ savedId, opportunity, matchScore?, matchReasons? }>` | List user's saved opportunities |
| `save` | Mutation | `{ userId, opportunityId, notes? }` | `{ success: true, savedId }` | Bookmark opportunity |
| `unsave` | Mutation | `{ userId, opportunityId }` | `{ success: true }` | Remove bookmark |
| `isSaved` | Query | `{ userId, opportunityId }` | `{ isSaved: boolean, savedId? }` | Check if saved |

### 📋 Application Tracker (`api.applications`)
| Method | Type | Arguments | Returns | Description |
|---|---|---|---|---|
| `listByUser` | Query | `{ userId: Id<"users">, status?: string }` | `ApplicationItem[]` | Tracked opportunities in Kanban/table |
| `updateStatus` | Mutation | `{ userId, opportunityId, status, appliedDate?, followUpDate?, notes?, submissionUrl? }` | `{ id, isNew: boolean }` | Change status ("saved", "preparing", "applied", "interviewing", "accepted", "rejected") |
| `getStats` | Query | `{ userId: Id<"users"> }` | Counts by status | Summary stats for user dashboard |

### 🔔 Alerts & Notifications (`api.alerts` & `api.integrations.agentmail`)
| Method | Type | Arguments | Returns | Description |
|---|---|---|---|---|
| `listByUser` | Query | `{ userId: Id<"users">, status?: string, limit?: number }` | `Alert[]` | User alerts sorted by newest |
| `getUnreadCount` | Query | `{ userId: Id<"users"> }` | `number` | Count of unread alerts for badge |
| `markAsRead` | Mutation | `{ alertId: Id<"alerts"> }` | `{ success: true }` | Mark notification read |
| `markAllAsRead` | Mutation | `{ userId: Id<"users"> }` | `{ success: true, count }` | Mark all read |
| `integrations.agentmail.sendMatchAlertEmail` | Action | `{ userId, opportunityId, alertId? }` | `{ success, recipient }` | Send single email alert via AgentMail |
| `integrations.agentmail.sendOpportunityDigest` | Action | `{ userId, minScore? }` | `{ success, matchCount }` | Send digest email via AgentMail |

### 🌐 Firecrawl Web Scraper (`api.integrations.firecrawl`)
| Method | Type | Arguments | Returns | Description |
|---|---|---|---|---|
| `crawlOpportunities` | Action | `{ query?: string, category?: string, limit?: number }` | `{ success, ingestedCount, duplicateCount }` | Crawl web for opportunities and ingest to database |

### 🌱 Demo Seed Data (`api.init`)
| Method | Type | Arguments | Returns | Description |
|---|---|---|---|---|
| `seed` | Mutation | None | `{ success: true, userId, opportunitiesCount }` | Seeds realistic opportunities, demo user, matches, and alerts for instant UI testing |
