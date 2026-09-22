export interface UserProfileInput {
  id: string
  email: string
  name: string | null
  skills: string[]
  location: string | null
  experience_level: "junior" | "mid" | "senior" | null
  education: string | null
  certifications: string[]
  status: "active" | "archived"
}

export interface OpportunityInput {
  id: string
  title: string
  description: string
  requirements: RequirementInput[]
  deadline: string
  category: "job" | "grant" | "fellowship" | "competition"
  source_url: string
  extracted_at: string
}

export interface RequirementInput {
  type: string
  description: string
  min_level?: "junior" | "mid" | "senior"
  required: boolean
}

export interface MatchReason {
  requirement_id: string
  requirement_type: string
  met: boolean
  explanation?: string
}

export interface MatchGap {
  requirement_id: string
  requirement_type: string
  missing: boolean
  uncertain: boolean
  reason: string
}

export interface MatchResult {
  opportunity_id: string
  opportunity_title: string
  score: number
  tier: "strong" | "good" | "possible" | "low"
  eligibility: "likely" | "uncertain" | "unlikely"
  summary: string
  positive_reasons: string[]
  missing_requirements: MatchGap[]
  uncertain_requirements: MatchGap[]
}

export interface NotificationRequest {
  user_id: string
  opportunity_id: string
  match_result: MatchResult
  kind: "new-match" | "deadline-reminder" | "eligibility-change"
}

export interface NotificationResult {
  key: string
  sent: boolean
  delivered_at: string | null
  error?: string
}