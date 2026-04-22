import type { StepId } from '@shared/pipeline'
import type { ProjectState } from '@/pipeline/usePipeline'

export type CheckpointPanelProps = {
  checkpointId: StepId
  projectState: ProjectState
  onApprove: () => Promise<void>
  onRevise: (feedback: string) => Promise<void>
}
