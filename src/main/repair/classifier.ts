import { invokeClaude } from '../llm/claudeCli'
import type { ErrorClassification, RepairErrorReport } from './types'

const SYSTEM_PROMPT = `You classify runtime errors from a desktop app so a repair system knows where to route them. Output only valid JSON matching the schema. Do not use tools.

Categories:
- "code-bug": the app's own code has a defect — null deref, bad type, wrong logic, failed assertion, bad IPC contract. These can be fixed by editing source.
- "environmental": the world around the app failed — API down, network unreachable, rate limit hit, disk full, missing OS dependency, subprocess not found, permission denied. Cannot be fixed by editing source.
- "user-input": the user gave bad data — invalid URL, empty required field, unreadable input. Fixed by UI validation or user retry, not by logic changes.
- "unknown": confidence too low to commit.

Rules:
- Confidence is 0.0–1.0. Return < 0.7 as "unknown" unless the signal is unambiguous.
- "reason" is one short sentence a non-developer could read.`

const SCHEMA = {
  type: 'object',
  required: ['category', 'confidence', 'reason'],
  additionalProperties: false,
  properties: {
    category: { type: 'string', enum: ['code-bug', 'environmental', 'user-input', 'unknown'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reason: { type: 'string', maxLength: 200 }
  }
}

export async function classifyError(report: RepairErrorReport): Promise<ErrorClassification> {
  const prompt = `Error message: ${report.message}
${report.stack ? `Stack:\n${report.stack}\n` : ''}
${report.stepId ? `Pipeline step: ${report.stepId}\n` : ''}
${report.logs && report.logs.length > 0 ? `Recent logs:\n${report.logs.slice(-20).join('\n')}\n` : ''}
Return classification JSON only.`

  const result = await invokeClaude<ErrorClassification>({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: SCHEMA,
    model: 'sonnet',
    timeoutMs: 30_000
  })
  if (!result.ok) {
    return {
      category: 'unknown',
      confidence: 0,
      reason: `Classifier failed: ${result.error}`
    }
  }
  return result.data
}
