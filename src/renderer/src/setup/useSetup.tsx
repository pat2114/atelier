import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
}

const SetupContext = createContext<SetupContextValue | null>(null)

export function SetupProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [keyCatalog, setKeyCatalog] = useState<KeyMeta[]>([])
  const [keyStatuses, setKeyStatuses] = useState<KeyStatus[]>([])
  const [isChecking, setIsChecking] = useState<boolean>(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)

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
      clearKey
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
      clearKey
    ]
  )

  return <SetupContext.Provider value={value}>{children}</SetupContext.Provider>
}

export function useSetup(): SetupContextValue {
  const ctx = useContext(SetupContext)
  if (!ctx) throw new Error('useSetup must be used inside <SetupProvider>')
  return ctx
}
