import { invokeClaude, type ClaudeCliResult } from './claudeCli'

export type TokenState = {
  mode: 'light' | 'dark'
  density: number
  fontScale: number
  radius: number
  accentHue: number
  accentChroma: number
  backgroundHue: number
  backgroundChroma: number
}

export type ThemeAgentResult = {
  reply: string
  changes: Partial<TokenState>
}

const SYSTEM_PROMPT = `You are a design-token agent inside a desktop app. You translate natural-language aesthetic requests into token changes and reply in one short sentence. Output only valid JSON matching the schema. Do not use any tools. Do not ask clarifying questions — pick a sensible interpretation.

Available tokens (all optional — only include what you change):
- mode: "light" | "dark"
- density: 0.6–1.6 (1 = default; lower = tighter, higher = roomier spacing)
- fontScale: 0.8–1.4 (1 = default)
- radius: 0–1.5 rem (0 = sharp, 0.625 = default, higher = rounder)
- accentHue: 0–360 degrees (OKLCH hue; 0=red, 30=orange, 90=yellow-green, 150=green, 200=cyan, 240=blue, 280=violet, 320=magenta, 350=pink)
- accentChroma: 0–0.2 (0 = no accent tint, higher = saturated)
- backgroundHue: 0–360 (same OKLCH scale as accentHue, applies to background + cards + muted + borders)
- backgroundChroma: 0–0.2 (0 = neutral gray/white background, higher = tinted background). Use 0.02–0.06 for a subtle tint, 0.08–0.15 for a vivid tinted background.

Rules:
- When the user says "make it <color>" without specifying accent vs background, apply backgroundHue + backgroundChroma (tints the whole app) and optionally match accentHue for coherence.
- When the user says "accent <color>" or "highlight", apply accentHue + accentChroma only.
- Keep replies under 15 words. Plain, no emoji unless the user uses them first.
- Never exceed token ranges. Never invent new token names.`

const RESPONSE_SCHEMA = {
  type: 'object',
  required: ['reply', 'changes'],
  additionalProperties: false,
  properties: {
    reply: { type: 'string', maxLength: 200 },
    changes: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mode: { type: 'string', enum: ['light', 'dark'] },
        density: { type: 'number', minimum: 0.6, maximum: 1.6 },
        fontScale: { type: 'number', minimum: 0.8, maximum: 1.4 },
        radius: { type: 'number', minimum: 0, maximum: 1.5 },
        accentHue: { type: 'number', minimum: 0, maximum: 360 },
        accentChroma: { type: 'number', minimum: 0, maximum: 0.2 },
        backgroundHue: { type: 'number', minimum: 0, maximum: 360 },
        backgroundChroma: { type: 'number', minimum: 0, maximum: 0.2 }
      }
    }
  }
}

export async function interpretTheme(
  userInput: string,
  current: TokenState
): Promise<ClaudeCliResult<ThemeAgentResult>> {
  const prompt = `Current token state:\n${JSON.stringify(current, null, 2)}\n\nUser request: ${userInput}\n\nReturn JSON only.`
  return invokeClaude<ThemeAgentResult>({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: RESPONSE_SCHEMA,
    model: 'sonnet',
    timeoutMs: 30_000
  })
}
