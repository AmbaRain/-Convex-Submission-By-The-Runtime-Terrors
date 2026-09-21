export interface OpenAIProvider {
  matchProfileToOpportunity(
    profile: UserProfileInput,
    opportunity: OpportunityInput,
  ): Promise<MatchResult>

  matchProfileToOpportunityBatch(
    profiles: UserProfileInput[],
    opportunities: OpportunityInput[],
  ): Promise<MatchResult[]>
}