import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { isTauri } from "@/api/transport"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"
import { Plus, Pencil, Trash2, Check, Zap, Settings2 } from "lucide-react"

// 内置模型定义
const BUILTIN_MODELS = [
  {
    id: "youclaw-pro",
    name: "YouClaw Pro",
    description: "Most capable built-in model",
    modelId: "claude-sonnet-4-6",
  },
] as const

interface CustomModel {
  id: string
  name: string
  apiKey: string
  baseUrl: string
  modelId: string
}

interface ActiveModel {
  provider: "builtin" | "custom"
  id?: string
}

async function loadTauriStore() {
  const { load } = await import("@tauri-apps/plugin-store")
  return load("settings.json")
}

export function ModelsPanel() {
  const { t } = useI18n()
  const [builtinModel, setBuiltinModel] = useState("youclaw-pro")
  const [customModels, setCustomModels] = useState<CustomModel[]>([])
  const [activeModel, setActiveModel] = useState<ActiveModel>({ provider: "builtin" })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<CustomModel | null>(null)
  // 表单字段
  const [formName, setFormName] = useState("")
  const [formModelId, setFormModelId] = useState("")
  const [formApiKey, setFormApiKey] = useState("")
  const [formBaseUrl, setFormBaseUrl] = useState("")

  // 从 store 加载
  useEffect(() => {
    if (!isTauri) return
    loadTauriStore().then(async (store) => {
      const bm = await store.get<string>("builtin-model")
      if (bm) setBuiltinModel(bm)
      const cm = await store.get<CustomModel[]>("custom-models")
      if (cm) setCustomModels(cm)
      const am = await store.get<ActiveModel>("active-model")
      if (am) setActiveModel(am)
    })
  }, [])

  // 保存到 store
  const saveToStore = useCallback(async (key: string, value: unknown) => {
    if (!isTauri) return
    const store = await loadTauriStore()
    await store.set(key, value)
    await store.save()
  }, [])

  // 切换 active provider
  const handleSetActiveProvider = async (provider: "builtin" | "custom") => {
    let newActive: ActiveModel
    if (provider === "builtin") {
      newActive = { provider: "builtin" }
    } else {
      // 找默认的自定义模型或第一个
      const defaultModel = customModels[0]
      if (!defaultModel) return
      newActive = { provider: "custom", id: defaultModel.id }
    }
    setActiveModel(newActive)
    await saveToStore("active-model", newActive)
  }

  // 选择内置模型
  const handleSelectBuiltin = async (id: string) => {
    setBuiltinModel(id)
    await saveToStore("builtin-model", id)
  }

  // 设置自定义模型为激活
  const handleSetCustomActive = async (id: string) => {
    const newActive: ActiveModel = { provider: "custom", id }
    setActiveModel(newActive)
    await saveToStore("active-model", newActive)
  }

  // 打开添加 dialog
  const handleOpenAdd = () => {
    setEditingModel(null)
    setFormName("")
    setFormModelId("")
    setFormApiKey("")
    setFormBaseUrl("")
    setDialogOpen(true)
  }

  // 打开编辑 dialog
  const handleOpenEdit = (model: CustomModel) => {
    setEditingModel(model)
    setFormName(model.name)
    setFormModelId(model.modelId)
    setFormApiKey(model.apiKey)
    setFormBaseUrl(model.baseUrl)
    setDialogOpen(true)
  }

  // 保存自定义模型（新建或编辑）
  const handleSaveModel = async () => {
    if (!formName.trim() || !formModelId.trim() || !formApiKey.trim()) return

    let updated: CustomModel[]
    if (editingModel) {
      updated = customModels.map((m) =>
        m.id === editingModel.id
          ? { ...m, name: formName, modelId: formModelId, apiKey: formApiKey, baseUrl: formBaseUrl }
          : m
      )
    } else {
      const newModel: CustomModel = {
        id: crypto.randomUUID(),
        name: formName,
        modelId: formModelId,
        apiKey: formApiKey,
        baseUrl: formBaseUrl,
      }
      updated = [...customModels, newModel]
    }
    setCustomModels(updated)
    await saveToStore("custom-models", updated)
    setDialogOpen(false)
  }

  // 删除自定义模型
  const handleDeleteModel = async (id: string) => {
    if (!confirm(t.settings.confirmDeleteModel)) return
    const updated = customModels.filter((m) => m.id !== id)
    setCustomModels(updated)
    await saveToStore("custom-models", updated)
    // 如果删的是当前激活的，切回内置
    if (activeModel.provider === "custom" && activeModel.id === id) {
      const newActive: ActiveModel = { provider: "builtin" }
      setActiveModel(newActive)
      await saveToStore("active-model", newActive)
    }
  }

  // 判断当前模型是否激活
  const isCustomActive = (id: string) => activeModel.provider === "custom" && activeModel.id === id

  return (
    <div className="pt-4 space-y-6">
      {/* Active Model 区 */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          {t.settings.activeModel}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* 内置模型卡片 */}
          <button
            onClick={() => handleSetActiveProvider("builtin")}
            className={cn(
              "relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
              activeModel.provider === "builtin"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Zap size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{t.settings.builtinProvider}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t.settings.builtinDesc}</div>
            </div>
            {activeModel.provider === "builtin" && (
              <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-medium text-primary">
                <Check size={12} />
                {t.settings.currentSelection}
              </span>
            )}
          </button>

          {/* 自定义 API 卡片 */}
          <button
            onClick={() => handleSetActiveProvider("custom")}
            className={cn(
              "relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
              activeModel.provider === "custom"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30",
              customModels.length === 0 && "opacity-50 cursor-not-allowed"
            )}
            disabled={customModels.length === 0}
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
              <Settings2 size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{t.settings.customProvider}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t.settings.customDesc}</div>
            </div>
            {activeModel.provider === "custom" && (
              <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-medium text-primary">
                <Check size={12} />
                {t.settings.currentSelection}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 内置模型列表 */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          {t.settings.builtinModels}
        </h3>
        <div className="space-y-1.5">
          {BUILTIN_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => handleSelectBuiltin(model.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors",
                builtinModel === model.id
                  ? "bg-accent"
                  : "hover:bg-accent/50"
              )}
            >
              <div>
                <div className="text-sm font-medium">{model.name}</div>
                <div className="text-xs text-muted-foreground">{model.description}</div>
              </div>
              {builtinModel === model.id && (
                <span className="text-xs font-medium text-primary flex items-center gap-1">
                  <Check size={12} />
                  {t.settings.currentSelection}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 自定义模型列表 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t.settings.customModels}
          </h3>
          <Button variant="ghost" size="sm" onClick={handleOpenAdd} className="h-7 gap-1">
            <Plus size={14} />
            {t.settings.addCustomModel}
          </Button>
        </div>
        {customModels.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
            {t.settings.customDesc}
          </div>
        ) : (
          <div className="space-y-1.5">
            {customModels.map((model) => (
              <div
                key={model.id}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-lg transition-colors",
                  isCustomActive(model.id) ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {model.name}
                    {isCustomActive(model.id) && (
                      <span className="text-xs font-medium text-primary flex items-center gap-1">
                        <Check size={12} />
                        {t.settings.currentSelection}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{model.modelId}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!isCustomActive(model.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleSetCustomActive(model.id)}
                    >
                      {t.settings.setDefault}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleOpenEdit(model)}
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteModel(model.id)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加/编辑 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[90vw] max-w-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingModel ? t.settings.editModel : t.settings.addCustomModel}
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.settings.modelName}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t.settings.modelNamePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.modelId}</Label>
              <Input
                value={formModelId}
                onChange={(e) => setFormModelId(e.target.value)}
                placeholder={t.settings.modelIdPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={formApiKey}
                onChange={(e) => setFormApiKey(e.target.value)}
                placeholder={t.settings.apiKeyPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value={formBaseUrl}
                onChange={(e) => setFormBaseUrl(e.target.value)}
                placeholder={t.settings.baseUrlPlaceholder}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button
                onClick={handleSaveModel}
                disabled={!formName.trim() || !formModelId.trim() || !formApiKey.trim()}
              >
                {t.common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
