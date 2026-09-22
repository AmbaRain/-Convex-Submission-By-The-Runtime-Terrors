# Hackathon log

- **Project:** Opportunity Radar
- **Event:** Convex All Gas Hackathon
- **What it does:** Discovers hackathons, grants, fellowships, scholarships, and jobs, matching them to candidate profiles using AI with automated alerts and application tracking.
- **Live app:** not deployed
- **Repo:** https://github.com/AmbaRain/-Convex-Submission-By-The-Runtime-Terrors
- **Frontend:** not deployed
- **Convex deployment:** not deployed
- **Components:** none
- **Convex features:** schema, tables, indexes, full-text search, queries, mutations, actions, internal mutations, internal queries
- **Auth:** none
- **AI models:** gpt-4o-mini
- **Started:** 2026-09-20T20:17:48Z
- **Last updated:** 2026-09-22T13:10:00Z

## Architecture
USER → OpenAI (profile understanding) → Firecrawl (Search/Crawl/Extract) → Convex DB → Match+Rank → Dashboard → AgentMail ("3 new opportunities found").

## Demo script
1. Open `/onboarding`, create profile.
2. Seed demo fires automatically; dashboard shows cards sorted by matchScore then deadline.
3. Hit Rescan (Firecrawl, needs key) and Email me digest (AgentMail, needs key).
4. Save + Mark applied to show application tracking.

## Judging mapping
- Firecrawl: real web search/extract in `convex/firecrawl.ts`.
- OpenAI: extraction/matching in `convex/ai.ts` and `convex/integrations/openai.ts`.
- Convex: schema + live queries in `convex/*`.
- AgentMail: deadline + new-match emails in `convex/alerts.ts`.

## Log

### 2026-09-20 - f3b8975
Initialized repository with project readme and git attributes (`README.md`, `.gitattributes`).

### 2026-09-21 - 029ceff
Built the core Convex backend architecture and integration layer for Opportunity Radar. Created database schema with indexes and full-text search for opportunities, user profiles, AI matches, saved opportunities, application tracking, alerts, and search history. Implemented canonical data contracts and complete queries and mutations across all entities. Added integration actions for Firecrawl web extraction, OpenAI candidate matching, and AgentMail alert dispatching, alongside a demo seed dataset (`convex/schema.ts`, `convex/types.ts`, `convex/opportunities.ts`, `convex/users.ts`, `convex/matches.ts`, `convex/savedOpportunities.ts`, `convex/applications.ts`, `convex/alerts.ts`, `convex/searchHistory.ts`, `convex/integrations/firecrawl.ts`, `convex/integrations/openai.ts`, `convex/integrations/agentmail.ts`, `convex/init.ts`).

### 2026-09-22 - 2edfc80
Integrated the Firecrawl intelligence service for web opportunity discovery and extraction. Added search query execution, structured data extraction, deduplication, and normalization pipelines. Created Convex action bridge in `convex/firecrawl.ts` and connected it to `internal.opportunities.upsertMany` in `convex/opportunities.ts` for database persistence. Convex features: actions, internal mutations (`convex/firecrawl.ts`, `convex/opportunities.ts`, `src/firecrawl/firecrawl.service.ts`, `src/firecrawl/opportunity.dedupe.ts`, `src/firecrawl/opportunity.normalize.ts`).

### 2026-09-22 - affa2f1
Added provider-independent OpenAI candidate matching and AgentMail notification modules. Implemented deterministic OpenAI matching mock, prompt engineering schema, requirement gap analysis, and eligibility labeling (`likely`, `uncertain`, `unlikely`). Added in-memory mock AgentMail client, plain-text/HTML email template renderers for match alerts and 7-day/1-day deadline reminders, input fingerprinting, runtime schema validation, and test suites (`src/openai/`, `src/agentmail/`, `src/email/renderers.ts`, `src/fingerprint.ts`, `src/validation.ts`, `docs/dev3-integration-contract.md`).

### 2026-09-22 - 3ff572c
Built the Opportunity Radar Next.js frontend with landing page, onboarding wizard, dashboard with filters and sorting, opportunity detail view, and application tracking pipeline (`app/*`, `components/*`, `lib/*`).

### 2026-09-22 - 073d8a6
Merged the Next.js frontend into main and unified full-stack build configuration and dependencies. Added Suspense boundary for dashboard search parameters to enable static prerendering, resolved database query patterns in scheduled deadline reminders using internal queries, fixed matching insertion contracts, and updated runtime validation. Convex features: internal queries, queries, actions, mutations (`app/dashboard/page.tsx`, `convex/deadlineReminders.ts`, `convex/init.ts`, `convex/integrations/openai.ts`, `package.json`, `tsconfig.json`).

### 2026-09-22 - live-integration
Connected Next.js frontend to real-time Convex backend and completed live API integrations with Firecrawl, OpenRouter (OpenAI-compatible LLM matching), and AgentMail. Configured `ConvexClientProvider` across the application, connected profile onboarding to `api.users.upsertProfile`, opportunity listings and real-time match rankings to `api.opportunities.list` and `api.matches.getMatchesForUser`, and application tracking to `api.applications.listByUser` and `api.applications.updateStatus`. Implemented web search and direct URL scraping via Firecrawl v1 API, prompt-optimized cost-effective AI candidate evaluation with OpenRouter `openai/gpt-4o-mini`, and live email alert and digest dispatch via AgentMail v0 API with idempotent delivery and HTML templates. Verified end-to-end flow with automated integration tests and production Next.js build. Convex features: queries, mutations, actions, internal queries, scheduled actions (`app/*`, `components/*`, `convex/*`).

### 2026-09-22 - session-and-transitions
Implemented browser session persistence and route transition animations. Added `SessionProvider` and `useSession()` hook with `localStorage` synchronization (`radar_user_id`, `or_email`) and live Convex profile hydration via `api.users.getProfile`. Onboarding form automatically restores and pre-fills user profile data with live session ID badge and reset capabilities. Navigation bar reflects active user profile status with live activity indicators. Added Next.js `app/template.tsx` and CSS keyframes for smooth screen transitions (`animate-page-enter`, `animate-fade-in`) and tactile button/card micro-interactions (`app/template.tsx`, `components/SessionContext.tsx`, `components/AppNav.tsx`, `app/globals.css`, `components/OpportunityCard.tsx`).
