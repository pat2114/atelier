import { spawn, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'

export type ClaudeCliOptions = {
  prompt: string
  systemPrompt: string
  jsonSchema?: Record<string, unknown>
  model?: 'sonnet' | 'opus' | 'haiku'
  timeoutMs?: number
}

export type ClaudeCliResult<T = unknown> =
  | { ok: true; data: T; rawText: string }
  | { ok: false; error: string; rawText?: string }

const DEFAULT_TIMEOUT_MS = 30_000

const DISALLOWED_TOOLS =
  'Bash Edit Read Write Glob Grep NotebookEdit WebFetch WebSearch Agent TaskCreate TaskUpdate TaskList TaskGet'

function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  delete env.CLAUDECODE
  delete env.CLAUDE_CODE_ENTRYPOINT
  delete env.CLAUDE_CODE_EXECPATH
  delete env.CLAUDE_CODE_SIMPLE
  return env
}

let cachedClaudePath: string | null = null

// Resolve the absolute path to the claude executable so we can spawn it
// WITHOUT shell:true. On Windows, spawning with shell:true runs the command
// through cmd.exe, which re-parses our argv and mangles JSON args (notably
// --json-schema and --system-prompt — braces, quotes, and newlines get
// eaten), causing claude to silently fall back to plain-text output with
// no structured_output field. Spawning the .exe directly passes argv as an
// array to CreateProcess, with no shell re-parsing.
function resolveClaudePath(): string | null {
  if (cachedClaudePath) return cachedClaudePath

  const isWin = process.platform === 'win32'
  const candidates = isWin ? ['claude.exe', 'claude.cmd', 'claude'] : ['claude']

  // 1) PATH lookup via where/which — cheapest and most accurate.
  try {
    const finder = isWin ? 'where.exe' : 'which'
    for (const name of candidates) {
      const res = spawnSync(finder, [name], { encoding: 'utf8', env: cleanEnv() })
      if (res.status === 0 && res.stdout) {
        const first = res.stdout.split(/\r?\n/).find((line) => line.trim().length > 0)
        if (first) {
          // Prefer .exe over .cmd shim when where.exe returns multiple hits.
          const allLines = res.stdout
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
          const exeLine = allLines.find((l) => l.toLowerCase().endsWith('.exe'))
          cachedClaudePath = exeLine ?? first.trim()
          return cachedClaudePath
        }
      }
    }
  } catch {
    // ignore — fall through to manual PATH scan
  }

  // 2) Manual PATH scan as a fallback.
  const pathEnv = process.env.PATH ?? ''
  for (const dir of pathEnv.split(delimiter)) {
    if (!dir) continue
    for (const name of candidates) {
      const p = join(dir, name)
      if (existsSync(p)) {
        cachedClaudePath = p
        return p
      }
    }
  }

  return null
}

export async function invokeClaude<T = unknown>(
  options: ClaudeCliOptions
): Promise<ClaudeCliResult<T>> {
  const {
    prompt,
    systemPrompt,
    jsonSchema,
    model = 'sonnet',
    timeoutMs = DEFAULT_TIMEOUT_MS
  } = options

  const args: string[] = [
    '-p',
    '--no-session-persistence',
    '--disable-slash-commands',
    '--model',
    model,
    '--output-format',
    jsonSchema ? 'json' : 'text',
    '--system-prompt',
    systemPrompt,
    '--disallowedTools',
    DISALLOWED_TOOLS
  ]
  if (jsonSchema) {
    args.push('--json-schema', JSON.stringify(jsonSchema))
  }

  const claudePath = resolveClaudePath()
  if (!claudePath) {
    return {
      ok: false,
      error:
        'could not locate claude executable on PATH (tried `where claude` / `which claude`)'
    }
  }

  // On Windows, .cmd shims require shell:true to execute under cmd.exe,
  // but shell:true re-parses our argv and destroys JSON arg payloads. If
  // we resolved to a real .exe we spawn it directly (shell:false) and all
  // args pass through as argv. If we only found a .cmd shim, fall back
  // to shell:true — JSON args will still be mangled, but at least the
  // command runs.
  const isShim =
    process.platform === 'win32' && claudePath.toLowerCase().endsWith('.cmd')

  return new Promise<ClaudeCliResult<T>>((resolve) => {
    const child = spawn(claudePath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isShim,
      cwd: tmpdir(),
      env: cleanEnv()
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      try {
        child.kill()
      } catch {
        // ignore
      }
      resolve({ ok: false, error: `claude timed out after ${timeoutMs}ms`, rawText: stdout })
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve({ ok: false, error: `failed to spawn claude: ${err.message}` })
    })

    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)

      if (code !== 0) {
        resolve({
          ok: false,
          error: `claude exited with code ${code}: ${stderr.trim() || stdout.trim()}`,
          rawText: stdout
        })
        return
      }

      if (!jsonSchema) {
        resolve({ ok: true, data: stdout.trim() as T, rawText: stdout })
        return
      }

      try {
        const envelope = JSON.parse(stdout) as {
          is_error?: boolean
          result?: unknown
          structured_output?: unknown
        }
        if (envelope.is_error) {
          resolve({
            ok: false,
            error: typeof envelope.result === 'string' ? envelope.result : 'claude returned an error',
            rawText: stdout
          })
          return
        }
        if (envelope.structured_output !== undefined) {
          resolve({ ok: true, data: envelope.structured_output as T, rawText: stdout })
          return
        }
        if (typeof envelope.result === 'string') {
          try {
            resolve({ ok: true, data: JSON.parse(envelope.result) as T, rawText: stdout })
            return
          } catch {
            // fall through
          }
        }
        resolve({
          ok: false,
          error: 'claude response had no structured_output and result was not JSON',
          rawText: stdout
        })
      } catch (err) {
        resolve({
          ok: false,
          error: `failed to parse claude JSON envelope: ${(err as Error).message}`,
          rawText: stdout
        })
      }
    })

    child.stdin.write(prompt)
    child.stdin.end()
  })
}

export type ClaudeAgentOptions = {
  task: string
  appendSystemPrompt?: string
  cwd: string
  model?: 'sonnet' | 'opus' | 'haiku'
  timeoutMs?: number
}

export type ClaudeAgentResult =
  | { ok: true; text: string; rawText: string }
  | { ok: false; error: string; rawText?: string }

/**
 * Invokes Claude Code in agent mode (tools enabled, no JSON schema) inside a
 * sandbox directory. For autonomous repair: Claude can Read/Edit/Write/Bash
 * freely within `cwd`. Caller owns git isolation + rollback.
 */
export async function invokeClaudeAgent(options: ClaudeAgentOptions): Promise<ClaudeAgentResult> {
  const { task, appendSystemPrompt, cwd, model = 'sonnet', timeoutMs = 600_000 } = options

  const claudePath = resolveClaudePath()
  if (!claudePath) {
    return { ok: false, error: 'could not locate claude executable on PATH' }
  }

  const args: string[] = [
    '-p',
    '--no-session-persistence',
    '--disable-slash-commands',
    '--dangerously-skip-permissions',
    '--model',
    model,
    '--output-format',
    'json'
  ]
  if (appendSystemPrompt) {
    args.push('--append-system-prompt', appendSystemPrompt)
  }

  const isShim =
    process.platform === 'win32' && claudePath.toLowerCase().endsWith('.cmd')

  return new Promise<ClaudeAgentResult>((resolve) => {
    const child = spawn(claudePath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isShim,
      cwd,
      env: cleanEnv()
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      try {
        child.kill()
      } catch {
        // ignore
      }
      resolve({ ok: false, error: `agent run timed out after ${timeoutMs}ms`, rawText: stdout })
    }, timeoutMs)

    child.stdout.on('data', (c: Buffer) => (stdout += c.toString('utf8')))
    child.stderr.on('data', (c: Buffer) => (stderr += c.toString('utf8')))

    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve({ ok: false, error: `failed to spawn claude: ${err.message}` })
    })

    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (code !== 0) {
        resolve({
          ok: false,
          error: `claude agent exited with code ${code}: ${stderr.trim() || stdout.trim()}`,
          rawText: stdout
        })
        return
      }
      try {
        const envelope = JSON.parse(stdout) as {
          is_error?: boolean
          result?: unknown
        }
        if (envelope.is_error) {
          resolve({
            ok: false,
            error: typeof envelope.result === 'string' ? envelope.result : 'claude agent reported error',
            rawText: stdout
          })
          return
        }
        const text = typeof envelope.result === 'string' ? envelope.result : ''
        resolve({ ok: true, text, rawText: stdout })
      } catch (err) {
        resolve({
          ok: false,
          error: `failed to parse agent envelope: ${(err as Error).message}`,
          rawText: stdout
        })
      }
    })

    child.stdin.write(task)
    child.stdin.end()
  })
}
