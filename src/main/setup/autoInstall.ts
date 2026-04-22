import { spawn } from 'node:child_process'
import { BrowserWindow } from 'electron'

export type InstallId = 'claude-code' | 'ffmpeg'

export type InstallProgress =
  | { id: InstallId; phase: 'starting' }
  | { id: InstallId; phase: 'running'; line: string }
  | { id: InstallId; phase: 'success' }
  | { id: InstallId; phase: 'failure'; error: string }

type ProgressHandler = (event: InstallProgress) => void

const PACKAGES: Record<InstallId, { wingetId: string; label: string }> = {
  'claude-code': { wingetId: 'Anthropic.ClaudeCode', label: 'Claude Code' },
  ffmpeg: { wingetId: 'Gyan.FFmpeg', label: 'FFmpeg' }
}

export function installPackage(id: InstallId, onProgress: ProgressHandler): Promise<boolean> {
  const meta = PACKAGES[id]
  return new Promise((resolve) => {
    onProgress({ id, phase: 'starting' })
    const args = [
      'install',
      meta.wingetId,
      '--silent',
      '--accept-source-agreements',
      '--accept-package-agreements',
      '--disable-interactivity'
    ]
    const child = spawn('winget', args, { shell: true, windowsHide: true })
    let stderrTail = ''

    const emit = (line: string): void => {
      const trimmed = line.trim()
      if (trimmed) onProgress({ id, phase: 'running', line: trimmed })
    }

    child.stdout.on('data', (b: Buffer) => b.toString().split(/\r?\n/).forEach(emit))
    child.stderr.on('data', (b: Buffer) => {
      const s = b.toString()
      stderrTail = (stderrTail + s).slice(-2000)
      s.split(/\r?\n/).forEach(emit)
    })
    child.on('error', (err) => {
      onProgress({ id, phase: 'failure', error: err.message })
      resolve(false)
    })
    child.on('close', (code) => {
      // winget returns 0 on success. Some already-installed paths return non-zero
      // but with "No applicable update found" in output — treat those as success too.
      if (code === 0) {
        onProgress({ id, phase: 'success' })
        resolve(true)
        return
      }
      const benign = /already installed|no applicable update/i.test(stderrTail)
      if (benign) {
        onProgress({ id, phase: 'success' })
        resolve(true)
        return
      }
      onProgress({
        id,
        phase: 'failure',
        error: stderrTail.trim() || `winget exited with code ${code}`
      })
      resolve(false)
    })
  })
}

export function startClaudeLoginFlow(): Promise<boolean> {
  // Launches a visible terminal that runs `claude login`. The user completes
  // the device-code flow in their browser. We resolve when the child exits.
  return new Promise((resolve) => {
    const child = spawn('cmd.exe', ['/c', 'start', '/wait', 'cmd.exe', '/c', 'claude login'], {
      shell: false,
      detached: false,
      windowsHide: false
    })
    child.on('error', () => resolve(false))
    child.on('close', (code) => resolve(code === 0))
  })
}

export function attachBroadcaster(win: BrowserWindow | null): ProgressHandler {
  return (event): void => {
    win?.webContents.send('setup:install-progress', event)
  }
}
