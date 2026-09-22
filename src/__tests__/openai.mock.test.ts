import { MockOpenAIProvider } from "../openai/mock"
import type { UserProfileInput, OpportunityInput } from "../types"

describe("Mock OpenAI Provider", () => {
  let provider: MockOpenAIProvider

  beforeEach(() => {
    provider = new MockOpenAIProvider()
  })

  describe("deterministic matching", () => {
    const profile: UserProfileInput = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      skills: ["JavaScript", "TypeScript"],
      location: "San Francisco",
      experience_level: "mid",
      education: "BS Computer Science",
      certifications: [],
      status: "active",
    }

    const opportunity: OpportunityInput = {
      id: "opp-1",
      title: "Software Engineer",
      description: "Build web apps with JavaScript and TypeScript",
      requirements: [
        { type: "skills", description: "JavaScript", required: true },
        { type: "experience", description: "2+ years", required: false },
      ],
      deadline: "2025-12-31T23:59:59Z",
      category: "job",
      source_url: "https://example.com/opp1",
      extracted_at: "2025-01-01T00:00:00Z",
    }

    it("should return consistent results for same inputs", async () => {
      const result1 = await provider.matchProfileToOpportunity(
        profile,
        opportunity,
      )
      const result2 = await provider.matchProfileToOpportunity(
        profile,
        opportunity,
      )
      expect(result1.score).toBe(result2.score)
      expect(result1.tier).toBe(result2.tier)
      expect(result1.eligibility).toBe(result2.eligibility)
    })

    it("should vary results when profile changes", async () => {
      const profile2: UserProfileInput = {
        ...profile,
        skills: ["Python"],
      }
      const result1 = await provider.matchProfileToOpportunity(
        profile,
        opportunity,
      )
      const result2 = await provider.matchProfileToOpportunity(
        profile2,
        opportunity,
      )
      expect(result1.score).not.toBe(result2.score)
    })

    it("should produce valid MatchResult shape", async () => {
      const result = await provider.matchProfileToOpportunity(
        profile,
        opportunity,
      )
      const validTypes =
        typeof result.score === "number" &&
        typeof result.tier === "string" &&
        typeof result.eligibility === "string" &&
        typeof result.summary === "string" &&
        Array.isArray(result.positive_reasons)
      expect(validTypes).toBe(true)

      const validScore = result.score >= 0 && result.score <= 100
      const validTiers = ["strong", "good", "possible", "low"].includes(result.tier)
      const validEligibility = [
        "likely",
        "uncertain",
        "unlikely",
      ].includes(result.eligibility)
      expect(validScore).toBe(true)
      expect(validTiers).toBe(true)
      expect(validEligibility).toBe(true)
    })

    it("should produce different fingerprints for different opportunities", async () => {
      const opp2: OpportunityInput = {
        ...opportunity,
        title: "Data Scientist Position",
        description: "Build data pipelines with Python and SQL",
      }
      const result1 = await provider.matchProfileToOpportunity(profile, opportunity)
      const result2 = await provider.matchProfileToOpportunity(profile, opp2)
      expect(result1.fingerprint).not.toBe(result2.fingerprint)
    })
  })

  describe("missing profile fields", () => {
    it("should default eligibility to uncertain when no skills", async () => {
      const profileNoSkills: UserProfileInput = {
        ...profile,
        skills: [],
      }
      const result = await provider.matchProfileToOpportunity(
        profileNoSkills,
        opportunity,
      )
      expect(result.eligibility).toBe("uncertain")
    })

    it("should default eligibility to uncertain when no experience level", async () => {
      const profileNoExperience: UserProfileInput = {
        ...profile,
        experience_level: null,
      }
      const result = await provider.matchProfileToOpportunity(
        profileNoExperience,
        opportunity,
      )
      expect(result.eligibility).toBe("uncertain")
    })

    it("should produce at least one positive reason when profile complete", async () => {
      const result = await provider.matchProfileToOpportunity(profile, opportunity)
      expect(result.positive_reasons.length).toBeGreaterThan(0)
    })

    it("should generate missing requirements when requirements defined", async () => {
      const result = await provider.matchProfileToOpportunity(profile, opportunity)
      expect(Array.isArray(result.missing_requirements)).toBe(true)
      expect(Array.isArray(result.uncertain_requirements)).toBe(true)
    })
  })

  describe("changed source fingerprint", () => {
    it("should produce different score when opportunity changes", async () => {
      const oppModified: OpportunityInput = {
        ...opportunity,
        title: "Modified Opportunity",
        description: "Different description with different requirements",
      }
      const result1 = await provider.matchProfileToOpportunity(profile, opportunity)
      const result2 = await provider.matchProfileToOpportunity(profile, oppModified)
      expect(result1.score).not.toBe(result2.score)
    })

    it("should produce different fingerprint when profile ID changes", async () => {
      const profile2: UserProfileInput = {
        ...profile,
        id: "user-2",
      }
      const result1 = await provider.matchProfileToOpportunity(profile, opportunity)
      const result2 = await provider.matchProfileToOpportunity(profile2, opportunity)
      expect(result1.fingerprint).not.toBe(result2.fingerprint)
    })
  })
})