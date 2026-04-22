import { invokeClaude } from '../llm/claudeCli'
import type { AdScript, CampaignAnalysis, CompanyResearch } from '../../shared/types'
import { requireOutput, type PipelineContext } from './registry'

const SYSTEM_PROMPT = `You are a script agent for a 30-second advertising spot. Write the exact words the narrator will say. Output only valid JSON matching the schema. Do not use tools.

Rules:
- speakerText: the full narration. Spoken length should be 22–28 seconds at natural pacing (roughly 55–75 words in the research's language).
- coreLine: the one sentence within the speakerText that carries the ad's message. Must also appear verbatim inside speakerText.
- callToAction: a single short sentence at the end. Must also be inside speakerText.
- onScreenText: 3–5 short phrases (<= 4 words each) that will appear as overlays.
- Tone matches the company's style.
- If revision feedback is present, apply it.`

const SCHEMA = {
  type: 'object',
  required: ['speakerText', 'coreLine', 'callToAction', 'onScreenText'],
  additionalProperties: false,
  properties: {
    speakerText: { type: 'string', minLength: 50, maxLength: 1200 },
    coreLine: { type: 'string', minLength: 10, maxLength: 200 },
    callToAction: { type: 'string', minLength: 5, maxLength: 120 },
    onScreenText: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: { type: 'string', maxLength: 40 }
    }
  }
}

export async function runScriptAgent(ctx: PipelineContext): Promise<AdScript> {
  const research = requireOutput<CompanyResearch>(ctx, 'agent-1', 'company research')
  const analysis = requireOutput<CampaignAnalysis>(ctx, 'agent-2', 'campaign analysis')
  const feedbackNote = ctx.feedback ? `\n\nREVISION FEEDBACK: ${ctx.feedback}` : ''
  const prompt = `Company: ${research.companyName}\nSells: ${research.sells}\nCustomers: ${research.customers}\nStyle & language: ${research.styleAndLanguage}\n\nCampaign direction:\n${JSON.stringify(analysis, null, 2)}${feedbackNote}\n\nReturn ad script JSON only.`

  const result = await invokeClaude<AdScript>({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: SCHEMA,
    model: 'sonnet',
    timeoutMs: 60_000
  })
  if (!result.ok) throw new Error(`script agent failed: ${result.error}`)
  return result.data
}
