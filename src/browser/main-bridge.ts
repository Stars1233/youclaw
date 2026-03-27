import type { BrowserProfile } from './types.ts'
import type {
  BrowserDiscovery,
  BrowserDiscoveryEntry,
  BrowserMainBridgeState,
} from './types.ts'
import type { BrowserRelayState } from './relay.ts'
import { detectInstalledBrowsers } from './detect.ts'

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
  const status: BrowserMainBridgeState['status'] =
    relay.connected
      ? 'connected'
      : discovery.browsers.length > 0
        ? 'ready'
        : 'no_browser_detected'

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
    status,
    connectionMode: 'manual-cdp-fallback',
    extensionBridgeAvailable: false,
  }
}
