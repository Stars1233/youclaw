import { create } from "zustand"
import { getItem, setItem } from "@/lib/storage"
import { applyThemeToDOM, type Theme } from "@/hooks/useTheme"
import { getAuthUser, getAuthStatus, getAuthLoginUrl, authLogout, getCreditBalance, getPayUrl, updateProfile as apiUpdateProfile, getCloudStatus, getSettings, updateSettings, saveAuthToken, type AuthUser } from "@/api/client"
import { isTauri } from "@/api/transport"
import type { Locale } from "@/i18n/context"

interface AppState {
  theme: Theme
  setTheme: (theme: Theme) => void

  locale: Locale
  setLocale: (locale: Locale) => void

  sidebarCollapsed: boolean
  toggleSidebar: () => void
  collapseSidebar: () => void
  expandSidebar: () => void

  // Cloud
  cloudEnabled: boolean

  // Model
  modelReady: boolean

  // Auth
  user: AuthUser | null
  isLoggedIn: boolean
  authLoading: boolean
  fetchUser: () => Promise<void>
  login: () => Promise<void>
  logout: () => Promise<void>
  updateProfile: (params: { displayName?: string; avatar?: string }) => Promise<void>

  // Credits
  creditBalance: number | null
  fetchCreditBalance: () => Promise<void>
  openPayPage: () => Promise<void>

  hydrate: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: "system",
  setTheme: (theme) => {
    set({ theme })
    applyThemeToDOM(theme)
    setItem("theme", theme)
  },

  locale: "en",
  setLocale: (locale) => {
    set({ locale })
    setItem("locale", locale)
  },

  sidebarCollapsed: false,
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    set({ sidebarCollapsed: next })
    setItem("sidebar-collapsed", String(next))
  },
  collapseSidebar: () => {
    set({ sidebarCollapsed: true })
    setItem("sidebar-collapsed", "true")
  },
  expandSidebar: () => {
    set({ sidebarCollapsed: false })
    setItem("sidebar-collapsed", "false")
  },

  // Cloud
  cloudEnabled: false,

  // Model
  modelReady: false,

  // Auth
  user: null,
  isLoggedIn: false,
  authLoading: false,

  fetchUser: async () => {
    try {
      set({ authLoading: true })
      const user = await getAuthUser()
      // 后端未返回名称时，通过用户 id 拼一个默认用户名
      if (!user.name) {
        user.name = `User_${user.id.slice(0, 6)}`
      }
      // 后端未返回头像时，使用默认头像
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

      if (isTauri) {
        // Tauri 模式：使用 deep link 回调
        const { loginUrl } = await getAuthLoginUrl('tauri')
        const { openUrl } = await import('@tauri-apps/plugin-opener')
        await openUrl(loginUrl)

        // 监听 deep link 事件
        const { listen } = await import('@tauri-apps/api/event')
        let timeoutId: ReturnType<typeof setTimeout>
        const unlisten = await listen<string>('deep-link-received', async (event) => {
          try {
            const url = new URL(event.payload)
            if (url.host === 'auth' || url.pathname.startsWith('/auth/callback') || url.pathname.startsWith('auth/callback')) {
              const token = url.searchParams.get('token')
              if (token) {
                await saveAuthToken(token)
                await get().fetchUser()
                await get().fetchCreditBalance()
              }
            }
          } catch (err) {
            console.error('Deep link auth failed:', err)
          } finally {
            unlisten()
            clearTimeout(timeoutId)
            set({ authLoading: false })
          }
        })

        // 120 秒超时
        timeoutId = setTimeout(() => {
          unlisten()
          set({ authLoading: false })
        }, 120000)
      } else {
        // Web 模式：保持轮询逻辑
        const { loginUrl } = await getAuthLoginUrl()
        window.open(loginUrl, '_blank')

        const pollInterval = setInterval(async () => {
          try {
            const { loggedIn } = await getAuthStatus()
            if (loggedIn) {
              clearInterval(pollInterval)
              await get().fetchUser()
              await get().fetchCreditBalance()
            }
          } catch {
            // 继续轮询
          }
        }, 2000)

        // 60 秒超时
        setTimeout(() => {
          clearInterval(pollInterval)
          set({ authLoading: false })
        }, 60000)
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
      // 即使远程注销失败也清理本地状态
    }
    set({ user: null, isLoggedIn: false, creditBalance: null })
  },

  updateProfile: async (params) => {
    const updatedUser = await apiUpdateProfile(params)
    set({ user: updatedUser })
  },

  // Credits
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
        // Tauri 模式：使用 deep link 回调
        const { payUrl } = await getPayUrl('tauri')
        const { openUrl } = await import('@tauri-apps/plugin-opener')
        await openUrl(payUrl)

        // 监听 deep link 支付回调
        const { listen } = await import('@tauri-apps/api/event')
        let timeoutId: ReturnType<typeof setTimeout>
        const unlisten = await listen<string>('deep-link-received', async (event) => {
          try {
            const url = new URL(event.payload)
            if (url.host === 'pay' || url.pathname.startsWith('/pay/callback') || url.pathname.startsWith('pay/callback')) {
              await get().fetchCreditBalance()
            }
          } catch {
            // 忽略解析错误
          } finally {
            unlisten()
            clearTimeout(timeoutId)
          }
        })

        // 120 秒超时
        timeoutId = setTimeout(() => unlisten(), 120000)
      } else {
        // Web 模式：保持轮询逻辑
        const { payUrl } = await getPayUrl()
        window.open(payUrl, '_blank')

        const oldBalance = get().creditBalance
        const pollInterval = setInterval(async () => {
          try {
            const { balance } = await getCreditBalance()
            if (balance !== oldBalance) {
              clearInterval(pollInterval)
              set({ creditBalance: balance })
            }
          } catch {
            // 继续轮询
          }
        }, 3000)

        setTimeout(() => clearInterval(pollInterval), 120000)
      }
    } catch (err) {
      console.error('Open pay page failed:', err)
    }
  },

  hydrate: async () => {
    const [theme, locale, sidebar] = await Promise.all([
      getItem("theme"),
      getItem("locale"),
      getItem("sidebar-collapsed"),
    ])
    const resolvedTheme = (theme as Theme) ?? "system"
    set({
      theme: resolvedTheme,
      locale: (locale as Locale) ?? "en",
      sidebarCollapsed: sidebar === "true",
    })
    applyThemeToDOM(resolvedTheme)

    // 检查云服务状态 & 模型配置
    try {
      const { enabled } = await getCloudStatus()
      set({ cloudEnabled: enabled })
      if (enabled) {
        const { loggedIn } = await getAuthStatus()
        if (loggedIn) {
          await get().fetchUser()
          await get().fetchCreditBalance()
        }
      }

      // 拉取模型设置，判断是否可用
      const settings = await getSettings()
      const { provider } = settings.activeModel

      if (!enabled && (provider === 'builtin' || provider === 'cloud')) {
        // 离线模式下内置/云模型不可用，自动切换到 custom
        await updateSettings({ activeModel: { provider: 'custom' } })
        // 有自定义模型才算 ready
        set({ modelReady: settings.customModels.length > 0 })
      } else if (provider === 'custom') {
        const model = settings.activeModel.id
          ? settings.customModels.find((m) => m.id === settings.activeModel.id)
          : settings.customModels[0]
        set({ modelReady: !!model })
      } else {
        // builtin/cloud 在线模式下可用
        set({ modelReady: true })
      }
    } catch {
      // 后端未就绪，忽略
    }
  },
}))
