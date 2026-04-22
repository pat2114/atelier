import { invokeClaude } from '../llm/claudeCli'
import type { CompanyResearch } from '../../shared/types'
import type { PipelineContext } from './registry'

const SYSTEM_PROMPT = `You are a research agent for a small ad-production studio in Wien. You receive raw text scraped from a company's website and output a structured summary so the next agent can plan an advertising campaign.

Rules:
- Output only valid JSON matching the schema. No commentary, no markdown fences.
- Do not use tools.
- Write factual observations only. Mark anything uncertain by omitting it rather than guessing.
- Keep each field concise and specific — readable in one pass.
- All free-text fields should be in German if the company's own language appears to be German, otherwise English.
- If the revision feedback is present, address it explicitly in the new output.`

const SCHEMA = {
  type: 'object',
  required: [
    'companyName',
    'summary',
    'sells',
    'customers',
    'styleAndLanguage',
    'existingMediaCount',
    'usableMediaCount',
    'socialLinks'
  ],
  additionalProperties: false,
  properties: {
    companyName: { type: 'string' },
    summary: { type: 'string', maxLength: 600 },
    sells: { type: 'string', maxLength: 400 },
    customers: { type: 'string', maxLength: 400 },
    styleAndLanguage: { type: 'string', maxLength: 400 },
    existingMediaCount: { type: 'integer', minimum: 0 },
    usableMediaCount: { type: 'integer', minimum: 0 },
    socialLinks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['label', 'url'],
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          url: { type: 'string' }
        }
      }
    }
  }
}

async function fetchText(url: string, timeoutMs = 10_000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    if (!res.ok) return ''
    const html = await res.text()
    return stripHtml(html).slice(0, 20_000)
  } catch {
    return ''
  } finally {
    clearTimeout(timer)
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function runResearchAgent(ctx: PipelineContext): Promise<CompanyResearch> {
  const websiteText = await fetchText(ctx.websiteUrl)
  const scrapedHint = websiteText
    ? `Raw scraped text from ${ctx.websiteUrl} (truncated to 20k chars):\n${websiteText}`
    : `Could not fetch ${ctx.websiteUrl}. Use the company name "${ctx.companyName}" as your only input and return your best structured placeholder, marking uncertain fields briefly.`

  const feedbackNote = ctx.feedback
    ? `\n\nREVISION FEEDBACK from reviewer (address this explicitly in the new output): ${ctx.feedback}`
    : ''

  const prompt = `Company name: ${ctx.companyName}\nWebsite: ${ctx.websiteUrl}\n\n${scrapedHint}${feedbackNote}\n\nReturn the structured research JSON only.`

  const result = await invokeClaude<CompanyResearch>({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: SCHEMA,
    model: 'sonnet',
    timeoutMs: 60_000
  })

  if (!result.ok) {
    throw new Error(`research agent failed: ${result.error}`)
  }
  return result.data
}
