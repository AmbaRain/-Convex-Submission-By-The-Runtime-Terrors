export interface OpportunityFilters {
  category?: string;
  location?: string;
}

export interface OpportunitySearchInput {
  query: string;
  filters?: OpportunityFilters;
  limit?: number;
}

// Matches the "Opportunity" fields defined in the team's
// Dev Input/Output Contracts doc (Section 3 — Developer 2 Output),
// minus `id`, which Convex assigns on insert — Dev 2 never sets it.
export interface Opportunity {
  title: string;
  organization: string | null;
  description: string | null;
  category: string | null;
  deadline: string | null;
  eligibility: string | null;
  location: string | null;
  url: string;
  source: string | null;
}

// Internal, richer result — used for local testing/logging only.
export interface OpportunitySearchResult {
  opportunities: Opportunity[];
  meta: {
    query: string;
    searched: number;
    extracted: number;
    returned: number;
  };
}

// This is the EXACT shape the contract promises to the rest of the
// team: { opportunities: Opportunity[] } and nothing else. Dev 1's
// Convex layer should only ever receive this, not the `meta` block.
export interface DevContractOutput {
  opportunities: Opportunity[];
}
