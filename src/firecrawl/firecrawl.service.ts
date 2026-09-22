import { Firecrawl } from "firecrawl";

import { deduplicateOpportunities } from "./opportunity.dedupe";
import { normalizeOpportunity } from "./opportunity.normalize";
import type {
  DevContractOutput,
  Opportunity,
  OpportunitySearchInput,
  OpportunitySearchResult,
} from "./opportunity.types";

const apiKey = process.env.FIRECRAWL_API_KEY;

if (!apiKey) {
  throw new Error(
    "FIRECRAWL_API_KEY is missing. Add it to your environment variables.",
  );
}

const firecrawl = new Firecrawl({ apiKey });

const EXTRACTION_PROMPT = `
You are extracting a real-world opportunity from a webpage.

An opportunity can be:
- internship
- scholarship
- fellowship
- grant
- competition
- hackathon
- job
- accelerator
- program
- training
- research opportunity
- funding opportunity

Extract ONLY information that is supported by the webpage.

Required fields:

title:
The official name/title of the opportunity.

organization:
The organization offering, hosting, funding, or organizing it.

description:
A concise description of what the opportunity is.

category:
Use a concise category such as:
Internship, Scholarship, Fellowship, Grant,
Competition, Hackathon, Job, Accelerator,
Program, Training, Research, Funding.

deadline:
The application/submission deadline.
Do NOT invent one.
If no reliable deadline is present, return null.

eligibility:
Who can apply or participate.

location:
Physical location, country, region, or Remote
if the page explicitly states that it is remote.

url:
The original page URL.

source:
The website or organization providing the opportunity.

Rules:

1. Never invent missing information.
2. Use null for information that cannot be reliably identified.
3. Do not confuse an event date with an application deadline.
4. Do not confuse a publication date with a deadline.
5. Preserve the original opportunity URL.
6. Return one opportunity for the supplied webpage.
`;

const extractionSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    organization: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    category: { type: ["string", "null"] },
    deadline: { type: ["string", "null"] },
    eligibility: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
    url: { type: ["string", "null"] },
    source: { type: ["string", "null"] },
  },
  required: [
    "title",
    "organization",
    "description",
    "category",
    "deadline",
    "eligibility",
    "location",
    "url",
    "source",
  ],
  additionalProperties: false,
};

function buildSearchQuery(input: OpportunitySearchInput): string {
  const parts: string[] = [];

  const query = input.query.trim();

  if (query) {
    parts.push(query);
  }

  if (input.filters?.category) {
    parts.push(input.filters.category.trim());
  }

  if (input.filters?.location) {
    parts.push(input.filters.location.trim());
  }

  // These terms improve the chance of finding actual
  // opportunity/application pages rather than generic articles.
  parts.push("opportunity application deadline eligibility");

  return parts.join(" ");
}

function matchesFilters(
  opportunity: Opportunity,
  filters?: OpportunitySearchInput["filters"],
): boolean {
  if (!filters) {
    return true;
  }

  if (filters.category) {
    const category = opportunity.category?.toLowerCase() ?? "";
    const requested = filters.category.toLowerCase();

    // Only exclude when the opportunity has an explicit category
    // that clearly doesn't match — never drop items with unknown category.
    if (category && !category.includes(requested)) {
      return false;
    }
  }

  if (filters.location) {
    const location = opportunity.location?.toLowerCase() ?? "";
    const requested = filters.location.toLowerCase();

    if (location && !location.includes(requested)) {
      return false;
    }
  }

  return true;
}

interface FirecrawlSearchResult {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
}

function getSearchResults(result: unknown): FirecrawlSearchResult[] {
  if (!result || typeof result !== "object") {
    return [];
  }

  const value = result as Record<string, unknown>;
  const web = value.web;

  if (!Array.isArray(web)) {
    return [];
  }

  return web.filter(
    (item): item is FirecrawlSearchResult =>
      Boolean(item && typeof item === "object"),
  );
}

async function extractOpportunity(
  result: FirecrawlSearchResult,
): Promise<Opportunity | null> {
  if (!result.url) {
    return null;
  }

  try {
    const extraction = await firecrawl.extract({
      urls: [result.url],
      prompt: EXTRACTION_PROMPT,
      schema: extractionSchema,
    });

    if (!extraction || typeof extraction !== "object") {
      return null;
    }

    const extractionObject = extraction as Record<string, unknown>;
    const raw = extractionObject.data;

    if (!raw || typeof raw !== "object") {
      return null;
    }

    const rawObject = raw as Record<string, unknown>;

    // Always preserve the original search URL as the fallback.
    if (!rawObject.url) {
      rawObject.url = result.url;
    }

    // Search title is also a useful fallback.
    if (!rawObject.title && result.title) {
      rawObject.title = result.title;
    }

    return normalizeOpportunity(rawObject, result.url);
  } catch (error) {
    console.warn(
      `[Firecrawl] Extraction failed: ${result.url}`,
      error instanceof Error ? error.message : error,
    );

    return null;
  }
}

/**
 * Full internal result, including search/extraction stats.
 * Use this for local testing, logging, and debugging — NOT the
 * value to hand to another dev's code. See toDevContractOutput().
 */
export async function searchOpportunities(
  input: OpportunitySearchInput,
): Promise<OpportunitySearchResult> {
  if (!input || typeof input.query !== "string" || !input.query.trim()) {
    throw new Error("A non-empty search query is required.");
  }

  const requestedLimit = input.limit ?? 8;
  const limit = Math.min(Math.max(requestedLimit, 1), 20);

  const query = buildSearchQuery(input);

  console.log(`[Firecrawl] Searching: ${query}`);

  try {
    const searchResponse = await firecrawl.search(query, {
      limit,
      scrapeOptions: {
        formats: ["markdown"],
      },
    });

    const searchResults = getSearchResults(searchResponse);

    if (searchResults.length === 0) {
      return {
        opportunities: [],
        meta: { query, searched: 0, extracted: 0, returned: 0 },
      };
    }

    // Extract pages independently. Promise.allSettled means a
    // single broken webpage does not kill the entire search.
    const extractionResults = await Promise.allSettled(
      searchResults.map(extractOpportunity),
    );

    const opportunities: Opportunity[] = [];

    for (const result of extractionResults) {
      if (result.status !== "fulfilled" || !result.value) {
        continue;
      }

      if (!matchesFilters(result.value, input.filters)) {
        continue;
      }

      opportunities.push(result.value);
    }

    const unique = deduplicateOpportunities(opportunities);

    return {
      opportunities: unique,
      meta: {
        query,
        searched: searchResults.length,
        extracted: opportunities.length,
        returned: unique.length,
      },
    };
  } catch (error) {
    console.error(
      "[Firecrawl] Search failed:",
      error instanceof Error ? error.message : error,
    );

    throw new Error("Firecrawl opportunity search failed.");
  }
}

/**
 * Strips internal debugging metadata and returns EXACTLY the shape
 * promised in the team's Dev Input/Output Contracts doc:
 *   { opportunities: Opportunity[] }
 * This is what Dev 1's Convex layer (and anyone else on the team)
 * should actually receive — never the raw OpportunitySearchResult.
 */
export function toDevContractOutput(
  result: OpportunitySearchResult,
): DevContractOutput {
  return { opportunities: result.opportunities };
}

/**
 * Convenience wrapper: runs a search and returns only the
 * contract-shaped output in one call.
 */
export async function searchOpportunitiesForContract(
  input: OpportunitySearchInput,
): Promise<DevContractOutput> {
  const result = await searchOpportunities(input);
  return toDevContractOutput(result);
}
