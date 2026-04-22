import { invokeClaude } from '../llm/claudeCli'
import type { RepairPlan, ReviewerVerdict } from './types'

const SYSTEM_PROMPT = `You review a proposed code repair against the plan it was supposed to implement. You see the repair plan and the unified git diff. Decide whether to approve it.

Output only valid JSON matching the schema. Do not use tools.

Approve when ALL these hold:
- The diff addresses the diagnosis in the plan.
- The invariants in the plan still hold after the diff (no obvious regressions).
- A regression test file matching the plan's regressionTestIdea was created or updated.
- The diff is minimal — no unrelated refactors, no gratuitous edits.

Reject when ANY of:
- Invariants broken.
- No regression test added.
- Diff touches files outside the scope of the fix.
- Diff introduces obvious new bugs (bad types, missing imports, broken contracts).
- Diff is empty, trivial, or clearly doesn't address the root cause.

regressionRisk is your estimate of how likely this fix breaks something else: "low" (contained, tested), "medium" (touches shared code), "high" (touches core state or agent contracts).

reasons: 2–5 bullet-form sentences citing specific lines/files from the diff.`

const SCHEMA = {
  type: 'object',
  required: ['approved', 'regressionRisk', 'reasons'],
  additionalProperties: false,
  properties: {
    approved: { type: 'boolean' },
    regressionRisk: { type: 'string', enum: ['low', 'medium', 'high'] },
    reasons: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: { type: 'string', maxLength: 300 }
    },
    suggestedImprovements: { type: 'string', maxLength: 600 }
  }
}

export async function reviewRepair(input: {
  plan: RepairPlan
  diff: string
  filesChanged: string[]
}): Promise<ReviewerVerdict | null> {
  const prompt = `Repair plan:
${JSON.stringify(input.plan, null, 2)}

Files changed: ${input.filesChanged.join(', ') || '(none)'}

Unified diff (truncated to 40k chars):
${input.diff.slice(0, 40_000)}

Return the review verdict JSON only.`

  const result = await invokeClaude<ReviewerVerdict>({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: SCHEMA,
    model: 'sonnet',
    timeoutMs: 60_000
  })
  if (!result.ok) return null
  return result.data
}
