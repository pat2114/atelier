export type TokenState = {
  mode: 'light' | 'dark'
  density: number
  fontScale: number
  radius: number
  accentHue: number
  accentChroma: number
  backgroundHue: number
  backgroundChroma: number
}

export const DEFAULT_TOKENS: TokenState = {
  mode: 'light',
  density: 1,
  fontScale: 1,
  radius: 0.625,
  accentHue: 0,
  accentChroma: 0,
  backgroundHue: 0,
  backgroundChroma: 0
}

export function applyTokens(tokens: TokenState): void {
  const root = document.documentElement
  root.classList.toggle('dark', tokens.mode === 'dark')
  root.style.setProperty('--density', String(tokens.density))
  root.style.setProperty('--font-scale', String(tokens.fontScale))
  root.style.setProperty('--radius', `${tokens.radius}rem`)

  if (tokens.accentChroma > 0) {
    const lightness = tokens.mode === 'dark' ? 0.7 : 0.55
    const accent = `oklch(${lightness} ${tokens.accentChroma} ${tokens.accentHue})`
    root.style.setProperty('--primary', accent)
    root.style.setProperty('--ring', accent)
  } else {
    root.style.removeProperty('--primary')
    root.style.removeProperty('--ring')
  }

  if (tokens.backgroundChroma > 0) {
    const bgL = tokens.mode === 'dark' ? 0.18 : 0.97
    const cardL = tokens.mode === 'dark' ? 0.25 : 1.0
    const mutedL = tokens.mode === 'dark' ? 0.28 : 0.93
    const borderL = tokens.mode === 'dark' ? 0.35 : 0.88
    root.style.setProperty(
      '--background',
      `oklch(${bgL} ${tokens.backgroundChroma} ${tokens.backgroundHue})`
    )
    root.style.setProperty(
      '--card',
      `oklch(${cardL} ${tokens.backgroundChroma * 0.6} ${tokens.backgroundHue})`
    )
    root.style.setProperty(
      '--popover',
      `oklch(${cardL} ${tokens.backgroundChroma * 0.6} ${tokens.backgroundHue})`
    )
    root.style.setProperty(
      '--muted',
      `oklch(${mutedL} ${tokens.backgroundChroma * 0.8} ${tokens.backgroundHue})`
    )
    root.style.setProperty(
      '--accent',
      `oklch(${mutedL} ${tokens.backgroundChroma * 0.8} ${tokens.backgroundHue})`
    )
    root.style.setProperty(
      '--border',
      `oklch(${borderL} ${tokens.backgroundChroma * 0.7} ${tokens.backgroundHue})`
    )
    root.style.setProperty(
      '--input',
      `oklch(${borderL} ${tokens.backgroundChroma * 0.7} ${tokens.backgroundHue})`
    )
  } else {
    root.style.removeProperty('--background')
    root.style.removeProperty('--card')
    root.style.removeProperty('--popover')
    root.style.removeProperty('--muted')
    root.style.removeProperty('--accent')
    root.style.removeProperty('--border')
    root.style.removeProperty('--input')
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
