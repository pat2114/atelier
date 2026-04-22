import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Film } from 'lucide-react'
import type { VideoSceneOutput } from '@shared/types'
import { CheckpointFrame, StubBanner } from './CheckpointFrame'
import type { CheckpointPanelProps } from './types'

export function Checkpoint6Panel({
  projectState,
  onApprove,
  onRevise
}: CheckpointPanelProps): React.JSX.Element | null {
  const scenes = projectState.steps.find((s) => s.stepId === 'agent-7')?.output as
    | VideoSceneOutput[]
    | null
    | undefined
  if (!scenes) return null

  return (
    <CheckpointFrame
      eyebrow="Checkpoint 6"
      title="Video scenes review"
      description="Motion footage for each scene. Approve to move to the final edit."
      onApprove={onApprove}
      onRevise={onRevise}
    >
      <StubBanner>Stub — real video generation needs a Runway, Sora, or Veo API key.</StubBanner>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {scenes.map((scene) => (
          <Card key={scene.sceneOrder}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Scene {scene.sceneOrder}</CardTitle>
                <Badge variant="ghost">{scene.durationSeconds}s</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex aspect-video items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                <Film className="size-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </CheckpointFrame>
  )
}
