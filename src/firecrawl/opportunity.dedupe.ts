import type { Opportunity } from "./opportunity.types";

function canonicalizeUrl(value: string): string {
  try {
    const url = new URL(value);

    url.hash = "";

    const trackingParameters = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "ref",
      "source",
    ];

    for (const parameter of trackingParameters) {
      url.searchParams.delete(parameter);
    }

    return url.toString().replace(/\/+$/, "").toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function deduplicateOpportunities(
  opportunities: Opportunity[],
): Opportunity[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  const result: Opportunity[] = [];

  for (const opportunity of opportunities) {
    const urlKey = canonicalizeUrl(opportunity.url);
    const titleKey = normalizeTitle(opportunity.title);

    // URL is the strongest duplicate signal.
    if (seenUrls.has(urlKey)) {
      continue;
    }

    // Same title from the same source is usually another
    // representation of the same opportunity.
    const titleSourceKey = `${titleKey}|${opportunity.source ?? ""}`.toLowerCase();

    if (seenTitles.has(titleSourceKey)) {
      continue;
    }

    seenUrls.add(urlKey);
    seenTitles.add(titleSourceKey);

    result.push(opportunity);
  }

  return result;
}
