import { type ReactNode, useState, useEffect } from 'react'
import { AppSidebar } from './AppSidebar'
import { ChatProvider } from '@/hooks/useChatContext'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { isTauri } from '@/api/transport'
import { cn } from '@/lib/utils'

export function Shell({ children }: { children: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [platform, setPlatform] = useState('')

  useEffect(() => {
    if (!isTauri) return
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<string>('get_platform').then(setPlatform)
    })
  }, [])

  const isWin = platform === 'windows'
  const isMac = platform === 'macos'
  const showDragBar = isTauri && (isWin || isMac)

  return (
    <ChatProvider>
      <div className="h-screen flex bg-background text-foreground">
        <AppSidebar onOpenSettings={() => setSettingsOpen(true)} />
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Tauri: drag region bar at top of main content */}
          {showDragBar && (
            <div
              className={cn("shrink-0 flex justify-end", isMac ? "h-7" : "h-8")}
              style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            >
              {/* Windows: reserve space for window controls */}
              {isWin && <div className="w-32 shrink-0" />}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </ChatProvider>
  )
}
