import { cn } from '@/lib/utils'
import { PIPELINE_STEPS } from '@shared/pipeline'
import type { StepDef, StepStatus } from '@shared/pipeline'
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  CircleDot,
  Settings,
  HelpCircle
} from 'lucide-react'
import { usePipeline } from '@/pipeline/usePipeline'
import { Button } from '@/components/ui/button'
import { useSetup } from '@/setup/useSetup'

export function PipelinePanel(): React.JSX.Element {
  const { state } = usePipeline()
  const { isSettingsOpen, toggleSettings } = useSetup()
  const project = state?.project ?? null

  const stepStatusById = new Map<string, StepStatus>()
  for (const record of state?.steps ?? []) stepStatusById.set(record.stepId, record.status)

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isSettingsOpen ? 'Settings' : 'Pipeline'}
          </div>
          <div className="truncate text-sm font-semibold">
            {isSettingsOpen
              ? 'Dependencies & keys'
              : project
                ? project.companyName
                : 'No project yet'}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => window.api?.help.open()}
            aria-label="Open co-pilot"
            title="Open co-pilot"
          >
            <HelpCircle />
          </Button>
          <Button
            variant={isSettingsOpen ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={toggleSettings}
            aria-label={isSettingsOpen ? 'Close settings' : 'Open settings'}
            aria-pressed={isSettingsOpen}
          >
            <Settings />
          </Button>
        </div>
      </div>

      {isSettingsOpen ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-muted-foreground">
          Settings open — use the gear icon above to return.
        </div>
      ) : project ? (
        <div className="flex-1 overflow-y-auto py-2">
          {PIPELINE_STEPS.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              status={stepStatusById.get(step.id) ?? 'pending'}
              isActive={project.currentStepId === step.id}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-muted-foreground">
          No project yet — create one to begin.
        </div>
      )}
    </div>
  )
}

function StepRow({
  step,
  status,
  isActive
}: {
  step: StepDef
  status: StepStatus
  isActive: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 text-sm transition-colors',
        isActive && 'bg-accent',
        step.kind === 'checkpoint' && 'font-medium'
      )}
    >
      <StatusIcon status={status} isActive={isActive} />
      <span
        className={cn(
          'truncate',
          status === 'pending' && 'text-muted-foreground',
          status === 'approved' &&
            'text-muted-foreground line-through decoration-muted-foreground/40'
        )}
      >
        {step.label}
      </span>
    </div>
  )
}

function StatusIcon({
  status,
  isActive
}: {
  status: StepStatus
  isActive: boolean
}): React.JSX.Element {
  const className = 'size-4 shrink-0'
  switch (status) {
    case 'approved':
      return <CheckCircle2 className={cn(className, 'text-muted-foreground')} />
    case 'running':
      return <Loader2 className={cn(className, 'animate-spin text-primary')} />
    case 'awaiting-review':
      return <AlertCircle className={cn(className, 'text-primary')} />
    case 'rejected':
      return <AlertCircle className={cn(className, 'text-destructive')} />
    case 'error':
      return <AlertCircle className={cn(className, 'text-destructive')} />
    case 'pending':
    default:
      return isActive ? (
        <CircleDot className={cn(className, 'text-primary')} />
      ) : (
        <Circle className={cn(className, 'text-muted-foreground/40')} />
      )
  }
}
