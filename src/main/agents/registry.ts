import type { StepDef, StepId } from '../../shared/pipeline'
import { getProject, listSteps } from '../db'
import type { StepRecord } from '../../shared/types'
import { runResearchAgent } from './research'
import { runAnalysisAgent } from './analysis'
import { runScriptAgent } from './script'
import { runStoryboardAgent } from './storyboard'
import { runEditAgent } from './edit'
import { runVisualsStub, runVoiceStub, runMusicStub, runVideoGenStub } from './mediaStubs'
import { runOutreachStub, runCorrespondenceStub, runDeliveryStub } from './outreachStubs'

export type PipelineContext = {
  projectId: string
  companyName: string
  websiteUrl: string
  steps: Record<StepId, StepRecord>
  feedback: string | null
}

function buildContext(projectId: string): PipelineContext {
  const project = getProject(projectId)
  if (!project) throw new Error(`project not found: ${projectId}`)
  const stepsArr = listSteps(projectId)
  const stepsMap: Record<string, StepRecord> = {}
  for (const s of stepsArr) stepsMap[s.stepId] = s
  return {
    projectId,
    companyName: project.companyName,
    websiteUrl: project.websiteUrl,
    steps: stepsMap,
    feedback: null
  }
}

export async function runAgent(step: StepDef, projectId: string): Promise<unknown> {
  const ctx = buildContext(projectId)
  const feedback = ctx.steps[step.id]?.feedback ?? null
  ctx.feedback = feedback

  switch (step.id) {
    case 'agent-1':
      return runResearchAgent(ctx)
    case 'agent-2':
      return runAnalysisAgent(ctx)
    case 'agent-3':
      return runScriptAgent(ctx)
    case 'agent-4':
      return runStoryboardAgent(ctx)
    case 'agent-5':
      return runVisualsStub(ctx)
    case 'agent-6':
      return runVoiceStub(ctx)
    case 'agent-6a':
      return runMusicStub(ctx)
    case 'agent-7':
      return runVideoGenStub(ctx)
    case 'agent-8':
      return runEditAgent(ctx)
    case 'agent-9':
      return runOutreachStub(ctx)
    case 'agent-10':
      return runCorrespondenceStub(ctx)
    case 'agent-11':
      throw new Error(
        'Payment verification is blocked: needs bank/payment-provider credentials you haven\'t connected yet.'
      )
    case 'agent-12':
      return runDeliveryStub(ctx)
    default:
      throw new Error(`no agent implementation for step: ${step.id}`)
  }
}

export function requireOutput<T>(ctx: PipelineContext, stepId: StepId, label: string): T {
  const rec = ctx.steps[stepId]
  if (!rec || rec.output === null || rec.output === undefined) {
    throw new Error(`${label} not available — step ${stepId} has no output yet`)
  }
  return rec.output as T
}
