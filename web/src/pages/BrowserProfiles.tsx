import { useState, useEffect, useCallback, type FormEvent, type ReactNode } from 'react'
import {
  connectBrowserProfileMainBridge,
  createBrowserProfileMainBridgePairing,
  createBrowserProfile,
  deleteBrowserProfile,
  disconnectBrowserProfileMainBridge,
  getBrowserDiscovery,
  getBrowserMainBridgeExtensionPackage,
  getBrowserProfileMainBridge,
  getBrowserProfileRelay,
  restartBrowserProfile,
  rotateBrowserProfileRelayToken,
  selectBrowserProfileMainBridgeBrowser,
  startBrowserProfile,
  stopBrowserProfile,
  downloadBrowserMainBridgeExtensionBundle,
} from '../api/client'
import type {
  BrowserDiscoveryDTO,
  BrowserExtensionPackageDTO,
  BrowserMainBridgeDTO,
  BrowserProfileDTO,
  BrowserRelayDTO,
} from '../api/client'
import { cn } from '../lib/utils'
import { useI18n } from '../i18n'
import { useChatContext } from '../hooks/chatCtx'
import { SidePanel } from '@/components/layout/SidePanel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, FolderOpen, Globe, Link, Play, Plus, RotateCw, Square, Trash2 } from 'lucide-react'
import { useDragRegion } from '@/hooks/useDragRegion'
import { notify } from '@/stores/app'
import { getBackendBaseUrl } from '@/api/transport'

export function BrowserProfiles() {
  const { t } = useI18n()
  const {
    browserProfiles: profiles,
    refreshBrowserProfiles,
  } = useChatContext()
  const drag = useDragRegion()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [browserDiscovery, setBrowserDiscovery] = useState<BrowserDiscoveryDTO | null>(null)
  const [extensionPackage, setExtensionPackage] = useState<BrowserExtensionPackageDTO | null>(null)
  const [backendUrlHint, setBackendUrlHint] = useState('')

  const selectedProfile = profiles.find((p) => p.id === selectedId) ?? null

  const loadProfiles = useCallback(() => {
    refreshBrowserProfiles()
  }, [refreshBrowserProfiles])

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  useEffect(() => {
    getBrowserDiscovery().then(setBrowserDiscovery).catch(() => {})
  }, [])

  useEffect(() => {
    getBrowserMainBridgeExtensionPackage().then(setExtensionPackage).catch(() => {})
    getBackendBaseUrl().then(setBackendUrlHint).catch(() => {})
  }, [])

  const handleDelete = async (id: string) => {
    await deleteBrowserProfile(id).catch(() => {})
    if (selectedId === id) setSelectedId(null)
    loadProfiles()
  }

  const handleControl = async (id: string, action: 'start' | 'stop' | 'restart') => {
    setBusyId(id)
    try {
      if (action === 'start') {
        await startBrowserProfile(id)
        notify.success(t.browser.launchSuccess)
      } else if (action === 'stop') {
        await stopBrowserProfile(id)
        notify.success('Browser stopped')
      } else {
        await restartBrowserProfile(id)
        notify.success('Browser restarted')
      }
      loadProfiles()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : t.browser.launchFailed, {
        durationMs: 6000,
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex h-full">
      <SidePanel>
        <div className="h-9 shrink-0 px-3 border-b border-[var(--subtle-border)] flex items-center justify-between" {...drag}>
          <h2 className="font-semibold text-sm">{t.browser.title}</h2>
          <button
            data-testid="browser-create-btn"
            onClick={() => {
              setSelectedId(null)
              setShowCreate(true)
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-accent-foreground transition-all duration-200 ease-[var(--ease-soft)]"
            title={t.browser.createProfile}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {profiles.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Globe className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">{t.browser.noProfiles}</p>
                <p className="text-xs mt-1">{t.browser.noProfilesHint}</p>
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  data-testid="browser-profile-item"
                  onClick={() => {
                    setSelectedId(profile.id)
                    setShowCreate(false)
                  }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all',
                    selectedId === profile.id
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent/50',
                  )}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    selectedId === profile.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}>
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-foreground">{profile.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{profile.driver}</span>
                      <span>·</span>
                      <span>{profile.runtime?.status ?? 'stopped'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SidePanel>

      <div className="flex-1 overflow-y-auto">
        {showCreate ? (
          <CreateProfileForm
            onCreated={() => {
              loadProfiles()
              setShowCreate(false)
            }}
            onCancel={() => setShowCreate(false)}
          />
        ) : selectedProfile ? (
          <ProfileDetail
            profile={selectedProfile}
            extensionPackage={extensionPackage}
            backendUrlHint={backendUrlHint}
            onRefresh={loadProfiles}
            isBusy={busyId === selectedProfile.id}
            onStart={() => handleControl(selectedProfile.id, 'start')}
            onStop={() => handleControl(selectedProfile.id, 'stop')}
            onRestart={() => handleControl(selectedProfile.id, 'restart')}
            onDelete={() => setDeleteId(selectedProfile.id)}
          />
        ) : (
          <div className="p-6">
            <BrowserGuideCard browserDiscovery={browserDiscovery} />
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.browser.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>Delete this browser profile and its persisted browser data directory.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) handleDelete(deleteId)
                setDeleteId(null)
              }}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function BrowserGuideCard({ browserDiscovery }: { browserDiscovery: BrowserDiscoveryDTO | null }) {
  const { t } = useI18n()

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="rounded-2xl border border-border bg-background/70 p-5 sm:p-6">
        <h2 className="text-lg font-semibold leading-tight sm:text-xl">{t.browser.guideTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground break-words">
          {t.browser.guideSummary}
        </p>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <DriverGuideCard title={t.browser.managedTitle} body={t.browser.managedBody} recommended />
        <DriverGuideCard title={t.browser.remoteTitle} body={t.browser.remoteBody} />
        <DriverGuideCard title={t.browser.relayTitle} body={t.browser.relayBody} advanced />
      </div>

      <DetectedBrowsersCard browserDiscovery={browserDiscovery} />

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm sm:p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="space-y-1.5">
            <p className="font-medium text-foreground">{t.browser.relayStepsTitle}</p>
            <p className="text-muted-foreground break-words">{t.browser.relayStep1}</p>
            <p className="text-muted-foreground break-words">{t.browser.relayStep2}</p>
            <p className="text-muted-foreground break-words">{t.browser.relayStep3}</p>
            <p className="break-words text-amber-600 dark:text-amber-400">{t.browser.relayWarning}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetectedBrowsersCard({ browserDiscovery }: { browserDiscovery: BrowserDiscoveryDTO | null }) {
  const { t } = useI18n()
  const browsers = browserDiscovery?.browsers ?? []

  return (
    <div className="rounded-2xl border border-border bg-background/70 p-5 sm:p-6">
      <h3 className="text-base font-semibold">{t.browser.detectedBrowsersTitle}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t.browser.detectedBrowsersHint}</p>

      {browsers.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t.browser.detectedBrowsersEmpty}</p>
      ) : (
        <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {browsers.map((browser) => (
            <div key={browser.id} className="rounded-xl border border-border/70 bg-background/80 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-foreground">{browser.name}</div>
                {browser.isRecommended && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {t.browser.detectedRecommended}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground break-all">{browser.executablePath}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DriverGuideCard({
  title,
  body,
  recommended = false,
  advanced = false,
}: {
  title: string
  body: string
  recommended?: boolean
  advanced?: boolean
}) {
  return (
    <div className="h-full min-w-0 rounded-2xl border border-border bg-background/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1 text-base font-semibold leading-tight break-words">{title}</div>
        {recommended && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            Recommended
          </span>
        )}
        {advanced && (
          <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            Advanced
          </span>
        )}
      </div>
      <p className="mt-3 text-sm leading-7 text-muted-foreground break-words">{body}</p>
    </div>
  )
}

function ProfileDetail({
  profile,
  extensionPackage,
  backendUrlHint,
  onRefresh,
  isBusy,
  onStart,
  onStop,
  onRestart,
  onDelete,
}: {
  profile: BrowserProfileDTO
  extensionPackage: BrowserExtensionPackageDTO | null
  backendUrlHint: string
  onRefresh: () => void
  isBusy: boolean
  onStart: () => void
  onStop: () => void
  onRestart: () => void
  onDelete: () => void
}) {
  const runtimeStatus = profile.runtime?.status ?? 'stopped'
  const running = runtimeStatus === 'running' || runtimeStatus === 'starting'
  const isExtensionRelay = profile.driver === 'extension-relay'
  const [mainBridge, setMainBridge] = useState<BrowserMainBridgeDTO | null>(null)
  const [relay, setRelay] = useState<BrowserRelayDTO | null>(null)
  const [relayUrl, setRelayUrl] = useState('')
  const [relayBusy, setRelayBusy] = useState<'connect' | 'disconnect' | 'rotate' | 'select-browser' | 'pair' | null>(null)
  const [showAdvancedRelay, setShowAdvancedRelay] = useState(false)

  const loadMainBridge = useCallback(async () => {
    if (!isExtensionRelay) {
      setMainBridge(null)
      return
    }

    try {
      const next = await getBrowserProfileMainBridge(profile.id)
      setMainBridge(next)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to load main browser state', {
        durationMs: 6000,
      })
    }
  }, [isExtensionRelay, profile.id])

  const loadRelay = useCallback(async () => {
    if (!isExtensionRelay) {
      setRelay(null)
      return
    }

    try {
      const next = await getBrowserProfileRelay(profile.id)
      setRelay(next)
      setRelayUrl(next.cdpUrl ?? '')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to load relay state', {
        durationMs: 6000,
      })
    }
  }, [isExtensionRelay, profile.id])

  useEffect(() => {
    void loadMainBridge()
  }, [loadMainBridge])

  useEffect(() => {
    void loadRelay()
  }, [loadRelay])

  useEffect(() => {
    if (!isExtensionRelay) return

    const intervalId = window.setInterval(() => {
      void loadMainBridge()
      void loadRelay()
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [isExtensionRelay, loadMainBridge, loadRelay])

  const handleRelayConnect = async () => {
    if (!mainBridge?.relayToken || !relayUrl.trim()) return
    setRelayBusy('connect')
    try {
      const result = await connectBrowserProfileMainBridge(profile.id, {
        token: mainBridge.relayToken,
        cdpUrl: relayUrl.trim(),
        browserId: mainBridge.selectedBrowserId,
        browserName: mainBridge.selectedBrowserName,
        browserKind: mainBridge.browsers.find((browser) => browser.id === mainBridge.selectedBrowserId)?.kind ?? null,
      })
      setMainBridge(result.state)
      setRelay(result.relay)
      setRelayUrl(result.relay.cdpUrl ?? relayUrl.trim())
      notify.success('Main browser session attached successfully.')
      onRefresh()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to attach main browser session', {
        durationMs: 6000,
      })
    } finally {
      setRelayBusy(null)
    }
  }

  const handleRelayDisconnect = async () => {
    setRelayBusy('disconnect')
    try {
      const result = await disconnectBrowserProfileMainBridge(profile.id)
      setMainBridge(result.state)
      setRelay(result.relay)
      notify.success('Main browser session disconnected.')
      onRefresh()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to disconnect main browser session', {
        durationMs: 6000,
      })
    } finally {
      setRelayBusy(null)
    }
  }

  const handleRelayRotateToken = async () => {
    setRelayBusy('rotate')
    try {
      const result = await rotateBrowserProfileRelayToken(profile.id)
      setRelay(result.relay)
      setRelayUrl('')
      notify.success('Relay token rotated. Existing relay connections were cleared.')
      await loadMainBridge()
      onRefresh()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to rotate relay token', {
        durationMs: 6000,
      })
    } finally {
      setRelayBusy(null)
    }
  }

  const handleSelectMainBridgeBrowser = async (browserId: string | null) => {
    setRelayBusy('select-browser')
    try {
      const result = await selectBrowserProfileMainBridgeBrowser(profile.id, browserId)
      setMainBridge(result.state)
      notify.success('Preferred browser updated.')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to update preferred browser', {
        durationMs: 6000,
      })
    } finally {
      setRelayBusy(null)
    }
  }

  const handleCreatePairing = async () => {
    setRelayBusy('pair')
    try {
      const result = await createBrowserProfileMainBridgePairing(profile.id)
      setMainBridge(result.state)
      notify.success('Pairing code created for the extension popup.')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to create pairing code', {
        durationMs: 6000,
      })
    } finally {
      setRelayBusy(null)
    }
  }

  return (
    <div className="p-6 space-y-6" data-testid="browser-profile-detail">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold" data-testid="browser-profile-name">{profile.name}</h2>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{profile.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isExtensionRelay && (
            <>
              <button
                data-testid="browser-launch-btn"
                onClick={running ? onStop : onStart}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {running ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {running ? 'Stop Browser' : 'Start Browser'}
              </button>
              <button
                onClick={onRestart}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-accent transition-colors disabled:opacity-50"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Restart
              </button>
            </>
          )}
          <button
            data-testid="browser-delete-btn"
            onClick={onDelete}
            className="p-2 rounded-xl hover:bg-destructive/20 text-muted-foreground hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Driver" value={profile.driver} />
        <InfoCard label="Runtime" value={runtimeStatus} />
        <InfoCard label="Created" value={new Date(profile.createdAt).toLocaleString()} />
        <InfoCard label="Default" value={profile.isDefault ? 'Yes' : 'No'} />
      {isExtensionRelay && (
          <InfoCard label="Relay Status" value={mainBridge?.status === 'connected' ? 'Connected' : 'Waiting for attach'} />
        )}
        <InfoCard
          label="Data Dir"
          value={profile.userDataDir ? (
            <span className="text-sm font-mono flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{profile.userDataDir}</span>
            </span>
          ) : 'N/A'}
        />
        <InfoCard
          label="CDP Endpoint"
          value={profile.cdpUrl ?? (profile.cdpPort ? `127.0.0.1:${profile.cdpPort}` : 'N/A')}
        />
      </div>

      {isExtensionRelay && relay && (
        <div className="rounded-2xl border border-border p-4 space-y-4">
          <MainBridgeCard
            mainBridge={mainBridge}
            relay={relay}
            extensionPackage={extensionPackage}
            backendUrlHint={backendUrlHint}
            relayUrl={relayUrl}
            onCreatePairing={handleCreatePairing}
            onUseRecommended={() => handleSelectMainBridgeBrowser(null)}
            onSelectBrowser={(browserId) => handleSelectMainBridgeBrowser(browserId)}
            onRelayUrlChange={setRelayUrl}
            onRelayConnect={handleRelayConnect}
            onRelayDisconnect={handleRelayDisconnect}
            onRelayRotateToken={handleRelayRotateToken}
            showAdvancedRelay={showAdvancedRelay}
            onToggleAdvancedRelay={() => setShowAdvancedRelay((current) => !current)}
            disabled={relayBusy !== null}
          />
        </div>
      )}

      {profile.runtime?.wsEndpoint && (
        <div className="rounded-2xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1.5">WebSocket Endpoint</div>
          <div className="text-sm font-mono break-all flex items-start gap-2">
            <Link className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <span>{profile.runtime.wsEndpoint}</span>
          </div>
        </div>
      )}

      {profile.runtime?.lastError && (
        <div className="text-xs rounded-xl p-3 border bg-red-500/10 border-red-500/30 text-red-400 whitespace-pre-line">
          {profile.runtime.lastError}
        </div>
      )}

      <div className="text-xs text-muted-foreground bg-muted/50 rounded-2xl p-4 border border-border space-y-1">
        <p className="font-medium text-foreground mb-2">Usage</p>
        {isExtensionRelay ? (
          <>
            <p>1. Keep the browser you want to attach running on this machine.</p>
            <p>2. The browser must expose a loopback CDP URL, such as `http://127.0.0.1:9222`.</p>
            <p>3. Attach the loopback CDP URL above using the relay token for authentication.</p>
            <p>4. Once attached, browser MCP tools will reuse that existing browser session.</p>
            <p>5. Disconnect or rotate the token to invalidate the relay.</p>
          </>
        ) : (
          <>
            <p>1. Start the browser for a managed profile.</p>
            <p>2. Log in manually to websites that require authentication.</p>
            <p>3. The browser state is stored in the profile data directory.</p>
            <p>4. Bind this profile to an agent or select it in chat.</p>
            <p>5. Browser MCP tools will reuse the same persisted session.</p>
          </>
        )}
      </div>
    </div>
  )
}

function MainBridgeCard({
  mainBridge,
  relay,
  extensionPackage,
  backendUrlHint,
  relayUrl,
  onCreatePairing,
  onUseRecommended,
  onSelectBrowser,
  onRelayUrlChange,
  onRelayConnect,
  onRelayDisconnect,
  onRelayRotateToken,
  showAdvancedRelay,
  onToggleAdvancedRelay,
  disabled,
}: {
  mainBridge: BrowserMainBridgeDTO | null
  relay: BrowserRelayDTO
  extensionPackage: BrowserExtensionPackageDTO | null
  backendUrlHint: string
  relayUrl: string
  onCreatePairing: () => void
  onUseRecommended: () => void
  onSelectBrowser: (browserId: string | null) => void
  onRelayUrlChange: (value: string) => void
  onRelayConnect: () => void
  onRelayDisconnect: () => void
  onRelayRotateToken: () => void
  showAdvancedRelay: boolean
  onToggleAdvancedRelay: () => void
  disabled: boolean
}) {
  const { t } = useI18n()
  const effectiveBackendUrl = backendUrlHint || 'http://127.0.0.1:62601'
  const statusText =
    mainBridge?.status === 'connected'
      ? t.browser.mainBridgeStatusConnected
      : mainBridge?.status === 'paired'
        ? t.browser.mainBridgeStatusPaired
      : mainBridge?.status === 'ready'
        ? t.browser.mainBridgeStatusReady
        : t.browser.mainBridgeStatusNoBrowser

  const selectionText =
    mainBridge?.selectionSource === 'profile'
      ? t.browser.mainBridgeSelectionManual
      : mainBridge?.selectionSource === 'recommended'
        ? t.browser.mainBridgeSelectionAuto
        : t.browser.mainBridgeSelectionNone

  const stepChooseDone = Boolean(mainBridge?.selectedBrowserName)
  const stepInstallDone =
    mainBridge?.status === 'paired' ||
    (mainBridge?.status === 'connected' && mainBridge.connectionMode === 'extension-bridge')
  const stepPairDone =
    Boolean(mainBridge?.pairingCode) ||
    mainBridge?.status === 'paired' ||
    (mainBridge?.status === 'connected' && mainBridge.connectionMode === 'extension-bridge')
  const stepConnectDone =
    mainBridge?.status === 'connected' && mainBridge.connectionMode === 'extension-bridge'

  const copyText = (text: string, successMessage: string, errorMessage: string) => {
    navigator.clipboard.writeText(text).then(() => {
      notify.success(successMessage)
    }).catch((err) => {
      notify.error(err instanceof Error ? err.message : errorMessage, {
        durationMs: 6000,
      })
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-foreground">{t.browser.mainBridgeTitle}</div>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">{t.browser.mainBridgeBody}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard label="Status" value={statusText} />
        <InfoCard label={t.browser.mainBridgeSelectionLabel} value={mainBridge?.selectedBrowserName ?? selectionText} />
      </div>

      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {t.browser.mainBridgeStepsTitle}
      </div>

      <StepCard title={t.browser.mainBridgeStepChoose} done={stepChooseDone}>
        <p className="text-xs leading-6 text-muted-foreground">
          Pick the browser you want YouClaw to treat as your main browser. If you do nothing, the recommended browser will stay selected.
        </p>

        {mainBridge && mainBridge.browsers.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onUseRecommended}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                {t.browser.mainBridgeUseRecommended}
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">{t.browser.mainBridgeSelectLabel}</label>
              <select
                value={mainBridge.selectedBrowserId ?? '__recommended__'}
                onChange={(e) => onSelectBrowser(e.target.value === '__recommended__' ? null : e.target.value)}
                disabled={disabled}
                className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              >
                <option value="__recommended__">{t.browser.mainBridgeUseRecommended}</option>
                {mainBridge.browsers.map((browser) => (
                  <option key={browser.id} value={browser.id}>
                    {browser.name}{browser.isRecommended ? ` · ${t.browser.detectedRecommended}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              {mainBridge.browsers.map((browser) => (
                <div key={browser.id} className="rounded-xl border border-border/70 bg-background/70 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-foreground">{browser.name}</div>
                    {browser.isRecommended && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {t.browser.detectedRecommended}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground break-all">{browser.executablePath}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t.browser.detectedBrowsersEmpty}</p>
        )}
      </StepCard>

      <StepCard title={t.browser.mainBridgeStepInstall} done={stepInstallDone}>
        <p className="text-xs leading-6 text-muted-foreground">
          Install the unpacked extension in the selected browser. This is the preferred path for connecting the browser tab you already use.
        </p>

        {extensionPackage ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <InfoCard label="Version" value={extensionPackage.version} />
              <InfoCard label="Backend URL" value={effectiveBackendUrl} />
            </div>
            <InfoCard label="Extension Path" value={extensionPackage.directoryPath} />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copyText(effectiveBackendUrl, 'Backend URL copied.', 'Failed to copy backend URL')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
              >
                {t.browser.mainBridgeCopyBackend}
              </button>
              <button
                type="button"
                onClick={() => downloadBrowserMainBridgeExtensionBundle().catch((err) => {
                  notify.error(err instanceof Error ? err.message : 'Failed to download extension bundle', {
                    durationMs: 6000,
                  })
                })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
              >
                Download Extension Bundle
              </button>
              <button
                type="button"
                onClick={() => copyText(extensionPackage.directoryPath, 'Extension path copied.', 'Failed to copy extension path')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
              >
                Copy Extension Path
              </button>
            </div>
            <div className="text-xs text-muted-foreground leading-6">
              Open `chrome://extensions` in the target browser, enable Developer Mode, then click “Load unpacked” and choose the directory above.
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            Extension package metadata is not available yet.
          </div>
        )}
      </StepCard>

      <StepCard title={t.browser.mainBridgeStepPair} done={stepPairDone}>
        <p className="text-xs leading-6 text-muted-foreground">
          Generate a pairing code, then enter it in the extension popup together with the backend URL.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCreatePairing}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            {mainBridge?.pairingCode ? 'Refresh Pairing Code' : 'Generate Pairing Code'}
          </button>
        </div>

        {mainBridge?.pairingCode ? (
          <div className="space-y-1 rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="text-xs text-muted-foreground">Pairing Code</div>
            <div className="font-mono text-sm text-foreground">{mainBridge.pairingCode}</div>
            {mainBridge.pairingCodeExpiresAt && (
              <div className="text-xs text-muted-foreground">
                {t.browser.mainBridgePairingExpires} {new Date(mainBridge.pairingCodeExpiresAt).toLocaleString()}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Use this code in the extension popup to connect the current tab.
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyText(mainBridge.pairingCode ?? '', 'Pairing code copied.', 'Failed to copy pairing code')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
              >
                {t.browser.mainBridgeCopyPairing}
              </button>
              <button
                type="button"
                onClick={onCreatePairing}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                {t.browser.mainBridgeRefresh}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Generate a pairing code first, then keep the popup open while you connect the target tab.
          </div>
        )}
      </StepCard>

      <StepCard title={t.browser.mainBridgeStepConnect} done={stepConnectDone}>
        <p className="text-xs leading-6 text-muted-foreground">
          Open the tab you want YouClaw to control, then use the browser extension popup and click “Connect Current Tab”.
        </p>

        {mainBridge?.connectedBrowserName ? (
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-2">
            <div className="text-xs text-muted-foreground">{t.browser.mainBridgeConnectedSession}</div>
            <div className="text-sm font-medium text-foreground">{mainBridge.connectedBrowserName}</div>
            <div className="text-xs text-muted-foreground">Mode: {mainBridge.connectionMode}</div>
            {mainBridge.connectedAt && (
              <div className="text-xs text-muted-foreground">
                Connected at {new Date(mainBridge.connectedAt).toLocaleString()}
              </div>
            )}
            {mainBridge.connectedTabTitle && (
              <div className="text-sm text-foreground break-words">{mainBridge.connectedTabTitle}</div>
            )}
            {mainBridge.connectedTabUrl && (
              <div className="text-xs text-muted-foreground break-all">{mainBridge.connectedTabUrl}</div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-xs leading-6 text-muted-foreground">
            No browser tab is connected yet. After you finish the first three steps, switch to the tab you want to control and connect it from the extension popup.
          </div>
        )}
      </StepCard>

      <StepCard title={t.browser.mainBridgeStepAdvanced}>
        <p className="text-xs leading-6 text-muted-foreground">{t.browser.relayAdvancedBody}</p>
        <button
          type="button"
          onClick={onToggleAdvancedRelay}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
        >
          <Link className="h-3.5 w-3.5" />
          {showAdvancedRelay ? 'Hide Advanced Relay' : 'Show Advanced Relay'}
        </button>

        {showAdvancedRelay && (
          <div className="space-y-4 rounded-xl border border-border/70 bg-background/80 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Attach Token</div>
                <div className="text-sm font-mono break-all">{relay.token}</div>
              </div>
              <button
                type="button"
                onClick={onRelayRotateToken}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border hover:bg-accent transition-colors disabled:opacity-50"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Rotate Token
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">Loopback CDP URL</label>
              <input
                value={relayUrl}
                onChange={(e) => onRelayUrlChange(e.target.value)}
                placeholder="http://127.0.0.1:9222 or ws://127.0.0.1:9222/devtools/browser/..."
                className="w-full px-3 py-2 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Only loopback CDP URLs are accepted. This keeps the relay limited to a browser running on the same machine.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRelayConnect}
                disabled={disabled || !relayUrl.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Link className="h-3.5 w-3.5" />
                Attach Relay
              </button>
              <button
                type="button"
                onClick={onRelayDisconnect}
                disabled={disabled || !(mainBridge?.status === 'connected')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-accent transition-colors disabled:opacity-50"
              >
                <Square className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </div>

            {relay.connectedAt && (
              <div className="text-xs text-muted-foreground">
                Connected at {new Date(relay.connectedAt).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </StepCard>
    </div>
  )
}

function StepCard({
  title,
  done,
  children,
}: {
  title: string
  done?: boolean
  children: ReactNode
}) {
  const { t } = useI18n()

  return (
    <div className="rounded-xl border border-border/70 bg-background/80 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {typeof done === 'boolean' && (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
              done ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary',
            )}
          >
            {done ? t.browser.mainBridgeStepDone : t.browser.mainBridgeStepTodo}
          </span>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="text-xs text-muted-foreground mb-1.5">{label}</div>
      <div className="text-sm font-semibold break-all">{value}</div>
    </div>
  )
}

function CreateProfileForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [driver, setDriver] = useState<'managed' | 'remote-cdp' | 'extension-relay'>('managed')
  const [cdpUrl, setCdpUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await createBrowserProfile({
        name: name.trim(),
        driver,
        cdpUrl: driver === 'remote-cdp' ? cdpUrl.trim() || null : undefined,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">{t.browser.createTitle}</h2>
      <div className="mb-6">
        <BrowserGuideCard />
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <div>
          <label className="block text-xs font-medium mb-1.5">{t.browser.profileName}</label>
          <input
            type="text"
            data-testid="browser-input-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.browser.profileNamePlaceholder}
            className="w-full px-3 py-2 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5">Driver</label>
          <select
            value={driver}
            onChange={(e) => setDriver(e.target.value as 'managed' | 'remote-cdp' | 'extension-relay')}
            className="w-full px-3 py-2 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="managed">Managed Chromium</option>
            <option value="remote-cdp">Remote CDP</option>
            <option value="extension-relay">Main Browser (Advanced)</option>
          </select>
        </div>

        {driver === 'remote-cdp' && (
          <div>
            <label className="block text-xs font-medium mb-1.5">CDP URL</label>
            <input
              type="text"
              value={cdpUrl}
              onChange={(e) => setCdpUrl(e.target.value)}
              placeholder="http://127.0.0.1:9222 or ws://host/devtools/browser/..."
              className="w-full px-3 py-2 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}

        {error && <p data-testid="browser-form-error" className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            data-testid="browser-submit-btn"
            disabled={submitting || !name.trim()}
            className="px-5 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? t.browser.creating : t.common.create}
          </button>
          <button
            type="button"
            data-testid="browser-cancel-btn"
            onClick={onCancel}
            className="px-5 py-2 text-sm font-medium rounded-xl border border-border text-muted-foreground hover:bg-accent transition-colors"
          >
            {t.common.cancel}
          </button>
        </div>
      </form>
    </div>
  )
}
