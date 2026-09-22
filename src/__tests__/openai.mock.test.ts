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
  })
})