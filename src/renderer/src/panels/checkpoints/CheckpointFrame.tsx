import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Check, Loader2, RotateCcw } from 'lucide-react'

type CheckpointFrameProps = {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
  onApprove: () => Promise<void>
  onRevise: (feedback: string) => Promise<void>
}

export function CheckpointFrame({
  eyebrow,
  title,
  description,
  children,
  onApprove,
  onRevise
}: CheckpointFrameProps): React.JSX.Element {
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState<'approve' | 'revise' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const doApprove = async (): Promise<void> => {
    setBusy('approve')
    setError(null)
    try {
      await onApprove()
    } catch {
      setError('Something went wrong — try requesting a revision.')
    } finally {
      setBusy(null)
    }
  }

  const doRevise = async (): Promise<void> => {
    const trimmed = feedback.trim()
    if (!trimmed) return
    setBusy('revise')
    setError(null)
    try {
      await onRevise(trimmed)
      setFeedback('')
      setRevisionOpen(false)
    } catch {
      setError('Something went wrong — try again in a moment.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </header>

      <div className="flex flex-col gap-4">{children}</div>

      <Separator />

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {revisionOpen ? (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium">What should be reworked?</label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g. Tone should be more casual, less romantic."
            rows={4}
            disabled={busy !== null}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setRevisionOpen(false)
                setFeedback('')
              }}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button onClick={doRevise} disabled={!feedback.trim() || busy !== null}>
              {busy === 'revise' ? (
                <>
                  <Loader2 className="animate-spin" /> Sending…
                </>
              ) : (
                <>Send revision</>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setRevisionOpen(true)}
            disabled={busy !== null}
          >
            <RotateCcw /> Request revision
          </Button>
          <Button onClick={doApprove} disabled={busy !== null}>
            {busy === 'approve' ? (
              <>
                <Loader2 className="animate-spin" /> Approving…
              </>
            ) : (
              <>
                <Check /> Approve & continue
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap">{value}</div>
    </div>
  )
}

export function StubBanner({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
      {children}
    </div>
  )
}
