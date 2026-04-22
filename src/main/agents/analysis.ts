import { invokeClaude } from '../llm/claudeCli'
import type { CampaignAnalysis, CompanyResearch } from '../../shared/types'
import { requireOutput, type PipelineContext } from './registry'

const SYSTEM_PROMPT = `You are an analysis agent. You receive structured company research and decide a single, specific direction for a 30-second ad. Output only valid JSON matching the schema. Do not use tools.

Rules:
- coreMessage: one sentence that captures what makes this company specifically worth advertising.
- targetAudience: concrete people, not buzzwords. Age range, location, daily habit.
- adMessage: the one idea the ad will convey. Short enough to say in a breath.
- videoStyle: sensory and specific — materials, camera feel, editing rhythm.
- If revision feedback is present, incorporate it explicitly.
- Write in the same language the research is in.`

const SCHEMA = {
  type: 'object',
  required: ['coreMessage', 'targetAudience', 'adMessage', 'videoStyle'],
  additionalProperties: false,
  properties: {
    coreMessage: { type: 'string', maxLength: 300 },
    targetAudience: { type: 'string', maxLength: 300 },
    adMessage: { type: 'string', maxLength: 300 },
    videoStyle: { type: 'string', maxLength: 400 }
  }
}

export async function runAnalysisAgent(ctx: PipelineContext): Promise<CampaignAnalysis> {
  const research = requireOutput<CompanyResearch>(ctx, 'agent-1', 'company research')
  const feedbackNote = ctx.feedback ? `\n\nREVISION FEEDBACK: ${ctx.feedback}` : ''
  const prompt = `Company research:\n${JSON.stringify(research, null, 2)}${feedbackNote}\n\nReturn campaign analysis JSON only.`

  const result = await invokeClaude<CampaignAnalysis>({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: SCHEMA,
    model: 'sonnet',
    timeoutMs: 60_000
  })
  if (!result.ok) throw new Error(`analysis agent failed: ${result.error}`)
  return result.data
}
