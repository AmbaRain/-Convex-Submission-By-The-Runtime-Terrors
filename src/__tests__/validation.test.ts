import { validateMatchResult, normalizeMatchResult } from "../validation"
import type { MatchResult } from "../types"

describe("Match Result Validation", () => {
  const validResult: MatchResult = {
    opportunity_id: "opp-001",
    opportunity_title: "Software Engineer Intern",
    score: 85,
    tier: "strong",
    eligibility: "likely",
    summary: "Strong match for the role.",
    positive_reasons: ["Relevant experience", "Matching skills"],
    missing_requirements: [],
    uncertain_requirements: [],
  }

  describe("valid match results", () => {
    it("should accept a valid match result", () => {
      const isValid = validateMatchResult(validResult)
      expect(isValid).toBe(true)
    })

    it("should accept a valid match result via normalizeMatchResult", () => {
      const normalized = normalizeMatchResult(validResult)
      expect(normalized.errors).toHaveLength(0)
    })
  })

  describe("invalid scores", () => {
    it("should reject a score below 0", () => {
      const invalid = { ...validResult, score: -1 }
      const normalized = normalizeMatchResult(invalid)
      expect(normalized.errors).toContain(
        "score must be an integer from 0 to 100",
      )
    })

    it("should reject a score above 100", () => {
      const invalid = { ...validResult, score: 101 }
      const normalized = normalizeMatchResult(invalid)
      expect(normalized.errors).toContain(
        "score must be an integer from 0 to 100",
      )
    })

    it("should reject a non-integer score", () => {
      const invalid = { ...validResult, score: 85.5 }
      const normalized = normalizeMatchResult(invalid)
      expect(normalized.errors).toContain(
        "score must be an integer from 0 to 100",
      )
    })
  })

  describe("invalid tiers", () => {
    it("should reject invalid tier 'excellent'", () => {
      const invalid = { ...validResult, tier: "excellent" as const }
      const normalized = normalizeMatchResult(invalid)
      expect(normalized.errors).toContain(
        "tier must be one of: strong, good, possible, low",
      )
    })

    it("should reject missing tier", () => {
      const invalid = { ...validResult, tier: undefined as const }
      const normalized = normalizeMatchResult(invalid)
      expect(normalized.errors).toContain(
        "tier must be one of: strong, good, possible, low",
      )
    })
  })

  describe("invalid eligibility", () => {
    it("should reject invalid eligibility 'impossible'", () => {
      const invalid = { ...validResult, eligibility: "impossible" as const }
      const normalized = normalizeMatchResult(invalid)
      expect(normalized.errors).toContain(
        "eligibility must be one of: likely, uncertain, unlikely",
      )
    })

    it("should reject missing eligibility", () => {
      const invalid = { ...validResult, eligibility: undefined as const }
      const normalized = normalizeMatchResult(invalid)
      expect(normalized.errors).toContain(
        "eligibility must be one of: likely, uncertain, unlikely",
      )
    })
  })

  describe("summary validation", () => {
    it("should reject empty summary", () => {
      const invalid = { ...validResult, summary: "" }
      const normalized = normalizeMatchResult(invalid)
      expect(normalized.errors).toContain("summary must be a concise string")
    })

    it("should reject summary too long (>300 chars)", () => {
      const longSummary = "a".repeat(301)
      const invalid = { ...validResult, summary: longSummary }
      const normalized = normalizeMatchResult(invalid)
      expect(normalized.errors).toContain("summary must be a concise string")
    })

    it("should accept summary at exactly 300 chars", () => {
      const exact300 = "a".repeat(300)
      const valid = { ...validResult, summary: exact300 }
      const normalized = normalizeMatchResult(valid)
      expect(normalized.errors).toHaveLength(0)
    })
  })

  describe("positive_reasons validation", () => {
    it("should reject non-array positive_reasons", () => {
      const invalid = { ...validResult, positive_reasons: "single reason" }
      const normalized = normalizeMatchResult(invalid)
      expect(normalized.errors).toContain("positive_reasons must be an array of strings")
    })

    it("should reject array with non-string elements", () => {
      const invalid = { ...validResult, positive_reasons: [123] }
      const normalized = normalizeMatchResult(invalid)
      expect(normalized.errors).toContain("positive_reasons must be an array of strings")
    })
  })

  describe("missing_requirements validation", () => {
    it("should reject missing requirement_id", () => {
      const invalid = {
        ...validResult,
        missing_requirements: [{ requirement_type: "skills", missing: true, uncertain: false, reason: "" }],
      }
      // This tests the internal check - let's be more specific
      const isValid = validateMatchResult(invalid)
      expect(isValid).toBe(false)
    })

    it("should reject missing reason in gap", () => {
      const invalid = {
        ...validResult,
        missing_requirements: [{ requirement_id: "skills", requirement_type: "skills", missing: true, uncertain: false }],
      }
      const isValid = validateMatchResult(invalid)
      expect(isValid).toBe(false)
    })

    it("should accept valid missing_requirements", () => {
      const valid = {
        ...validResult,
        missing_requirements: [
          { requirement_id: "skills", requirement_type: "skills", missing: true, uncertain: false, reason: "No JavaScript experience" },
        ],
        uncertain_requirements: [],
      }
      const isValid = validateMatchResult(valid)
      expect(isValid).toBe(true)
    })
  })

  describe("uncertain_requirements validation", () => {
    it("should reject missing requirement_id in uncertain", () => {
      const invalid = {
        ...validResult,
        uncertain_requirements: [{ requirement_type: "skills", missing: false, uncertain: true }],
      }
      const isValid = validateMatchResult(invalid)
      expect(isValid).toBe(false)
    })

    it("should accept valid uncertain_requirements", () => {
      const valid = {
        ...validResult,
        missing_requirements: [],
        uncertain_requirements: [
          { requirement_id: "education", requirement_type: "education", missing: false, uncertain: true, reason: "No degree listed" },
        ],
      }
      const isValid = validateMatchResult(valid)
      expect(isValid).toBe(true)
    })
  })
})