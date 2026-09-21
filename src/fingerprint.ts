function deterministicHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return (hash >>> 0).toString(36)
}

export function fingerprintInput(
  profile: UserProfileInput,
  opportunity: OpportunityInput,
): string {
  const parts = [
    profile.id,
    profile.email,
    profile.name || "",
    profile.skills.sort().join(","),
    profile.location || "",
    profile.experience_level || "",
    profile.education || "",
    profile.certifications.sort().join(","),
    profile.status,
    opportunity.id,
    opportunity.title,
    opportunity.description,
    opportunity.requirements
      .map((r) => [r.type, r.description, r.min_level, String(r.required)].filter((x) => x).join("|"))
      .sort()
      .join("|"),
    opportunity.deadline,
    opportunity.category,
    opportunity.source_url,
    opportunity.extracted_at,
  ]

  return deterministicHash(parts.join("||"))
}