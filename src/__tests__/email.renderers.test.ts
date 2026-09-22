import {
  renderNewMatchAlert,
  renderSevenDayDeadlineAlert,
  renderOneDayDeadlineAlert,
} from "../email/renderers"
import type { UserProfileInput, OpportunityInput, MatchResult, NotificationRequest } from "../types"

describe("Email Renderers", () => {
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
    title: "Software Engineer Position",
    description: "Build web applications using JavaScript and TypeScript",
    requirements: [
      { type: "skills", description: "JavaScript", required: true },
      { type: "experience", description: "2+ years", required: false },
    ],
    deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    category: "job",
    source_url: "https://example.com/opp",
    extracted_at: new Date().toISOString(),
  }

  const matchResult: MatchResult = {
    opportunity_id: "opp-1",
    opportunity_title: "Software Engineer Position",
    score: 85,
    tier: "strong",
    eligibility: "likely",
    summary: "Strong match for the role with relevant experience.",
    positive_reasons: ["Relevant experience in JavaScript", "Matching skills"],
    missing_requirements: [],
    uncertain_requirements: [],
  }

  const request: NotificationRequest = {
    user_id: "user-1",
    opportunity_id: "opp-1",
    match_result,
    kind: "new-match",
  }

  describe("renderNewMatchAlert", () => {
    it("should produce plain-text email", () => {
      const { plain } = renderNewMatchAlert(request, matchResult)
      expect(plain).toContain("New Opportunity Match Alert")
      expect(plain).toContain("Software Engineer Position")
      expect(plain).toContain("85/100")
      expect(plain).toContain("Strong")
    })

    it("should produce HTML email", () => {
      const { html } = renderNewMatchAlert(request, matchResult)
      expect(html).toContain("New Opportunity Match Alert")
      expect(html).toContain("Software Engineer Position")
      expect(html).toContain("85/100")
      expect(html).toContain("Strong")
      expect(html).toContain("<ul>")
      expect(html).toContain("Relevant experience")
    })

    it("should include positive reasons in both formats", () => {
      const { plain, html } = renderNewMatchAlert(request, matchResult)
      expect(plain).toContain("Positive reasons:")
      expect(html).toContain("Positive reasons:")
      expect(html).toContain("Relevant experience")
    })
  })

  describe("renderSevenDayDeadlineAlert", () => {
    it("should produce plain-text email with 7-day notice", () => {
      const { plain } = renderSevenDayDeadlineAlert(request, matchResult, 7)
      expect(plain).toContain("Seven-Day Deadline Alert")
      expect(plain).toContain("7 days")
      expect(plain).toContain("Software Engineer Position")
    })

    it("should produce HTML email with 7-day notice", () => {
      const { html } = renderSevenDayDeadlineAlert(request, matchResult, 7)
      expect(html).toContain("Seven-Day Deadline Alert")
      expect(html).toContain("7 days")
      expect(html).toContain("Software Engineer Position")
    })

    it("should include deadline date in both formats", () => {
      const { plain, html } = renderSevenDayDeadlineAlert(request, matchResult, 7)
      expect(plain).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)
      expect(html).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)
    })
  })

  describe("renderOneDayDeadlineAlert", () => {
    it("should produce plain-text email with 1-day notice", () => {
      const { plain } = renderOneDayDeadlineAlert(request, matchResult, 1)
      expect(plain).toContain("One-Day Deadline Alert")
      expect(plain).toContain("today")
      expect(plain).toContain("Software Engineer Position")
    })

    it("should produce HTML email with 1-day notice", () => {
      const { html } = renderOneDayDeadlineAlert(request, matchResult, 1)
      expect(html).toContain("One-Day Deadline Alert")
      expect(html).toMatch(/<span[^>]*color[^>]*>/)
      expect(html).toContain("Software Engineer Position")
    })

    it("should highlight deadline in red in HTML", () => {
      const { html } = renderOneDayDeadlineAlert(request, matchResult, 1)
      expect(html).toMatch(/color.*d32f2f|#d32f2f/)
    })
  })
})