import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownPreview } from '@/components/skills/authoring-shared'
import { cn } from '@/lib/utils'
import { MarkdownAuthoringHeader } from './MarkdownAuthoringHeader'

interface MarkdownAuthoringEditorProps {
  title: string
  version?: string
  description?: string
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  defaultMode?: 'markdown' | 'preview'
  hideHeader?: boolean
  bare?: boolean
  contentScrollable?: boolean
}

export function MarkdownAuthoringEditor({
  title,
  version,
  description,
  value,
  onChange,
  placeholder,
  readOnly = false,
  defaultMode = 'markdown',
  hideHeader = false,
  bare = false,
  contentScrollable = true,
}: MarkdownAuthoringEditorProps) {
  const [mode, setMode] = useState<'markdown' | 'preview'>(defaultMode)

  return (
    <div className={bare ? '' : 'rounded-[32px] bg-background p-4'}>
      <MarkdownAuthoringHeader
        title={hideHeader ? undefined : title}
        version={hideHeader ? undefined : version}
        description={hideHeader ? undefined : description}
        mode={mode}
        onModeChange={setMode}
      />

      {mode === 'markdown' ? (
        readOnly ? (
          <pre className={cn(
            'whitespace-pre-wrap break-words rounded-[24px] border border-border/60 bg-background/80 p-4 font-mono text-xs leading-6',
            contentScrollable
              ? 'min-h-[320px] overflow-auto'
              : 'overflow-visible',
          )}>
            {value}
          </pre>
        ) : (
          <Textarea
            rows={16}
            className="min-h-[320px] rounded-[24px] border-border/60 bg-background shadow-none font-mono text-xs"
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange?.(event.target.value)}
          />
        )
      ) : (
        <MarkdownPreview markdown={value} plain scrollable={contentScrollable} />
      )}
    </div>
  )
}
