export function validateMatchResult(
  result: unknown,
): result is MatchResult {
  if (
    !result ||
    typeof result !== "object"
  ) {
    return false
  }

  const r = result as Record<string, unknown>

  // score must be integer 0-100
  if (
    typeof r.score !== "number" ||
    !Number.isInteger(r.score) ||
    r.score < 0 ||
    r.score > 100
  ) {
    return false
  }

  // tier must be one of: strong, good, possible, low
  const validTiers = ["strong", "good", "possible", "low"]
  if (typeof r.tier !== "string" || !validTiers.includes(r.tier)) {
    return false
  }

  // eligibility must be likely, uncertain, or unlikely
  const validEligibility = ["likely", "uncertain", "unlikely"]
  if (
    typeof r.eligibility !== "string" ||
    !validEligibility.includes(r.eligibility)
  ) {
    return false
  }

  // summary must be concise (string, non-empty, reasonable length)
  if (
    typeof r.summary !== "string" ||
    r.summary.trim().length === 0 ||
    r.summary.trim().length > 300
  ) {
    return false
  }

  // positive_reasons must be array of strings
  if (
    !Array.isArray(r.positive_reasons) ||
    !r.positive_reasons.every((reason) => typeof reason === "string")
  ) {
    return false
  }

  // missing_requirements and uncertain_requirements must be arrays of MatchGap
  const isMatchGap = (item: unknown): item is MatchGap =>
    item &&
    typeof item === "object" &&
    typeof (item as Record<string, unknown>).requirement_id === "string" &&
    typeof (item as Record<string, unknown>).requirement_type === "string" &&
    typeof (item as Record<string, unknown>).missing === "boolean" &&
    typeof (item as Record<string, unknown>).uncertain === "boolean" &&
    typeof (item as Record<string, unknown>).reason === "string"

  if (
    !Array.isArray(r.missing_requirements) ||
    !r.missing_requirements.every(isMatchGap)
  ) {
    return false
  }

  if (
    !Array.isArray(r.uncertain_requirements) ||
    !r.uncertain_requirements.every(isMatchGap)
  ) {
    return false
  }

  return true
}

export function normalizeMatchResult(
  raw: unknown,
): MatchResult | { errors: string[] } {
  const errors: string[] = []

  if (!raw || typeof raw !== "object") {
    errors.push("match result must be an object")
    return { errors }
  }

  const r = raw as Record<string, unknown>

  // validate score
  if (
    typeof r.score !== "number" ||
    !Number.isInteger(r.score) ||
    r.score < 0 ||
    r.score > 100
  ) {
    errors.push("score must be an integer from 0 to 100")
  }

  // validate tier
  const validTiers = ["strong", "good", "possible", "low"]
  if (typeof r.tier !== "string" || !validTiers.includes(r.tier)) {
    errors.push(`tier must be one of: ${validTiers.join(", ")}`)
  }

  // validate eligibility
  const validEligibility = ["likely", "uncertain", "unlikely"]
  if (
    typeof r.eligibility !== "string" ||
    !validEligibility.includes(r.eligibility)
  ) {
    errors.push(
      `eligibility must be one of: ${validEligibility.join(", ")}`,
    )
  }

  // validate summary
  if (
    typeof r.summary !== "string" ||
    r.summary.trim().length === 0 ||
    r.summary.trim().length > 300
  ) {
    errors.push("summary must be a concise string (1-300 characters)")
  }

  // validate positive_reasons
  if (
    !Array.isArray(r.positive_reasons) ||
    !r.positive_reasons.every((reason) => typeof reason === "string")
  ) {
    errors.push("positive_reasons must be an array of strings")
  }

  // validate missing_requirements
  if (
    !Array.isArray(r.missing_requirements) ||
    !r.missing_requirements.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).requirement_id === "string" &&
        typeof (item as Record<string, unknown>).requirement_type === "string" &&
        typeof (item as Record<string, unknown>).missing === "boolean" &&
        typeof (item as Record<string, unknown>).uncertain === "boolean" &&
        typeof (item as Record<string, unknown>).reason === "string",
    )
  ) {
    errors.push("missing_requirements must be an array of structured gap objects")
  }

  // validate uncertain_requirements
  if (
    !Array.isArray(r.uncertain_requirements) ||
    !r.uncertain_requirements.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).requirement_id === "string" &&
        typeof (item as Record<string, unknown>).requirement_type === "string" &&
        typeof (item as Record<string, unknown>).missing === "boolean" &&
        typeof (item as Record<string, unknown>).uncertain === "boolean" &&
        typeof (item as Record<string, unknown>).reason === "string",
    )
  ) {
    errors.push("uncertain_requirements must be an array of structured gap objects")
  }

  if (errors.length > 0) {
    return { errors }
  }

  // Return normalized result
  return {
    opportunity_id: String(r.opportunity_id || ""),
    opportunity_title: String(r.opportunity_title || ""),
    score: Number(r.score),
    tier: r.tier as MatchResult["tier"],
    eligibility: r.eligibility as MatchResult["eligibility"],
    summary: String(r.summary),
    positive_reasons: r.positive_reasons as string[],
    missing_requirements: r.missing_requirements as MatchGap[],
    uncertain_requirements: r.uncertain_requirements as MatchGap[],
  }
}