import { useState, type ReactNode } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  RotateCw,
  Trash2,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  useSetup,
  type CheckResult,
  type CheckStatus,
  type KeyMeta,
  type KeyStatus,
  type KeySlot
} from './useSetup'

function openExternal(url: string): void {
  try {
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch {
    // ignore
  }
}

function StatusIcon({
  status,
  pending
}: {
  status: CheckStatus
  pending?: boolean
}): React.JSX.Element {
  const className = 'size-5 shrink-0'
  if (pending) return <Circle className={cn(className, 'text-muted-foreground/40')} />
  switch (status) {
    case 'ok':
      return <CheckCircle2 className={cn(className, 'text-emerald-600 dark:text-emerald-400')} />
    case 'warning':
      return <AlertCircle className={cn(className, 'text-amber-600 dark:text-amber-400')} />
    case 'missing':
      return <XCircle className={cn(className, 'text-destructive')} />
    case 'error':
      return <AlertCircle className={cn(className, 'text-destructive')} />
    default:
      return <Circle className={cn(className, 'text-muted-foreground/40')} />
  }
}

function CheckCard({
  check,
  tone
}: {
  check: CheckResult
  tone: 'required' | 'optional'
}): React.JSX.Element {
  const isProblem = check.status !== 'ok'
  const borderTone =
    tone === 'optional' && isProblem
      ? 'border-amber-500/40 bg-amber-500/10'
      : 'border-border bg-card'

  return (
    <div className={cn('rounded-lg border px-4 py-3', borderTone)}>
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <StatusIcon status={check.status} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">{check.label}</div>
            {tone === 'optional' && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                Optional
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{check.detail}</div>
          {isProblem && <CheckActions check={check} tone={tone} />}
        </div>
      </div>
    </div>
  )
}

function InstallProgressInline({ id }: { id: 'claude-code' | 'ffmpeg' }): React.JSX.Element | null {
  const { installing, installLog } = useSetup()
  if (installing !== id) return null
  const tail = installLog.slice(-2)
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        <span>Working on it…</span>
      </div>
      {tail.length > 0 && (
        <div className="rounded-md border border-border bg-muted px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {tail.map((line, i) => (
            <div key={i} className="truncate">
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CheckActions({
  check,
  tone
}: {
  check: CheckResult
  tone: 'required' | 'optional'
}): React.JSX.Element | null {
  const { installing, installPackage, signInToClaude, isSigningIn } = useSetup()

  if (check.id === 'claude-installed' && check.status === 'missing') {
    const busy = installing === 'claude-code'
    const disabled = installing !== null || isSigningIn
    return (
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => void installPackage('claude-code')}
            disabled={disabled}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Download />}
            {busy ? 'Installing Claude Code…' : 'Install Claude Code'}
          </Button>
          <button
            type="button"
            onClick={() => openExternal('https://claude.com/claude-code')}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3.5" /> Install manually
          </button>
        </div>
        <InstallProgressInline id="claude-code" />
      </div>
    )
  }

  if (check.id === 'claude-auth' && check.status === 'missing') {
    const disabled = installing !== null || isSigningIn
    return (
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void signInToClaude()} disabled={disabled}>
            {isSigningIn ? <Loader2 className="animate-spin" /> : <LogIn />}
            {isSigningIn ? 'Waiting for sign-in…' : 'Sign in to Claude'}
          </Button>
          <button
            type="button"
            onClick={() => openExternal('https://docs.anthropic.com/en/docs/claude-code')}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3.5" /> Docs
          </button>
        </div>
        {isSigningIn && (
          <p className="text-xs text-muted-foreground">
            A terminal window opened — complete the sign-in in your browser. This panel updates
            automatically when you&apos;re done.
          </p>
        )}
      </div>
    )
  }

  if (check.id === 'ffmpeg' && check.status !== 'ok') {
    const busy = installing === 'ffmpeg'
    const disabled = installing !== null || isSigningIn
    return (
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={tone === 'optional' ? 'outline' : 'default'}
            onClick={() => void installPackage('ffmpeg')}
            disabled={disabled}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Download />}
            {busy ? 'Installing FFmpeg…' : 'Install FFmpeg'}
          </Button>
          <button
            type="button"
            onClick={() => openExternal('https://ffmpeg.org/download.html')}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3.5" /> Install manually
          </button>
        </div>
        <InstallProgressInline id="ffmpeg" />
      </div>
    )
  }

  // Fallback: show raw hint for any other failing check we don't yet automate.
  if (check.fixHint) {
    return (
      <div className="mt-2 rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
        {check.fixHint}
      </div>
    )
  }
  return null
}

export function ChecksList({
  heading,
  description,
  tone,
  checks,
  showRecheck = false
}: {
  heading: string
  description?: string
  tone: 'required' | 'optional'
  checks: CheckResult[]
  showRecheck?: boolean
}): React.JSX.Element {
  const { refresh, isChecking } = useSetup()
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={heading} description={description} />
      <div className="flex flex-col gap-2">
        {checks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            No checks.
          </div>
        ) : (
          checks.map((c) => <CheckCard key={c.id} check={c} tone={tone} />)
        )}
      </div>
      {showRecheck && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isChecking}>
            {isChecking ? <Loader2 className="animate-spin" /> : <RotateCw />}
            {isChecking ? 'Checking…' : 'Re-check'}
          </Button>
        </div>
      )}
    </section>
  )
}

function SectionHeader({
  title,
  description
}: {
  title: string
  description?: string
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

function formatUpdatedAt(ts: number | null): string {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    return d.toLocaleString()
  } catch {
    return ''
  }
}

function KeyRow({
  meta,
  status
}: {
  meta: KeyMeta
  status: KeyStatus | undefined
}): React.JSX.Element {
  const { saveKey, clearKey } = useSetup()
  const [value, setValue] = useState('')
  const [showValue, setShowValue] = useState(false)
  const [busy, setBusy] = useState<'save' | 'clear' | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const present = status?.present ?? false
  const updatedAt = status?.updatedAt ?? null

  const onSave = async (): Promise<void> => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Enter a key before saving.')
      return
    }
    setBusy('save')
    setError(null)
    try {
      const result = await saveKey(meta.slot, trimmed)
      if (!result.ok) {
        setError(result.error || 'Could not save this key.')
      } else {
        setValue('')
        setShowValue(false)
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 2000)
      }
    } finally {
      setBusy(null)
    }
  }

  const onClear = async (): Promise<void> => {
    setBusy('clear')
    setError(null)
    try {
      await clearKey(meta.slot)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{meta.label}</CardTitle>
          {meta.usedBy.map((u) => (
            <Badge key={u} variant="secondary">
              Used by: {u}
            </Badge>
          ))}
          <button
            type="button"
            onClick={() => openExternal(meta.docsUrl)}
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3.5" /> Docs
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{meta.description}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs">
          {present ? (
            <>
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                <Check className="size-3" /> Saved
              </Badge>
              {updatedAt && (
                <span className="text-muted-foreground">Updated {formatUpdatedAt(updatedAt)}</span>
              )}
            </>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Not set
            </Badge>
          )}
          {savedFlash && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="size-3.5" /> Saved
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showValue ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={present ? 'Enter a new key to replace' : 'Paste your key here'}
              disabled={busy !== null}
              autoComplete="off"
              spellCheck={false}
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowValue((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showValue ? 'Hide key' : 'Show key'}
              tabIndex={-1}
            >
              {showValue ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <Button onClick={onSave} disabled={busy !== null || !value.trim()}>
            {busy === 'save' ? (
              <>
                <Loader2 className="animate-spin" /> Saving…
              </>
            ) : (
              <>Save</>
            )}
          </Button>
          {present && (
            <Button variant="outline" onClick={onClear} disabled={busy !== null}>
              {busy === 'clear' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Trash2 /> Remove
                </>
              )}
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function KeysList({
  heading,
  description
}: {
  heading: string
  description?: string
}): React.JSX.Element {
  const { keyCatalog, keyStatuses } = useSetup()
  const byslot = new Map<KeySlot, KeyStatus>()
  for (const s of keyStatuses) byslot.set(s.slot, s)
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={heading} description={description} />
      <div className="flex flex-col gap-3">
        {keyCatalog.map((meta) => (
          <KeyRow key={meta.slot} meta={meta} status={byslot.get(meta.slot)} />
        ))}
      </div>
    </section>
  )
}

export function SectionWrap({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="flex flex-col gap-8">{children}</div>
}
