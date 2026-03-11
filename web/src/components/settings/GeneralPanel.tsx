import { useEffect, useState } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { applyThemeToDOM, getSavedTheme, saveTheme, type Theme } from "@/hooks/useTheme"
import { isElectron, getElectronAPI } from "@/api/transport"
import { useI18n } from "@/i18n"

const themeOptions: { value: Theme; labelKey: "dark" | "light" | "system"; descKey: "darkDesc" | "lightDesc" | "systemDesc" }[] = [
  { value: "dark", labelKey: "dark", descKey: "darkDesc" },
  { value: "light", labelKey: "light", descKey: "lightDesc" },
  { value: "system", labelKey: "system", descKey: "systemDesc" },
]

export function GeneralPanel() {
  const { t } = useI18n()
  const [theme, setTheme] = useState<Theme>("system")
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeySaved, setApiKeySaved] = useState(false)

  useEffect(() => {
    getSavedTheme().then(setTheme)
    if (isElectron) {
      getElectronAPI().getApiKey().then((key) => {
        if (key) setApiKey(key)
      })
    }
  }, [])

  const handleThemeChange = (value: string) => {
    const newTheme = value as Theme
    setTheme(newTheme)
    saveTheme(newTheme)
    applyThemeToDOM(newTheme)
  }

  const handleSaveApiKey = async () => {
    if (!isElectron) return
    await getElectronAPI().setApiKey(apiKey)
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
  }

  return (
    <div className="pt-4 space-y-6">
      {/* API Key 配置（仅 Electron 模式） */}
      {isElectron && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
            API Key
          </h3>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground mb-2">
              {t.settings.apiKeyDesc}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showApiKey ? t.settings.apiKeyHide : t.settings.apiKeyShow}
                </button>
              </div>
              <Button size="sm" onClick={handleSaveApiKey}>
                {apiKeySaved ? t.settings.apiKeySaved : t.settings.apiKeySave}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 主题 */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          {t.settings.appearance}
        </h3>
        <RadioGroup value={theme} onValueChange={handleThemeChange}>
          {themeOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-accent"
            >
              <RadioGroupItem value={option.value} />
              <div>
                <span className="text-sm font-medium cursor-pointer">
                  {t.settings[option.labelKey]}
                </span>
                <div className="text-xs text-muted-foreground">{t.settings[option.descKey]}</div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}
