import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Music } from 'lucide-react'
import type { MusicOutput } from '@shared/types'
import { CheckpointFrame, Field, StubBanner } from './CheckpointFrame'
import type { CheckpointPanelProps } from './types'

export function Checkpoint5aPanel({
  projectState,
  onApprove,
  onRevise
}: CheckpointPanelProps): React.JSX.Element | null {
  const music = projectState.steps.find((s) => s.stepId === 'agent-6a')?.output as
    | MusicOutput
    | null
    | undefined
  if (!music) return null

  return (
    <CheckpointFrame
      eyebrow="Checkpoint 5a"
      title="Music review"
      description="A music bed matched to the ad. Approve to move on."
      onApprove={onApprove}
      onRevise={onRevise}
    >
      <StubBanner>Stub — real music generation needs a Suno or Udio API key.</StubBanner>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Music className="size-4" />
              {music.style || 'Soundtrack'}
            </CardTitle>
            <Badge variant="ghost">{music.durationSeconds}s</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {music.prompt && <Field label="Prompt" value={music.prompt} />}
          {music.style && <Field label="Style" value={music.style} />}
        </CardContent>
      </Card>
    </CheckpointFrame>
  )
}
