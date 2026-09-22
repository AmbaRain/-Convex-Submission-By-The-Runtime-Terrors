# Opportunity Radar

A standalone frontend prototype for discovering jobs, internships, hackathons, scholarships, grants, fellowships, and developer programs.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Routes

- `/` — landing page
- `/onboarding` — opportunity profile setup
- `/dashboard` — filtered opportunity feed
- `/opportunities/[id]` — opportunity details
- `/applications` — saved and applied opportunity tracker

## Frontend demo data

This branch is intentionally frontend-only. Opportunities are defined in `lib/mock-data.ts`; profile, saved, and application states are stored in browser local storage. No backend, environment variables, API keys, or external services are required.
