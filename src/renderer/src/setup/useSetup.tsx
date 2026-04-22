import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'

export type CheckStatus = 'ok' | 'warning' | 'missing' | 'error'

export type CheckResult = {
  id: string
  label: string
  status: CheckStatus
  detail: string
  fixHint?: string
}

export type SetupStatus = {
  required: CheckResult[]
  optional: CheckResult[]
  allRequiredPassing: boolean
}

export type KeySlot =
  | 'anthropicApiKey'
  | 'elevenlabsKey'
  | 'sunoKey'
  | 'replicateToken'
  | 'runwayKey'

export type KeyMeta = {
  slot: KeySlot
  label: string
  description: string
  docsUrl: string
  usedBy: string[]
  optional: boolean
}

export type KeyStatus = {
  slot: KeySlot
  present: boolean
  updatedAt: number | null
}

export type InstallId = 'claude-code' | 'ffmpeg'

type InstallProgressEvent = {
  id: InstallId
  phase: 'starting' | 'running' | 'success' | 'failure'
  line?: string
  error?: string
}

type SaveResult = { ok: boolean; error?: string }

type SetupContextValue = {
  status: SetupStatus | null
  keyCatalog: KeyMeta[]
  keyStatuses: KeyStatus[]
  isReady: boolean
  isChecking: boolean
  isSettingsOpen: boolean
  toggleSettings: () => void
  openSettings: () => void
  closeSettings: () => void
  refresh: () => Promise<void>
  saveKey: (slot: KeySlot, value: string) => Promise<SaveResult>
  clearKey: (slot: KeySlot) => Promise<void>
  installing: InstallId | null
  installLog: string[]
  isSigningIn: boolean
  installPackage: (id: InstallId) => Promise<boolean>
  signInToClaude: () => Promise<boolean>
  installEverything: () => Promise<void>
}

const SetupContext = createContext<SetupContextValue | null>(null)

const LOG_LIMIT = 20

export function SetupProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [keyCatalog, setKeyCatalog] = useState<KeyMeta[]>([])
  const [keyStatuses, setKeyStatuses] = useState<KeyStatus[]>([])
  const [isChecking, setIsChecking] = useState<boolean>(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [installing, setInstalling] = useState<InstallId | null>(null)
  const [installLog, setInstallLog] = useState<string[]>([])
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false)

  const installingRef = useRef<InstallId | null>(null)

  const reloadKeys = useCallback(async () => {
    const [catalog, statuses] = await Promise.all([
      window.api.setup.getKeyCatalog() as Promise<KeyMeta[]>,
      window.api.setup.getKeyStatuses() as Promise<KeyStatus[]>
    ])
    setKeyCatalog(catalog)
    setKeyStatuses(statuses)
  }, [])

  const refresh = useCallback(async () => {
    setIsChecking(true)
    try {
      const [next] = await Promise.all([
        window.api.setup.runChecks() as Promise<SetupStatus>,
        reloadKeys()
      ])
      setStatus(next)
    } finally {
      setIsChecking(false)
    }
  }, [reloadKeys])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Subscribe once to install progress events and funnel them into installLog
  // when they belong to the currently-active install.
  useEffect(() => {
    const off = window.api.setup.onInstallProgress((event: InstallProgressEvent) => {
      if (!installingRef.current || event.id !== installingRef.current) return
      if (event.phase === 'running' && event.line) {
        setInstallLog((prev) => {
          const next = prev.concat(event.line as string)
          return next.length > LOG_LIMIT ? next.slice(next.length - LOG_LIMIT) : next
        })
      } else if (event.phase === 'failure' && event.error) {
        setInstallLog((prev) => {
          const next = prev.concat(event.error as string)
          return next.length > LOG_LIMIT ? next.slice(next.length - LOG_LIMIT) : next
        })
      }
    })
    return () => off()
  }, [])

  const saveKey = useCallback(
    async (slot: KeySlot, value: string): Promise<SaveResult> => {
      const result = (await window.api.setup.setKey(slot, value)) as SaveResult
      if (result.ok) await reloadKeys()
      return result
    },
    [reloadKeys]
  )

  const clearKey = useCallback(
    async (slot: KeySlot) => {
      await window.api.setup.clearKey(slot)
      await reloadKeys()
    },
    [reloadKeys]
  )

  const installPackage = useCallback(
    async (id: InstallId): Promise<boolean> => {
      installingRef.current = id
      setInstalling(id)
      setInstallLog([])
      try {
        const result = (await window.api.setup.installPackage(id)) as { ok: boolean }
        await refresh()
        return result?.ok ?? false
      } finally {
        installingRef.current = null
        setInstalling(null)
      }
    },
    [refresh]
  )

  const signInToClaude = useCallback(async (): Promise<boolean> => {
    setIsSigningIn(true)
    try {
      const result = (await window.api.setup.startClaudeLogin()) as { ok: boolean }
      await refresh()
      return result?.ok ?? false
    } finally {
      setIsSigningIn(false)
    }
  }, [refresh])

  const installEverything = useCallback(async (): Promise<void> => {
    // We need a fresh snapshot at each step so the sequence is driven by real
    // state, not stale closures.
    let current = (await window.api.setup.runChecks()) as SetupStatus
    setStatus(current)

    const findCheck = (id: string): CheckResult | undefined =>
      current.required.concat(current.optional).find((c) => c.id === id)

    const needsInstall = (id: string): boolean => {
      const c = findCheck(id)
      return !!c && c.status === 'missing'
    }

    if (needsInstall('claude-installed')) {
      await installPackage('claude-code')
      current = (await window.api.setup.runChecks()) as SetupStatus
      setStatus(current)
    }

    if (needsInstall('claude-auth')) {
      await signInToClaude()
      current = (await window.api.setup.runChecks()) as SetupStatus
      setStatus(current)
    }

    if (needsInstall('ffmpeg')) {
      await installPackage('ffmpeg')
      current = (await window.api.setup.runChecks()) as SetupStatus
      setStatus(current)
    }

    await refresh()
  }, [installPackage, signInToClaude, refresh])

  const toggleSettings = useCallback(() => setIsSettingsOpen((v) => !v), [])
  const openSettings = useCallback(() => setIsSettingsOpen(true), [])
  const closeSettings = useCallback(() => setIsSettingsOpen(false), [])

  const isReady = status !== null && status.allRequiredPassing

  const value = useMemo<SetupContextValue>(
    () => ({
      status,
      keyCatalog,
      keyStatuses,
      isReady,
      isChecking,
      isSettingsOpen,
      toggleSettings,
      openSettings,
      closeSettings,
      refresh,
      saveKey,
      clearKey,
      installing,
      installLog,
      isSigningIn,
      installPackage,
      signInToClaude,
      installEverything
    }),
    [
      status,
      keyCatalog,
      keyStatuses,
      isReady,
      isChecking,
      isSettingsOpen,
      toggleSettings,
      openSettings,
      closeSettings,
      refresh,
      saveKey,
      clearKey,
      installing,
      installLog,
      isSigningIn,
      installPackage,
      signInToClaude,
      installEverything
    ]
  )

  return <SetupContext.Provider value={value}>{children}</SetupContext.Provider>
}

export function useSetup(): SetupContextValue {
  const ctx = useContext(SetupContext)
  if (!ctx) throw new Error('useSetup must be used inside <SetupProvider>')
  return ctx
}
