# What was checked and corrected against the Dev 2 contract

Checked against `The Runtime Terrors — Dev Input/Output Contracts.docx`,
Section 3 (Developer 2 — Firecrawl / Web Intelligence).

## ✅ Already correct
- Input/output field names and types (`title`, `organization`,
  `description`, `category`, `deadline`, `eligibility`, `location`,
  `url`, `source`) match the contract exactly.
- No `id` field on `Opportunity` — correct, since Convex assigns
  that on insert, not Dev 2.
- Firecrawl SDK usage (`firecrawl.search(query, options)`,
  `firecrawl.extract({ urls, prompt, schema })`) matches the current
  `firecrawl` npm package (v4.x) API.
- Normalization, deduplication, and error handling (`Promise.allSettled`
  so one bad page doesn't kill the whole search) are solid.

## 🔧 Corrected
1. **Output shape didn't strictly match the contract.**
   `searchOpportunities()` returned `{ opportunities, meta }`, but the
   contract only promises `{ opportunities: [...] }`. Added
   `toDevContractOutput()` and `searchOpportunitiesForContract()` — use
   these (not the raw function) whenever another dev's code consumes
   your output. The `meta` block is still there for your own testing/logs.

2. **Nothing actually fed into Convex.**
   The original plan's repo layout lists `convex/firecrawl.ts` as
   Dev 2's file, and "feed results into Convex" was one of your listed
   tasks — but the code you had was a standalone module with no Convex
   connection at all. Added `convex/firecrawl.ts`: a Convex **action**
   (HTTP calls to Firecrawl must run inside an action, not a query or
   mutation) that calls your `searchOpportunitiesForContract()` and
   writes the result via `ctx.runMutation(...)`.

   **You need to do one thing:** the later contracts doc puts "queries,
   mutations, and the integration layer" under Dev 1, so confirm with
   him whether you're meant to write this action yourself or whether
   he calls your `src/firecrawl` module from his own Convex code. Either
   way, the mutation name in `convex/firecrawl.ts` (`internal.opportunities.upsertMany`)
   is a placeholder — swap it for whatever he actually names his write
   mutation (marked with `TODO(Dev 1)`).

3. **Added `convex` as a dependency** in `package.json` since the new
   action file imports from it.

## Not changed, flagged for awareness
- The contract's shared `Opportunity` type marks `eligibility` as a plain
  `string`, but this code treats it as `string | null` (since Firecrawl
  sometimes can't find eligibility info). This is the right call —
  inventing eligibility text would violate your own extraction prompt's
  "never invent missing information" rule — but mention it to Dev 1 so
  his Convex schema accepts `null` there too.
