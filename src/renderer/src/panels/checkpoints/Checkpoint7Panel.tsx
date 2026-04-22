import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Film } from 'lucide-react'
import type { FinalCut } from '@shared/types'
import { CheckpointFrame, StubBanner } from './CheckpointFrame'
import type { CheckpointPanelProps } from './types'

export function Checkpoint7Panel({
  projectState,
  onApprove,
  onRevise
}: CheckpointPanelProps): React.JSX.Element | null {
  const cut = projectState.steps.find((s) => s.stepId === 'agent-8')?.output as
    | FinalCut
    | null
    | undefined
  if (!cut) return null

  return (
    <CheckpointFrame
      eyebrow="Checkpoint 7"
      title="Final cut review"
      description="The finished video, assembled with voice, music, and on-screen text. Approve to prepare the outreach draft."
      onApprove={onApprove}
      onRevise={onRevise}
    >
      <StubBanner>Rendering needs FFmpeg installed locally.</StubBanner>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Final cut</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{cut.format}</Badge>
              <Badge variant="ghost">{cut.durationSeconds}s</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex aspect-video items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
            <Film className="size-8" />
          </div>
        </CardContent>
      </Card>
    </CheckpointFrame>
  )
}
