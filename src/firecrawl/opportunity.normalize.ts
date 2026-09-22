import type { Opportunity } from "./opportunity.types";

interface RawOpportunity {
  title?: unknown;
  organization?: unknown;
  description?: unknown;
  category?: unknown;
  deadline?: unknown;
  eligibility?: unknown;
  location?: unknown;
  url?: unknown;
  source?: unknown;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const result = value.replace(/\s+/g, " ").trim();

  return result.length > 0 ? result : null;
}

function normalizeUrl(value: unknown, fallbackUrl: string): string {
  const candidate = cleanString(value) ?? fallbackUrl;

  try {
    return new URL(candidate).toString();
  } catch {
    return fallbackUrl;
  }
}

function normalizeDeadline(value: unknown): string | null {
  const text = cleanString(value);

  if (!text) {
    return null;
  }

  // Already YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  /*
   * Try JavaScript date parsing for common forms such as:
   * October 20, 2026 / 20 October 2026 / 2026/10/20
   */
  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  /*
   * If the webpage contains additional text around a date,
   * attempt to find an ISO date inside it.
   */
  const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);

  if (isoMatch) {
    return isoMatch[1];
  }

  return null;
}

function inferSource(url: string, extractedSource: unknown): string | null {
  const source = cleanString(extractedSource);

  if (source) {
    return source;
  }

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    return hostname.length > 0 ? hostname : null;
  } catch {
    return null;
  }
}

export function normalizeOpportunity(
  raw: RawOpportunity,
  fallbackUrl: string,
): Opportunity | null {
  const title = cleanString(raw.title);

  if (!title) {
    return null;
  }

  const url = normalizeUrl(raw.url, fallbackUrl);

  return {
    title,
    organization: cleanString(raw.organization),
    description: cleanString(raw.description),
    category: cleanString(raw.category),
    deadline: normalizeDeadline(raw.deadline),
    eligibility: cleanString(raw.eligibility),
    location: cleanString(raw.location),
    url,
    source: inferSource(url, raw.source),
  };
}
