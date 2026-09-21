import { fingerprintInput } from "../fingerprint"
import type { MatchResult } from "../../types"

export class MockOpenAIProvider {
  private counter = 0

  async matchProfileToOpportunity(
    profile: UserProfileInput,
    opportunity: OpportunityInput,
  ): Promise<MatchResult> {
    this.counter++

    // Deterministic fingerprint based on normalized inputs
    const key = fingerprintInput(profile, opportunity)
    const hash = this.hashString(key)

    // Use hash to seed deterministic but varied results
    const scoreBase = (parseInt(hash.slice(0, 2), 36) % 100) + 10 // 10-100

    // Determine tier based on score
    let tier: "strong" | "good" | "possible" | "low"
    if (scoreBase >= 70) tier = "strong"
    else if (scoreBase >= 50) tier = "good"
    else if (scoreBase >= 30) tier = "possible"
    else tier = "low"

    // Determine eligibility based on profile completeness
    const hasSkills = profile.skills && profile.skills.length > 0
    const hasExperience = profile.experience_level != null
    let eligibility: "likely" | "uncertain" | "unlikely"

    if (!hasSkills || !hasExperience) {
      eligibility = "uncertain"
    } else if (scoreBase >= 60) {
      eligibility = "likely"
    } else if (scoreBase >= 30) {
      eligibility = "uncertain"
    } else {
      eligibility = "unlikely"
    }

    // Generate positive reasons based on profile-opportunity intersection
    const positiveReasons: string[] = []

    if (profile.skills) {
      for (const skill of profile.skills) {
        if (opportunity.description.toLowerCase().includes(skill.toLowerCase())) {
          positiveReasons.push(`Has skill: ${skill}`)
          break // only one reason per skill to avoid explosion
        }
      }
    }

    if (profile.experience_level) {
      positiveReasons.push(
        `Experience level: ${profile.experience_level}`,
      )
    }

    if (profile.location && opportunity.category === "job") {
      positiveReasons.push(`Location match: ${profile.location}`)
    }

    // Ensure at least one reason if profile is complete
    if (positiveReasons.length === 0 && hasSkills && hasExperience) {
      positiveReasons.push("Profile aligns with opportunity requirements")
    }

    // Generate missing requirements gaps
    const missingRequirements: Array<{
      requirement_id: string
      requirement_type: string
      missing: boolean
      uncertain: boolean
      reason: string
    }> = []

    // Check for common requirement types
    if (opportunity.requirements) {
      for (const req of opportunity.requirements) {
        const met = this.isRequirementMet(profile, req)
        missingRequirements.push({
          requirement_id: req.type,
          requirement_type: req.type,
          missing: !met && !req.required,
          uncertain: !met && req.required,
          reason: this.gapReason(req, !met),
        })
      }
    }

    // Generate uncertain requirements gaps
    const uncertainRequirements: Array<{
      requirement_id: string
      requirement_type: string
      missing: boolean
      uncertain: boolean
      reason: string
    }> = []

    // If profile is incomplete, mark some requirements as uncertain
    if (eligibility === "uncertain") {
      for (const req of opportunity.requirements) {
        if (req.required && !this.isRequirementMet(profile, req)) {
          uncertainRequirements.push({
            requirement_id: req.type,
            requirement_type: req.type,
            missing: false,
            uncertain: true,
            reason: `Insufficient profile data to evaluate: ${req.type}`,
          })
        }
      }
    }

    // Generate summary
    const summary =
      positiveReasons.length > 0
        ? `${profile.name || "User"} ${
            scoreBase >= 60 ? "is a strong" : scoreBase >= 30 ? "is a moderate" : "is a potential"}
            match for ${opportunity.title}.`
        : `User profile reviewed for ${opportunity.title}.`

    return {
      opportunity_id: opportunity.id,
      opportunity_title: opportunity.title,
      score: scoreBase,
      tier,
      eligibility,
      summary,
      positive_reasons: positiveReasons.slice(0, 5), // cap at 5
      missing_requirements,
      uncertain_requirements,
    }
  }

  async matchProfileToOpportunityBatch(
    profiles: UserProfileInput[],
    opportunities: OpportunityInput[],
  ): Promise<MatchResult[]> {
    const results: MatchResult[] = []

    for (const profile of profiles) {
      for (const opportunity of opportunities) {
        results.push(await this.matchProfileToOpportunity(profile, opportunity))
      }
    }

    return results
  }

  private hashString(input: string): string {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return (hash >>> 0).toString(36)
  }

  private isRequirementMet(
    profile: UserProfileInput,
    req: Required<OpportunityInput["requirements"]>[0],
  ): boolean {
    // Simplified: check if profile has relevant skill/level
    if (req.type === "skills" && profile.skills) {
      return profile.skills.some((s) =>
        req.description.toLowerCase().includes(s.toLowerCase()),
      )
    }
    if (req.type === "experience" && profile.experience_level) {
      return true // assume met if experience level is listed
    }
    if (req.type === "education" && profile.education) {
      return true // assume met if education is listed
    }
    if (req.type === "certification" && profile.certifications) {
      return profile.certifications.some((c) => req.description.includes(c))
    }
    if (req.type === "location" && profile.location) {
      return profile.location === req.description
    }
    // Default: cannot determine, treat as not met
    return false
  }

  private gapReason(req: Required<OpportunityInput["requirements"]>[0], met: boolean): string {
    if (met) return "Requirement satisfied"
    if (req.required) {
      return `Missing required requirement: ${req.type}`
    }
    return `Optional requirement not met: ${req.type}`
  }
}