import { existsSync } from 'node:fs'
import type { BrowserDiscovery, BrowserDiscoveryEntry, BrowserDiscoveryKind } from './types.ts'

type CandidateDefinition = {
  id: string
  name: string
  kind: BrowserDiscoveryKind
  darwin: string[]
  win32: string[]
  linux: string[]
}

const CANDIDATES: CandidateDefinition[] = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    kind: 'chrome',
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    win32: [
      '%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe',
      '%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe',
      '%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe',
    ],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'],
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    kind: 'edge',
    darwin: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
    win32: [
      '%LOCALAPPDATA%\\Microsoft\\Edge\\Application\\msedge.exe',
      '%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe',
      '%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
    linux: ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable'],
  },
  {
    id: 'brave',
    name: 'Brave',
    kind: 'brave',
    darwin: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
    win32: [
      '%LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      '%ProgramFiles%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      '%ProgramFiles(x86)%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    ],
    linux: ['/usr/bin/brave-browser', '/usr/bin/brave-browser-stable'],
  },
  {
    id: 'chromium',
    name: 'Chromium',
    kind: 'chromium',
    darwin: ['/Applications/Chromium.app/Contents/MacOS/Chromium'],
    win32: [
      '%LOCALAPPDATA%\\Chromium\\Application\\chrome.exe',
      '%ProgramFiles%\\Chromium\\Application\\chrome.exe',
      '%ProgramFiles(x86)%\\Chromium\\Application\\chrome.exe',
    ],
    linux: ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'],
  },
  {
    id: 'vivaldi',
    name: 'Vivaldi',
    kind: 'vivaldi',
    darwin: ['/Applications/Vivaldi.app/Contents/MacOS/Vivaldi'],
    win32: [
      '%LOCALAPPDATA%\\Vivaldi\\Application\\vivaldi.exe',
      '%ProgramFiles%\\Vivaldi\\Application\\vivaldi.exe',
      '%ProgramFiles(x86)%\\Vivaldi\\Application\\vivaldi.exe',
    ],
    linux: ['/usr/bin/vivaldi', '/usr/bin/vivaldi-stable'],
  },
  {
    id: 'arc',
    name: 'Arc',
    kind: 'arc',
    darwin: ['/Applications/Arc.app/Contents/MacOS/Arc'],
    win32: [],
    linux: [],
  },
]

function expandWindowsPath(rawPath: string, env: NodeJS.ProcessEnv): string {
  return rawPath.replace(/%([^%]+)%/g, (_, key: string) => env[key] ?? '')
}

function getCandidatePaths(
  candidate: CandidateDefinition,
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
): string[] {
  switch (platform) {
    case 'darwin':
      return candidate.darwin
    case 'win32':
      return candidate.win32.map((entry) => expandWindowsPath(entry, env))
    default:
      return candidate.linux
  }
}

function guessRecommendedBrowserId(
  browsers: BrowserDiscoveryEntry[],
  env: NodeJS.ProcessEnv,
): { recommendedBrowserId: string | null; recommendationSource: BrowserDiscovery['recommendationSource'] } {
  if (browsers.length === 0) {
    return { recommendedBrowserId: null, recommendationSource: 'none' }
  }

  const browserHint = (env.BROWSER ?? '').toLowerCase()
  if (browserHint) {
    const hinted = browsers.find((browser) =>
      browserHint.includes(browser.id) ||
      browserHint.includes(browser.kind) ||
      browserHint.includes(browser.name.toLowerCase()),
    )
    if (hinted) {
      return { recommendedBrowserId: hinted.id, recommendationSource: 'env' }
    }
  }

  return { recommendedBrowserId: browsers[0]!.id, recommendationSource: 'priority' }
}

export function detectInstalledBrowsers(params?: {
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
  exists?: (path: string) => boolean
}): BrowserDiscovery {
  const platform = params?.platform ?? process.platform
  const env = params?.env ?? process.env
  const exists = params?.exists ?? existsSync

  const browsers: BrowserDiscoveryEntry[] = []

  for (const candidate of CANDIDATES) {
    const executablePath = getCandidatePaths(candidate, platform, env).find((entry) => entry && exists(entry))
    if (!executablePath) continue

    browsers.push({
      id: candidate.id,
      name: candidate.name,
      kind: candidate.kind,
      executablePath,
      isRecommended: false,
    })
  }

  const recommendation = guessRecommendedBrowserId(browsers, env)
  const nextBrowsers = browsers.map((browser) => ({
    ...browser,
    isRecommended: browser.id === recommendation.recommendedBrowserId,
  }))

  return {
    browsers: nextBrowsers,
    recommendedBrowserId: recommendation.recommendedBrowserId,
    recommendationSource: recommendation.recommendationSource,
  }
}
