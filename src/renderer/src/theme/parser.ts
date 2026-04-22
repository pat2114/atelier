import { clamp, DEFAULT_TOKENS, type TokenState } from './tokens'

export type ParseResult = {
  tokens: TokenState
  reply: string
  matched: boolean
}

type Rule = {
  pattern: RegExp
  apply: (t: TokenState) => { tokens: TokenState; reply: string }
}

const rules: Rule[] = [
  {
    pattern: /\b(dark mode|dark theme|go dark|darker mode)\b/i,
    apply: (t) => ({ tokens: { ...t, mode: 'dark' }, reply: 'Switched to dark mode.' })
  },
  {
    pattern: /\b(light mode|light theme|go light|lighter mode)\b/i,
    apply: (t) => ({ tokens: { ...t, mode: 'light' }, reply: 'Switched to light mode.' })
  },
  {
    pattern: /\b(warmer|warm it up|cozier|warm)\b/i,
    apply: (t) => ({
      tokens: {
        ...t,
        accentHue: 40,
        accentChroma: clamp(t.accentChroma + 0.08, 0.08, 0.2)
      },
      reply: 'Warmed up the accent (amber-orange).'
    })
  },
  {
    pattern: /\b(cooler|cool it down|cool)\b/i,
    apply: (t) => ({
      tokens: {
        ...t,
        accentHue: 240,
        accentChroma: clamp(t.accentChroma + 0.08, 0.08, 0.2)
      },
      reply: 'Cooled down the accent (blue).'
    })
  },
  {
    pattern: /\b(no accent|neutral|remove accent|plain)\b/i,
    apply: (t) => ({
      tokens: { ...t, accentChroma: 0 },
      reply: 'Removed the accent color — back to neutral.'
    })
  },
  {
    pattern: /\b(denser|tighter|less spac(e|ing)|compact)\b/i,
    apply: (t) => ({
      tokens: { ...t, density: clamp(t.density - 0.15, 0.6, 1.6) },
      reply: 'Tightened the spacing.'
    })
  },
  {
    pattern: /\b(more spac(e|ing)|looser|airier|breathe|roomier)\b/i,
    apply: (t) => ({
      tokens: { ...t, density: clamp(t.density + 0.15, 0.6, 1.6) },
      reply: 'Loosened the spacing.'
    })
  },
  {
    pattern: /\b(bigger text|larger text|bigger font|larger font|bigger type)\b/i,
    apply: (t) => ({
      tokens: { ...t, fontScale: clamp(t.fontScale + 0.1, 0.8, 1.4) },
      reply: 'Increased text size.'
    })
  },
  {
    pattern: /\b(smaller text|smaller font|smaller type)\b/i,
    apply: (t) => ({
      tokens: { ...t, fontScale: clamp(t.fontScale - 0.1, 0.8, 1.4) },
      reply: 'Decreased text size.'
    })
  },
  {
    pattern: /\b(rounder|more rounded|softer corners)\b/i,
    apply: (t) => ({
      tokens: { ...t, radius: clamp(t.radius + 0.2, 0, 1.5) },
      reply: 'Rounder corners.'
    })
  },
  {
    pattern: /\b(sharper|less rounded|sharp corners|sharper corners)\b/i,
    apply: (t) => ({
      tokens: { ...t, radius: clamp(t.radius - 0.2, 0, 1.5) },
      reply: 'Sharper corners.'
    })
  },
  {
    pattern: /\b(reset (theme|aesthetics|look)|start over|default)\b/i,
    apply: () => ({ tokens: { ...DEFAULT_TOKENS }, reply: 'Reset to defaults.' })
  }
]

export function parseThemeCommand(input: string, current: TokenState): ParseResult {
  for (const rule of rules) {
    if (rule.pattern.test(input)) {
      const { tokens, reply } = rule.apply(current)
      return { tokens, reply, matched: true }
    }
  }
  return {
    tokens: current,
    reply: `I don't know how to apply "${input.trim()}" yet. Try: warmer, cooler, darker, lighter, denser, more spacing, bigger text, rounder, sharper, reset.`,
    matched: false
  }
}
