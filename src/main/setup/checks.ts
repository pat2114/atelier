import { spawn, spawnSync } from 'node:child_process'
import { delimiter, join } from 'node:path'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'

export type CheckResult = {
  id: string
  label: string
  status: 'ok' | 'warning' | 'missing' | 'error'
  detail: string
  fixHint?: string
}

export type SetupStatus = {
  required: CheckResult[]
  optional: CheckResult[]
  allRequiredPassing: boolean
}

function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  delete env.CLAUDECODE
  delete env.CLAUDE_CODE_ENTRYPOINT
  delete env.CLAUDE_CODE_EXECPATH
  delete env.CLAUDE_CODE_SIMPLE
  return env
}

function findOnPath(names: string[]): string | null {
  const pathEnv = process.env.PATH ?? ''
  for (const dir of pathEnv.split(delimiter)) {
    if (!dir) continue
    for (const name of names) {
      const p = join(dir, name)
      if (existsSync(p)) return p
    }
  }
  try {
    const finder = process.platform === 'win32' ? 'where.exe' : 'which'
    for (const name of names) {
      const res = spawnSync(finder, [name], { encoding: 'utf8' })
      if (res.status === 0 && res.stdout) {
        const first = res.stdout.split(/\r?\n/).find((l) => l.trim().length > 0)
        if (first) return first.trim()
      }
    }
  } catch {
    // ignore
  }
  return null
}

async function checkClaudeInstalled(): Promise<CheckResult> {
  const candidates = process.platform === 'win32'
    ? ['claude.exe', 'claude.cmd', 'claude']
    : ['claude']
  const found = findOnPath(candidates)
  if (!found) {
    return {
      id: 'claude-installed',
      label: 'Claude Code installed',
      status: 'missing',
      detail: 'Claude Code CLI was not found on PATH.',
      fixHint:
        'Install Claude Code from claude.com/claude-code (Windows: `winget install Anthropic.ClaudeCode`). Then restart the app.'
    }
  }
  const version = await runVersion(found)
  return {
    id: 'claude-installed',
    label: 'Claude Code installed',
    status: 'ok',
    detail: version ? `Found: ${version}` : `Found at ${found}`
  }
}

function runVersion(claudePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(claudePath, ['--version'], {
      env: cleanEnv(),
      shell: process.platform === 'win32' && claudePath.toLowerCase().endsWith('.cmd')
    })
    let out = ''
    child.stdout.on('data', (c) => (out += c.toString()))
    child.on('close', () => resolve(out.trim() || null))
    child.on('error', () => resolve(null))
    setTimeout(() => {
      try {
        child.kill()
      } catch {
        // ignore
      }
      resolve(null)
    }, 5_000)
  })
}

async function checkClaudeAuth(): Promise<CheckResult> {
  const claudePath = findOnPath(
    process.platform === 'win32' ? ['claude.exe', 'claude.cmd', 'claude'] : ['claude']
  )
  if (!claudePath) {
    return {
      id: 'claude-auth',
      label: 'Claude Code authenticated',
      status: 'missing',
      detail: 'Claude Code is not installed.',
      fixHint: 'Install Claude Code first.'
    }
  }
  const result = await new Promise<{ out: string; err: string; code: number | null }>((resolve) => {
    const child = spawn(
      claudePath,
      ['-p', '--no-session-persistence', '--model', 'haiku', '--output-format', 'text', 'ok'],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: cleanEnv(),
        cwd: tmpdir(),
        shell: process.platform === 'win32' && claudePath.toLowerCase().endsWith('.cmd')
      }
    )
    let out = ''
    let err = ''
    child.stdout.on('data', (c) => (out += c.toString()))
    child.stderr.on('data', (c) => (err += c.toString()))
    child.on('close', (code) => resolve({ out, err, code }))
    child.on('error', (e) => resolve({ out: '', err: e.message, code: -1 }))
    setTimeout(() => {
      try {
        child.kill()
      } catch {
        // ignore
      }
      resolve({ out, err: err + '\n[timed out]', code: -1 })
    }, 20_000)
    child.stdin.write('ok')
    child.stdin.end()
  })
  const combined = (result.out + '\n' + result.err).toLowerCase()
  if (combined.includes('not logged in') || combined.includes('please run /login')) {
    return {
      id: 'claude-auth',
      label: 'Claude Code authenticated',
      status: 'missing',
      detail: 'Claude Code is installed but not logged in.',
      fixHint: 'Open a terminal and run `claude login`. Follow the browser prompt. Then restart the app.'
    }
  }
  if (result.code !== 0) {
    return {
      id: 'claude-auth',
      label: 'Claude Code authenticated',
      status: 'warning',
      detail: `Unexpected response from claude -p (exit ${result.code}).`,
      fixHint: 'Try running `claude -p ok` in a terminal to see what happens.'
    }
  }
  return {
    id: 'claude-auth',
    label: 'Claude Code authenticated',
    status: 'ok',
    detail: 'Subscription-backed calls are working.'
  }
}

async function checkFfmpeg(): Promise<CheckResult> {
  const candidates = process.platform === 'win32' ? ['ffmpeg.exe', 'ffmpeg'] : ['ffmpeg']
  const found = findOnPath(candidates)
  if (!found) {
    return {
      id: 'ffmpeg',
      label: 'FFmpeg available',
      status: 'warning',
      detail: 'FFmpeg was not found on PATH. Final video rendering will be skipped.',
      fixHint:
        'Windows: `winget install Gyan.FFmpeg`. macOS: `brew install ffmpeg`. Then restart the app.'
    }
  }
  return {
    id: 'ffmpeg',
    label: 'FFmpeg available',
    status: 'ok',
    detail: `Found at ${found}`
  }
}

export async function runChecks(): Promise<SetupStatus> {
  const required: CheckResult[] = await Promise.all([checkClaudeInstalled(), checkClaudeAuth()])
  const optional: CheckResult[] = await Promise.all([checkFfmpeg()])

  const allRequiredPassing = required.every((r) => r.status === 'ok')
  return { required, optional, allRequiredPassing }
}
