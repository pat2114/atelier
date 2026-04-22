import { Sparkles } from 'lucide-react'
import { useSetup } from '@/setup/useSetup'
import { ChecksList, KeysList, SectionWrap } from '@/setup/SetupSections'

export function OnboardingPanel(): React.JSX.Element {
  const { status } = useSetup()
  const required = status?.required ?? []
  const optional = status?.optional ?? []

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3.5" />
          Setup
        </div>
        <h1 className="text-2xl font-semibold">Set up Jarvis</h1>
        <p className="text-sm text-muted-foreground">
          A couple of dependencies and (optional) API keys. Nothing leaves your machine except the
          calls you make.
        </p>
      </header>

      <SectionWrap>
        <ChecksList
          heading="Required"
          description="These must be working before Jarvis can run."
          tone="required"
          checks={required}
          showRecheck
        />

        <ChecksList
          heading="Optional"
          description="Nice to have. Jarvis will run without these, but some steps may be skipped."
          tone="optional"
          checks={optional}
        />

        <KeysList
          heading="API keys"
          description="Stored encrypted on your machine using your OS keychain. You can add these now or later from Settings."
        />
      </SectionWrap>

      <footer className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        Once all required dependencies are ready, the app will open automatically. Tap{' '}
        <span className="font-medium text-foreground">Re-check</span> above after you install or
        sign in.
      </footer>
    </div>
  )
}
