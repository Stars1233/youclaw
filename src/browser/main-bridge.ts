import type { BrowserProfile } from './types.ts'
import type {
  BrowserDiscovery,
  BrowserDiscoveryEntry,
  BrowserDiscoveryKind,
  BrowserMainBridgeState,
} from './types.ts'
import type { BrowserRelayState } from './relay.ts'
import { detectInstalledBrowsers } from './detect.ts'
import {
  getExtensionBridgeSession,
  getMainBridgePairingCode,
} from './extension-bridge.ts'

export interface BrowserMainBridgeSession {
  browserId: string | null
  browserName: string | null
  browserKind: BrowserDiscoveryKind | null
  tabId: string | null
  tabUrl: string | null
  tabTitle: string | null
  connectedAt: string
  updatedAt: string
}

const sessions = new Map<string, BrowserMainBridgeSession>()

export function getBrowserMainBridgeSession(profileId: string): BrowserMainBridgeSession | null {
  return sessions.get(profileId) ?? null
}

export function setBrowserMainBridgeSession(profileId: string, patch: {
  browserId?: string | null
  browserName?: string | null
  browserKind?: BrowserDiscoveryKind | null
  tabId?: string | null
  tabUrl?: string | null
  tabTitle?: string | null
}): BrowserMainBridgeSession {
  const current = sessions.get(profileId)
  const now = new Date().toISOString()

  const next: BrowserMainBridgeSession = {
    browserId: patch.browserId ?? current?.browserId ?? null,
    browserName: patch.browserName ?? current?.browserName ?? null,
    browserKind: patch.browserKind ?? current?.browserKind ?? null,
    tabId: patch.tabId ?? current?.tabId ?? null,
    tabUrl: patch.tabUrl ?? current?.tabUrl ?? null,
    tabTitle: patch.tabTitle ?? current?.tabTitle ?? null,
    connectedAt: current?.connectedAt ?? now,
    updatedAt: now,
  }

  sessions.set(profileId, next)
  return next
}

export function clearBrowserMainBridgeSession(profileId: string): void {
  sessions.delete(profileId)
}

export function deleteBrowserMainBridgeProfile(profileId: string): void {
  sessions.delete(profileId)
}

function resolveSelectedBrowser(
  profile: BrowserProfile,
  discovery: BrowserDiscovery,
): {
  browser: BrowserDiscoveryEntry | null
  selectionSource: BrowserMainBridgeState['selectionSource']
} {
  if (profile.executablePath) {
    const matched = discovery.browsers.find((browser) => browser.executablePath === profile.executablePath)
    if (matched) {
      return { browser: matched, selectionSource: 'profile' }
    }
  }

  if (discovery.recommendedBrowserId) {
    const recommended = discovery.browsers.find((browser) => browser.id === discovery.recommendedBrowserId) ?? null
    if (recommended) {
      return { browser: recommended, selectionSource: 'recommended' }
    }
  }

  return { browser: null, selectionSource: 'none' }
}

export function buildBrowserMainBridgeState(
  profile: BrowserProfile,
  relay: BrowserRelayState,
  discovery = detectInstalledBrowsers(),
): BrowserMainBridgeState {
  const resolved = resolveSelectedBrowser(profile, discovery)
  const session = getBrowserMainBridgeSession(profile.id)
  const extensionSession = getExtensionBridgeSession(profile.id)
  const pairing = getMainBridgePairingCode(profile.id)
  const status: BrowserMainBridgeState['status'] =
    relay.connected
      ? 'connected'
      : extensionSession
        ? 'paired'
        : discovery.browsers.length > 0
          ? 'ready'
          : 'no_browser_detected'
  const connectionMode: BrowserMainBridgeState['connectionMode'] = session
    ? 'main-bridge'
    : extensionSession
      ? 'extension-bridge'
    : relay.connected
      ? 'manual-cdp-fallback'
      : 'none'
  const connectedBrowserId = session?.browserId ?? extensionSession?.browserId ?? (relay.connected ? resolved.browser?.id ?? null : null)
  const connectedBrowserName = session?.browserName ?? extensionSession?.browserName ?? (relay.connected ? resolved.browser?.name ?? null : null)
  const connectedBrowserKind = session?.browserKind ?? extensionSession?.browserKind ?? (relay.connected ? resolved.browser?.kind ?? null : null)

  return {
    profileId: profile.id,
    selectedBrowserId: resolved.browser?.id ?? null,
    selectedBrowserName: resolved.browser?.name ?? null,
    selectedExecutablePath: resolved.browser?.executablePath ?? profile.executablePath ?? null,
    selectionSource: resolved.selectionSource,
    browsers: discovery.browsers,
    recommendedBrowserId: discovery.recommendedBrowserId,
    recommendationSource: discovery.recommendationSource,
    relayConnected: relay.connected,
    relayToken: relay.token,
    relayCdpUrl: relay.cdpUrl,
    connectedBrowserId,
    connectedBrowserName,
    connectedBrowserKind,
    connectedTabId: session?.tabId ?? extensionSession?.tabId ?? null,
    connectedTabUrl: session?.tabUrl ?? extensionSession?.tabUrl ?? null,
    connectedTabTitle: session?.tabTitle ?? extensionSession?.tabTitle ?? null,
    extensionVersion: extensionSession?.extensionVersion ?? null,
    pairingCode: pairing?.pairingCode ?? null,
    pairingCodeExpiresAt: pairing?.expiresAt ?? null,
    connectedAt: session?.connectedAt ?? extensionSession?.connectedAt ?? (relay.connected ? relay.connectedAt : null),
    updatedAt: session?.updatedAt ?? extensionSession?.updatedAt ?? relay.updatedAt,
    status,
    connectionMode,
    extensionBridgeAvailable: true,
  }
}
