export type ProjectId = string
export type StepId = string

export type StepKind = 'agent' | 'checkpoint'

export type StepStatus =
  | 'pending'
  | 'running'
  | 'awaiting-review'
  | 'approved'
  | 'rejected'
  | 'error'

export type StepDef = {
  id: StepId
  label: string
  kind: StepKind
  /** Human-numbered index in the concept doc; 0 for synthetic steps. */
  index: number
  /** Previous step that must be approved/completed before this runs. */
  dependsOn?: StepId
  /** For checkpoints: which agent step produced the output under review. */
  reviewsOutputOf?: StepId
  /** Agent implementation status: real Claude-backed, stubbed, or blocked on keys. */
  implementation: 'real' | 'stub' | 'blocked'
  /** Short description for UI. */
  description?: string
}

export const PIPELINE_STEPS: StepDef[] = [
  {
    id: 'agent-1',
    label: 'Company research',
    kind: 'agent',
    index: 1,
    implementation: 'real',
    description: 'Fetch the company website + socials, extract salient facts.'
  },
  {
    id: 'agent-2',
    label: 'Summary & analysis',
    kind: 'agent',
    index: 2,
    dependsOn: 'agent-1',
    implementation: 'real',
    description: 'Distill research into a campaign direction.'
  },
  {
    id: 'check-1',
    label: 'Checkpoint 1: research & analysis',
    kind: 'checkpoint',
    index: 0,
    dependsOn: 'agent-2',
    reviewsOutputOf: 'agent-2',
    implementation: 'real'
  },
  {
    id: 'agent-3',
    label: 'Script',
    kind: 'agent',
    index: 3,
    dependsOn: 'check-1',
    implementation: 'real',
    description: '30-second ad script with speaker, core line, CTA, on-screen text.'
  },
  {
    id: 'check-2',
    label: 'Checkpoint 2: script',
    kind: 'checkpoint',
    index: 0,
    dependsOn: 'agent-3',
    reviewsOutputOf: 'agent-3',
    implementation: 'real'
  },
  {
    id: 'agent-4',
    label: 'Storyboard',
    kind: 'agent',
    index: 4,
    dependsOn: 'check-2',
    implementation: 'real',
    description: 'Scene-by-scene plan with visuals + on-screen text + duration.'
  },
  {
    id: 'check-3',
    label: 'Checkpoint 3: storyboard',
    kind: 'checkpoint',
    index: 0,
    dependsOn: 'agent-4',
    reviewsOutputOf: 'agent-4',
    implementation: 'real'
  },
  {
    id: 'agent-5',
    label: 'Visuals',
    kind: 'agent',
    index: 5,
    dependsOn: 'check-3',
    implementation: 'stub',
    description: 'Select existing or AI-generate images/footage per scene.'
  },
  {
    id: 'check-4',
    label: 'Checkpoint 4: visuals',
    kind: 'checkpoint',
    index: 0,
    dependsOn: 'agent-5',
    reviewsOutputOf: 'agent-5',
    implementation: 'real'
  },
  {
    id: 'agent-6',
    label: 'Voice-over',
    kind: 'agent',
    index: 6,
    dependsOn: 'check-4',
    implementation: 'stub',
    description: 'Generate the narrated voice-over from the script.'
  },
  {
    id: 'check-5',
    label: 'Checkpoint 5: voice-over',
    kind: 'checkpoint',
    index: 0,
    dependsOn: 'agent-6',
    reviewsOutputOf: 'agent-6',
    implementation: 'real'
  },
  {
    id: 'agent-6a',
    label: 'Music',
    kind: 'agent',
    index: 6,
    dependsOn: 'check-4',
    implementation: 'stub',
    description: 'Generate music matched to the ad (Suno/Udio — never Sora for music).'
  },
  {
    id: 'check-5a',
    label: 'Checkpoint 5a: music',
    kind: 'checkpoint',
    index: 0,
    dependsOn: 'agent-6a',
    reviewsOutputOf: 'agent-6a',
    implementation: 'real'
  },
  {
    id: 'agent-7',
    label: 'Video generation',
    kind: 'agent',
    index: 7,
    dependsOn: 'check-5',
    implementation: 'stub',
    description: 'Produce video scenes from visuals + storyboard.'
  },
  {
    id: 'check-6',
    label: 'Checkpoint 6: video scenes',
    kind: 'checkpoint',
    index: 0,
    dependsOn: 'agent-7',
    reviewsOutputOf: 'agent-7',
    implementation: 'real'
  },
  {
    id: 'agent-8',
    label: 'Edit & finalize',
    kind: 'agent',
    index: 8,
    dependsOn: 'check-6',
    implementation: 'real',
    description: 'Assemble scenes + voice + music + on-screen text via FFmpeg.'
  },
  {
    id: 'check-7',
    label: 'Checkpoint 7: final cut',
    kind: 'checkpoint',
    index: 0,
    dependsOn: 'agent-8',
    reviewsOutputOf: 'agent-8',
    implementation: 'real'
  },
  {
    id: 'agent-9',
    label: 'Outreach draft',
    kind: 'agent',
    index: 9,
    dependsOn: 'check-7',
    implementation: 'stub',
    description:
      'Draft the personalised outreach email. Human-confirm-before-send until GDPR/TKG decision is made.'
  },
  {
    id: 'agent-10',
    label: 'Correspondence',
    kind: 'agent',
    index: 10,
    dependsOn: 'agent-9',
    implementation: 'stub',
    description: 'Manage follow-ups and replies. Dry-run until credentials + policy confirmed.'
  },
  {
    id: 'agent-11',
    label: 'Payment verification',
    kind: 'agent',
    index: 11,
    dependsOn: 'agent-10',
    implementation: 'blocked',
    description: 'Check if payment has arrived. Blocked on bank/payment-provider credentials.'
  },
  {
    id: 'agent-12',
    label: 'Delivery',
    kind: 'agent',
    index: 12,
    dependsOn: 'agent-11',
    implementation: 'stub',
    description: 'Release the finished video once payment is confirmed.'
  }
]

export function getStep(id: StepId): StepDef | undefined {
  return PIPELINE_STEPS.find((s) => s.id === id)
}

export function nextStep(id: StepId): StepDef | undefined {
  const idx = PIPELINE_STEPS.findIndex((s) => s.id === id)
  return idx >= 0 && idx < PIPELINE_STEPS.length - 1 ? PIPELINE_STEPS[idx + 1] : undefined
}

export function firstStep(): StepDef {
  return PIPELINE_STEPS[0]
}
