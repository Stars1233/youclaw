import { Hono } from 'hono'
import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { which, resetShellEnvCache } from '../utils/shell-env.ts'

const health = new Hono()

health.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

/**
 * Read live PATH from Windows registry (not inherited process.env).
 * System PATH: HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment\Path
 * User PATH:   HKCU\Environment\Path
 * Combines both, then searches for git.exe in each directory.
 */
function findGitFromRegistry(): string | null {
  const paths: string[] = []

  // Read system PATH from registry
  try {
    const sysOut = execSync(
      'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" /v Path',
      { encoding: 'utf-8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] },
    )
    const m = sysOut.match(/Path\s+REG_(?:SZ|EXPAND_SZ)\s+(.+)/i)
    if (m?.[1]) {
      // Expand %SystemRoot% etc. by resolving env vars
      let expanded = m[1].trim()
      expanded = expanded.replace(/%([^%]+)%/g, (_, key: string) => process.env[key] || `%${key}%`)
      paths.push(...expanded.split(';').filter(Boolean))
    }
  } catch { /* ignore */ }

  // Read user PATH from registry
  try {
    const userOut = execSync(
      'reg query "HKCU\\Environment" /v Path',
      { encoding: 'utf-8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] },
    )
    const m = userOut.match(/Path\s+REG_(?:SZ|EXPAND_SZ)\s+(.+)/i)
    if (m?.[1]) {
      let expanded = m[1].trim()
      expanded = expanded.replace(/%([^%]+)%/g, (_, key: string) => process.env[key] || `%${key}%`)
      paths.push(...expanded.split(';').filter(Boolean))
    }
  } catch { /* ignore */ }

  // Search for git.exe in each path entry
  for (const dir of paths) {
    const gitExe = resolve(dir, 'git.exe')
    if (existsSync(gitExe)) return gitExe
  }

  return null
}

/**
 * Detect a tool by trying a list of commands and retrieving its version.
 * Resets the shell env cache first so newly installed tools are picked up.
 */
function checkTool(commands: string[], versionFlag = '--version'): { path: string | null; version: string | null } {
  resetShellEnvCache()
  for (const cmd of commands) {
    const p = which(cmd)
    if (p) {
      let version: string | null = null
      try {
        version = execSync(`"${p}" ${versionFlag}`, {
          timeout: 5000,
          encoding: 'utf-8',
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trim()
      } catch { /* ignore version detection failure */ }
      return { path: p, version }
    }
  }
  return { path: null, version: null }
}

/**
 * Detect Git, with special handling for Windows (registry lookup).
 */
function checkGit(): { path: string | null; version: string | null } {
  let gitPath: string | null = null

  if (process.platform === 'win32') {
    // Windows: try registry first, then fall back to which
    gitPath = findGitFromRegistry() ?? which('git')
  } else {
    // macOS/Linux: refresh cache and use which
    resetShellEnvCache()
    gitPath = which('git')
  }

  if (!gitPath) return { path: null, version: null }

  let version: string | null = null
  try {
    version = execSync(`"${gitPath}" --version`, {
      timeout: 5000,
      encoding: 'utf-8',
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch { /* ignore */ }

  return { path: gitPath, version }
}

/**
 * Check if a Node.js version string satisfies the minimum requirement (>=18).
 */
function isNodeVersionSufficient(version: string): boolean {
  const major = parseInt(version.replace(/^v/, '').split('.')[0] ?? '0', 10)
  return major >= 18
}

// GET /api/git-check — check if git is available (backward compatible)
health.get('/git-check', (c) => {
  const result = checkGit()
  return c.json({ available: result.path !== null, path: result.path })
})

// GET /api/env-check — check all environment dependencies
health.get('/env-check', (c) => {
  const platform = process.platform
  const isWindows = platform === 'win32'

  const dependencies: Array<{
    name: string
    available: boolean
    path: string | null
    version: string | null
    required: boolean
  }> = []

  // 1. Git (required on all platforms)
  const git = checkGit()
  dependencies.push({
    name: 'git',
    available: git.path !== null,
    path: git.path,
    version: git.version,
    required: true,
  })

  // 2. Bun (required on all platforms)
  const bun = checkTool(['bun'])
  dependencies.push({
    name: 'bun',
    available: bun.path !== null,
    path: bun.path,
    version: bun.version,
    required: true,
  })

  // 3. Node.js (required only on Windows; on Windows also check version >= 18)
  const node = checkTool(['node'])
  let nodeAvailable = node.path !== null
  if (isWindows && nodeAvailable && node.version) {
    // On Windows, Node.js must be >= 18 to be considered available
    if (!isNodeVersionSufficient(node.version)) {
      nodeAvailable = false
    }
  }
  dependencies.push({
    name: 'node',
    available: nodeAvailable,
    path: node.path,
    version: node.version,
    required: isWindows,
  })

  // 4. Python (optional, all platforms)
  const pythonCmds = isWindows ? ['python3', 'python', 'py'] : ['python3', 'python']
  const python = checkTool(pythonCmds)
  dependencies.push({
    name: 'python',
    available: python.path !== null,
    path: python.path,
    version: python.version,
    required: false,
  })

  // 5. uv (optional, all platforms)
  const uv = checkTool(['uv'])
  dependencies.push({
    name: 'uv',
    available: uv.path !== null,
    path: uv.path,
    version: uv.version,
    required: false,
  })

  return c.json({ platform, dependencies })
})

export { health }
