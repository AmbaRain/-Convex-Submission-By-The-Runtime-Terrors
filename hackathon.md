# Hackathon log

- **Project:** Opportunity Radar
- **Event:** Convex All Gas Hackathon
- **What it does:** Discovers hackathons, grants, fellowships, scholarships, and jobs, matching them to candidate profiles using AI with automated alerts and application tracking.
- **Live app:** not deployed
- **Repo:** https://github.com/AmbaRain/-Convex-Submission-By-The-Runtime-Terrors
- **Frontend:** Convex static hosting
- **Convex deployment:** not deployed
- **Components:** none
- **Convex features:** schema, tables, indexes, full-text search, queries, mutations, actions, internal mutations
- **Auth:** none
- **AI models:** gpt-4o-mini
- **Started:** 2026-09-20T20:17:48Z
- **Last updated:** 2026-09-22T07:46:00Z

## Log

### 2026-09-20 - f3b8975
Initialized repository with project readme and git attributes (`README.md`, `.gitattributes`).

### 2026-09-21 - 029ceff
Built the core Convex backend architecture and integration layer for Opportunity Radar. Created database schema with indexes and full-text search for opportunities, user profiles, AI matches, saved opportunities, application tracking, alerts, and search history. Implemented canonical data contracts and complete queries and mutations across all entities. Added integration actions for Firecrawl web extraction, OpenAI candidate matching, and AgentMail alert dispatching, alongside a demo seed dataset (`convex/schema.ts`, `convex/types.ts`, `convex/opportunities.ts`, `convex/users.ts`, `convex/matches.ts`, `convex/savedOpportunities.ts`, `convex/applications.ts`, `convex/alerts.ts`, `convex/searchHistory.ts`, `convex/integrations/firecrawl.ts`, `convex/integrations/openai.ts`, `convex/integrations/agentmail.ts`, `convex/init.ts`).

### 2026-09-22 - 2edfc80
Integrated the Firecrawl intelligence service for web opportunity discovery and extraction. Added search query execution, structured data extraction, deduplication, and normalization pipelines. Created Convex action bridge in `convex/firecrawl.ts` and connected it to `internal.opportunities.upsertMany` in `convex/opportunities.ts` for database persistence. Convex features: actions, internal mutations (`convex/firecrawl.ts`, `convex/opportunities.ts`, `src/firecrawl/firecrawl.service.ts`, `src/firecrawl/opportunity.dedupe.ts`, `src/firecrawl/opportunity.normalize.ts`).
