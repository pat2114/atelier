import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/theme/ThemeProvider'
import { parseThemeCommand } from '@/theme/parser'
import { templates } from '@/layout/templates'
import { clamp, type TokenState } from '@/theme/tokens'
import { cn } from '@/lib/utils'
import { Send, Loader2 } from 'lucide-react'

const PREVIEW_PATTERN = /\b(?:preview|try|show)(?:\s+the)?\s+(\w+)(?:\s+layout|\s+mode|\s+template)?\b/i

function tryPreviewCommand(text: string): { reply: string; triggered: boolean } | null {
  const match = PREVIEW_PATTERN.exec(text)
  if (!match) return null
  const id = match[1].toLowerCase()
  if (!(id in templates)) {
    const available = Object.keys(templates).join(', ')
    return {
      reply: `No layout called "${id}". Available: ${available}.`,
      triggered: false
    }
  }
  window.api?.preview.open(id)
  return {
    reply: `Opening a preview window with the "${id}" layout. Use Apply or Discard in that window.`,
    triggered: true
  }
}

const TOKEN_RANGES = {
  density: [0.6, 1.6],
  fontScale: [0.8, 1.4],
  radius: [0, 1.5],
  accentHue: [0, 360],
  accentChroma: [0, 0.2],
  backgroundHue: [0, 360],
  backgroundChroma: [0, 0.2]
} as const

function mergeChanges(current: TokenState, changes: Partial<TokenState>): TokenState {
  const next: TokenState = { ...current }
  if (changes.mode === 'light' || changes.mode === 'dark') next.mode = changes.mode
  for (const key of [
    'density',
    'fontScale',
    'radius',
    'accentHue',
    'accentChroma',
    'backgroundHue',
    'backgroundChroma'
  ] as const) {
    const value = changes[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      const [min, max] = TOKEN_RANGES[key]
      next[key] = clamp(value, min, max)
    }
  }
  return next
}

type Message = {
  id: number
  role: 'user' | 'system'
  text: string
  pending?: boolean
}

let idCounter = 0

export function ChatBox(): React.JSX.Element {
  const { tokens, setTokens } = useTheme()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: idCounter++,
      role: 'system',
      text: 'Try: "warmer", "dark mode", "denser", "bigger text", "rounder", "reset", "preview focus", or anything creative — I\'ll interpret it.'
    }
  ])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const submit = async (): Promise<void> => {
    if (isThinking) return
    const text = input.trim()
    if (!text) return

    const userMsg: Message = { id: idCounter++, role: 'user', text }

    const preview = tryPreviewCommand(text)
    if (preview) {
      const systemMsg: Message = { id: idCounter++, role: 'system', text: preview.reply }
      setMessages((prev) => [...prev, userMsg, systemMsg])
      setInput('')
      return
    }

    const result = parseThemeCommand(text, tokens)
    if (result.matched) {
      setTokens(result.tokens)
      const systemMsg: Message = { id: idCounter++, role: 'system', text: result.reply }
      setMessages((prev) => [...prev, userMsg, systemMsg])
      setInput('')
      return
    }

    // No deterministic match — fall back to Claude via main process.
    const pendingId = idCounter++
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: pendingId, role: 'system', text: 'Thinking…', pending: true }
    ])
    setInput('')
    setIsThinking(true)

    try {
      const response = await window.api.agent.interpretTheme(text, tokens)
      if (response.ok) {
        const { reply, changes } = response.data
        const next = mergeChanges(tokens, changes)
        if (Object.keys(changes).length > 0) setTokens(next)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId ? { ...m, text: reply || 'Done.', pending: false } : m
          )
        )
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? { ...m, text: `Agent failed: ${response.error}`, pending: false }
              : m
          )
        )
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? { ...m, text: `Agent error: ${(err as Error).message}`, pending: false }
            : m
        )
      )
    } finally {
      setIsThinking(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <div className="flex h-full max-h-[240px] flex-col gap-2 bg-background p-3">
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto pr-1"
        style={{ minHeight: '80px' }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'flex max-w-[85%] items-center gap-2 rounded-md px-3 py-1.5 text-sm',
              m.role === 'user'
                ? 'ml-auto bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {m.pending && <Loader2 className="size-3.5 animate-spin" />}
            <span>{m.text}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isThinking}
          placeholder={isThinking ? 'thinking…' : 'tell the shell how it should look…'}
          className="flex-1"
        />
        <Button
          onClick={() => void submit()}
          size="icon"
          aria-label="Send"
          disabled={isThinking}
        >
          {isThinking ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </div>
    </div>
  )
}
