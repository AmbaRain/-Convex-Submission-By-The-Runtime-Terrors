# Hackathon notes

## What we built
Opportunity Radar: enter "I'm a frontend/data/AI developer in Nigeria looking for opportunities." and get ranked jobs, internships, hackathons, scholarships, fellowships, grants.

## Architecture
USER → OpenAI (profile understanding) → Firecrawl (Search/Crawl/Extract) → Convex DB → Match+Rank → Dashboard → AgentMail ("3 new opportunities found").

## Demo script
1. Open `/onboarding`, create profile.
2. Seed demo fires automatically; dashboard shows cards sorted by matchScore then deadline.
3. Hit Rescan (Firecrawl, needs key) and Email me digest (AgentMail, needs key).
4. Save + Mark applied to show application tracking.

## Judging mapping
- Firecrawl: real web search/extract in `convex/firecrawl.ts`.
- OpenAI: extraction/matching in `convex/ai.ts`.
- Convex: schema + live queries in `convex/*`.
- AgentMail: deadline + new-match emails in `convex/alerts.ts`.
