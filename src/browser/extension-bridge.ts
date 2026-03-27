import { randomBytes } from 'node:crypto'
import type { BrowserDiscoveryKind } from './types.ts'

type PairingEntry = {
  profileId: string
  expiresAt: string
}

export interface BrowserExtensionBridgeSession {
  browserId: string | null
  browserName: string | null
  browserKind: BrowserDiscoveryKind | null
  tabId: string | null
  tabUrl: string | null
  tabTitle: string | null
  extensionVersion: string | null
  connectedAt: string
  updatedAt: string
}

const pairingCodes = new Map<string, PairingEntry>()
const extensionSessions = new Map<string, BrowserExtensionBridgeSession>()
const DEFAULT_PAIRING_TTL_MS = 5 * 60 * 1000

function createPairingCode(): string {
  return randomBytes(4).toString('hex')
}

export function createMainBridgePairingCode(profileId: string, ttlMs = DEFAULT_PAIRING_TTL_MS): { pairingCode: string; expiresAt: string } {
  const pairingCode = createPairingCode()
  const expiresAt = new Date(Date.now() + ttlMs).toISOString()
  pairingCodes.set(pairingCode, { profileId, expiresAt })
  return { pairingCode, expiresAt }
}

export function getMainBridgePairingCode(profileId: string): { pairingCode: string; expiresAt: string } | null {
  const now = Date.now()
  for (const [pairingCode, entry] of pairingCodes.entries()) {
    if (entry.profileId !== profileId) continue
    if (Date.parse(entry.expiresAt) <= now) {
      pairingCodes.delete(pairingCode)
      continue
    }
    return { pairingCode, expiresAt: entry.expiresAt }
  }
  return null
}

export function consumeMainBridgePairingCode(pairingCode: string): { profileId: string } {
  const entry = pairingCodes.get(pairingCode)
  if (!entry) {
    throw new Error('Invalid pairing code')
  }
  if (Date.parse(entry.expiresAt) <= Date.now()) {
    pairingCodes.delete(pairingCode)
    throw new Error('Pairing code expired')
  }
  pairingCodes.delete(pairingCode)
  return { profileId: entry.profileId }
}

export function getExtensionBridgeSession(profileId: string): BrowserExtensionBridgeSession | null {
  return extensionSessions.get(profileId) ?? null
}

export function setExtensionBridgeSession(profileId: string, patch: {
  browserId?: string | null
  browserName?: string | null
  browserKind?: BrowserDiscoveryKind | null
  tabId?: string | null
  tabUrl?: string | null
  tabTitle?: string | null
  extensionVersion?: string | null
}): BrowserExtensionBridgeSession {
  const current = extensionSessions.get(profileId)
  const now = new Date().toISOString()

  const next: BrowserExtensionBridgeSession = {
    browserId: patch.browserId ?? current?.browserId ?? null,
    browserName: patch.browserName ?? current?.browserName ?? null,
    browserKind: patch.browserKind ?? current?.browserKind ?? null,
    tabId: patch.tabId ?? current?.tabId ?? null,
    tabUrl: patch.tabUrl ?? current?.tabUrl ?? null,
    tabTitle: patch.tabTitle ?? current?.tabTitle ?? null,
    extensionVersion: patch.extensionVersion ?? current?.extensionVersion ?? null,
    connectedAt: current?.connectedAt ?? now,
    updatedAt: now,
  }

  extensionSessions.set(profileId, next)
  return next
}

export function clearExtensionBridgeSession(profileId: string): void {
  extensionSessions.delete(profileId)
}

export function deleteExtensionBridgeProfile(profileId: string): void {
  clearExtensionBridgeSession(profileId)
  for (const [pairingCode, entry] of pairingCodes.entries()) {
    if (entry.profileId === profileId) {
      pairingCodes.delete(pairingCode)
    }
  }
}
