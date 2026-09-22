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

  describe("missing fields", () => {
    it("should reject missing opportunity_id", () => {
      const incomplete = { ...validResult, opportunity_id: undefined }
      const normalized = normalizeMatchResult(incomplete)
      expect(normalized.errors).toContain("missing required field: opportunity_id")
    })

    it("should reject missing summary", () => {
      const incomplete = { ...validResult, summary: "" }
      const normalized = normalizeMatchResult(incomplete)
      expect(normalized.errors).toContain("summary must be a concise string")
    })
  })
})