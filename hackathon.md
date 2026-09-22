# Hackathon log

- **Project:** Opportunity Radar
- **Event:** Convex All Gas Hackathon
- **What it does:** Discovers hackathons, grants, fellowships, scholarships, and jobs, matching them to candidate profiles using AI with automated alerts and application tracking.
- **Live app:** https://lovable-toucan-817.convex.site
- **Repo:** https://github.com/AmbaRain/-Convex-Submission-By-The-Runtime-Terrors
- **Frontend:** Convex static hosting
- **Convex deployment:** https://lovable-toucan-817.convex.cloud
- **Components:** @convex-dev/static-hosting
- **Convex features:** schema, tables, indexes, full-text search, queries, mutations, actions, internal mutations, internal queries
- **Auth:** none
- **AI models:** gpt-4o-mini
- **Started:** 2026-09-20T20:17:48Z
- **Last updated:** 2026-09-22T15:08:46Z

## Architecture
USER → Next.js SPA on Convex Static Hosting (`*.convex.site`) → Convex Cloud (`*.convex.cloud`) → OpenAI (profile understanding & matching) → Firecrawl (Search/Crawl/Extract) → Convex DB → Match+Rank → Dashboard → AgentMail (digests & deadline alerts).

## Demo script
1. Open https://lovable-toucan-817.convex.site, click "Create your radar" to fill out profile on `/onboarding`.
2. Profile session persists in `localStorage` across reloads and syncs with Convex `api.users.getProfile`.
3. Dashboard displays AI-ranked opportunities sorted by match score and deadline.
4. Click "Details" to view opportunity match breakdown and eligibility requirements on dynamic route `/opportunity?id=...`.
5. Save opportunities and track applications with real-time state updates in `/applications`.
6. Run Rescan for live web scraping with Firecrawl or dispatch digests with AgentMail.

## Judging mapping
- Convex Static Hosting: frontend hosted directly via `@convex-dev/static-hosting` component at `https://lovable-toucan-817.convex.site`.
- Convex Backend: real-time database schema, queries, mutations, actions, indexes, and full-text search in `convex/*`.
- Firecrawl: live web search and structured extraction in `convex/firecrawl.ts` and `convex/integrations/firecrawl.ts`.
- OpenAI / OpenRouter: candidate profile matching and gap analysis in `convex/integrations/openai.ts`.
- AgentMail: transactional digests and deadline reminders in `convex/alerts.ts` and `convex/integrations/agentmail.ts`.

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

### 2026-09-22 - d77c2bc
Connected the Next.js frontend to real-time Convex backend and completed live API integrations with Firecrawl, OpenRouter (OpenAI-compatible LLM matching), and AgentMail. Configured `ConvexClientProvider` and `SessionProvider` for browser localStorage synchronization and live profile hydration (`api.users.getProfile`). Wired profile onboarding to `api.users.upsertProfile`, live opportunity listings and AI match rankings to `api.opportunities.list` and `api.matches.getMatchesForUser`, and application tracking to `api.applications.listByUser` and `api.applications.updateStatus`. Implemented web search and direct URL scraping via Firecrawl v1 API, prompt-optimized cost-effective AI candidate evaluation with OpenRouter `openai/gpt-4o-mini`, and live email alert and digest dispatch via AgentMail v0 API with idempotent delivery and HTML templates. Added route transition animations via `template.tsx` with cubic-bezier easing and defensive deadline formatting against invalid time values. Convex features: queries, mutations, actions, internal queries, scheduled actions (`app/*`, `components/*`, `convex/*`).

### 2026-09-22 - ecc8297
Configured Next.js static export (`output: 'export'`) with `generateStaticParams` for dynamic opportunity routes and integrated the official `@convex-dev/static-hosting` component in `convex/convex.config.ts`. Deployed the production backend and uploaded the compiled SPA frontend directly to Convex static hosting at `https://lovable-toucan-817.convex.site`. Added one-command deployment scripts in `package.json` (`deploy:backend`, `deploy:frontend`, `deploy`). Convex features: queries, mutations, actions (`convex/convex.config.ts`, `components/OpportunityDetailClient.tsx`, `app/opportunities/[id]/page.tsx`, `next.config.js`, `package.json`).

### 2026-09-22 - working tree
Resolved opportunity details navigation on static hosting via `/opportunity?id=...` with Suspense. Upgraded AgentMail digest to fallback to saved and top opportunities when AI match table is initializing, and automatically dispatch opportunity alert emails on save actions. Redesigned frontend UI for full mobile responsiveness including mobile navigation bar in AppNav, line-clamped responsive card titles, and balanced grid button layouts (`app/opportunity/page.tsx`, `components/OpportunityCard.tsx`, `components/OpportunityDetailClient.tsx`, `components/AppNav.tsx`, `app/dashboard/page.tsx`, `convex/integrations/agentmail.ts`).
