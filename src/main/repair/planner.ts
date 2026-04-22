import { invokeClaude } from '../llm/claudeCli'
import type { RepairErrorReport, RepairPlan } from './types'

const SYSTEM_PROMPT = `You plan code repairs for a desktop app. Given a runtime error report plus recent logs, you produce a short, concrete repair spec. You do NOT write the fix. You only describe what the fix must accomplish so a separate repair agent can implement it and a reviewer agent can validate it.

Output only valid JSON matching the schema. Do not use tools.

Rules:
- diagnosis: one sentence describing the root cause as best you can infer. Say "likely" or "probably" when uncertain — the repair agent will verify.
- fixStrategy: 2–4 sentences describing the intended approach. Concrete but not prescriptive about exact code.
- filesLikelyInvolved: absolute or repo-relative paths of files the repair agent should look at first. Empty array if you can't narrow it down.
- invariants: 2–5 bullet-form invariants that must still hold after the fix (e.g. "The pipeline's approve button still advances the current step"). These are what the reviewer checks against.
- regressionTestIdea: 1 sentence describing a test that would reproduce this error and fail before the fix, pass after. The repair agent will write this test before editing production code.`

const SCHEMA = {
  type: 'object',
  required: ['diagnosis', 'fixStrategy', 'filesLikelyInvolved', 'invariants', 'regressionTestIdea'],
  additionalProperties: false,
  properties: {
    diagnosis: { type: 'string', maxLength: 400 },
    fixStrategy: { type: 'string', maxLength: 800 },
    filesLikelyInvolved: {
      type: 'array',
      items: { type: 'string', maxLength: 200 },
      maxItems: 10
    },
    invariants: {
      type: 'array',
      minItems: 2,
      maxItems: 8,
      items: { type: 'string', maxLength: 200 }
    },
    regressionTestIdea: { type: 'string', maxLength: 300 }
  }
}

export async function planRepair(report: RepairErrorReport): Promise<RepairPlan | null> {
  const prompt = `Error: ${report.message}
${report.stack ? `\nStack:\n${report.stack}` : ''}
${report.stepId ? `\nPipeline step: ${report.stepId}` : ''}
${report.context ? `\nContext: ${JSON.stringify(report.context, null, 2)}` : ''}
${report.logs && report.logs.length > 0 ? `\nRecent logs:\n${report.logs.slice(-40).join('\n')}` : ''}

Produce the repair plan JSON only.`

  const result = await invokeClaude<RepairPlan>({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: SCHEMA,
    model: 'sonnet',
    timeoutMs: 45_000
  })
  if (!result.ok) return null
  return result.data
}
