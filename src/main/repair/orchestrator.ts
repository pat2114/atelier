import { classifyError } from './classifier'
import { planRepair } from './planner'
import { attemptRepair } from './repair'
import { reviewRepair } from './reviewer'
import { runTypecheck } from './testRunner'
import {
  abandonBranch,
  createRepairBranch,
  discardWorkingChanges,
  getChangedFiles,
  getCurrentBranch,
  getDiff,
  isGitRepo,
  stageAllAndCommit
} from './gitSandbox'
import type {
  ErrorClassification,
  OrchestrationResult,
  RepairErrorReport,
  RepairPlan,
  ReviewerVerdict
} from './types'

export type OrchestratorOptions = {
  repoRoot: string
  maxAttempts?: number
}

type StepRecord = {
  stage: string
  ok: boolean
  notes?: string
  durationMs?: number
}

export type OrchestrationTrace = {
  errorId: string
  result: OrchestrationResult
  classification?: ErrorClassification
  plan?: RepairPlan
  verdicts: ReviewerVerdict[]
  steps: StepRecord[]
}

export async function runRepairLoop(
  report: RepairErrorReport,
  options: OrchestratorOptions
): Promise<OrchestrationTrace> {
  const started = Date.now()
  const steps: StepRecord[] = []
  const verdicts: ReviewerVerdict[] = []

  if (!isGitRepo(options.repoRoot)) {
    return {
      errorId: report.id,
      verdicts,
      steps,
      result: {
        attempts: 0,
        status: 'escalated',
        escalationReason: 'repo is not a git repository — cannot sandbox or roll back safely',
        totalDurationMs: Date.now() - started
      }
    }
  }

  const classification = await classifyError(report)
  steps.push({ stage: 'classify', ok: true, notes: classification.category })

  if (classification.category !== 'code-bug' || classification.confidence < 0.7) {
    return {
      errorId: report.id,
      classification,
      verdicts,
      steps,
      result: {
        attempts: 0,
        status: 'not-code-fixable',
        escalationReason: classification.reason,
        totalDurationMs: Date.now() - started
      }
    }
  }

  const plan = await planRepair(report)
  steps.push({ stage: 'plan', ok: plan !== null })
  if (!plan) {
    return {
      errorId: report.id,
      classification,
      verdicts,
      steps,
      result: {
        attempts: 0,
        status: 'escalated',
        escalationReason: 'planner failed to produce a plan',
        totalDurationMs: Date.now() - started
      }
    }
  }

  const baseBranch = await getCurrentBranch(options.repoRoot)
  const branchName = await createRepairBranch(options.repoRoot, report.id)
  steps.push({ stage: 'branch', ok: true, notes: branchName })

  const maxAttempts = options.maxAttempts ?? 3
  let lastFeedback: string | undefined
  let commit: string | undefined
  let attempts = 0

  try {
    for (attempts = 1; attempts <= maxAttempts; attempts++) {
      await discardWorkingChanges(options.repoRoot)

      const attempt = await attemptRepair({
        plan,
        report,
        sandboxCwd: options.repoRoot,
        priorFeedback: lastFeedback
      })
      steps.push({
        stage: `attempt-${attempts}`,
        ok: attempt.success,
        notes: attempt.success ? attempt.summary : attempt.error
      })
      if (!attempt.success) {
        lastFeedback = `Previous attempt did not complete: ${attempt.error ?? 'unknown'}.`
        continue
      }

      const diff = await getDiff(options.repoRoot, baseBranch)
      const filesChanged = await getChangedFiles(options.repoRoot, baseBranch)
      if (!diff.trim() || filesChanged.length === 0) {
        lastFeedback = 'Previous attempt produced no diff. You MUST edit source files to fix this.'
        steps.push({ stage: `attempt-${attempts}-diff`, ok: false, notes: 'empty diff' })
        continue
      }

      const typecheck = await runTypecheck(options.repoRoot)
      steps.push({
        stage: `attempt-${attempts}-typecheck`,
        ok: typecheck.ok,
        durationMs: typecheck.durationMs
      })
      if (!typecheck.ok) {
        lastFeedback = `Typecheck failed after your edit. Output tail:\n${tail(typecheck.stdout + '\n' + typecheck.stderr, 1500)}`
        continue
      }

      const verdict = await reviewRepair({ plan, diff, filesChanged })
      if (!verdict) {
        lastFeedback = 'Reviewer failed to produce a verdict. Try a cleaner, more focused diff.'
        steps.push({ stage: `attempt-${attempts}-review`, ok: false, notes: 'reviewer null' })
        continue
      }
      verdicts.push(verdict)
      steps.push({
        stage: `attempt-${attempts}-review`,
        ok: verdict.approved,
        notes: verdict.reasons.join(' | ')
      })

      if (!verdict.approved) {
        lastFeedback = `Reviewer rejected the fix. Reasons:\n- ${verdict.reasons.join('\n- ')}\n${verdict.suggestedImprovements ? `Suggestions: ${verdict.suggestedImprovements}` : ''}`
        continue
      }

      commit = await stageAllAndCommit(
        options.repoRoot,
        `repair: ${plan.diagnosis.slice(0, 72)}\n\nerrorId: ${report.id}\nregressionRisk: ${verdict.regressionRisk}`
      )
      steps.push({ stage: 'commit', ok: true, notes: commit })

      return {
        errorId: report.id,
        classification,
        plan,
        verdicts,
        steps,
        result: {
          attempts,
          status: 'fixed',
          branchName,
          commit,
          totalDurationMs: Date.now() - started
        }
      }
    }

    // Exhausted attempts — abandon the branch and escalate.
    await abandonBranch(options.repoRoot, branchName, baseBranch)
    return {
      errorId: report.id,
      classification,
      plan,
      verdicts,
      steps,
      result: {
        attempts,
        status: 'escalated',
        escalationReason: `${maxAttempts} repair attempts exhausted — see trace for reviewer feedback`,
        totalDurationMs: Date.now() - started
      }
    }
  } catch (err) {
    await abandonBranch(options.repoRoot, branchName, baseBranch).catch(() => {
      /* already clean */
    })
    return {
      errorId: report.id,
      classification,
      plan,
      verdicts,
      steps,
      result: {
        attempts,
        status: 'escalated',
        escalationReason: `orchestrator error: ${(err as Error).message}`,
        totalDurationMs: Date.now() - started
      }
    }
  }
}

function tail(s: string, n: number): string {
  return s.length > n ? s.slice(s.length - n) : s
}
