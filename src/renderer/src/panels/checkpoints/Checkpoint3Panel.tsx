import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Storyboard } from '@shared/types'
import { CheckpointFrame, Field } from './CheckpointFrame'
import type { CheckpointPanelProps } from './types'

export function Checkpoint3Panel({
  projectState,
  onApprove,
  onRevise
}: CheckpointPanelProps): React.JSX.Element | null {
  const storyboard = projectState.steps.find((s) => s.stepId === 'agent-4')?.output as
    | Storyboard
    | null
    | undefined
  if (!storyboard) return null

  return (
    <CheckpointFrame
      eyebrow="Checkpoint 3"
      title="Storyboard review"
      description={`A scene-by-scene plan totalling ${storyboard.totalSeconds}s. Approve to move to visuals, or request a revision.`}
      onApprove={onApprove}
      onRevise={onRevise}
    >
      <div className="flex flex-col gap-3">
        {storyboard.scenes.map((scene) => (
          <Card key={scene.order}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Scene {scene.order}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={scene.source === 'existing' ? 'secondary' : 'outline'}>
                    {scene.source === 'existing' ? 'Existing footage' : 'Generated'}
                  </Badge>
                  <Badge variant="ghost">{scene.durationSeconds}s</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Scene text" value={scene.sceneText} />
              <Field label="Visual description" value={scene.visualDescription} />
            </CardContent>
          </Card>
        ))}
      </div>
    </CheckpointFrame>
  )
}
