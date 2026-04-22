import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AdScript } from '@shared/types'
import { CheckpointFrame } from './CheckpointFrame'
import type { CheckpointPanelProps } from './types'

export function Checkpoint2Panel({
  projectState,
  onApprove,
  onRevise
}: CheckpointPanelProps): React.JSX.Element | null {
  const script = projectState.steps.find((s) => s.stepId === 'agent-3')?.output as
    | AdScript
    | null
    | undefined
  if (!script) return null

  return (
    <CheckpointFrame
      eyebrow="Checkpoint 2"
      title="Script review"
      description="Here's the 30-second ad script. Approve to move to the storyboard, or ask for a revision."
      onApprove={onApprove}
      onRevise={onRevise}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spoken narration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{script.speakerText}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Core line</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium leading-snug text-foreground">{script.coreLine}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Call to action</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base font-medium text-primary">{script.callToAction}</p>
        </CardContent>
      </Card>

      {script.onScreenText.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">On-screen text</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {script.onScreenText.map((text, i) => (
                <Badge key={`${i}-${text}`} variant="secondary">
                  {text}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </CheckpointFrame>
  )
}
