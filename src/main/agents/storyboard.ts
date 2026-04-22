import { invokeClaude } from '../llm/claudeCli'
import type { AdScript, CampaignAnalysis, CompanyResearch, Storyboard } from '../../shared/types'
import { requireOutput, type PipelineContext } from './registry'

const SYSTEM_PROMPT = `You are a storyboard agent. You break a 30-second ad script into 5–8 scenes. Output only valid JSON matching the schema. Do not use tools.

Rules:
- scenes[].durationSeconds should sum to 28–30.
- sceneText is the exact subset of the script's speakerText that plays during this scene (verbatim substring).
- visualDescription is sensory and specific — one sentence a camera operator or image-gen model could use directly.
- source: "existing" if the scene can plausibly use company-supplied imagery, "generated" otherwise. Err toward "generated" for speculative or abstract visuals.
- Scenes must be in the order they play.
- totalSeconds must equal the sum of durationSeconds.
- If revision feedback is present, apply it.`

const SCHEMA = {
  type: 'object',
  required: ['scenes', 'totalSeconds'],
  additionalProperties: false,
  properties: {
    totalSeconds: { type: 'number', minimum: 20, maximum: 35 },
    scenes: {
      type: 'array',
      minItems: 5,
      maxItems: 8,
      items: {
        type: 'object',
        required: ['order', 'sceneText', 'visualDescription', 'source', 'durationSeconds'],
        additionalProperties: false,
        properties: {
          order: { type: 'integer', minimum: 1 },
          sceneText: { type: 'string', maxLength: 400 },
          visualDescription: { type: 'string', maxLength: 400 },
          source: { type: 'string', enum: ['existing', 'generated'] },
          durationSeconds: { type: 'number', minimum: 1.5, maximum: 8 }
        }
      }
    }
  }
}

export async function runStoryboardAgent(ctx: PipelineContext): Promise<Storyboard> {
  const research = requireOutput<CompanyResearch>(ctx, 'agent-1', 'company research')
  const analysis = requireOutput<CampaignAnalysis>(ctx, 'agent-2', 'campaign analysis')
  const script = requireOutput<AdScript>(ctx, 'agent-3', 'script')
  const feedbackNote = ctx.feedback ? `\n\nREVISION FEEDBACK: ${ctx.feedback}` : ''
  const prompt = `Company: ${research.companyName}\nStyle: ${research.styleAndLanguage}\nExisting media available: ${research.usableMediaCount} usable of ${research.existingMediaCount}\n\nCampaign direction:\n${JSON.stringify(analysis, null, 2)}\n\nScript:\n${JSON.stringify(script, null, 2)}${feedbackNote}\n\nReturn storyboard JSON only.`

  const result = await invokeClaude<Storyboard>({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: SCHEMA,
    model: 'sonnet',
    timeoutMs: 60_000
  })
  if (!result.ok) throw new Error(`storyboard agent failed: ${result.error}`)
  return result.data
}
