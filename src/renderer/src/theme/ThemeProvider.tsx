import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { applyTokens, DEFAULT_TOKENS, type TokenState } from './tokens'

type ThemeContextValue = {
  tokens: TokenState
  setTokens: (next: TokenState) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [tokens, setTokens] = useState<TokenState>(DEFAULT_TOKENS)

  useEffect(() => {
    applyTokens(tokens)
  }, [tokens])

  return <ThemeContext.Provider value={{ tokens, setTokens }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
