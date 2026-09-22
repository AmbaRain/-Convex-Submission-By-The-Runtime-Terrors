// NOTE FOR THE TEAM: the original hackathon.md repo layout listed
// `convex/firecrawl.ts` as Dev 2's file, but the later Dev
// Input/Output Contracts doc puts "queries, mutations, and the
// integration layer" under Dev 1. This file is the bridge: it's a
// thin Convex ACTION (not a mutation — external HTTP calls to
// Firecrawl are only allowed inside actions) that calls Dev 2's
// pure `searchOpportunities` module and hands the result to
// Convex in exactly the agreed { opportunities: [...] } shape.
//
// Dev 1: confirm the mutation name/path below (`internal.opportunities.*`)
// matches whatever you actually named your write mutation — rename
// the two spots marked TODO to match your schema.

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { searchOpportunitiesForContract } from "../src/firecrawl";

export const searchAndStore = action({
  args: {
    query: v.string(),
    filters: v.optional(
      v.object({
        category: v.optional(v.string()),
        location: v.optional(v.string()),
      }),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { opportunities } = await searchOpportunitiesForContract({
      query: args.query,
      filters: args.filters,
      limit: args.limit,
    });

    // TODO(Dev 1): point this at your actual write mutation, e.g.
    // convex/opportunities.ts exporting `upsertMany`.
    await ctx.runMutation(internal.opportunities.upsertMany, {
      opportunities,
    });

    return { opportunities };
  },
});
