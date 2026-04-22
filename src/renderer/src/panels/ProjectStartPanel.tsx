import { useState, type FormEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePipeline } from '@/pipeline/usePipeline'
import { Loader2, Sparkles } from 'lucide-react'

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function ProjectStartPanel(): React.JSX.Element {
  const { createProject } = usePipeline()
  const [companyName, setCompanyName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)

    const name = companyName.trim()
    const url = websiteUrl.trim()
    if (!name) {
      setError('Please enter a company name.')
      return
    }
    if (!isValidUrl(url)) {
      setError('Please enter a valid website URL (including https://).')
      return
    }

    setSubmitting(true)
    try {
      await createProject(name, url)
    } catch (err) {
      setError((err as Error).message || 'Something went wrong — try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3.5" />
          New project
        </div>
        <h1 className="text-2xl font-semibold">Let&apos;s make an ad.</h1>
        <p className="text-sm text-muted-foreground">
          Tell me about the company. I&apos;ll research their website and socials, propose a campaign
          direction, then walk you through the script, storyboard, visuals, voice, music, and final
          cut — one checkpoint at a time. You approve each step.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="company-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Company name
              </label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Fahrradwerkstatt Neubau"
                disabled={submitting}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="website-url" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Website
              </label>
              <Input
                id="website-url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={submitting}
                inputMode="url"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" /> Starting…
                  </>
                ) : (
                  <>Begin research</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
