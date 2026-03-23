import { useState, useEffect } from 'react'
import { useI18n } from '@/i18n'
import { checkEnv, type DependencyStatus } from '@/api/client'
import { CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EnvironmentPanel() {
  const { t } = useI18n()
  const [dependencies, setDependencies] = useState<DependencyStatus[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      const result = await checkEnv()
      setDependencies(result.dependencies)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t.envPanel.title}</h3>
          <p className="text-sm text-muted-foreground">{t.envPanel.description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          <span className="ml-1.5">{t.envPanel.refresh}</span>
        </Button>
      </div>

      {/* Dependencies list */}
      <div className="space-y-3">
        {dependencies.map((dep) => (
          <div key={dep.name} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card">
            <div className="flex items-center gap-3">
              {dep.available ? (
                <CheckCircle2 size={18} className="text-green-500 shrink-0" />
              ) : (
                <XCircle size={18} className="text-red-400 shrink-0" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{dep.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-md ${dep.required ? 'bg-red-500/10 text-red-400' : 'bg-muted text-muted-foreground'}`}>
                    {dep.required ? t.envPanel.required : t.envPanel.optional}
                  </span>
                </div>
                {dep.available && dep.version && (
                  <p className="text-xs text-muted-foreground mt-0.5">{dep.version}</p>
                )}
                {dep.available && dep.path && (
                  <p className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">{dep.path}</p>
                )}
                {!dep.available && (
                  <p className="text-xs text-red-400 mt-0.5">{t.envPanel.notInstalled}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
