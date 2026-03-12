import { useState } from 'react'
import { ChevronRight, ChevronDown, Wrench, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolUseItem } from '@/hooks/useChat'
import { useI18n } from '@/i18n'

export function ToolUseBlock({ items }: { items: ToolUseItem[] }) {
  const { t } = useI18n()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  if (items.length === 0) return null

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-1 my-2">
      {items.map(item => {
        const isExpanded = expandedIds.has(item.id)
        const isRunning = item.status === 'running'

        return (
          <div
            key={item.id}
            className="border-l-3 border-primary/40 bg-muted/30 rounded-r-lg overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleExpand(item.id)}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              ) : (
                <Wrench className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="font-medium">
                {isRunning ? t.chat.toolUsing.replace('{tool}', item.name) : item.name}
              </span>
              {item.input && !isExpanded && (
                <span className="truncate opacity-60">({item.input.slice(0, 60)})</span>
              )}
              <span className="ml-auto shrink-0">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </span>
            </button>
            {isExpanded && item.input && (
              <div className="px-3 pb-2 text-xs text-muted-foreground">
                <pre className="whitespace-pre-wrap break-all bg-background/50 rounded p-2 mt-1">
                  {item.input}
                </pre>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
