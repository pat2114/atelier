import { spawn, spawnSync } from 'node:child_process'

type GitResult = { code: number; stdout: string; stderr: string }

function runGit(args: string[], cwd: string, timeoutMs = 20_000): Promise<GitResult> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, shell: process.platform === 'win32' })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        // ignore
      }
      resolve({ code: -1, stdout, stderr: stderr + '\n[git timed out]' })
    }, timeoutMs)
    child.stdout.on('data', (c) => (stdout += c.toString()))
    child.stderr.on('data', (c) => (stderr += c.toString()))
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code: code ?? -1, stdout, stderr })
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ code: -1, stdout, stderr: err.message })
    })
  })
}

export function isGitRepo(cwd: string): boolean {
  const res = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32'
  })
  return res.status === 0 && res.stdout.trim() === 'true'
}

export async function getCurrentBranch(cwd: string): Promise<string> {
  const res = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
  return res.stdout.trim()
}

export async function createRepairBranch(cwd: string, errorId: string): Promise<string> {
  const branchName = `repair/${errorId}-${Date.now()}`
  const r = await runGit(['checkout', '-b', branchName], cwd)
  if (r.code !== 0) throw new Error(`failed to create repair branch: ${r.stderr}`)
  return branchName
}

export async function getDiff(cwd: string, baseRef = 'HEAD'): Promise<string> {
  const r = await runGit(['diff', baseRef, '--', '.'], cwd)
  return r.stdout
}

export async function getChangedFiles(cwd: string, baseRef = 'HEAD'): Promise<string[]> {
  const r = await runGit(['diff', '--name-only', baseRef, '--', '.'], cwd)
  return r.stdout.split('\n').map((l) => l.trim()).filter(Boolean)
}

export async function stageAllAndCommit(cwd: string, message: string): Promise<string> {
  const add = await runGit(['add', '-A'], cwd)
  if (add.code !== 0) throw new Error(`git add failed: ${add.stderr}`)
  const commit = await runGit(['commit', '-m', message], cwd)
  if (commit.code !== 0) throw new Error(`git commit failed: ${commit.stderr}`)
  const rev = await runGit(['rev-parse', 'HEAD'], cwd)
  return rev.stdout.trim()
}

export async function abandonBranch(cwd: string, branchName: string, returnTo: string): Promise<void> {
  await runGit(['reset', '--hard', 'HEAD'], cwd)
  await runGit(['checkout', returnTo], cwd)
  await runGit(['branch', '-D', branchName], cwd)
}

export async function discardWorkingChanges(cwd: string): Promise<void> {
  await runGit(['reset', '--hard', 'HEAD'], cwd)
  await runGit(['clean', '-fd'], cwd)
}
