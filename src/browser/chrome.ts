import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import type { BrowserProfile } from './types.ts'
import { DEFAULT_CDP_PORT_END, DEFAULT_CDP_PORT_START } from './types.ts'

export interface ChromeLaunchResult {
  child: ChildProcess
  executablePath: string
  launchArgs: string[]
}

export function detectChromeExecutable(): string | null {
  const candidates =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ]
      : process.platform === 'win32'
        ? [
            `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
            `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
            `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
          ]
        : [
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/snap/bin/chromium',
          ]

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate
  }

  return null
}

export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => {
      resolve(false)
    })
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, '127.0.0.1')
  })
}

export async function findAvailablePort(start = DEFAULT_CDP_PORT_START, end = DEFAULT_CDP_PORT_END): Promise<number> {
  for (let port = start; port <= end; port++) {
    if (await isPortAvailable(port)) return port
  }
  throw new Error(`No available CDP port found in range ${start}-${end}`)
}

export function buildChromeLaunchArgs(profile: BrowserProfile): string[] {
  if (!profile.userDataDir) {
    throw new Error(`Managed browser profile "${profile.id}" is missing userDataDir`)
  }
  if (!profile.cdpPort) {
    throw new Error(`Managed browser profile "${profile.id}" is missing cdpPort`)
  }

  const args = [
    `--remote-debugging-port=${profile.cdpPort}`,
    `--user-data-dir=${profile.userDataDir}`,
    '--no-first-run',
    '--disable-sync',
    '--password-store=basic',
  ]

  if (profile.headless) {
    args.push('--headless=new')
  }
  if (profile.noSandbox) {
    args.push('--no-sandbox')
  }
  if (profile.launchArgs.length > 0) {
    args.push(...profile.launchArgs)
  }

  args.push('about:blank')
  return args
}

export function spawnManagedChrome(profile: BrowserProfile): ChromeLaunchResult {
  const executablePath = profile.executablePath ?? detectChromeExecutable()
  if (!executablePath) {
    throw new Error('Chrome executable not found')
  }
  if (!profile.userDataDir) {
    throw new Error(`Managed browser profile "${profile.id}" is missing userDataDir`)
  }

  mkdirSync(profile.userDataDir, { recursive: true })
  const launchArgs = buildChromeLaunchArgs(profile)
  const child = spawn(executablePath, launchArgs, {
    stdio: 'ignore',
    env: process.env,
  })

  return { child, executablePath, launchArgs }
}

export function resolveCdpHttpBase(profile: BrowserProfile): string {
  if (profile.cdpUrl) {
    const url = new URL(profile.cdpUrl)
    if (url.protocol === 'ws:' || url.protocol === 'wss:') {
      return `${url.protocol === 'wss:' ? 'https:' : 'http:'}//${url.host}`
    }
    return `${url.protocol}//${url.host}`
  }

  if (profile.cdpPort) {
    return `http://127.0.0.1:${profile.cdpPort}`
  }

  throw new Error(`Browser profile "${profile.id}" has no CDP endpoint`)
}

export async function probeCdpVersion(profile: BrowserProfile): Promise<{ webSocketDebuggerUrl: string | null; browser: string | null }> {
  const base = resolveCdpHttpBase(profile)
  const res = await fetch(`${base}/json/version`)
  if (!res.ok) {
    throw new Error(`CDP probe failed: ${res.status} ${res.statusText}`)
  }
  const body = await res.json() as { webSocketDebuggerUrl?: string; Browser?: string }
  return {
    webSocketDebuggerUrl: body.webSocketDebuggerUrl ?? null,
    browser: body.Browser ?? null,
  }
}

export async function waitForCdpReady(profile: BrowserProfile, timeoutMs = 15_000): Promise<{ webSocketDebuggerUrl: string | null; browser: string | null }> {
  const deadline = Date.now() + timeoutMs
  let lastError = 'CDP endpoint did not become ready'

  while (Date.now() < deadline) {
    try {
      return await probeCdpVersion(profile)
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  throw new Error(lastError)
}
