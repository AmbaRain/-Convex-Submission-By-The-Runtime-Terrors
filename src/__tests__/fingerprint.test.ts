import { fingerprintInput } from "../fingerprint"
import type { UserProfileInput, OpportunityInput } from "../types"

describe("Deterministic Fingerprint", () => {
  const consistentProfile: UserProfileInput = {
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

  const varyingOpportunity: OpportunityInput = {
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

  it("should produce the same fingerprint for identical inputs", () => {
    const fp1 = fingerprintInput(consistentProfile, varyingOpportunity)
    const fp2 = fingerprintInput(consistentProfile, varyingOpportunity)
    expect(fp1).toBe(fp2)
  })

  it("should produce different fingerprints for different inputs", () => {
    const profile2: UserProfileInput = {
      ...consistentProfile,
      id: "user-2",
    }
    const fp1 = fingerprintInput(consistentProfile, varyingOpportunity)
    const fp2 = fingerprintInput(profile2, varyingOpportunity)
    expect(fp1).not.toBe(fp2)
  })

  it("should be deterministic across multiple calls", () => {
    const fp1 = fingerprintInput(consistentProfile, varyingOpportunity)
    const fp2 = fingerprintInput(consistentProfile, varyingOpportunity)
    const fp3 = fingerprintInput(consistentProfile, varyingOpportunity)
    expect(fp1).toBe(fp2)
    expect(fp2).toBe(fp3)
  })
})