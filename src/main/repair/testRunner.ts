import { spawn } from 'node:child_process'

export type TestRunResult = {
  ok: boolean
  durationMs: number
  stdout: string
  stderr: string
}

function run(command: string, args: string[], cwd: string, timeoutMs: number): Promise<TestRunResult> {
  const start = Date.now()
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        // ignore
      }
      resolve({
        ok: false,
        durationMs: Date.now() - start,
        stdout,
        stderr: stderr + '\n[test run timed out]'
      })
    }, timeoutMs)
    child.stdout.on('data', (c) => (stdout += c.toString()))
    child.stderr.on('data', (c) => (stderr += c.toString()))
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ ok: false, durationMs: Date.now() - start, stdout, stderr: err.message })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ ok: code === 0, durationMs: Date.now() - start, stdout, stderr })
    })
  })
}

export function runTypecheck(cwd: string): Promise<TestRunResult> {
  return run('npm', ['run', 'typecheck'], cwd, 120_000)
}

export function runPlaywrightSmoke(cwd: string): Promise<TestRunResult> {
  return run('npx', ['playwright', 'test', '--reporter=line', '--max-failures=1'], cwd, 300_000)
}
