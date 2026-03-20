import { create } from 'zustand'
import { getItem, setItem } from '@/lib/storage'
import { applyThemeToDOM, type Theme } from '@/hooks/useTheme'
import {
  checkGit,
  authLogout,
  getAuthLoginUrl,
  getAuthStatus,
  getAuthUser,
  getCloudStatus,
  getCreditBalance,
  getPayUrl,
  getRegistrySources,
  getSettings,
  updateProfile as apiUpdateProfile,
  updateSettings,
  type AuthUser,
  type RegistrySelectableSource,
  type RegistrySourceInfo,
} from '@/api/client'
import { isTauri } from '@/api/transport'
import type { Locale } from '@/i18n/context'
import { resolvePreferredRegistrySource } from '@/lib/registry-source'

type GlobalBubbleType = 'success' | 'error'

interface GlobalBubbleState {
  id: number
  message: string
  type: GlobalBubbleType
  durationMs: number
}

interface AppState {
  theme: Theme
  setTheme: (theme: Theme) => void

  locale: Locale
  setLocale: (locale: Locale) => void

  sidebarCollapsed: boolean
  toggleSidebar: () => void
  collapseSidebar: () => void
  expandSidebar: () => void

  cloudEnabled: boolean

  gitAvailable: boolean
  gitChecked: boolean
  recheckGit: () => Promise<boolean>

  modelReady: boolean

  registrySource: RegistrySelectableSource
  registrySources: RegistrySourceInfo[]
  setRegistrySource: (source: RegistrySelectableSource) => void
  setRegistrySources: (sources: RegistrySourceInfo[]) => void
  refreshRegistrySources: () => Promise<RegistrySourceInfo[]>

  user: AuthUser | null
  isLoggedIn: boolean
  authLoading: boolean
  fetchUser: () => Promise<void>
  login: () => Promise<void>
  logout: () => Promise<void>
  updateProfile: (params: { displayName?: string; avatar?: string }) => Promise<void>

  creditBalance: number | null
  fetchCreditBalance: () => Promise<void>
  openPayPage: () => Promise<void>

  globalBubble: GlobalBubbleState | null
  showGlobalBubble: (bubble: { message: string; type?: GlobalBubbleType; durationMs?: number }) => void
  dismissGlobalBubble: () => void

  hydrate: () => Promise<void>
}

let nextGlobalBubbleId = 0

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'system',
  setTheme: (theme) => {
    set({ theme })
    applyThemeToDOM(theme)
    setItem('theme', theme)
  },

  locale: 'en',
  setLocale: (locale) => {
    set({ locale })
    setItem('locale', locale)
  },

  sidebarCollapsed: false,
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    set({ sidebarCollapsed: next })
    setItem('sidebar-collapsed', String(next))
  },
  collapseSidebar: () => {
    set({ sidebarCollapsed: true })
    setItem('sidebar-collapsed', 'true')
  },
  expandSidebar: () => {
    set({ sidebarCollapsed: false })
    setItem('sidebar-collapsed', 'false')
  },

  cloudEnabled: false,

  gitAvailable: true,
  gitChecked: false,

  recheckGit: async () => {
    try {
      const { available } = await checkGit()
      set({ gitAvailable: available, gitChecked: true })
      return available
    } catch {
      set({ gitAvailable: true, gitChecked: true })
      return true
    }
  },

  modelReady: false,

  registrySource: 'clawhub',
  registrySources: [],
  setRegistrySource: (registrySource) => set({ registrySource }),
  setRegistrySources: (registrySources) => set({ registrySources }),
  refreshRegistrySources: async () => {
    try {
      const [settings, sources] = await Promise.all([
        getSettings(),
        getRegistrySources(),
      ])
      const locale = get().locale
      const registrySource = resolvePreferredRegistrySource(sources, settings.defaultRegistrySource, locale)
      set({ registrySources: sources, registrySource })
      return sources
    } catch {
      return get().registrySources
    }
  },

  user: null,
  isLoggedIn: false,
  authLoading: false,

  fetchUser: async () => {
    try {
      set({ authLoading: true })
      const user = await getAuthUser()
      if (!user.name) {
        user.name = `User_${user.id.slice(0, 6)}`
      }
      if (!user.avatar) {
        user.avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name)}`
      }
      set({ user, isLoggedIn: true, authLoading: false })
    } catch {
      set({ user: null, isLoggedIn: false, authLoading: false })
    }
  },

  login: async () => {
    try {
      set({ authLoading: true })

      const startPolling = () => {
        const pollInterval = setInterval(async () => {
          try {
            const { loggedIn } = await getAuthStatus()
            if (loggedIn) {
              clearInterval(pollInterval)
              await get().fetchUser()
              await get().fetchCreditBalance()
              set({ authLoading: false })
            }
          } catch {
            // Continue polling
          }
        }, 2000)
        setTimeout(() => {
          clearInterval(pollInterval)
          set({ authLoading: false })
        }, 120000)
        return pollInterval
      }

      if (isTauri) {
        const { loginUrl } = await getAuthLoginUrl('tauri')
        const { openUrl } = await import('@tauri-apps/plugin-opener')
        await openUrl(loginUrl)
        startPolling()
      } else {
        const { loginUrl } = await getAuthLoginUrl()
        window.open(loginUrl, '_blank')
        startPolling()
      }
    } catch (err) {
      console.error('Login failed:', err)
      set({ authLoading: false })
    }
  },

  logout: async () => {
    try {
      await authLogout()
    } catch {
      // Always clear local UI state even if backend request fails
    }
    set({ user: null, isLoggedIn: false, creditBalance: null })
  },

  updateProfile: async (params) => {
    const updatedUser = await apiUpdateProfile(params)
    set({ user: updatedUser })
  },

  creditBalance: null,

  fetchCreditBalance: async () => {
    try {
      const { balance } = await getCreditBalance()
      set({ creditBalance: balance })
    } catch {
      set({ creditBalance: null })
    }
  },

  openPayPage: async () => {
    try {
      if (isTauri) {
        const { payUrl } = await getPayUrl('tauri')
        const { openUrl } = await import('@tauri-apps/plugin-opener')
        await openUrl(payUrl)
      } else {
        const { payUrl } = await getPayUrl()
        window.open(payUrl, '_blank')
      }

      const oldBalance = get().creditBalance
      const pollInterval = setInterval(async () => {
        try {
          const { balance } = await getCreditBalance()
          if (balance !== oldBalance) {
            clearInterval(pollInterval)
            set({ creditBalance: balance })
          }
        } catch {
          // Continue polling
        }
      }, 3000)

      setTimeout(() => clearInterval(pollInterval), 120000)
    } catch (err) {
      console.error('Open pay page failed:', err)
    }
  },

  globalBubble: null,
  showGlobalBubble: ({ message, type = 'success', durationMs = 4000 }) => {
    set({
      globalBubble: {
        id: ++nextGlobalBubbleId,
        message,
        type,
        durationMs,
      },
    })
  },
  dismissGlobalBubble: () => {
    set({ globalBubble: null })
  },

  hydrate: async () => {
    const [theme, locale, sidebar] = await Promise.all([
      getItem('theme'),
      getItem('locale'),
      getItem('sidebar-collapsed'),
    ])
    const resolvedTheme = (theme as Theme) ?? 'system'
    const resolvedLocale = (locale as Locale) ?? (navigator.language.startsWith('zh') ? 'zh' : 'en')
    set({
      theme: resolvedTheme,
      locale: resolvedLocale,
      sidebarCollapsed: sidebar === 'true',
    })
    applyThemeToDOM(resolvedTheme)

    const isWindows = navigator.userAgent.includes('Windows')
    if (isWindows) {
      await get().recheckGit()
    }

    try {
      const [cloudStatus, settings, registrySources] = await Promise.all([
        getCloudStatus(),
        getSettings(),
        getRegistrySources().catch(() => [] as RegistrySourceInfo[]),
      ])
      const { enabled } = cloudStatus
      set({
        cloudEnabled: enabled,
        registrySources,
        registrySource: resolvePreferredRegistrySource(registrySources, settings.defaultRegistrySource, resolvedLocale),
      })

      if (enabled) {
        const { loggedIn } = await getAuthStatus()
        if (loggedIn) {
          await get().fetchUser()
          await get().fetchCreditBalance()
        }
      }

      const { provider } = settings.activeModel

      if (!enabled && (provider === 'builtin' || provider === 'cloud')) {
        await updateSettings({ activeModel: { provider: 'custom' } })
        set({ modelReady: settings.customModels.length > 0 })
      } else if (provider === 'custom') {
        const model = settings.activeModel.id
          ? settings.customModels.find((m) => m.id === settings.activeModel.id)
          : settings.customModels[0]
        set({ modelReady: !!model })
      } else {
        set({ modelReady: true })
      }
    } catch {
      // Backend not ready, ignore
    }
  },
}))
