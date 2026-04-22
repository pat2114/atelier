import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CampaignAnalysis, CompanyResearch } from '@shared/types'
import { CheckpointFrame, Field } from './CheckpointFrame'
import type { CheckpointPanelProps } from './types'

export function Checkpoint1Panel({
  projectState,
  onApprove,
  onRevise
}: CheckpointPanelProps): React.JSX.Element | null {
  const research = projectState.steps.find((s) => s.stepId === 'agent-1')?.output as
    | CompanyResearch
    | null
    | undefined
  const analysis = projectState.steps.find((s) => s.stepId === 'agent-2')?.output as
    | CampaignAnalysis
    | null
    | undefined

  if (!research || !analysis) return null

  return (
    <CheckpointFrame
      eyebrow="Checkpoint 1"
      title="Research & analysis review"
      description="I've looked at the company and drafted a campaign direction. Approve to continue to the script, or ask for a revision."
      onApprove={onApprove}
      onRevise={onRevise}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{research.companyName}</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <a
              href={projectState.project.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
            >
              {projectState.project.websiteUrl}
            </a>
            <span>·</span>
            <span>
              {research.usableMediaCount} of {research.existingMediaCount} media items usable
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Summary" value={research.summary} />
          <Field label="What they sell" value={research.sells} />
          <Field label="Customers" value={research.customers} />
          <Field label="Style & language" value={research.styleAndLanguage} />
          {research.socialLinks.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Socials
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {research.socialLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-accent hover:text-accent-foreground"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proposed campaign direction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Core message" value={analysis.coreMessage} />
          <Field label="Target audience" value={analysis.targetAudience} />
          <Field label="Ad message" value={analysis.adMessage} />
          <Field label="Video style" value={analysis.videoStyle} />
        </CardContent>
      </Card>
    </CheckpointFrame>
  )
}
