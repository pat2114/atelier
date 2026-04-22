import { invokeClaude, type ClaudeCliResult } from './claudeCli'
import { PIPELINE_STEPS } from '../../shared/pipeline'
import { getProject, listSteps } from '../db'

export type HelpMessage = {
  role: 'user' | 'assistant'
  text: string
}

const SYSTEM_PROMPT = `You are a helpful co-pilot for a user of "Atelier" — a desktop app that produces 30-second advertising videos for small businesses through a guided, checkpoint-driven workflow.

The user is a filmmaker, NOT a developer. They're using the app to produce ads. Answer as a knowledgeable collaborator would.

About the app:
- 12 agents run in sequence: company research → summary → script → storyboard → visuals → voice-over → music → video generation → edit → outreach → correspondence → payment → delivery.
- After each content-producing step there is a human review checkpoint (7 in total). The user clicks "Approve" to advance or "Request revision" with a short feedback note to have the agent redo that step.
- Media-generating steps (visuals, voice, music, video) only produce placeholder media until the user adds their API keys (Replicate / ElevenLabs / Suno / Runway) in Settings.
- The chat at the bottom of the main window adjusts the UI's look (colors, spacing, themes) — that's separate from you.

What the user asks you:
- How to write good revision feedback for a step that isn't quite right.
- Whether an agent's output is plausible / strong / weak — give honest opinions.
- What each agent does, in plain language.
- How to prompt better (e.g. "what should I tell the storyboard agent to make it more kinetic?").
- Tactics for the actual ad: tone, target audience, pacing, openings that hook.
- When to approve vs request revision.

What you do NOT do:
- You do NOT edit code, files, or app settings.
- You do NOT call tools. You ONLY reply in plain text.
- You do NOT explain implementation details, agent IDs, or technical errors.
- You do NOT ask for API keys — that's in Settings.

Style:
- Short, practical, specific. Prefer 2–4 sentences. Longer only when the user asks for depth.
- Concrete suggestions over general advice. If asked "how should the script sound?" don't say "warm and engaging" — suggest an opening line.
- Match the user's language. If they write German, reply in German. If English, English.
- No emojis unless the user uses them first.`

function buildContext(projectId: string | null): string {
  if (!projectId) {
    return 'The user has not started a project yet.'
  }
  const project = getProject(projectId)
  if (!project) return 'No project loaded.'
  const steps = listSteps(projectId)
  const stepsMap = new Map(steps.map((s) => [s.stepId, s]))
  const currentDef = PIPELINE_STEPS.find((s) => s.id === project.currentStepId)
  const currentRecord = stepsMap.get(project.currentStepId)

  const lines: string[] = []
  lines.push(`Project company: ${project.companyName}`)
  lines.push(`Company website: ${project.websiteUrl}`)
  lines.push(
    `Current step: ${currentDef?.label ?? project.currentStepId} (status: ${currentRecord?.status ?? 'unknown'})`
  )

  // Include the output of the step currently under review, if any
  if (currentDef?.kind === 'checkpoint' && currentDef.reviewsOutputOf) {
    const reviewed = stepsMap.get(currentDef.reviewsOutputOf)
    if (reviewed?.output) {
      lines.push(`Output under review:\n${JSON.stringify(reviewed.output, null, 2)}`)
    }
  }

  // Include the latest revision feedback so the help agent knows what the user just flagged
  if (currentRecord?.feedback) {
    lines.push(`Last revision feedback: ${currentRecord.feedback}`)
  }

  return lines.join('\n')
}

export async function askHelp(input: {
  projectId: string | null
  messages: HelpMessage[]
  userMessage: string
}): Promise<ClaudeCliResult<string>> {
  const context = buildContext(input.projectId)
  const historyText =
    input.messages.length > 0
      ? input.messages
          .map((m) => (m.role === 'user' ? `User: ${m.text}` : `Assistant: ${m.text}`))
          .join('\n\n')
      : '(no prior messages)'

  const prompt = `Current app context:
${context}

Conversation so far:
${historyText}

New user message:
${input.userMessage}

Reply as the co-pilot described in the system prompt. Plain text only.`

  return invokeClaude<string>({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    model: 'sonnet',
    timeoutMs: 45_000
  })
}
