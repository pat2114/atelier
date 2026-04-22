export type RepairErrorReport = {
  id: string
  message: string
  stack?: string
  stepId?: string
  projectId?: string
  context?: Record<string, unknown>
  logs?: string[]
  appVersion: string
  timestamp: number
}

export type ErrorClassification = {
  category: 'code-bug' | 'environmental' | 'user-input' | 'unknown'
  confidence: number
  reason: string
}

export type RepairPlan = {
  diagnosis: string
  fixStrategy: string
  filesLikelyInvolved: string[]
  invariants: string[]
  regressionTestIdea: string
}

export type ReviewerVerdict = {
  approved: boolean
  regressionRisk: 'low' | 'medium' | 'high'
  reasons: string[]
  suggestedImprovements?: string
}

export type OrchestrationResult = {
  attempts: number
  status: 'fixed' | 'escalated' | 'not-code-fixable'
  branchName?: string
  commit?: string
  escalationReason?: string
  totalDurationMs: number
}
